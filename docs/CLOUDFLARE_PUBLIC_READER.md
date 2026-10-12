# Public catalog reader configuration

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


The live `public-catalog-config.js` selects the exact existing Worker origin for
`GET /api/properties` and public media delivery while Pages hosts the site. Without
configuration, `db.js` defaults to the current origin and fails closed if no API
exists there. The request uses
`cache: 'no-store'`, `credentials: 'omit'`, redirect rejection and no browser key.
The API must return the existing 21 public fields for each active property;
`PUBLIC_PROPERTY_COLUMNS` remains the projection contract. Existing optional
`price_label`, `emoji`, `bg` and amenity fields accept null without rewriting the
source projection; the established mapper retains its presentation defaults.
`active` remains a required boolean. Public numbers still
come from Office and the canonical `?prop=<number>` links are unchanged.

For a separately hosted API, set `window.MAVO_CATALOG_API_ORIGIN` to its HTTPS
origin before loading `db.js`. A trailing slash is allowed. Paths, credentials,
query strings, fragments and insecure origins fail before a request. The Worker
must permit the actual public site Origin through CORS. No HMAC, private Office
credential or new identity belongs in this configuration.

A malformed/private/inactive/duplicate row, invalid media manifest, approximate
coordinates, over-1000 list, HTTP/JSON/transport failure makes the whole catalog
unavailable. No saved snapshot or alternative provider is tried. A successful
empty list is authoritative. The existing visible Hebrew warning remains.
Media order, independent cover ID, video poster/fallback, cards, canonical shares
and the Office public-property preview URL remain the established contract.
Legacy public bucket photos remain source-compatible; the activation readback
must confirm that the actual Cloudflare projection references only migrated R2
assets before claiming no public Supabase traffic.

The Cloudflare release carries an empty `public-photo-fallbacks.json` and no
catalog-photo files under `assets/property-photos/`. The former twelve static
copies bypassed the active-media gate at their direct Pages URLs, so they were
removed from the hosted release; Git retains recovery history and private
originals are untouched. The legacy renderer remains compatible with an explicit
recovery mapping, but restoring those copies requires fresh publication/privacy
review. Removing release files does not recall cached or previously saved copies.

## Deliberate recovery

The old active-only, exact-column Supabase reader remains solely behind the
explicit `window.MAVO_CATALOG_PROVIDER = 'supabase'` switch, set before `db.js`.
It uses the existing browser-safe publishable key by default; optional existing
`SUPABASE_URL`/`SUPABASE_KEY` settings are read without being overwritten or
created as globals. This switch does not write data. Do not use it after a privacy
withdrawal unless the recovery provider reflects that withdrawal. No failure
activates it automatically. Remove the switch to return to Cloudflare.

The public search form continues to submit only to the existing write-only Office
`https://forms.mavorealestate.com/public/search-requests` intake and requires a
saved receipt with recognized routing. Generic contact forms retain their existing
email transport. The obsolete silent Supabase lead backup was removed. The old
browser-local admin page now links to the established Office CRM login; account
creation, permission grants and legacy Auth restoration remain outside the reader.

## Current verification and remaining work

Pages `264b05b` is built and exact HTTP readback matched 18 checked files. All
12 removed static catalog-photo paths return 404. The 33-row live catalog and
238 selected assets passed exact bytes/hash/raw MIME/HEAD/Range/CORS readback;
65 nonpublic objects and 36 inactive routes denied. Real Chrome photo/video and
390px layout checks passed. Site 127 and Cloudflare 74 tests pass.

Office `f842b020` / Railway `77ea1377` is live with exact preservation checks.
The sole local publisher runs `9ceeaeda` at PID `42454`; its lock, 197 core
files, all 714 release files and queue baseline were verified at 21:31Z.
Old Supabase anonymous catalog/storage ACLs are closed and the
bucket is private, but CDN cache closure is **INCOMPLETE**: the 2,237-check composite
retained two public Range 206 responses; both property 64/66
returned 206/HIT at HFA in the latest 21:39:34Z probe. Cache purge returned 403
`FeatureNotEnabled`.
Isolated fixture 74 publication lifecycle and recoverable cleanup passed. Complete
cached-object denial remains unresolved. Private positive
control used the authenticated database role, not an actual Supabase JWT session.
No customer submission was sent during the site readback.

The seven unbound standalone-gallery files remain unchanged and outside this
catalog migration. Do not claim all historical media URLs gated. No DNS change
was made; custom media-domain signing/DNS is separate remaining work. See
`PUBLISHING_CONTRACT.md` for current gates and privacy-aware rollback.
