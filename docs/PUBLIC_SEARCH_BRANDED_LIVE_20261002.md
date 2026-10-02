# 2026-10-02 — Branded public search: LIVE VERIFIED

The public form remains https://mavorealestate.com/looking.html and submits to https://forms.mavorealestate.com/public/search-requests on the existing Office service. The frontend contains no Railway origin or credentials. The branded submission host refuses Office login, CRM and other reader routes before authentication. Branding does not replace authentication, validation, rate limits or access control.

## Deployment and acceptance

- Office runtime: `e95a91b42f91cb02e72bae82164e3b8f75719058`; Railway deployment `9bc62225-7bae-4f9b-a969-ab0323becfcd`: SUCCESS. All 159 deployed runtime hashes match; all original business row hashes were retained.
- Public site: `1649cb809ea627222354cd77fc8758caec523a67`; Pages run `36963192622`: SUCCESS. Live HTML, JavaScript and privacy policy bytes match.
- Existing apex and www DNS records were preserved. Only the forms CNAME and ownership TXT were added. DNS ownership and normal HTTPS certificate validation passed.
- Live branded login, CRM and reader routes return 404; intake GET returns 405. Hostile Origin returns 403. The allowed-origin preflight includes no credential allowance. Anonymous Office CRM access returns 403.
- A real native Chrome submission for an isolated commercial purchase search succeeded. Missing privacy acknowledgment blocked submission. Required privacy acknowledgment and independent updates/marketing choices, versions and timestamp persisted correctly through authenticated owner readback and a second reload. The synthetic contact and search were recoverably archived; no customer or marketing message was sent.
- Local verification: 102 host/intake/pipeline tests, 57 public-site tests and 10 consent UI cases at 390/1440 passed. The preceding candidate suite recorded 1,755 passing cases. A physical iPhone and actual marketing delivery remain NOT TESTED.

Required privacy acknowledgment is separate from optional updates and marketing preferences. These preferences do not activate outbound consent or senders. New generated/prepared publication copy includes the public search invitation once; existing external posts were not rewritten.

## Backup and rollback

An existing managed backup identity resolved the lost temporary-key blocker without registering a key or changing access. A fresh 215-member full-volume backup was encrypted (63,679,140 bytes), restored and checked against archive/database hashes. SQLite integrity and foreign-key checks passed; original counts were 35 properties, 30 signatures, 9 staff and 35 contacts. Retain the encrypted artifact for at least 30 days; no automatic pruning.

The database snapshot uses the SQLite backup API. Transient journal/WAL/SHM files are excluded. Recovery verified all archive members were relative files/directories without links before extraction. No replacement encryption key was created.

Rollback the frontend to `0e76d89add89984730bb85b1a8bd39a78f6c57ec` first. The previous Office runtime is `312b6f01b3abb2557f553b96550152e12bdeb3a2`. Preserve saved consent payloads; do not roll back data. Deactivate the added forms routing before restoring an older backend without the branded-host guard. Preserve apex/www DNS records.

## Shared state and limits

Canonical task: `task-f3dda0c9-a0b5-4d7e-b706-5561ba6999f9`, still in progress for broader work. Mission Control: `hermes-ca4b3fcf898bdab211f44969eed5933e0edbbb35`, ready, exact readback SHA `59cd3c3c5ce63fb200f2648d26e8d168960c2afcc79fb35a58d500394309b68c`.

The Codex listing skill and Hermes Office runtime skill contain the scoped domain/consent boundaries. Existing Hermes main session `20260930_223620_3b551f82` resumed, read the instructions and explicitly adopted them. Codex retained release ownership; Hermes did not deploy concurrently.

No payment, account grant, new SSH key, real customer send or public test listing occurred. Paid marketing activation, PWA changes and unsupported downstream publication adapters remain separate pending work. Earlier PREPARED notes are superseded by this live acceptance.
