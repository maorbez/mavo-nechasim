'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {propertyNumber,chatUrl}=require('../wa.js');

test('a property number opens a prefilled chat about that exact property',()=>{
  const url=new URL(chatUrl('?prop=50'));
  assert.equal(url.origin+url.pathname,'https://wa.me/972548026123');
  const text=url.searchParams.get('text');
  assert.match(text,/נכס #50 /);
  assert.doesNotMatch(text,/[\u{1F000}-\u{1FFFF}]/u,'WhatsApp breaks emoji in prefilled text');
  assert.ok(text.endsWith('https://mavorealestate.com/?prop=50'));
});

test('anything but a positive office number falls back to a plain chat',()=>{
  for(const bad of ['','?prop=0','?prop=-3','?prop=5.5','?prop=12abc','?prop=%3Cscript%3E','?prop=05','?x=50','?prop=12345678901'])
    assert.equal(chatUrl(bad),'https://wa.me/972548026123',bad);
  assert.equal(propertyNumber('?prop=97&utm=fb'),'97');
});

test('the page works without inline script and never asks to be indexed',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','wa.html'),'utf8');
  assert.match(html,/script-src 'self'/);
  assert.doesNotMatch(html,/<script>(?!<\/script>)/);
  assert.match(html,/noindex/);
  assert.match(html,/id="go" href="https:\/\/wa\.me\/972548026123"/);
});
