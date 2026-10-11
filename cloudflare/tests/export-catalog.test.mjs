import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildExport, writeExport, verifyExport} from '../tools/export-catalog.mjs';

const row = (id = 7, link = 'prop_stable_7') => ({id, type:'rent', price:'7000', price_label:'7,000 ₪',
  title:'Approved label',location:'Approved neighborhood',lat:null,lng:null,rooms:2.5,baths:null,sqm:60,
  extra:'מיקום משוער',description:'Approved copy #49',emoji:null,bg:null,photos:[],has_elevator:true,
  has_shelter:null,has_parking:null,active:true,media_manifest:null,office_property_id:link,
  office_updated_at:'2026-10-11T00:00:00Z',updated_at:'2026-10-11T00:01:00Z',created_at:'2026-09-01T00:00:00Z',published_at:null});
const asset=(extension='webp',number=7,origin='supabase')=>(origin==='r2'?'https://media.mavorealestate.com/':'https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/')+`property-${number}/revision-2/01-${'a'.repeat(64)}.${extension}`;
const selection=(item)=>({version:1,cover_media_id:item.id,items:[item]});
async function temporary(t) {
  const dir=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'mavo-export-test-'));
  await fs.chmod(dir,0o700);t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;
}

test('public export strips private fields and preserves fractional rooms and exact numeric identity',()=>{
  const supplied={...row(),contact_phone:'PRIVATE_SENTINEL',notes:'PRIVATE_SENTINEL',mystery:{secret:'PRIVATE_SENTINEL'}};
  const out=buildExport([supplied]);
  assert.equal(out.catalog.properties[0].id,7);assert.equal(out.catalog.properties[0].rooms,2.5);
  assert.equal(out.catalog.properties[0].office_property_id,undefined);
  assert.equal(JSON.stringify(out).includes('PRIVATE_SENTINEL'),false);
  assert.equal(out.reconciliation.records[0].office_property_id,'prop_stable_7');
  assert.equal(out.reconciliation.records[0].operational_metadata.updated_at,'2026-10-11T00:01:00Z');
});
test('rejects duplicate numbers, nonnumeric/nonpositive/unsafe IDs and established duplicate Office links',()=>{
  assert.throws(()=>buildExport([row(),row()]),/duplicate_property_number/);
  for(const id of [0,-1,2.5,'7',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>buildExport([row(id)]),/invalid_property_number/);
  assert.throws(()=>buildExport([row(7),row(8)]),/duplicate_office_property_id/);
});
test('legacy NULL link remains unresolved and free-text numbers never fabricate identity',()=>{
  const out=buildExport([row(23,null)]);
  assert.equal(out.catalog.properties[0].id,23);
  assert.deepEqual(out.reconciliation.unresolved_property_numbers,[23]);
  assert.equal(out.reconciliation.migration_gate,'blocked_unresolved_office_links');
  assert.equal(out.reconciliation.records[0].office_property_id,null);
});
test('canonical exports and hashes are independent of row and object key order',()=>{
  const second=row(9,'prop_stable_9');const a=buildExport([second,row()]);
  const reversed=Object.fromEntries(Object.entries(row()).reverse());const b=buildExport([reversed,second]);
  assert.deepEqual(a,b);assert.deepEqual(a.catalog.properties.map(r=>r.id),[7,9]);
  assert.equal(a.manifest.files['catalog.json'].sha256,crypto.createHash('sha256').update(a.catalogBytes).digest('hex'));
});
test('rejects nonfinite numbers and hidden nested public metadata',()=>{
  assert.throws(()=>buildExport([{...row(),rooms:Infinity}]),/invalid_public_value/);
  assert.throws(()=>buildExport([{...row(),media_manifest:{version:1,cover_media_id:'a',items:[{id:'a',type:'image',url:'https://media.mavorealestate.com/a.webp',private:'secret'}]}}]),/invalid_media_manifest/);
});
test('approximate location with any retained coordinate fails without silently redacting source',()=>{
  for(const coordinates of [{lat:32.1,lng:34.7},{lat:0,lng:null},{lat:null,lng:34.7},{lat:'32.1',lng:null}]) {
    const original={...row(),...coordinates};assert.throws(()=>buildExport([original]),/approximate_coordinates_forbidden/);
    assert.deepEqual({lat:original.lat,lng:original.lng},coordinates);
  }
  assert.equal(buildExport([{...row(),extra:'',lat:32.1,lng:34.7}]).catalog.properties[0].lat,32.1);
});
test('manifest rejects IDs outside deployed ASCII contract and preserves allowed IDs up to128characters',()=>{
  for(const id of ['bad/id','bad id','תמונה','a'.repeat(129)])assert.throws(()=>buildExport([{...row(),media_manifest:selection({id,type:'image',url:asset()})}]),/invalid_media_manifest/);
  for(const id of ['photo_A:7-2','a'.repeat(128)])assert.equal(buildExport([{...row(),media_manifest:selection({id,type:'image',url:asset()})}]).catalog.properties[0].media_manifest.cover_media_id,id);
});
test('manifest enforces own immutable property URLs and image/video extensions while retaining image fallbacks',()=>{
  const image={id:'photo',type:'image',url:asset(),fallback_url:asset('jpg')};
  assert.deepEqual(buildExport([{...row(),media_manifest:selection(image)}]).catalog.properties[0].media_manifest.items[0],image);
  const video={id:'video',type:'video',url:asset('mp4'),poster_url:asset('jpg'),fallback_url:asset('webp')};
  assert.deepEqual(buildExport([{...row(),media_manifest:selection(video)}]).catalog.properties[0].media_manifest.items[0],video);
  for(const item of [{...image,url:asset('mp4')},{...image,fallback_url:asset('mp4')},{...video,url:asset('jpg')},{...video,poster_url:asset('mp4')},{...video,fallback_url:asset('mp4')},
    {...image,url:asset('webp',8)},{...image,url:asset('webp',8,'r2')},{...image,url:asset().replace('revision-2/','legacy/')},
    {...image,url:asset().replace('property-7/','property-8/../property-7/')}])assert.throws(()=>buildExport([{...row(),media_manifest:selection(item)}]),/invalid_media_manifest/);
  assert.throws(()=>buildExport([{...row(),photos:[asset('webp',8,'r2')]}]),/invalid_public_value/);
});
test('private exclusive export can be independently verified and detects corruption',async t=>{
  const parent=await temporary(t),dir=path.join(parent,'export');await writeExport([row()],dir);
  assert.equal((await fs.stat(dir)).mode&0o777,0o700);
  for(const file of ['catalog.json','reconciliation.private.json','manifest.json'])assert.equal((await fs.stat(path.join(dir,file))).mode&0o777,0o600);
  assert.equal((await verifyExport(dir)).row_count,1);
  await assert.rejects(writeExport([row(8,'other')],dir),/EEXIST/);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'catalog.json'),'utf8')).properties[0].id,7);
  await fs.appendFile(path.join(dir,'catalog.json'),' ');await assert.rejects(verifyExport(dir),/checksum_mismatch/);
});
test('a failed second filesystem write removes only the newly owned partial export',async t=>{
  const parent=await temporary(t),dir=path.join(parent,'failed'),untouched=path.join(parent,'untouched');await fs.writeFile(untouched,'keep');
  const original=fs.open;let writes=0;
  const mocked=t.mock.method(fs,'open',async (...args)=>{if(args[1]==='wx'&&++writes===2)throw new Error('synthetic_disk_failure');return original(...args);});
  await assert.rejects(writeExport([row()],dir),/synthetic_disk_failure/);mocked.mock.restore();
  await assert.rejects(fs.stat(dir),/ENOENT/);assert.equal(await fs.readFile(untouched,'utf8'),'keep');
});
test('recovery refuses missing manifest, altered reconciliation and permissive directory',async t=>{
  const parent=await temporary(t),dir=path.join(parent,'export');await writeExport([row()],dir);
  await fs.appendFile(path.join(dir,'reconciliation.private.json'),' ');await assert.rejects(verifyExport(dir),/checksum_mismatch/);
  await fs.unlink(path.join(dir,'manifest.json'));await assert.rejects(verifyExport(dir),/ENOENT/);
  await fs.chmod(parent,0o755);await assert.rejects(writeExport([row()],path.join(parent,'unsafe')),/parent_not_private/);
});
test('Postgres preparation rejects wrong project without touching destination or exposing credentials',async t=>{
  const parent=await temporary(t),dir=path.join(parent,'dump');
  const result=spawnSync('bash',[fileURLToPath(new URL('../tools/postgres-export.sh',import.meta.url)),dir,'--execute-owner-export'],
    {encoding:'utf8',env:{...process.env,PGHOST:'wrong-project.supabase.co',PGDATABASE:'postgres',PGUSER:'postgres',PGPORT:'5432',PGSSLMODE:'verify-full',PGPASSWORD:'PRIVATE_PASSWORD_SENTINEL'}});
  assert.equal(result.status,2);assert.match(result.stderr,/project_host_rejected/);
  assert.equal((result.stderr+result.stdout).includes('PRIVATE_PASSWORD_SENTINEL'),false);await assert.rejects(fs.stat(dir),/ENOENT/);
});
test('manual Postgres export uses environment only and preserves failed dump privately',async t=>{
  const parent=await temporary(t),bin=path.join(parent,'bin');await fs.mkdir(bin,{mode:0o700});
  await fs.writeFile(path.join(bin,'pg_dump'),'#!/bin/bash\nif [ "$1" = "--version" ]; then echo "pg_dump synthetic"; exit 0; fi\nfor arg in "$@"; do case "$arg" in --file=*) printf partial > "${arg#--file=}" ;; *PASSWORD*|*postgresql://*) exit 90 ;; esac; done\nprintf "synthetic failure" >&2\nexit 23\n',{mode:0o700});
  const dir=path.join(parent,'dump');const result=spawnSync('bash',[fileURLToPath(new URL('../tools/postgres-export.sh',import.meta.url)),dir,'--execute-owner-export'],
    {encoding:'utf8',env:{...process.env,PATH:bin+':'+process.env.PATH,PGHOST:'db.tnkiwgewdancvmkhzlwz.supabase.co',PGDATABASE:'postgres',PGUSER:'postgres',PGPORT:'5432',PGSSLMODE:'verify-full',PGPASSWORD:'PRIVATE_PASSWORD_SENTINEL',PGSERVICE:'',PGSERVICEFILE:''}});
  assert.equal(result.status,23);assert.equal((result.stdout+result.stderr).includes('PRIVATE_PASSWORD_SENTINEL'),false);
  assert.equal(await fs.readFile(path.join(dir,'database.dump.partial'),'utf8'),'partial');
  assert.equal((await fs.stat(path.join(dir,'database.dump.partial'))).mode&0o777,0o600);
  await assert.rejects(fs.stat(path.join(dir,'manifest.json')),/ENOENT/);
});
test('successful synthetic Postgres archive retains all schemas and ACLs and records unverified restore',async t=>{
  const parent=await temporary(t),bin=path.join(parent,'bin');await fs.mkdir(bin,{mode:0o700});
  await fs.writeFile(path.join(bin,'pg_dump'),'#!/bin/bash\nif [ "$1" = "--version" ]; then echo "pg_dump synthetic"; exit 0; fi\nfor arg in "$@"; do case "$arg" in --no-owner|--no-acl|--schema*|--exclude*|--data-only|--schema-only) exit 91 ;; --file=*) printf "synthetic-full-archive" > "${arg#--file=}" ;; esac; done\n',{mode:0o700});
  const dir=path.join(parent,'dump');const result=spawnSync('bash',[fileURLToPath(new URL('../tools/postgres-export.sh',import.meta.url)),dir,'--execute-owner-export'],
    {encoding:'utf8',env:{...process.env,PATH:bin+':'+process.env.PATH,PGHOST:'db.tnkiwgewdancvmkhzlwz.supabase.co',PGDATABASE:'postgres',PGUSER:'postgres',PGPORT:'5432',PGSSLMODE:'verify-full',PGPASSWORD:'synthetic',PGSERVICE:'',PGSERVICEFILE:''}});
  assert.equal(result.status,0,result.stderr);
  const saved=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
  assert.equal(saved.database_dump.sha256,crypto.createHash('sha256').update('synthetic-full-archive').digest('hex'));
  assert.equal(saved.native_postgres_restore_verified,false);assert.equal(saved.auth_restore_verified,false);
  assert.equal((await fs.stat(path.join(dir,'database.dump'))).mode&0o777,0o600);
});
