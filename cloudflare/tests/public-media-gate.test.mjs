import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import worker,{signatureFor} from '../worker.mjs';

const bytes=new TextEncoder().encode('synthetic-image-bytes');
const hash=createHash('sha256').update(bytes).digest('hex');
const key=`property-123/revision-1/00-${hash}.webp`,url='https://media.mavorealestate.com/'+key;
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
 const db={prepare(q){return {bind(...v){return {async first(){return sql.prepare(q).get(...v)||null;},async all(){return {results:sql.prepare(q).all(...v)};},async run(){const r=sql.prepare(q).run(...v);return {meta:{changes:Number(r.changes)}};}};}};}};
 const metadata={key,size:bytes.length,httpEtag:'"synthetic-etag"',httpMetadata:{contentType:'image/webp',cacheControl:'public, max-age=31536000, immutable'},customMetadata:{sha256:hash}};
 let calls=0;
 const bucket={async head(k){calls++;return k===key?{...metadata}:null;},async get(k,options){calls++;if(k!==key)return null;const part=options?.range;return {...metadata,body:new Blob([part?bytes.slice(part.offset,part.offset+part.length):bytes]).stream()};}};
 const env={CATALOG:db,PUBLIC_MEDIA_BUCKET:bucket,PUBLISHER_HMAC:'synthetic-key-only-12345678901234567890'};
 return {env,sql,metadata,bucket,get calls(){return calls;}};
}
function row(){return {id:123,type:'rent',price:'6500',price_label:'6,500 ₪',title:'Synthetic only',location:'Test area',rooms:2.5,baths:null,sqm:65,extra:'מיקום משוער',description:'Synthetic test',emoji:null,bg:null,lat:null,lng:null,photos:[url],has_elevator:null,has_shelter:null,has_parking:null,active:true,media_manifest:null};}
async function publish(env,p=row(),revision=1,prior=null){
 const body=JSON.stringify({schema_version:1,office_property_id:'synthetic-123',revision,expected_revision:prior,dispatch_id:'synthetic-'+revision,property:p});
 const path='/internal/publications/123',time=String(Math.floor(Date.now()/1000)),signature=await signatureFor(env.PUBLISHER_HMAC,'PUT',path,time,body);
 const r=await worker.fetch(new Request('https://synthetic.invalid'+path,{method:'PUT',body,headers:{'x-mavo-time':time,'x-mavo-signature':signature}}),env);assert.equal(r.status,200);
}
const read=(env,options={},path=url)=>worker.fetch(new Request(path,options),env);

test('serves exact approved active immutable bytes, overriding long-lived bucket cache metadata',async()=>{
 const {env}=setup();await publish(env);const response=await read(env);
 assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(response.headers.get('content-length'),String(bytes.length));assert.equal(response.headers.get('accept-ranges'),'bytes');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
});
test('inactive, unselected and foreign-property paths deny before fetching private storage',async()=>{
 for(const projection of [{...row(),active:false},{...row(),photos:[]}]){const s=setup();await publish(s.env,projection);assert.equal((await read(s.env)).status,404);assert.equal(s.calls,0);}
 const s=setup();await publish(s.env);assert.equal((await read(s.env,{},url.replace('property-123','property-124'))).status,404);assert.equal(s.calls,0);
});
test('withdrawal and newer media selection deny a formerly served known URL',async()=>{
 for(const changed of [{...row(),active:false},{...row(),photos:[]}]){const {env}=setup();await publish(env);assert.equal((await read(env)).status,200);await publish(env,changed,2,1);const r=await read(env);assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');}
});
test('HEAD serves metadata without a body; byte range and suffix return only requested bytes',async()=>{
 const {env}=setup();await publish(env);const head=await read(env,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('content-length'),String(bytes.length));
 const range=await read(env,{headers:{Range:'bytes=2-5'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 2-5/${bytes.length}`);assert.deepEqual(new Uint8Array(await range.arrayBuffer()),bytes.slice(2,6));
 const suffix=await read(env,{headers:{Range:'bytes=-3'}});assert.equal(suffix.status,206);assert.deepEqual(new Uint8Array(await suffix.arrayBuffer()),bytes.slice(-3));
});
test('malformed, multipart and unsatisfiable ranges do not return full media',async()=>{
 const {env}=setup();await publish(env);for(const Range of ['bytes=1-2,4-5','bytes=900-','bytes=4-2','bytes=-0','items=1-2','bytes=9007199254740992-']){const r=await read(env,{headers:{Range}});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),`bytes */${bytes.length}`);assert.doesNotMatch(await r.text(),/synthetic-image-bytes/);}
});
test('media never exposes catalog/internal routes, writes, private prefixes or arbitrary query',async()=>{
 const s=setup();await publish(s.env);
 for(const method of ['PUT','POST','DELETE'])assert.equal((await read(s.env,{method})).status,405);
 for(const path of ['/api/properties','/internal/publications','/office/crm','/private/original.jpg'])assert.equal((await read(s.env,{},'https://media.mavorealestate.com'+path)).status,404);
 assert.equal((await read(s.env,{},url+'?download=1')).status,404);assert.equal(s.calls,0);
});
test('missing dependencies, corrupt catalog and mismatched object hash/MIME fail closed',async()=>{
 for(const missing of ['CATALOG','PUBLIC_MEDIA_BUCKET']){const {env}=setup();await publish(env);delete env[missing];assert.equal((await read(env)).status,503);}
 const corrupt=setup();await publish(corrupt.env);corrupt.sql.prepare('UPDATE catalog SET payload=? WHERE id=123').run(JSON.stringify({...row(),title:'corrupt'}));assert.equal((await read(corrupt.env)).status,503);assert.equal(corrupt.calls,0);
 for(const change of [{customMetadata:{sha256:'0'.repeat(64)}},{httpMetadata:{contentType:'text/html'}}]){const s=setup();await publish(s.env);Object.assign(s.metadata,change);assert.equal((await read(s.env)).status,503);}
});
test('withdrawal while storage is loading is rechecked before any body is returned',async()=>{
 const s=setup();await publish(s.env);const get=s.bucket.get;s.bucket.get=async(...args)=>{const object=await get(...args);await publish(s.env,{...row(),active:false},2,1);return object;};
 const response=await read(s.env);assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/synthetic-image-bytes/);
});
test('video poster and fallback are eligible only while referenced by the active manifest',async()=>{
 const {env}=setup(),video=url.replace('00-','01-').replace('.webp','.mp4');
 const p={...row(),photos:[],media_manifest:{version:1,cover_media_id:'v',items:[{id:'v',type:'video',url:video,poster_url:url,fallback_url:url}]}};
 await publish(env,p);assert.equal((await read(env)).status,200);await publish(env,{...p,active:false},2,1);assert.equal((await read(env)).status,404);
});
