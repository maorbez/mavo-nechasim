# Office CRM to public-site publishing contract

## Current checkpoint — 2026-10-13 local / 2026-10-12 UTC

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


This contract is for agents and the sole server publisher. Office CRM is canonical
for private records, originals, immutable property numbers and owner approval.
Cloudflare D1/Worker and private R2 now supply the public projection/media; GitHub
Pages remains the read-only presentation layer. The publisher is resumed with its
queue baseline verified. Isolated fixture 75 availability API acceptance and
cleanup passed; fixture 74 publication E2E remains historical evidence. Residual
legacy CDN cache closure remains unresolved. The current checkpoint at the top
supersedes the preserved no-DNS history below.

The following Supabase-specific protocol and October 10 release notes document
retained legacy compatibility and history. They do not authorize reopening old
anonymous access or restoring stale projections after a newer withdrawal.

## Current availability, visibility and legacy identities

Use the established Office stages: `in_office` is available (זמין); `rented` is
rented (הושכר). Current publication eligibility requires the canonical available
Office state and effective website availability, plus the existing owner approval,
privacy and revision checks. Reserved/recruiting/terminal states must not remain
public through a status change. Moving to rented disables publication and website
availability/auto-publication; reopening available does not publish or re-enable
those settings automatically. Concurrent stale saves return 409.

The public browser still receives exactly 21 fields; `active` is publication
visibility, not a separate business availability status. A historical false
`public_listing_enabled` flag alone is not authority to retroactively withdraw a
migrated row. Explicit availability/privacy transitions use the authoritative
Office withdrawal path and verified provider receipt. Preserve unbound legacy
public numbers 16, 17, 24, 25, 29 and 36 as read-only public identities; never infer
an Office binding from text, coordinates or an unrelated record.

The shared reader renews every 45 seconds and expires display 60 seconds after
request start; hidden/offline/pagehide, failures and empty results clear stale rows.
Revalidation on visible/online/pageshow and generation guards prevent late-response
revival. Removed/changed detail content is cleared, preserving inquiry drafts,
filters and map bounds. These are bounded freshness limits, not instant revocation.

Maps retain exact published pins and represent missing/private approximate coordinates
as labeled general neighborhood/city areas from the local authoritative region
catalog only. Unknown cities remain visibly listed/countable. General areas are
never precise property coordinates or navigation destinations. Current resolver
audit preserves all 33 rows: 22 precise, five neighborhood, four city, two unlocated.

## Historical Supabase identity and ownership

- Office CRM first creates `office_crm_properties` and allocates a persistent, immutable, positive numeric `property_number`.
- The publisher must send that exact value as Supabase `public.properties.id`.
- `office_property_id` stores the stable internal Office CRM row identifier for idempotency.
- Every new Supabase row must include a nonblank `office_property_id`. Historical rows may remain null until an authoritative one-time backfill; after linkage, it is immutable.
- `supabase_property_id` in Office CRM is a legacy publication mirror. It may be populated only from a verified Supabase publication receipt and must equal `property_number`.
- Never infer or allocate identity from listing text, address, order, count, `max(id)`, or a Supabase-generated value.

## Trusted publisher inputs

Create the office record with `POST /office/crm/properties/intake` (legacy `POST /office/crm/properties` follows the same contract). The request supplies a stable `idempotency_key` and must not supply `property_number`; Office CRM allocates that number. The response contains `record` and `publication_readback`.

The server publisher then receives the Office CRM record and writes an explicit Supabase payload containing at least:

```json
{
  "id": 49,
  "office_property_id": "<stable-office-row-id>",
  "title": "...",
  "location": "...",
  "photos": [],
  "active": false,
  "office_updated_at": "<ISO-8601 timestamp>"
}
```

`id` is the Office CRM `property_number`, not an example of a number the publisher may choose. The service-role credential stays in the server environment and must never be returned to the browser, written to logs, or committed here.

## Verified publication

1. Read the approved, frozen Office revision and immutable property number. Verify both existing provider identities; never infer a link or upsert over a foreign identity.
2. Capture the current provider precondition and complete public projection. Restore-test the encrypted provider backup before mutation.
3. Upload each selected derivative to its immutable property/revision/hash path. Verify its bytes through both authenticated and anonymous storage reads before beginning a row change. Transfer one bounded file at a time.
4. Recheck the provider precondition and Office approval/revision. A newer Office selection invalidates stale work before the row CAS.
5. For a new or already inactive listing, insert/update an inactive row, verify the stage, and activate using CAS. For an existing active listing, replace the public projection in one CAS write, keeping the old listing visible until every new asset is ready.
6. Read the public projection anonymously, verify identity/media/hash, and verify desktop/mobile detail rendering at the unchanged `?prop=<property_number>` URL.
7. Complete the existing Office dispatch with the verified public-row receipt, then independently read it back. A 2xx alone never means published.

Failed upload leaves the last public row unchanged. Failed page verification restores the previous complete public projection only when the provider still contains this exact attempted revision. Concurrent edits are never overwritten. Unknown outcomes use the original dispatch and identity/revision readback before retry; they are not new publications.

The Office publication commit endpoint is `POST /office/crm/properties/{office_property_id}/publications`. For the website channel it records `channel="website"`, the public URL, the canonical number as `external_id`, `is_current=true`, and the authoritative `last_verified_at`. A website `external_id` different from `property_number` must be rejected. Missing verification remains pending/fail-closed.

Supabase/PostgREST does not provide a canonical commit id. The target receipt should therefore include the exact row id plus a deterministic SHA-256 hash of normalized anonymous-readback JSON (the public fields, including `id`, `photos`, and `active`) and the real anonymous-readback timestamp. The server separately verifies the internal `office_property_id` link with its service role before activation. Never expose that link or invent a provider commit id.

The readback response exposes the office save/status, canonical number provenance, downstream identity, pipeline status, verified channels, and per-channel URL/external-id/verification state. Completion requires `downstream_identity.supabase_properties_id == downstream_identity.property_number` and a current website surface with `canonical_number_matches=true` and `verified=true`.

## Public reader behavior

- The browser reads only `active=true` rows ordered by `id`.
- A successful empty live result is authoritative and displays no stale listings.
- When the live API fails, do not revive a static or browser snapshot: it may contain an address the owner has since hidden. Show no listings and a visible unavailable-state notice.
- Saved snapshots are never a current recovery source; an unavailable live source displays no listings and a visible unavailable-state notice.
- All public deep links use the canonical public domain (hosted on GitHub Pages) and the exact office number: `?prop=<property_number>`.

## Recovery debt

The historical snapshot includes Supabase row `id=23` whose description/extra text mentions `#49`. There is currently no provider-backed Office CRM readback proving that row is property 49. Preserve it as unresolved recovery debt; do not rewrite either identifier from free text.

## Public location privacy (2026-09-26)

Office retains the canonical exact address for signing. Office controls `public_location_mode` (`exact` or `approximate`) and an explicitly supplied `public_location_label`. The existing public schema transports approximate mode as the exact `extra` value `מיקום משוער`; no schema expansion is required. In approximate mode the trusted publisher must replace title with the public label, rebuild description from safe structured facts, clear exact lat/lng, and omit private address/free-text details. Public `location` keeps city and neighborhood classification. The public reader maps this marker to `publicLocationMode`, adds a visible approximate label, suppresses navigation, and never positions a precise map pin. This is defense in depth; the server projection must never contain the hidden address.

A published exact listing must be withdrawn or sanitized with provider readback before Office confirms an approximate-location change. The public static snapshot is intentionally empty and runtime snapshots/browser caches are not used: old addresses must not reappear during outages. Existing previously shared external copies cannot be recalled by this site.

## Stable public media (2026-10-09 release; live verified 2026-10-10)

The nullable `media_manifest` is `{version:1,cover_media_id,items:[{id,type,url,poster_url?,fallback_url?}]}`. Array order is gallery order, never cover identity. The separate Office draft keeps stable source IDs, selections and poster/fallback references; none of its private source URLs or customer fields are public. Up to80 gallery items use the existing public `property-photos` bucket. Derivatives are branded with the official MAVO asset and Hebrew wordmark; originals remain private and unchanged.

A video has a static poster for cards/map/sharing, controls on the detail page, no automatic playback/audio, and a fallback image. Existing null manifests retain legacy presentation. Existing public photos stay unchanged until an explicit Office selection. Malformed explicit manifests fail closed. Public media URL allowlists do not accept arbitrary Office URLs.

New explicit selections use the approximate public-location projection, retaining exact addresses only in Office/signing. Public card/detail previews do not reveal the private address. Selection saves are drafts and pause auto publication; the existing authorized approval remains necessary.

The optional verified share URL `https://forms.mavorealestate.com/public/property-preview/<number>` serves escaped public metadata from the exact verified Office receipt and redirects to the existing canonical property link. GET/HEAD only; no public CRM reader. Removal or pending/failed privacy withdrawal immediately denies this preview. Existing capability-based `share.html` is unrelated and unchanged.

At the October 10 release, Office and its immutable publisher ran `257f194cbe6a04a5c0d0d7ca920b49836b3d3273`; the Office Railway deployment is `c5025829-bc1b-4794-9e30-e6bbfa316f0d`. GitHub Pages served `c9c262163d6f590316ad4022b6c9c3efb914057d`, with exact public file readback. Authenticated Supabase access is available and `supabase/migrations/202610090001_public_media_manifest.sql` was applied to the existing project after encrypted backup/restore verification with the publisher paused. The nullable validated column, public SELECT grant and existing bucket limits of25MiB JPEG/PNG/WebP/MP4 were read back. The earlier dashboard-login and migration blockers are resolved. Future deployments must retain the coordinated Office/publisher/reader rollout and verify the column before deploying a reader that requires it.

Live acceptance is complete for both isolated image and video revisions. Image A remains the cover with gallery B/A. Video V uses poster/fallback B, which is excluded from gallery V/A. Office saved selection, public provider/asset bytes, canonical sharing metadata, actual playback and live desktop/mobile browser views passed. The previous public image row stayed unchanged during the video draft. After public withdrawal was verified, the owned fixture and its Drive folder were recoverably archived. All 62 original provider rows and NULL manifests remained unchanged. No customer sends; physical-device and third-party preview-cache behavior were not tested.

Local acceptance commands remain `npm test` and `python3 tests/verify_public_media_migration.py`; the latter uses disposable PostgreSQL on a private Unix socket, no live credentials. Database checks include malformed/duplicate/private manifests, active-row RLS, private-column denial and write denial. Local fixtures are isolated; the explicitly authorized live synthetic fixture above is tracked separately and must be withdrawn with verified anonymous absence before recoverable Office archival.

## Deployed Cloudflare protocol — 2026-10-12; isolated E2E verified

The private `mavo-public-media` bucket is bound to the existing scoped catalog Worker. Its Worker serves GET/HEAD and single Range requests only when the exact object is referenced by a currently active public projection; inactive, deselected and foreign objects are denied. The bucket itself and `r2.dev` remain private. Office private CRM, source media, owner-only approvals and canonical property numbers remain unchanged.

The deployed Office publisher implementation authenticates immutable uploads and all retained selected objects before the catalog CAS. Each stage proof binds bytes, filename SHA-256, raw MIME and R2 hash metadata. Anonymous delivery is checked only after the exact catalog revision is active. The migration compiler records `media_verification="authenticated-stage-only"` and `public_delivery_verified=false`; this is not proof of public delivery or permission to import a stale capture.

A confirmed post-CAS media/page failure can withdraw only that exact attempted identity/revision/dispatch using a deterministic content-free tombstone at revision N+1. The Office dispatch settles as blocked `publication_failed_withdrawn`, with no successful publication receipt. Unknown transport outcomes reconcile signed provider state before writing; newer or foreign states are never overwritten and old active projections are never resurrected. A staging failure retains the previous listing; a verified withdrawal hides the failed listing. See `cloudflare/README.md`, `docs/CLOUDFLARE_MIGRATION_READINESS.md` and the Office staging/recovery plan for the deployed protocol and remaining gates.

The earlier isolated pilot checks remain historical evidence. The current live
cutover below uses the existing bound D1 with exact preserved inactive pilot states,
not a newly emptied database. Public display and infrastructure readback are verified;
isolated fixture 74 publication, update, withdrawal, replay denial and recoverable
cleanup are now verified.

## Historical live no-DNS cutover — 2026-10-12 21:48Z

Office `f842b020305ecb154086caa859e6eb5e1f01ee74` / Railway
`77ea1377-fc2a-4b27-86fa-0a6aec4ec03a` is `SUCCESS`. Exact preservation matched
197 runtime files, 216 original business rows across 11 tables, six original media
rows, roles/scopes and 74 prior variable fingerprints; only four approved public
configuration additions and the approved additive schema were applied.
The sole local publisher now runs `9ceeaeda63dce22c1117fc2504c028e1c52f4cac`
at PID `42454`. Its lock, 197 core files, all 714 release files and exact queue
baseline were verified at 21:31Z. Office Railway remains `f842b020`; the publisher
patch does not change the Office deployment. Office 2395 tests passed. Runtime
readiness is separate from the verified fixture receipts recorded below.

Pages built site `264b05b74238a8659d7044aaeb5320de596cc26c` at 20:31:55Z.
`public-catalog-config.js` selects the exact existing Worker for catalog and media
delivery. Immutable canonical media identities, gallery order, cover IDs and
property numbers remain unchanged. No DNS, hostname, Pages hosting or nameserver
change was made; custom media-domain signing/DNS remains separate work.

Fresh source/privacy evidence, encrypted restore checks and destination readback
passed. The migration readback matched 69 exact baseline states: 67 imported
plus two preserved inactive owned pilots, 33 active and 36 inactive. The later
isolated fixture 74 is tracked separately; the baseline count is not a current
whole-catalog count. Public parity passed for all 33 rows and 238
selected assets (147210789 bytes), including hash/raw MIME/HEAD/Range/CORS.
All 65 nonpublic staged objects and 36 inactive catalog routes denied.

Actual Chrome loaded a seven-photo gallery and a native video (readyState 4,
576x1024, controls, no autoplay); a 390px viewport had no horizontal overflow.
Ordinary HTTP matched all 18 checked site files, and all 12 removed static
catalog-photo paths returned 404. The unchanged intake/privacy shell retains
required privacy consent and optional marketing; this check sent no form.
Seven separately published standalone-gallery files have no authoritative catalog
binding and remain unchanged. No all-historical-media-URL gating or cache-recall
claim is made.

The approved legacy closure revoked anonymous table SELECT and all 21 column
SELECT grants, restricted the storage read policy to authenticated access, and
set the bucket private while preserving every other option and all objects.
Authenticated database-role positive reads returned 33 active rows and 307 objects;
this was not an actual Supabase JWT-session test. Private service readback remains
positive for all 307 original objects. CDN cache closure is **INCOMPLETE**: the
2,237-check composite retained two public Range 206 responses; the latest 21:39:34Z
probe returned 206/HIT at HFA for both property 64/66. Cache purge returned 403
`FeatureNotEnabled`; no object was changed or deleted and no plan was enabled.
Full anonymous old-URL denial must not be claimed from closed ACLs alone.

Isolated fixture 74 acceptance is complete: image Office 6 / D1 8 and video Office
7 / D1 9 matched saved Office hashes, canonical provider projections and selected
bytes. The previous public version stayed unchanged during the video draft. Native
Chrome gallery/video and normal publisher 1440px/390px verification passed.
Withdrawal, all 15 media denial checks, stale approval 409/no revival and recoverable
archive passed; all 69 original catalog states were preserved throughout. Detailed
receipts remain in the owner-local evening migration artifacts.

Remaining gates: complete residual CDN cache denial, external signing-preserving
DNS work and canonical handoff readback. Final source/data/role/privacy and
sole-publisher readback passed at 21:48:51Z. The existing sole publisher is already resumed. Do not replay old migration plans over changed source or
privacy work. Rollback must reconcile current approvals/withdrawals before any
old public reader, grant or static-photo copy is restored. Deployment, public
rendering and local tests (site 127, Cloudflare 74, Office 2395) are separate from
the now-verified fixture workflow; neither proves complete legacy CDN closure.
