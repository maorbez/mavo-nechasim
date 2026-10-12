import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,chmod,readFile,stat,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import * as migration from '../tools/build-migration.mjs';
const {buildMigration,hashInputs,canonicalHash,verifyFrozenMigration,writeMigration,verifyMigration}=migration;
const hash='a'.repeat(64),old='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/old.jpg';
const target=(id=64,index='00',ext='webp')=>`https://media.mavorealestate.com/property-${id}/revision-3/${index}-${hash}.${ext}`;
const row=(id=64,overrides={})=>({id,type:'rent',price:'5000',price_label:null,title:'Public listing',location:'City',rooms:2.5,baths:1,sqm:60,extra:'מיקום משוער',description:'Public facts',emoji:null,bg:null,lat:null,lng:null,photos:[old],has_elevator:null,has_shelter:true,has_parking:false,active:true,media_manifest:null,...overrides});
const office=(id='office-64',number=64,overrides={})=>({id,property_number:number,revision:3,archived_at:null,public_listing_enabled:false,type:'rent',...overrides});
const replace=(source_url=old,url=target(),overrides={})=>({source_url,url,sha256:hash,public_verified:false,stage_proof:{schema_version:1,bucket:'mavo-public-media',object_name:new URL(url).pathname.slice(1),sha256:hash,bytes:123,mime:url.endsWith('.mp4')?'video/mp4':url.endsWith('.png')?'image/png':url.endsWith('.jpg')?'image/jpeg':'image/webp',authenticated_read:true,readback_at:'2026-10-11T20:00:00Z',evidence_sha256:'b'.repeat(64)},...overrides});
function privacy(data,overrides={}){
 const propertyStates=data.officeProperties.map(p=>({property_id:p.id,workflow_status:'new',stage:'in_office',lifecycle_stage:'in_office',public_location_mode:'exact',effective_available:true}));
 const base={schema_version:1,propertyStates,websiteSettings:[],locationWithdrawals:[],...overrides};
 const columns={office_crm_properties:['id','property_number','archived_at','public_listing_enabled','workflow_status','stage','lifecycle_stage','public_location_mode'],office_property_pipeline:['property_id','revision'],office_property_website_settings:['property_id','available'],office_location_withdrawals:['id','property_id','revision','status','catalog_backend'],office_publication_removals:['property_id','revision','status','channels_json']};
 const counts={office_crm_properties:data.officeProperties.length,office_property_pipeline:data.officeProperties.filter(p=>p.revision!==null).length,office_property_website_settings:base.websiteSettings.length,office_location_withdrawals:base.locationWithdrawals.length,office_publication_removals:data.removals.length};
 base.capture={complete:true,scope:'full-office',captured_at:'2026-10-11T12:00:00Z',snapshot_sha256:'0'.repeat(64),tables:Object.fromEntries(Object.keys(columns).map(k=>[k,{present:true,columns:columns[k],count:counts[k]}]))};
 return base;
}
function input(overrides={}){const value={sourceRows:[row()],sourceLinks:[{property_number:64,office_property_id:null}],officeProperties:[office()],removals:[],mediaReplacements:[replace()],existingCatalog:[],inactiveProjections:[],approvals:[],...overrides};if(!Object.hasOwn(value,'privacyEvidence'))value.privacyEvidence=privacy(value);return {...value,frozenInputs:hashInputs(value)};}

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
test('real Office yad2 channel preserves website withdrawals and does not withdraw a website by itself',()=>{
 const removed=buildMigration(input({removals:[{property_id:'office-64',revision:3,status:'failed',channels:['website','yad2']}]}));
 assert.equal(JSON.parse(removed.entries[0].payload).active,false);
 const other=buildMigration(input({removals:[{property_id:'office-64',revision:3,status:'verified',channels:['yad2']}]}));
 assert.equal(JSON.parse(other.entries[0].payload).active,true);
 for(const channel of ['yad2/private','yad2 website','2website'])assert.throws(()=>buildMigration(input({removals:[{property_id:'office-64',revision:3,status:'failed',channels:[channel]}]})),/invalid_removal_ledger/);
});
test('unknown/foreign removals, missing tombstone deal type, malformed status and ahead-of-current revisions block',()=>{
 for(const overrides of [{removals:[{property_id:'foreign',revision:3,status:'verified',channels:['website']}]},{officeProperties:[office(),office('office-67',67,{type:null})],removals:[{property_id:'office-67',revision:3,status:'verified',channels:['website']}]},{removals:[{property_id:'office-64',revision:4,status:'verified',channels:['website']}]},{removals:[{property_id:'office-64',revision:3,status:'unknown',channels:['website']}]},{inactiveProjections:[row(99,{photos:[],active:false})]}])assert.throws(()=>buildMigration(input(overrides)));
});
test('raw queued/processing/partial removal states block until explicitly normalized, never disappear from a plan',()=>{
 for(const status of ['queued','processing','partial']){
  const data=input({removals:[{property_id:'office-64',revision:3,status,channels:['website']}]});
  assert.throws(()=>buildMigration(data),/invalid_removal_ledger/);
  assert.throws(()=>migration.prepareMigrationInput(data),/invalid_removal_ledger/);
  assert.equal(data.removals[0].status,status);assert.equal(data.sourceRows[0].active,true);
 }
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

test('explicit private stage proof prepares active and inactive projections without claiming public delivery',()=>{
 const staged={source_url:old,url:target(),sha256:hash,public_verified:false,stage_proof:{schema_version:1,bucket:'mavo-public-media',object_name:new URL(target()).pathname.slice(1),sha256:hash,bytes:123,mime:'image/webp',authenticated_read:true,readback_at:'2026-10-11T20:00:00Z',evidence_sha256:'b'.repeat(64)}};
 for(const active of [true,false]){
  const data=input({sourceRows:[row(64,{active})],mediaReplacements:[staged]}),plan=buildMigration(data);
  assert.equal(JSON.parse(plan.entries[0].payload).active,active);
  assert.equal(plan.media_verification,'authenticated-stage-only');assert.equal(plan.public_delivery_verified,false);
  assert.equal(data.mediaReplacements[0].public_verified,false);
  for(const bad of [{authenticated_read:false},{bucket:'private-crm'},{object_name:'private/file'},{sha256:'0'.repeat(64)},{bytes:0},{bytes:26*1024*1024},{mime:'video/mp4'},{readback_at:'invalid'},{evidence_sha256:'invalid'}]){
   assert.throws(()=>buildMigration(input({...data,mediaReplacements:[{...staged,stage_proof:{...staged.stage_proof,...bad}}]})));
  }
  assert.throws(()=>buildMigration(input({...data,mediaReplacements:[{...staged,public_verified:true}]})));
  const fresh=input({...data,mediaReplacements:[{...staged,stage_proof:{...staged.stage_proof,bytes:124}}]});
  assert.throws(()=>verifyFrozenMigration(plan,fresh),/frozen_inputs_changed/);
 }
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


test('readiness requires full fresh capture/table schemas/counts and exact state for every established Office property',()=>{
 const data=input();
 const invalid=[undefined,{...data.privacyEvidence,capture:{...data.privacyEvidence.capture,complete:false}},{...data.privacyEvidence,propertyStates:[]},{...data.privacyEvidence,capture:{...data.privacyEvidence.capture,snapshot_sha256:'missing'}}];
 for(const privacyEvidence of invalid)assert.throws(()=>buildMigration(input({...data,privacyEvidence})));
 for(const table of Object.keys(data.privacyEvidence.capture.tables)){
  const p=structuredClone(data.privacyEvidence);p.capture.tables[table].present=false;assert.throws(()=>buildMigration(input({...data,privacyEvidence:p})));
 }
 const schema=structuredClone(data.privacyEvidence);schema.capture.tables.office_crm_properties.columns=schema.capture.tables.office_crm_properties.columns.filter(k=>k!=='workflow_status');assert.throws(()=>buildMigration(input({...data,privacyEvidence:schema})));
 const counts=structuredClone(data.privacyEvidence);counts.capture.tables.office_property_website_settings.count=1;assert.throws(()=>buildMigration(input({...data,privacyEvidence:counts})));
 const extra=structuredClone(data.privacyEvidence);extra.propertyStates.push({...extra.propertyStates[0],property_id:'foreign'});assert.throws(()=>buildMigration(input({...data,privacyEvidence:extra})));
});
test('actual effective website availability and independent terminal classifications veto public rows, not publicflag=false',()=>{
 const data=input();assert.equal(JSON.parse(buildMigration(data).entries[0].payload).active,true);
 for(const change of [{workflow_status:'closed_by_us'},{workflow_status:'closed_other'},{workflow_status:'not_relevant'},{stage:'rented'},{stage:'sold'},{stage:'archived'},{lifecycle_stage:'not_relevant'},{effective_available:false}]){
  const propertyStates=[{...data.privacyEvidence.propertyStates[0],...change}];
  const websiteSettings=change.effective_available===false?[{property_id:'office-64',available:false}]:[];
  const plan=buildMigration(input({...data,privacyEvidence:privacy(data,{propertyStates,websiteSettings})}));
  assert.equal(JSON.parse(plan.entries[0].payload).active,false);assert.equal(data.removals.length,0);
 }
 const mismatch=privacy(data,{websiteSettings:[{property_id:'office-64',available:false}]});assert.throws(()=>buildMigration(input({...data,privacyEvidence:mismatch})));
});
test('unclear lifecycle, unknown terminal states and unsanitized current approximate privacy block exposure',()=>{
 const data=input();
 for(const change of [{workflow_status:'unknown'},{stage:'unknown'},{lifecycle_stage:'unknown'},{stage:'reserved'},{lifecycle_stage:'recruiting'}])assert.throws(()=>buildMigration(input({...data,privacyEvidence:privacy(data,{propertyStates:[{...data.privacyEvidence.propertyStates[0],...change}]})})));
 const exact=row(64,{extra:'',lat:32,lng:34.8});const p=privacy(data,{propertyStates:[{...data.privacyEvidence.propertyStates[0],public_location_mode:'approximate'}]});assert.throws(()=>buildMigration(input({...data,sourceRows:[exact],privacyEvidence:p})));
});
test('active approximate rows require canonical sanitized text proof even with approximate marker and cleared coordinates',()=>{
 const base=input(),privacyEvidence=privacy(base,{propertyStates:[{...base.privacyEvidence.propertyStates[0],public_location_mode:'approximate'}]});
 for(const text of [
  {title:'דירה ברחוב הרצל 16',location:'הרצל 16, חיפה',description:'כניסה מהרצל 16'},
  {title:'דירה בחיפה',location:'חיפה',description:'מיקום משוער'}
 ]){
  const data=input({...base,sourceRows:[row(64,{...text,extra:'מיקום משוער',lat:null,lng:null})],privacyEvidence});
  assert.throws(()=>buildMigration(data),/current_privacy_projection_proof_required/);
  assert.throws(()=>migration.prepareMigrationInput(data),/current_privacy_projection_proof_required/);
  assert.equal(data.sourceRows[0].active,true);assert.equal(data.sourceRows[0].title,text.title);
 }
 const inactive=input({...base,sourceRows:[row(64,{active:false,extra:'מיקום משוער',lat:null,lng:null})],privacyEvidence});
 assert.equal(JSON.parse(buildMigration(inactive).entries[0].payload).active,false);
});
test('location withdrawal captures remain binding: unresolved blocks, verified hides, later active approvals require explicit proof',()=>{
 const data=input();
 const job=status=>({id:'withdrawal-64',property_id:'office-64',revision:3,status,catalog_backend:'supabase',schema_provenance:'captured-column'});
 for(const status of ['queued','processing','failed'])assert.throws(()=>buildMigration(input({...data,privacyEvidence:privacy(data,{locationWithdrawals:[job(status)]})})),/unresolved_location_withdrawal/);
 const verified=privacy(data,{locationWithdrawals:[job('verified')]});const plan=buildMigration(input({...data,privacyEvidence:verified}));assert.equal(JSON.parse(plan.entries[0].payload).active,false);
 const older=privacy(data,{locationWithdrawals:[{...job('verified'),revision:2}]});assert.throws(()=>buildMigration(input({...data,privacyEvidence:older})),/current_location_approval_proof_required/);
 const defaulted=privacy(data,{locationWithdrawals:[{...job('verified'),schema_provenance:'absent-column-supabase-default'}]});defaulted.capture.tables.office_location_withdrawals.columns=defaulted.capture.tables.office_location_withdrawals.columns.filter(k=>k!=='catalog_backend');assert.equal(JSON.parse(buildMigration(input({...data,privacyEvidence:defaulted})).entries[0].payload).active,false);
 const wrongDefault=structuredClone(defaulted);wrongDefault.locationWithdrawals[0].catalog_backend='cloudflare-d1';assert.throws(()=>buildMigration(input({...data,privacyEvidence:wrongDefault})));
});
test('readiness preprocessing freezes all captured privacy evidence and fresh mismatches cannot refreeze an existing plan',()=>{
 const data=input(),unfrozen={...data};delete unfrozen.frozenInputs;
 assert.equal(typeof migration.prepareMigrationInput,'function');const prepared=migration.prepareMigrationInput(unfrozen);const plan=buildMigration(prepared);assert.equal(verifyFrozenMigration(plan,prepared),true);
 const fresh=structuredClone(prepared);fresh.privacyEvidence.propertyStates[0].workflow_status='closed_other';fresh.frozenInputs=hashInputs(fresh);assert.throws(()=>verifyFrozenMigration(plan,fresh),/frozen_inputs_changed/);
 const oldFrozen={...fresh,frozenInputs:prepared.frozenInputs};assert.throws(()=>migration.prepareMigrationInput(oldFrozen),/frozen_inputs_changed/);
});

test('explicitly frozen owned inactive pilot tombstones survive import without omission or rewrite',()=>{
 const p=row(990001,{active:false,photos:[]}),s={schema_version:1,office_property_id:'synthetic-pilot-990001',revision:4,dispatch_id:'pilot-withdraw-4',payload_hash:canonicalHash(p),property:p};
 const data=input({existingCatalog:[s],preservedCatalog:[s]});const plan=buildMigration(data);
 assert.equal(plan.entries.length,2);assert.equal(plan.entries.find(e=>e.id===990001).operation,'preserved_exact');assert.doesNotMatch(plan.sql,/990001/);
 assert.ok(plan.frozen_inputs.preservedCatalog_sha256);assert.equal(verifyFrozenMigration(plan,data),true);
 for(const changed of [{...s,revision:5},{...s,office_property_id:'foreign'},{...s,property:{...p,active:true}}])assert.throws(()=>buildMigration(input({existingCatalog:[changed],preservedCatalog:[s]})));
 assert.throws(()=>buildMigration(input({existingCatalog:[s]})),/unexpected_catalog_identity/);
 assert.throws(()=>verifyFrozenMigration(plan,{...data,preservedCatalog:[]}));
});
