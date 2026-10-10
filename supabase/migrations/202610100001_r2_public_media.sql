-- Add the exact approved R2 public origin; retain legacy media and all grants/RLS.
-- Apply only after the encrypted provider backup is restore-verified.
begin;
create or replace function public.valid_property_media_manifest(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; asset_url text; asset_key text; identity text; ids text[] := '{}';
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) is distinct from 'object' or not value ?& array['version','items','cover_media_id']
     or jsonb_typeof(value->'version') is distinct from 'number' or value->'version' is distinct from '1'::jsonb
     or jsonb_typeof(value->'items') <> 'array'
     or jsonb_typeof(value->'cover_media_id') <> 'string'
     or (value - array['version','items','cover_media_id']) <> '{}'::jsonb then return false; end if;
  if jsonb_array_length(value->'items') not between 1 and 80 then return false; end if;
  for item in select * from jsonb_array_elements(value->'items') loop
    if jsonb_typeof(item) is distinct from 'object' or not item ?& array['id','type','url'] or jsonb_typeof(item->'id') <> 'string'
       or jsonb_typeof(item->'type') is distinct from 'string' or item->>'type' not in ('image','video')
       or (item - array['id','type','url','poster_url','fallback_url']) <> '{}'::jsonb then return false; end if;
    identity := item->>'id';
    if length(identity) not between 1 and 128 or identity !~ '^[A-Za-z0-9_:-]+$' or identity = any(ids) then return false; end if;
    ids := array_append(ids, identity);
    if item->>'type' = 'video' and (not item ? 'poster_url' or not item ? 'fallback_url') then return false; end if;
    for asset_key, asset_url in select key, item->>key from unnest(array['url','poster_url','fallback_url']) as key
      where key = 'url' or item ? key loop
      if asset_url is null or asset_url !~ '^https://(tnkiwgewdancvmkhzlwz\.supabase\.co/storage/v1/object/public/property-photos/|media\.mavorealestate\.com/)property-[1-9][0-9]*/revision-[1-9][0-9]*/[0-9]+-[a-f0-9]{64}\.(jpg|png|webp|mp4)$' then return false; end if;
      if (asset_key <> 'url' or item->>'type' = 'image') and asset_url ~ '\.mp4$' then return false; end if;
      if asset_key = 'url' and item->>'type' = 'video' and asset_url !~ '\.mp4$' then return false; end if;
    end loop;
  end loop;
  return coalesce(value->>'cover_media_id' = any(ids),false);
exception when others then return false;
end;
$$;
commit;
