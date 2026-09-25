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
test('map room limits exclude missing room values and include commercial subtypes',()=>{const rows=[{type:'commercial-rent',rooms:3},{type:'rent',rooms:null},{type:'rent',rooms:3}];const visible=new Set();const c=vm.createContext({MavoCatalog:require('../catalog.js'),markers:rows.map(p=>({_propData:p})),map:{hasLayer:m=>visible.has(m),addLayer:m=>visible.add(m),removeLayer:m=>visible.delete(m)},document:{getElementById:id=>id==='mapRoomsMin'?{value:'2'}:id==='mapRoomsMax'?{value:'4'}:null},activeType:'all'});vm.runInContext(code.slice(code.indexOf('function applyMapFilters'),code.indexOf('function updateMapCount')),c);vm.runInContext('applyMapFilters()',c);assert.equal(visible.size,2);c.activeType='commercial';vm.runInContext('applyMapFilters()',c);assert.equal(visible.size,1);});
