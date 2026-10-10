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
      createElement: () => ({ setAttribute() {}, style: {} }),
      body: { appendChild: node => nodes.push(node) },
    };
    const location = { search: `?prop=40&lang=${choice}` };
    vm.runInNewContext(code, { URLSearchParams, location, document, window: {}, sessionStorage: {getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)} });
    listeners.forEach(fn => fn());
    assert.equal(stored.get('globes_lang'), expected);
    assert.equal(location.search, `?prop=40&lang=${choice}`);
    assert.equal(nodes.filter(n => n.src).length, ['en', 'ar'].includes(choice) ? 1 : 0);
  }
});
