// Local preparation only. This module has no network client or deployment path.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PUBLIC_COLUMNS=Object.freeze(['id','type','price','price_label','title','location','lat','lng','rooms','baths','sqm',
  'extra','description','emoji','bg','photos','has_elevator','has_shelter','has_parking','active','media_manifest']);
const OPERATIONAL_COLUMNS=['created_at','updated_at','office_updated_at','published_at'];
const HASH=/^[a-f0-9]{64}$/;
const MEDIA_ID=/^[A-Za-z0-9_:-]{1,128}$/;
const encode=value=>JSON.stringify(canonical(value))+'\n';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function canonical(value) {
  if(typeof value==='number'&&!Number.isFinite(value))throw new Error('invalid_public_value');
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  if(value===null||['string','number','boolean'].includes(typeof value))return value;
  throw new Error('invalid_public_value');
}
function object(value) {return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function mediaURL(value,{propertyNumber,immutable=false,imageOnly=false,videoOnly=false}={}) {
  if(typeof value!=='string'||value.length>2000||/[\x00-\x20\\%]/.test(value)||/(?:^|\/)\.{1,2}(?:\/|$)/.test(value))return false;
  try {
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return false;
    const prefix='/storage/v1/object/public/property-photos/';let objectPath;
    if(u.origin==='https://tnkiwgewdancvmkhzlwz.supabase.co'&&u.pathname.startsWith(prefix)&&u.pathname.length>prefix.length)objectPath=u.pathname.slice(prefix.length);
    else if(u.origin==='https://media.mavorealestate.com') {
      objectPath=u.pathname.slice(1);immutable=true;
      if(!/^property-[1-9][0-9]*\/revision-[1-9][0-9]*\/[0-9]{2,3}-[a-f0-9]{64}\.(?:jpg|png|webp|mp4)$/.test(objectPath))return false;
    }else return false;
    const identity=/^property-([1-9][0-9]*)\/revision-[1-9][0-9]*\/[0-9]+-[a-f0-9]{64}\.(jpg|png|webp|mp4)$/.exec(objectPath);
    if(immutable&&!identity)return false;
    if(identity&&propertyNumber!==undefined&&identity[1]!==String(propertyNumber))return false;
    if(imageOnly&&!/\.(jpg|png|webp)$/.test(objectPath))return false;
    if(videoOnly&&!/\.mp4$/.test(objectPath))return false;
    return true;
  }catch{return false;}
}
function manifest(value,propertyNumber) {
  if(value===null)return;
  if(!object(value)||Object.keys(value).some(k=>!['version','cover_media_id','items'].includes(k))||value.version!==1||
    !Array.isArray(value.items)||!value.items.length||value.items.length>80||typeof value.cover_media_id!=='string'||!MEDIA_ID.test(value.cover_media_id))throw new Error('invalid_media_manifest');
  const seen=new Set();
  for(const item of value.items) {
    if(!object(item)||Object.keys(item).some(k=>!['id','type','url','poster_url','fallback_url'].includes(k))||
      typeof item.id!=='string'||!MEDIA_ID.test(item.id)||seen.has(item.id)||!['image','video'].includes(item.type)||
      !mediaURL(item.url,{propertyNumber,immutable:true,imageOnly:item.type==='image',videoOnly:item.type==='video'})||
      (item.type==='video'&&(!Object.hasOwn(item,'poster_url')||!Object.hasOwn(item,'fallback_url'))))throw new Error('invalid_media_manifest');
    for(const field of ['poster_url','fallback_url'])if(Object.hasOwn(item,field)&&
      !mediaURL(item[field],{propertyNumber,immutable:true,imageOnly:true}))throw new Error('invalid_media_manifest');
    seen.add(item.id);
  }
  if(!seen.has(value.cover_media_id))throw new Error('invalid_media_manifest');
}
export function buildExport(rows) {
  if(!Array.isArray(rows))throw new Error('rows_array_required');
  const ids=new Set(),links=new Set(),properties=[],records=[],unresolved=[];
  for(const row of rows) {
    if(!object(row)||!Number.isSafeInteger(row.id)||row.id<=0)throw new Error('invalid_property_number');
    if(ids.has(row.id))throw new Error('duplicate_property_number');ids.add(row.id);
    let link=row.office_property_id??null;
    if(link==='')link=null;
    if(link!==null&&(typeof link!=='string'||link.length>120||link.trim()!==link||/[\x00-\x20]/.test(link)))throw new Error('invalid_office_property_id');
    if(link!==null){if(links.has(link))throw new Error('duplicate_office_property_id');links.add(link);}else unresolved.push(row.id);
    const projection={};
    for(const key of PUBLIC_COLUMNS) {
      if(!Object.hasOwn(row,key))throw new Error('missing_public_column:'+key);
      projection[key]=row[key];
    }
    for(const key of PUBLIC_COLUMNS.filter(k=>!['photos','media_manifest'].includes(k))) {
      if(projection[key]!==null&&!['string','number','boolean'].includes(typeof projection[key]))throw new Error('invalid_public_value');
    }
    if(projection.extra==='מיקום משוער'&&(projection.lat!==null||projection.lng!==null))throw new Error('approximate_coordinates_forbidden');
    if(typeof projection.active!=='boolean'||!Array.isArray(projection.photos)||projection.photos.some(url=>!mediaURL(url,{propertyNumber:row.id})))throw new Error('invalid_public_value');
    manifest(projection.media_manifest,row.id);canonical(projection);
    const operational={};
    for(const key of OPERATIONAL_COLUMNS)if(Object.hasOwn(row,key)) {
      if(row[key]!==null&&typeof row[key]!=='string')throw new Error('invalid_operational_metadata');
      operational[key]=row[key];
    }
    properties.push(projection);records.push({property_number:row.id,office_property_id:link,operational_metadata:operational});
  }
  properties.sort((a,b)=>a.id-b.id);records.sort((a,b)=>a.property_number-b.property_number);unresolved.sort((a,b)=>a-b);
  const catalog={schema_version:1,properties};
  const reconciliation={schema_version:1,records,unresolved_property_numbers:unresolved,
    migration_gate:unresolved.length?'blocked_unresolved_office_links':'requires_authoritative_office_readback'};
  const catalogBytes=encode(catalog),reconciliationBytes=encode(reconciliation);
  const fileInfo=bytes=>({sha256:sha(bytes),bytes:Buffer.byteLength(bytes)});
  const manifestObject={schema_version:1,row_count:properties.length,files:{'catalog.json':fileInfo(catalogBytes),
    'reconciliation.private.json':fileInfo(reconciliationBytes)}};
  return {catalog,reconciliation,manifest:manifestObject,catalogBytes,reconciliationBytes};
}
async function privateDirectory(dir,reason) {
  const stat=await fs.lstat(dir);
  if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o077))throw new Error(reason);
}
export async function writeExport(rows,destination) {
  const out=buildExport(rows),dir=path.resolve(destination);
  await privateDirectory(path.dirname(dir),'parent_not_private');
  await fs.mkdir(dir,{mode:0o700}); // Exclusive reservation: never merge with or overwrite an export.
  try {
    for(const [name,bytes] of [['catalog.json',out.catalogBytes],['reconciliation.private.json',out.reconciliationBytes],['manifest.json',encode(out.manifest)]]) {
      const file=await fs.open(path.join(dir,name),'wx',0o600);
      try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}
    }
    const handle=await fs.open(dir,'r');try{await handle.sync();}finally{await handle.close();}
    await verifyExport(dir);return out.manifest;
  }catch(error){await fs.rm(dir,{recursive:true,force:true});throw error;}
}
async function readPrivateFile(dir,name) {
  const filename=path.join(dir,name),stat=await fs.lstat(filename);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o077)||stat.size>64*1024*1024)throw new Error('file_not_private');
  return fs.readFile(filename);
}
export async function verifyExport(destination) {
  const dir=path.resolve(destination);await privateDirectory(dir,'export_not_private');
  const saved=JSON.parse(await readPrivateFile(dir,'manifest.json'));
  if(saved.schema_version!==1||!object(saved.files)||Object.keys(saved.files).sort().join(',')!=='catalog.json,reconciliation.private.json')throw new Error('invalid_export_manifest');
  const content={};
  for(const name of ['catalog.json','reconciliation.private.json']) {
    const expected=saved.files[name],bytes=await readPrivateFile(dir,name);
    if(!object(expected)||!HASH.test(expected.sha256)||bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)throw new Error('checksum_mismatch');
    content[name]=JSON.parse(bytes);
  }
  const catalog=content['catalog.json'],reconciliation=content['reconciliation.private.json'];
  if(catalog.schema_version!==1||reconciliation.schema_version!==1||!Array.isArray(catalog.properties)||!Array.isArray(reconciliation.records)||catalog.properties.length!==reconciliation.records.length)throw new Error('invalid_recovery_graph');
  const rows=catalog.properties.map((row,index)=>{
    const privateRow=reconciliation.records[index];
    if(privateRow.property_number!==row.id)throw new Error('invalid_recovery_graph');
    return {...row,...privateRow.operational_metadata,office_property_id:privateRow.office_property_id};
  });
  const rebuilt=buildExport(rows);
  if(encode(rebuilt.manifest)!==encode(saved)||encode(rebuilt.catalog)!==encode(catalog)||encode(rebuilt.reconciliation)!==encode(reconciliation))throw new Error('invalid_recovery_graph');
  return saved;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [command,input,output,...extra]=process.argv.slice(2);
    if(extra.length||!input||(command==='export'&&!output)||(command==='verify'&&output)||!['export','verify'].includes(command))throw new Error('usage: export-catalog.mjs export LOCAL_ROWS_JSON NEW_PRIVATE_DIRECTORY | verify PRIVATE_DIRECTORY');
    if(command==='verify')await verifyExport(input);
    else {
      const source=await readPrivateFile(path.dirname(path.resolve(input)),path.basename(input));
      await writeExport(JSON.parse(source),output);
    }
    process.stdout.write('Local preparation verified; no provider/Office/auth restore proof.\n');
  }catch(error){process.stderr.write((error.code||'local_preparation_failed')+'\n');process.exitCode=1;}
}
