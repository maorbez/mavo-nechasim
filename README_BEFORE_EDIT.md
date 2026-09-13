# Read before editing

## System map

| Surface | Provider-backed identity | Current public address | Responsibility |
| --- | --- | --- | --- |
| Office CRM | Railway project `mavo-properties`, service `mavo-office` | `https://mavo-office-production.up.railway.app/office/crm` | Creates the office record and allocates `property_number` |
| Public inventory | Supabase project ref `tnkiwgewdancvmkhzlwz` | Data API; not a human-facing site | Stores the exact office number as `public.properties.id` |
| Public catalog | GitHub Pages repository `maorbez/mavo-nechasim` | `https://mavorealestate.com/` | Read-only property display and stable `?prop=` links |

The office branding and generated address were updated in September 2026; old office URLs remain aliases. The public catalog uses its purchased domain on GitHub Pages; domain activation and HTTPS must be verified separately from these source settings. The separate WhatsApp bot service is not the Office CRM authority.

## Non-negotiable identity rule

The Office CRM row exists first. Its immutable numeric `property_number` is the public listing number. The trusted publisher writes that exact value into Supabase `properties.id`. Supabase must not allocate a number. `office_property_id` is only an idempotency link to the internal office row.

Historical data contains a row whose free text mentions `#49` while its real database id is `23`. That text is not identity evidence. Do not renumber it until an authoritative Office CRM row readback proves the mapping.

## Safe change sequence

1. Read `docs/PUBLISHING_CONTRACT.md`.
2. Inspect provider state and repository state separately.
3. Make and test local changes.
4. Before any live migration or publication, obtain explicit approval and verify a restorable backup.
5. Verify the Supabase row, photo objects, active state, public deep link, and Office CRM publication receipt. A successful command alone is not completion.

Run the local checks with `npm test`.

`tests/fixtures/live-properties-columns-2026-09-03.json` records the column names returned by a provider-backed `select=*&limit=1` read on 2026-09-03. It intentionally shows `created_at` and no `updated_at`; the compatibility migration adds the missing operational columns before installing its update trigger.

For the provider and verification snapshot captured during recovery preparation, see `docs/RECOVERY_STATUS_2026-09-03.md`.
