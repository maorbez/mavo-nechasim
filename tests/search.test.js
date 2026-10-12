'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'search.html'), 'utf8');

function search(rows) {
  function element() {
    const classes = new Set();
    return { children: [], style: {}, value: '', checked: false,
      set innerHTML(value) { this.children = []; },
      appendChild(child) { this.children.push(child); }, addEventListener() {},
      classList: { toggle(name) { classes.has(name) ? classes.delete(name) : classes.add(name); },
        contains(name) { return classes.has(name); } } };
  }
  const elements = Object.fromEntries(['cityPills', 'hoodList', 'priceMin', 'priceMax', 'sortSelect'].map(id => [id, element()]));
  const context = vm.createContext({ window: {}, MavoCatalog:require('../catalog.js'), document: {
    getElementById: id => elements[id] || null,
    createElement: element, createTextNode: text => ({ textContent: text })
  }});
  vm.runInContext(html.slice(html.indexOf("const WA ="), html.indexOf('// ---- Render ----')), context);
  context.rows = rows;
  vm.runInContext('allProps = rows; function renderResults(rows) { window.results = rows; } buildFilters();', context);
  return { context, elements, results: () => Array.from(context.window.results, row => row.id) };
}

test('city-only locations create selectable cities without blank neighborhood choices', () => {
  const s = search([
    { id: 1, location: 'תל אביב, פלורנטין', price: '5,000' },
    { id: 2, location: 'רמת גן', price: '6,000' },
    { id: 3, location: ' רמת גן ', price: '7,000' },
    { id: 4, location: '', price: '8,000' }
  ]);
  assert.deepEqual(s.elements.cityPills.children.map(btn => btn.textContent), ['תל אביב', 'רמת גן']);
  const city = s.elements.cityPills.children[1];
  city.onclick();
  assert.deepEqual(s.results(), [2, 3]);
  assert.equal(s.elements.hoodList.children.length, 0);
  city.onclick();
  assert.deepEqual(s.results(), [1, 2, 3, 4]);
});

test('blank neighborhoods and blank cities do not become filter choices', () => {
  const s = search([{ location: 'עיר, ' }, { location: ', שכונה' }, { location: '' }]);
  assert.deepEqual(s.elements.cityPills.children.map(btn => btn.textContent), ['עיר']);
  assert.equal(s.elements.hoodList.children.length, 0);
});

test('exact room filters preserve fractional values and 5 includes larger counts', () => {
  const s = search([1.5, 2, 2.5, 2.5, 3.5, 4.5, 5, 6].map((rooms, id) => ({ id, rooms, location: 'עיר', price: '5,000' })));
  vm.runInContext("activeRooms = '2.5'; applyFilters();", s.context);
  assert.deepEqual(s.results(), [2, 3]);
  vm.runInContext("activeRooms = '5'; applyFilters();", s.context);
  assert.deepEqual(s.results(), [6, 7]);
});

test('every home room selection is supported by the search destination',()=>{
 const home=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const select=home.match(/<select id="heroRooms">([\s\S]*?)<\/select>/)[1];
 for(const option of select.matchAll(/<option(?: value="([^"]+)")?>([^<]+)<\/option>/g)){
  const value=option[1]||option[2];assert.ok(html.includes('data-rooms="'+value+'"'),'unsupported room filter '+value);
 }
});
test('fresh search catalog retains city/hood/type/room/budget filters through empty and changed inventory',()=>{
 const s=search([{id:1,type:'rent',rooms:2,price:'5000',location:'תל אביב, פלורנטין'}]);
 s.elements.priceMax.value='5500';vm.runInContext("activeCities.add('תל אביב');activeHoods.add('תל אביב|פלורנטין');activeType='rent';activeRooms='2';",s.context);
 s.context.fresh={properties:[]};vm.runInContext('updateSearchCatalog(fresh)',s.context);assert.deepEqual(s.results(),[]);
 s.context.fresh={properties:[{id:2,type:'rent',rooms:2,price:'5000',location:'תל אביב, פלורנטין'},{id:3,type:'sale',rooms:2,price:'5000',location:'תל אביב, פלורנטין'},{id:4,type:'rent',rooms:2,price:'6000',location:'תל אביב, פלורנטין'}]};vm.runInContext('updateSearchCatalog(fresh)',s.context);assert.deepEqual(s.results(),[2]);assert.equal(s.elements.priceMax.value,'5500');
});
test('clicking a new city after refresh safely retains a disappeared selected city',()=>{
 const s=search([{id:1,type:'rent',price:'5000',location:'תל אביב, פלורנטין'}]);vm.runInContext("activeCities.add('תל אביב')",s.context);
 s.context.fresh={properties:[{id:2,type:'rent',price:'5000',location:'חיפה, הדר'}]};vm.runInContext('updateSearchCatalog(fresh)',s.context);
 const button=s.elements.cityPills.children.find(b=>b.textContent==='חיפה');assert.doesNotThrow(()=>button.onclick());assert.deepEqual(s.results(),[2]);
 assert.equal(vm.runInContext("activeCities.has('תל אביב') && activeCities.has('חיפה')",s.context),true);
});
