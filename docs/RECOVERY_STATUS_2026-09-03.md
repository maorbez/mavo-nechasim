# Recovery status — 2026-09-03

This is a dated evidence snapshot, not a claim about future provider state.

## Supabase

- CLI account authentication works noninteractively.
- Project `globes`, ref `tnkiwgewdancvmkhzlwz`, appears in the account and reported `ACTIVE_HEALTHY` at final readback.
- The repository is intentionally not linked (`linked=false`). The reviewed migration `20260903150000_office_canonical_publication.sql` was applied through the authenticated Supabase SQL editor at `2026-09-03T14:26:00+03:00` after the verified backup below.
- A live read returned 25 active rows with 25 unique ids, ranging from 13 to 57. Twelve currently have no `sqm`; the UI now omits that metric rather than rendering `null`.
- The migration added `office_property_id`, `office_updated_at`, `published_at`, and `updated_at`; existing legacy rows remain unlinked until explicitly reconciled. New inserts require a non-empty Office CRM id, and both the public number and a linked Office CRM id are immutable.
- Post-migration provider readback returned 51 total rows and 25 active rows. The exact anonymous public-column projection returned HTTP 200, anonymous `select=*` was rejected with HTTP 401, and service-role readback returned HTTP 200.
- Provider OpenAPI discovery returned 401 for the public key, so the exact shape above was read from `select=*&limit=1` and saved as a test fixture.

No browser sign-in is currently required for Supabase CLI account access. Local execution of the migration could not be run because this host has neither Docker nor Podman installed; the remote migration completed with `Success. No rows returned`, and its permission/shape readbacks passed.

## Verified pre-mutation backup

- Encrypted archive: `/Users/maor/Mavo-Supabase-Backups/manual/mavo-supabase-20260903T140835.tgz.age`.
- SHA-256: `01301641a738288d16dd29ad9ec1ad1bb358e794253b20b1f1f1071a5ef08d78`.
- Contents: all 51 property rows, PostgREST schema, bucket metadata, and all 179 storage objects.
- Verification: the age-encrypted archive was decrypted with the configured recovery identity and its tar contents were read successfully before production changes.

## Railway and site routing

- Canonical Office CRM project: `content-illumination` (`f7e47939-5547-432a-8a5a-274413ee0f6c`).
- Canonical service: `globes-bot` (`9c77e0a0-a78a-4ae8-82fe-eb45caef2bca`).
- Provider-generated Office URL: `https://globes-bot-production.up.railway.app`.
- Railway reported no custom domain on the project at audit time.
- `globes-whatsapp-bot-production.up.railway.app` belongs to a separate/legacy project and is not the Office CRM authority.
- The human-facing public catalog remains GitHub Pages at `https://maorbez.github.io/mavo-nechasim/`; it is not a Railway service.

## Local verification

- `npm test`: 16 passing tests.
- Browser readback on the local branch: 25 property cards; search count 25; no `null מ״ר` text.
- Exact deep link `/?prop=13` opened the matching listing modal.
- Simulated live-provider failure is covered by a browser-context test and renders a visible Hebrew degraded-state notice.
- Commit `3a183d57b26918c2869ad05a48dbb803c77e136b` was pushed to `master`; GitHub Pages reported `built`, and live browser readback confirmed 25 cards, no degraded banner, no `null מ״ר`, and a working `?prop=13` modal.
- Railway production was not changed by this site release; Office CRM deployment is recorded in its own Railway project Wiki.
