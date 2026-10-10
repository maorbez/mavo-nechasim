'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const media=require('../public-media'),catalog=require('../catalog');
const base='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/test/';
const property={id:64,title:'נכס לבדיקה',location:'תל אביב, פלורנטין',priceLabel:'₪ 5,000',rooms:2,photos:['https://legacy.example/video.mp4'],media_manifest:{version:1,cover_media_id:'video',items:[{id:'photo',type:'image',url:base+'photo.jpg'},{id:'video',type:'video',url:base+'video.mp4',poster_url:base+'poster.jpg',fallback_url:base+'fallback.jpg'}]}};
function documentFixture(){
 const document={defaultView:{MavoPhoto:{setSource(image,url){image.src=url;},setBackground(element,url){element.style.backgroundImage='url("blob:protected-'+url+'")';},setPoster(video,url){video.poster=url;}}},baseURI:'https://mavorealestate.com/',createElement(tag){return {tagName:tag.toUpperCase(),ownerDocument:document,children:[],style:{},events:{},appendChild(node){this.children.push(node);node.parent=this;return node;},append(...nodes){nodes.forEach(n=>this.appendChild(n));},contains(node){return this.children.includes(node);},remove(){this.parent.children=this.parent.children.filter(n=>n!==this);},addEventListener(type,handler){this.events[type]=handler;}};}};
 return document;
}
function descendants(node){return [node,...(node.children||[]).flatMap(descendants)];}
test('the real map preview loads a still for an explicit video cover without loading legacy or video sources',()=>{
 const code=fs.readFileSync(require.resolve('../map-base.js'),'utf8'),document=documentFixture(),context=vm.createContext({window:{MavoMedia:media},document,MavoCatalog:catalog,URL});
 vm.runInContext(code.slice(code.indexOf('window.createMavoMapPreview ='),code.indexOf('window.addMavoBasemap =')),context);
 const preview=context.window.createMavoMapPreview(property),nodes=descendants(preview);
 assert.equal(nodes.some(n=>['VIDEO','IFRAME'].includes(n.tagName)),false);
 const img=nodes.find(n=>n.tagName==='IMG');assert.equal(img.src,base+'poster.jpg');img.events.error();assert.equal(img.src,base+'fallback.jpg');
 const empty=context.window.createMavoMapPreview({...property,media_manifest:{version:1,cover_media_id:'',items:[]}});assert.equal(descendants(empty).some(n=>['IMG','VIDEO','IFRAME'].includes(n.tagName)),false);
});
test('legacy map photos and video fallback images use branded display bytes',()=>{
 const code=fs.readFileSync(require.resolve('../map-base.js'),'utf8'),document=documentFixture();
 document.defaultView.MavoPhoto.setSource=(image,url)=>{image.src='blob:protected-'+url;};
 const context=vm.createContext({window:{MavoMedia:media,MavoPhoto:document.defaultView.MavoPhoto},document,MavoCatalog:catalog,URL});
 vm.runInContext(code.slice(code.indexOf('window.createMavoMapPreview ='),code.indexOf('window.addMavoBasemap =')),context);
 const plain=context.window.createMavoMapPreview({...property,media_manifest:null,photos:[base+'photo.jpg']});
 assert.equal(descendants(plain).find(n=>n.tagName==='IMG').src,'blob:protected-'+base+'photo.jpg');
 const video=context.window.createMavoMapPreview({...property,media_manifest:null,photos:[base+'video.mp4',base+'photo.jpg']});
 descendants(video).find(n=>n.tagName==='VIDEO').onerror();
 assert.equal(descendants(video).find(n=>n.tagName==='IMG').src,'blob:protected-'+base+'photo.jpg');
});
test('branded share photo creation uses the shared renderer while retaining lazy loading and safe alt text',()=>{
 const code=fs.readFileSync(require.resolve('../branded-share.js'),'utf8'),document=documentFixture();
 const context=vm.createContext({node:tag=>document.createElement(tag),MavoPhoto:{setSource(image,url){image.src='blob:protected-'+url;}}});
 vm.runInContext(code.slice(code.indexOf('function photo(url'),code.indexOf('function showPhoto')),context);
 const img=context.photo(base+'photo.jpg','safe alt');assert.equal(img.src,'blob:protected-'+base+'photo.jpg');assert.equal(img.alt,'safe alt');assert.equal(img.loading,'lazy');
});
test('the real property WhatsApp action uses the public preview only for explicit manifests and never adds hidden coordinates',()=>{
 const code=fs.readFileSync(require.resolve('../app.js'),'utf8'),context=vm.createContext({MavoMedia:media,MavoCatalog:catalog,WA_NUMBER:'972548026123',SITE_URL:'https://mavorealestate.com/',hasDisplayValue:value=>value!=null&&value!==''});
 vm.runInContext(code.slice(code.indexOf('function waLink'),code.indexOf('// ---- Load properties')),context);
 const explicit=context.waLink({...property,publicLocationMode:'approximate',lat:32.1,lng:34.8}),text=new URL(explicit).searchParams.get('text');
 assert.ok(text.includes('https://forms.mavorealestate.com/public/property-preview/64'));assert.ok(!text.includes('waze.com'));assert.ok(!text.includes('32.1'));
 const legacy=new URL(context.waLink({...property,media_manifest:null})).searchParams.get('text');assert.ok(legacy.includes('https://mavorealestate.com/?prop=64'));assert.ok(!legacy.includes('property-preview'));
});
test('closing the property modal stops playing native media',()=>{
 let paused=0;const code=fs.readFileSync(require.resolve('../app.js'),'utf8'),context=vm.createContext({document:{getElementById:()=>({classList:{remove(){}}}),body:{style:{}},querySelectorAll:()=>[{pause(){paused++;}}]}});
 vm.runInContext(code.slice(code.indexOf('function closeModalBtn'),code.indexOf('async function submitModalForm')),context);context.closeModalBtn();assert.equal(paused,1);
});
