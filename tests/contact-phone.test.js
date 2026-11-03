const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
function setup(handlerName,phoneValue){
 const fields=new Map(),calls=[],office=[],toasts=[];
 const field=(name,value='')=>{const f={value,checked:true,validity:{},message:'',setCustomValidity(message){this.message=message;},reportValidity(){this.reported=true;return !this.message;},focus(){this.focused=true;},addEventListener(){}};fields.set(name,f);return f;};
 field('name','בדיקה מקומית');const phone=field('phone',phoneValue);field('email');field('message');field('interest');field('subject');field('marketingConsent');field('_honey');
 const button={textContent:'שליחה',disabled:false};
 const form={querySelector(selector){if(selector==='button[type="submit"]')return button;return fields.get(selector.match(/name="([^"]+)"/)?.[1]);},reset(){this.resetCalled=true;}};
 const ctx={crypto:{randomUUID:()=>'00000000-0000-4000-8000-000000000000'},currentPropertyId:handlerName==='submitModalForm'?42:null,fetch:async(url,init)=>{(url.includes('formsubmit')?calls:office).push({url,payload:JSON.parse(init.body)});return {ok:true,json:async()=>({success:'true'})};},CONTACT_EMAIL:'isolated@example.invalid',document:{getElementById:()=>({textContent:'נכס בדיקה'})},showToast:m=>toasts.push(m),closeModalBtn(){}};
 const helperStart=source.indexOf('function contactPhoneError('),helperEnd=source.indexOf('async function submitModalForm(');
 if(helperStart>=0)vm.runInNewContext(source.slice(helperStart,helperEnd),ctx);
 const start=source.indexOf('async function '+handlerName+'('),end=source.indexOf('\n}\n',start)+3;
 vm.runInNewContext(source.slice(start,end),ctx);
 return {ctx,phone,button,form,calls,office,toasts,submit:()=>ctx[handlerName]({target:form,preventDefault(){}})};
}
for(const handler of ['submitForm','submitModalForm']){
 test(handler+' refuses missing, whitespace and malformed phones before sending or success',async()=>{
  for(const input of ['', '   ', '---', 'abc', '050', '050123456', '0501234567abc', '0000000000']){
   const f=setup(handler,input);await f.submit();assert.equal(f.calls.length,0,JSON.stringify(input)+' must never leave the browser');assert.equal(f.toasts.length,0);assert.ok(f.phone.message);assert.ok(f.phone.focused);assert.equal(f.button.disabled,false);assert.equal(f.form.resetCalled,undefined);
  }
 });
 test(handler+' retains valid local/mobile/international contact phones',async()=>{
  for(const input of ['050-123-4567','03-1234567','+972 50 123 4567','972501234567','+44 20 7946 0958']){
   const f=setup(handler,input);await f.submit();assert.equal(f.calls.length,1);assert.equal(f.calls[0].payload.phone,input.trim());assert.equal(f.phone.message,'');
   assert.equal(f.office.length,1);assert.equal(f.office[0].payload.contact.phone,input.trim());
  }
 });
 test(handler+' saves the inquiry in Office and still succeeds when only one channel answers',async()=>{
  const f=setup(handler,'050-123-4567');await f.submit();
  const sent=f.office[0];assert.equal(sent.url,'https://forms.mavorealestate.com/public/contact-requests');
  assert.equal(sent.payload.source,'mavo_public_contact');assert.equal(sent.payload.inquiry.property_number,handler==='submitModalForm'?42:null);
  assert.deepEqual(sent.payload.consent,{privacy_version:'2026-10-02',privacy_accepted:true,contact:true});
  for(const down of ['office','email']){
   const g=setup(handler,'050-123-4567');g.ctx.fetch=async url=>{if((url.includes('formsubmit')?'email':'office')===down)throw new Error('down');return {ok:true,json:async()=>({success:'true'})};};
   await g.submit();assert.deepEqual(g.toasts,['הפנייה נשלחה! ניצור קשר בקרוב.']);
  }
  const h=setup(handler,'050-123-4567');h.ctx.fetch=async()=>({ok:false});await h.submit();assert.deepEqual(h.toasts,['שגיאה בשליחה — נסה שוב.']);
  const inactive=setup(handler,'050-123-4567');inactive.ctx.fetch=async url=>url.includes('formsubmit')?{ok:true,json:async()=>({success:'false',message:'This form needs Activation'})}:{ok:false};
  await inactive.submit();assert.deepEqual(inactive.toasts,['שגיאה בשליחה — נסה שוב.'],'an unactivated email form is not a delivered lead');
 });
 test(handler+' permits correcting an invalid phone without losing other fields',async()=>{
  const f=setup(handler,'abc');await f.submit();f.phone.value='050-123-4567';await f.submit();assert.equal(f.calls.length,1);assert.equal(f.calls[0].payload.name,'בדיקה מקומית');assert.equal(f.phone.message,'');
 });
}
test('search form also refuses absent and whitespace phones',()=>{
 const {phoneValid}=require('../looking.js');for(const input of ['',null,undefined,'   ','---','abc'])assert.equal(phoneValid(input),false);
});
test('phone validation follows dynamically inserted fields and clears errors on correction',()=>{
 const f=setup('submitForm','abc'),listeners={};
 assert.equal(typeof f.ctx.setupContactPhoneValidation,'function');
 f.ctx.setupContactPhoneValidation({addEventListener(name,fn,capture){listeners[name]={fn,capture};}});
 f.phone.matches=selector=>selector==='input[name="phone"]';
 listeners.invalid.fn({target:f.phone});assert.ok(f.phone.message);assert.equal(listeners.invalid.capture,true);
 f.phone.value='050-123-4567';listeners.input.fn({target:f.phone});assert.equal(f.phone.message,'');
});
