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
