# Local export and recovery preparation

These tools have not been run against the live Supabase project. Synthetic tests
prove local projection, checksums, private file permissions and failure handling.
They do not prove a native PostgreSQL restore, Supabase Auth restoration, deployed
Cloudflare storage, Office identity readback or a production migration.

`node cloudflare/tools/export-catalog.mjs export LOCAL_ROWS_JSON NEW_PRIVATE_DIRECTORY`
consumes an already supplied local JSON array with every public projection column.
The input file must be owner-private. The parent directory must already be owned by
the current user with no group/other access; the destination must not exist.
Files are created exclusively with mode0600 inside a mode0700 directory. The
manifest is written last, all files are fsynced, and an interrupted/incomplete
export cannot pass verification. A failed filesystem write cleans only the newly
created export directory. Existing exports are never overwritten.

`catalog.json` contains exactly the public properties projection, ordered by numeric
ID, preserving fractional rooms and source values. Unknown fields are dropped.
Nested media manifests reject unknown fields and non-public origins. Media IDs
follow the deployed ASCII contract `[A-Za-z0-9_:-]` with 1 to 128 characters. Explicit
manifest assets must use immutable paths for this exact property number. Images,
posters and fallbacks require JPG/PNG/WebP; video sources require MP4. Optional
image poster/fallback fields remain supported when valid. Approximate rows with
any non-null coordinate fail export; the tool never silently redacts source data.
It is a
prepared catalog, not verified live publication. `reconciliation.private.json`
contains stable Office links and known operational timestamps; never upload it.
NULL/blank legacy links remain unresolved and block migration. Established links
still require authoritative Office readback. No link or number is inferred from
title, description, address, array order or legacy mirrors. Keep all three files
local and outside Git when processing real supplied data.

`node cloudflare/tools/export-catalog.mjs verify PRIVATE_DIRECTORY` validates both
exported checksums, lengths, permissions, canonical graph and ID/link uniqueness.
The local manifest detects corruption; it is not a signature proving provider
authenticity. Recover into a disposable environment and perform independent
Office/public readback before any publication. Do not re-enable withdrawn rows
from a historical catalog.

`readonly-inventory.sql` is a read-only repeatable-read transaction with metadata
SELECTs and aggregate counts only. It returns no user/contact/property content.
SQL policy/default/trigger definitions may themselves be confidential metadata;
store any eventual output privately. It does not establish connection identity;
use the same explicitly validated owner connection as the dump preparation.

`bash cloudflare/tools/postgres-export.sh NEW_PRIVATE_DIRECTORY --execute-owner-export`
is a manual owner-authorized step, not a command executed by this preparation.
It requires existing `PGHOST=db.tnkiwgewdancvmkhzlwz.supabase.co`,
`PGDATABASE=postgres`, `PGUSER=postgres`, `PGPORT=5432`, `PGSSLMODE=verify-full`,
and either existing `PGPASSWORD` or a private explicit `PGPASSFILE`.
No `.env` is sourced; no password/connection URL appears in command arguments or
shared logs. Connection override environment is rejected. The dump uses all
schemas, data, ownership and ACLs without schema exclusions, including Auth/RLS.
Archive/logs remain owner-private; failed `.partial` dumps are retained without a
success manifest. The script uploads nothing and deletes nothing.

The eventual dump contains private Auth data and must remain an owner-local
protected archive. Global role creation, managed extensions, provider Auth
configuration/signing keys, Edge Functions and actual Storage object bytes require
separate recovery evidence; `pg_dump` alone does not prove them restored. Native
PostgreSQL/Auth restoration is explicitly false in its manifest until independently
rehearsed. Obtain current exact provider and Office release evidence before use.
