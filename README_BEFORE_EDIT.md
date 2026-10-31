# Read before editing

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


## Historical release — 2026-10-12 21:48Z

GitHub Pages serves `264b05b74238a8659d7044aaeb5320de596cc26c` from the existing
`master` root. Office `f842b020305ecb154086caa859e6eb5e1f01ee74` is deployed on
Railway `77ea1377-fc2a-4b27-86fa-0a6aec4ec03a` with `SUCCESS` and exact source/
data/role/settings preservation. Public catalog/media readback and real browser
photo/video/mobile-sized rendering passed. The sole local publisher now runs
`9ceeaeda` at PID `42454`; its lock, 197 core files, all 714 release files and
queue baseline were verified at 21:31Z. Office Railway remains `f842b020`.
Old anonymous ACLs are closed, but CDN cache closure is **INCOMPLETE**:
two public Range responses were 206 in the composite; both property 64/66
returned 206/HIT at HFA in the latest 21:39:34Z probe. Cache purge returned 403
`FeatureNotEnabled`.
Isolated fixture 74 publish/update/withdraw/retry acceptance and recoverable
cleanup passed. Full migration remains incomplete because legacy CDN denial and
external DNS work remain unresolved.

## Current availability and map behavior

Office exposes the existing stage choices זמין (`in_office`) and הושכר (`rented`).
Rented disables publication and website availability/auto-publication settings;
changing back to available retains the disabled settings and does not publish.
The trusted Office/publisher path enforces eligibility; public `active` remains
visibility, and the browser receives no private business-stage field.

Cards, search and maps renew one catalog session after 45 seconds and expire display
at 60 seconds from request start. Hidden/offline/pagehide clears it; returning
visible/online/pageshow revalidates. Failure and authoritative empty results clear
rows, including any open withdrawn detail. Filters and map bounds survive refresh.

The 33-row public resolver audit found 22 precise pins, five neighborhood-area rows,
four city-area rows and two visibly unlocated rows. General areas come only from
`assets/regions/neighborhood-catalog-2026-10-08.json`; they disclose no inferred
property coordinates and offer no exact navigation. Unknown cities remain visible
in the list/count. This audit and local synthetic rendering are separate from the
new release's exact HTTP verification; fresh native visual verification is pending.

## System map

| Surface | Authority/provider | Current route | Responsibility |
| --- | --- | --- | --- |
| Office CRM | Railway project `mavo-properties`, existing `content-illumination` project ID | Existing Office CRM service | Private records, originals, numbers and owner approval |
| Public inventory | Existing Cloudflare Worker and D1 catalog | Configured `mavo-catalog-pilot-20261011.maor-bezalel.workers.dev` origin | Exact public projection and revision/identity CAS |
| Public media | Private R2 `mavo-public-media` bucket | Same Worker; canonical identities remain under `media.mavorealestate.com` | Current active-reference gate, bytes/MIME/Range/CORS |
| Public site | GitHub Pages `maorbez/mavo-nechasim` | `https://mavorealestate.com/` | Read-only display and stable `?prop=` links |
| Legacy recovery | Supabase `tnkiwgewdancvmkhzlwz` | Retained private source/Auth/objects | Privacy-reconciled recovery only; no automatic browser fallback |

Hostname, Pages hosting, nameservers and DNS are unchanged. Custom-media-domain
signing/DNS work remains separate. The WhatsApp bot is not the Office CRM authority.

## Identity and privacy

Office creates the record first. Its persistent positive `property_number` is the
public catalog ID; providers must not allocate or infer a number. Internal Office
links never belong in anonymous projections. Historical textual number conflicts
remain recovery debt and must not be renumbered from free text.

Outages display an unavailable notice with no stale listings. All migrated active
references use canonical R2 identities delivered through the exact configured Worker.
The twelve old static catalog-photo copies were removed and their public Pages URLs
return 404. Seven separately published standalone-gallery files remain unbound and
unchanged; saved/cached copies and all historical URLs are not claimed revoked.

The approved old anonymous table and 21-column SELECT grants were revoked; the
storage policy requires authenticated access and the bucket is private with its
other options retained. Database-role positive reads passed; no actual Supabase
JWT-session test is claimed. Private service reads remain positive for all 307
objects. Full anonymous CDN object denial is incomplete; no cache-expiry guarantee,
plan change or object deletion is claimed.

## Safe change sequence

1. Read `docs/PUBLISHING_CONTRACT.md` and the no-DNS release status.
2. Inspect exact source, current provider state and privacy/removal queues separately.
3. Make and test scoped changes; preserve signing, source media and immutable IDs.
4. Require existing explicit approval and restore-tested backups before live mutations.
5. Verify the actual public projection, selected bytes, stable link and saved Office
   receipt. Do not resume historical jobs or restore stale public access as rollback.

Run `npm test` for runtime changes. The Supabase schema fixtures and prior recovery
records are historical compatibility evidence, not current public-provider status.
