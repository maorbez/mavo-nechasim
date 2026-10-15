'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'search.html'), 'utf8');
const catalog = require('../assets/regions/neighborhood-catalog-2026-10-08.json');
const geography = require('../region-search');
const florentin=catalog.areas.find(a=>a.name==='פלורנטין');
function search(rows) {
  const elements=Object.fromEntries(['searchRegionSummary','priceMin','priceMax','sortSelect'].map(id=>[id,{value:'',textContent:''}]));
  const context = vm.createContext({window:{location:{search:''}},URLSearchParams,MavoRegionSearch:geography,MavoCatalog:require('../catalog.js'),document:{getElementById:id=>elements[id]||null}});
  vm.runInContext(html.slice(html.indexOf('const WA ='),html.indexOf('// ---- Render ----')),context);
  context.rows=rows;context.regions=catalog;
  vm.runInContext('allProps=rows;searchRegionCatalog=regions;function renderResults(rows){window.results=rows;}buildFilters();',context);
  return {context,elements,results:()=>Array.from(context.window.results,row=>row.id)};
}
test('whole-city choices include city-only locations while excluding missing and other-city locations',()=>{
 const s=search([{id:1,location:'תל אביב, פלורנטין',price:'5,000'},{id:2,location:'רמת גן',price:'6,000'},{id:3,location:' רמת גן ',price:'7,000'},{id:4,location:'',price:'8,000'}]);
 s.context.selection={locations:[{city_id:'8600',whole_city:true,area_ids:[]}]};vm.runInContext('searchRegions=selection;buildFilters();applyFilters();',s.context);
 assert.deepEqual(s.results(),[2,3]);assert.equal(s.elements.searchRegionSummary.textContent,'כל רמת גן');
 vm.runInContext('searchRegions={locations:[]};applyFilters();',s.context);assert.deepEqual(s.results(),[1,2,3,4]);
});
test('blank publication locations never become new choices in the canonical municipal selection',()=>{
 const s=search([{id:1,location:'עיר, '},{id:2,location:', שכונה'},{id:3,location:''}]);
 s.context.selection={locations:[{city_id:'5000',whole_city:true,area_ids:[]}]};vm.runInContext('searchRegions=selection;buildFilters();applyFilters();',s.context);
 assert.equal(s.elements.searchRegionSummary.textContent,'כל תל אביב-יפו');assert.deepEqual(s.results(),[]);
});
test('exact room filters preserve fractional values and 5 includes larger counts',()=>{
 const s=search([1.5,2,2.5,2.5,3.5,4.5,5,6].map((rooms,id)=>({id,rooms,location:'עיר',price:'5,000'})));
 vm.runInContext("activeRooms='2.5';applyFilters();",s.context);assert.deepEqual(s.results(),[2,3]);
 vm.runInContext("activeRooms='5';applyFilters();",s.context);assert.deepEqual(s.results(),[6,7]);
});
test('every home room selection is supported by the search destination',()=>{
 const home=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');const select=home.match(/<select id="heroRooms">([\s\S]*?)<\/select>/)[1];
 for(const option of select.matchAll(/<option(?: value="([^"]+)")?>([^<]+)<\/option>/g)){const value=option[1]||option[2];assert.ok(html.includes('data-rooms="'+value+'"'),'unsupported room filter '+value);}
});
test('fresh search catalog retains canonical city/hood/type/room/budget filters through empty and changed inventory',()=>{
 const s=search([{id:1,type:'rent',rooms:2,price:'5000',location:'תל אביב, פלורנטין'}]);s.elements.priceMax.value='5500';
 s.context.selection={locations:[{city_id:'5000',whole_city:false,area_ids:[florentin.id]}]};vm.runInContext("searchRegions=selection;activeType='rent';activeRooms='2';",s.context);
 s.context.fresh={properties:[]};vm.runInContext('updateSearchCatalog(fresh)',s.context);assert.deepEqual(s.results(),[]);
 s.context.fresh={properties:[{id:2,type:'rent',rooms:2,price:'5000',location:'תל אביב, פלורנטין'},{id:3,type:'sale',rooms:2,price:'5000',location:'תל אביב, פלורנטין'},{id:4,type:'rent',rooms:2,price:'6000',location:'תל אביב, פלורנטין'},{id:5,type:'rent',rooms:2,price:'5000',location:'תל אביב, בבלי'}]};vm.runInContext('updateSearchCatalog(fresh)',s.context);
 assert.deepEqual(s.results(),[2]);assert.equal(s.elements.priceMax.value,'5500');assert.match(s.elements.searchRegionSummary.textContent,/פלורנטין/);
});
test('adding another city after refresh preserves a disappeared selected neighborhood',()=>{
 const s=search([{id:1,type:'rent',price:'5000',location:'תל אביב, פלורנטין'}]);
 const model=require('../looking-regions').createSelection(catalog);model.toggleArea(florentin.id);s.context.selection=model.serialize();vm.runInContext('searchRegions=selection',s.context);
 s.context.fresh={properties:[{id:2,type:'rent',price:'5000',location:'בת ים, מרכז'}]};vm.runInContext('updateSearchCatalog(fresh)',s.context);assert.deepEqual(s.results(),[]);
 model.setCity('6200');model.toggleWholeCity();s.context.selection=model.serialize();vm.runInContext('searchRegions=selection;buildFilters();applyFilters();',s.context);
 assert.deepEqual(s.results(),[2]);assert.match(s.elements.searchRegionSummary.textContent,/פלורנטין/);assert.match(s.elements.searchRegionSummary.textContent,/כל בת ים/);
});
