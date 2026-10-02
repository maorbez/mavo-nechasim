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
