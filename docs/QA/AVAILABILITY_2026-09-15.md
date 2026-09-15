# Public availability correction — 2026-09-15

Public rows 46, 47 and 50 were made inactive after fresh canonical Office readback showed terminal workflow states. The authorized data-only correction used the existing retirement gateway with exact identity, active-state and timestamp conditions. It did not deploy website or Railway code.

Three conditional PATCH requests changed only `active=false` and trigger-maintained `updated_at`. Full provider readback at `2026-09-15T17:00:59.135005Z` verified all other fields and all other 52 rows unchanged. Active inventory decreased from 29 to 26. Anonymous projection matched the previous complete projection minus those three rows. Control 59 remained active with 4.5 rooms; 21 and 31 remained inactive. No identity, media, copy, price or room value changed.

Before mutation, all 55 provider rows, the anonymous projection and the exact Office control records were encrypted and restore-verified. Encrypted backup SHA-256: `cd2355ae199d8c2a108cf4d2359bb9928627fb207462ee17bdcd2db27eab9d66`. The private backup and native Keychain secret remain with the Office release owner for at least 30 days. A rollback requires fresh exact conditions and authorization; never restore the full historical dataset over newer business changes.

Actual headless public UI checks at 1440 and 390 pixels, including reload, passed at `2026-09-15T17:03:59.023Z`: 26 cards, all three targets absent, inactive controls absent, and exact property 59 modal present with 4.5 rooms. No page errors, screenshots or foreground takeover. Independent anonymous readback at `17:02:13Z` agreed.

Fresh Office readback at `2026-09-15T17:09:43.980568Z` verified all six complete control records and all eleven publication records exactly unchanged on deployment `c5f5f99b-63f7-47f0-9758-5ffd630bf009`. Transient supported SSH failures were retried read-only; provider PATCH requests were not replayed. Temporary Railway access was removed and provider, process, socket and local key absence were verified.

Historical NULL Office link repairs remain a separate blocked scope. This active-only operation neither repairs those links nor creates a publication receipt. The earlier audit's proposed SQL-catalog prerequisite was reassessed against the checked-in trigger definition and existing retirement gateway: it was an audit proposal, not a requirement of the publication contract for an active-only correction. Strict backup, conditional mutation and full effect readback were retained.

Sanitized receipts under the Office release owner's outputs: `public-active-preflight-backup.json`, `public-active-correction-receipt.json`, `public-active-live-ui.json`, `public-active-access-cleanup.json`. Canonical website task: `task-821ba295-eef9-4437-adb9-45483c87d84e`.
