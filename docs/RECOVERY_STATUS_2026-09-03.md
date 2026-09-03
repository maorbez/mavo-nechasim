# Recovery status — 2026-09-03

This is a dated evidence snapshot, not a claim about future provider state.

## Supabase

- CLI account authentication works noninteractively.
- Project `globes`, ref `tnkiwgewdancvmkhzlwz`, appears in the account and reported `ACTIVE_HEALTHY` at final readback.
- The repository is intentionally not linked (`linked=false`). The reviewed migration `20260903150000_office_canonical_publication.sql` was applied through the authenticated Supabase SQL editor at `2026-09-03T14:26:00+03:00` after the verified backup below.
- Before the two office-first publications, a live read returned 25 active rows with 25 unique ids, ranging from 13 to 57. Twelve had no `sqm`; the UI omits that metric rather than rendering `null`.
- The migration added `office_property_id`, `office_updated_at`, `published_at`, and `updated_at`; existing legacy rows remain unlinked until explicitly reconciled. New inserts require a non-empty Office CRM id, and both the public number and a linked Office CRM id are immutable.
- Post-migration provider readback returned 51 total rows and 25 active rows. The exact anonymous public-column projection returned HTTP 200, anonymous `select=*` was rejected with HTTP 401, and service-role readback returned HTTP 200.
- Provider OpenAPI discovery returned 401 for the public key, so the exact shape above was read from `select=*&limit=1` and saved as a test fixture.
- The fractional-room compatibility migration `20260903160000_fractional_rooms.sql` changes `public.properties.rooms` from integer-compatible storage to `numeric`. A fresh anonymous provider read at `2026-09-03T12:21:56Z` returned row `59` with the JSON number `rooms=4.5`, proving that the migration is effective on the live read path rather than merely committed locally.
- The same read returned 27 active rows (`Content-Range: 0-26/27`) with 27 unique ids from 13 through 59. Rows 58 and 59 are included and active.

No browser sign-in is currently required for Supabase CLI account access. Local execution of the schema migration could not be run because this host has neither Docker nor Podman installed; the remote migration completed with `Success. No rows returned`, and its permission/shape readbacks passed.

## Active office-first public rows

The row hash is the SHA-256 of the normalized anonymous public projection defined by `docs/PUBLISHING_CONTRACT.md`. The fresh anonymous read reproduced both hashes recorded in the authoritative publication ledgers.

| Public id | Property | Office CRM row | Public URL | Rooms / sqm | Media | Verified public-row hash |
| --- | --- | --- | --- | --- | ---: | --- |
| `58` | עזרא הסופר 13 א׳ | `prop_8b49cbc328ef4de99f28e99d577a011e` | `https://maorbez.github.io/mavo-nechasim/?prop=58` | `4` / `90` | 10 | `sha256:949bcbf7f49df79d8a953456af8e068e020053608bb46d5aae35d1f2882bc937` |
| `59` | דרך שלמה 117 | `prop_6de874c4489d4e0794e79b78fd3966c2` | `https://maorbez.github.io/mavo-nechasim/?prop=59` | `4.5` / `95` | 15 | `sha256:f7c065884d1f2abcb291435e744a5f94a184d720fa1ce538fe66a76f022bb2ed` |

The source ledgers are:

- Row 58: `/Users/maor/.hermes/state/real-estate-publication-runs/89f872cbb661d1f41e2796015e7c951626c8aa0ecce2a0993aab9f977797789e.json`.
- Row 59: `/Users/maor/.hermes/state/real-estate-publication-runs/43f04bbf63f7c590556a352ffcb91461ab8117e7d287490471cbc8c91936ae3d.json`.

Both ledgers record `active=true`, the exact Office CRM link, an authoritative anonymous row readback, a matching live-browser deep link, and a verified Office website publication receipt. The Office publication pipeline status is `website_verified` for both rows.

## Verified backups

The exact archives below are the recovery points used before the schema and row mutations. Their archive hashes were recalculated successfully from disk on `2026-09-03`; the restore checks described below were performed at backup time, before the corresponding production change.

- Pre-schema migration archive: `/Users/maor/Mavo-Supabase-Backups/manual/mavo-supabase-20260903T140835.tgz.age`; SHA-256 `01301641a738288d16dd29ad9ec1ad1bb358e794253b20b1f1f1071a5ef08d78`; contains all 51 property rows, PostgREST schema, bucket metadata, and 179 storage objects. It was decrypted with the configured recovery identity and its tar contents were read successfully before the schema change.
- Before row 58: `/Users/maor/.hermes/backups/mavo-supabase/mavo-supabase-20260903T114252Z-89f872cbb661.tar.gz.age`; SHA-256 `7246b8f364183c30bc49c00f7d6e6db7e258cbd45987aff32615254ae904f913`; captured `2026-09-03T11:42:52Z`; 51 property rows with properties hash `45d17f99c6afb1fd1c6435c63eee0b5fae148b1622ea7094eb8f46f24a4c0d1f`; 179 storage objects / 110,508,171 bytes with manifest hash `f3e332fdd98b827d7087ec54f60b8f93bd93b8723f36ae0648b88119fb42d206`; ledger receipt `restore_verified=true`.
- Before row 59: `/Users/maor/.hermes/backups/mavo-supabase/mavo-supabase-20260903T115828Z-43f04bbf63f7.tar.gz.age`; SHA-256 `e930ce2e7e2ac6666ac4fa76d45485792356f3894deb0d4751b6fd3aa487c8f0`; captured `2026-09-03T11:58:28Z`; 52 property rows with properties hash `aeeff88e198afce4d49ff12fc393788b2e0e0d092549da0fbe5761aacd605e29`; 189 storage objects / 113,865,483 bytes with manifest hash `e29fbf8c6fef5735f6566c8421ad5525a1f926dd196481fee269f4f292d7c147`; ledger receipt `restore_verified=true`.

The row-publication backup receipts also retain the exact PostgREST schema hashes: `d49e1938719e525b1b67726e1b4d31e391cb896d439fedd116d2864a1618bb8e` before row 58 and `f09a95768bc144e2b483532e70af7a21fe8ecdcdf4285a3946d15106e8870b96` before row 59.

## No-duplicate downstream state

The new canonical ledgers still mark Scoutr, Facebook groups, and Yad2 as `pending` because legacy provider receipts have not been reconciled into the office-first contract. `pending` here must not be interpreted as permission to create a replacement listing or campaign.

| Property | Scoutr | Facebook through Scoutr | Yad2 | Safe next action |
| --- | --- | --- | --- | --- |
| `#58` עזרא הסופר 13 א׳ | Saved listing is provider-readback verified as `cmtjtlhzu00014zty383f3k2h`, with 10 retained images. | Existing campaign was provider-visible as active and partial (`2/60`); there are no terminal per-group post URLs/ids, and prohibited no-broker groups appeared in its queue. | No listing number or URL is verified. | Reconcile the existing Scoutr id into row 58 and inspect/resume only its existing campaign after pruning prohibited groups. Search the Yad2 Plus dashboard by exact property facts before deciding whether creation is necessary. |
| `#59` דרך שלמה 117 | Exact saved row is provider-readback verified with 15 images, but its listing id/share URL was not captured. | Existing campaign was provider-visible as active at `0/61`; no terminal post receipts exist. | Existing live listing is `61849989`: `https://www.yad2.co.il/realestate/item/tel-aviv-area/31t4744b`. The retired/conflicting `agwyy2jw` URL must not be reused. | Recover the existing Scoutr id rather than creating another row; inspect/resume only the existing campaign; reconcile Yad2 `61849989` into row 59 rather than creating another ad. Resolve the legacy 100 sqm versus canonical 95 sqm plus roof description before editing Yad2. |

The latest direct Scoutr provider evidence above is dated `2026-09-02`. At the 2026-09-03 audit, the existing Scoutr browser tab redirected to an expired login, so no newer provider state was inferred. Office CRM `facebook_current` / `groups_current` flags are historical metadata, not substitutes for provider post receipts.

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
- Commit `3a183d57b26918c2869ad05a48dbb803c77e136b` was pushed to `master`; its GitHub Pages build reported `built`, and live browser readback confirmed 25 cards, no degraded banner, no `null מ״ר`, and a working `?prop=13` modal.
- The runtime-bearing GitHub Pages build was read again through the GitHub provider API before this documentation-only update: build `1191937808` for commit `f91046596cc890acb3b9e7a67295aa447b5a91bd` reported `built`, created `2026-09-03T11:56:56Z` and completed `2026-09-03T11:57:30Z`. The public deep-link origin returned HTTP 200 with `Last-Modified: Thu, 03 Sep 2026 11:57:29 GMT`.
- The fresh Supabase public read after that build returned rows 58 and 59 with 10 and 15 media items respectively, matching the ledger hashes above; row 59 returned the exact fractional value `4.5`.
- Railway production was not changed by this site release; Office CRM deployment is recorded in its own Railway project Wiki.
