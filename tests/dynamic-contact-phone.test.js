'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require.resolve('../app.js'),'utf8');

// Exercise the real renderer and submission handler. Only DOM primitives and the
// external FormSubmit request are replaced; no browser or real lead is involved.
function setup(){
 const listeners={},requests=[],toasts=[];
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.value='';this.checked=false;this.message='';this.events={};}
  set onsubmit(value){this._submit=typeof value==='function'?value:null;}
  get onsubmit(){return this._submit||null;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  appendChild(child){this.children.push(child);return child;}
  insertBefore(child,before){this.children.splice(this.children.indexOf(before),0,child);}
  removeChild(child){this.children.splice(this.children.indexOf(child),1);}
  get firstChild(){return this.children[0]||null;}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  matches(selector){const match=selector.match(/^(\w+)?\[(\w+)="([^"]+)"\]$/);return !!match&&(!match[1]||this.tagName===match[1].toUpperCase())&&this.getAttribute(match[2])===match[3];}
  querySelector(selector){return this.all().find(node=>node.matches(selector))||null;}
  querySelectorAll(selector){return this.all().filter(node=>node.matches(selector));}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  setCustomValidity(message){this.message=message;}
  reportValidity(){this.reported=true;return !this.message;}
  focus(){this.focused=true;}
  reset(){this.resetCalled=true;}
  fire(name){const event={target:this};for(const fn of [...(this.events[name]||[]),...(listeners[name]||[])])fn(event);}
 }
 const root=new Element('section');
 const document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),createTextNode:text=>{const n=new Element('#text');n.textContent=text;return n;},getElementById:()=>root,querySelectorAll:selector=>root.querySelectorAll(selector),addEventListener(name,fn){(listeners[name]??=[]).push(fn);}};
 const context={document,CONTACT_EMAIL:'isolated@example.invalid',showToast:message=>toasts.push(message),fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:true};}};
 context.window=context;vm.createContext(context);
 vm.runInContext(app.slice(app.indexOf('function contactPhoneError('),app.indexOf('async function submitModalForm(')),context);
 const start=app.indexOf('async function submitForm('),end=app.indexOf('\n}\n',start)+3;
 vm.runInContext(app.slice(start,end),context);
 const modalStart=app.indexOf('async function submitModalForm('),modalEnd=app.indexOf('\n}\n',modalStart)+3;
 vm.runInContext(app.slice(modalEnd,app.indexOf("document.addEventListener('keydown'",modalEnd)),context);
 // Render after app.js installs its handlers, exactly as neighborhood pages do.
 vm.runInContext(fs.readFileSync(require.resolve('../components.js'),'utf8'),context);
 context.GlobesComponents.renderContact('contact-root',{subjects:['השכרה']});
 const form=root.all().find(node=>node.tagName==='FORM');
 const field=name=>form.querySelector('[name="'+name+'"]');
 const submit=async()=>{const event={target:form,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};assert.equal(typeof form.onsubmit,'function','dynamic form must install a function, not an event-handler string');await form.onsubmit(event);assert.equal(event.defaultPrevented,true);};
 return {form,field,submit,requests,toasts};
}

test('rendered neighborhood contact form has named accessible phone and submits its full payload',async()=>{
 const f=setup();
 for(const name of ['name','phone','email','subject','message','marketingConsent'])assert.ok(f.field(name),'missing named field '+name);
 const phone=f.field('phone');
 for(const [name,value] of Object.entries({type:'tel','aria-label':'טלפון (חובה)','aria-required':'true',inputmode:'tel',autocomplete:'tel',dir:'ltr',maxlength:'32'}))assert.equal(phone.getAttribute(name),value);
 assert.equal(phone.getAttribute('required'),'true');
 assert.equal(f.field('marketingConsent').checked,false,'marketing remains optional and unchecked');
 f.field('name').value='בדיקה מקומית';phone.value='050-123-4567';f.field('subject').value='השכרה';f.field('message').value='בדיקה מבודדת';
 await f.submit();
 assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'https://formsubmit.co/ajax/isolated@example.invalid');
 assert.deepEqual(f.requests[0].body,{_subject:'פנייה חדשה מאתר מבוא נכסים',name:'בדיקה מקומית',phone:'050-123-4567',email:'לא צוין',subject:'השכרה',message:'בדיקה מבודדת',marketing_consent:'לא'});
});

test('a dynamically rendered phone refuses bad input and clears custom validity when corrected',async()=>{
 const f=setup();assert.ok(f.field('phone'),'dynamic form needs its named phone');
 f.field('name').value='בדיקה מקומית';f.field('subject').value='השכרה';const phone=f.field('phone');
 for(const value of ['', '   ', 'abc']){phone.value=value;await f.submit();assert.equal(f.requests.length,0);assert.ok(phone.message);assert.ok(phone.focused);assert.equal(f.toasts.length,0);}
 phone.value='050-123-4567';phone.fire('input');assert.equal(phone.message,'','typing must release native custom-error blocking before another submit');
 await f.submit();assert.equal(f.requests.length,1);assert.equal(f.requests[0].body.name,'בדיקה מקומית');
 phone.value='';phone.fire('invalid');assert.ok(phone.message,'native required failure gets the Hebrew required-phone explanation');
});
