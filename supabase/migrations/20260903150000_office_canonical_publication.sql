-- Office CRM owns public property numbering.
-- Apply only after an approved backup and a provider-backed dry run.

-- The publisher must supply the immutable Office CRM property_number as id.
alter table public.properties alter column id drop identity if exists;
alter table public.properties alter column id drop default;

alter table public.properties
  add column if not exists office_property_id text,
  add column if not exists office_updated_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists properties_office_property_id_key
  on public.properties (office_property_id)
  where office_property_id is not null;

alter table public.properties
  drop constraint if exists properties_positive_office_number;
alter table public.properties
  add constraint properties_positive_office_number check (id > 0) not valid;
alter table public.properties validate constraint properties_positive_office_number;

create or replace function public.reject_property_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.id is distinct from new.id then
    raise exception 'properties.id is the immutable Office CRM property_number';
  end if;
  if old.office_property_id is not null
     and old.office_property_id is distinct from new.office_property_id then
    raise exception 'properties.office_property_id cannot change after it is linked';
  end if;
  return new;
end;
$$;

drop trigger if exists properties_reject_id_change on public.properties;
create trigger properties_reject_id_change
  before update of id, office_property_id on public.properties
  for each row execute function public.reject_property_id_change();

create or replace function public.touch_property_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_touch_updated_at on public.properties;
create trigger properties_touch_updated_at
  before update on public.properties
  for each row execute function public.touch_property_updated_at();

-- The browser is read-only and cannot read the internal office linkage columns.
-- A trusted server publisher uses the service role for full-row access.
revoke all privileges on table public.properties from anon, authenticated;
grant select (
  id, type, price, price_label, title, location, rooms, baths, sqm, extra,
  description, emoji, bg, lat, lng, photos, has_elevator, has_shelter,
  has_parking, active
) on table public.properties to anon, authenticated;
grant select, insert, update, delete on table public.properties to service_role;

comment on column public.properties.id is
  'Immutable public number allocated as office_crm_properties.property_number by Office CRM.';
comment on column public.properties.office_property_id is
  'Stable internal Office CRM row identifier used for publisher idempotency; not the public number.';
comment on column public.properties.published_at is
  'Set by the trusted server publisher only after upload and row readback are complete.';
