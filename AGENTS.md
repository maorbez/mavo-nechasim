# Mavo Nechasim agent rules

Read `README_BEFORE_EDIT.md` and `docs/PUBLISHING_CONTRACT.md` before changing data, publishing code, URLs, or Supabase migrations.

- This repository is the public, read-only GitHub Pages catalog. It is not the Office CRM Railway service.
- Office CRM allocates the immutable positive numeric `property_number`. Supabase `public.properties.id` must use that exact number.
- Never derive identity from description, title, address, array order, `max(id) + 1`, or the legacy `supabase_property_id` mirror.
- Browser code may use only the public publishable key and read active rows. Never commit or expose a service-role key.
- Publishing is a server-side, two-phase workflow. Do not activate a listing or report success before provider readback and Office CRM receipt readback.
- A static/browser snapshot is degraded recovery data. If Supabase is unavailable, disclose that state visibly; an empty successful live query is authoritative.
- Never deploy, link/push a remote Supabase project, alter Railway, or mutate live listings without explicit approval and a verified backup.
- Keep `?prop=<office property_number>` deep links stable.
- Run `npm test` before committing.

