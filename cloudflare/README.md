# MAVO Cloudflare catalog and media — current release and history

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


## Current live checkpoint — 2026-10-12

Office `f842b020` / Railway `77ea1377` is SUCCESS with exact original-data/media/
role/settings preservation; Pages serves `264b05b`. The existing scoped Worker/D1/
private R2 route now supplies the public catalog/media without DNS changes.
D1 import/readback matched 69 states (67 imported, two preserved inactive pilots).
Public parity passed for 33 rows, 238 selected assets and all inactive/nonselected
routes. Actual Chrome photos/video and 390px layout passed; 18 static source
hashes matched and 12 removed catalog-photo URLs returned 404.

The sole local publisher runs `9ceeaeda` at PID `42454`; its lock, 197 core
files, all 714 release files and queue baseline were verified at 21:31Z. Office
Railway remains `f842b020`; 2395 Office tests passed.
Approved old anonymous catalog/storage ACLs are closed and the
bucket is private; database-role positive reads passed, not an actual Supabase
JWT-session test. CDN cache closure is **INCOMPLETE**: the 2,237-check composite
retained two public Range 206 responses; both property 64/66
returned 206/HIT at HFA in the latest 21:39:34Z probe. Cache purge returned 403
`FeatureNotEnabled`.
Isolated fixture 74 live publication E2E and recoverable cleanup passed; complete
cached-object denial remains unresolved. Seven unbound standalone-gallery files remain separate and unchanged.
No all-historical-media gating, cache recall or finished workflow claim is made.
See `../docs/PUBLISHING_CONTRACT.md` and the updated no-DNS plan. Earlier dated
sections below are historical preparation/pilot evidence.


## Historical preparation — superseded by the current live checkpoint

The following dated candidate/pilot observations are retained as history; they
do not describe the current Office, publisher, site or D1 activation state.

Latest local follow-up2026-10-12: explicit authenticated stage contract is implemented
and all72CF/24compiler/121site checks pass. Actual303 derivative objects passed fresh
authenticated full-byte/hash/size/raw-MIME/hash-metadata readback. Preliminary
67-row SQL (33active/34inactive,39linked/28legacy-readonly) was imported/reread only
in disposable local SQLite. No provider import is authorized by that preliminary
plan: refresh source/privacy evidence and use an empty production D1 before
activation. Private stage proof never becomes public_verified=true implicitly.

The frontend and Office activation remain candidates. The original live website,
Office publisher, DNS and Supabase source remain unchanged. Actual pilot Worker
code/D1 binding and private R2 staging are deployed separately; they do not prove
a live public migration or an end-to-end publisher connection.

Latest Maor instruction authorizes live migration and the signing-preserving
Spaceship support request. Support chat received the request and escalated it.
A separate D1 pilot database718823a0-f098-464d-b3dc-e510efcf2f08 has the schema
verified. The real signed pilot API was verified after owner confirmation at
2026-10-11T19:28Z; no production catalog import, publisher activation or DNS
cutover is claimed.
Fresh Office encrypted272-member backup independently restored. Native
PostgreSQL/Auth recovery remains unverified and the original Supabase project
will be retained; no destructive retirement is authorized.

## Observed system and decision

- Public HTML/CSS/JS is currently hosted by GitHub Pages. Supabase hosts the public
  property catalog and photo objects, rather than the whole website.
- Supabase owner dashboard: production project `globes`, ref
  `tnkiwgewdancvmkhzlwz`, organization `qpcmduehazstlweontry`. Metadata-only readback
  found one public table (`properties`, RLS enabled), 63 property rows, one legacy
  Auth user, Postgres 17.6, one public `property-photos` bucket, no Edge Functions.
- Both `anon` and `authenticated` have SELECT on exactly the 21 columns in
  `PUBLIC_COLUMNS`. Existing identity/time triggers and manifest checks are present.
  Named legacy authenticated CRUD policies exist but column/table grants must also
  be considered; a policy alone is not an edit permission.
- At observation on 2026-10-11, organization usage showed cached egress
  **13.873/5 GB**, uncached egress **2.051/5 GB**, average storage **0.234 GB**,
  database **26.34 MB**. Current notice says grace ends **13 Oct 2026** and
  restrictions may return 402. This supersedes the earlier pasted 1 Nov date for
  this verified organization. These figures are provider observations, not a cost
  forecast or proof savings already occurred.
- Office owns private CRM, users, roles, searches, signatures and approvals in
  its existing Railway SQLite signing store. Keep that system and its identities.
  D1 is a SQLite public projection, not a PostgreSQL/Auth/RLS replacement.
- Existing publisher is the only publishing controller. Its completion validation
  and inventory consumers currently depend on Supabase/PostgREST. R2-only flags
  do not remove that dependency. A versioned publisher adapter is locally implemented/reviewed in the separate
  Office candidate `dd5bc4e`; integration preserves latest live source `5d2366a`.
  All2350 Office tests and independent review passed locally. Actual deployment
  and single-publisher activation remain required.
- Existing Office `6f8f766` and `4595d99` signing releases must be retained. Latest live source is now5d2366a/Railway31f07111; its separate executor
  verified190files/74settings/211original rows and released the deployment slot.
  Candidate integration must preserve that release before final testing.
- Registrar self-service inspection found ordinary DNSSEC toggle and a zero-entry
  future custom-NS DS panel, not a DS-only withdrawal control. Ordinary disable
  previously caused a cached-DS signing mismatch. Support request was sent with explicit owner authorization on 2026-10-11;
  specialist response remains pending. No DNS change has been applied.

## Artifacts and interfaces

`worker.mjs` + `schema.sql`: prepared public catalog API. Future D1 binding name
`CATALOG` is bound to pilot database718823a0-f098-464d-b3dc-e510efcf2f08.
Server-only `PUBLISHER_HMAC` was owner-confirmed and saved encrypted in production
settings of the isolated pilot Worker. The protected publisher credential file
contains exactly `publisher_hmac`; values are never placed in source/browser code.
Active pilot version `15a297e0` is Ready. No production import or publisher
activation occurred.

- `GET/HEAD /api/properties`: active public projections, ordered numeric IDs,
  bounded 1001-row read, fail closed over 1000. `GET/HEAD /api/properties/:id` returns
  an active row or 404. No arbitrary query or private CRM/Auth/Storage route.
- `PUT /internal/publications/:id`: server-to-server only; browser Origin rejected.
  Envelope: `{schema_version:1,office_property_id,revision,expected_revision,
  dispatch_id,property}`. Public `property` contains exactly the existing 21 keys.
  Header `x-mavo-time` is Unix seconds, +/-300s; `x-mavo-signature` is hex HMAC-SHA256
  over `PUT\n/path\ntimestamp\nraw_body`. Max envelope 131072 bytes, projection
  65536 bytes. The existing publisher must use the same frozen dispatch on retry.
- `GET /internal/publications/:id` and `GET /internal/publications` use the same
  server-only signature over `GET\n/path\ntimestamp\n` (empty body). They expose
  exact revision/dispatch/hash/Office identity only to the publisher, validate
  payload hashes and include inactive tombstones for recovery. The full signed
  inventory is bounded to1000. Anonymous/browser/tampered/stale requests deny.
- Atomic revision CAS preserves identities, rejects stale/foreign writes; same
  dispatch/revision/hash replay is verified by actual DB payload readback, including
  overlapping initial requests. Receipt `{saved,replayed,provider:'cloudflare-d1',
  id,revision,payload_hash}` proves only this catalog write. It is not an Office
  published receipt and cannot settle existing Office work yet.
- Manifest keeps stable IDs, cover/order, image optional poster/fallback, and video
  required image poster/fallback. Unknown fields/private media URLs are rejected.
  Legacy null manifests/public Supabase bucket URLs remain source-compatible.
  Optional price_label/emoji/bg and unknown amenities preserve their source nulls.
  Six existing Postify media rows still require backed-up asset migration; these
  URLs are not silently accepted by widening the public provider allowlist.
  Approximate-location rows with coordinates fail rather than silently redacting.
- Metadata and hashes stay internal. Public reads use no-store and validate payload
  hashes. Privacy withdrawal must also address already cached media/links before a
  real release; the candidate catalog alone does not revoke immutable asset URLs.

`tools/export-catalog.mjs`: accepts already supplied local JSON, exact public
projection + separate private reconciliation + deterministic hashes. Missing links
remain unresolved. It does not connect to Office/Supabase or infer identities.
`tools/postgres-export.sh`: manual gated full owner-local dump preparation only,
never executed against the provider here. It includes schemas/Auth/ownership/ACLs;
managed roles/config/functions/object bytes require separate preservation. No
native PostgreSQL/Auth restoration has been proven. See `tools/README.md`.

`tools/build-preview.mjs`: copies allowlisted existing approved design assets and
11 Hebrew pages into a new outside-source folder with only three synthetic rows.
Same-origin static `/api/properties.json` is distinct from the proposed D1 API.
Forms/writes/messaging/admin are blocked by copied code, early guard and CSP.
All output hashes are in `hashmanifest.json`; no translated/admin/gallery/share or
real-property-photo bundle. Public keyless map tiles/CDN are presentation dependencies.
Noindex is a crawler request; the synthetic preview remains publicly accessible.

## Private R2 delivery gate — bound pilot verified; public origin pending

The actual303-object staging ledger includes65 objects belonging to inactive or
withdrawn listings. A direct public bucket/custom domain or r2.dev route would
expose those files. Keep the bucket private and route media through the reviewed
Worker with binding `PUBLIC_MEDIA_BUCKET` -> existing `mavo-public-media`.
Maor approved this exact bucket binding; it is applied as Ready100% pilot
version `1825bff3`, retaining reviewed code from `aa5e8d76`, CATALOG and encrypted
HMAC. This is the isolated pilot, not the public MAVO media origin.
The binding itself offers storage read/write capabilities; the reviewed code
exposes only GET/HEAD delivery, never list/upload/delete operations.

Only an exact immutable property/revision/hash URL referenced by an active,
hash-verified CATALOG projection may be served. Photos and selected manifest
URLs/posters/fallbacks qualify. Storage key/hash metadata/size/MIME/ETag are
checked; active references are checked again after storage I/O. Delivery uses
no-store, ignores stored cache-control, supports HEAD and single/suffix byte
ranges, and rejects malformed/multipart ranges. Media-host API, private, write
and query routes deny. Authenticated upload/readback byte hashes remain required;
object metadata is not per-request content hashing. No external Cache Everything
rule may override the gate. Already authorized streams/downloaded external
copies cannot be recalled by this code.

TDD RED then GREEN: nine focused tests and all71 Cloudflare tests passed; site121
passed. Independent review found no important issue. Exact editor source hash
was verified before the pilot code deployment;12 read-only actual-provider checks
then passed: CATALOG/HMAC retained, inactive fixtures unchanged, and unbound
GET/HEAD/Range503, media writes405, malformed/query/private routes denied.
After binding,49 actual-provider checks passed: synthetic selected PNG/MP4,
poster/fallback exact full bytes/hash/size/MIME, HEAD and single/suffix Range;
malformed ranges/writes/private reads denied. All65 inactive staged object URLs
denied GET/HEAD/Range (195 requests). Warmed deselected URLs and all synthetic
media denied after recoverable withdrawal. Two owned pilot rows remain inactive;
production must use a separate empty catalog. Final media domain, original
Office/site and publisher flags remain unchanged. This is pilot proof only.

## Run local evidence

```sh
node --test cloudflare/tests/*.test.mjs
npm test
node cloudflare/tools/build-preview.mjs --out /absolute/new-directory
```

Node 24 with real `node:sqlite` was used. These tests are not actual Cloudflare D1
runtime tests. Export tests use fake pg_dump; they cannot prove native restore.
The frontend source now has an explicit Cloudflare reader and Supabase rollback
flag. No production deployment of that reader is claimed. Browser/provider evidence is recorded
separately in the owner-local migration artifact folder.

## Next approved preparation versus eventual activation

See `docs/superpowers/plans/2026-10-11-cloudflare-exit.md`. Still required: actual
provider/Office exports and restores, established Office identity reconciliation,
legacy Auth preservation and approved replacement route, publisher adapter/versioned
receipts, full frontend/Office/OG/API compatibility, public R2 origin, real D1 pilot,
DNS safety, rollback rehearsals, production confirmation and exact live readbacks.
Do not claim Supabase exited or media savings until those conditions pass.

## Primary references

- [D1 overview](https://developers.cloudflare.com/d1/) — SQLite, not PostgreSQL.
- [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
  — prepared statements/bindings and transactional batch behavior.
- [Workers dev URLs](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
  — temporary trial independent of production domain cutover.
- [Static assets limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
  — verify current free plan and limits before any deployment.
- [Spaceship custom nameservers](https://www.spaceship.com/knowledgebase/connect-domain-custom-nameservers/)
  — registrar transition reference; not evidence a safe DS-only control exists.

## Activation observation — 2026-10-11

- Spaceship support request was sent and read back in chat; senior email case
  `SPS-QHV-5830` / engagement `SPS-EIZ-7660` confirms received/working. It does
  **not** confirm parent DS removal. No DNS/NS/signing change has been made.
- Pilot Worker code version `af1a8ebd`, `CATALOG` D1 binding and secret deployment
  `15a297e0` are saved. Exact existing publisher transport headers/signature now
  receive200 from public and signed internal reads; no spoofed browser identity
  or security-policy change. Earlier plain-client403/1010 evidence is historical.
  Twenty-three actual pilot checks passed: write/readback hash, replay, concurrent
  identical requests, CAS/stale/foreign denial, private-field/browser/anonymous
  denial and withdrawal. The two synthetic pilot rows990001/990002 were withdrawn
  and retained inactive; public list is empty and details404. This pilot database
  is isolated: production import requires an empty production catalog, not these
  synthetic tombstones. No real Office or public-source record was mutated.
- 303 immutable R2 objects totaling169043548bytes were written with conditional
  create and independently authenticated-read checked for bytes/hash/size/MIME.
  All evidence remains `public_verified:false, verified:false` until the real
  public origin is readable. Sources/private Office originals remain intact.
- The one unavailable source is property13's legacy Postify MOV (404); its seven
  photos are valid. Source Office/Drive media tables contain no recovery copy.
  Maor explicitly approved migration with its seven existing photos only. The
  unavailable video/reference and exact source-projection hash remain in private
  recovery evidence. The authorized desired projection has303 unique references;
  source Supabase and Office records are unchanged until cutover.
- Fresh source63rows/307objects and real Office43-property/10-removal ledger were
  captured.23null links reconcile through established Office numbers;28 public
  numbers have no Office record and stay legacy read-only. Office flag=false is
  not a withdrawal. Failed/requested terminal removals still suppress import.
- Offline compiler23tests plus fullCF71/site121pass. The actual complete privacy
  capture covers43 properties,39 pipeline revisions,11 settings, zero location
  withdrawal jobs and10 removals. Actual `yad2` removal channels remain valid;
  no removal is discarded. The two approximate Office records are archived and
  remain inactive. Active approximate records without canonical sanitized-text
  proof fail closed; the initial compiler offers no proof override. See
  `../docs/CLOUDFLARE_MIGRATION_READINESS.md`.
  Actual normalized input with303unverified public replacements is rejected as
  `unverified_media_replacement`; no SQL/import was produced. Before import,
  refetch source/Office/removals and verify the frozen input hashes again.

### Old public provider withdrawal gate

A Cloudflare-only withdrawal must not leave a previously exposed Supabase
catalog row/storage endpoint readable, or allow a raw historical rollback to
revive it. Before production backend cutover, verify new delivery and then
recoverably revoke old anonymous/public catalog and bucket delivery, retaining
owner-authenticated source and encrypted recovery. Capture the existing grants
and bucket configuration first; actual anonymous-denial readback is mandatory.
The exact original21-column grants, seven policies and public bucket metadata
were captured through owner read-only SQL at2026-10-11T17:30Z. The approved revocation was applied on October 12; table and 21-column SELECT,
authenticated storage-policy scope and private bucket options were read back.
The complete anonymous object-denial sweep remains pending at the current checkpoint.
Ledger-gated recovery remains private and must reconcile newer withdrawals.
If old public delivery cannot be revoked, activation is blocked unless the one
publisher provides verified per-provider withdrawals. No second writer, blanket
snapshot restore or implicit fallback is permitted. Rollback must reconcile the
fresh withdrawal/approval ledger; restoring access to stale withdrawn rows is
not a safe rollback. CDN and third-party cached immutable-media lifetimes remain
separate limits and are not proven revoked by a catalog404.

Canonical Tasks and bounded existing Hermes topic context were updated and read
back at2026-10-11T17:22Z. Native context-loader readback is verified, active
Hermes-session receipt is not; no supported Mission Control status writer was
available. Private detailed receipts are under the existing owner-local
`live-activation-20261011` artifact folder, not in public source.

### Private staging and post-activation verification

The deployed Office adapter uses authenticated `put_prepared` before CAS and checks
every selected preserved URL privately. Raw MIME, bytes/hash/size and Worker hash
metadata must match. Public full-byte verification of unique selected photos,
manifest URL/poster/fallback happens afterward. Legacy `put_verified` remains
separate. The compiler accepts explicit versioned authenticated stage proof,
preserving `public_verified:false`; its output says authenticated-stage-only and
`public_delivery_verified:false`. No raw bucket exposure or invented public proof.

Confirmed post-CAS failure may withdraw only the exact signed attempted state
with a deterministic monotonic content-free tombstone. Unknown transport outcomes
read back first; cleanup replay is read-only. Office recomputes exact proof,
records failed settlement without a success receipt and retires prior current
receipts as history. Newer/foreign projections are never overwritten. Staging
failure preserves the prior listing; after CAS, failure withdrawal hides it.
The implementation is deployed in Office `f842b020`; the sole local publisher
now runs `9ceeaeda` at PID `42454`. Isolated fixture 74 workflow acceptance and
recoverable cleanup passed. Complete legacy CDN denial remains unresolved;
source/backup/full-suite preservation checks passed.

## Temporary delivery without DNS — live route, isolated acceptance verified

The existing scoped pilot origin can transport both catalog and media without a DNS change. Preserve canonical `media.mavorealestate.com` references and hashes; only site/publisher/share delivery is translated. The current Worker already resolves those canonical active references on its workers.dev media path. A dedicated public configuration file and exact publisher delivery override select that one existing origin; no arbitrary proxy or wider credentials.

Keep exact inactive owned pilot tombstones through frozen compiler
`preservedCatalog` evidence. The 67 source inserts plus two preserved states were
imported and exactly reread; historical prepared filenames are not current status.
Site 127 and Cloudflare 74 tests pass. Source/privacy parity was refreshed after
Office deployment before the site switch. The authorized old-provider closure is
applied, with complete anonymous object verification pending. See the current
checkpoint and `../docs/superpowers/plans/2026-10-12-no-dns-cloudflare.md`.
