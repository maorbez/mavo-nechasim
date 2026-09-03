'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260903150000_office_canonical_publication.sql'),
  'utf8'
);
const liveColumns = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/live-properties-columns-2026-09-03.json'), 'utf8')
);

test('migration accounts for the exact 2026-09-03 live properties schema', function () {
  assert.ok(liveColumns.includes('created_at'));
  assert.ok(!liveColumns.includes('updated_at'));

  for (const addition of ['office_property_id', 'office_updated_at', 'published_at', 'updated_at']) {
    assert.match(sql, new RegExp('add column if not exists ' + addition + '\\b', 'i'));
  }

  assert.match(sql, /drop identity if exists/i, 'live id generation mode may differ from the recovery migration');
  assert.match(sql, /alter column id drop default/i, 'server publisher must always provide the office number');
});

test('every browser-selected field exists in the live provider snapshot', function () {
  const db = require('../db.js');
  for (const column of db.PUBLIC_PROPERTY_COLUMNS) {
    assert.ok(liveColumns.includes(column), column + ' is absent from the live provider schema');
  }
  assert.ok(!db.PUBLIC_PROPERTY_COLUMNS.includes('office_property_id'));
  assert.ok(!db.PUBLIC_PROPERTY_COLUMNS.includes('office_updated_at'));
});
