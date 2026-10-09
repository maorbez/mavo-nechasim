const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('standalone RTL gallery advances on a rightward swipe and ignores vertical scrolling', () => {
  const element = () => ({ handlers: {}, attrs: {}, hidden: true,
    addEventListener(name, fn) { this.handlers[name] = fn; },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name]; }, scrollIntoView() {} });
  const ids = Object.fromEntries(['stage','main-photo','counter','notice','load-error','next','previous'].map(id => [id, element()]));
  const thumbnails = Array.from({length:7}, (_, i) => {
    const item = element();
    item.querySelector = () => ({ getAttribute: () => `photo-${i + 1}.webp` });
    return item;
  });
  const document = { ...element(), getElementById: id => ids[id], querySelectorAll: selector => selector === '.thumbnail' ? thumbnails : [ids.stage] };
  const script = fs.readFileSync(path.join(__dirname, '../gallery/79d7d2d1c9c2a6db/gallery.js'), 'utf8');
  vm.runInNewContext(script, {document, setTimeout: () => 1, clearTimeout() {}});
  ids.stage.handlers.touchstart({touches:[{clientX:100,clientY:100}]});
  ids.stage.handlers.touchend({changedTouches:[{clientX:220,clientY:110}]});
  assert.equal(ids['main-photo'].src, 'photo-2.webp');
  ids.stage.handlers.touchstart({touches:[{clientX:100,clientY:100}]});
  ids.stage.handlers.touchend({changedTouches:[{clientX:110,clientY:260}]});
  assert.equal(ids['main-photo'].src, 'photo-2.webp');
  ids.previous.handlers.click();
  assert.equal(ids['main-photo'].src, 'photo-1.webp');
  ids.previous.handlers.click();
  assert.equal(ids['main-photo'].src, 'photo-7.webp');
});
