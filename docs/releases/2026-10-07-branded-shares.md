# Branded customer-share page — guarded release

Approved by Maor on 7 October. Public base before change: `4d728874c95bb926cf81ef9a767858e9eed5c4f5`, matched remote master and live representative assets. Standalone `/share.html#<capability>` reads the narrow Office API on existing `forms.mavorealestate.com`. No Supabase/catalog, DNS, account, or payment changes. Public page keeps the existing MAVO identity, exact copied Office logo and general-location cards/gallery. No contact/exact address/source identity/free text is projected. Capability stays out of static URLs/referrers. Current source permission is missing, so no real share example exists.

62 public tests pass. Synthetic real-browser integration with Office at1440/390 passes create/copy/reload/gallery/current data/isolation/revoke/expiry/errors. Seeded media cookies/referrers omitted by anonymous image CORS. Real CDN CORS and authorized source contract remain unverified. Client clears content on loss of validation; no local snapshot cache. CSP allows only explicit API/media origins; no analytics/catalog scripts.

Pages rollback base: `4d728874c95bb926cf81ef9a767858e9eed5c4f5`; use reviewed revert without altering catalog data. Office release evidence belongs to Railway projectf7e47939-5547-432a-8a5a-274413ee0f6c in its own mapped Wiki. Deployment/readback appended after actual completion.
