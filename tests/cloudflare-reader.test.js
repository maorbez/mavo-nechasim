'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const db = require('../db');
const media = require('../public-media');
const hash = 'a'.repeat(64);
const asset = (index, ext = 'webp') => `https://media.mavorealestate.com/property-64/revision-1/${index}-${hash}.${ext}`;
function row(overrides = {}) {
  return {id:64,type:'rent',price:'5000',price_label:'5000 לחודש',title:'נכס ציבורי',location:'תל אביב | פלורנטין',rooms:2,baths:1,sqm:60,extra:'מיקום משוער',description:'מרפסת בשטח 8 מ״ר',emoji:'',bg:'',lat:null,lng:null,photos:[asset('00')],has_elevator:false,has_shelter:true,has_parking:false,active:true,media_manifest:null,...overrides};
}
const response = data => ({ok:true,json:async()=>data});
test('production catalog uses keyless same-origin Cloudflare API with active Office identities', async () => {
  let request;
  const result = await db.loadMavoProperties({renderStatus:false,fetchImpl:async(url,init)=>{request={url,init};return response([row()]);}});
  assert.equal(request.url,'/api/properties');
  assert.equal(request.init.cache,'no-store');
  assert.equal(request.init.credentials,'omit');
  assert.equal(request.init.redirect,'error');
  assert.equal(request.init.headers.Authorization,undefined);
  assert.equal(request.init.headers.apikey,undefined);
  assert.equal(result.source,'cloudflare');
  assert.equal(result.degraded,false);
  assert.equal(result.properties[0].id,64);
});
test('API origin is configurable HTTPS origin only; unsafe config fails before network access', async () => {
  let calls=0;
  await db.fetchPropertiesFromDB({apiOrigin:'https://catalog.example.test/',fetchImpl:async(url)=>{calls++;assert.equal(url,'https://catalog.example.test/api/properties');return response([]);}});
  for(const apiOrigin of ['http://catalog.example.test','//evil.test','https://u:p@evil.test','https://evil.test/office','https://evil.test?key=x','https://evil.test#x','https://evil.test/../',' https://evil.test']) {
    await assert.rejects(db.fetchPropertiesFromDB({apiOrigin,fetchImpl:async()=>{calls++;return response([]);}}));
  }
  assert.equal(calls,1);
});
test('browser reads provider and origin config without overwriting them or creating Supabase globals', async () => {
  const window={MavoMedia:media,MAVO_CATALOG_API_ORIGIN:'https://catalog.example.test',fetch:async(url)=>{assert.equal(url,'https://catalog.example.test/api/properties');return response([]);}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../db'),'utf8'),{window,URL,AbortController,setTimeout,clearTimeout});
  const result=await window.loadMavoProperties({renderStatus:false});
  assert.equal(result.source,'cloudflare');assert.equal(window.SUPABASE_KEY,undefined);assert.equal(window.SUPABASE_URL,undefined);
});
test('legitimate nullable public metadata preserves exact source nulls and established display defaults', async () => {
  const source=row({price_label:null,emoji:null,bg:null,has_elevator:null,has_shelter:null,has_parking:null});
  const result=await db.loadMavoProperties({renderStatus:false,fetchImpl:async()=>response([source])});
  assert.equal(result.source,'cloudflare');assert.equal(result.degraded,false);
  const property=result.properties[0];
  assert.equal(property.priceLabel,'₪ 5,000 / חודש');assert.equal(property.emoji,'🏠');
  assert.equal(property.bg,'linear-gradient(135deg,#1a3a5c,#2d6a9f)');
  assert.equal(property.hasElevator,false);assert.equal(property.hasShelter,false);assert.equal(property.hasParking,false);
  assert.deepEqual(db.validatePublicProjection(source),source);
  const known=db.mapDbRow(row());assert.equal(known.hasElevator,false);assert.equal(known.hasShelter,true);assert.equal(known.hasParking,false);
  for(const overrides of [{active:null},{price:null},{title:null},{location:null},{extra:null},{description:null},{price_label:0},{emoji:0},{bg:0},{has_elevator:'unknown'}]) {
    const invalid=await db.loadMavoProperties({renderStatus:false,fetchImpl:async()=>response([row(overrides)])});
    assert.equal(invalid.source,'unavailable');assert.deepEqual(invalid.properties,[]);
  }
});

test('malformed, private, inactive, duplicate, excessive and invalid media responses fail closed with no stale fallback', async () => {
  const cases=[{},[row({customer_phone:'private'})],[row({id:'64'})],[row({id:0})],[row({active:false})],[row({lat:32})],[row({photos:['https://forms.mavorealestate.com/office/private.jpg']})],[row({has_parking:'yes'})],[row({type:'private'})],[row({sqm:-1})],[row({title:null})],[row({media_manifest:{version:1,cover_media_id:'x',items:[{id:'x',type:'image',url:asset('00'),private_path:'/office/private'}]}})],[row({media_manifest:{version:1,cover_media_id:'v',items:[{id:'v',type:'video',url:asset('00','mp4')}]}})],[row(),row()],Array.from({length:1001},(_,i)=>row({id:i+1,photos:[]}))];
  for(const data of cases) {
    let calls=0;
    const result=await db.loadMavoProperties({renderStatus:false,fetchImpl:async()=>{calls++;return response(data);},fetchSnapshot:()=>{throw Error('must not load stale data');}});
    assert.equal(result.source,'unavailable',JSON.stringify(data).slice(0,120));assert.deepEqual(result.properties,[]);assert.equal(result.degraded,true);assert.equal(calls,1);
  }
});
test('new-provider manifest assets remain bound to the exact public number and immutable revision paths', async () => {
  for (const url of [asset('00').replace('/property-64/','/property-65/'),'https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/arbitrary.jpg']) {
    const result=await db.loadMavoProperties({renderStatus:false,fetchImpl:async()=>response([row({media_manifest:{version:1,cover_media_id:'image',items:[{id:'image',type:'image',url}]}})])});
    assert.equal(result.source,'unavailable');assert.deepEqual(result.properties,[]);
  }
});

test('transport, status and JSON errors never retry another provider; empty live result remains authoritative', async () => {
  for(const fetchImpl of [async()=>{throw Error('offline');},async()=>({ok:false,status:503}),async()=>({ok:true,json:async()=>{throw SyntaxError('invalid');}})]) {
    const result=await db.loadMavoProperties({fetchImpl,renderStatus:false});assert.equal(result.source,'unavailable');assert.deepEqual(result.properties,[]);
  }
  const result=await db.loadMavoProperties({fetchImpl:async()=>response([]),renderStatus:false});assert.equal(result.source,'cloudflare');assert.deepEqual(result.properties,[]);assert.equal(result.degraded,false);
});
test('explicit Supabase rollback is active-only and never selected by failure or URL alone', async () => {
  let request;
  const result=await db.loadMavoProperties({provider:'supabase',renderStatus:false,fetchImpl:async(url,init)=>{request={url,init};return response([row()]);}});
  assert.equal(result.source,'supabase');assert.match(request.url,/active=eq\.true&order=id\.asc$/);assert.ok(request.init.headers.apikey);
  await assert.rejects(db.fetchPropertiesFromDB({provider:'unknown',fetchImpl:async()=>{throw Error('should not fetch');}}));
  await db.fetchPropertiesFromDB({supabaseUrl:'https://ignored.example.test',fetchImpl:async(url)=>{assert.equal(url,'/api/properties');return response([]);}});
});
test('Cloudflare mapping preserves gallery order, independent image/video cover, fallback, safe card facts and public share URLs', async () => {
  const manifest={version:1,cover_media_id:'v',items:[{id:'b',type:'image',url:asset('00')},{id:'v',type:'video',url:asset('01','mp4'),poster_url:asset('02'),fallback_url:asset('00')},{id:'a',type:'image',url:asset('03')}]};
  const [property]=await db.fetchPropertiesFromDB({fetchImpl:async()=>response([row({media_manifest:manifest})])});
  const resolved=media.resolve(property);
  assert.equal(resolved.cover.id,'v');assert.deepEqual(resolved.items.map(i=>i.id),['b','v','a']);
  assert.deepEqual(media.imageCandidates(resolved),[asset('02'),asset('00'),asset('03')]);
  assert.equal(property.priceLabel,'₪ 5,000 לחודש');assert.equal(property.balconySqm,8);
  assert.equal(property.publicLocationMode,'approximate');assert.equal(property.lat,null);assert.equal(property.lng,null);
  assert.equal(media.shareUrl(property),'https://forms.mavorealestate.com/public/property-preview/64');
  assert.equal(media.shareUrl({...property,media_manifest:null}),'https://mavorealestate.com/?prop=64');
});
test('public site retires no-op lead backup and local admin authority while keeping write-only Office intake', () => {
  const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
  assert.doesNotMatch(app,/saveLeadToDB|\/rest\/v1\/leads/);
  const admin=fs.readFileSync(require.resolve('../admin.html'),'utf8');
  assert.match(admin,/https:\/\/mavo-office-production\.up\.railway\.app\/office\/crm/);
  assert.doesNotMatch(admin,/localStorage|sessionStorage|signInWithPassword|PASSWORD|function save/);
  const looking=fs.readFileSync(require.resolve('../looking.js'),'utf8');
  assert.match(looking,/https:\/\/forms\.mavorealestate\.com\/public\/search-requests/);
  assert.match(looking,/data\.saved!==true/);
});
