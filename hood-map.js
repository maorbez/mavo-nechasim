// ============================
// Globes Nechasim — Neighborhood Map (shared)
// Loads ALL office properties and renders them on a neighborhood page map.
// Highlights properties in the current neighborhood.
// ============================
(function () {
  'use strict';

  const DATA_VERSION = 'globes-rentals-only-2026-06-20-v3';

  // Hardcoded fallback — kept in sync with app.js HARDCODED list
  const HARDCODED = [];

  async function loadProperties() {
    // 1. Try localStorage first (synced with admin/main page)
    try {
      const v = localStorage.getItem('globes_data_version');
      if (v !== DATA_VERSION) {
        localStorage.removeItem('globes_properties');
        localStorage.setItem('globes_data_version', DATA_VERSION);
      }
      const stored = localStorage.getItem('globes_properties');
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data) && data.length > 0)
          return data.filter(p => p.active !== false);
      }
    } catch(e) {}
    // 2. Try properties.json
    try {
      const r = await fetch('properties.json');
      if (r.ok) {
        const data = await r.json();
        return data.filter(p => p.active !== false);
      }
    } catch(e) {}
    // 3. Hardcoded fallback
    return HARDCODED.filter(p => p.active !== false).map(p => ({...p}));
  }

  function typeColor(type) {
    if (type === 'sale' || type === 'rent') return { pin:'#10b981', dot:'#059669' };
    if (type && type.startsWith('commercial')) return { pin:'#059669', dot:'#064e3b' };
    return { pin:'#10b981', dot:'#059669' };
  }

  // Three tiers based on proximity:
  // 'hood'  — same neighborhood (gold, big, prominent)
  // 'city'  — same city, different neighborhood (green, medium)
  // 'other' — other cities (gray, small, faded)
  function makeIcon(p, tier) {
    const { pin, dot } = typeColor(p.type);
    const label = p.priceLabel || ('₪ ' + (p.price || ''));
    const shortLabel = String(label).split('/')[0].trim();

    const styles = {
      hood:  { accent:'#f59e0b', dot:'#d97706', glow:'box-shadow:0 4px 14px rgba(245,158,11,.5),0 0 0 2px rgba(245,158,11,.35);', opacity:1, scale:1 },
      city:  { accent:pin,        dot:dot,      glow:'', opacity:1, scale:.92 },
      other: { accent:'#94a3b8',  dot:'#64748b', glow:'', opacity:.55, scale:.82 }
    };
    const s = styles[tier] || styles.other;

    return L.divIcon({
      className: '',
      html: `<div class="map-pin" style="opacity:${s.opacity};transform:scale(${s.scale});transform-origin:bottom center;">
        <div class="map-pin-bubble" style="border-color:${s.accent};color:${s.accent};${s.glow}">
          <span style="margin-left:4px">${p.emoji || '🏠'}</span>${shortLabel}
        </div>
        <div class="map-pin-dot" style="background:${s.dot}"></div>
      </div>`,
      iconSize: [160, 58], iconAnchor: [80, 58]
    });
  }

  function isInNeighborhood(prop, hoodName) {
    if (!hoodName || !prop.location) return false;
    return prop.location.indexOf(hoodName) !== -1;
  }

  function isInCity(prop, cityName) {
    if (!cityName || !prop.location) return false;
    return prop.location.indexOf(cityName) !== -1;
  }

  function classifyTier(prop, hoodName, cityName) {
    if (isInNeighborhood(prop, hoodName)) return 'hood';
    if (isInCity(prop, cityName)) return 'city';
    return 'other';
  }

  /**
   * Initialize the neighborhood map with ALL office properties.
   * @param {Object} opts
   * @param {string} opts.elementId  — DOM id of the map container (default 'hoodMap')
   * @param {string} opts.neighborhood — Hebrew neighborhood name (used to highlight)
   * @param {[number, number]} opts.center — [lat, lng]
   * @param {number} opts.zoom — initial zoom level
   */
  async function initHoodMap(opts) {
    const id = opts.elementId || 'hoodMap';
    const el = document.getElementById(id);
    if (!el) return;

    const map = L.map(id, { zoomControl:true, scrollWheelZoom:false })
      .setView(opts.center, opts.zoom || 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    const allProps = await loadProperties();

    // Group by proximity tier
    const grouped = { hood: [], city: [], other: [] };
    allProps.forEach(p => {
      if (!p.lat || !p.lng) return;
      const tier = classifyTier(p, opts.neighborhood, opts.city);
      grouped[tier].push(p);
    });

    const tierZ = { other: 0, city: 500, hood: 1000 };
    const renderOrder = ['other', 'city', 'hood'];
    const hoodBounds = [];

    renderOrder.forEach(tier => {
      grouped[tier].forEach(p => {
        if (tier === 'hood') hoodBounds.push([p.lat, p.lng]);
        const marker = L.marker([p.lat, p.lng], {
          icon: makeIcon(p, tier),
          zIndexOffset: tierZ[tier]
        }).addTo(map);
        marker.bindPopup(buildPopup(p, tier, opts.city));
      });
    });

    // Center label marker for current neighborhood
    const hoodIcon = L.divIcon({
      className: '',
      html: '<div style="background:#1565C0;color:#fff;padding:6px 14px;border-radius:50px;font-weight:800;font-size:.82rem;font-family:Heebo,sans-serif;box-shadow:0 4px 12px rgba(21,101,192,.4);white-space:nowrap;">📍 ' + escapeHtml(opts.neighborhood) + '</div>',
      iconSize: [120, 32], iconAnchor: [60, 16]
    });
    L.marker(opts.center, { icon: hoodIcon, zIndexOffset: -100, interactive: false }).addTo(map);

    // Fit map to in-hood properties (or fall back)
    if (hoodBounds.length > 1) {
      hoodBounds.push(opts.center);
      map.fitBounds(hoodBounds, { padding: [50, 50], maxZoom: 16 });
    } else if (hoodBounds.length === 1) {
      map.setView(hoodBounds[0], 15);
    } else {
      map.setView(opts.center, opts.zoom || 14);
    }

    // Render count badge with all 3 tiers (safe DOM)
    const countEl = document.getElementById('hoodMapCount');
    if (countEl) {
      while (countEl.firstChild) countEl.removeChild(countEl.firstChild);
      const segs = [];
      const mk = (text, color, bold) => {
        const s = document.createElement('span');
        s.style.color = color;
        if (bold) s.style.fontWeight = '800';
        s.textContent = text;
        return s;
      };
      segs.push(mk(grouped.hood.length + ' בשכונה', grouped.hood.length ? '#d97706' : '#94a3b8', true));
      if (grouped.city.length > 0) segs.push(mk(grouped.city.length + ' ב' + (opts.city || 'אזור'), '#15803d', false));
      if (grouped.other.length > 0) segs.push(mk(grouped.other.length + ' נוספים', '#94a3b8', false));
      segs.forEach((s, i) => {
        if (i > 0) countEl.appendChild(document.createTextNode(' · '));
        countEl.appendChild(s);
      });
    }

    setTimeout(() => map.invalidateSize(), 200);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function buildPopup(p, tier, city) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:right;font-family:Heebo,sans-serif;min-width:220px;';

    const badge = document.createElement('span');
    badge.style.cssText = 'padding:2px 8px;border-radius:50px;font-size:.7rem;font-weight:800;display:inline-block;margin-bottom:6px;';
    if (tier === 'hood') { badge.style.background = '#fef3c7'; badge.style.color = '#92400e'; badge.textContent = 'בשכונה'; }
    else if (tier === 'city') { badge.style.background = '#dcfce7'; badge.style.color = '#15803d'; badge.textContent = city || 'באזור'; }
    else { badge.style.background = '#f1f5f9'; badge.style.color = '#64748b'; badge.textContent = 'אחר'; }
    wrap.appendChild(badge);
    wrap.appendChild(document.createElement('br'));

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:800;font-size:.95rem;margin-bottom:4px;';
    title.textContent = (p.emoji || '🏠') + ' ' + (p.title || '');
    wrap.appendChild(title);

    const loc = document.createElement('div');
    loc.style.cssText = 'color:#64748b;font-size:.82rem;margin-bottom:6px;';
    loc.textContent = '📍 ' + (p.location || '');
    wrap.appendChild(loc);

    const price = document.createElement('div');
    price.style.cssText = 'font-weight:800;color:#1565C0;font-size:1.05rem;margin-bottom:8px;';
    price.textContent = p.priceLabel || ('₪ ' + (p.price || ''));
    wrap.appendChild(price);

    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:.8rem;color:#475569;';
    let metaText = '';
    if (p.rooms) metaText += '🛏 ' + p.rooms + ' חד׳ · ';
    if (p.sqm) metaText += '📐 ' + p.sqm + ' מ"ר';
    meta.textContent = metaText;
    wrap.appendChild(meta);

    const link = document.createElement('a');
    link.href = 'index.html?prop=' + encodeURIComponent(p.id || '');
    link.style.cssText = 'display:inline-block;margin-top:8px;background:#1565C0;color:#fff;text-decoration:none;padding:6px 14px;border-radius:50px;font-weight:700;font-size:.82rem;';
    link.textContent = 'לפרטים מלאים';
    wrap.appendChild(link);

    return wrap;
  }

  window.initHoodMap = initHoodMap;
})();
