const test=require('node:test'),assert=require('node:assert/strict');
let create;try{({create}=require('../property-status.js'));}catch{}
const ok=body=>({ok:true,status:200,json:async()=>body});
const fresh={degraded:false,properties:[]};
test('only a verified minimal terminal response may display rented or sold',async()=>{
 assert.equal(typeof create,'function');
 for(const status of ['rented','sold']){
  const shown=[],calls=[];const c=create({onChange:v=>shown.push(v),fetchImpl:async(...args)=>{calls.push(args);return ok({id:88,status});}});
  await c.update(88,fresh);assert.deepEqual(shown.at(-1),{state:'terminal',id:88,status});
  assert.equal(calls[0][1].credentials,'omit');assert.equal(calls[0][1].cache,'no-store');c.stop();
 }
});
test('active rows and a failed catalog never request or retain a terminal label',async()=>{
 let calls=0;const shown=[];const c=create({onChange:v=>shown.push(v),fetchImpl:async()=>{calls++;return ok({id:88,status:'rented'});}});
 await c.update(88,{...fresh,properties:[{id:88}]});await c.update(88,{degraded:true,properties:[]});assert.equal(calls,0);assert.equal(shown.at(-1),null);c.stop();
});
test('private fields, wrong identity, invalid status and failed fetch never become a terminal claim',async()=>{
 for(const response of [ok({id:88,status:'rented',address:'private'}),ok({id:89,status:'sold'}),ok({id:88,status:'archived'}),{ok:false,status:500},{ok:false,status:404}]){
  const shown=[];const c=create({onChange:v=>shown.push(v),fetchImpl:async()=>response});await c.update(88,fresh);assert.notEqual(shown.at(-1)?.state,'terminal');c.stop();
 }
});
test('an old response cannot revive a status after active/hidden catalog or dismissal',async()=>{
 let resolve;const shown=[];const c=create({onChange:v=>shown.push(v),fetchImpl:()=>new Promise(r=>resolve=r)});
 const pending=c.update(88,fresh);await c.update(88,{...fresh,properties:[{id:88}]});resolve(ok({id:88,status:'sold'}));await pending;assert.equal(shown.at(-1),null);c.stop();
});
test('the home page loads the status check after the catalog session exists',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
 const db=html.indexOf('src="db.js'),status=html.indexOf('src="property-status.js');
 assert.ok(db>0&&status>db);assert.ok(html.includes('href="property-status.css'));
});
