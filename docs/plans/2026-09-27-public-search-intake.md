# Public property-search landing page

User execution brief dated 2026-09-27 is the approved product specification.

## Ownership
Public site: maorbez/mavo-nechasim, GitHub Pages, mavorealestate.com.
CRM backend/data/deployment: Office release owner, canonical task task-f3dda0c9-a0b5-4d7e-b706-5561ba6999f9.
No parallel customer database. No client-side administrator credential.

## Design
Mobile-first RTL cream/charcoal/gold with existing MAVO SVG and Heebo. Three steps: transaction/category, preferences, contact/consent. Optional fields remain optional. Multiple area chips; appropriate property-type/room fields; rental budget explicitly monthly. Separate unticked optional updates consent.
Static branded URL /looking.html. Calls the Office write-only public endpoint with credentials omitted. Server response is the only success authority. No search/contact lookup by phone. Group links come from server-side approved catalog; unknown coverage yields no invented group.

## Required server contract (proposed until accepted by Office)
POST https://mavo-office-production.up.railway.app/public/search-requests
Content-Type application/json; Origin https://mavorealestate.com
Body <=16KB. Schema version 1:
```
{
 "schema_version":1,
 "idempotency_key":"random UUID",
 "contact":{"name":"...","phone":"...","email":"optional"},
 "search":{"deal_type":"rent|buy","category":"residential|commercial",
 "property_type":"apartment|penthouse|garden_apartment|house|studio|office|shop|warehouse|industrial|land|other|",
 "cities":["..."],"areas":["..."],"budget_max":5000,
 "rooms_min":null,"move_in":"optional ISO date",
 "requirements":["parking","elevator","balcony","garden","furnished","protected_space"],
 "notes":"optional"},
 "consent":{"privacy_version":"2026-09-27","updates":false},
 "source":"mavo_public_search",
 "website":""
}
```
`website` is a honeypot; do not claim success for discarded spam. Budget/rooms may be null; missing rental budget saves lead only pending clarification. Only name/phone/transaction/category required. Source/version/allowed fields enforced on server. Normalized Israeli phone; limits on strings/list sizes; invalid fields 422.

201 or replay 200 only AFTER committed canonical CRM lead/search and exact private readback:
```
{"ok":true,"saved":true,"receipt":"opaque-random-id","routing":"lead_only|active_search",
 "groups":[{"name":"...","url":"https://chat.whatsapp.com/..."}]}
```
No CRM IDs or contact/search data in public response. Existing phone never grants read/update. New requests append distinct searches; same idempotency key+payload replays same sanitized receipt; conflicting payload409. Persist idempotency with same atomic transaction; bounded request fingerprint dedup for accidental resubmission without key. No rewriting prior client details/consent/searches from unauthenticated phone match.
Rent4999: lead only. Rent5000/5001: lead+active search. Buy: lead+active search without rental threshold. Scope category/property type/areas/criteria into existing CRM schema, not site storage. Permissions remain unchanged, owner controls grants.

CORS exact public origin, OPTIONS; no credentials. Unsupported methods405; GET cannot list or find CRM data. Server enforce rate and payload limits (including nonbrowser callers), no unsafe error/log reflection. 429 with Retry-After;503 on unavailable storage. No customer sends on intake. Consent recorded per request with timestamp, version and provenance, without enrolling an existing phone into messaging.
Group source is Office group_links.py catalog derived from Maor's verified community source; route by geography, category, rooms and budget. Retain any existing purchase-group terms requirements. Empty list is valid if no approved matching link.

## Implementation and acceptance
1. Inspect canonical schema, source and deployment ownership; agree endpoint contract.
2. Build frontend and contextual CTA after home/search results; update privacy disclosure.
3. Implement endpoint in Office owner scope; transactional persistence and RBAC tests.
4. UI tests at390/1440, validation, back/forward, optional fields, failure/retry, double submit, multiple searches,4999/5000/5001.
5. Isolated synthetic end-to-end POST then authenticated canonical readback. Prove public read denial. No customer delivery.
6. Backups, deploy each owned surface, live readback and report gaps honestly. Never present mocked success or call the connection active before live verification.

## Current verified blocker
2026-09-27 live OPTIONS of proposed public path returns501 Unsupported method; no usable CORS public intake. Office owner confirms form/backend pending in canonical task. This public release is explicitly marked not open for submission; submit is disabled (including programmatic form submission). INTAKE_READY stays false until real server receipt and canonical readback pass. No live test leads or CRM writes were made by the frontend work. UI fixtures test interactions only, not database persistence. Owner messaging approval requested via async question; not assumed from silence.
