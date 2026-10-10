'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicPages = [
  'index.html',
  'search.html',
  'neve-tzedek.html',
  'florentin.html',
  'north-tel-aviv.html',
  'bat-yam.html',
  'kerem-hateimanim.html',
  'lev-hair.html'
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('all public pages that run inventory logic load db.js first', function () {
  for (const file of publicPages) {
    const html = read(file);
    const dbPosition = html.indexOf('src="db.js');
    assert.notEqual(dbPosition, -1, file + ' must load db.js');
    const mediaPosition=html.indexOf('src="public-media.js');
    assert.ok(mediaPosition!==-1&&mediaPosition<dbPosition,file+' must normalize public media before reading properties');
    const photoPosition=html.indexOf('src="public-photo.js');
    assert.ok(photoPosition!==-1&&photoPosition<mediaPosition,file+' must load photo presentation before any media consumer');

    const appPosition = html.indexOf('src="app.js');
    const hoodMapPosition = html.indexOf('src="hood-map.js');
    if (appPosition !== -1) assert.ok(dbPosition < appPosition, file + ' must load db.js before app.js');
    if (hoodMapPosition !== -1) assert.ok(dbPosition < hoodMapPosition, file + ' must load db.js before hood-map.js');
  }
});

test('canonical public URLs no longer point to retired origins', function () {
  const searchableFiles = publicPages.concat(['app.js', 'db.js', 'sitemap.xml', 'robots.txt', 'supabase/config.toml']);
  for (const file of searchableFiles) {
    const content = read(file);
    if (file !== 'supabase/config.toml') assert.doesNotMatch(content, /maorbez\.github\.io\/mavo-nechasim/, file);
    assert.doesNotMatch(content, /0526586562\.co\.il/, file);
    assert.doesNotMatch(content, /maorbez\.github\.io\/globes-site/, file);
  }
  assert.match(read('sitemap.xml'), /https:\/\/mavorealestate\.com\//);
  assert.equal(read('CNAME').trim(), 'mavorealestate.com');
});

test('search has no fabricated hardcoded listing fallback', function () {
  const html = read('search.html');
  assert.doesNotMatch(html, /const HARDCODED/);
  assert.match(html, /window\.loadMavoProperties\(\)/);
});

test('deep links remain keyed by the exact public property id', function () {
  const app = read('app.js');
  assert.match(app, /urlParams\.get\('prop'\)/);
  assert.match(app, /String\(p\.id\) === propId/);
  assert.match(app, /MAVO_PUBLIC_SITE_URL/);
});

test('migration requires an explicit immutable office number', function () {
  const sql = read('supabase/migrations/20260903150000_office_canonical_publication.sql');
  assert.match(sql, /alter column id drop identity if exists/i);
  assert.match(sql, /add column if not exists updated_at timestamptz not null default now\(\)/i);
  assert.match(sql, /check \(id > 0\)/i);
  assert.match(sql, /new\.office_property_id is null or btrim\(new\.office_property_id\) = ''/i);
  assert.match(sql, /before insert on public\.properties/i);
  assert.match(sql, /old\.office_property_id is not null/i);
  assert.match(sql, /before update of id, office_property_id/i);
  assert.match(sql, /revoke all privileges .* anon, authenticated/i);
  assert.doesNotMatch(read('db.js'), /select=\*/);
});

test('browser projection exactly matches the anonymous column grant', function () {
  const db = require('../db.js');
  const sql = read('supabase/migrations/20260903150000_office_canonical_publication.sql');
  const match = sql.match(/grant select \(([\s\S]*?)\) on table public\.properties to anon, authenticated;/i);
  assert.ok(match, 'anonymous column grant is missing');
  const grantedColumns = match[1].split(',').map(function (column) { return column.trim(); });
  const mediaSql=read('supabase/migrations/202610090001_public_media_manifest.sql');
  const mediaGrant=mediaSql.match(/grant select \(([^)]+)\) on table public\.properties to anon, authenticated;/i);
  assert.ok(mediaGrant,'additive public media grant is missing');
  grantedColumns.push(...mediaGrant[1].split(',').map(column=>column.trim()));
  assert.deepEqual(grantedColumns, db.PUBLIC_PROPERTY_COLUMNS);
  assert.ok(!grantedColumns.includes('office_property_id'));
  assert.ok(!grantedColumns.includes('office_updated_at'));
  assert.ok(!grantedColumns.includes('updated_at'));
});

test('null square-meter values are omitted from rendering', function () {
  const app = read('app.js');
  const search = read('search.html');
  assert.match(app, /hasDisplayValue\(p\.sqm\)/);
  assert.match(search, /hasDisplayValue\(p\.sqm\)/);
  assert.doesNotMatch(app, /document\.getElementById\('modalFeatures'\)\.innerHTML = p\.rooms/);
  assert.doesNotMatch(search, /const featLine = p\.rooms/);
});
