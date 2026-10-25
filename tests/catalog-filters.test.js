'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function classes(){const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x),toggle(x,v){v??=!s.has(x);v?s.add(x):s.delete(x);return v}}}
function catalog(){const cards=[['rent','תל אביב, פלורנטין'],['sale','תל אביב, פלורנטין'],['rent','בת ים, מרכז']].map(([type,location])=>({dataset:{type,location},classList:classes()})); const btn={classList:classes(),parentElement:{querySelectorAll:()=>[]}};
 const c=vm.createContext({window:{},MavoCatalog:require('../catalog.js'),document:{querySelectorAll:s=>s.includes('prop-card')?cards:[],querySelector:()=>null,getElementById:()=>null},syncPagination(){}});
 vm.runInContext(code.slice(code.indexOf('function filterByCity'),code.indexOf('// ============================\n// MODAL')),c);
 vm.runInContext(code.slice(code.indexOf('function filterProps'),code.indexOf('function scrollToContact')),c);c.btn=btn;
 return {c,cards,ids:()=>cards.map((x,i)=>!x.classList.contains('hidden')?i:null).filter(x=>x!==null)};
}
test('selecting a neighborhood retains the selected transaction type',()=>{const s=catalog();vm.runInContext("filterProps(btn,'rent');filterByNeighborhood(btn,'פלורנטין');",s.c);assert.deepEqual(s.ids(),[0]);});
test('selecting a city retains the selected transaction type',()=>{const s=catalog();vm.runInContext("filterProps(btn,'sale');filterByCity(btn,'תל אביב');",s.c);assert.deepEqual(s.ids(),[1]);});
test('map room limits exclude missing room values and include commercial subtypes',()=>{
 const rows=[{id:1,type:'commercial-rent',rooms:3,lat:32,lng:34},{id:2,type:'rent',rooms:null,lat:32.1,lng:34},{id:3,type:'rent',rooms:3,lat:32.2,lng:34}];let shown=[];
 const api={...require('../catalog.js'),renderMapGroups(map,groups){shown=groups.flatMap(g=>g.rows.map(p=>p.id));return groups.map(g=>({_mavoRows:g.rows}));}};
 const c=vm.createContext({MavoCatalog:api,properties:rows,mapRegions:null,areaMarkers:[],openPropertyModal(){},markers:[],map:{removeLayer(){},latLngToContainerPoint:([lat,lng])=>({x:lng*1e4,y:lat*1e4})},document:{getElementById:id=>id==='mapRoomsMin'?{value:'2'}:id==='mapRoomsMax'?{value:'4'}:null},activeType:'all'});
 vm.runInContext(code.slice(code.indexOf('function applyMapFilters'),code.indexOf('function updateMapCount')),c);vm.runInContext('applyMapFilters()',c);assert.deepEqual(shown,[1,3]);
 c.activeType='commercial';vm.runInContext('applyMapFilters()',c);assert.deepEqual(shown,[1]);
});
