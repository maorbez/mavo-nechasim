// Public catalog API candidate. Deployment and provider bindings are recorded separately.
// D1 holds an approved public projection, never Office customers or Auth users.
export const PUBLIC_COLUMNS=['id','type','price','price_label','title','location','rooms','baths','sqm','extra','description','emoji','bg','lat','lng','photos','has_elevator','has_shelter','has_parking','active','media_manifest'];
const encoder=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const canonical=v=>JSON.stringify(v && typeof v==='object' ? Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
const digest=async v=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(v)));
const keys=(v,allowed)=>v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).every(k=>allowed.includes(k));
const positive=v=>Number.isSafeInteger(v)&&v>0;
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const mediaIdentity=v=>typeof v==='string'&&/^[A-Za-z0-9_:-]{1,128}$/.test(v);
const imageExt=/\.(jpg|png|webp)$/;
function mediaURL(v,id){
 if(typeof v!=='string')return false;
 const prefix='https://(?:media\\.mavorealestate\\.com/|tnkiwgewdancvmkhzlwz\\.supabase\\.co/storage/v1/object/public/property-photos/)';
 return new RegExp('^'+prefix+'property-'+id+'/revision-[1-9][0-9]*/[0-9]{2,3}-[a-f0-9]{64}\\.(jpg|png|webp|mp4)$').test(v);
}
function legacyPublicPhoto(v,id){
 if(typeof v!=='string'||v.length>2048||/[\s\\]/.test(v))return false;
 try{
  const u=new URL(v);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return false;
  if(u.host==='tnkiwgewdancvmkhzlwz.supabase.co')return u.pathname.startsWith('/storage/v1/object/public/property-photos/')&&u.pathname.length>'/storage/v1/object/public/property-photos/'.length;
  return mediaURL(v,id);
 }catch{return false;}
}
function validateManifest(m,id){
 if(m===null)return;
 if(!keys(m,['version','cover_media_id','items'])||m.version!==1||!mediaIdentity(m.cover_media_id)||!Array.isArray(m.items)||m.items.length<1||m.items.length>80)throw Error('invalid_manifest');
 const seen=new Set();
 for(const item of m.items){
  if(!keys(item,['id','type','url','poster_url','fallback_url'])||!mediaIdentity(item.id)||seen.has(item.id)||!mediaURL(item.url,id))throw Error('invalid_manifest');seen.add(item.id);
  if(item.type==='image'){
   if(!imageExt.test(item.url)||!['poster_url','fallback_url'].every(k=>item[k]===undefined||mediaURL(item[k],id)&&imageExt.test(item[k])))throw Error('invalid_manifest');
  }else if(item.type==='video'){
   if(!item.url.endsWith('.mp4')||![item.poster_url,item.fallback_url].every(x=>mediaURL(x,id)&&imageExt.test(x)))throw Error('invalid_manifest');
  }else throw Error('invalid_manifest');
 }
 if(!seen.has(m.cover_media_id))throw Error('invalid_manifest');
}
export function validateProjection(p){
 if(!keys(p,PUBLIC_COLUMNS)||PUBLIC_COLUMNS.some(k=>!Object.hasOwn(p,k))||!positive(p.id)||!['rent','sale','commercial-rent','commercial-sale'].includes(p.type))throw Error('invalid_projection');
 for(const k of ['price','price_label','title','location','extra','description','emoji','bg'])if(!(p[k]===null&&['price_label','emoji','bg'].includes(k))&&(typeof p[k]!=='string'||p[k].length>12000))throw Error('invalid_projection');
 for(const k of ['has_elevator','has_shelter','has_parking'])if(p[k]!==null&&typeof p[k]!=='boolean')throw Error('invalid_projection');
 if(typeof p.active!=='boolean')throw Error('invalid_projection');
 for(const k of ['rooms','baths','sqm'])if(p[k]!==null&&p[k]!==''&&!(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0)&&!(typeof p[k]==='string'&&/^\d+(\.\d+)?$/.test(p[k])))throw Error('invalid_projection');
 for(const [k,min,max] of [['lat',-90,90],['lng',-180,180]])if(p[k]!==null&&!(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=Number(min)&&p[k]<=Number(max)))throw Error('invalid_projection');
 if(p.extra==='מיקום משוער'&&(p.lat!==null||p.lng!==null))throw Error('private_coordinates');
 if(!Array.isArray(p.photos)||p.photos.length>80||!p.photos.every(x=>legacyPublicPhoto(x,p.id)))throw Error('invalid_projection');
 validateManifest(p.media_manifest,p.id);
 if(encoder.encode(canonical(p)).length>65536)throw Error('projection_too_large');
 return Object.fromEntries(PUBLIC_COLUMNS.map(k=>[k,p[k]]));
}
async function hmacKey(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const signedMessage=(method,path,time,body)=>encoder.encode([method,path,time,body].join('\n'));
export async function signatureFor(secret,method,path,time,body){return hex(await crypto.subtle.sign('HMAC',await hmacKey(secret),signedMessage(method,path,time,body)));}
async function boundedBody(request){
 if(Number(request.headers.get('content-length')||0)>131072)throw Error('body_too_large');
 if(!request.body)return '';
 const reader=request.body.getReader(),parts=[];let n=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;n+=value.byteLength;if(n>131072){await reader.cancel();throw Error('body_too_large');}parts.push(value);}}
 finally{reader.releaseLock();}
 const all=new Uint8Array(n);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length;}return new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(all);
}
function response(request,data,status=200){
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 const origin=request.headers.get('origin');if(['https://mavorealestate.com','https://www.mavorealestate.com'].includes(origin)){headers['access-control-allow-origin']=origin;headers.vary='Origin';}
 return new Response(request.method==='HEAD'?null:JSON.stringify(data),{status,headers});
}
async function verifiedRow(row){
 const p=validateProjection(JSON.parse(row.payload));if(await digest(canonical(p))!==row.payload_hash)throw Error('catalog_integrity');return p;
}
function referencesMedia(p,url){
 return p.active===true&&(p.photos.includes(url)||p.media_manifest?.items.some(item=>[item.url,item.poster_url,item.fallback_url].includes(url)));
}
function mediaRange(value,size){
 if(value===null)return null;
 const m=/^bytes=(\d*)-(\d*)$/.exec(value);if(!m||(!m[1]&&!m[2]))throw Error('invalid_range');
 let start,end;
 if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)throw Error('invalid_range');start=Math.max(0,size-suffix);end=size-1;}
 else {start=Number(m[1]);end=m[2]?Number(m[2]):size-1;}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)throw Error('invalid_range');
 end=Math.min(end,size-1);return {offset:start,length:end-start+1};
}
async function publicMedia(request,env,url){
 if(!['GET','HEAD'].includes(request.method))return response(request,{error:'method_not_allowed'},405);
 const m=/^\/property-([1-9][0-9]*)\/revision-([1-9][0-9]*)\/[0-9]{2,3}-([a-f0-9]{64})\.(jpg|png|webp|mp4)$/.exec(url.pathname);
 if(!m||url.search||!positive(Number(m[1])))return response(request,{error:'not_found'},404);
 if(!env.CATALOG||!env.PUBLIC_MEDIA_BUCKET)return response(request,{error:'media_unavailable'},503);
 const number=Number(m[1]),key=url.pathname.slice(1),approvedURL='https://media.mavorealestate.com'+url.pathname;
 const eligible=async()=>{
  const r=await env.CATALOG.prepare('SELECT payload,payload_hash FROM catalog WHERE id=? AND active=1').bind(number).first();
  return r&&referencesMedia(await verifiedRow(r),approvedURL);
 };
 if(!await eligible())return response(request,{error:'not_found'},404);
 const mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4'}[m[4]];
 const valid=o=>o&&o.key===key&&Number.isSafeInteger(o.size)&&o.size>0&&o.customMetadata?.sha256===m[3]&&o.httpMetadata?.contentType===mime&&typeof o.httpEtag==='string'&&/^"[^"\r\n]{1,150}"$/.test(o.httpEtag);
 const metadata=await env.PUBLIC_MEDIA_BUCKET.head(key);
 if(!metadata)return response(request,{error:'not_found'},404);
 if(!valid(metadata))throw Error('media_integrity');
 let range;
 try{range=request.method==='HEAD'?null:mediaRange(request.headers.get('range'),metadata.size);}
 catch {return new Response(null,{status:416,headers:{'content-range':'bytes */'+metadata.size,'cache-control':'no-store','x-content-type-options':'nosniff'}});}
 let object;
 if(request.method==='GET'){
  object=await env.PUBLIC_MEDIA_BUCKET.get(key,range?{range}:undefined);
  if(!object)return response(request,{error:'not_found'},404);
  if(!valid(object)||object.size!==metadata.size||object.httpEtag!==metadata.httpEtag||!object.body)throw Error('media_integrity');
 }
 // Recheck after asynchronous storage I/O. A withdrawal/new selection must not
 // leave a fetched but not-yet-returned private object available to a caller.
 if(!await eligible()){
  if(object?.body)await object.body.cancel().catch(()=>{});
  return response(request,{error:'not_found'},404);
 }
 // Ignore the R2 object's original immutable cache directive. Every new request
 // must pass the current catalog gate, including known URLs after withdrawal.
 const headers={'content-type':mime,'content-length':String(range?range.length:metadata.size),'cache-control':'no-store','accept-ranges':'bytes','etag':metadata.httpEtag,'x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 if(range)headers['content-range']=`bytes ${range.offset}-${range.offset+range.length-1}/${metadata.size}`;
 const origin=request.headers.get('origin');if(['https://mavorealestate.com','https://www.mavorealestate.com'].includes(origin)){headers['access-control-allow-origin']=origin;headers.vary='Origin';}
 return new Response(request.method==='HEAD'?null:object.body,{status:range?206:200,headers});
}
async function authorized(request,env,path,raw=''){
 if(!env.PUBLISHER_HMAC||env.PUBLISHER_HMAC.length<32)return false;
 const time=request.headers.get('x-mavo-time')||'',sig=request.headers.get('x-mavo-signature')||'';
 if(request.headers.has('origin')||!/^\d{10}$/.test(time)||Math.abs(Date.now()/1000-Number(time))>300||!/^([a-f0-9]{64})$/.test(sig))return false;
 return crypto.subtle.verify('HMAC',await hmacKey(env.PUBLISHER_HMAC),Uint8Array.from(sig.match(/../g),x=>parseInt(x,16)),signedMessage(request.method,path,time,raw));
}
async function internalState(request,env,path){
 if(!await authorized(request,env,path))return response(request,{error:'forbidden'},403);
 if(!env.CATALOG)return response(request,{error:'catalog_unavailable'},503);
 const state=async r=>({schema_version:1,office_property_id:r.office_property_id,revision:r.revision,dispatch_id:r.dispatch_id,payload_hash:r.payload_hash,property:await verifiedRow(r)});
 if(path==='/internal/publications'){
  const rows=await env.CATALOG.prepare('SELECT * FROM catalog ORDER BY id LIMIT 1001').bind().all();
  if(rows.results.length>1000)throw Error('catalog_bound_exceeded');
  return response(request,await Promise.all(rows.results.map(state)));
 }
 const id=Number(path.split('/').at(-1));if(!positive(id))return response(request,{error:'not_found'},404);
 const row=await env.CATALOG.prepare('SELECT * FROM catalog WHERE id=?').bind(id).first();
 return row?response(request,await state(row)):response(request,{error:'not_found'},404);
}
async function publish(request,env,path){
 if(!env.PUBLISHER_HMAC||env.PUBLISHER_HMAC.length<32)return response(request,{error:'publisher_not_configured'},503);
 const time=request.headers.get('x-mavo-time')||'',sig=request.headers.get('x-mavo-signature')||'';
 if(request.headers.has('origin')||!/^\d{10}$/.test(time)||Math.abs(Date.now()/1000-Number(time))>300||!/^([a-f0-9]{64})$/.test(sig))return response(request,{error:'forbidden'},403);
 let raw;try{raw=await boundedBody(request);}catch{return response(request,{error:'invalid_body'},413);}
 const signature=Uint8Array.from(sig.match(/../g),x=>parseInt(x,16));
 if(!await crypto.subtle.verify('HMAC',await hmacKey(env.PUBLISHER_HMAC),signature,signedMessage('PUT',path,time,raw)))return response(request,{error:'forbidden'},403);
 let body,p;try{
  body=JSON.parse(raw);if(!keys(body,['schema_version','office_property_id','revision','expected_revision','dispatch_id','property'])||body.schema_version!==1||!token(body.office_property_id)||!token(body.dispatch_id)||!positive(body.revision)||!(body.expected_revision===null||positive(body.expected_revision)&&body.expected_revision<body.revision))throw Error('invalid_envelope');
  p=validateProjection(body.property);if(path!=='/internal/publications/'+p.id)throw Error('identity_mismatch');
 }catch{return response(request,{error:'invalid_publication'},400);}
 if(!env.CATALOG)return response(request,{error:'catalog_unavailable'},503);
 const payload=canonical(p),hash=await digest(payload);
 const existing=await env.CATALOG.prepare('SELECT * FROM catalog WHERE id=?').bind(p.id).first();
 if(existing&&existing.revision===body.revision){
  if(existing.office_property_id===body.office_property_id&&existing.dispatch_id===body.dispatch_id&&existing.payload_hash===hash){await verifiedRow(existing);return response(request,{saved:true,replayed:true,provider:'cloudflare-d1',id:p.id,revision:body.revision,payload_hash:hash});}
  return response(request,{error:'revision_conflict'},409);
 }
 const result=await env.CATALOG.prepare(`INSERT INTO catalog(id,office_property_id,revision,dispatch_id,payload_hash,active,payload)
 SELECT ?,?,?,?,?,?,? WHERE ? IS NULL OR EXISTS(SELECT 1 FROM catalog WHERE id=?)
 ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,dispatch_id=excluded.dispatch_id,payload_hash=excluded.payload_hash,active=excluded.active,payload=excluded.payload,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE catalog.office_property_id=excluded.office_property_id AND catalog.revision=? AND excluded.revision>catalog.revision`)
 .bind(p.id,body.office_property_id,body.revision,body.dispatch_id,hash,p.active?1:0,payload,body.expected_revision,p.id,body.expected_revision).run();
 const read=await env.CATALOG.prepare('SELECT * FROM catalog WHERE id=?').bind(p.id).first();
 const exact=read&&read.revision===body.revision&&read.payload_hash===hash&&read.office_property_id===body.office_property_id&&read.dispatch_id===body.dispatch_id;
 if(result.meta.changes!==1&&!exact)return response(request,{error:'revision_conflict'},409);
 if(!exact)throw Error('unknown_publication_outcome');
 await verifiedRow(read);return response(request,{saved:true,replayed:result.meta.changes!==1,provider:'cloudflare-d1',id:p.id,revision:body.revision,payload_hash:hash});
}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 try{
  if(url.hostname==='media.mavorealestate.com'||path.startsWith('/property-'))return await publicMedia(request,env,url);
  if(path.startsWith('/internal/')){
   if(url.search)return response(request,{error:'not_found'},404);
   if(request.method==='GET'&&(path==='/internal/publications'||/^\/internal\/publications\/[1-9][0-9]*$/.test(path)))return await internalState(request,env,path);
   if(request.method!=='PUT'||!/^\/internal\/publications\/[1-9][0-9]*$/.test(path))return response(request,{error:'not_found'},404);
   return await publish(request,env,path);
  }
  if(path==='/api/properties'||/^\/api\/properties\/[1-9][0-9]*$/.test(path)){
   if(!['GET','HEAD'].includes(request.method))return response(request,{error:'method_not_allowed'},405);
   if(url.search)return response(request,{error:'unsupported_query'},400);
   if(!env.CATALOG)return response(request,{error:'catalog_unavailable'},503);
   if(path==='/api/properties'){
    const rows=await env.CATALOG.prepare('SELECT payload,payload_hash FROM catalog WHERE active=1 ORDER BY id LIMIT 1001').bind().all();
    if(rows.results.length>1000)throw Error('catalog_bound_exceeded');
    return response(request,await Promise.all(rows.results.map(verifiedRow)));
   }
   const id=Number(path.split('/').at(-1));if(!positive(id))return response(request,{error:'not_found'},404);
   const row=await env.CATALOG.prepare('SELECT payload,payload_hash FROM catalog WHERE id=? AND active=1').bind(id).first();
   return row?response(request,await verifiedRow(row)):response(request,{error:'not_found'},404);
  }
  if(/^\/(api|rest|auth|storage|office|admin|public)(\/|$)/.test(path))return response(request,{error:'not_found'},404);
  if(['GET','HEAD'].includes(request.method)&&env.ASSETS)return env.ASSETS.fetch(request);
  return response(request,{error:'not_found'},404);
 }catch{return response(request,{error:'catalog_unavailable_or_unverified'},503);}
}};
