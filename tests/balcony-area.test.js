const test=require('node:test');const assert=require('node:assert/strict');const {mapDbRow}=require('../db');
const read=description=>mapDbRow({id:64,sqm:88,description});
test('explicit balcony total is displayed separately from apartment area',()=>{
 const p=read('שטח דירה של 88 מ״ר, בנוסף מרפסות בשטח כולל של 30 מ״ר');
 assert.equal(p.sqm,88);assert.equal(p.balconySqm,30);
});
test('apartment area, balcony presence and balcony counts do not invent balcony area',()=>{
 for(const text of ['88 מ״ר עם מרפסת','2 מרפסות','דירה 30 מ״ר',null])assert.equal(read(text).balconySqm,null);
});
