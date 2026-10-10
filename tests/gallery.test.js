'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');
function gallery(direction) {
  const handlers = {};
  const element = () => ({style:{},dataset:{},children:[],events:{},classList:{contains:()=>true,add(){},remove(){}},
    addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},appendChild(child){child.parent=this;this.children.push(child);},
    querySelector(selector){return selector==='.lb-photo-notice'?this.children.find(child=>child.className?.includes('lb-photo-notice'))||null:null;},
    querySelectorAll(){return [];},remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}});
  const elements = { lightboxImg: element(), lbCounter: element(), lightbox: element() };
  const context = vm.createContext({
    MavoPhoto: { setSource(image, url) { image.src = url; image.protectedSource = url; } },
    document: { createElement:element,getElementById: id => elements[id] || null, querySelector: () => null, querySelectorAll: () => [],
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
test('legacy image failure shows an unavailable notice and cannot open a failed photo', () => {
  const g = gallery('rtl');
  const main = {style:{removeProperty(){}},classList:{remove(){}},dataset:{},children:[],contains(image){return this.children.includes(image);},
    appendChild(image){this.children.push(image);},replaceChildren(){this.children=[];}};
  g.context.showGalleryItem(main,'two');
  const image=main.children[0];
  assert.equal(typeof image.events.error,'function');
  image.events.error();
  assert.equal(main.dataset.lightbox,'');assert.equal(main.style.cursor,'default');
  assert.equal(main.children[0].textContent,'התמונה אינה זמינה כרגע');
});
test('fullscreen failure shows an unavailable state and next navigation clears it', () => {
  const g=gallery('rtl');
  g.key('ArrowLeft');
  assert.equal(typeof g.elements.lightboxImg.onerror,'function');
  g.elements.lightboxImg.onerror();
  assert.equal(g.elements.lightbox.querySelector('.lb-photo-notice').textContent,'התמונה אינה זמינה כרגע');
  assert.equal(g.elements.lightboxImg.style.display,'none');
  g.key('ArrowLeft');
  assert.equal(g.elements.lightbox.querySelector('.lb-photo-notice'),null);
  assert.equal(g.elements.lightboxImg.src,'three');
  assert.equal(g.elements.lightboxImg.style.display,'');
});
test('lightbox navigation renders protected bytes without changing the source photo sequence', () => {
  const g = gallery('rtl');
  g.context.MavoPhoto.setSource = (image, url) => { image.src = 'blob:protected-' + url; };
  g.key('ArrowLeft'); assert.equal(g.elements.lightboxImg.src, 'blob:protected-two');
  g.key('ArrowLeft'); assert.equal(g.elements.lightboxImg.src, 'blob:protected-three');
  assert.equal(g.elements.lbCounter.textContent, '3 / 3');
});
test('legacy gallery and initial lightbox use the renderer while retaining the original click destination', () => {
  const g = gallery('rtl');
  const main = { style:{removeProperty(){}}, classList:{remove(){}}, dataset:{}, children:[], appendChild(image){this.children.push(image);} };
  g.context.document.createElement = () => ({addEventListener(){}});
  g.context.MavoPhoto.setSource = (image, url) => { image.src = 'blob:protected-' + url; };
  g.context.showGalleryItem(main, 'two');
  assert.equal(main.children[0].src, 'blob:protected-two');
  assert.equal(main.dataset.lightbox, 'two');
  Object.assign(g.elements.lightbox, {dataset:{}, querySelector:selector=>['.lb-video','.lb-photo-notice'].includes(selector)?null:{}, querySelectorAll:()=>[], classList:{add(){}}});
  g.elements.lightboxImg.style = {};
  g.context.openLightbox('two');
  assert.equal(g.elements.lightboxImg.src, 'blob:protected-two');
  assert.equal(g.elements.lbCounter.textContent, '2 / 3');
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

test('gallery follows natural dimensions and ignores late events from replaced media', () => {
  const g = gallery('rtl');
  const style={setProperty(k,v){this[k]=v;}};
  const media={naturalWidth:1920,naturalHeight:1080};
  const main={style,contains:n=>n===media};
  g.context.fitGalleryMedia(main,media);
  assert.equal(style['--media-ratio'],'1920 / 1080');
  media.naturalWidth=900;media.naturalHeight=1600;
  g.context.fitGalleryMedia(main,media);
  assert.equal(style['--media-ratio'],'900 / 1600');
  g.context.fitGalleryMedia(main,{videoWidth:4000,videoHeight:1000});
  assert.equal(style['--media-ratio'],'900 / 1600');
  media.naturalWidth=0;
  g.context.fitGalleryMedia(main,media);
  assert.equal(style['--media-ratio'],'900 / 1600');
});
