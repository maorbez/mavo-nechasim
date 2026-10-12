# Public catalog reader configuration

`db.js` defaults to the Cloudflare public catalog, `GET /api/properties` at the
current origin. Host the approved static site and API together. The request uses
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

## Local evidence and remaining release work

The new reader tests were observed failing before implementation and passing
afterward. They cover configuration, exact projection/privacy, error/empty cases,
explicit rollback, gallery/card/share mapping and mocked Office receipt behavior
for budgets4999/5000/5001. `npm test`:121 passed. The synthetic preview builder
continues to force its own fake API regardless of production provider/origin
settings and blocks writes/messages/admin independently through its guard/CSP.

These are local checks. Provider deployment, source exports/restores, actual D1/R2
migration, DNS, browser/static caching, absence of Supabase traffic, Office saved
readback, social preview metadata and real mobile/desktop rendering must still
be verified by the release controller. No customer submission was sent here.
