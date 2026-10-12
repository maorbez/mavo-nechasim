'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function fixture(pathname = '/', extras = {}) {
  const pending = [], draws = [], revoked = [], blobs = [];
  const document = {
    documentElement: {},
    createElement() {
      return {
        width: 0, height: 0,
        getContext: () => ({ drawImage: (...args) => draws.push(args) }),
        toBlob(callback) { const blob = { branded: true }; blobs.push(blob); callback(blob); }
      };
    }
  };
  class Image {
    set src(url) { this.url = url; pending.push(this); }
  }
  const window = { document, location: { pathname }, Image, Event: class { constructor(type) { this.type = type; } },
    URL: { createObjectURL: blob => 'blob:' + blobs.indexOf(blob), revokeObjectURL: url => revoked.push(url) }, ...extras
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public-photo.js'), 'utf8'), { window });
  const element = () => ({ dataset: {}, style: {}, events: {}, attributes: {},
    addEventListener(name, fn) { this.events[name] = fn; },
    dispatchEvent(event) { this.events[event.type]?.(event); },
    removeAttribute(key) { delete this[key]; }
  });
  const resolve = url => {
    const source = pending.find(item => item.url === url);
    assert.ok(source, 'source was requested');
    source.naturalWidth = 1280; source.naturalHeight = 960; source.onload();
  };
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return { api: window.MavoPhoto, pending, draws, revoked, element, resolve, flush };
}

test('public images display branded blob bytes, preserve source geometry and block ordinary copying', async () => {
  const f = fixture(), img = f.element();
  f.api.setSource(img, 'https://public.example/room.jpg');
  assert.equal(img.src, undefined, 'no unbranded flash');
  assert.equal(img.draggable, false);
  assert.equal(f.pending[0].crossOrigin, 'anonymous');
  f.resolve('https://public.example/room.jpg'); f.resolve('/assets/brand/photo-badge-v5.png'); await f.flush();
  assert.match(img.src, /^blob:/); assert.equal(img.dataset.mavoPhoto, 'ready');
  assert.deepEqual(f.draws[0].slice(1), [0, 0, 1280, 960]);
  assert.deepEqual(f.draws[1].slice(1), [24, 24, 307, 307]);
  let prevented = 0;
  for (const type of ['contextmenu', 'dragstart', 'copy']) img.events[type]({ preventDefault() { prevented++; } });
  assert.equal(prevented, 3);
});

test('late photo completion cannot replace a newly selected photo', async () => {
  const f = fixture(), img = f.element();
  f.api.setSource(img, 'old.jpg'); f.api.setSource(img, 'new.jpg');
  f.resolve('new.jpg'); f.resolve('/assets/brand/photo-badge-v5.png'); await f.flush();
  const displayed = img.src;
  f.resolve('old.jpg'); await f.flush();
  assert.equal(img.src, displayed);
  f.api.dispose(img); assert.deepEqual(f.revoked, [displayed]);
});

test('failed cross-origin rendering signals fallback without exposing the raw photo', async () => {
  const f = fixture(), img = f.element(); let errors = 0;
  img.addEventListener('error', () => errors++);
  f.api.setSource(img, 'broken.jpg'); f.pending[0].onerror(); await f.flush();
  assert.equal(errors, 1); assert.equal(img.src, undefined); assert.equal(img.dataset.mavoPhoto, 'unavailable');
});

test('the Office route stays open and never requests the badge or transforms a source', () => {
  const f = fixture('/office/crm'), img = f.element(), thumb = f.element();
  f.api.setSource(img, '/office/media/original.jpg'); f.api.setBackground(thumb, '/office/media/original.jpg');
  assert.equal(img.src, '/office/media/original.jpg'); assert.equal(img.dataset.mavoPhoto, undefined);
  assert.equal(img.events.contextmenu, undefined); assert.equal(f.pending.length, 0);
  assert.ok(thumb.style.backgroundImage.includes('/office/media/original.jpg'));
});

test('CSS thumbnails and video posters use branded bytes too, and replacement revokes old blobs', async () => {
  const f = fixture(), thumbnail = f.element(), video = f.element();
  f.api.setBackground(thumbnail, 'one.jpg'); f.resolve('one.jpg'); f.resolve('/assets/brand/photo-badge-v5.png'); await f.flush();
  assert.match(thumbnail.style.backgroundImage, /^url\("blob:/);
  f.api.setBackground(thumbnail, 'two.jpg'); assert.equal(thumbnail.style.backgroundImage, 'none');
  assert.deepEqual(f.revoked, ['blob:0']);
  f.api.setPoster(video, 'poster.jpg'); f.resolve('poster.jpg'); await f.flush();
  assert.match(video.poster, /^blob:/); assert.equal(video.src, undefined, 'video playback URL was not touched');
});

test('a CORS-blocked public source can use only its exact verified local derivative mapping', async () => {
  const crypto = require('node:crypto'), source = 'https://media.postify.co.il/public-room.jpg';
  const key = crypto.createHash('sha256').update(source).digest('hex');
  const local = '/assets/property-photos/v5/' + 'a'.repeat(64) + '.webp';
  let reads = 0;
  const f = fixture('/', { crypto: crypto.webcrypto, TextEncoder,
    fetch: async url => { assert.equal(url, '/public-photo-fallbacks.json'); reads++; return { ok: true, json: async () => ({ [key]: local }) }; }
  });
  const img = f.element(); f.api.setSource(img, source); f.pending[0].onerror();
  for (let i=0; i<10 && !f.pending.some(item => item.url === local); i++) await f.flush();
  f.resolve(local); f.resolve('/assets/brand/photo-badge-v5.png'); await f.flush();
  assert.match(img.src, /^blob:/); assert.equal(reads, 1);
});

test('the deployed fallback map cannot route around a catalog withdrawal', () => {
  const path = require('node:path');
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, '../public-photo-fallbacks.json'), 'utf8'));
  assert.deepEqual(map, {}, 'legacy recovery code must not have a public static-photo route');
});

test('the Pages release contains no static catalog-photo copies outside the active-media gate', () => {
  const path = require('node:path');
  const directory = path.join(__dirname, '../assets/property-photos');
  function files(root) {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
      const filename = path.join(root, entry.name);
      return entry.isDirectory() ? files(filename) : [filename];
    });
  }
  assert.equal(files(directory).length, 0, 'Pages can serve these known files even after a D1 withdrawal');
});

test('public photo requests use configured delivery without altering source identity',async()=>{
 const canonical='https://media.mavorealestate.com/property-42/revision-3/00-'+('a'.repeat(64))+'.webp';
 const delivery='https://mavo-catalog-pilot-20261011.maor-bezalel.workers.dev'+new URL(canonical).pathname;
 const f=fixture('/',{MavoMedia:{deliveryUrl:url=>url===canonical?delivery:url}}),img=f.element();
 f.api.setSource(img,canonical);assert.ok(f.pending.some(item=>item.url===delivery));assert.ok(!f.pending.some(item=>item.url===canonical));
 f.resolve(delivery);f.resolve('/assets/brand/photo-badge-v5.png');await f.flush();assert.match(img.src,/^blob:/);
});

test('a denied gated asset never requests a local legacy fallback',async()=>{
 let requests=0;const canonical='https://media.mavorealestate.com/property-42/revision-3/00-'+('a'.repeat(64))+'.webp';
 const crypto=require('node:crypto');const f=fixture('/',{crypto:crypto.webcrypto,TextEncoder,fetch:async()=>{requests++;throw Error('must not revive');}}),img=f.element();
 f.api.setSource(img,canonical);f.pending[0].onerror();await f.flush();assert.equal(requests,0);assert.equal(img.dataset.mavoPhoto,'unavailable');assert.equal(img.dataset.mavoSourceUrl,canonical);
});
