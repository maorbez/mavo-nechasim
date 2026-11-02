/* Public presentation only: never writes back to Office or the media provider. */
(function (root) {
  'use strict';
  const doc = root.document;
  const enabled = !/^\/office(?:\/|$)/.test(root.location.pathname);
  const states = new WeakMap();
  const protectedElements = new WeakSet();
  let artworkPromise;
  let fallbacksPromise;
  // Branded photos already drawn on this page, so reopening a property or a gallery photo is instant.
  const rendered = new Map();
  const RENDERED_LIMIT = 48;
  const MAX_SIDE = 1600;

  function geometry(width, height) {
    return {
      side: Math.min(Math.max(40, Math.round(width * .24)), Math.round(Math.min(width, height) * .32)),
      margin: Math.max(8, Math.round(Math.min(width, height) * .025))
    };
  }

  function load(url) {
    return new Promise((resolve, reject) => {
      const source = new root.Image();
      source.crossOrigin = 'anonymous';
      source.referrerPolicy = 'no-referrer';
      source.onload = () => resolve(source);
      source.onerror = () => reject(new Error('Public photo unavailable'));
      source.src = root.MavoMedia?.deliveryUrl ? root.MavoMedia.deliveryUrl(url) : url;
    });
  }

  function artwork() {
    if (!artworkPromise) {
      artworkPromise = load('/assets/brand/photo-badge-v5.png').catch(error => {
        artworkPromise = null;
        throw error;
      });
    }
    return artworkPromise;
  }

  async function publicSource(url) {
    try {
      return await load(url);
    } catch (error) {
      // A gated R2 failure is authoritative; never revive a local legacy copy.
      if (url.startsWith('https://media.mavorealestate.com/')) throw error;
      // Some legacy public hosts forbid canvas CORS. Only verified, prebuilt
      // public derivatives may replace them; never proxy Office/private media.
      if (!root.crypto?.subtle || !root.fetch) throw error;
      const digest = await root.crypto.subtle.digest('SHA-256', new root.TextEncoder().encode(url));
      const key = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
      if (!fallbacksPromise) {
        fallbacksPromise = root.fetch('/public-photo-fallbacks.json', { credentials: 'omit', cache: 'no-store' })
          .then(response => { if (!response.ok) throw error; return response.json(); })
          .catch(failure => { fallbacksPromise = null; throw failure; });
      }
      const path = (await fallbacksPromise)[key];
      if (typeof path !== 'string' || !/^\/assets\/property-photos\/v5\/[a-f0-9]{64}\.webp$/.test(path)) throw error;
      return load(path);
    }
  }

  function render(url) {
    let pending = rendered.get(url);
    if (pending) rendered.delete(url);
    else pending = draw(url).catch(error => { rendered.delete(url); throw error; });
    rendered.set(url, pending);
    while (rendered.size > RENDERED_LIMIT) rendered.delete(rendered.keys().next().value);
    return pending;
  }

  async function draw(url) {
    const [source, badge] = await Promise.all([publicSource(url), artwork()]);
    const canvas = doc.createElement('canvas');
    const scale = Math.min(1, MAX_SIDE / Math.max(source.naturalWidth || 1, source.naturalHeight || 1));
    canvas.width = Math.round(source.naturalWidth * scale);
    canvas.height = Math.round(source.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context || !source.naturalWidth || !source.naturalHeight) throw new Error('Public photo unavailable');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const { side, margin } = geometry(canvas.width, canvas.height);
    context.drawImage(badge, margin, margin, side, side);
    try {
      return await new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Public photo unavailable')), 'image/jpeg', 0.9);
      });
    } finally {
      canvas.width = canvas.height = 1;
    }
  }

  function protect(element) {
    element.dataset.mavoPhoto = 'loading';
    element.draggable = false;
    if (protectedElements.has(element)) return;
    protectedElements.add(element);
    for (const type of ['contextmenu', 'dragstart', 'copy']) {
      element.addEventListener(type, event => event.preventDefault());
    }
  }

  function dispose(element) {
    const previous = states.get(element);
    if (!previous) return;
    previous.cancelled = true;
    if (previous.observer) previous.observer.disconnect();
    if (previous.blobUrl) root.URL.revokeObjectURL(previous.blobUrl);
    states.delete(element);
  }

  function assign(element, url, kind) {
    if (!enabled) {
      if (kind === 'background') element.style.backgroundImage = 'url(' + JSON.stringify(url) + ')';
      else element[kind] = url;
      return;
    }
    dispose(element);
    protect(element);
    element.dataset.mavoSourceUrl = url;
    if (kind === 'background') element.style.backgroundImage = 'none';
    else element.removeAttribute(kind);
    const state = { cancelled: false, blobUrl: null, observer: null };
    states.set(element, state);
    const start = async () => {
      if (state.observer) state.observer.disconnect();
      try {
        const blob = await render(url);
        if (state.cancelled || states.get(element) !== state) return;
        state.blobUrl = root.URL.createObjectURL(blob);
        element.dataset.mavoPhoto = 'ready';
        if (kind === 'background') element.style.backgroundImage = 'url("' + state.blobUrl + '")';
        else element[kind] = state.blobUrl;
      } catch (_) {
        if (state.cancelled || states.get(element) !== state) return;
        element.dataset.mavoPhoto = 'unavailable';
        // Use existing image fallback/notice handlers. Never fall back to an unbranded image.
        if (kind === 'src') element.dispatchEvent(new root.Event('error'));
      }
    };
    if ((element.loading === 'lazy' || kind === 'background') && root.IntersectionObserver) {
      state.observer = new root.IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) start();
      }, { rootMargin: '300px' });
      state.observer.observe(element);
    } else start();
  }

  // Sliding gallery: the shown photo follows the finger, slides out, and the next one slides in.
  // step(+1 forward / -1 back) swaps the photo; current() returns the node now on screen.
  // Pinch and vertical scrolling pass through, and the click after a swipe is swallowed.
  // Returns go(dir) so arrow buttons slide the same way.
  function swipe(host, step, current = () => host.firstElementChild) {
    const still = root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let start = null, node = null, dragging = false, swiped = false, busy = false;
    const place = (el, x, ms, faded) => {
      if (!el?.style) return;
      el.style.transition = ms ? `transform ${ms}ms ease-out, opacity ${ms}ms ease-out` : 'none';
      el.style.transform = x ? `translateX(${x}px)` : '';
      el.style.opacity = faded ? '0' : '';
    };
    const rtl = () => root.getComputedStyle(host).direction === 'rtl';
    // Forward moves toward the reading direction, so in RTL the photo leaves to the right.
    function go(dir, from = current()) {
      if (busy) return;
      if (still || !from?.style) { step(dir); return; }
      busy = true;
      const out = ((dir > 0) === rtl() ? 1 : -1) * (host.clientWidth || 320);
      place(from, out, 160, true);
      root.setTimeout(() => {
        place(from, 0, 0);
        step(dir);
        const next = current();
        place(next, -out * .35, 0, true);
        next?.getBoundingClientRect?.();
        place(next, 0, 220);
        busy = false;
      }, 160);
    }
    host.addEventListener('touchstart', e => {
      start = e.touches.length === 1 && !busy ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      node = start && current(); dragging = false;
    }, { passive: true });
    host.addEventListener('touchmove', e => {
      if (!start) return;
      if (e.touches.length > 1) { place(node, 0, 150); start = null; return; }
      const dx = e.touches[0].clientX - start.x, dy = e.touches[0].clientY - start.y;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5) dragging = true;
      if (dragging && !still) place(node, dx, 0);
    }, { passive: true });
    host.addEventListener('touchend', e => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
      start = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) { place(node, 0, 180); return; }
      swiped = true; root.setTimeout(() => { swiped = false; }, 400);
      go((dx > 0) === rtl() ? 1 : -1, node);
    });
    host.addEventListener('touchcancel', () => { if (start) place(node, 0, 150); start = null; });
    host.addEventListener('click', e => { if (swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
    return go;
  }

  if (enabled && root.MutationObserver) {
    new root.MutationObserver(records => {
      for (const record of records) for (const node of record.removedNodes) {
        if (node.nodeType !== 1 || node.isConnected) continue;
        dispose(node);
        node.querySelectorAll('[data-mavo-photo]').forEach(dispose);
      }
    }).observe(doc.documentElement, { childList: true, subtree: true });
  }
  root.MavoPhoto = {
    setSource: (image, url) => assign(image, url, 'src'),
    setBackground: (element, url) => assign(element, url, 'background'),
    setPoster: (video, url) => assign(video, url, 'poster'),
    // Warm the cache for a photo the visitor is likely to open next.
    prefetch: url => { if (enabled && url) render(url).catch(() => {}); },
    swipe,
    dispose,
    geometry
  };
})(window);
