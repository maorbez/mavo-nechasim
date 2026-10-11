#!/usr/bin/env bash
# Manual owner-only preparation. Never source .env, print secrets or infer a project.
set -euo pipefail
umask 077
if [[ $# -ne 2 || "$2" != '--execute-owner-export' ]]; then
  printf '%s\n' 'Preparation only. Explicit owner-authorized execution requires NEW_PRIVATE_DIRECTORY --execute-owner-export.' >&2
  exit 2
fi
if [[ "${PGHOST:-}" != 'db.tnkiwgewdancvmkhzlwz.supabase.co' ]]; then printf '%s\n' 'project_host_rejected' >&2; exit 2; fi
if [[ "${PGDATABASE:-}" != 'postgres' || "${PGUSER:-}" != 'postgres' || "${PGPORT:-}" != '5432' || "${PGSSLMODE:-}" != 'verify-full' ]]; then
  printf '%s\n' 'explicit_project_connection_environment_required' >&2; exit 2
fi
if [[ -n "${PGHOSTADDR:-}${PGSERVICE:-}${PGSERVICEFILE:-}" ]]; then printf '%s\n' 'connection_override_rejected' >&2; exit 2; fi
if [[ -z "${PGPASSWORD:-}" && -z "${PGPASSFILE:-}" ]]; then printf '%s\n' 'existing_private_auth_environment_required' >&2; exit 2; fi
command -v pg_dump >/dev/null || { printf '%s\n' 'pg_dump_unavailable' >&2; exit 2; }
command -v node >/dev/null || { printf '%s\n' 'node_unavailable' >&2; exit 2; }
archive_dir="$1"
node --input-type=module - "$archive_dir" <<'NODE'
import fs from 'node:fs';import path from 'node:path';
try {
  const dir=path.resolve(process.argv[2]),parent=path.dirname(dir),stat=fs.lstatSync(parent);
  if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o077))throw Error();
  if(process.env.PGPASSFILE){const pass=fs.lstatSync(process.env.PGPASSFILE);if(!pass.isFile()||pass.isSymbolicLink()||pass.uid!==process.getuid()||(pass.mode&0o077))throw Error();}
  fs.mkdirSync(dir,{mode:0o700});
}catch{process.stderr.write('private_destination_or_auth_file_rejected\n');process.exit(2);}
NODE
# Read-only snapshot; all schemas/data/owners/ACLs included, including auth and RLS.
# Do not supply a URL/password argument or omit ACLs/owners with --no-acl/--no-owner.
export PGOPTIONS='-c default_transaction_read_only=on'
pg_dump --version > "$archive_dir/pg_dump.version.txt"
if pg_dump --no-password --format=custom --file="$archive_dir/database.dump.partial" > "$archive_dir/pg_dump.stdout.log" 2> "$archive_dir/pg_dump.stderr.log"; then
  node --input-type=module - "$archive_dir" <<'NODE'
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
try {
  const dir=path.resolve(process.argv[2]),partial=path.join(dir,'database.dump.partial'),final=path.join(dir,'database.dump');
  const handle=fs.openSync(partial,'r');try{fs.fsyncSync(handle);}finally{fs.closeSync(handle);}
  fs.renameSync(partial,final);
  const bytes=fs.readFileSync(final),manifest={schema_version:1,project_ref:'tnkiwgewdancvmkhzlwz',
    database_dump:{file:'database.dump',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')},
    native_postgres_restore_verified:false,auth_restore_verified:false};
  const descriptor=fs.openSync(path.join(dir,'manifest.json'),'wx',0o600);
  try{fs.writeFileSync(descriptor,JSON.stringify(manifest,null,2)+'\n');fs.fsyncSync(descriptor);}finally{fs.closeSync(descriptor);}
  const parent=fs.openSync(dir,'r');try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}
}catch{process.stderr.write('archive_finalization_failed_private_files_retained\n');process.exit(2);}
NODE
  printf '%s\n' 'Owner-private archive prepared. Native PostgreSQL/Auth restoration remains unverified.'
else
  dump_status=$?
  printf '%s\n' 'dump_failed_private_partial_and_logs_retained' >&2
  exit "$dump_status"
fi
