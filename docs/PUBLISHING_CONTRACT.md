# Office CRM to public-site publishing contract

This contract is for agents and server publishers. The Office CRM is the authority for listing identity; Supabase is the public inventory provider; GitHub Pages is the read-only presentation layer.

## Identity and ownership

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
- If neither live data nor a saved snapshot is usable, the site displays no listings and a visible unavailable-state notice.
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

The coordinated release is deployed. Office and its immutable publisher run `257f194cbe6a04a5c0d0d7ca920b49836b3d3273`; the Office Railway deployment is `c5025829-bc1b-4794-9e30-e6bbfa316f0d`. GitHub Pages serves `c9c262163d6f590316ad4022b6c9c3efb914057d`, with exact public file readback. Authenticated Supabase access is available and `supabase/migrations/202610090001_public_media_manifest.sql` was applied to the existing project after encrypted backup/restore verification with the publisher paused. The nullable validated column, public SELECT grant and existing bucket limits of25MiB JPEG/PNG/WebP/MP4 were read back. The earlier dashboard-login and migration blockers are resolved. Future deployments must retain the coordinated Office/publisher/reader rollout and verify the column before deploying a reader that requires it.

Live acceptance is complete for both isolated image and video revisions. Image A remains the cover with gallery B/A. Video V uses poster/fallback B, which is excluded from gallery V/A. Office saved selection, public provider/asset bytes, canonical sharing metadata, actual playback and live desktop/mobile browser views passed. The previous public image row stayed unchanged during the video draft. After public withdrawal was verified, the owned fixture and its Drive folder were recoverably archived. All 62 original provider rows and NULL manifests remained unchanged. No customer sends; physical-device and third-party preview-cache behavior were not tested.

Local acceptance commands remain `npm test` and `python3 tests/verify_public_media_migration.py`; the latter uses disposable PostgreSQL on a private Unix socket, no live credentials. Database checks include malformed/duplicate/private manifests, active-row RLS, private-column denial and write denial. Local fixtures are isolated; the explicitly authorized live synthetic fixture above is tracked separately and must be withdrawn with verified anonymous absence before recoverable Office archival.
