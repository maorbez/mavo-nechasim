# Scoutr source-photo availability — local companion change

**Not deployed.** This isolated branch starts at `089e616a5caabc3265edb9abc28de8ccdcb653c3`, confirmed by the active public-site owner. Existing map work is preserved; unrelated `property-status` candidates remain in their original checkout.

The Office companion candidate now preserves source property facts and permitted photos when some images are outside its existing authorized media connection. It returns per-record `media_status` and `unavailable_image_count`; it does not expose blocked source URLs or expand any grant.

This public renderer displays that status in both property cards and the full detail view. It distinguishes photos not supplied from photos currently unavailable. An open gallery that becomes empty on fresh source verification closes and clears its counter, revealing the current availability notice. Existing safe media URLs, property keys, source refresh/expiry, anonymous isolation and revocation behavior remain unchanged. Existing API responses without the new fields remain supported.

Files: `branded-share.js`, `share.css`, `share.html` cache versions, `tests/branded-share.test.js`.

Verification: 186 Node tests passed with zero skips/failures. Isolated Chromium and WebKit, each at 390px and 1440px, verified partial/unavailable/none cards, detail notices, gallery refresh, source withdrawal and absence of horizontal overflow or unapproved network requests. Fixtures use synthetic property records; the additional pixel acceptance uses one previously retrieved authorized JPEG and makes no new provider request. No live share was created or deployed.

Evidence: `/Users/maor/.hermes/artifacts/scoutr-media-audit-20261025/public-client/`.
Office integration evidence and canonical Task continuation live in `office-public-facts-20261022/docs/wiki/railway-projects/content-illumination/deployments/2026-10-25-mobile-shell-scoutr-local.md`.

The actual source still has 28 photos unavailable through the retained connection. This companion change does not make them available or establish a new permission. A future coordinated deployment must use fresh recovery, ownership and production acceptance gates; the current request permits local development/testing only.
