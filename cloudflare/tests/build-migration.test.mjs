import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,chmod,readFile,stat,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {buildMigration,hashInputs,canonicalHash,verifyFrozenMigration,writeMigration,verifyMigration} from '../tools/build-migration.mjs';
const hash='a'.repeat(64),old='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/old.jpg';
const target=(id=64,index='00',ext='webp')=>`https://media.mavorealestate.com/property-${id}/revision-3/${index}-${hash}.${ext}`;
const row=(id=64,overrides={})=>({id,type:'rent',price:'5000',price_label:null,title:'Public listing',location:'City',rooms:2.5,baths:1,sqm:60,extra:'מיקום משוער',description:'Public facts',emoji:null,bg:null,lat:null,lng:null,photos:[old],has_elevator:null,has_shelter:true,has_parking:false,active:true,media_manifest:null,...overrides});
const office=(id='office-64',number=64,overrides={})=>({id,property_number:number,revision:3,archived_at:null,public_listing_enabled:false,type:'rent',...overrides});
const replace=(source_url=old,url=target(),overrides={})=>({source_url,url,sha256:hash,verified:true,...overrides});
function input(overrides={}){const value={sourceRows:[row()],sourceLinks:[{property_number:64,office_property_id:null}],officeProperties:[office()],removals:[],mediaReplacements:[replace()],existingCatalog:[],inactiveProjections:[],approvals:[],...overrides};return {...value,frozenInputs:hashInputs(value)};}
const state=entry=>({schema_version:1,office_property_id:entry.office_property_id,revision:entry.revision,dispatch_id:entry.dispatch_id,payload_hash:entry.payload_hash,property:JSON.parse(entry.payload)});

test('uses authoritative Office numbers/current revision, preserves nullable source and false publication flag without hiding',()=>{
 const plan=buildMigration(input()),entry=plan.entries[0],p=JSON.parse(entry.payload);
 assert.equal(entry.id,64);assert.equal(entry.office_property_id,'office-64');assert.equal(entry.revision,3);assert.equal(entry.revision_source,'office');assert.equal(p.active,true);
 assert.equal(p.rooms,2.5);assert.equal(p.bg,null);assert.equal(p.price_label,null);assert.equal(p.has_elevator,null);assert.equal(p.photos[0],target());
 assert.equal(entry.payload_hash,createHash('sha256').update(entry.payload).digest('hex'));assert.equal(entry.operation,'insert');
 assert.doesNotMatch(plan.sql,/UPDATE|REPLACE|ON CONFLICT/);assert.equal(plan.summary.linked,1);assert.equal(plan.summary.legacy_readonly,0);
});
test('legacy NULL links without Office records retain exact numeric public identity and read-only revision1',()=>{
 const plan=buildMigration(input({officeProperties:[]})),entry=plan.entries[0];
 assert.equal(entry.office_property_id,null);assert.equal(entry.id,64);assert.equal(entry.revision,1);assert.equal(entry.revision_source,'legacy-readonly');assert.equal(JSON.parse(entry.payload).active,true);
 assert.match(plan.sql,/NULL/);
});
test('rejects duplicate public numbers, duplicate Office numbers/IDs, foreign mirror links and invented Office revisions',()=>{
 for(const overrides of [{sourceRows:[row(),row()]},{officeProperties:[office(),office('foreign')]},{officeProperties:[office(),office('office-64',65)]},{sourceLinks:[{property_number:64,office_property_id:'foreign'}]},{sourceLinks:[]},{officeProperties:[office('office-64',64,{revision:null})]},{sourceRows:[row('64')]},{officeProperties:[office(null)]},{officeProperties:[office(123)]},{sourceRows:[row(64,{office_property_id:'private'})]}])assert.throws(()=>buildMigration(input(overrides)));
});
test('canonical hashes use JS numbers and sorted keys; semantic row reorder is deterministic but gallery order stays meaningful',()=>{
 assert.equal(canonicalHash({z:3.0,a:2.5}),createHash('sha256').update('{"a":2.5,"z":3}').digest('hex'));
 const a=input({sourceRows:[row(),row(65,{photos:[]})],sourceLinks:[{property_number:64,office_property_id:null},{property_number:65,office_property_id:null}]});
 const b=input({...a,sourceRows:[...a.sourceRows].reverse(),sourceLinks:[...a.sourceLinks].reverse()});
 assert.deepEqual(buildMigration(a),buildMigration(b));
 assert.notEqual(canonicalHash([old,target()]),canonicalHash([target(),old]));
});
test('initiated website withdrawal stays inactive in pending/failed/verified states; absent numbers get content-free tombstones',()=>{
 for(const status of ['pending','failed','verified']) {
  const plan=buildMigration(input({officeProperties:[office(),office('office-67',67,{revision:4,type:'sale'})],removals:[{property_id:'office-64',revision:3,status,channels:['website']},{property_id:'office-67',revision:4,status,channels:['website']}]}));
  assert.equal(plan.entries.length,2);assert.equal(JSON.parse(plan.entries[0].payload).active,false);
  const p=JSON.parse(plan.entries[1].payload);assert.equal(p.id,67);assert.equal(p.type,'sale');assert.equal(p.active,false);assert.equal(p.title,'');assert.equal(p.description,'');assert.deepEqual(p.photos,[]);assert.equal(p.media_manifest,null);assert.equal(p.bg,null);
 }
});
test('archives force withdrawal, other channels do not hide website, absent inactive projections retain exact public type',()=>{
 const archived=buildMigration(input({officeProperties:[office('office-64',64,{archived_at:'2026-10-11T00:00:00Z'})]}));assert.equal(JSON.parse(archived.entries[0].payload).active,false);
 const other=buildMigration(input({removals:[{property_id:'office-64',revision:3,status:'verified',channels:['facebook']}]}));assert.equal(JSON.parse(other.entries[0].payload).active,true);
 const supplied=row(67,{photos:[],type:'commercial-rent',active:false});
 const plan=buildMigration(input({officeProperties:[office(),office('office-67',67,{type:null,revision:4})],inactiveProjections:[supplied],removals:[{property_id:'office-67',revision:4,status:'verified',channels:['website']}]}));
 assert.deepEqual(JSON.parse(plan.entries[1].payload),supplied);
});
test('unknown/foreign removals, missing tombstone deal type, malformed status and ahead-of-current revisions block',()=>{
 for(const overrides of [{removals:[{property_id:'foreign',revision:3,status:'verified',channels:['website']}]},{officeProperties:[office(),office('office-67',67,{type:null})],removals:[{property_id:'office-67',revision:3,status:'verified',channels:['website']}]},{removals:[{property_id:'office-64',revision:4,status:'verified',channels:['website']}]},{removals:[{property_id:'office-64',revision:3,status:'unknown',channels:['website']}]},{inactiveProjections:[row(99,{photos:[],active:false})]}])assert.throws(()=>buildMigration(input(overrides)));
});
test('maps every gallery/poster/fallback URL without changing order, cover or stable IDs, including legacy Postify/MOV',()=>{
 const a=old,b=old.replace('old.jpg','b.jpg'),v=old.replace('old.jpg','video.mp4');
 const manifest={version:1,cover_media_id:'video:id',items:[{id:'b',type:'image',url:b},{id:'video:id',type:'video',url:v,poster_url:a,fallback_url:b},{id:'a',type:'image',url:a}]};
 // Source explicit manifests use immutable provider paths; legacy source photos may be mutable.
 const ia='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/property-64/revision-3/00-'+hash+'.jpg';
 const ib=ia.replace('00-','01-'),iv=ia.replace('00-','02-').replace('.jpg','.mp4');
 const m={...manifest,items:manifest.items.map(i=>({...i,url:i.url===a?ia:i.url===b?ib:iv,...(i.poster_url?{poster_url:ia,fallback_url:ib}:{})}))};
 const postify='https://media.postify.co.il/postify157/old.mov';
 const plan=buildMigration(input({sourceRows:[row(64,{photos:[postify,ia],media_manifest:m})],mediaReplacements:[replace(ia,target()),replace(ib,target(64,'01')),replace(iv,target(64,'02','mp4')),replace(postify,target(64,'03','mp4'))]}));
 const p=JSON.parse(plan.entries[0].payload);assert.deepEqual(p.photos,[target(64,'03','mp4'),target()]);assert.equal(p.media_manifest.cover_media_id,'video:id');assert.deepEqual(p.media_manifest.items.map(x=>x.id),['b','video:id','a']);assert.equal(p.media_manifest.items[1].poster_url,target());assert.equal(p.media_manifest.items[1].fallback_url,target(64,'01'));
 assert.doesNotMatch(plan.entries[0].payload,/supabase|postify/);
});
test('missing/partial/unverified/hash-mismatched/foreign or unsafe media blocks the entire plan, never drops a source photo',()=>{
 for(const overrides of [{mediaReplacements:[]},{mediaReplacements:[replace(old,target(),{verified:false})]},{mediaReplacements:[replace(old,target(),{sha256:'b'.repeat(64)})]},{mediaReplacements:[replace(old,target(65))]},{mediaReplacements:[replace(),replace()]},{sourceRows:[row(64,{photos:[old,'https://forms.mavorealestate.com/office/private.jpg']})]},{sourceRows:[row(64,{photos:[old,old.replace('old.jpg','missing.jpg')]})]},{sourceRows:[row(64,{photos:[old+'?private=1']})]}])assert.throws(()=>buildMigration(input(overrides)));
});
test('media replacement cannot silently change an approved image into video or video into a still',()=>{
 assert.throws(()=>buildMigration(input({mediaReplacements:[replace(old,target(64,'00','mp4'))]})));
 const sourceVideo=old.replace('old.jpg','video.mp4');
 assert.throws(()=>buildMigration(input({sourceRows:[row(64,{photos:[sourceVideo]})],mediaReplacements:[replace(sourceVideo,target())]})));
 const invalidManifest={version:1,cover_media_id:'photo',items:[{id:'photo',type:'image',url:target(64,'00','mp4')}]};
 assert.throws(()=>buildMigration(input({sourceRows:[row(64,{photos:[],media_manifest:invalidManifest})],mediaReplacements:[replace(target(64,'00','mp4'),target())]})));
});

test('private nested/extra fields, approximate coordinates, invalid projection and unsupported types block',()=>{
 for(const overrides of [{sourceRows:[row(64,{customer_phone:'private'})]},{sourceRows:[row(64,{lat:32})]},{sourceRows:[row(64,{type:'private'})]},{sourceRows:[row(64,{has_elevator:'yes'})]},{sourceRows:[row(64,{media_manifest:{version:1,cover_media_id:'x',items:[{id:'x',type:'image',url:target(),private_url:'/office'}]}})]}])assert.throws(()=>buildMigration(input(overrides)));
});
test('all input fingerprints freeze approvals/removals/source/media/catalog; fresh gate detects changes even if caller refreezes',()=>{
 const data=input(),plan=buildMigration(data);assert.equal(verifyFrozenMigration(plan,data),true);
 for(const update of [{sourceRows:[row(64,{title:'Changed'})]},{approvals:[{property_id:'office-64',revision:4}]},{removals:[{property_id:'office-64',revision:3,status:'pending',channels:['website']}]},{mediaReplacements:[replace(old,target(64,'01'))]},{officeProperties:[office('office-64',64,{revision:4})]},{existingCatalog:[state(plan.entries[0])]}]) {
  const fresh=input({...data,...update});assert.throws(()=>verifyFrozenMigration(plan,fresh),/frozen_inputs_changed/);
  assert.throws(()=>buildMigration({...fresh,frozenInputs:data.frozenInputs}),/frozen_inputs_changed/);
 }
 assert.throws(()=>buildMigration({...data,frozenInputs:undefined}));
});
test('exact existing hash/identity/revision is a no-op; stale/foreign/unknown/corrupt state blocks without UPDATE',()=>{
 const first=buildMigration(input()),same=state(first.entries[0]);
 const replay=buildMigration(input({existingCatalog:[same]}));assert.equal(replay.entries[0].operation,'verified_noop');assert.equal(replay.sql,'');
 for(const existing of [{...same,office_property_id:'foreign'},{...same,revision:4},{...same,payload_hash:'b'.repeat(64)},{...same,property:{...same.property,title:'Corrupt'}},{...same,property:{...same.property,id:99}}])assert.throws(()=>buildMigration(input({existingCatalog:[existing]})));
});
test('plain D1 INSERT plan cannot overwrite a concurrently created foreign row and supports SQL quoting and NULL links',async()=>{
 const source=row(64,{title:"Public owner's listing"}),plan=buildMigration(input({sourceRows:[source],officeProperties:[]}));
 const schema=await readFile(new URL('../schema.sql',import.meta.url),'utf8'),database=new DatabaseSync(':memory:');
 try {database.exec(schema);database.exec(plan.sql);const saved=database.prepare('SELECT * FROM catalog').get();assert.equal(JSON.parse(saved.payload).title,source.title);assert.equal(saved.office_property_id,null);assert.equal(saved.payload_hash,plan.entries[0].payload_hash);database.prepare('UPDATE catalog SET office_property_id=?,revision=? WHERE id=?').run('concurrent-foreign-owner',4,64);assert.throws(()=>database.exec(plan.sql));const current=database.prepare('SELECT office_property_id,revision FROM catalog').get();assert.equal(current.office_property_id,'concurrent-foreign-owner');assert.equal(current.revision,4);assert.equal(database.prepare('SELECT count(*) AS n FROM catalog').get().n,1);}finally{database.close();}
});
test('private exclusive output verifies checksums, refuses corruption/permissions/existing path and rereads caller fingerprints',async t=>{
 const base=await mkdtemp(join(tmpdir(),'mavo-migration-'));t.after(()=>rm(base,{recursive:true,force:true}));await chmod(base,0o700);
 const dir=join(base,'plan'),data=input();await writeMigration(data,dir);
 assert.equal((await stat(dir)).mode&0o777,0o700);for(const name of ['plan.private.json','plan.private.sql','manifest.private.json'])assert.equal((await stat(join(dir,name))).mode&0o777,0o600);
 assert.equal((await verifyMigration(dir,data)).summary.rows,1);await assert.rejects(writeMigration(data,dir));
 await assert.rejects(verifyMigration(dir,input({...data,sourceRows:[row(64,{title:'Changed'})]})),/frozen_inputs_changed/);
 await chmod(join(dir,'plan.private.json'),0o644);await assert.rejects(verifyMigration(dir,data),/file_not_private/);await chmod(join(dir,'plan.private.json'),0o600);
 await writeFile(join(dir,'plan.private.sql'),'INSERT evil;');await assert.rejects(verifyMigration(dir,data),/checksum_mismatch/);
});
