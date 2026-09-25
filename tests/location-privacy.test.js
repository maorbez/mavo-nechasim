'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../catalog.js');
const db = require('../db.js');

test('approximate property cannot expose a precise navigation destination even with stale coordinates', () => {
  const p = { publicLocationMode: 'approximate', lat: 32.05, lng: 34.77 };
  assert.equal(catalog.navigationUrl(p), null);
  assert.equal(catalog.hasCoordinates(p), false);
  assert.equal(catalog.locationLabel({...p, location: 'תל אביב, פלורנטין'}), 'תל אביב, פלורנטין · מיקום משוער');
});
test('exact property retains navigation and label, missing coordinates never become a link', () => {
  const p = { lat: 32.05, lng: 34.77, location: 'תל אביב, פלורנטין' };
  assert.equal(catalog.navigationUrl(p), 'https://waze.com/ul?ll=32.05,34.77&navigate=yes&zoom=17');
  assert.equal(catalog.locationLabel(p), p.location);
  assert.equal(catalog.navigationUrl({...p, lat: null}), null);
});
test('outage cannot revive a previously public exact address from either recovery source', async () => {
  let calls = 0;
  const result = await db.loadMavoProperties({
    fetchLive: async () => { throw new Error('offline'); },
    fetchSnapshot: async () => { calls++; return [{id: 1, title: 'OLD EXACT ADDRESS'}]; },
    readCache: () => { calls++; return [{id: 1, title: 'OLD EXACT ADDRESS'}]; },
    renderStatus: false
  });
  assert.equal(calls, 0);
  assert.deepEqual(result.properties, []);
  assert.equal(result.source, 'unavailable');
});
test('publisher explicit privacy marker becomes approximate client mode and discards old coordinates', () => {
  const p = db.mapDbRow({id:901,extra:'מיקום משוער',lat:32.05,lng:34.77});
  assert.equal(p.publicLocationMode,'approximate');
  assert.equal(p.lat,null);assert.equal(p.lng,null);
  assert.equal(db.mapDbRow({id:902,extra:'מעלית'}).publicLocationMode,'exact');
});
