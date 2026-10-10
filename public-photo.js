/* Public presentation only: never writes back to Office or the media provider. */
(function (root) {
  'use strict';
  const doc = root.document;
  const enabled = !/^\/office(?:\/|$)/.test(root.location.pathname);
  const states = new WeakMap();
  const protectedElements = new WeakSet();
  let artworkPromise;
  let fallbacksPromise;

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
      source.src = url;
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

  async function render(url) {
    const [source, badge] = await Promise.all([publicSource(url), artwork()]);
    const canvas = doc.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context || !source.naturalWidth || !source.naturalHeight) throw new Error('Public photo unavailable');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const { side, margin } = geometry(canvas.width, canvas.height);
    context.drawImage(badge, margin, margin, side, side);
    try {
      return await new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Public photo unavailable')), 'image/png');
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
    dispose,
    geometry
  };
})(window);
