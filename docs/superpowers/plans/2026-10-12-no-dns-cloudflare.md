# Temporary Cloudflare delivery without DNS migration

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


> Current checkpoint: Office and Pages are deployed and public rendering is verified.
> The sole publisher is active; isolated fixture 74 E2E and cleanup passed.
> Residual CDN cache closure and external DNS work remain unresolved. Anonymous ACL closure does not prove all old cached URLs deny.

**Goal:** Keep the current site hostname, Pages hosting and nameservers while the
existing scoped Worker/D1/private R2 connection supplies public catalog and media.

**Architecture:** Preserve canonical immutable media identities under
media.mavorealestate.com in Office packets and D1 hashes. Translate only delivery
requests to the exact existing Worker; its active-reference gate remains binding.
No new credentials, bindings, DNS, roles or billing. Private originals are unchanged.

## Completed live work

- [x] Exact delivery alias for site images/posters/video, Office public reads and
  share images; arbitrary origins and fallback after gated denial fail closed.
- [x] Fresh source/privacy/media capture, encrypted rollback and restored backups.
  Imported 67 projections and preserved two exact inactive owned pilot states;
  signed readback matched all 69 states without overwriting foreign work.
- [x] Office `f842b020` / Railway `77ea1377` SUCCESS. Preservation matched 197
  runtime files, 216 original business rows, six media rows, roles/scopes and
  74 prior variable fingerprints plus four approved public configuration additions.
- [x] Updated the existing sole local publisher to `9ceeaeda`, retaining its
  configuration; PID `42454`, lock, 197 core files, all 714 release files and queue
  baseline verified at 21:31Z. Office Railway remains `f842b020`; 2395 tests passed.
- [x] Pages `264b05b` built; 18 live static hashes matched and 12 removed catalog-
  photo paths returned 404. Catalog 33 rows and 238 selected media passed public
  bytes/hash/raw-MIME/Range/CORS. Inactive/nonselected media and routes denied.
- [x] Actual Chrome photo/video and 390px layout checks passed; no form submission.
- [x] Applied the narrowly approved old anonymous catalog/column grant revocation,
  authenticated-only storage policy and private bucket setting, preserving rows,
  objects, Auth and all other bucket options. Database-role positive reads passed;
  actual Supabase JWT-session behavior was not tested.

## Remaining gates

- [ ] Complete residual CDN cache denial (closure **INCOMPLETE**). The 2,237-check
  composite retained two public Range 206 responses; both property 64/66 returned
  206/HIT at HFA in the latest 21:39:34Z probe. Cache purge returned 403
  `FeatureNotEnabled`; no full old-URL denial claim.
- [x] Isolated fixture 74 acceptance: image Office 6 / D1 8 and video Office 7 / D1
  9; saved Office/provider hashes, selected bytes and native/automated page checks
  passed. Draft preserved the prior public version. Verified withdrawal, 15
  GET/HEAD/Range denials across five URLs, stale approval 409/no revival and
  recoverable archive passed. All 69 original catalog states remained unchanged.
- [x] Resume only the existing sole publisher deliberately with its exact queue
  baseline verified; historical frozen backend intents were not rewritten or replayed.
- [x] Final source/data/role/privacy and sole-publisher readback at 21:48:51Z:
  33 active / 70 total states, fixture 74 inactive at D1 revision 10 and archived;
  all 69 original states and original Office business/media/role/variable data
  preserved. No active publication/removal/location jobs; five historical failed
  removals unchanged.
- [ ] Canonical Tasks/Wiki/Hermes handoff readback.

## Limits and recovery

Seven separately published standalone-gallery files have no authoritative catalog
binding and remain unchanged. Do not claim all historical media URLs gated or
cached copies recalled. The removed twelve catalog fallback copies remain
recoverable in Git but must not be restored over newer withdrawals.

Recheck current source/privacy/removal state before controlled writes. Unknown
outcomes reconcile first; no second publisher or blanket snapshot restore. An
outage never revives snapshots or selects Supabase automatically. DNS was not
changed; custom media hostname/signing work is separate from this live route.
