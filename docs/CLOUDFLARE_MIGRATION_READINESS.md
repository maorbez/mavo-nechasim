# Offline migration readiness contract

`buildMigration` now requires `privacyEvidence` in addition to the existing eight
input arrays. Old incomplete captures fail closed. `prepareMigrationInput(input)`
validates this normalized evidence and freezes an initial input. It refuses a
mismatch when `frozenInputs` already exists. Before import use
`verifyFrozenMigration(plan, freshlyRereadInput)`; preparing a new fingerprint
cannot authorize a mismatch against an existing plan.

The required `privacyEvidence` object has exactly these fields:

- `schema_version: 1`.
- `capture`: `{complete:true, scope:'full-office', captured_at:<ISO timestamp>,
  snapshot_sha256:<SHA256 of the actual owner-local transaction capture>, tables}`.
- `propertyStates`: one exact row for every established Office ID:
  `{property_id, workflow_status, stage, lifecycle_stage, public_location_mode,
  effective_available:<boolean>}`.
- `websiteSettings`: all actual `{property_id, available:<boolean>}` rows.
- `locationWithdrawals`: all actual `{id, property_id, revision, status,
  catalog_backend, schema_provenance}` rows, including verified withdrawals.

`capture.tables` must contain the following exact table names. Each value is
`{present:true, columns:[<actual PRAGMA column names>], count:<actual row count>}`.
Additional actual column names are retained; the listed columns are required.

| Table | Required columns | Bound row count |
| --- | --- | --- |
| `office_crm_properties` | `id, property_number, archived_at, public_listing_enabled, workflow_status, stage, lifecycle_stage, public_location_mode` | All normalized Office properties |
| `office_property_pipeline` | `property_id, revision` | Properties with an existing pipeline revision |
| `office_property_website_settings` | `property_id, available` | All captured website settings |
| `office_location_withdrawals` | `id, property_id, revision, status` | All captured location withdrawals |
| `office_publication_removals` | `property_id, revision, status, channels_json` | All captured removals |

Normalize SQLite0/1 to booleans and empty archive timestamps to null before
freezing. Do not default missing state fields or infer numbers/IDs. Capture
`effective_available` from the actual settings row; Office's canonical true
default is permitted only when the complete table capture proves row absence.
Unknown/missing/duplicate/foreign state, absent tables, missing columns or
inconsistent counts/availability block compilation. Captured evidence and the
snapshot digest are frozen as `privacyEvidence_sha256`. The compiler validates
these supplied assertions locally; it cannot authenticate the capture or take a
provider lock. The release controller owns those checks and destination readback.

The `public_listing_enabled` flag alone never hides a legacy public row. Actual
website unavailability, terminal workflow (`not_relevant`, `closed_by_us`,
`closed_other`), terminal stage (`rented`, `sold`, `archived`), terminal lifecycle
(`not_relevant`) and archive timestamps force inactive projections. No removal
record is fabricated. An active row with reserved/recruiting state requires
explicit reconciliation. Active approximate Office rows block until a current
canonical sanitized text projection has authoritative proof. An approximate
marker and cleared coordinates are insufficient: title, location or description
can still expose an exact address. The initial compiler cannot authenticate this
proof and offers no override. It leaves the source active rather than silently
hiding or rewriting it; inactive rows remain inactive.

Removal input accepts only normalized `requested`, `pending`, `running`, `failed`,
`verified`, `terminal` or `withdrawn` statuses. Raw `queued`, `processing` and
`partial` statuses block compilation. The capture controller must explicitly
reconcile their canonical meaning before normalizing; it must preserve every
removal and its captured evidence rather than filter unsupported states out.

Location statuses `queued`, `processing` and `failed` block import. `verified`
remains binding and forces inactive. A current active source after a newer Office
revision than that verified withdrawal blocks pending separate proof of a current
sanitized projection and newer owner approval; the compiler does not silently
revive or drop such an approved revision. This proof/override is intentionally
unsupported by the initial compiler.

If the real table contains `catalog_backend`, each job has
`schema_provenance:'captured-column'` and its actual backend. If the old schema
lacks that column, only explicit
`schema_provenance:'absent-column-supabase-default'` with backend `supabase` is
accepted. Complete capture of zero rows is valid, including the old schema.

This gate does not make unverified media ready. Every referenced asset still
needs its caller-supplied verified immutable R2 replacement; a missing asset
blocks the whole plan. No real SQL/import or network verification is performed.
