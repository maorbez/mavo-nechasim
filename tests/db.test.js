'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const db = require('../db.js');

test('canonicalPropertyId accepts only positive safe integers', function () {
  assert.equal(db.canonicalPropertyId(49), 49);
  assert.equal(db.canonicalPropertyId('49'), 49);
  for (const invalid of [null, '', 0, -1, 1.2, '23 / #49', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(function () { db.canonicalPropertyId(invalid); });
  }
});

test('Supabase reader uses active rows, stable ordering, and office id unchanged', async function () {
  let request;
  const rows = await db.fetchPropertiesFromDB({
    fetchImpl: async function (url, init) {
      request = { url: url, init: init };
      return {
        ok: true,
        json: async function () {
          return [{ id: 49, title: 'סלמה 117', active: true, photos: [] }];
        }
      };
    }
  });

  assert.match(request.url, /active=eq\.true&order=id\.asc$/);
  assert.equal(request.init.cache, 'no-store');
  assert.equal(rows[0].id, 49);
  assert.equal(rows[0].title, 'סלמה 117');
});

test('a successful empty live inventory is authoritative and never falls back', async function () {
  let fallbackCalls = 0;
  const result = await db.loadMavoProperties({
    fetchLive: async function () { return []; },
    fetchSnapshot: async function () { fallbackCalls += 1; return [{ id: 7 }]; },
    readCache: function () { fallbackCalls += 1; return [{ id: 8 }]; },
    renderStatus: false
  });

  assert.deepEqual(result.properties, []);
  assert.equal(result.source, 'supabase');
  assert.equal(result.degraded, false);
  assert.equal(fallbackCalls, 0);
});

test('a live outage uses a marked static snapshot', async function () {
  const result = await db.loadMavoProperties({
    fetchLive: async function () { throw new Error('offline'); },
    fetchSnapshot: async function () { return [{ id: 38, title: 'snapshot' }]; },
    readCache: function () { return [{ id: 99 }]; },
    renderStatus: false
  });

  assert.equal(result.source, 'snapshot');
  assert.equal(result.degraded, true);
  assert.equal(result.properties[0].id, 38);
});

test('total provider and snapshot failure returns no invented listings', async function () {
  const result = await db.loadMavoProperties({
    fetchLive: async function () { throw new Error('offline'); },
    fetchSnapshot: async function () { throw new Error('missing'); },
    readCache: function () { return []; },
    renderStatus: false
  });

  assert.deepEqual(result.properties, []);
  assert.equal(result.source, 'unavailable');
  assert.equal(result.degraded, true);
});

test('invalid live identity cannot silently become the public property number', async function () {
  const result = await db.loadMavoProperties({
    fetchLive: async function () { return [{ id: 'description #49' }]; },
    fetchSnapshot: async function () { return [{ id: 23 }]; },
    renderStatus: false
  });

  assert.equal(result.source, 'snapshot');
  assert.equal(result.properties[0].id, 23);
});

test('browser renders a visible Hebrew warning when live data falls back', async function () {
  const elements = new Map();
  const body = {
    firstChild: null,
    insertBefore: function (element) {
      elements.set(element.id, element);
      this.firstChild = element;
    }
  };
  const document = {
    body: body,
    getElementById: function (id) { return elements.get(id) || null; },
    createElement: function () {
      return {
        dataset: {},
        style: {},
        setAttribute: function () {},
        remove: function () { elements.delete(this.id); }
      };
    }
  };
  const window = { document: document, localStorage: null };
  const context = vm.createContext({ window: window, AbortController: AbortController, setTimeout: setTimeout, clearTimeout: clearTimeout });
  const source = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');
  vm.runInContext(source, context);

  const result = await window.loadMavoProperties({
    fetchLive: async function () { throw new Error('offline'); },
    fetchSnapshot: async function () { return [{ id: 38 }]; }
  });
  const banner = document.getElementById('mavo-data-status');

  assert.equal(result.source, 'snapshot');
  assert.ok(banner);
  assert.match(banner.textContent, /מאגר הנכסים החי אינו זמין/);
  assert.equal(banner.dataset.source, 'snapshot');
});
