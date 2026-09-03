# Recovery status — 2026-09-03

This is a dated evidence snapshot, not a claim about future provider state.

## Supabase

- CLI account authentication works noninteractively.
- Project `globes`, ref `tnkiwgewdancvmkhzlwz`, appears in the account and reported `ACTIVE_HEALTHY` at final readback.
- The repository is intentionally not linked (`linked=false`); no remote migration was applied.
- A live read returned 25 active rows with 25 unique ids, ranging from 13 to 57. Twelve currently have no `sqm`; the UI now omits that metric rather than rendering `null`.
- The current provider row shape has 21 columns: `active`, `baths`, `bg`, `created_at`, `description`, `emoji`, `extra`, `has_elevator`, `has_parking`, `has_shelter`, `id`, `lat`, `lng`, `location`, `photos`, `price`, `price_label`, `rooms`, `sqm`, `title`, `type`.
- Provider OpenAPI discovery returned 401 for the public key, so the exact shape above was read from `select=*&limit=1` and saved as a test fixture.

No browser sign-in is currently required for Supabase CLI account access. Applying a migration remains a separate, approval-gated production action. Local execution of the migration could not be run because this host has neither Docker nor Podman installed; static compatibility and application tests pass.

## Railway and site routing

- Canonical Office CRM project: `content-illumination` (`f7e47939-5547-432a-8a5a-274413ee0f6c`).
- Canonical service: `globes-bot` (`9c77e0a0-a78a-4ae8-82fe-eb45caef2bca`).
- Provider-generated Office URL: `https://globes-bot-production.up.railway.app`.
- Railway reported no custom domain on the project at audit time.
- `globes-whatsapp-bot-production.up.railway.app` belongs to a separate/legacy project and is not the Office CRM authority.
- The human-facing public catalog remains GitHub Pages at `https://maorbez.github.io/mavo-nechasim/`; it is not a Railway service.

## Local verification

- `npm test`: 15 passing tests.
- Browser readback on the local branch: 25 property cards; search count 25; no `null מ״ר` text.
- Exact deep link `/?prop=13` opened the matching listing modal.
- Simulated live-provider failure is covered by a browser-context test and renders a visible Hebrew degraded-state notice.
- Nothing in Supabase or Railway production was changed by this branch.

