const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const languages = ['en', 'fr', 'de', 'es', 'ar'];
test('search engines can reach every language without executing translation scripts', () => {
  for (const lang of languages) {
    const file = path.join(root, lang, 'index.html');
    assert.ok(fs.existsSync(file), `missing crawlable ${lang} entry page`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp(`<html lang="${lang}"`));
    assert.match(html, new RegExp(`rel="canonical" href="https://mavorealestate.com/${lang}/"`));
    assert.ok(html.match(/<p>/g).length >= 6, `${lang} has actual static content`);
    assert.doesNotMatch(html, /google\.translate|translate_a/);
    for (const variant of ['he', ...languages]) {
      assert.match(html, new RegExp(`hreflang="${variant}"`));
    }
    for (const [, href] of html.matchAll(/href="(\/[^"?#]*)(?:[^\"]*)"/g)) {
      const target = href.endsWith('/') ? href + 'index.html' : href;
      assert.ok(fs.existsSync(path.join(root, target)), `broken local destination ${href}`);
    }
    assert.match(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), new RegExp(`https://mavorealestate.com/${lang}/`));
  }
});
test('Hebrew entry links reciprocally to every language and protects the brand', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const lang of languages) assert.match(html, new RegExp(`hreflang="${lang}"`));
  assert.match(html, /class="logo-main" translate="no"/);
});

test('explicit catalog language preserves query IDs, initializes translation and ignores unsupported languages', () => {
  const vm = require('node:vm');
  const code = fs.readFileSync(path.join(root, 'language-bridge.js'), 'utf8');
  for (const [choice, expected] of [['en', 'en'], ['ar', 'ar'], ['he', 'iw'], ['invalid', undefined]]) {
    const stored = new Map();
    const listeners = [];
    const nodes = [];
    const document = {
      cookie: '',
      addEventListener: (name, callback) => listeners.push(callback),
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => ({ setAttribute() {}, addEventListener() {}, querySelector:()=>({appendChild(){}}), style: {} }),
      body: { appendChild: node => nodes.push(node) },
    };
    const location = { search: `?prop=40&lang=${choice}` };
    vm.runInNewContext(code, { URLSearchParams, location, document, window: {}, sessionStorage: {getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)} });
    listeners.forEach(fn => fn());
    assert.equal(stored.get('globes_lang'), expected);
    assert.equal(location.search, `?prop=40&lang=${choice}`);
    assert.equal(nodes.filter(n => n.src).length, 1);
  }
});

test('language selection keeps property, filters and hash on the current public page', () => {
  const vm = require('node:vm');
  const code = fs.readFileSync(path.join(root, 'language-bridge.js'), 'utf8');
  for (const lang of ['en', 'fr', 'de', 'es', 'ar', 'he']) {
    const stored = new Map();
    const window = {};
    const location = {href:'https://mavorealestate.com/index.html?prop=40&type=sale#details', search:'?prop=40&type=sale', hostname:'mavorealestate.com', pathname:'/index.html'};
    const document = {cookie:'',querySelector:()=>null,addEventListener(){}};
    vm.runInNewContext(code,{URL,URLSearchParams,location,document,window,sessionStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)}});
    assert.equal(typeof window.mavoSetLanguage, 'function');
    window.mavoSetLanguage(lang);
    const target = new URL(location.href);
    assert.equal(target.pathname,'/index.html');
    assert.equal(target.searchParams.get('prop'),'40');
    assert.equal(target.searchParams.get('type'),'sale');
    assert.equal(target.hash,'#details');
    assert.equal(target.searchParams.get('lang'),lang);
    assert.equal(stored.get('globes_lang'),lang==='he'?'iw':lang);
  }
});

test('a ready translator switches language without reloading or losing page state', () => {
  const vm = require('node:vm');
  const stored = new Map();
  const window = {};
  const original = 'https://mavorealestate.com/search.html?type=sale#results';
  const location = {href:original,search:'?type=sale'};
  const combo = {value:'',dispatchEvent(){this.changed=true;}};
  const menu = {open:true};
  const buttons = ['en','ar'].map(lang=>({lang,setAttribute(k,v){this[k]=v;}}));
  let currentUrl;
  const document = {addEventListener(){}, querySelector:s=>s==='.goog-te-combo'?combo:menu,querySelectorAll:()=>buttons,documentElement:{classList:{toggle(){}}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'language-bridge.js'),'utf8'),{URL,URLSearchParams,location,document,window,Event:class{},history:{replaceState(a,b,url){currentUrl=url;}},sessionStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)}});
  window.mavoSetLanguage('ar');
  assert.equal(location.href,original,'must not trigger page navigation');
  assert.equal(new URL(currentUrl).searchParams.get('type'),'sale');
  assert.equal(new URL(currentUrl).hash,'#results');
  assert.equal(combo.value,'ar');
  assert.equal(combo.changed,true);
  assert.equal(document.documentElement.dir,'rtl');
  assert.equal(buttons[1]['aria-pressed'],'true');
  assert.equal(menu.open,false);
});
