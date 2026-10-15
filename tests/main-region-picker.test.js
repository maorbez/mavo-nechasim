'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const catalog=require('../assets/regions/neighborhood-catalog-2026-10-08.json');
let api={};try{api=require('../region-search.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
const area=catalog.areas.find(a=>a.name==='פלורנטין');
const pick={locations:[{city_id:'5000',whole_city:false,area_ids:[area.id]},{city_id:'6200',whole_city:true,area_ids:[]}]};
function ready(){assert.equal(typeof api.matches,'function','canonical multiregion search must exist');}
test('multiple selected cities and neighborhoods are an OR selection, without broadening other neighborhoods',()=>{
 ready();assert.equal(api.matches({location:'תל אביב, פלורנטין'},pick,catalog),true);
 assert.equal(api.matches({location:'בת-ים, מרכז'},pick,catalog),true);
 assert.equal(api.matches({location:'תל אביב, בבלי'},pick,catalog),false);
 assert.equal(api.matches({location:'רמת גן, פלורנטין'},pick,catalog),false);
});
test('region links roundtrip stable IDs and retain requested neighborhoods with zero listings',()=>{
 ready();const params=new URLSearchParams();api.writeParams(params,pick);const value=api.readParams(params,catalog);
 assert.deepEqual(value.locations,pick.locations);assert.equal(api.matches({location:'תל אביב, בבלי'},value,catalog),false);
});
test('malformed, unknown and city-mismatched region URLs fail closed instead of showing every property',()=>{
 ready();for(const raw of ['bad','{}','[{"city_id":"missing","whole_city":true,"area_ids":[]}]',JSON.stringify([{city_id:'6200',whole_city:false,area_ids:[area.id]}])]){
 const value=api.readParams(new URLSearchParams({regions:raw}),catalog);assert.equal(value.invalid,true);assert.equal(api.matches({location:'בת ים, מרכז'},value,catalog),false);
 }
});
test('legacy city and neighborhood URLs retain unknown filters and recognize official aliases',()=>{
 ready();let value=api.readParams(new URLSearchParams({city:'תל אביב',hood:'נוה צדק'}),catalog);
 assert.equal(api.matches({location:'תל אביב-יפו, נווה צדק'},value,catalog),true);
 value=api.readParams(new URLSearchParams({city:'תל אביב',hood:'אזור שטרם פורסם'}),catalog);
 assert.equal(api.matches({location:'תל אביב, פלורנטין'},value,catalog),false);
 assert.equal(api.matches({location:'תל אביב, אזור שטרם פורסם'},value,catalog),true);
});
test('selected official boundaries match public exact coordinates but never approximate-location coordinates',()=>{
 ready();const custom={cities:[{id:'a',name:'עיר א'}],areas:[{id:'a:1',city_id:'a',name:'אזור א',geometry:{type:'Polygon',coordinates:[[[34,32],[35,32],[35,33],[34,33],[34,32]],[[34.4,32.4],[34.6,32.4],[34.6,32.6],[34.4,32.6],[34.4,32.4]]]}}]};
 const value={locations:[{city_id:'a',whole_city:false,area_ids:['a:1']}]};
 assert.equal(api.matches({location:'עיר א, אזור לא מוכר',lat:32.2,lng:34.2},value,custom),true);
 assert.equal(api.matches({location:'עיר א, אזור לא מוכר',lat:32.5,lng:34.5},value,custom),false);
 assert.equal(api.matches({location:'עיר א, אזור לא מוכר',lat:32.2,lng:34.2,publicLocationMode:'approximate'},value,custom),false);
});
test('clearing chosen regions leaves other search parameters intact',()=>{
 ready();const params=new URLSearchParams({type:'rent',rooms:'3',priceMax:'8000',city:'בת ים',hood:'מרכז'});api.writeParams(params,pick);api.writeParams(params,{locations:[]});
 assert.equal(params.toString(),'type=rent&rooms=3&priceMax=8000');assert.equal(api.matches({location:'לא מוכר'},api.readParams(params,catalog),catalog),true);
});
test('hero search passes canonical multiple-city choices alongside transaction, budget and rooms',()=>{
 const source=fs.readFileSync(require.resolve('../app'),'utf8');const fields={heroRooms:{value:'3'},heroBudget:{value:'8000'}};
 const window={location:{},mavoMainRegions:pick,MavoRegionSearch:api};const c=vm.createContext({window,MavoRegionSearch:api,URLSearchParams,document:{getElementById:id=>fields[id],querySelector:()=>({dataset:{type:'rent'}})}});
 vm.runInContext(source.slice(source.indexOf('function doSearch()'),source.indexOf('function setupHeroSearch')),c);vm.runInContext('doSearch()',c);
 const params=new URL('https://example.com/'+window.location.href).searchParams;
 assert.equal(params.get('type'),'rent');assert.equal(params.get('priceMax'),'8000');assert.equal(params.get('rooms'),'3');assert.ok(params.has('regions'),'selected geography must survive navigation');
});
test('results page applies the same multiple-region geography while retaining transaction and budget',()=>{
 const html=fs.readFileSync(require.resolve('../search.html'),'utf8');const values={priceMin:'',priceMax:'8000',sortSelect:'default'};
 const rows=[{id:1,type:'rent',price:7000,location:'תל אביב, פלורנטין'},{id:2,type:'rent',price:7000,location:'בת ים, מרכז'},{id:3,type:'rent',price:7000,location:'תל אביב, בבלי'},{id:4,type:'sale',price:7000,location:'תל אביב, פלורנטין'},{id:5,type:'rent',price:9000,location:'תל אביב, פלורנטין'}];let shown;
 const ctx=vm.createContext({MavoCatalog:require('../catalog'),MavoRegionSearch:api,allProps:rows,activeType:'rent',activeCities:new Set(),activeHoods:new Set(),activeRooms:'all',searchRegions:pick,searchRegionCatalog:catalog,window:{},document:{getElementById:id=>Object.hasOwn(values,id)?{value:values[id]}:null},renderResults:rows=>shown=rows.map(p=>p.id)});
 vm.runInContext(html.slice(html.indexOf('function applyFilters()'),html.indexOf('function numPrice')),ctx);vm.runInContext('applyFilters()',ctx);assert.deepEqual(shown,[1,2]);
});
test('unknown legacy neighborhood still matches the equivalent canonical city alias without widening the neighborhood',()=>{
 const value=api.readParams(new URLSearchParams({city:'תל אביב-יפו',hood:'שכונה חדשה'}),catalog);
 assert.equal(api.matches({location:'תל אביב, שכונה חדשה'},value,catalog),true);
 assert.equal(api.matches({location:'בת ים, שכונה חדשה'},value,catalog),false);
 assert.equal(api.matches({location:'תל אביב, פלורנטין'},value,catalog),false);
});
test('search URL hydration restores the drawer contract and opens the chosen city',async()=>{
 const html=fs.readFileSync(require.resolve('../search.html'),'utf8'),params=new URLSearchParams();api.writeParams(params,{locations:[pick.locations[1]]});
 const model=require('../looking-regions').createSelection(catalog),restore=require('../region-drawer').restoreSelection;
 const drawer={catalog,selection:model,setValue:value=>restore(model,value)};
 const fields=Object.fromEntries(['searchRegionSummary','priceMin','priceMax','sortSelect'].map(id=>[id,{value:'',textContent:''}]));
 const context=vm.createContext({window:{location:{search:'?'+params}},URLSearchParams,MavoCatalog:require('../catalog'),MavoRegionSearch:api,MavoRegionDrawer:{create:async()=>drawer},document:{getElementById:id=>fields[id]||null}});
 vm.runInContext(html.slice(html.indexOf('const WA ='),html.indexOf('// ---- Render ----')),context);vm.runInContext('function renderResults(){}',context);
 await vm.runInContext('ensureSearchRegionDrawer()',context);assert.deepEqual(model.serialize().locations,[pick.locations[1]]);assert.equal(model.activeCity,'6200');
});
test('closing changed geography frames visible map results once; unchanged selection and no results retain bounds',()=>{
 const source=fs.readFileSync(require.resolve('../app'),'utf8'),start=source.indexOf('function fitSelectedMapRegions()');
 assert.notEqual(start,-1,'explicit region selection needs map framing');
 const precise={getLatLng:()=>[32.1,34.8]},hidden={getLatLng:()=>[33,35]},general={getLatLng:()=>[32,34.75]},calls=[];
 const ctx=vm.createContext({mainRegionOpenValue:'[]',markers:[precise,hidden],areaMarkers:[general],map:{hasLayer:m=>m!==hidden,fitBounds:(points,opts)=>calls.push({points,opts})}});
 vm.runInContext(source.slice(start,source.indexOf('function updateMainRegionSummaries',start)),ctx);
 ctx.value={locations:[]};vm.runInContext('finishMainRegionSelection(value)',ctx);assert.equal(calls.length,0);
 ctx.value=pick;vm.runInContext('finishMainRegionSelection(value)',ctx);assert.equal(calls.length,1);assert.deepEqual(Array.from(calls[0].points,p=>Array.from(p)),[[32.1,34.8],[32,34.75]]);assert.equal(calls[0].opts.maxZoom,15);
 vm.runInContext('finishMainRegionSelection(value)',ctx);assert.equal(calls.length,1);
 ctx.map.hasLayer=()=>false;ctx.value={locations:[]};vm.runInContext('finishMainRegionSelection(value)',ctx);assert.equal(calls.length,1);
});
