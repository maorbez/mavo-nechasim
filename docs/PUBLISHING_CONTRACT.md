# Office CRM to public-site publishing contract

This contract is for agents and server publishers. The Office CRM is the authority for listing identity; Supabase is the public inventory provider; GitHub Pages is the read-only presentation layer.

## Identity and ownership

- Office CRM first creates `office_crm_properties` and allocates a persistent, immutable, positive numeric `property_number`.
- The publisher must send that exact value as Supabase `public.properties.id`.
- `office_property_id` stores the stable internal Office CRM row identifier for idempotency.
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

## Two-phase publication

1. Read the exact Office CRM record and its `property_number`.
2. Upsert one inactive Supabase row, using `office_property_id` as the idempotency key and the exact office number as `id`.
3. Reject the operation if an existing row for that office id has a different `id`, or if that `id` belongs to a different office row.
4. Upload photos to deterministic paths for that office record and persist the resulting provider URLs.
5. Read the Supabase row back and verify its id, office id, listing fields, photos, and inactive state.
6. Set `active=true` and `published_at` only after the readback passes.
7. Read the public projection back again through the anonymous API. Internal fields such as `office_property_id` are not exposed to the browser.
8. Open `https://maorbez.github.io/mavo-nechasim/?prop=<property_number>` and verify the exact listing is shown.
9. Store the real publication receipt in Office CRM, then verify it using `GET /office/crm/properties/{property_id}/publication-readback`.

No step may mark the Office record published merely because a request returned 2xx. If a readback fails, leave the listing inactive and record an actionable failure; do not synthesize a receipt.

The Office publication commit endpoint is `POST /office/crm/properties/{office_property_id}/publications`. For the website channel it records `channel="website"`, the public URL, the canonical number as `external_id`, `is_current=true`, and the authoritative `last_verified_at`. A website `external_id` different from `property_number` must be rejected. Missing verification remains pending/fail-closed.

Supabase/PostgREST does not provide a canonical commit id. The target receipt should therefore include the exact row id plus a deterministic SHA-256 hash of normalized anonymous-readback JSON (the public fields, including `id`, `photos`, and `active`) and the real anonymous-readback timestamp. The server separately verifies the internal `office_property_id` link with its service role before activation. Never expose that link or invent a provider commit id.

The readback response exposes the office save/status, canonical number provenance, downstream identity, pipeline status, verified channels, and per-channel URL/external-id/verification state. Completion requires `downstream_identity.supabase_properties_id == downstream_identity.property_number` and a current website surface with `canonical_number_matches=true` and `verified=true`.

## Public reader behavior

- The browser reads only `active=true` rows ordered by `id`.
- A successful empty live result is authoritative and displays no stale listings.
- When the live API fails, the site may show `properties.json` or browser cache only with a visible degraded-state notice.
- If neither live data nor a saved snapshot is usable, the site displays no listings and a visible unavailable-state notice.
- All public deep links use the canonical GitHub Pages origin and the exact office number: `?prop=<property_number>`.

## Recovery debt

The historical snapshot includes Supabase row `id=23` whose description/extra text mentions `#49`. There is currently no provider-backed Office CRM readback proving that row is property 49. Preserve it as unresolved recovery debt; do not rewrite either identifier from free text.
