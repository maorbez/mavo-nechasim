const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../catalog.js');
const search = require('../region-search.js');
const regions = require('../assets/regions/neighborhood-catalog-2026-10-08.json');

test('price pins keep the amount compact and leave the full monthly price untouched',()=>{
 for(const priceLabel of ['₪ 4,500 לחודש','₪ 4,500 / חודש','₪ 4,500 בחודש']){
  const p={priceLabel};assert.equal(catalog.mapPriceLabel(p),'₪ 4,500');assert.equal(p.priceLabel,priceLabel);
 }
});

test('published location accepts both city-first and neighborhood-first formats', () => {
  for (const text of ['תל אביב, נווה צדק', 'נווה צדק, תל אביב', 'נווה צדק, תל-אביב']) {
    const p = {location:text, lat:null, lng:null};
    assert.deepEqual(catalog.location(p), {city:'תל אביב', hood:'נווה צדק'});
    assert.equal(catalog.mapPosition(p, regions).kind, 'neighborhood');
    const area = regions.areas.find(a=>[a.name,...(a.aliases||[])].some(n=>catalog.hoodName(n)==='נווה צדק'));
    assert(search.matches(p, {locations:[{city_id:area.city_id,whole_city:false,area_ids:[area.id]}]}, regions));
  }
});

test('an address followed by a known city gives only a general city area, never an invented pin', () => {
  const p = {location:'רחוב בדיקה 999, בת-ים',lat:null,lng:null};
  assert.equal(catalog.mapPosition(p, regions).kind, 'city');
  assert.equal(catalog.navigationUrl(p), null);
  assert.equal(catalog.mapPosition({location:'עיר לא מוכרת, נווה צדק'}, regions).kind, 'unlocated');
  assert.deepEqual(catalog.location({city:'חולון',hood:'אגרובנק',location:'נווה צדק, תל אביב'}), {city:'חולון',hood:'אגרובנק'});
});
