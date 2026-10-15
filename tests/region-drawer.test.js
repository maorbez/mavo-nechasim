const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createSelection} = require('../looking-regions.js');
let restoreSelection;
try { ({restoreSelection} = require('../region-drawer.js')); } catch {}
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/regions/neighborhood-catalog-2026-10-08.json'),'utf8'));
const fresh = () => createSelection(catalog);
const valueFor = locations => ({catalog_version:catalog.version,locations});

test('drawer restores multiple cities and canonical area names without trusting supplied labels',()=>{
  assert.equal(typeof restoreSelection,'function');
  const selection=fresh(), a=catalog.areas[0], other=catalog.cities.find(c=>c.id!==a.city_id);
  restoreSelection(selection,{...valueFor([{city_id:a.city_id,whole_city:false,area_ids:[a.id]},{city_id:other.id,whole_city:true,area_ids:[]}]),cities:['untrusted'],areas:['untrusted']});
  assert.equal(selection.isSelected(a.id),true);
  assert.equal(selection.isWholeCity(other.id),true);
  assert.deepEqual(selection.serialize().areas,[a.name]);
  assert.equal(selection.serialize().cities.includes('untrusted'),false);
});

test('invalid later city or cross-city area leaves all earlier selections and active city untouched',()=>{
  assert.equal(typeof restoreSelection,'function');
  const selection=fresh(), a=catalog.areas[0], other=catalog.cities.find(c=>c.id!==a.city_id);
  selection.toggleArea(a.id);selection.setCity(other.id);
  const before=selection.serialize();
  for(const invalid of [
    [{city_id:other.id,whole_city:true,area_ids:[]},{city_id:'unknown',whole_city:true,area_ids:[]}],
    [{city_id:other.id,whole_city:false,area_ids:[a.id]}]
  ]) {
    assert.throws(()=>restoreSelection(selection,valueFor(invalid)));
    assert.deepEqual(selection.serialize(),before);
    assert.equal(selection.activeCity,other.id);
  }
});

test('stale catalogs and ambiguous duplicate cities cannot replace a saved selection',()=>{
  assert.equal(typeof restoreSelection,'function');
  const selection=fresh(), city=catalog.cities[0];selection.toggleWholeCity(city.id);
  const before=selection.serialize(), location={city_id:city.id,whole_city:true,area_ids:[]};
  assert.throws(()=>restoreSelection(selection,{catalog_version:'old',locations:[]}));
  assert.throws(()=>restoreSelection(selection,valueFor([location,location])));
  assert.throws(()=>restoreSelection(selection,valueFor([{...location,area_ids:[catalog.areas[0].id]}])));
  assert.deepEqual(selection.serialize(),before);
});

test('restoring an empty search clears choices but preserves the city being viewed',()=>{
  assert.equal(typeof restoreSelection,'function');
  const selection=fresh(), city=catalog.cities[2];selection.toggleWholeCity(city.id);selection.setCity(city.id);
  restoreSelection(selection,valueFor([]));
  assert.deepEqual(selection.serialize().locations,[]);
  assert.equal(selection.activeCity,city.id);
});
