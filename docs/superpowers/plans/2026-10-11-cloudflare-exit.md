# MAVO public Supabase exit implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Independent audits may use explicit dispatching-parallel-agents; one production publisher/controller only.

**Goal:** Complete the authorized reversible exit for the public catalog and media without changing Office identities, permissions, URLs or existing publication semantics.

**Architecture:** Keep private Office SQLite/Auth/CRM/signing in Railway. Publish only approved public projections through the existing owner-authorized publisher into a Worker/D1 catalog and immutable R2 assets. Preserve Supabase Auth privately for recovery; replace unsupported public legacy admin routes with the existing Office identity rather than creating users.

**Tech stack:** Existing Python Office/publisher, Cloudflare Workers/D1/R2, unchanged approved static RTL frontend, Node 24 synthetic SQLite tests.

**Spec:** `cloudflare/README.md` including observed inventory and interface contract.

## Global constraints

- Latest explicit Maor authorization permits completing the live public migration and sending the prepared Spaceship request. Keep exact existing access/billing scope; no customer sends, destructive retirement or new private-CRM exposure. Security-sensitive UI actions follow action-time confirmation policy. The separate Office signing executor released its slot after live5d2366a verification; preserve that exact source and recheck it before integration.
- Keep public numeric property IDs, stable Office links, gallery order/cover IDs, approximate-address privacy, users/permissions, private originals and existing URLs.
- Only Maor's existing Office owner may publish/integrate; employees retain current draft and terminal privacy-withdrawal rights.
- Reuse Task `task-f3dda0c9-a0b5-4d7e-b706-5561ba6999f9`; no duplicate publisher/task.
- Preserve newer live Office signing commits `6f8f766`, `4595d99` and latest live `5d2366a` before integration.
- Local green tests, static preview deployment, actual D1 deployment and verified live migration are separate evidence states.

## Review focus

1. Overlapping identical dispatch after unknown transport outcome must reconcile once.
2. Withdrawal during migration/rollback must never revive a historical property or link.
3. Legacy null Office link/Auth user/unsupported asset URL must be explicitly preserved or block release.
4. Provider partial media upload must leave the previous valid public revision intact.
5. PostgREST consumers and old provider receipts must remain compatible with recorded history.

### Task 1: Recoverable inventories and export tools

Files: `cloudflare/tools/{readonly-inventory.sql,postgres-export.sh,export-catalog.mjs,README.md}`; tests `cloudflare/tests/export-catalog.test.mjs`.
Consumes: supplied local complete rows; exact owner-approved connection environment only for a later export.
Produces: `buildExport(rows)`, `writeExport(rows,destination)`, `verifyExport(destination)`, public catalog + private reconciliation + manifest.

- [x] Metadata-only owner UI inventory verifies project/org/table/bucket/Auth counts, SELECT grants, triggers/constraints and no Edge Functions.
- [x] Synthetic RED/GREEN tests prove exact projection, numeric IDs, missing/duplicate links, source privacy, manifests, private permissions, corruption and partial failure.
- [x] Manual guarded full PG dump tool prepared; fake executable tests verify all-schema/owner/ACL behavior and failure retention.
- [ ] After specific owner authorization, run real local full export using already authorized connection; record actual source snapshot and managed Auth/config preservation.
- [ ] Restore into disposable native PostgreSQL with actual roles/RLS/Auth data and separately restored Storage bytes; verify counts/hashes and legacy user IDs. No secret/PII in shared receipt.
- [x] Independently read established Office IDs;23null links reconcile through real Office numbers,28legacy-only numbers retain NULL links/read-only status. Media readiness still blocks import without fabricating replacements.

### Task 2: Public catalog candidate and actual D1 pilot

Files: `cloudflare/{worker.mjs,schema.sql}`, `cloudflare/tests/worker.test.mjs`.
Consumes: frozen signed envelope from the single publisher; produces exact public API and DB write receipt documented in the spec.

- [x] RED/GREEN real SQLite tests cover HMAC/tamper/stale clock, browser denial, private fields/URLs, approximate coords, stable cover/IDs/fallback, CAS/stale/link conflicts, overlapping replay, integrity readback and inactive withdrawal.
- [x] Independent reviewer checks preparation boundary and source compatibility; fix important findings and rerun suite.
- [x] After explicit owner confirmation, save encrypted pilot PUBLISHER_HMAC and verify actual Worker15a297e0/D1:23 signed/public write/readback/replay/CAS/privacy/withdrawal checks passed; two owned synthetic rows remain inactive, public list empty. No Office intents settled. Production requires a separate empty catalog.
- [x] Add offline migration import gate with identity/revision reconciliation, current withdrawal ledger and frozen input hashes; test source snapshot changes. Actual public readiness/import remains pending.

### Task 3: Existing Office/publisher compatibility adapter

Files to modify in a checkout based on the latest live release:
`whatsapp_office_bots/office_property_publication.py`, `office_crm.py`,
`signing_service.py`, `signing_web.py`, `property_publisher_transport.py`,
the existing pinned publisher and worker configuration, and corresponding publication/transport/CRM tests.
Consumes: existing frozen manager approval, dispatch/revision/lease state.
Produces: explicit versioned provider receipt `cloudflare-d1` while old `supabase/properties` receipt history remains readable.

- [x] Write failing tests for provider receipt compatibility, no newer-approval overwrite, lease loss, unknown outcome reconciliation and single controller; existing history preserved in candidate.
- [x] Add provider adapter behind a frozen dispatch backend choice. It signs the exact Worker envelope; no browser secret; no silent provider fallback or duplicate writer. Candidate only.
- [ ] Prepare all selected R2 assets/posters/fallbacks and verify bytes/Range before public revision CAS. Partial asset failure must preserve prior public revision; retries reconcile exact attempt only.
- [x] Prepare configurable Office inventory consumers behind the explicit public API parser while keeping private CRM entirely in Office; runtime flags remain unchanged.
- [ ] Test terminal privacy withdrawal versus queued approval/import/retry/rollback, including share revocation and media-cache consequences.
- [x] Run full correct-runtime Office suite2350PASS and independent review on candidate `dd5bc4e`; live signing `5d2366a` and predecessors retained. Candidate pushed/read back, not deployed.

### Task 4: Frontend and API surface parity

Current source files: `db.js`, `app.js`, `public-media.js`, `public-photo.js`,
`looking.js`, public/translated HTML and favicon/share/OG surfaces.
Prepared trial files: `cloudflare/tools/build-preview.mjs`, `fixtures/synthetic-properties.json`, `tests/preview-build.test.mjs`.
Consumes: existing approved brand assets and exact public projection.
Produces: synthetic public-only static preview; eventual production same-origin catalog reader after adapter and identity gates.

- [x] Build deterministic actual-design bundle with synthetic IDs990001–990003, disabled submission/admin/messaging, noindex/guard/CSP and public-only allowlist.
- [x] Test copied scripts parse, every local asset exists, hashes/determinism, no keys/endpoints/customer assets, original CSS unchanged and no source mutation.
- [x] Deploy/read back synthetic static trial81150cd9 on workers.dev; emulated mobile390 and desktop1710 no overflow, three synthetic cards and submission disabled. Zero bindings; no real catalog/publisher proof.
- [x] Prepare production reader and remove legacy no-op Supabase lead writer; keep real write-only Office search intake and test 4999/5000/5001 locally without customer sends. Production still pending.
- [x] Replace unsupported legacy admin navigation locally with existing Office login; no automatic account creation or new grants. Original Supabase Auth retained; native Auth export/restore remains unverified.
- [ ] Test image/video/cover/order/card/OG/WhatsApp URLs, all translated/localized pages, public error handling and absence of any Supabase traffic in new trial.

### Task 5: Reversible activation and shared handoff

Files: existing owner-local `activation-handoff.json`, new bounded preparation receipt and the relevant API/config/docs/wiki references; current Hermes topic and canonical Task.
Consumes: exact provider release IDs, current encrypted backups/restore proof, approved domain/public exposure/configuration actions.
Produces: separately verified Office, publisher, public site, assets/API and recovery receipts.

- [ ] Before any real cutover, verify fresh Supabase/Office-volume encrypted rollback and rehearsal, exact current source commits, DNSSEC/DS cache and isolated end-to-end pilot.
- [ ] Use self-service DS-only signing-preserving route if actually available; support request was explicitly authorized and sent; signing-preserving withdrawal remains pending. Never repeat blind DNSSEC disable/NS switch.
- [ ] Present concrete activation targets and minimal required permissions only after preparation is reviewable; no implication static trial completed migration.
- [ ] Coordinate one publisher pause/lease-safe drain, fresh source snapshot/withdrawal reconciliation, assets-ready catalog switch and URL/domain continuity. Retain old provider/originals recoverably; after new parity proof revoke old anonymous catalog/bucket delivery and verify actual denial before new backend withdrawals. Without this gate cutover remains blocked.
- [ ] On failure roll back exact affected public revision/config after reconciling concurrent withdrawal and approval; never restore withdrawn historical rows.
- [ ] Live verify Office save/reload/publish/withdraw, API public/private boundaries, image/video/fallback/Range/mobile/share and new update; inspect provider egress trends before claiming savings.
- [ ] Update every relevant API/config/code/docs surface; exact destination readbacks. Send bounded completion evidence to Hermes through an authorized active route; file-readback alone is not delivery. Keep MC pending if supported writer absent.

Live work is now explicitly authorized by Maor. Completion still requires exact provider/readback evidence; this plan is not proof that gates passed.
