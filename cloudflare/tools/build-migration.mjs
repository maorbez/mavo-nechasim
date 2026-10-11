// Offline compiler only: no fetch, provider credentials, catalog mutation or deployment.
// Input sourceRows must have exactly the Worker's21 public columns. Other arrays
// are owner-local evidence: sourceLinks, officeProperties, removals,
// mediaReplacements, existingCatalog, inactiveProjections and approvals.
// mediaReplacements [{source_url,url,sha256,verified:true}] are a CALLER-SUPPLIED
// verification assertion; this compiler cannot verify R2 bytes or live withdrawals.
// officeProperties require established {id,property_number,revision,archived_at,
// public_listing_enabled,type?}. A null number is retained privately but never
// allocated. Absent withdrawn numbers need an exact inactiveProjections row or
// an authoritative type. No listing is hidden merely because its flag is false.
// Freeze with hashInputs(input); pass frozenInputs to buildMigration. Immediately
// BEFORE import call verifyFrozenMigration(plan,freshlyRereadInput). Executing SQL
// and actual destination readback belong to the one release controller.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_COLUMNS,validateProjection} from '../worker.mjs';

const HASH=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_-]{1,160}$/;
const token=value=>typeof value==='string'&&ID.test(value);
const INPUTS=['sourceRows','sourceLinks','officeProperties','removals','mediaReplacements','existingCatalog','inactiveProjections','approvals'];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const positive=v=>Number.isSafeInteger(v)&&v>0;
function canonical(v){
 if(v===null||typeof v==='string'||typeof v==='boolean')return v;
 if(typeof v==='number'&&Number.isFinite(v))return v;
 if(Array.isArray(v))return v.map(canonical);
 if(object(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
 throw Error('non_json_input');
}
const serialize=v=>JSON.stringify(canonical(v));
const sha=v=>createHash('sha256').update(v).digest('hex');
export const canonicalHash=v=>sha(serialize(v));
const exact=(v,keys,required=keys)=>object(v)&&Object.keys(v).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(v,k));
function arrays(input){
 if(!object(input))throw Error('invalid_input');
 for(const name of INPUTS)if(!Array.isArray(input[name]))throw Error('missing_input_array');
 return input;
}
export function hashInputs(input){
 arrays(input);
 // Top-level evidence row order is immaterial. Nested media order remains exact.
 return {schema_version:1,...Object.fromEntries(INPUTS.map(name=>[name+'_sha256',canonicalHash(input[name].map(canonical).sort((a,b)=>{const x=serialize(a),y=serialize(b);return x<y?-1:x>y?1:0;}))]))};
}
function freeze(input,expected){
 const current=hashInputs(input);
 if(!exact(expected,Object.keys(current))||serialize(current)!==serialize(expected))throw Error('frozen_inputs_changed');
 return current;
}
function sourceURL(value){
 if(typeof value!=='string'||value.length>2048||/[\x00-\x20\\%]/.test(value)||/(?:^|\/)\.{1,2}(?:\/|$)/.test(value))return false;
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return false;
  return u.origin==='https://tnkiwgewdancvmkhzlwz.supabase.co'&&u.pathname.startsWith('/storage/v1/object/public/property-photos/')&&u.pathname.length>'/storage/v1/object/public/property-photos/'.length||
   u.origin==='https://media.postify.co.il'&&/^\/postify157\/[^/].+\.(?:jpg|jpeg|png|webp|mp4|mov)$/i.test(u.pathname)||
   u.origin==='https://media.mavorealestate.com'&&/^\/property-[1-9][0-9]*\/revision-[1-9][0-9]*\/[0-9]{2,3}-[a-f0-9]{64}\.(jpg|png|webp|mp4)$/.test(u.pathname);
 }catch{return false;}
}
function verifiedMedia(input){
 const replacements=new Map();
 for(const r of input.mediaReplacements){
  if(!exact(r,['source_url','url','sha256','verified'])||!sourceURL(r.source_url)||r.verified!==true||!HASH.test(r.sha256)||typeof r.url!=='string')throw Error('unverified_media_replacement');
  const match=/^https:\/\/media\.mavorealestate\.com\/property-([1-9][0-9]*)\/revision-[1-9][0-9]*\/[0-9]{2,3}-([a-f0-9]{64})\.(jpg|png|webp|mp4)$/.exec(r.url);
  if(!match||match[2]!==r.sha256||replacements.has(r.source_url))throw Error('invalid_media_replacement');
  const sourcePath=new URL(r.source_url).pathname;
  const sourceVideo=/\.(mp4|mov)$/i.test(sourcePath),sourceImage=/\.(jpg|jpeg|png|webp)$/i.test(sourcePath);
  if(!(sourceVideo||sourceImage)||sourceVideo!==(match[3]==='mp4'))throw Error('media_kind_changed');
  replacements.set(r.source_url,{...r,property_number:Number(match[1])});
 }
 return replacements;
}
function migrateProjection(source,media){
 if(!exact(source,PUBLIC_COLUMNS))throw Error('invalid_source_projection');
 // Check non-media values and privacy before replacing any source reference.
 validateProjection({...source,photos:[]});
 const replace=value=>{
  if(!sourceURL(value))throw Error('unsafe_source_media');
  const proof=media.get(value);
  if(!proof||proof.property_number!==source.id)throw Error('missing_or_foreign_media_replacement');
  return proof.url;
 };
 if(!Array.isArray(source.photos)||source.photos.length>80)throw Error('invalid_source_projection');
 const p={...source,photos:source.photos.map(replace)};
 if(source.media_manifest!==null){
  const m=source.media_manifest;
  if(!exact(m,['version','cover_media_id','items'])||!Array.isArray(m.items))throw Error('invalid_source_manifest');
  p.media_manifest={...m,items:m.items.map(item=>{
   if(!exact(item,['id','type','url','poster_url','fallback_url'],['id','type','url']))throw Error('private_or_invalid_source_manifest');
   const next={...item,url:replace(item.url)};
   for(const key of ['poster_url','fallback_url'])if(Object.hasOwn(item,key))next[key]=replace(item[key]);
   return next;
  })};
 }
 const clean=validateProjection(p);
 if(/supabase\.co|media\.postify\.co\.il/.test(serialize({photos:clean.photos,media_manifest:clean.media_manifest})))throw Error('unmigrated_media');
 return clean;
}
function officeLedger(input){
 const ids=new Map(),numbers=new Map();
 for(const p of input.officeProperties){
  if(!exact(p,['id','property_number','revision','archived_at','public_listing_enabled','type'],['id','property_number','revision','archived_at','public_listing_enabled'])||!token(p.id)||ids.has(p.id)||
   !(p.property_number===null||positive(p.property_number))||!(p.revision===null||positive(p.revision))||typeof p.public_listing_enabled!=='boolean'||
   !(p.archived_at===null||typeof p.archived_at==='string'&&Number.isFinite(Date.parse(p.archived_at))))throw Error('invalid_office_ledger');
  if(p.property_number!==null&&numbers.has(p.property_number))throw Error('duplicate_office_number');
  ids.set(p.id,p);if(p.property_number!==null)numbers.set(p.property_number,p);
 }
 return {ids,numbers};
}
function withdrawalNumbers(input,office){
 const withdrawn=new Set();
 for(const p of office.ids.values())if(p.archived_at!==null){if(p.property_number===null)throw Error('withdrawal_number_unknown');withdrawn.add(p.property_number);}
 for(const r of input.removals){
  if(!exact(r,['property_id','revision','status','channels'])||!token(r.property_id)||!positive(r.revision)||
   !['requested','pending','running','failed','verified','terminal','withdrawn'].includes(r.status)||!Array.isArray(r.channels)||!r.channels.length||!r.channels.every(c=>typeof c==='string'&&/^[a-z][a-z_-]{0,60}$/.test(c)))throw Error('invalid_removal_ledger');
  const p=office.ids.get(r.property_id);
  if(!p||!positive(p.revision)||r.revision>p.revision)throw Error('foreign_or_stale_removal_ledger');
  if(r.channels.includes('website')){if(p.property_number===null)throw Error('withdrawal_number_unknown');withdrawn.add(p.property_number);}
 }
 return withdrawn;
}
function blankTombstone(p){
 if(!['rent','sale','commercial-rent','commercial-sale'].includes(p.type))throw Error('missing_tombstone_public_type');
 return {id:p.property_number,type:p.type,price:'',price_label:null,title:'',location:'',rooms:null,baths:null,sqm:null,extra:'',description:'',emoji:null,bg:null,lat:null,lng:null,photos:[],has_elevator:null,has_shelter:null,has_parking:null,active:false,media_manifest:null};
}
function catalogState(input){
 const map=new Map(),links=new Set();
 for(const r of input.existingCatalog){
  if(!exact(r,['schema_version','office_property_id','revision','dispatch_id','payload_hash','property'])||r.schema_version!==1||!(r.office_property_id===null||token(r.office_property_id))||!positive(r.revision)||!token(r.dispatch_id)||!HASH.test(r.payload_hash))throw Error('unknown_catalog_state');
  const p=validateProjection(r.property);
  if(canonicalHash(p)!==r.payload_hash||map.has(p.id)||r.office_property_id!==null&&links.has(r.office_property_id))throw Error('unverified_catalog_state');
  map.set(p.id,r);if(r.office_property_id!==null)links.add(r.office_property_id);
 }
 return map;
}
const quote=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+v.replaceAll("'","''")+"'";
export function buildMigration(input){
 arrays(input);const frozen=freeze(input,input.frozenInputs),media=verifiedMedia(input),office=officeLedger(input),withdrawn=withdrawalNumbers(input,office),existing=catalogState(input);
 const projections=new Map(),links=new Map(),inactive=new Map();
 for(const r of input.sourceRows){if(!positive(r.id)||projections.has(r.id))throw Error('duplicate_or_invalid_public_number');projections.set(r.id,migrateProjection(r,media));}
 for(const r of input.sourceLinks){
  if(!exact(r,['property_number','office_property_id'])||!positive(r.property_number)||!(r.office_property_id===null||token(r.office_property_id))||!projections.has(r.property_number)||links.has(r.property_number))throw Error('invalid_source_identity_ledger');
  links.set(r.property_number,r.office_property_id);
 }
 if(links.size!==projections.size)throw Error('missing_source_identity_ledger');
 for(const r of input.inactiveProjections){
  if(!positive(r.id)||r.active!==false||inactive.has(r.id)||projections.has(r.id)||!withdrawn.has(r.id)||!office.numbers.has(r.id))throw Error('unknown_inactive_projection');
  inactive.set(r.id,migrateProjection(r,media));
 }
 for(const [number,link] of links){
  if(link!==null&&(!office.ids.has(link)||office.ids.get(link).property_number!==number))throw Error('foreign_source_office_identity');
 }
 for(const number of withdrawn){
  if(projections.has(number))projections.set(number,{...projections.get(number),active:false});
  else projections.set(number,inactive.get(number)||validateProjection(blankTombstone(office.numbers.get(number))));
 }
 if(projections.size>1000)throw Error('catalog_bound_exceeded');
 const entries=[];
 for(const [id,p] of [...projections].sort(([a],[b])=>a-b)){
  const o=office.numbers.get(id),revision=o?o.revision:1;
  if(!positive(revision))throw Error('missing_current_office_revision');
  const office_property_id=o?o.id:null,payload=serialize(p),payload_hash=sha(payload);
  const entry={id,office_property_id,revision,revision_source:o?'office':'legacy-readonly',dispatch_id:'migration-'+canonicalHash({id,office_property_id,revision,payload_hash,frozen}).slice(0,48),payload_hash,active:p.active?1:0,payload,operation:'insert'};
  const current=existing.get(id);
  if(current){
   if(current.office_property_id!==office_property_id||current.revision!==revision||current.payload_hash!==payload_hash)throw Error('catalog_identity_or_revision_conflict');
   entry.operation='verified_noop';entry.dispatch_id=current.dispatch_id;existing.delete(id);
  }
  entries.push(entry);
 }
 if(existing.size)throw Error('unexpected_catalog_identity');
 const sql=entries.filter(e=>e.operation==='insert').map(e=>'INSERT INTO catalog (id,office_property_id,revision,dispatch_id,payload_hash,active,payload) VALUES ('+[e.id,e.office_property_id,e.revision,e.dispatch_id,e.payload_hash,e.active,e.payload].map(quote).join(',')+');').join('\n');
 return {schema_version:1,provider:'cloudflare-d1',media_verification:'caller-supplied-only',frozen_inputs:frozen,entries,sql,summary:{rows:entries.length,active:entries.filter(e=>e.active===1).length,inactive:entries.filter(e=>e.active===0).length,linked:entries.filter(e=>e.office_property_id!==null).length,legacy_readonly:entries.filter(e=>e.office_property_id===null).length,inserts:entries.filter(e=>e.operation==='insert').length,noops:entries.filter(e=>e.operation==='verified_noop').length}};
}
export function verifyFrozenMigration(plan,freshInput){
 if(!object(plan)||plan.schema_version!==1)throw Error('invalid_plan');
 freeze(freshInput,plan.frozen_inputs);
 const rebuilt=buildMigration({...freshInput,frozenInputs:plan.frozen_inputs});
 if(serialize(plan)!==serialize(rebuilt))throw Error('migration_plan_changed');
 return true;
}
async function privateDirectory(dir,reason){const s=await fs.lstat(dir);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077))throw Error(reason);}
async function privateFile(filename){const s=await fs.lstat(filename);if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)||s.size>64*1024*1024)throw Error('file_not_private');return fs.readFile(filename);}
export async function writeMigration(input,destination){
 const plan=buildMigration(input),dir=path.resolve(destination);await privateDirectory(path.dirname(dir),'parent_not_private');await fs.mkdir(dir,{mode:0o700});
 try{
  const bytes={'plan.private.json':serialize(plan)+'\n','plan.private.sql':plan.sql+(plan.sql?'\n':'')};
  const manifest={schema_version:1,summary:plan.summary,frozen_inputs:plan.frozen_inputs,files:Object.fromEntries(Object.entries(bytes).map(([name,b])=>[name,{sha256:sha(b),bytes:Buffer.byteLength(b)}]))};
  for(const [name,b] of Object.entries({...bytes,'manifest.private.json':serialize(manifest)+'\n'})){const f=await fs.open(path.join(dir,name),'wx',0o600);try{await f.writeFile(b);await f.sync();}finally{await f.close();}}
  const handle=await fs.open(dir,'r');try{await handle.sync();}finally{await handle.close();}
  await verifyMigration(dir,input);return manifest;
 }catch(e){await fs.rm(dir,{recursive:true,force:true});throw e;}
}
export async function verifyMigration(destination,freshInput){
 const dir=path.resolve(destination);await privateDirectory(dir,'plan_not_private');const manifest=JSON.parse(await privateFile(path.join(dir,'manifest.private.json')));
 if(!exact(manifest,['schema_version','summary','frozen_inputs','files'])||manifest.schema_version!==1||!exact(manifest.files,['plan.private.json','plan.private.sql']))throw Error('invalid_manifest');
 const bytes={};
 for(const name of ['plan.private.json','plan.private.sql']){const b=await privateFile(path.join(dir,name)),m=manifest.files[name];if(!exact(m,['sha256','bytes'])||!HASH.test(m.sha256)||m.bytes!==b.length||m.sha256!==sha(b))throw Error('checksum_mismatch');bytes[name]=b;}
 const plan=JSON.parse(bytes['plan.private.json']);verifyFrozenMigration(plan,freshInput);
 if(bytes['plan.private.sql'].toString()!==plan.sql+(plan.sql?'\n':'')||serialize(manifest.summary)!==serialize(plan.summary)||serialize(manifest.frozen_inputs)!==serialize(plan.frozen_inputs))throw Error('invalid_manifest');
 return plan;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [command,input,destination,...extra]=process.argv.slice(2);if(extra.length||!input||!destination||!['build','verify'].includes(command))throw Error('usage');
  if(command==='build')await writeMigration(JSON.parse(await privateFile(path.resolve(input))),destination);
  else await verifyMigration(input,JSON.parse(await privateFile(path.resolve(destination))));
  process.stdout.write('Offline plan verified; no provider mutation or live media verification.\n');
 }catch(e){process.stderr.write((e.code||e.message||'offline_plan_failed')+'\n');process.exitCode=1;}
}
