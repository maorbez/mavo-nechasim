const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fixture = {
  version:'2026-10-08',
  cities:[{id:'5000',name:'תל אביב-יפו'},{id:'6200',name:'בת ים'}],
  areas:[
    {id:'tlv:1',city_id:'5000',name:'נווה צדק',aliases:['נוה צדק']},
    {id:'tlv:2',city_id:'5000',name:'לב העיר',aliases:['מרכז לב העיר']},
    {id:'batyam:1',city_id:'6200',name:'רמת הנשיא',aliases:[]}
  ]
};
function model() {
  const source=path.join(__dirname,'../looking-regions.js');
  assert.ok(fs.existsSync(source),'A canonical region-selection implementation is available');
  return require(source).createSelection(fixture);
}
test('switching the visible city preserves independent selections and serializes city-scoped IDs',()=>{
  const s=model(); s.toggleArea('tlv:1');s.setCity('6200');s.toggleArea('batyam:1');
  assert.equal(s.activeCity,'6200');
  assert.deepEqual(s.serialize(),{catalog_version:'2026-10-08',locations:[
    {city_id:'5000',whole_city:false,area_ids:['tlv:1']},
    {city_id:'6200',whole_city:false,area_ids:['batyam:1']}
  ],cities:['תל אביב-יפו','בת ים'],areas:['נווה צדק','רמת הנשיא']});
  s.setCity('5000'); assert.equal(s.isSelected('tlv:1'),true);
});
test('whole-city choices do not restrict a second city to a neighborhood in the first',()=>{
  const s=model();s.toggleArea('tlv:2');s.toggleWholeCity('6200');
  assert.deepEqual(s.serialize().locations,[{city_id:'5000',whole_city:false,area_ids:['tlv:2']},{city_id:'6200',whole_city:true,area_ids:[]}]);
  assert.equal(s.isSelected('batyam:1'),true);
  s.toggleWholeCity('6200');assert.deepEqual(s.serialize().cities,['תל אביב-יפו']);
});
test('the contact-step summary distinguishes a whole city from a neighborhood in another city',()=>{
  const s=model();s.toggleArea('tlv:1');s.toggleWholeCity('6200');
  assert.equal(typeof s.describe,'function');
  assert.deepEqual(s.describe(),['נווה צדק · תל אביב-יפו','כל בת ים']);
});
test('deselecting one area from a whole city keeps all other areas selected',()=>{
  const s=model();s.toggleWholeCity('5000');s.toggleArea('tlv:1');
  assert.deepEqual(s.serialize().locations,[{city_id:'5000',whole_city:false,area_ids:['tlv:2']}]);
});
test('search matches documented aliases once, normalizes punctuation and stays within the visible city',()=>{
  const s=model();
  assert.deepEqual(s.listAreas('נוה צדק').map(a=>a.id),['tlv:1']);
  assert.deepEqual(s.listAreas('לב-העיר').map(a=>a.id),['tlv:2']);
  s.setCity('6200');assert.deepEqual(s.listAreas('לב העיר'),[]);
});
test('municipal punctuation is readable and searchable without changing canonical names or ordering by stray quotes',()=>{
  const s=require('../looking-regions').createSelection({...fixture,areas:[
    {id:'tlv:7',city_id:'5000',name:"'רמת אביב ג",display_name:'רמת אביב ג׳',aliases:["רמת אביב ג'"]},
    {id:'tlv:8',city_id:'5000',name:'אפקה',aliases:[]},
    {id:'tlv:49',city_id:'5000',name:"(יפו ד' (גבעת התמרים",display_name:'יפו ד׳ (גבעת התמרים)',aliases:[]}
  ]});
  assert.deepEqual(s.listAreas().map(a=>a.id),['tlv:8','tlv:49','tlv:7']);
  assert.deepEqual(s.listAreas('יפו ד׳ (גבעת התמרים)').map(a=>a.id),['tlv:49']);
  s.toggleArea('tlv:7');assert.deepEqual(s.serialize().areas,["'רמת אביב ג"]);
  assert.deepEqual(s.describe(),['רמת אביב ג׳ · תל אביב-יפו']);
});
test('removal and clear remove stale city scope without mutating previous serialized searches',()=>{
  const s=model();s.toggleArea('tlv:1');s.toggleArea('tlv:2');s.toggleWholeCity('6200');
  const first=s.serialize();s.removeArea('tlv:1');s.removeCity('6200');
  assert.deepEqual(s.serialize().areas,['לב העיר']);
  s.clear();assert.deepEqual(s.serialize().locations,[]);
  assert.equal(first.locations.length,2);assert.deepEqual(first.locations[0].area_ids,['tlv:1','tlv:2']);
});
test('unknown IDs cannot be added or silently coerced into valid areas',()=>{
  const s=model();assert.throws(()=>s.toggleArea('tlv:999'));assert.throws(()=>s.setCity('unknown'));
  assert.deepEqual(s.serialize().locations,[]);
});
test('all municipal areas can be selected without the former twelve-area truncation',()=>{
  const catalog=require('../assets/regions/neighborhood-catalog-2026-10-08.json');
  const s=require('../looking-regions').createSelection(catalog);
  for(const area of catalog.areas)s.toggleArea(area.id);
  const result=s.serialize();
  assert.equal(result.locations.find(l=>l.city_id==='5000').area_ids.length,71);
  assert.equal(result.locations.find(l=>l.city_id==='6200').area_ids.length,16);
  assert.equal(new Set(result.locations.flatMap(l=>l.area_ids)).size,catalog.areas.length);
  s.setCity('6200');assert.equal(s.listAreas('פארק הים')[0].id,'batyam:71');
  s.setCity('5000');assert.equal(s.listAreas('לב העיר')[0].id,'tlv:37');
});
test('all five city selections survive switching and independent whole-city removal',()=>{
  const catalog=require('../assets/regions/neighborhood-catalog-2026-10-08.json');
  assert.deepEqual(new Set(catalog.cities.map(c=>c.name)),new Set(['תל אביב-יפו','בת ים','גבעתיים','רמת גן','חולון']));
  const s=require('../looking-regions').createSelection(catalog);
  for(const c of catalog.cities){s.setCity(c.id);assert.ok(s.listAreas().length);s.toggleArea(s.listAreas()[0].id);}
  assert.equal(s.serialize().locations.length,5);
  s.setCity('6600');s.toggleWholeCity();
  assert.equal(s.serialize().locations.filter(l=>l.whole_city).length,1);
  s.removeCity('6600');assert.equal(s.serialize().locations.length,4);
  s.setCity('6300');assert.ok(s.isSelected(s.listAreas()[0].id));
  s.clear();assert.deepEqual(s.serialize().locations,[]);
});

test('every new municipal name and documented alias remains searchable in its own city',()=>{
  const catalog=require('../assets/regions/neighborhood-catalog-2026-10-08.json');
  const s=require('../looking-regions').createSelection(catalog);
  for(const area of catalog.areas.filter(a=>['6300','8600','6600'].includes(a.city_id))){
    s.setCity(area.city_id);
    for(const name of [area.name,...(area.aliases||[])]){
      const found=s.listAreas(name);
      assert.ok(found.some(a=>a.id===area.id),name);
      assert.ok(found.every(a=>a.city_id===area.city_id));
    }
  }
  const sameName=catalog.areas.filter(a=>(a.display_name||a.name)==='שיכון ותיקים');
  assert.equal(sameName.length,2);
  sameName.forEach(a=>s.toggleArea(a.id));
  assert.deepEqual(new Set(s.serialize().locations.map(l=>l.city_id)),new Set(['6600','8600']));
});
