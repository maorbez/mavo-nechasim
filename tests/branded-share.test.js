const test=require('node:test');const assert=require('node:assert/strict');
const {tokenFromHash,safeImages,leaseMs}=require('../branded-share');
test('capabilities are exact nonenumerable tokens; query URLs are never accepted',()=>{
 assert.equal(tokenFromHash('#'+'a'.repeat(32)),'a'.repeat(32));
 for(const x of ['#123','#https://evil.test','#'+'a'.repeat(33),'#'+'a'.repeat(31)+'%','#a?share=1'])assert.equal(tokenFromHash(x),'');
});
test('remote media has a strict origin and no credentials or path traversal',()=>{
 const media='https://forms.mavorealestate.com/public/branded-shares/'+'a'.repeat(32)+'/media/'+'b'.repeat(64);
 assert.deepEqual(safeImages([media,'https://img.yad2.co.il/fixture.jpg','javascript:alert(1)','https://forms.mavorealestate.com/office/crm',media+'?url=x',media.replace('forms.','evil.'),media.replace('/media/','/media/../'),media.replace('https://','http://')]),[media]);
});
test('client display lease cannot exceed source expiry or one minute, including transport delay',()=>{
 const data={verified_at:'2026-10-07T12:00:00Z',expires_at:'2026-10-07T12:02:00Z'};
 assert.equal(leaseMs(data,5000),55000);
 assert.equal(leaseMs({...data,expires_at:'2026-10-07T12:00:10Z'},3000),7000);
 assert.equal(leaseMs({...data,expires_at:'invalid'},0),0);
 assert.equal(leaseMs(data,61000),0);
});

test('property detail text preserves zero floor, false amenities and unknown fields',()=>{
 const {propertyFacts,propertySummary}=require('../branded-share');
 const row={property_type:'דירה',neighborhood:'לב העיר',city:'תל אביב',rooms:2,size:72,floor:0,total_floors:3,condition:'משופץ',parking:false,shelter:true};
 assert.ok(propertyFacts(row).some(([name,value])=>name==='קומה'&&value==='קרקע מתוך 3'));
 assert.ok(propertyFacts(row).some(([name,value])=>name==='חניה'&&value==='אין'));
 assert.ok(!propertyFacts(row).some(([name])=>name==='מעלית'));
 assert.match(propertySummary(row),/2 חדרים/);assert.match(propertySummary(row),/72 מ״ר/);assert.match(propertySummary(row),/משופץ/);
 assert.ok(!propertySummary({}).includes('undefined'));
});

test('media notices distinguish connection limits from photos not supplied',()=>{
 const {mediaNotice}=require('../branded-share');
 assert.match(mediaNotice({media_status:'unavailable',unavailable_image_count:6}),/אינן זמינות.*בחיבור.*למקור/);
 assert.match(mediaNotice({media_status:'partial',unavailable_image_count:3}),/3 תמונות נוספות/);
 assert.match(mediaNotice({media_status:'partial',unavailable_image_count:1}),/תמונה נוספת אחת/);
 for(const row of [{},{media_status:'available'},{media_status:'none'},{media_status:'<script>bad</script>'}])assert.equal(mediaNotice(row),'');
 for(const count of [0,-1,999,NaN,'<script>bad</script>']){
  const message=mediaNotice({media_status:'partial',unavailable_image_count:count});
  assert.match(message,/חלק מהתמונות/);assert.ok(!message.includes(String(count)));
 }
});

function shareRenderFixture(){
 const fs=require('node:fs'),vm=require('node:vm'),code=fs.readFileSync(require.resolve('../branded-share'),'utf8');
 const exported=require('../branded-share');
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.textContent=''}
  append(...children){this.children.push(...children)}
  replaceChildren(...children){this.children=children}
  setAttribute(name,value){this.attributes[name]=value}
 }
 const nodes={};const context=vm.createContext({...exported,
  $:selector=>nodes[selector]??=(new Element('div')),
  node:(tag,text,cls)=>Object.assign(new Element(tag),{textContent:text??'',className:cls??''}),
  photo:(url,alt)=>Object.assign(new Element('img'),{src:url,alt}),
  location:{href:'https://mavorealestate.com/share.html#'+'a'.repeat(32)},
  openGallery(){},openDetail(){},status(){},encodeURIComponent,
 });
 const noticeStart=code.indexOf('function appendMediaNotice(');
 assert.ok(noticeStart>=0,'shared accessible notice renderer exists');
 vm.runInContext(code.slice(noticeStart,code.indexOf('function renderDetail(')),context);
 vm.runInContext(code.slice(code.indexOf('function renderDetail('),code.indexOf('async function openDetail(')),context);
 vm.runInContext(code.slice(code.indexOf('function render(data)'),code.indexOf('async function load(')),context);
 return {context,nodes,walk:node=>[node,...node.children.flatMap(child=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(child)})]};
}

test('cards and property detail show accessible partial/unavailable notices with the existing safe image',()=>{
 const media='https://forms.mavorealestate.com/public/branded-shares/'+'a'.repeat(32)+'/media/'+'b'.repeat(64);
 for(const status of ['partial','unavailable']){
  const {context,nodes,walk}=shareRenderFixture(),row={city:'תל אביב',price:7000,media_status:status,unavailable_image_count:2,images:status==='partial'?[media]:[]};
  context.render({listings:[row]});context.renderDetail(row,false);
  for(const root of [nodes['#properties'],nodes['#detail-body']]){
   const all=walk(root),notice=all.find(n=>n.className==='media-notice');
   assert.ok(notice,status);assert.equal(notice.attributes.role,'status');assert.equal(notice.attributes['aria-live'],'polite');
   assert.match(notice.textContent,/בחיבור.*למקור/);
   assert.equal(all.filter(n=>n.tagName==='img').length,status==='partial'?1:0);
   assert.ok(!all.some(n=>n.textContent==='לא נמסרו תמונות'));
  }
 }
});

test('legacy/no-media cards keep their existing message without a false connection warning',()=>{
 for(const status of [undefined,'none','available']){
  const {context,nodes,walk}=shareRenderFixture(),row={media_status:status,images:[]};
  context.render({listings:[row]});context.renderDetail(row,false);
  assert.ok(walk(nodes['#properties']).some(n=>n.textContent==='לא נמסרו תמונות'));
  assert.ok(!walk(nodes['#properties']).some(n=>n.className==='media-notice'));
  assert.ok(!walk(nodes['#detail-body']).some(n=>n.className==='media-notice'));
 }
});

test('a refreshed empty gallery clears the stale counter and returns to the current detail notice',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),code=fs.readFileSync(require.resolve('../branded-share'),'utf8');
 const nodes={'#gallery-image':{replaceChildren(){this.cleared=true}},'#image-position':{textContent:'1 / 3'},'#gallery':{open:true,close(){this.open=false}}};
 const context=vm.createContext({$:selector=>nodes[selector],galleryPhotos:[],galleryIndex:0});
 vm.runInContext(code.slice(code.indexOf('function showPhoto('),code.indexOf('function openGallery(')),context);
 context.showPhoto();assert.equal(nodes['#gallery-image'].cleared,true);assert.equal(nodes['#image-position'].textContent,'');assert.equal(nodes['#gallery'].open,false);
});
