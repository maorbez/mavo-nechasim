# Mavo Nechasim agent rules

## Current checkpoint — 2026-10-31

Live catalog: Cloudflare worker `mavo-catalog-pilot-20261011` (`/api/properties`, 24 active rows on 2026-10-31); Pages reads it through `public-catalog-config.js`. Legacy Supabase is recovery-only.
Office Railway `64772f69` = source `bde7ef9` (branch `claude/public-status-merge-20261031`): future-only rented/sold status at `/public/property-status/<number>`, copy without photos, and the bot's Cloudflare inventory fix. Any later Office deploy must contain `bde7ef9`.
Pages adds the old-link status dialog (`property-status.js`, `26ead9c`) and the 2026-10-31 audit fixes: a quiet loading state instead of a false outage banner, consistent monthly rent labels, cleaned legacy titles, brand-colour agent avatars, a no-photo notice, and a narrower mobile language tab.
The section below is the earlier checkpoint and is kept for history.

## Earlier checkpoint — 2026-10-13 local / 2026-10-12 UTC

Pages serves `7e2aa467bd028664735d9556850cbf5b5e61f7af`, built at 22:26:16Z;
22:26:19Z anonymous HTTP readback matched all 14 checked release files and 33
active rows with the exact 21 public fields. The availability/map reader is deployed.
Office `a59698fa201d6e3b7cdb0699d5b67ae10b095872` / Railway
`1e15b10d-bd68-443b-8b3c-85929fe17808` reached `SUCCESS`; 22:39Z preservation
matched 197 runtime files, 217 original business rows, nine original media rows,
roles, variables and schemas. The sole publisher remains `9ceeaeda`; no publisher
replacement or DNS change belongs to this release.

Owner-API fixture 75 was saved and reread: available → rented disabled publication
and website settings; stale save returned 409; return to available did not publish.
Recoverable archive returned 200 and later GET returned 403; anonymous record access
was denied. All 70 signed catalog states stayed unchanged; no fixture was publicly
approved and no customer message was sent. Six legacy public rows 16, 17, 24, 25,
29 and 36 remain unbound to Office; preserve them without inferred bindings.

Site 139 / Cloudflare 74 local checks and isolated synthetic desktop/mobile rendering
passed. New release delivery is verified by HTTP, not a fresh native-browser render:
the current native CUA attempt timed out. Earlier fixture 74 browser evidence below
is historical and does not verify the new availability controls visually.

**Full migration remains INCOMPLETE:** at 22:29:59Z legacy property 66 still served
cached anonymous GET 200 and Range 206/HIT at FRA; property 64 returned 400 at that
edge only. This does not prove global cache denial. Supabase `SU-504867` has an
automated acknowledgement only; no resolution is recorded. Nameservers and parent
DS remain unchanged; custom media DNS is still absent and signing-preserving DNS
work remains separate. No original-object deletion, cache recall or full old-URL
denial is claimed. Owner-local receipts: `mavo-availability-20261013` artifacts.

## Historical checkpoint — 2026-10-12 21:48:51Z

Historical workflow checkpoint — 2026-10-12 21:48:51Z: the site and sole publisher passed
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
  queue baseline verified. Office Railway now runs `a59698fa`. Residual legacy CDN
  cache closure remains unresolved. Isolated fixture 74 E2E passed and cleanup was
  verified; other publications still require their own saved successful receipt.
- Office availability uses the existing stage controls: `in_office` is זמין and
  `rented` is הושכר. Returning to available does not approve or publish a listing.
  Public `active` means publication visibility; never add private workflow fields
  to the exact 21-field anonymous projection or invent Office links for legacy rows.
- Cards/search/maps share a bounded catalog session: renew at 45 seconds, expire at
  60 seconds, clear on hidden/offline/failure/empty and revalidate on return. Preserve
  filters/bounds; removed or changed details must close and clear stale content.
- Map all public rows using precise coordinates or explicitly labeled local catalog
  neighborhood/city areas; show unknown areas in a visible list/count. Never geocode
  private text or use a general-area marker as an exact navigation destination.
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
