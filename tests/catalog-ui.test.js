'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createState,comparisonFields}=require('../catalog-ui');
const row=(id,extra={})=>({id,active:true,title:'נכס '+id,rooms:2,...extra});
test('comparison uses current canonical rows and clears withdrawn inventory',()=>{
 const state=createState();state.update([row(97),row(98),row(91),row(90)]);
 assert.equal(state.toggleCompare(97),true);state.toggleCompare(98);state.toggleCompare(91);
 assert.equal(state.toggleCompare(90),false);assert.equal(state.toggleCompare(999),false);
 state.update([row(97,{price:8000}),row(91)]);
 assert.deepEqual(state.selectedRows().map(p=>p.id),[97,91]);assert.equal(state.selectedRows()[0].price,8000);
 state.update([]);assert.deepEqual(state.selectedRows(),[]);assert.equal(state.toggleCompare(97),false);
});
test('favorites persist identifiers only and never restore withdrawn properties',()=>{
 let saved;const storage={getItem:()=>JSON.stringify([97,'98',-1,{},null]),setItem:(key,value)=>{saved=JSON.parse(value);}};
 const state=createState(storage);state.update([row(97),row(98)]);assert.equal(state.isSaved(97),true);assert.equal(state.isSaved(98),false);
 state.toggleSaved(98);assert.deepEqual(saved,[97,98]);state.update([]);assert.equal(state.savedRows().length,0);
 state.update([row(98)]);assert.deepEqual(state.savedRows().map(p=>p.id),[98]);
});
test('blocked storage is harmless and inactive or malformed IDs cannot be selected',()=>{
 const state=createState({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});
 state.update([row(1),row(2,{active:false}),row(-3),row('4')]);state.toggleSaved(1);
 assert.equal(state.isSaved(1),true);assert.equal(state.toggleCompare(2),false);assert.equal(state.toggleCompare(-3),false);assert.equal(state.toggleCompare('4'),false);
});
test('unknown values remain unknown; balcony area is separate from apartment area',()=>{
 const fields=comparisonFields([row(1,{sqm:70,balconySqm:12,baths:1}),row(2,{sqm:null,balconySqm:null,baths:null})]);
 assert.deepEqual(fields.map(f=>f.key),['rooms','sqm','baths','balconySqm']);
 assert.equal(fields.find(f=>f.key==='sqm').value(row(2)),'לא צוין');
 assert.equal(fields.find(f=>f.key==='balconySqm').value(row(1,{balconySqm:12})),'12 מ״ר');
 assert.deepEqual(comparisonFields([row(1,{rooms:null})]),[]);
});
