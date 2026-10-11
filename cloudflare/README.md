# MAVO Cloudflare preparation — 2026-10-11

This directory is an isolated preparation candidate. It does not change the live
website, Office, publisher, DNS, R2 access, or Supabase data. A synthetic static
preview is deployed separately; that does not deploy this Worker or prove D1.

Latest Maor instruction authorizes live migration and the signing-preserving
Spaceship support request. Support chat received the request and escalated it.
A separate D1 pilot database718823a0-f098-464d-b3dc-e510efcf2f08 has the schema
verified; no live catalog import, publisher activation or DNS cutover is claimed.
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
  do not remove that dependency. A versioned publisher adapter is still required.
- Existing Office `6f8f766` and `4595d99` signing releases must be retained. The
  prepared R2 branch does not contain them; deploying it directly would regress
  live signing behavior. Reconcile on the latest proven release first.
- Registrar self-service inspection found ordinary DNSSEC toggle and a zero-entry
  future custom-NS DS panel, not a DS-only withdrawal control. Ordinary disable
  previously caused a cached-DS signing mismatch. Support request was sent with explicit owner authorization on 2026-10-11;
  specialist response remains pending. No DNS change has been applied.

## Artifacts and interfaces

`worker.mjs` + `schema.sql`: prepared public catalog API. Future D1 binding name
`CATALOG`; future server-only HMAC binding `PUBLISHER_HMAC`. Neither was created.

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
