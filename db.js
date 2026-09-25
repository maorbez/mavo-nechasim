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
  const PUBLIC_PROPERTY_COLUMNS = [
    'id', 'type', 'price', 'price_label', 'title', 'location', 'rooms', 'baths', 'sqm',
    'extra', 'description', 'emoji', 'bg', 'lat', 'lng', 'photos', 'has_elevator',
    'has_shelter', 'has_parking', 'active'
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

  function mapDbRow(row) {
    // Server-owned marker in the existing public projection; no private address is fetched.
    const approximate = row.extra === 'מיקום משוער';
    return {
      publicLocationMode: approximate ? 'approximate' : 'exact',
      // Supabase id must be the immutable property_number allocated by Office CRM.
      id: canonicalPropertyId(row.id),
      type: row.type,
      title: row.title,
      price: row.price,
      priceLabel: row.price_label || row.price,
      location: row.location,
      rooms: row.rooms,
      baths: row.baths,
      sqm: row.sqm,
      extra: approximate ? '' : row.extra,
      desc: row.description,
      emoji: row.emoji || '🏠',
      bg: row.bg || 'linear-gradient(135deg,#1a3a5c,#2d6a9f)',
      lat: approximate ? null : row.lat,
      lng: approximate ? null : row.lng,
      photos: Array.isArray(row.photos) ? row.photos : [],
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

  async function fetchPropertiesFromDB(options) {
    const opts = options || {};
    const fetchImpl = opts.fetchImpl || (root && root.fetch
      ? root.fetch.bind(root)
      : (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null));
    const supabaseUrl = opts.supabaseUrl || (root && root.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
    const supabaseKey = opts.supabaseKey || (root && root.SUPABASE_KEY) || DEFAULT_SUPABASE_KEY;
    const url = supabaseUrl + '/rest/v1/properties?select=' + PUBLIC_PROPERTY_COLUMNS.join(',') + '&active=eq.true&order=id.asc';
    const response = await fetchWithTimeout(fetchImpl, url, {
      cache: 'no-store',
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey }
    }, opts.timeoutMs || 8000);

    if (!response.ok) throw new Error('Supabase ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Supabase returned an invalid property list');
    return data.map(mapDbRow);
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
      result = { properties, source: 'supabase', degraded: false, error: null };
    } catch (error) {
      // Privacy choices may have changed since any snapshot/cache was created.
      // Without current server authorization, never revive old public addresses.
      result = { properties: [], source: 'unavailable', degraded: true, error };
    }
    if (opts.renderStatus !== false) renderPropertyDataStatus(result);
    return result;
  }

  return {
    SUPABASE_URL: DEFAULT_SUPABASE_URL,
    SUPABASE_KEY: DEFAULT_SUPABASE_KEY,
    MAVO_PUBLIC_SITE_URL: PUBLIC_SITE_URL,
    PUBLIC_PROPERTY_COLUMNS: PUBLIC_PROPERTY_COLUMNS,
    canonicalPropertyId: canonicalPropertyId,
    verifiedPropertyList: verifiedPropertyList,
    mapDbRow: mapDbRow,
    fetchPropertiesFromDB: fetchPropertiesFromDB,
    loadMavoProperties: loadMavoProperties,
    renderPropertyDataStatus: renderPropertyDataStatus
  };
});
