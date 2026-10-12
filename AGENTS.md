# Mavo Nechasim agent rules

Latest workflow checkpoint — 2026-10-12 21:48:51Z: the site and sole publisher passed
isolated live fixture 74 acceptance and cleanup. Image publication verified Office
revision 6 / D1 revision 8 at 21:36:26Z (two assets); video publication verified
Office revision 7 / D1 revision 9 at 21:43:50Z (three assets). Exact saved Office
hashes, canonical Cloudflare projections and selected bytes matched. Native Chrome
confirmed the reordered 960x640 cover and 640x480 video with the correct poster,
muted playback; the normal publisher's 1440px/390px page verifier also passed.
The video draft preserved the previous public revision. Verified withdrawal then
returned 404 for all five unique URLs across both versions in 15 GET/HEAD/Range
checks; stale approval returned 409 without revival. Recoverable archive returned
200, subsequent fixture access returned 403, and the saved receipt confirms archived.
All 69 original catalog states stayed unchanged through every action; no customer sends.
Final readback at 21:48:51Z confirmed 33 active public rows and 70 total states,
including archived fixture 74 inactive at D1 revision 10. No publication/removal/
location job was active; the five historical failed removals were unchanged. Office
source, 216 original business rows, six original media rows, roles and variables
were preserved; the sole publisher still held its lock at PID `42454`.

Publisher `9ceeaeda` / PID `42454` retains its verified 197 core / 714 full release
files. Office remains `f842b020` / Railway `77ea1377`; Pages remains `264b05b`.
**Full migration remains INCOMPLETE:** at 21:39:34Z both legacy property 64/66
Range URLs still returned 206/HIT from HFA (Age 3386/3356), despite closed anonymous
ACLs and a private bucket. Supabase ticket `SU-504867` is acknowledged, unresolved;
purge remains 403 `FeatureNotEnabled`. DNS is unchanged and separate external
Spaceship work remains pending. No plan change, original-object deletion, cache
recall or complete historical-URL denial is claimed.


Read `README_BEFORE_EDIT.md` and `docs/PUBLISHING_CONTRACT.md` before changing data,
publishing code, URLs or provider migrations.

- This repository is the public, read-only GitHub Pages catalog, separate from Office CRM.
- Office allocates immutable positive numeric `property_number`; Cloudflare D1 catalog IDs
  and preserved legacy Supabase IDs must use that exact number. Never infer identity from
  text, address, array order, counts or the legacy `supabase_property_id` mirror.
- The live browser reads active public projections without credentials from the exact
  configured Worker origin. Private R2 media is served only through its active-reference gate.
  Never expose Office credentials, publisher HMAC or a service-role key.
- The sole server publisher owns approval, revision/CAS and saved Office receipts. It is
  running reviewed local runtime `9ceeaeda` at sole PID `42454`, with its lock and
  queue baseline verified. Office Railway remains `f842b020`. Residual legacy CDN
  cache closure remains unresolved. Isolated fixture 74 E2E passed and cleanup was
  verified; other publications still require their own saved successful receipt.
- On live-source failure show no listings and a visible unavailable notice. Never revive a
  snapshot, local catalog-photo copy or another provider; a successful empty list is authoritative.
- Legacy Supabase rollback requires fresh privacy/withdrawal reconciliation. Anonymous
  catalog/storage ACLs are closed and the bucket is private, but cached public Range access
  remains unresolved. Do not claim full old-URL denial or reopen public access automatically.
- Preserve private originals, stable cover/gallery order and `?prop=<office property_number>` links.
  Seven separately published standalone-gallery files remain unbound and outside this catalog
  migration; do not claim all historical media URLs are gated.
- Never deploy, mutate provider data/access, change Railway or DNS, or send externally without
  explicit approval and a verified backup. This no-DNS route retains the current Pages host.
- Run `npm test` before committing. Do not claim unperformed live checks.
