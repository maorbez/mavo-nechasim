// ============================
// Globes Nechasim — App Logic
// ============================

const WA_NUMBER = '972548026123';
const SITE_URL = window.location.href.split('?')[0];

// ← החלף בכתובת המייל האמיתית של המשרד
const CONTACT_EMAIL = 'info@globes-nechasim.co.il';

// ---- Security: HTML escaping to prevent XSS ----
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- City → neighborhoods map for dynamic filter grouping ----
const CITY_HOODS = {
  'תל אביב': ['הצפון הישן','הצפון החדש','פלורנטין','נווה צדק','כרם התימנים',
               'לב העיר','מרכז העיר','מונטיפיורי','רמת אביב','רמת אביב ג׳',
               'אפקה','הדר יוסף','רמת החייל','נווה שאנן','שפירא','תל כביר',
               'נמל תל אביב','יפו','עג׳מי','נווה אביבים','בבלי'],
  'בת ים':   ['קוממיות','גן רווה','רמת יוסף','נווה עוז','הדרים',
               'מרכז','כרמי','שכונת ט\'','שכונת ז\'','שכונת ה\'']
};

// ---- WhatsApp rich message ----
function waLink(p) {
  const featLine = p.rooms
    ? `🛏 ${p.rooms} חדרים | 🚿 ${p.baths} אמבטיות | 📐 ${p.sqm} מ"ר`
    : `📐 ${p.sqm} מ"ר | ✅ ${p.extra}`;
  const propUrl = `${SITE_URL}?prop=${p.id}`;
  const msg =
    `${p.emoji} *${p.title}*\n` +
    `📍 ${p.location}\n` +
    `💰 ${p.priceLabel}\n` +
    `${featLine}\n\n` +
    `🔗 לצפייה בנכס:\n${propUrl}\n\n` +
    `🗺 ניווט בוויז:\nhttps://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes\n\n` +
    `📞 גלובס נכסים | 054-802-6123`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ---- Load properties (localStorage → JSON file → hardcoded fallback) ----
let properties = []; // single source of truth, filled on init

const HARDCODED = [];

const DATA_VERSION = 'globes-rentals-only-2026-06-20-v3'; // bump this to force-clear old localStorage data

async function loadProperties() {
  // 1. Try localStorage (from admin panel) — skip if data version mismatch
  const storedVersion = localStorage.getItem('globes_data_version');
  if (storedVersion !== DATA_VERSION) {
    localStorage.removeItem('globes_properties');
    localStorage.setItem('globes_data_version', DATA_VERSION);
  }

  const stored = localStorage.getItem('globes_properties');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (Array.isArray(data) && data.length > 0)
        return data.filter(p => p.active !== false);
    } catch(e) {}
  }
  // 2. Try properties.json file
  try {
    const r = await fetch('properties.json');
    if (r.ok) {
      const data = await r.json();
      return data.filter(p => p.active !== false);
    }
  } catch(e) {}
  // 3. Hardcoded fallback (COPY — not same reference!)
  return HARDCODED.filter(p => p.active !== false).map(p => ({...p}));
}

// ============================
// MAP
// ============================
let map, markers = [], activeFilter = 'all';

function initMap(props) {
  map = L.map('mainMap', {
    center: [32.06, 34.77],
    zoom: 12,
    zoomControl: false,
    attributionControl: true
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  props.forEach(p => addMarker(p));
  updateMapCount(props);

  // Fix rendering after container paint
  setTimeout(() => map.invalidateSize(), 300);
}

function typeColor(type) {
  if (type === 'sale' || type === 'rent') return { pin:'#10b981', dot:'#059669' };
  if (type.startsWith('commercial')) return { pin:'#059669', dot:'#064e3b' };
  return { pin:'#10b981', dot:'#059669' };
}

function addMarker(p) {
  // Skip markers with no valid coordinates
  if (!p.lat || !p.lng || (Math.abs(p.lat) < 0.01 && Math.abs(p.lng) < 0.01)) return;

  const { pin, dot } = typeColor(p.type);
  const label = p.priceLabel || ('₪ ' + p.price);
  const shortLabel = label.split('/')[0].trim(); // remove " / לחודש" for pin
  const icon = L.divIcon({
    className: '',
    html: `<div class="map-pin">
      <div class="map-pin-bubble" style="border-color:${pin};color:${pin}">
        <span style="margin-left:4px">${p.emoji}</span>${shortLabel}
      </div>
      <div class="map-pin-dot" style="background:${dot}"></div>
    </div>`,
    iconSize: [160, 58], iconAnchor: [80, 58]
  });
  const m = L.marker([p.lat, p.lng], { icon, zIndexOffset: 0 })
    .addTo(map)
    .on('click', () => {
      // Smooth fly to pin, then open modal
      map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
      setTimeout(() => openPropertyModal(p), 400);
    });
  m._propData = p;
  markers.push(m);
}

let activeType = 'all';
let activeRooms = 'all';

function filterMap(el, type) {
  if (el) {
    document.querySelectorAll('.map-filter-btn').forEach(b => {
      if(b.tagName === 'BUTTON') b.classList.remove('active');
    });
    el.classList.add('active');
    activeType = type;
  }
  applyMapFilters();
}

function filterMapByState() {
  applyMapFilters();
}

function applyMapFilters() {
  const minEl = document.getElementById('mapRoomsMin');
  const maxEl = document.getElementById('mapRoomsMax');
  const roomsMin = minEl && minEl.value ? parseFloat(minEl.value) : null;
  const roomsMax = maxEl && maxEl.value ? parseFloat(maxEl.value) : null;

  let count = 0;
  markers.forEach(m => {
    const p = m._propData;
    let typeMatch = (activeType === 'all' || p.type === activeType);

    let roomsMatch = true;
    if (p.rooms && (roomsMin !== null || roomsMax !== null)) {
      const r = parseFloat(p.rooms);
      if (roomsMin !== null && r < roomsMin) roomsMatch = false;
      if (roomsMax !== null && r > roomsMax) roomsMatch = false;
    }
    
    if (typeMatch && roomsMatch) {
      count++;
      if (!map.hasLayer(m)) map.addLayer(m);
    } else {
      if (map.hasLayer(m)) map.removeLayer(m);
    }
  });
  const cEl = document.getElementById('mapCount');
  if(cEl) cEl.textContent = count;
}

function updateMapCount(props) {
  document.getElementById('mapCount').textContent = props.length;
}

// ============================
// CITY + NEIGHBORHOOD FILTERS (dynamic, grouped by city)
// ============================
function filterByCity(el, city) {
  document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.prop-card').forEach(card => {
    const loc = card.dataset.location || '';
    if (!city) card.classList.remove('hidden');
    else card.classList.toggle('hidden', !loc.startsWith(city));
  });
  syncPagination();
}

function buildNeighborhoodFilters(props) {
  const container = document.getElementById('dynamicHoods');
  if (!container) return;
  container.innerHTML = '';

  const cityMap = {};
  props.forEach(p => {
    const parts = p.location.split(',');
    if (parts.length < 2) return;
    const city = parts[0].trim();
    const hood = parts[1].trim();
    if (!cityMap[city]) cityMap[city] = new Set();
    cityMap[city].add(hood);
  });

  if (Object.keys(cityMap).length === 0) return;

  Object.entries(cityMap).forEach(([city, hoods]) => {
    const label = document.createElement('span');
    label.className = 'hood-label';
    label.textContent = city + ':';
    container.appendChild(label);

    hoods.forEach(hood => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn hood-btn';
      btn.textContent = hood;
      btn.onclick = function() { filterByNeighborhood(this, hood); };
      container.appendChild(btn);
    });
  });
}

function filterByNeighborhood(el, hood) {
  document.querySelectorAll('.hood-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.prop-card').forEach(card => {
    // prefer p.hood exact match; fallback to location text
    const propHood = card.dataset.hood || '';
    const loc = card.dataset.location || '';
    const match = propHood ? propHood === hood : loc.includes(hood);
    card.classList.toggle('hidden', !match);
  });
  syncPagination();
}

// ============================
// MODAL
// ============================
function openPropertyModal(p) {
  const overlay = document.getElementById('propModalOverlay');

  // Gallery
  const main = document.getElementById('galleryMain');
  main.style.background = p.bg;
  main.style.opacity = '1';

  const hasPhotos = p.photos && p.photos.length > 0;

  if (hasPhotos) {
    // show real photo as main image
    main.textContent = '';
    main.style.fontSize = '';
    main.style.backgroundImage = `url(${p.photos[0]})`;
    main.style.backgroundSize = 'cover';
    main.style.backgroundPosition = 'center';
  } else {
    main.textContent = (p.thumbs && p.thumbs[0]) || p.emoji || '🏠';
    main.style.fontSize = '7rem';
    main.style.backgroundImage = '';
  }

  const thumbsEl = document.getElementById('galleryThumbs');
  thumbsEl.textContent = '';
  if (hasPhotos) {
    p.photos.forEach((src, i) => {
      const d = document.createElement('div');
      d.className = 'gallery-thumb' + (i === 0 ? ' active' : '');
      d.style.backgroundImage = `url(${src})`;
      d.style.backgroundSize = 'cover';
      d.style.backgroundPosition = 'center';
      d.style.fontSize = '0';
      d.addEventListener('click', function() {
        document.querySelectorAll('.gallery-thumb').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        main.style.backgroundImage = `url(${src})`;
        main.textContent = '';
      });
      thumbsEl.appendChild(d);
    });
  } else {
    (p.thumbs || [p.emoji]).forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'gallery-thumb' + (i === 0 ? ' active' : '');
      d.textContent = t;
      d.addEventListener('click', (function(val){ return function(){ switchImg(this, val); }; })(t));
      thumbsEl.appendChild(d);
    });
  }

  const badgeEl = document.getElementById('galleryBadge');
  const badgeText = {sale:'למכירה',rent:'להשכרה','commercial-sale':'מסחרי למכירה','commercial-rent':'מסחרי להשכרה'};
  badgeEl.textContent = badgeText[p.type] || '';
  badgeEl.className = `gallery-badge ${p.type}`;

  // Info
  document.getElementById('modalPrice').textContent = p.priceLabel || ('₪ ' + p.price);
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalLocation').innerHTML =
    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${esc(p.location)}`;

  document.getElementById('modalFeatures').innerHTML = p.rooms
    ? `<span>🛏 ${esc(p.rooms)} חדרים</span><span>🚿 ${esc(p.baths)} אמבטיות</span><span>📐 ${esc(p.sqm)} מ"ר</span><span>✅ ${esc(p.extra)}</span>`
    : `<span>📐 ${esc(p.sqm)} מ"ר</span><span>✅ ${esc(p.extra)}</span><span>${esc(p.emoji)} נדל"ן מסחרי</span>`;

  document.getElementById('modalDesc').textContent = p.desc || '';

  const ag = p.agent || {};
  const agEl = document.getElementById('modalAgent');
  agEl.textContent = '';
  const avatar = document.createElement('div');
  avatar.className = 'modal-agent-avatar';
  // only allow safe CSS color values (hex / rgb / named)
  const safeColor = /^(#[0-9a-fA-F]{3,8}|rgb\([\d, ]+\)|[a-zA-Z]+)$/.test(ag.color || '') ? ag.color : '#1565C0';
  avatar.style.background = safeColor;
  avatar.textContent = ag.init || 'ג';
  agEl.appendChild(avatar);
  const agInfo = document.createElement('div');
  const agName = document.createElement('div');
  agName.className = 'modal-agent-name';
  agName.textContent = ag.name || '';
  const agTitle = document.createElement('div');
  agTitle.className = 'modal-agent-title';
  agTitle.textContent = ag.title || '';
  agInfo.appendChild(agName);
  agInfo.appendChild(agTitle);
  agEl.appendChild(agInfo);
  const agPhone = document.createElement('div');
  agPhone.style.cssText = 'margin-right:auto;font-size:.8rem;color:var(--text-muted)';
  agPhone.textContent = ag.phone || '';
  agEl.appendChild(agPhone);

  // WhatsApp (rich message + property link)
  document.getElementById('modalWA').href = waLink(p);

  // Waze
  document.getElementById('modalWaze').href =
    `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes&zoom=17`;

  // Form subtitle
  document.getElementById('modalFormSub').textContent = `שאלות על: ${p.title} — ${p.location}`;

  // Phone
  document.getElementById('modalPhone').textContent = ag.phone || '054-802-6123';
  document.getElementById('modalPhone').href = `tel:${(ag.phone||'').replace(/-/g,'')}`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function switchImg(el, emoji) {
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const main = document.getElementById('galleryMain');
  main.style.opacity = '0';
  setTimeout(() => { main.textContent = emoji; main.style.opacity = '1'; }, 150);
}

function closeModal(e) {
  if (e.target === document.getElementById('propModalOverlay')) closeModalBtn();
}

function closeModalBtn() {
  document.getElementById('propModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function submitModalForm(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'שולח...';
  try {
    const payload = {
      _subject: 'פנייה על נכס — גלובס נכסים',
      name:    form.querySelector('[name="name"]').value,
      phone:   form.querySelector('[name="phone"]').value,
      email:   form.querySelector('[name="email"]').value || 'לא צוין',
      interest: form.querySelector('[name="interest"]').value,
      property: document.getElementById('modalFormSub').textContent,
      message: form.querySelector('[name="message"]').value || 'לא צוין',
    };
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { closeModalBtn(); showToast('הפנייה נשלחה! ניצור קשר בקרוב.'); form.reset(); }
    else { showToast('שגיאה בשליחה — נסה שוב.'); }
  } catch { showToast('שגיאה בשליחה — נסה שוב.'); }
  finally { btn.disabled = false; btn.textContent = origText; }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalBtn(); });

// ============================
// NAVBAR / UI
// ============================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  const isScrolled = window.scrollY > 60;
  navbar.classList.toggle('scrolled', isScrolled);
  document.getElementById('scrollTop').classList.toggle('visible', window.scrollY > 400);
  // logo-on-white: show original blue bg when navbar is white
  document.querySelectorAll('.logo-img').forEach(img => {
    img.classList.toggle('logo-on-white', isScrolled);
  });
});

// סגור תפריט כשגוללים
window.addEventListener("scroll", () => {
  const menu = document.getElementById("mobileMenu");
  if (menu && menu.classList.contains("open") && window.scrollY > 20) {
    menu.classList.remove("open");
  }
}, { passive: true });

function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

function setTab(el, type) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  // Scroll to properties section
  const section = document.getElementById('properties');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Reset city/neighborhood filter buttons
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.filter-btn');
  if (allBtn) allBtn.classList.add('active');
  // Filter cards by type
  document.querySelectorAll('.prop-card').forEach(card => {
    if (!type || type === 'all') {
      card.classList.remove('hidden');
    } else if (type === 'commercial') {
      const t = card.dataset.type || '';
      card.classList.toggle('hidden', !t.includes('commercial'));
    } else {
      const t = card.dataset.type || '';
      card.classList.toggle('hidden', !t.startsWith(type));
    }
  });
}

function filterProps(el, type) {
  const peers = el.parentElement.querySelectorAll('.filter-btn');
  peers.forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  
  // Also reset city and hood filters
  document.querySelectorAll('.city-btn, .hood-btn').forEach(b => b.classList.remove('active'));
  const allCities = document.querySelector('.city-btn');
  if (allCities) allCities.classList.add('active');

  document.querySelectorAll('.prop-card').forEach(card => {
    if (type === 'all') { card.classList.remove('hidden'); return; }
    const cardType = card.dataset.type || '';
    if (type === 'commercial') {
      card.classList.toggle('hidden', !cardType.includes('commercial'));
    } else {
      card.classList.toggle('hidden', !cardType.startsWith(type));
    }
  });
  syncPagination();
}

function scrollToContact() {
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}

function doSearch() {
  const selects = document.querySelectorAll('.search-fields select');
  const city = selects[0].value;
  let url = 'search.html?';
  
  const activeTab = document.querySelector('.search-tabs .tab.active');
  let typeParam = 'all';
  if (activeTab) {
    if (activeTab.textContent.includes('מכירה')) typeParam = 'sale';
    if (activeTab.textContent.includes('השכרה')) typeParam = 'rent';
    if (activeTab.textContent.includes('מסחרי')) typeParam = 'commercial-sale';
  }
  
  const roomsSelect = document.querySelector('.room-select');
  const rooms = roomsSelect ? roomsSelect.value : 'all';

  if (city && city !== 'בחר עיר...') url += `city=${encodeURIComponent(city)}&`;
  if (rooms && rooms !== 'all') url += `rooms=${rooms}&`;
  url += `type=${typeParam}`;
  
  window.location.href = url;
}

async function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'שולח...';
  try {
    const payload = {
      _subject: 'פנייה חדשה מאתר גלובס נכסים',
      name:    form.querySelector('[name="name"]').value,
      phone:   form.querySelector('[name="phone"]').value,
      email:   form.querySelector('[name="email"]').value || 'לא צוין',
      subject: form.querySelector('[name="subject"]').value,
      message: form.querySelector('[name="message"]').value || 'לא צוין',
      marketing_consent: form.querySelector('[name="marketingConsent"]').checked ? 'כן' : 'לא',
    };
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { showToast('הפנייה נשלחה! ניצור קשר בקרוב.'); form.reset(); }
    else { showToast('שגיאה בשליחה — נסה שוב.'); }
  } catch { showToast('שגיאה בשליחה — נסה שוב.'); }
  finally { btn.disabled = false; btn.textContent = origText; }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (msg) t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ============================
// ANIMATIONS
// ============================
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    if (!el.dataset.count) return; // neighborhood pages use static text — skip
    const target = parseInt(el.dataset.count);
    const formatted = target.toLocaleString('he-IL'); 
    
    el.innerHTML = '';
    el.style.display = 'inline-flex';
    el.style.direction = 'ltr';
    el.style.overflow = 'hidden';
    el.style.height = '1.2em';
    el.style.lineHeight = '1.2em';
    el.style.verticalAlign = 'bottom';

    
    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];
      if (isNaN(parseInt(char))) {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.height = '1.2em';
        span.style.display = 'inline-flex';
        span.style.alignItems = 'center';
        el.appendChild(span);
        continue;
      }
      
      const digitWrapper = document.createElement('span');
      digitWrapper.style.display = 'inline-flex';
      digitWrapper.style.flexDirection = 'column';
      // Stagger transitions for a mechanical feel
      const duration = 1.5 + (formatted.length - i) * 0.3; 
      digitWrapper.style.transition = `transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1)`;
      digitWrapper.style.transform = 'translateY(0)';
      
      let digitsHtml = '';
      const loops = 2; // Full rotations
      const endDigit = parseInt(char);
      const totalDigits = loops * 10 + endDigit;
      
      for (let d = 0; d <= totalDigits; d++) {
        digitsHtml += `<span style="height:1.2em; display:flex; align-items:center; justify-content:center;">${d % 10}</span>`;
      }
      digitWrapper.innerHTML = digitsHtml;
      el.appendChild(digitWrapper);
      
      // Trigger animation
      setTimeout(() => {
        digitWrapper.style.transform = `translateY(-${totalDigits * 1.2}em)`;
      }, 50);
    }
  });
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); });
}, { threshold: 0.12 });

const style = document.createElement('style');
style.textContent = `.in-view { opacity: 1 !important; transform: translateY(0) !important; }`;
document.head.appendChild(style);

const isMobile = window.innerWidth <= 768;

// Fix: prevent carousels from capturing vertical page scroll on mobile
if (isMobile) {
  document.querySelectorAll('.properties-grid, .services-grid, .agents-grid, .team-grid').forEach(carousel => {
    let startX = 0, startY = 0, lastY = 0, gestureDir = null;
    carousel.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lastY = startY;
      gestureDir = null;
    }, { passive: true });
    carousel.addEventListener('touchmove', e => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (!gestureDir && (dx > 5 || dy > 5)) {
        gestureDir = dy > dx ? 'vertical' : 'horizontal';
      }
      if (gestureDir === 'vertical') {
        e.preventDefault();
        window.scrollBy(0, lastY - e.touches[0].clientY);
        lastY = e.touches[0].clientY;
      }
    }, { passive: false });
  });
}

document.querySelectorAll('.prop-card, .service-card, .agent-card, .testi-card, .why-item').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = `all .5s ease ${isMobile ? 0 : i * 0.06}s`;
  observer.observe(el);
});

const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) animateCounters();
  }, { threshold: 0.5 }).observe(statsSection);
}

document.querySelectorAll('.btn-fav').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation();
    const isFav = this.textContent === '♥';
    this.textContent = isFav ? '♡' : '♥';
    this.style.background = isFav ? 'rgba(255,255,255,.9)' : 'rgba(239,68,68,.15)';
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const t = document.querySelector(this.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ============================
// LOGO TRANSPARENCY (extract gold, remove blue bg via Canvas)
// ============================
function processLogoTransparency() {
  document.querySelectorAll('.logo-img').forEach(img => {
    const go = () => {
      // Skip if already processed (data URL) or cross-origin blocked
      if (img.src.startsWith('data:')) return;
      try {
        const c = document.createElement('canvas');
        c.width  = img.naturalWidth  || 512;
        c.height = img.naturalHeight || 512;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d  = ctx.getImageData(0, 0, c.width, c.height);
        const px = d.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i+1], b = px[i+2];
          // "Blue excess" = how much bluer this pixel is vs. red/green channels
          const blueExcess = b - Math.max(r, g);
          if (blueExcess > 55 && b > 80 && r < 140) {
            // Definitely background blue → fully transparent
            px[i+3] = 0;
          } else if (blueExcess > 20 && b > 60 && r < 120) {
            // Anti-aliased edge → fade smoothly
            px[i+3] = Math.round(255 * (1 - (blueExcess - 20) / 40));
          } else if (r < 18 && g < 18 && b < 40) {
            // Near-black corners → transparent
            px[i+3] = 0;
          }
        }
        ctx.putImageData(d, 0, 0);
        img.src = c.toDataURL('image/png');
        img.classList.add('logo-transparent');
      } catch(e) {
        // CORS or security error — keep original logo, no crash
      }
    };
    // Process immediately if loaded, else wait for load event
    if (img.complete && img.naturalWidth > 0) go();
    else img.addEventListener('load', go, { once: true });
  });
}


// ============================
// DYNAMIC CARD RENDERING
// ============================
const _TYPE_BADGE = { sale:'למכירה', rent:'להשכרה', 'commercial-sale':'מסחרי-מכירה', 'commercial-rent':'מסחרי-השכרה' };

function _mkSvgLocPin() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','14'); svg.setAttribute('height','14');
  svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','2'); svg.setAttribute('viewBox','0 0 24 24');
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d','M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z');
  const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
  circle.setAttribute('cx','12'); circle.setAttribute('cy','10'); circle.setAttribute('r','3');
  svg.appendChild(path); svg.appendChild(circle);
  return svg;
}

function _mkSvgWA() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','15'); svg.setAttribute('height','15');
  svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','currentColor');
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d','M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z');
  svg.appendChild(path);
  return svg;
}

function renderPropertiesGrid(props) {
  const grid = document.getElementById('propertiesGrid');
  if (!grid) return;

  while (grid.firstChild) grid.removeChild(grid.firstChild);

  props.forEach(p => {
    const isLuxury = p.luxury || (Array.isArray(p.tags) && p.tags.includes('יוקרה'));
    const isHot    = p.hot    || (Array.isArray(p.tags) && p.tags.includes('חם'));
    const isComm   = p.type && p.type.startsWith('commercial');
    const typeKey  = p.type || 'sale';

    const card = document.createElement('div');
    card.className = 'prop-card';
    card.dataset.type     = typeKey + (isLuxury ? ' luxury' : '');
    card.dataset.location = p.location || '';
    card.dataset.hood     = p.hood || '';
    card.dataset.id       = String(p.id || '');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', p.title ? `פתח כרטיס נכס: ${p.title}` : 'פתח כרטיס נכס');
    card.addEventListener('click', e => {
      if (e.target.closest('a, button, input, select, textarea, label')) return;
      openPropertyModal(p);
    });
    card.addEventListener('keydown', e => {
      if (e.target !== card || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      openPropertyModal(p);
    });

    // prop-img
    const propImg = document.createElement('div');
    propImg.className = 'prop-img';
    propImg.style.background = p.bg || 'linear-gradient(135deg,#1565C0,#1976D2)';

    // real photo if available
    if (p.photos && p.photos.length > 0) {
      const realImg = document.createElement('img');
      realImg.src = p.photos[0];
      realImg.alt = p.title || '';
      realImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0';
      propImg.style.position = 'relative';
      propImg.style.overflow = 'hidden';
      propImg.appendChild(realImg);
    }

    const badge = document.createElement('div');
    badge.className = 'prop-badge ' + typeKey;
    badge.textContent = _TYPE_BADGE[typeKey] || 'למכירה';
    propImg.appendChild(badge);

    if (isLuxury) {
      const lux = document.createElement('div');
      lux.className = 'prop-badge luxury-badge';
      lux.textContent = 'יוקרה';
      propImg.appendChild(lux);
    }

    const overlay = document.createElement('div');
    overlay.className = 'prop-overlay';
    const fav = document.createElement('button');
    fav.className = 'btn-fav'; fav.textContent = '♡';
    fav.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      const isFav = this.textContent === '♥';
      this.textContent = isFav ? '♡' : '♥';
      this.style.background = isFav ? 'rgba(255,255,255,.9)' : 'rgba(239,68,68,.15)';
    });
    overlay.appendChild(fav);
    propImg.appendChild(overlay);

    const iconBig = document.createElement('div');
    iconBig.className = 'prop-icon-big';
    // hide emoji if real photo exists
    if (!(p.photos && p.photos.length > 0)) iconBig.textContent = p.emoji || '🏠';
    propImg.appendChild(iconBig);

    const dot = document.createElement('div');
    dot.className = 'available-dot'; dot.title = 'זמין';
    propImg.appendChild(dot);

    if (isHot) {
      const hot = document.createElement('div');
      hot.className = 'hot-badge'; hot.textContent = '🔥 חם';
      propImg.appendChild(hot);
    }
    card.appendChild(propImg);

    // prop-body
    const body = document.createElement('div');
    body.className = 'prop-body';

    const price = document.createElement('div');
    price.className = 'prop-price';
    price.textContent = p.priceLabel || ('₪ ' + p.price);
    body.appendChild(price);

    const name = document.createElement('h3');
    name.className = 'prop-name'; name.textContent = p.title || '';
    body.appendChild(name);

    const loc = document.createElement('div');
    loc.className = 'prop-loc';
    loc.appendChild(_mkSvgLocPin());
    loc.appendChild(document.createTextNode(' ' + (p.location || '')));
    body.appendChild(loc);

    const feats = document.createElement('div');
    feats.className = 'prop-features';
    const addSpan = txt => { const s = document.createElement('span'); s.textContent = txt; feats.appendChild(s); };
    if (!isComm && p.rooms) {
      addSpan('🛏 ' + p.rooms + ' חדרים');
      addSpan('🚿 ' + (p.baths || 1) + ' אמבטיות');
      addSpan('📐 ' + p.sqm + ' מ"ר');
      if (p.extra) addSpan('🏠 ' + p.extra);
    } else {
      addSpan('📐 ' + p.sqm + ' מ"ר');
      if (p.extra) addSpan('✅ ' + p.extra);
    }
    body.appendChild(feats);

    // footer
    const footer = document.createElement('div');
    footer.className = 'prop-footer';

    const agMini = document.createElement('div');
    agMini.className = 'agent-mini';
    const agAv = document.createElement('div');
    agAv.className = 'agent-avatar';
    agAv.style.background = (p.agent && p.agent.color) || '#1565C0';
    agAv.textContent = (p.agent && p.agent.init) || 'ג';
    const agName = document.createElement('span');
    agName.textContent = (p.agent && p.agent.name) || 'גלובס נכסים';
    agMini.appendChild(agAv); agMini.appendChild(agName);

    const actions = document.createElement('div');
    actions.className = 'prop-actions';

    const waA = document.createElement('a');
    waA.href = waLink(p); waA.className = 'btn-whatsapp';
    waA.target = '_blank'; waA.rel = 'noopener';
    waA.appendChild(_mkSvgWA());
    waA.appendChild(document.createTextNode(' וואטסאפ'));
    actions.appendChild(waA);

    const detBtn = document.createElement('button');
    detBtn.className = 'btn-details'; detBtn.textContent = 'פרטים';
    detBtn.addEventListener('click', (function(propRef) {
      return function(e) { e.stopPropagation(); openPropertyModal(propRef); };
    })(p));
    actions.appendChild(detBtn);

    footer.appendChild(agMini); footer.appendChild(actions);
    body.appendChild(footer);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

// === PAGINATION ===
const PAGE_SIZE = 12;
let _page = 0, _allCards = [];

function _addLoadMoreBtn() {
  const g = document.querySelector('.properties-grid') || document.getElementById('properties');
  if (!g) return;
  const b = document.createElement('button');
  b.id = 'loadMoreBtn'; b.className = 'load-more-btn';
  b.textContent = 'טען עוד נכסים'; b.onclick = loadMoreCards;
  g.parentNode.insertBefore(b, g.nextSibling);
}

function initPagination() {
  _allCards = Array.from(document.querySelectorAll('.prop-card'));
  const ex = document.getElementById('loadMoreBtn');
  if (ex) ex.remove();
  _allCards.forEach((c, i) => { c.classList.toggle('pg-hidden', i >= PAGE_SIZE); });
  _page = 1;
  if (_allCards.length > PAGE_SIZE) _addLoadMoreBtn();
}

function loadMoreCards() {
  const s = _page * PAGE_SIZE, e = s + PAGE_SIZE;
  _allCards.slice(s, e).forEach(c => { c.classList.remove('pg-hidden'); });
  _page++;
  if (e >= _allCards.length) { const b = document.getElementById('loadMoreBtn'); if (b) b.remove(); }
}

// Re-paginate after a filter — keeps filter (.hidden) and pagination (.pg-hidden) independent
function syncPagination() {
  document.querySelectorAll('.prop-card').forEach(c => c.classList.remove('pg-hidden'));
  _allCards = Array.from(document.querySelectorAll('.prop-card')).filter(c => !c.classList.contains('hidden'));
  _allCards.forEach((c, i) => { c.classList.toggle('pg-hidden', i >= PAGE_SIZE); });
  _page = 1;
  const ex = document.getElementById('loadMoreBtn');
  if (ex) ex.remove();
  if (_allCards.length > PAGE_SIZE) _addLoadMoreBtn();
}

function initLazySections() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("lazy-loaded"); obs.unobserve(e.target); }
    });
  }, { rootMargin: "100px" });
  document.querySelectorAll("section").forEach(el => obs.observe(el));
}
// === END PAGINATION ===

// ============================
// INIT
// ============================
document.addEventListener('DOMContentLoaded', async () => {
  // Load properties (localStorage → JSON → hardcoded)
  properties = await loadProperties();

  // Dynamically render property cards from data (replaces hardcoded HTML cards)
  renderPropertiesGrid(properties);

  // Build neighborhood filters
  buildNeighborhoodFilters(properties);

  // Init map with loaded properties
  if (document.getElementById('mainMap')) {
    initMap(properties);
  }

  // Extract gold from logo (remove blue background via Canvas)
  processLogoTransparency();

  // Handle ?prop=ID URL param — auto-open modal
  const urlParams = new URLSearchParams(window.location.search);
  const propId = urlParams.get('prop');
  if (propId) {
    const found = properties.find(p => String(p.id) === propId);
    if (found) {
      setTimeout(() => {
        openPropertyModal(found);
      }, 900);
    }
  }

  initPagination();
  const lmb = document.getElementById("loadMoreBtn");
  if (lmb) lmb.textContent = "טען עוד נכסים";
  initLazySections();

  // Ctrl+Shift+A → open admin
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') window.open('admin.html', '_blank');
  });
});
