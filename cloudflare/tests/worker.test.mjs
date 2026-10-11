import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker, {validateProjection, signatureFor} from '../worker.mjs';

function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
 const db={prepare(q){return {bind(...v){return {async first(){return sql.prepare(q).get(...v)||null;},async all(){return {results:sql.prepare(q).all(...v)};},async run(){const r=sql.prepare(q).run(...v);return {meta:{changes:Number(r.changes)}};}};}};}};
 return {env:{CATALOG:db,PUBLISHER_HMAC:'synthetic-test-key-only-12345678901234567890'},sql};
}
const row=(id=123)=>({id,type:'rent',price:'5000',price_label:'₪ 5,000',title:'נכס בדיקה',location:'תל אביב',rooms:2.5,baths:1,sqm:70,extra:'מיקום משוער',description:'נתונים סינתטיים',emoji:'🏠',bg:'#faf5e9',lat:null,lng:null,photos:[],has_elevator:true,has_shelter:false,has_parking:false,active:true,media_manifest:null});
async function write(env,body,alter={}){
 const raw=JSON.stringify(body),path='/internal/publications/'+body.property.id;
 const time=String(Math.floor(Date.now()/1000));
 const signed=await signatureFor(env.PUBLISHER_HMAC,'PUT',path,time,raw);
 return worker.fetch(new Request('https://synthetic.invalid'+path,{method:'PUT',headers:{'content-type':'application/json','x-mavo-time':time,'x-mavo-signature':signed,...alter},body:raw}),env);
}
const envelope=(revision=1,expected_revision=null,p=row())=>({schema_version:1,office_property_id:'synthetic-office-123',revision,expected_revision,dispatch_id:'synthetic-dispatch-'+revision,property:p});
test('anonymous writes and missing publisher secret deny',async()=>{
 const {env}=setup();const a=await worker.fetch(new Request('https://synthetic.invalid/internal/publications/123',{method:'PUT',body:'{}'}),env);assert.equal(a.status,403);
 delete env.PUBLISHER_HMAC;assert.equal((await worker.fetch(new Request('https://synthetic.invalid/internal/publications/123',{method:'PUT',body:'{}'}),env)).status,503);
});
test('signed publish, exact replay and anonymous readback preserve number/fractional rooms',async()=>{
 const {env}=setup();assert.equal((await write(env,envelope())).status,200);const retry=await (await write(env,envelope())).json();assert.equal(retry.replayed,true);
 const res=await worker.fetch(new Request('https://synthetic.invalid/api/properties'),env);assert.equal(res.headers.get('cache-control'),'no-store');assert.deepEqual(await res.json(),[row()]);
});
test('existing residential/commercial purchase and rental types remain valid',()=>{
 for(const type of ['rent','sale','commercial-rent','commercial-sale'])assert.equal(validateProjection({...row(),type}).type,type);
 assert.throws(()=>validateProjection({...row(),type:'unknown'}));
});
test('corrupted catalog payload cannot receive a successful replay receipt',async()=>{
 const {env,sql}=setup();await write(env,envelope());
 sql.prepare('UPDATE catalog SET payload=? WHERE id=?').run(JSON.stringify({...row(),price:'99999'}),123);
 assert.equal((await write(env,envelope())).status,503);
 assert.equal((await worker.fetch(new Request('https://synthetic.invalid/api/properties/123'),env)).status,503);
});
test('two overlapping identical initial dispatches reconcile as saved and replayed',async()=>{
 const {env,sql}=setup();const originalPrepare=env.CATALOG.prepare;let remaining=2,release;
 const gate=new Promise(resolve=>{release=resolve;});
 env.CATALOG.prepare=q=>({bind(...values){const bound=originalPrepare(q).bind(...values);return {...bound,async first(){
  const snapshot=await bound.first();
  if(q==='SELECT * FROM catalog WHERE id=?'&&remaining>0){remaining--;if(remaining===0)release();await gate;}
  return snapshot;
 }};}});
 const responses=await Promise.all([write(env,envelope()),write(env,envelope())]);
 assert.deepEqual(responses.map(r=>r.status),[200,200]);
 const receipts=await Promise.all(responses.map(r=>r.json()));assert.deepEqual(receipts.map(r=>r.replayed).sort(),[false,true]);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM catalog').get().n,1);
});
test('CAS stale revision, divergent replay and foreign identity rejected',async()=>{
 const {env}=setup();await write(env,envelope());assert.equal((await write(env,envelope(2,1))).status,200);
 assert.equal((await write(env,envelope(3,1))).status,409);assert.equal((await write(env,envelope(2,1,{...row(),price:'99'}))).status,409);
 assert.equal((await write(env,{...envelope(3,2),office_property_id:'another-office'})).status,409);
});
test('withdrawal hides detail/list and older revision cannot revive it',async()=>{
 const {env}=setup();await write(env,envelope());await write(env,envelope(2,1,{...row(),active:false}));
 assert.deepEqual(await (await worker.fetch(new Request('https://synthetic.invalid/api/properties'),env)).json(),[]);
 assert.equal((await worker.fetch(new Request('https://synthetic.invalid/api/properties/123'),env)).status,404);assert.equal((await write(env,envelope())).status,409);
});
test('private fields and approximate coordinates fail closed',()=>{
 assert.throws(()=>validateProjection({...row(),office_property_id:'private'}));assert.throws(()=>validateProjection({...row(),owner_phone:'private'}));assert.throws(()=>validateProjection({...row(),lat:32,lng:34}));
});
test('legacy photos preserve approved public assets but reject private credential URLs',()=>{
 const approved='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/legacy-public.jpg';
 assert.deepEqual(validateProjection({...row(),photos:[approved]}).photos,[approved]);
 for(const url of ['https://office.example/private/photo?token=secret',approved+'?token=secret',approved+'#private','https://user:pass@tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/legacy.jpg','https://media.mavorealestate.com/private.jpg'])assert.throws(()=>validateProjection({...row(),photos:[url]}));
});
test('explicit manifest requires cover, stable unique ids, exact property paths and video fallbacks',()=>{
 const url='https://media.mavorealestate.com/property-123/revision-1/01-'+'a'.repeat(64)+'.webp';
 const manifest={version:1,cover_media_id:'A',items:[{id:'A',type:'image',url}]};assert.equal(validateProjection({...row(),photos:[url],media_manifest:manifest}).media_manifest.cover_media_id,'A');
 for(const m of [{...manifest,cover_media_id:'missing'},{...manifest,items:[]},{...manifest,items:[manifest.items[0],manifest.items[0]]},{...manifest,items:[{...manifest.items[0],url:url.replace('property-123','property-12')}]},{...manifest,items:[{id:'A',type:'video',url:url.replace('webp','mp4')}]}])assert.throws(()=>validateProjection({...row(),media_manifest:m}));
});
test('stable media identities retain colon identifiers from existing contract',()=>{
 const url='https://media.mavorealestate.com/property-123/revision-1/01-'+'a'.repeat(64)+'.webp';
 const manifest={version:1,cover_media_id:'source:123',items:[{id:'source:123',type:'image',url}]};
 assert.equal(validateProjection({...row(),photos:[url],media_manifest:manifest}).media_manifest.cover_media_id,'source:123');
 assert.throws(()=>validateProjection({...row(),media_manifest:{...manifest,cover_media_id:'x'.repeat(129),items:[{id:'x'.repeat(129),type:'image',url}]}}));
});
test('existing optional image poster and fallback survive without changing media identity',()=>{
 const url='https://media.mavorealestate.com/property-123/revision-1/01-'+'a'.repeat(64)+'.webp';
 const manifest={version:1,cover_media_id:'source:123',items:[{id:'source:123',type:'image',url,poster_url:url,fallback_url:url}]};
 assert.deepEqual(validateProjection({...row(),media_manifest:manifest}).media_manifest,manifest);
 assert.throws(()=>validateProjection({...row(),media_manifest:{...manifest,items:[{...manifest.items[0],fallback_url:url.replace('property-123','property-124')}]}}));
});
test('browser-origin writes, signature tamper and stale signatures deny',async()=>{
 const {env}=setup();assert.equal((await write(env,envelope(),{Origin:'https://mavorealestate.com'})).status,403);
 assert.equal((await write(env,envelope(),{'x-mavo-signature':'0'.repeat(64)})).status,403);assert.equal((await write(env,envelope(),{'x-mavo-time':'1'})).status,403);
});
test('private namespaces/arbitrary queries deny and unavailable DB returns honest 503',async()=>{
 const {env}=setup();for(const path of ['/rest/v1/properties','/api/customers','/office/crm','/auth/v1/users','/api/properties?select=*'])assert.ok((await worker.fetch(new Request('https://synthetic.invalid'+path),env)).status>=400);
 assert.equal((await worker.fetch(new Request('https://synthetic.invalid/api/properties'),{})).status,503);
});
test('CORS never opens a private read or permits unknown origins',async()=>{
 const {env}=setup();const r=await worker.fetch(new Request('https://synthetic.invalid/api/properties',{headers:{Origin:'https://evil.invalid'}}),env);assert.equal(r.headers.get('access-control-allow-origin'),null);
});
test('identity schema and active constraints reject direct bad writes',()=>{
 const {sql}=setup();assert.throws(()=>sql.prepare('INSERT INTO catalog(id,office_property_id,revision,dispatch_id,payload_hash,active,payload) VALUES(?,?,?,?,?,?,?)').run(0,'x',1,'d','a'.repeat(64),1,JSON.stringify(row(0))));
});
