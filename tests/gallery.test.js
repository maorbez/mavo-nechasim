'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');
function gallery(direction) {
  const handlers = {};
  const elements = { lightboxImg: {}, lbCounter: {}, lightbox: { classList: { contains: () => true } } };
  const context = vm.createContext({
    document: { getElementById: id => elements[id] || null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener: (name, fn) => { handlers[name] = fn; } },
    getComputedStyle: () => ({ direction })
  });
  vm.runInContext(code.slice(code.indexOf('let _galleryImages'), code.indexOf('function closeModal(e)')), context);
  vm.runInContext('_galleryImages = ["one", "two", "three"]; _lbIndex = 0;', context);
  return { context, elements, key: key => handlers.keydown({ key, preventDefault() {} }) };
}
test('Hebrew gallery advances left and goes back right, with wraparound', () => {
  const g = gallery('rtl');
  g.key('ArrowLeft'); assert.equal(g.elements.lightboxImg.src, 'two');
  g.key('ArrowRight'); assert.equal(g.elements.lightboxImg.src, 'one');
  g.key('ArrowRight'); assert.equal(g.elements.lightboxImg.src, 'three');
});
test('English gallery keeps right-forward navigation and repeated clicks advance once each', () => {
  const g = gallery('ltr');
  g.key('ArrowRight'); assert.equal(g.elements.lightboxImg.src, 'two');
  vm.runInContext('lightboxNav(1); lightboxNav(1);', g.context);
  assert.equal(g.elements.lightboxImg.src, 'one');
  assert.equal(g.elements.lbCounter.textContent, '1 / 3');
});

test('property gallery puts all videos first without mutating office media order', () => {
  const start = code.indexOf('function isVideoUrl');
  const end = code.indexOf('// Build a safe DOM player node', start);
  const context = vm.createContext({}); vm.runInContext(code.slice(start,end),context);
  const input = ['photo.jpg','tour.mp4','second.jpg','https://youtu.be/123456789ab','last.webm'];
  assert.deepEqual(Array.from(context.orderPropertyMedia(input)), ['tour.mp4','https://youtu.be/123456789ab','last.webm','photo.jpg','second.jpg']);
  assert.equal(input[0], 'photo.jpg');
  assert.deepEqual(Array.from(context.orderPropertyMedia(null)), []);
});
