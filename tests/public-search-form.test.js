const test=require('node:test');const assert=require('node:assert/strict');const {phoneValid,parseBudget,safeGroups}=require('../looking');
test('budget boundaries preserve the exact shekel amount',()=>{for(const n of [4999,5000,5001])assert.equal(parseBudget(n.toLocaleString('en-US')),n);assert.equal(parseBudget(''),null);assert.throws(()=>parseBudget('-5000'));assert.throws(()=>parseBudget('5e3'));assert.throws(()=>parseBudget('5,00'));});
test('phone validation accepts Israeli local/international formatting',()=>{for(const p of ['050-123-4567','+972501234567','972501234567'])assert.ok(phoneValid(p));for(const p of ['123','050123456','example'])assert.equal(phoneValid(p),false);});
test('group rendering only accepts bounded WhatsApp invites',()=>{assert.equal(safeGroups([{name:'Verified',url:'https://chat.whatsapp.com/HHDiSVJMrVB6XnvGcJaxm1'},{name:'bad',url:'javascript:alert(1)'},{name:'bad',url:'https://chat.whatsapp.com.evil.test/HHDiSVJMrVB6XnvGcJaxm1'}]).length,1);});
const {updatesLink}=require('../looking');
test('updates handoff uses verified bot number and fixed command without applicant details',()=>{
 const url=new URL(updatesLink({requested:true,routing:'active_search'}));
 assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/972535487714');
 assert.deepEqual([...url.searchParams],[['text','עדכוני נכסים']]);
 assert.equal(updatesLink({requested:false,routing:'active_search'}),'');
 assert.equal(updatesLink({requested:true,routing:'lead_only'}),'');
 assert.equal(updatesLink({requested:'true',routing:'active_search'}),'');
 assert.equal(updatesLink({requested:true,routing:'unknown'}),'');
});

test('public form sends only to the branded write-only intake, without an Office origin or credential',()=>{
 const fs=require('node:fs');const source=fs.readFileSync(require.resolve('../looking.js'),'utf8');
 assert.ok(source.includes('https://forms.mavorealestate.com/public/search-requests'));
 assert.equal(source.includes('up.railway.app'),false);
 assert.ok(source.includes("credentials:'omit'"));
});
const {buildSearch}=require('../looking');
test('compact criteria preserve exact budget, canonical regions and mandatory amenity wording',()=>{
 const geography={catalog_version:'2026-10-08',locations:[{city_id:'5000',whole_city:false,area_ids:['tlv:52']}],cities:['תל אביב-יפו'],areas:['פלורנטין']};
 const s=buildSearch({deal:'rent',category:'residential',budget:'6,500',cities:[],areas:[],geography,requirements:['parking','protected_space']});
 assert.equal(s.budget_max,6500);assert.deepEqual(s.cities,['תל אביב-יפו']);assert.deepEqual(s.areas,['פלורנטין']);assert.equal(s.property_type,'');assert.equal(s.rooms_min,null);assert.equal(s.move_in,'');
 assert.deepEqual(s.locations,[{city_id:'5000',whole_city:false,area_ids:['tlv:52']}]);assert.equal(s.catalog_version,'2026-10-08');
 assert.deepEqual(s.requirements,['parking','protected_space']);assert.equal(s.notes,'דרישות חובה: חניה, ממ״ד בדירה.');
});
test('removing a mapped neighborhood does not retain its inferred city or previous mandatory preferences',()=>{
 const s=buildSearch({deal:'buy',category:'commercial',budget:'1000000',cities:[],areas:[],geography:{catalog_version:'2026-10-08',locations:[{city_id:'6200',whole_city:true,area_ids:[]}],cities:['בת ים'],areas:[]},requirements:[]});
 assert.deepEqual(s.cities,['בת ים']);assert.deepEqual(s.areas,[]);assert.equal(s.notes,'');assert.deepEqual(s.requirements,[]);
});


test('real submission requires a canonical Office receipt and preserves exact budget with mocked transport',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require.resolve('../looking.js'),'utf8');
 const start=source.indexOf("  form.addEventListener('submit',async e=>{"),end=source.indexOf("  form.querySelectorAll('.next')",start);
 for(const budget of [4999,5000,5001])for(const reply of [{ok:true,saved:true,receipt:'test-receipt',routing:'active_search'},{ok:true,saved:false,receipt:'test-receipt',routing:'active_search'},{ok:true,saved:true,routing:'active_search'},{ok:true,saved:true,receipt:'test-receipt',routing:'unknown'}]) {
  let handler,successes=0,errors=0,requests=0;
  const body={searches:[buildSearch({deal:'rent',category:'residential',budget:String(budget),geography:{locations:[],cities:[],areas:[]},requirements:[]})]},controls=new Map();
  const context={form:{addEventListener:(_,fn)=>handler=fn,querySelectorAll:()=>[]},busy:false,step:1,INTAKE_READY:true,ENDPOINT:'https://forms.mavorealestate.com/public/search-requests',validate:()=>true,clearError(){},payload:()=>body,requestKey:async()=> 'fixed-test-key',$:id=>{if(!controls.has(id))controls.set(id,{});return controls.get(id);},success(){successes++;},showError(){errors++;},AbortController,setTimeout,clearTimeout,root:{fetch:async(url,init)=>{requests++;assert.equal(url,context.ENDPOINT);assert.equal(init.method,'POST');assert.equal(init.credentials,'omit');assert.equal(init.headers.Authorization,undefined);const sent=JSON.parse(init.body);assert.equal(sent.searches[0].budget_max,budget);assert.equal(sent.idempotency_key,'fixed-test-key');return {ok:true,json:async()=>reply};}}};
  vm.runInNewContext(source.slice(start,end),context);await handler({preventDefault(){}});
  assert.equal(requests,1);assert.equal(successes,reply.saved===true&&reply.receipt&&reply.routing==='active_search'?1:0);assert.equal(errors,successes?0:1);assert.equal(body.searches[0].budget_max,budget);
 }
});
