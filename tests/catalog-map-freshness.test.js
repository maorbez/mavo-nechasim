'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const catalog=require('../catalog'),db=require('../db');
const regions=require('../assets/regions/neighborhood-catalog-2026-10-08.json');
const fs=require('node:fs'),vm=require('node:vm');
const property=(id,extra={})=>({id,type:'rent',location:'תל אביב, פלורנטין',lat:null,lng:null,publicLocationMode:'approximate',...extra});
function clock(){let time=0,id=0;const jobs=new Map();return {now:()=>time,setTimeout(fn,ms){jobs.set(++id,{fn,at:time+ms});return id;},clearTimeout(id){jobs.delete(id);},async advance(ms){time+=ms;for(const [id,j] of [...jobs])if(j.at<=time){jobs.delete(id);j.fn();}await new Promise(resolve=>setImmediate(resolve));}};}
const good=properties=>({properties,source:'cloudflare',degraded:false,error:null});

test('map representation preserves33 IDs with precise, neighborhood, canonical city and unknown groups',()=>{
 const rows=Array.from({length:33},(_,i)=>property(i+1,i<22?{publicLocationMode:'exact',lat:32+i/1000,lng:34.8}:i<27?{}:i<32?{location:'תל אביב, שכונה לא מוכרת'}:{location:'עיר לא מוכרת'}));
 const groups=catalog.mapGroups(rows,regions);
 assert.equal(groups.precise.length,22);assert.equal(groups.area.reduce((n,g)=>n+g.rows.length,0),10);assert.equal(groups.unlocated.length,1);
 assert.equal(groups.area.find(g=>g.kind==='neighborhood').rows.length,5);assert.equal(groups.area.find(g=>g.kind==='city').rows.length,5);
 assert.deepEqual([...groups.precise,...groups.area].flatMap(g=>g.rows).concat(groups.unlocated).map(p=>p.id).sort((a,b)=>a-b),rows.map(p=>p.id));
 assert.equal(rows[22].lat,null);assert.equal(catalog.navigationUrl(rows[22]),null);
});
test('general area uses authoritative labelPoint order, city-scoped aliases and never stale private coordinates',()=>{
 const p=property(1,{lat:1,lng:2}),position=catalog.mapPosition(p,regions),area=regions.areas.find(a=>a.name==='פלורנטין');
 assert.equal(position.kind,'neighborhood');assert.deepEqual(position.coordinates,[area.labelPoint[1],area.labelPoint[0]]);
 assert.equal(catalog.hasCoordinates(p),false);assert.equal(catalog.navigationUrl(p),null);
 assert.equal(catalog.mapPosition(property(2,{location:'תל אביב-יפו, נוה צדק'}),regions).kind,'neighborhood');
 assert.equal(catalog.mapPosition(property(3,{location:'עיר לא מוכרת, פלורנטין'}),regions).kind,'unlocated');
 const ambiguous=structuredClone(regions);ambiguous.cities.push({...ambiguous.cities[0],id:'duplicate-city'});
 assert.equal(catalog.mapPosition(p,ambiguous).kind,'unlocated');
 const invalid=structuredClone(regions);invalid.cities.find(c=>catalog.cityName(c.name)==='תל אביב').bbox=[0,0,0,0];invalid.areas=[];
 assert.equal(catalog.mapPosition(p,invalid).kind,'unlocated');
});
test('shared freshness replaces withdrawals and authoritative empty results; failures clear all previous data',async()=>{
 const timer=clock();let response=good([property(1),property(2)]),calls=0;
 const s=db.createCatalogSession({...timer,load:async()=>{calls++;if(response instanceof Error)throw response;return response;}});
 const cards=[],map=[];s.subscribe(v=>cards.push(v.properties.map(p=>p.id)));s.subscribe(v=>map.push(v.properties.map(p=>p.id)));
 await s.refresh();response=good([property(2)]);await timer.advance(45000);assert.deepEqual(cards.at(-1),[2]);assert.deepEqual(map.at(-1),[2]);
 response=good([]);await s.refresh();assert.deepEqual(cards.at(-1),[]);
 response=good([property(2)]);await s.refresh();response=new Error('offline');await s.refresh();assert.deepEqual(cards.at(-1),[]);assert.equal(s.current.degraded,true);assert.equal(calls,5);
});
test('pause clears display and ignores an older request; concurrent subscribers share one fresh load',async()=>{
 const timer=clock(),requests=[];const s=db.createCatalogSession({...timer,load:()=>new Promise(resolve=>requests.push(resolve))});
 const first=s.refresh();assert.equal(s.refresh(),first);assert.equal(requests.length,1);
 s.pause();const next=s.refresh();assert.equal(requests.length,2);requests[1](good([property(2)]));await next;
 requests[0](good([property(1)]));await first;assert.deepEqual(s.current.properties.map(p=>p.id),[2]);
 s.pause();assert.deepEqual(s.current.properties,[]);
});
test('display expires within60seconds during slow renewal, and a slow initial response cannot revive expired data',async()=>{
 const timer=clock();let resolve,initial=true;
 const s=db.createCatalogSession({...timer,load:()=>initial?(initial=false,Promise.resolve(good([property(1)]))):new Promise(r=>resolve=r)});
 await s.refresh();await timer.advance(45000);await timer.advance(15000);assert.deepEqual(s.current.properties,[]);
 resolve(good([property(2)]));await new Promise(r=>setImmediate(r));assert.deepEqual(s.current.properties.map(p=>p.id),[2]);
 const slowTimer=clock();let done;const slow=db.createCatalogSession({...slowTimer,load:()=>new Promise(r=>done=r)});const pending=slow.refresh();await slowTimer.advance(61000);done(good([property(3)]));await pending;assert.deepEqual(slow.current.properties,[]);
});
test('browser lifecycle shares one controller, clears hidden/offline and revalidates visible/online/BFCache',async()=>{
 const timer=clock(),events={},docEvents={},requests=[];
 const window={document:{hidden:false,addEventListener:(n,f)=>docEvents[n]=f,getElementById:()=>null},navigator:{onLine:true},addEventListener:(n,f)=>events[n]=f,MavoMedia:require('../public-media'),fetch:()=>new Promise(resolve=>requests.push(resolve))};
 const ctx=vm.createContext({window,URL,AbortController,setTimeout:timer.setTimeout,clearTimeout:timer.clearTimeout});vm.runInContext(fs.readFileSync(require.resolve('../db'),'utf8'),ctx);
 const s=window.getMavoCatalogSession();assert.equal(window.getMavoCatalogSession(),s);assert.equal(requests.length,1);
 window.document.hidden=true;docEvents.visibilitychange();requests[0]({ok:true,json:async()=>[]});await new Promise(r=>setImmediate(r));assert.equal(s.current.degraded,true);
 window.document.hidden=false;docEvents.visibilitychange();assert.equal(requests.length,2);requests[1]({ok:true,json:async()=>[]});await new Promise(r=>setImmediate(r));assert.equal(s.current.degraded,false);
 window.navigator.onLine=false;events.offline();const offlineRefresh=s.refresh();assert.equal(requests.length,2);await offlineRefresh;assert.equal(s.current.degraded,true);
 window.navigator.onLine=true;events.online();assert.equal(requests.length,3);events.pagehide();events.pageshow({persisted:true});assert.equal(requests.length,4);requests[3]({ok:true,json:async()=>[]});await new Promise(r=>setImmediate(r));assert.equal(s.current.degraded,false);s.pause();
});
test('main consumer removes withdrawn detail/media and uses current rows without resetting chosen filters',()=>{
 const source=fs.readFileSync(require.resolve('../app'),'utf8');const start=source.indexOf('function updatePublicCatalog(');assert(start>=0,'shared catalog consumer missing');
 const end=source.indexOf('\n// ============================',start),shown=[],closed=[];
 const ctx=vm.createContext({properties:[],currentPropertyId:1,publicDetailSignature:'old',map:{},catalogFilters:{type:'rent',city:'תל אביב',hood:'פלורנטין'},MavoCatalog:catalog,document:{body:{dataset:{}},getElementById:()=>null},renderPropertiesGrid:p=>shown.push(p.map(p=>p.id)),applyCatalogFilters:()=>{},buildNeighborhoodFilters:()=>{},renderMapCatalog:()=>{},closeModalBtn:()=>closed.push('detail'),closeLightbox:()=>closed.push('lightbox'),initPagination:()=>{}});
 vm.runInContext(source.slice(start,end),ctx);ctx.result=good([property(2)]);vm.runInContext('updatePublicCatalog(result)',ctx);
 assert.deepEqual(shown.at(-1),[2]);assert.deepEqual(closed.sort(),['detail','lightbox']);assert.equal(ctx.catalogFilters.type,'rent');assert.equal(ctx.catalogFilters.hood,'פלורנטין');
 ctx.result=good([]);vm.runInContext('updatePublicCatalog(result)',ctx);assert.deepEqual(shown.at(-1),[]);
});
function mapFixture(){
 const nodes=[];function node(tag='div'){const n={tagName:tag.toUpperCase(),style:{},dataset:{},children:[],textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},contains(c){return this.children.includes(c);},classList:{add(){},remove(){}},appendChild(c){this.children.push(c);c.parentElement=this;return c;},append(...xs){xs.forEach(c=>this.appendChild(c));},replaceChildren(...xs){this.children=[];this.append(...xs);},after(c){nodes.push(c);},addEventListener(){}};nodes.push(n);n.ownerDocument=document;return n;}
 const document={createElement:node,getElementById:id=>nodes.find(n=>n.id===id)||null};const map={handlers:{},on(event,fn){this.handlers[event]=fn;return this;},layers:new Set(),removed:[],getZoom:()=>14,addLayer(m){this.layers.add(m);return this;},removeLayer(m){this.removed.push(m);this.layers.delete(m);return this;},hasLayer(m){return this.layers.has(m);},setView(){return this;},fitBounds(){},invalidateSize(){},latLngToContainerPoint:([lat,lng])=>({x:lng*10000,y:lat*60000})};
 const marker=(coords,opts)=>({coords,opts,addTo(map){map.addLayer(this);return this;},handlers:{},on(event,fn){this.handlers[event]=fn;return this;},bindPopup(popup){this.popup=popup;return this;},bindTooltip(text,options){this.tooltip=text;this.tooltipOptions=options;return this;},getLatLng(){return this.coords;}});
 const L={marker,circleMarker:marker,divIcon:x=>x,map:()=>map,control:{zoom:()=>({addTo(){}})}};const handlers={};const window={document,L,addEventListener:(n,f)=>handlers[n]=f};document.defaultView=window;window.MavoPhoto={setSource(image,url){image.src=url;}};window.MavoMedia=require('../public-media');
 const ctx=vm.createContext({window,document,L,console,setTimeout:()=>{},addMavoBasemap(){},createMavoMapPreview(){},MavoCatalog:undefined});vm.runInContext(fs.readFileSync(require.resolve('../catalog'),'utf8'),ctx);ctx.MavoCatalog=window.MavoCatalog;
 return {ctx,map,node,nodes,document,window,handlers};
}
test('actual main map renders33 combined IDs/counts, applies filters to area rows and removes all stale layers',()=>{
 const f=mapFixture(),source=fs.readFileSync(require.resolve('../app'),'utf8');const holder=f.node(),count=f.node();count.id='mapCount';holder.appendChild(count);
 const rows=Array.from({length:33},(_,i)=>property(i+1,{rooms:3,...(i<22?{publicLocationMode:'exact',lat:32+i/1000,lng:34.8}:i<27?{}:{location:'תל אביב, לא מוכרת'})}));
 Object.assign(f.ctx,{properties:rows,map:f.map,markers:[],areaMarkers:[],mapRegions:regions,activeType:'all',openPropertyModal(){},esc:s=>s,typeColor:()=>({})});
 vm.runInContext(source.slice(source.indexOf('function renderMapCatalog'),source.indexOf('function setupMapAreas')),f.ctx);
 vm.runInContext(source.slice(source.indexOf('function applyMapFilters'),source.indexOf('function updateMapCount')),f.ctx);
 vm.runInContext('renderMapCatalog(properties)',f.ctx);assert.equal(count.textContent,33);assert.equal(f.map.layers.size,24);assert.match(f.document.getElementById('mapPlacementCount').textContent,/22 במיקום מדויק · 11 באזור כללי · 0/);
 const areas=[...f.map.layers].filter(m=>m.opts?.icon?.className?.includes('mavo-map-area-target'));
 assert.equal(areas.length,2);assert(areas.every(m=>m.tooltipOptions?.permanent!==true),'area details must not permanently obscure property pins');
 f.ctx.activeType='sale';vm.runInContext('applyMapFilters()',f.ctx);assert.equal(count.textContent,0);assert.equal(f.map.layers.size,0);
 f.ctx.activeType='all';f.ctx.properties=[];vm.runInContext('renderMapCatalog(properties)',f.ctx);assert.equal(count.textContent,0);assert.equal(f.map.layers.size,0);
});
test('refreshed map options include new areas while preserving a disappeared selection and no-results scope',()=>{
 const source=fs.readFileSync(require.resolve('../app'),'utf8'),ctx=vm.createContext({MavoCatalog:catalog,Option:function(text,value){this.text=text;this.value=value;}});
 vm.runInContext(source.slice(source.indexOf('function fillMapAreas'),source.indexOf('function setupMapAreas')),ctx);
 const select={value:'תל אביב|פלורנטין',options:[{text:'תל אביב · פלורנטין',value:'תל אביב|פלורנטין'}],replaceChildren(...rows){this.options=rows;},add(row){this.options.push(row);}};
 ctx.select=select;ctx.rows=[property(1,{location:'בת ים, מרכז'})];vm.runInContext('fillMapAreas(select,rows)',ctx);
 assert.equal(select.value,'תל אביב|פלורנטין');assert(select.options.some(o=>o.value==='בת ים|מרכז'));assert(select.options.some(o=>o.value==='תל אביב|פלורנטין'));
 assert.equal(catalog.inScope(ctx.rows[0],{city:'תל אביב',hood:'פלורנטין'}),false);
});
test('actual hood map shares refreshed state, preserves transaction filter and visibly lists unknown location',async()=>{
 const f=mapFixture();f.node().id='hoodMap';const count=f.node();count.id='hoodMapCount';
 let notify;
 const shared={current:good([property(1,{location:'תל אביב, פלורנטין'}),property(2,{location:'תל אביב, לא מוכרת'}),property(3,{location:'תל אביב, עיר לא מוכרת',type:'sale'}),property(4,{location:'עיר לא מוכרת'})]),subscribe(fn){notify=fn;fn(this.current);}};
 f.window.getMavoCatalogSession=()=>shared;f.ctx.MavoCatalog.loadMapRegions=async()=>regions;
 vm.runInContext(fs.readFileSync(require.resolve('../hood-map'),'utf8'),f.ctx);await f.window.initHoodMap({center:[32,34.8]});assert.match(count.textContent,/4 נכסים · 0 במיקום מדויק · 3 באזור כללי · 1 ללא מיקום/);assert.equal(f.nodes.find(n=>n.className==='map-unlocated').children.filter(n=>n.tagName==='A').length,1);
 f.handlers['mavo:catalog-filter']({detail:{type:'sale'}});assert.match(count.textContent,/1 נכסים/);
 shared.current=good([property(4,{location:'תל אביב, פלורנטין',type:'rent'})]);notify();assert.match(count.textContent,/אין כרגע/);assert.equal(f.map.layers.size,0);
 f.handlers['mavo:catalog-filter']({detail:{type:'all'}});assert.match(count.textContent,/1 נכסים/);shared.current=good([]);notify();assert.equal(f.map.layers.size,0);
});

// Regression: permanent region labels used to cover prices and leave no visual property choice.
test('approximate pins show a price or count without permanent boxes and open every current property',()=>{
 const f=mapFixture(),opened=[];
 const rows=[property(71,{title:'דירת בדיקה א',priceLabel:'₪ 7,500 / חודש',photos:['https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/test.webp']}),property(72,{title:'דירת בדיקה ב',priceLabel:'₪ 8,000 / חודש'})];
 const group={kind:'neighborhood',label:'תל אביב · פלורנטין',coordinates:[32.055,34.77],rows};
 const [marker]=f.window.MavoCatalog.renderGeneralAreas(f.map,[group],p=>opened.push(p.id));
 assert.notEqual(marker.tooltipOptions?.permanent,true,'area captions must be hover-only');
 assert.match(marker.opts.icon.className,/mavo-map-area-target/);
 assert.equal(marker.opts.icon.html.children.map(n=>n.textContent).join(''),'≈ 2 נכסים');assert.deepEqual(Array.from(marker.opts.icon.iconSize),[52,52]);
 assert.match(marker.opts.title,/משוער/);assert.match(marker.opts.title,/ללא כתובת מדויקת/);
 assert.deepEqual(marker.coords,[32.055,34.77]);
 const popup=typeof marker.popup==='function'?marker.popup():marker.popup;
 const list=popup.children.find(n=>n.className==='mavo-area-list');
 assert.equal(list.children.length,2);
 assert.deepEqual(list.children.map(n=>n.href),['index.html?prop=71','index.html?prop=72']);
 assert.equal(f.nodes.filter(n=>n.tagName==='IMG').length,1);
 assert.equal(f.nodes.filter(n=>n.tagName==='VIDEO'||n.tagName==='IFRAME').length,0);
 list.children[1].onclick({preventDefault(){}});assert.deepEqual(opened,[72]);
 const [single]=f.window.MavoCatalog.renderGeneralAreas(f.map,[{...group,rows:[rows[0]]}]);
 assert.equal(single.opts.icon.html.textContent,'≈ ₪ 7,500');assert.deepEqual(Array.from(single.opts.icon.iconSize),[110,44]);
 assert.equal(typeof single.tooltip,'function');
 const preview=single.tooltip();assert.match(preview.children[0].textContent,/משוער/);
});

test('main map clusters overlapping exact and approximate controls and separates them on zoom without reframing',()=>{
 const f=mapFixture(),source=fs.readFileSync(require.resolve('../app'),'utf8'),opened=[];
 const holder=f.node(),count=f.node();count.id='mapCount';holder.appendChild(count);
 let fits=0;
 const rows=[property(1,{publicLocationMode:'exact',lat:32.02,lng:34.8,title:'בדיקה א'}),property(2,{publicLocationMode:'exact',lat:32.06,lng:34.79,title:'בדיקה ב'}),property(3,{title:'בדיקה ג'})];
 Object.assign(f.ctx,{properties:rows,map:f.map,markers:[],areaMarkers:[],mapRegions:regions,activeType:'all',openPropertyModal:p=>opened.push(p.id),esc:s=>s,typeColor:()=>({}),setupMapAreas(){},fitSelectedMapRegions(){fits++;}});
 vm.runInContext(source.slice(source.indexOf('function initMap'),source.indexOf('function fillMapAreas')),f.ctx);
 vm.runInContext(source.slice(source.indexOf('function applyMapFilters'),source.indexOf('function updateMapCount')),f.ctx);
 f.map.latLngToContainerPoint=()=>({x:50,y:50});
 vm.runInContext('initMap(properties)',f.ctx);
 assert.equal(f.map.layers.size,1,'overlapping exact/general hitboxes need one selectable group');
 assert.equal(count.textContent,3);
 const marker=[...f.map.layers][0],popup=marker.popup(),list=popup.children.find(n=>n.className==='mavo-area-list');
 assert.deepEqual(Array.from(list.children,a=>a.href),['index.html?prop=1','index.html?prop=2','index.html?prop=3']);
 list.children[2].onclick({preventDefault(){}});assert.deepEqual(opened,[3]);
 f.map.latLngToContainerPoint=([lat,lng])=>({x:lng*1e5,y:lat*1e5});
 f.map.handlers.zoomend();assert.equal(f.map.layers.size,3);assert.equal(count.textContent,3);assert.equal(fits,1,'zoom clustering must not refit the user view');
 f.ctx.properties=[rows[2]];vm.runInContext('renderMapCatalog(properties)',f.ctx);assert.equal(f.map.layers.size,1);assert.equal(count.textContent,1);
 const current=[...f.map.layers][0];assert.deepEqual(Array.from(current._mavoRows,p=>p.id),[3]);assert.equal(fits,1);
});

test('neighborhood map clusters all public locations and zoom rebuild preserves filters and chosen bounds',async()=>{
 const f=mapFixture();f.node().id='hoodMap';f.node().id='hoodMapCount';let fits=0;
 f.map.fitBounds=()=>{fits++;};f.map.latLngToContainerPoint=()=>({x:50,y:50});
 const rows=[property(1,{publicLocationMode:'exact',lat:32.02,lng:34.8}),property(2,{publicLocationMode:'exact',lat:32.06,lng:34.79,type:'sale'}),property(3)];
 let notify;const shared={current:good(rows),subscribe(fn){notify=fn;fn();}};
 f.window.getMavoCatalogSession=()=>shared;f.ctx.MavoCatalog.loadMapRegions=async()=>regions;
 vm.runInContext(fs.readFileSync(require.resolve('../hood-map'),'utf8'),f.ctx);await f.window.initHoodMap({center:[32,34.8]});
 assert.equal(f.map.layers.size,1,'neighborhood maps must not retain overlapping exact/area controls');assert.equal(fits,1);
 f.handlers['mavo:catalog-filter']({detail:{type:'sale'}});assert.deepEqual(Array.from(f.map.layers).flatMap(m=>Array.from(m._mavoRows,p=>p.id)),[2]);
 f.map.latLngToContainerPoint=([lat,lng])=>({x:lng*1e5,y:lat*1e5});f.map.handlers.zoomend();assert.equal(f.map.layers.size,1);assert.equal(fits,1);
 f.handlers['mavo:catalog-filter']({detail:{type:'all'}});assert.equal(f.map.layers.size,3);assert.equal(fits,1);
 shared.current=good([]);notify();assert.equal(f.map.layers.size,0);
});

test('identical successful main catalog refresh preserves the open group layer while changes and expiry clear it',()=>{
 const f=mapFixture(),source=fs.readFileSync(require.resolve('../app'),'utf8');f.map.latLngToContainerPoint=()=>({x:50,y:50});
 const rows=[property(1,{title:'בדיקה א',priceLabel:'₪ 7,500',photos:[]}),property(2,{title:'בדיקה ב'})];
 Object.assign(f.ctx,{properties:rows,map:f.map,markers:[],areaMarkers:[],mapRegions:regions,activeType:'all',openPropertyModal(){}});
 vm.runInContext(source.slice(source.indexOf('function renderMapCatalog'),source.indexOf('function setupMapAreas')),f.ctx);
 vm.runInContext(source.slice(source.indexOf('function applyMapFilters'),source.indexOf('function updateMapCount')),f.ctx);
 vm.runInContext('renderMapCatalog(properties)',f.ctx);const original=[...f.map.layers][0];
 const popup=original.popup();assert.equal(popup.children.find(n=>n.className==='mavo-area-list').children.length,2);
 f.ctx.properties=structuredClone(rows);vm.runInContext('renderMapCatalog(properties)',f.ctx);
 assert.equal([...f.map.layers][0],original,'identical snapshot must preserve the exact Leaflet layer and its open popup');assert.equal(f.map.removed.length,0);
 f.ctx.properties[0].priceLabel='₪ 8,000';vm.runInContext('renderMapCatalog(properties)',f.ctx);let current=[...f.map.layers][0];assert.notEqual(current,original);
 f.ctx.properties[0].photos=['https://example.invalid/changed-public-image.webp'];vm.runInContext('renderMapCatalog(properties)',f.ctx);assert.notEqual([...f.map.layers][0],current);
 current=[...f.map.layers][0];f.map.getZoom=()=>15;vm.runInContext('applyMapFilters()',f.ctx);assert.notEqual([...f.map.layers][0],current);
 f.ctx.properties=[];vm.runInContext('renderMapCatalog(properties)',f.ctx);assert.equal(f.map.layers.size,0,'empty/expired display must still clear previous media');
});

test('identical neighborhood refresh preserves its popup, but withdrawal and filters replace visible groups',async()=>{
 const f=mapFixture();f.node().id='hoodMap';f.node().id='hoodMapCount';f.map.latLngToContainerPoint=()=>({x:50,y:50});
 const rows=[property(1),property(2,{type:'sale'})];let notify;const shared={current:good(rows),subscribe(fn){notify=fn;fn();}};
 f.window.getMavoCatalogSession=()=>shared;f.ctx.MavoCatalog.loadMapRegions=async()=>regions;
 vm.runInContext(fs.readFileSync(require.resolve('../hood-map'),'utf8'),f.ctx);await f.window.initHoodMap({center:[32,34.8]});
 const original=[...f.map.layers][0];original.popup();shared.current=good(structuredClone(rows));notify();
 assert.equal([...f.map.layers][0],original);assert.equal(f.map.removed.length,0);
 f.handlers['mavo:catalog-filter']({detail:{type:'sale'}});const selected=[...f.map.layers][0];assert.notEqual(selected,original);assert.deepEqual(Array.from(selected._mavoRows,p=>p.id),[2]);
 shared.current=good([rows[0]]);notify();assert.equal(f.map.layers.size,0);
});
