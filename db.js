// Mavo Nechasim public inventory reader.
// Writes belong to the trusted server publisher; this browser module is read-only.
(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (root) Object.assign(root, api);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? null : window, function (root) {
  'use strict';

  const DEFAULT_SUPABASE_URL = 'https://tnkiwgewdancvmkhzlwz.supabase.co';
  // Browser-safe publishable key. Never put a service-role key in this repository.
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_vuUxH_RK_QqsRRGyUM165w_MQV4uq4j';
  const PUBLIC_SITE_URL = 'https://mavorealestate.com/';
  const STATUS_ID = 'mavo-data-status';
  const mediaApi = root && root.MavoMedia || (typeof require === 'function' ? require('./public-media.js') : null);
  const PUBLIC_PROPERTY_COLUMNS = [
    'id', 'type', 'price', 'price_label', 'title', 'location', 'rooms', 'baths', 'sqm',
    'extra', 'description', 'emoji', 'bg', 'lat', 'lng', 'photos', 'has_elevator',
    'has_shelter', 'has_parking', 'active', 'media_manifest'
  ];

  function canonicalPropertyId(value) {
    const id = typeof value === 'number' ? value : Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Property row is missing a positive office-assigned id');
    }
    return id;
  }

  function verifiedPropertyList(value) {
    if (!Array.isArray(value)) throw new Error('Property source returned an invalid list');
    return value.map(function (property) {
      return Object.assign({}, property, { id: canonicalPropertyId(property.id) });
    });
  }

  function formatPropertyPrice(price, label) {
    const text = String(label || price || '').trim();
    if (!text) return 'מחיר בתיאום';
    // Keep qualifiers such as monthly rent; normalize only monetary numbers.
    if (!/\d/.test(text)) return text;
    const amount = text.replace(/₪|ש["״׳']?ח/g, '').trim()
      .replace(/\d[\d,]*(?:\.\d+)?/g, value => {
        const [integer, fraction] = value.replace(/,/g, '').split('.');
        return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? '.' + fraction : '');
      }).replace(/\s+/g, ' ');
    return '₪ ' + amount;
  }

  // The public projection has no balcony-area column. Read only an explicit
  // balcony measurement from the approved copy, never a count or apartment area.
  function balconyAreaFromDescription(description) {
    const text = String(description || '');
    const match = text.match(/מרפס(?:ת|ות)\s+בשטח(?:\s+כולל)?(?:\s+של)?\s+(\d+(?:\.\d+)?)\s*מ["״']?ר/);
    return match && Number(match[1]) > 0 ? Number(match[1]) : null;
  }

  function mapDbRow(row) {
    // Server-owned marker in the existing public projection; no private address is fetched.
    const approximate = row.extra === 'מיקום משוער';
    return {
      publicLocationMode: approximate ? 'approximate' : 'exact',
      // Public id is the immutable property_number allocated by Office CRM.
      id: canonicalPropertyId(row.id),
      type: row.type,
      title: row.title,
      price: row.price,
      priceLabel: formatPropertyPrice(row.price, row.price_label),
      location: row.location,
      rooms: row.rooms,
      baths: row.baths,
      sqm: row.sqm,
      balconySqm: balconyAreaFromDescription(row.description),
      extra: approximate ? '' : row.extra,
      desc: row.description,
      emoji: row.emoji || '🏠',
      bg: row.bg || 'linear-gradient(135deg,#1a3a5c,#2d6a9f)',
      lat: approximate ? null : row.lat,
      lng: approximate ? null : row.lng,
      photos: Array.isArray(row.photos) ? row.photos : [],
      media_manifest: row.media_manifest == null ? null : mediaApi ? mediaApi.sanitizeManifest(row.media_manifest) : {version:0,cover_media_id:'',items:[]},
      hasElevator: row.has_elevator === true,
      hasShelter: row.has_shelter === true,
      hasParking: row.has_parking === true,
      thumbs: ['🏠', '🛋️', '🚿', '🌅'],
      agent: { name: 'מבוא נכסים', title: 'צרו קשר', color: '#1565C0', init: 'ג', phone: '054-802-6123' },
      active: row.active !== false
    };
  }

  async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
    if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable');
    if (typeof AbortController === 'undefined') return fetchImpl(url, init);

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      return await fetchImpl(url, Object.assign({}, init, { signal: controller.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  function catalogProvider(options) {
    const provider = options.provider || (root && root.MAVO_CATALOG_PROVIDER) || 'cloudflare';
    if (!['cloudflare', 'supabase'].includes(provider)) throw new Error('Unsupported public catalog provider');
    return provider;
  }

  function catalogApiOrigin(value) {
    if (value == null || value === '') return '';
    if (typeof value !== 'string' || !/^https:\/\/[^/]+\/?$/.test(value)) throw new Error('Catalog API requires an HTTPS origin');
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('Catalog API requires an HTTPS origin');
    }
    return url.origin;
  }

  function exactKeys(value, allowed, required) {
    return value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).every(key => allowed.includes(key)) &&
      required.every(key => Object.prototype.hasOwnProperty.call(value, key));
  }

  // Defense in depth over the Worker's exact public projection. A malformed row
  // makes the whole read unavailable; it cannot silently expose private fields.
  function validatePublicProjection(row) {
    const fail = function () { throw new Error('Unverified public catalog projection'); };
    if (!exactKeys(row, PUBLIC_PROPERTY_COLUMNS, PUBLIC_PROPERTY_COLUMNS) ||
        typeof row.id !== 'number' || canonicalPropertyId(row.id) !== row.id || row.active !== true ||
        !['rent', 'sale', 'commercial-rent', 'commercial-sale'].includes(row.type)) fail();
    for (const key of ['price', 'price_label', 'title', 'location', 'extra', 'description', 'emoji', 'bg']) {
      if (typeof row[key] !== 'string' || row[key].length > 12000) fail();
    }
    for (const key of ['has_elevator', 'has_shelter', 'has_parking']) if (typeof row[key] !== 'boolean') fail();
    for (const key of ['rooms', 'baths', 'sqm']) {
      const value = row[key];
      if (value !== null && value !== '' && !(typeof value === 'number' && Number.isFinite(value) && value >= 0) &&
          !(typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))) fail();
    }
    for (const [key, min, max] of [['lat', -90, 90], ['lng', -180, 180]]) {
      if (row[key] !== null && !(typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= min && row[key] <= max)) fail();
    }
    if (row.extra === 'מיקום משוער' && (row.lat !== null || row.lng !== null)) fail();
    if (!mediaApi || !Array.isArray(row.photos) || row.photos.length > 80 || !row.photos.every(mediaApi.safePublicUrl)) fail();
    const immutableAsset = function (value) {
      if (!mediaApi.safePublicUrl(value)) return false;
      const url = new URL(value);
      const path = url.pathname.replace(/^\/storage\/v1\/object\/public\/property-photos/, '');
      return new RegExp('^/property-' + row.id + '/revision-[1-9][0-9]*/[0-9]{2,3}-[a-f0-9]{64}\\.(jpg|png|webp|mp4)$').test(path);
    };
    // Legacy bucket photos are retained only for explicit recovery compatibility.
    // R2 media and every explicit manifest are bound to this Office number.
    if (row.photos.some(value => new URL(value).origin === 'https://media.mavorealestate.com' && !immutableAsset(value))) fail();
    const manifest = row.media_manifest;
    if (manifest !== null) {
      if (!exactKeys(manifest, ['version', 'cover_media_id', 'items'], ['version', 'cover_media_id', 'items']) ||
          manifest.version !== 1 || !Array.isArray(manifest.items) || !manifest.items.length || manifest.items.length > 80) fail();
      for (const item of manifest.items) {
        if (!exactKeys(item, ['id', 'type', 'url', 'poster_url', 'fallback_url'], ['id', 'type', 'url'])) fail();
        const image = value => typeof value === 'string' && immutableAsset(value) && /\.(jpg|png|webp)$/.test(value);
        if (item.type === 'image') {
          if (!image(item.url) || ['poster_url', 'fallback_url'].some(key => item[key] !== undefined && !image(item[key]))) fail();
        } else if (item.type === 'video') {
          if (typeof item.url !== 'string' || !immutableAsset(item.url) || !item.url.endsWith('.mp4') || !image(item.poster_url) || !image(item.fallback_url)) fail();
        } else fail();
      }
      if (mediaApi.resolve({media_manifest:manifest}).mode !== 'explicit') fail();
    }
    return row;
  }

  async function fetchPropertiesFromDB(options) {
    const opts = options || {};
    const provider = catalogProvider(opts);
    const fetchImpl = opts.fetchImpl || (root && root.fetch
      ? root.fetch.bind(root)
      : (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null));
    let url;
    const headers = { Accept: 'application/json' };
    if (provider === 'supabase') {
      // Deliberate recovery switch only. An outage never selects this provider.
      const supabaseUrl = opts.supabaseUrl || (root && root.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
      const supabaseKey = opts.supabaseKey || (root && root.SUPABASE_KEY) || DEFAULT_SUPABASE_KEY;
      url = catalogApiOrigin(supabaseUrl) + '/rest/v1/properties?select=' + PUBLIC_PROPERTY_COLUMNS.join(',') + '&active=eq.true&order=id.asc';
      headers.apikey = supabaseKey;
      headers.Authorization = 'Bearer ' + supabaseKey;
    } else {
      const origin = opts.apiOrigin !== undefined ? opts.apiOrigin : root && root.MAVO_CATALOG_API_ORIGIN;
      url = catalogApiOrigin(origin) + '/api/properties';
    }
    const response = await fetchWithTimeout(fetchImpl, url, {
      cache: 'no-store', credentials: 'omit', redirect: 'error', headers
    }, opts.timeoutMs || 8000);
    if (!response.ok) throw new Error('Public catalog ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || data.length > 1000) throw new Error('Public catalog returned an invalid property list');
    const ids = new Set();
    return data.map(function (row) {
      if (provider === 'cloudflare') validatePublicProjection(row);
      const property = mapDbRow(row);
      if (property.active !== true || ids.has(property.id)) throw new Error('Public catalog returned inactive or duplicate rows');
      ids.add(property.id);
      return property;
    }).sort((a, b) => a.id - b.id);
  }

  function renderPropertyDataStatus(result) {
    if (!root || !root.document || !root.document.body) return;
    const existing = root.document.getElementById(STATUS_ID);
    if (!result.degraded) {
      if (existing) existing.remove();
      return;
    }

    const banner = existing || root.document.createElement('div');
    banner.id = STATUS_ID;
    banner.setAttribute('role', result.source === 'unavailable' ? 'alert' : 'status');
    banner.setAttribute('dir', 'rtl');
    banner.style.cssText = 'position:relative;z-index:1000;padding:11px 18px;text-align:center;font:700 14px/1.5 Heebo,Arial,sans-serif;color:#5b3b00;background:#fff3cd;border-bottom:1px solid #e7bd57;';
    banner.textContent = result.source === 'unavailable'
      ? 'מאגר הנכסים החי אינו זמין כרגע, ואין כרגע תמונת מצב מאומתת להצגה.'
      : 'מאגר הנכסים החי אינו זמין כרגע. מוצגת תמונת מצב שמורה שעשויה להיות לא מעודכנת.';
    banner.dataset.source = result.source;
    if (!existing) root.document.body.insertBefore(banner, root.document.body.firstChild);
  }

  async function loadMavoProperties(options) {
    const opts = options || {};
    const liveLoader = opts.fetchLive || function () { return fetchPropertiesFromDB(opts); };
    let result;
    try {
      const properties = verifiedPropertyList(await liveLoader());
      result = { properties, source: catalogProvider(opts), degraded: false, error: null };
    } catch (error) {
      // Privacy choices may have changed since any snapshot/cache was created.
      // Without current server authorization, never revive old public addresses.
      result = { properties: [], source: 'unavailable', degraded: true, error };
    }
    if (opts.renderStatus !== false) renderPropertyDataStatus(result);
    return result;
  }

  return {
    MAVO_PUBLIC_SITE_URL: PUBLIC_SITE_URL,
    PUBLIC_PROPERTY_COLUMNS: PUBLIC_PROPERTY_COLUMNS,
    canonicalPropertyId: canonicalPropertyId,
    verifiedPropertyList: verifiedPropertyList,
    mapDbRow: mapDbRow,
    validatePublicProjection: validatePublicProjection,
    fetchPropertiesFromDB: fetchPropertiesFromDB,
    loadMavoProperties: loadMavoProperties,
    renderPropertyDataStatus: renderPropertyDataStatus
  };
});
