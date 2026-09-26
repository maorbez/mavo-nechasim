// ============================
// Mavo Nechasim — App Logic
// ============================

const WA_NUMBER = '972548026123';
const SITE_URL = window.MAVO_PUBLIC_SITE_URL || 'https://mavorealestate.com/';

// ← החלף בכתובת המייל האמיתית של המשרד
const CONTACT_EMAIL = 'maor.globes@gmail.com';

// ---- Security: HTML escaping to prevent XSS ----
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasDisplayValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
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
  const features = [];
  if (hasDisplayValue(p.rooms)) features.push(`🛏 ${p.rooms} חדרים`);
  if (hasDisplayValue(p.baths)) features.push(`🚿 ${p.baths} אמבטיות`);
  if (hasDisplayValue(p.sqm)) features.push(`📐 ${p.sqm} מ"ר`);
  if (hasDisplayValue(p.extra)) features.push(`✅ ${p.extra}`);
  const featLine = features.join(' | ');
  const propUrl = `${SITE_URL}?prop=${p.id}`;
  const msg =
    `${p.emoji} *${p.title}*\n` +
    `📍 ${MavoCatalog.locationLabel(p)}\n` +
    `💰 ${p.priceLabel}\n` +
    `${featLine}\n\n` +
    `🔗 לצפייה בנכס:\n${propUrl}\n\n` +
    (MavoCatalog.navigationUrl(p) ? `🗺 ניווט בוויז:\n${MavoCatalog.navigationUrl(p)}\n\n` : '') +
    `📞 מבוא נכסים | 054-802-6123`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ---- Load properties through the shared read-only inventory client ----
let properties = []; // single source of truth, filled on init

async function loadProperties() {
  if (!window.loadMavoProperties) {
    throw new Error('db.js must load before app.js');
  }
  const result = await window.loadMavoProperties();
  return result.properties;
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
    scrollWheelZoom: true,
    attributionControl: true
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  addMavoBasemap(map);

  setupMapAreas(props);
  props.forEach(p => addMarker(p));
  updateMapCount(props);

  // Fix rendering after container paint
  setTimeout(() => map.invalidateSize(), 300);
}

function setupMapAreas(props) {
 const root=document.querySelector('.map-controls')||document.getElementById('mainMap')?.parentElement;if(!root||document.getElementById('mapArea'))return;
 const label=document.createElement('label');label.htmlFor='mapArea';label.textContent='אזור במפה';
 const select=document.createElement('select');select.id='mapArea';select.style.cssText='min-height:44px;padding:8px 12px;margin:8px;border:1px solid #8C8475;background:#F8F3E9;color:#242424;border-radius:6px';select.add(new Option('כל האזורים',''));
 const seen=new Set();props.forEach(p=>{const l=MavoCatalog.location(p);for(const [value,text] of [[l.city+'|',l.city],[l.city+'|'+l.hood,l.city+' · '+l.hood]]){if(!l.city||(!l.hood&&value!==l.city+'|')||seen.has(value))continue;seen.add(value);select.add(new Option(text,value));}});
 select.onchange=()=>{applyMapFilters();const visible=markers.filter(m=>map.hasLayer(m));if(visible.length)map.fitBounds(visible.map(m=>m.getLatLng()),{padding:[45,45],maxZoom:15});};label.appendChild(select);root.prepend(label);
}

function typeColor(type) {
  if (type === 'sale' || type === 'rent') return { pin:'#242424', dot:'#C8A052' };
  if (type.startsWith('commercial')) return { pin:'#242424', dot:'#C8A052' };
  return { pin:'#242424', dot:'#C8A052' };
}

function addMarker(p) {
  // Skip markers with no valid coordinates
  if (!MavoCatalog.hasCoordinates(p)) return;

  const { pin, dot } = typeColor(p.type);
  const label = p.priceLabel || ('₪ ' + p.price);
  const shortLabel = label.split('/')[0].trim(); // remove " / לחודש" for pin
  const icon = L.divIcon({
    className: 'mavo-map-target',
    html: '<span class="mavo-map-dot '+(String(p.type).startsWith('commercial')?'map-commercial':'map-residential')+'">'+esc(shortLabel)+'</span>',
    iconSize: [110, 44], iconAnchor: [55, 22]
  });
  const m = L.marker([p.lat, p.lng], { icon, zIndexOffset: 0, riseOnHover: true })
    .addTo(map)
    .on('click', () => {
      const peers=markers.filter(x=>map.hasLayer(x)&&Number(x._propData.lat)===Number(p.lat)&&Number(x._propData.lng)===Number(p.lng));
      if(peers.length>1){const list=document.createElement('div');peers.forEach(x=>{const button=document.createElement('button');button.className='btn-outline-primary';button.style.display='block';button.textContent=x._propData.title+' · '+(x._propData.priceLabel||x._propData.price);button.onclick=()=>openPropertyModal(x._propData);list.appendChild(button);});m.bindPopup(list).openPopup();}
      else openPropertyModal(p);
    });
  m.bindTooltip(() => createMavoMapPreview(p), {direction:'top',offset:[0,-18],className:'mavo-map-preview-tooltip',opacity:1});
  m.on('tooltipopen',()=>{const tip=m.getTooltip();const lower=map.latLngToContainerPoint(m.getLatLng()).y<290;tip.options.direction=lower?'bottom':'top';tip.options.offset=[0,lower?12:-18];tip.update();});
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

  const requiredAmenities = [['mapParking','hasParking'],['mapElevator','hasElevator'],['mapShelter','hasShelter']]
    .filter(([id]) => document.getElementById(id)?.checked).map(([,field]) => field);
  let count = 0;
  markers.forEach(m => {
    const p = m._propData;
    let typeMatch = MavoCatalog.matchesType(p, activeType);

    let roomsMatch = true;
    if (roomsMin !== null || roomsMax !== null) {
      const r = parseFloat(p.rooms);
      if (!Number.isFinite(r)) roomsMatch = false;
      if (roomsMin !== null && r < roomsMin) roomsMatch = false;
      if (roomsMax !== null && r > roomsMax) roomsMatch = false;
    }
    
    const area=document.getElementById('mapArea')?.value||'';
    const [city,hood]=area.split('|');
    const areaMatch=MavoCatalog.inScope(p,{city,hood});
    if (typeMatch && roomsMatch && areaMatch && requiredAmenities.every(field => p[field] === true)) {
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
  document.getElementById('mapCount').textContent = props.filter(MavoCatalog.hasCoordinates).length;
}

// ============================
// CITY + NEIGHBORHOOD FILTERS (dynamic, grouped by city)
// ============================
function filterByCity(el, city) {
  catalogFilters.city = city; catalogFilters.hood = '';
  document.querySelectorAll('.city-btn, .hood-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active'); applyCatalogFilters();
}
const catalogFilters = { type: 'all', city: '', hood: '' };
function applyCatalogFilters() {
  let count = 0;
  document.querySelectorAll('.prop-card').forEach(card => {
    const p = {type:card.dataset.type, location:card.dataset.location, hood:card.dataset.hood};
    const match = MavoCatalog.matchesType(p,catalogFilters.type) && MavoCatalog.inScope(p,catalogFilters);
    card.classList.toggle('hidden', !match); if(match) count++;
  });
  const empty = document.getElementById('catalogEmpty');
  if(empty) empty.hidden = count > 0;
  syncPagination();
  if(window.dispatchEvent)window.dispatchEvent(new CustomEvent('mavo:catalog-filter',{detail:{...catalogFilters}}));
}
function buildNeighborhoodFilters(props) {
  const container=document.getElementById('dynamicHoods'); if(!container)return;
  container.innerHTML='';
  const seen=new Set();
  props.forEach(p=>{
    const l=MavoCatalog.location(p);const key=l.city+'|'+l.hood;
    if(!l.hood||seen.has(key))return;seen.add(key);
    const btn=document.createElement('button');btn.className='filter-btn hood-btn';
    btn.textContent=l.hood;btn.onclick=()=>filterByNeighborhood(btn,l.hood,l.city);container.appendChild(btn);
  });
}
function filterByNeighborhood(el, hood, city) {
  catalogFilters.hood=hood;if(city)catalogFilters.city=city;
  document.querySelectorAll('.hood-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');applyCatalogFilters();
}

// ============================
// MODAL
// ============================
function openPropertyModal(p) {
  const overlay = document.getElementById('propModalOverlay');
  if (!overlay) { window.location.href='index.html?prop='+encodeURIComponent(p.id); return; }

  // Gallery (photos + optional videos; image main click opens a fullscreen lightbox)
  const main = document.getElementById('galleryMain');
  const thumbsEl = document.getElementById('galleryThumbs');
  main.style.background = p.bg;
  main.style.opacity = '1';
  main.style.removeProperty('--media-ratio');
  thumbsEl.textContent = '';

  const media = orderPropertyMedia(p.photos);
  _galleryImages = media.filter(u => !isVideoUrl(u));   // images only, for the lightbox

  if (media.length > 0) {
    const firstShown = media[0];
    showGalleryItem(main, firstShown);
    media.forEach((src, index) => {
      const vid = isVideoUrl(src);
      const d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', `${vid ? 'סרטון' : 'תמונה'} ${index + 1} מתוך ${media.length}`);
      d.className = 'gallery-thumb' + (src === firstShown ? ' active' : '') + (vid ? ' is-video' : '');
      d.style.fontSize = '0';
      if (vid) {
        d.style.background = '#000';
      } else {
        d.style.backgroundImage = `url(${src})`;
        d.style.backgroundSize = 'cover';
        d.style.backgroundPosition = 'center';
      }
      d.addEventListener('click', function () {
        if (vid) { openLightbox(src); return; }   // video → fullscreen player at original size
        document.querySelectorAll('.gallery-thumb').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        showGalleryItem(main, src);
        this.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      thumbsEl.appendChild(d);
    });
  } else {
    main.classList.remove('is-video');
    main.dataset.lightbox = '';
    main.textContent = (p.thumbs && p.thumbs[0]) || p.emoji || '🏠';
    main.style.fontSize = '7rem';
    main.style.backgroundImage = '';
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
    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${esc(MavoCatalog.locationLabel(p))}`;

  const modalFeatures = [];
  if (hasDisplayValue(p.rooms)) modalFeatures.push(`<span>🛏 ${esc(p.rooms)} חדרים</span>`);
  if (hasDisplayValue(p.baths)) modalFeatures.push(`<span>🚿 ${esc(p.baths)} אמבטיות</span>`);
  if (hasDisplayValue(p.sqm)) modalFeatures.push(`<span>📐 ${esc(p.sqm)} מ"ר</span>`);
  if (hasDisplayValue(p.extra)) modalFeatures.push(`<span>✅ ${esc(p.extra)}</span>`);
  if (!p.rooms) modalFeatures.push(`<span>${esc(p.emoji)} נדל"ן מסחרי</span>`);
  document.getElementById('modalFeatures').innerHTML = modalFeatures.join('');

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
  const waze = document.getElementById('modalWaze');
  const navigation = MavoCatalog.navigationUrl(p);
  waze.hidden = !navigation;
  waze.style.display = navigation ? '' : 'none';
  if (navigation) waze.href = navigation; else waze.removeAttribute('href');

  // Form subtitle
  document.getElementById('modalFormSub').textContent = `שאלות על: ${p.title} — ${MavoCatalog.locationLabel(p)}`;

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

// ---- Photos + video gallery / fullscreen lightbox ----
let _galleryImages = [];   // image URLs of the open property (for lightbox navigation)
let _lbIndex = 0;

function isVideoUrl(u) {
  return /youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)|\.webm(\?|$)|\.mov(\?|$)/i.test(u || '');
}

function orderPropertyMedia(items) {
  const media = Array.isArray(items) ? items.slice() : [];
  return media.filter(isVideoUrl).concat(media.filter(src => !isVideoUrl(src)));
}

// Build a safe DOM player node (no innerHTML — avoids injection)
function buildVideoNode(src, autoplay) {
  let m;
  if ((m = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/))) {
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube.com/embed/' + m[1] + (autoplay ? '?autoplay=1' : '');
    f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.style.cssText = 'width:100%;height:100%;border:0;display:block';
    return f;
  }
  if ((m = src.match(/vimeo\.com\/(\d+)/))) {
    const f = document.createElement('iframe');
    f.src = 'https://player.vimeo.com/video/' + m[1] + (autoplay ? '?autoplay=1' : '');
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.style.cssText = 'width:100%;height:100%;border:0;display:block';
    return f;
  }
  const v = document.createElement('video');
  v.src = src; v.controls = true; v.playsInline = true;
  if (autoplay) v.autoplay = true;
  v.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#242424;display:block';
  return v;
}

function fitGalleryMedia(main, media) {
  if (!main.contains(media)) return;
  const width = media.naturalWidth || media.videoWidth;
  const height = media.naturalHeight || media.videoHeight;
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    main.style.setProperty('--media-ratio', width + ' / ' + height);
  }
}

// Show one media item in the gallery main area
function showGalleryItem(main, src) {
  main.innerHTML = '';
  main.style.removeProperty('--media-ratio');
  main.style.opacity = '1';
  if (isVideoUrl(src)) {
    main.classList.add('is-video');
    main.style.backgroundImage = '';
    main.style.cursor = 'default';
    main.dataset.lightbox = '';
    const player = buildVideoNode(src);
    player.addEventListener('loadedmetadata', () => fitGalleryMedia(main, player));
    player.addEventListener('error', () => {
      if (!main.contains(player)) return;
      if (_galleryImages.length) showGalleryItem(main, _galleryImages[0]);
      else main.replaceChildren();
      const notice = document.createElement('div');
      notice.className = 'gallery-media-notice';
      notice.textContent = 'הסרטון אינו זמין כרגע';
      main.appendChild(notice);
    }, {once:true});
    main.appendChild(player);
  } else {
    main.classList.remove('is-video');
    main.style.backgroundImage = '';
    const image = document.createElement('img');
    image.className = 'gallery-media-image';
    image.alt = 'תמונת הנכס';
    image.addEventListener('load', () => fitGalleryMedia(main, image));
    main.appendChild(image);
    image.src = src;
    main.style.cursor = 'zoom-in';
    main.dataset.lightbox = src;
  }
}

function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const rtl = getComputedStyle(lb).direction === 'rtl';
  lb.dataset.rtl = String(rtl);
  lb.querySelector('.lb-prev').textContent = rtl ? '›' : '‹';
  lb.querySelector('.lb-next').textContent = rtl ? '‹' : '›';
  const imgEl = document.getElementById('lightboxImg');
  const counter = document.getElementById('lbCounter');
  const prev = lb.querySelector('.lb-video'); if (prev) prev.remove();
  if (isVideoUrl(src)) {
    // video → play large, original aspect ratio, no image nav
    imgEl.style.display = 'none';
    lb.querySelectorAll('.lb-nav').forEach(n => n.style.display = 'none');
    counter.textContent = '';
    const node = buildVideoNode(src, true);
    node.classList.add('lb-video');
    if (node.tagName === 'VIDEO') {
      node.style.cssText = 'max-width:94vw;max-height:88vh;width:auto;height:auto;border-radius:8px;background:#000;display:block';
    } else {
      node.style.cssText = 'width:min(94vw,1100px);aspect-ratio:16/9;max-height:88vh;border:0;border-radius:8px;background:#000;display:block';
    }
    lb.insertBefore(node, counter);
    lb.classList.add('open');
    if (node.tagName === 'VIDEO') { try { node.play(); } catch (e) {} }
    return;
  }
  imgEl.style.display = '';
  lb.querySelectorAll('.lb-nav').forEach(n => n.style.display = '');
  const imgs = _galleryImages.length ? _galleryImages : [src];
  _lbIndex = Math.max(0, imgs.indexOf(src));
  imgEl.src = imgs[_lbIndex];
  counter.textContent = (_lbIndex + 1) + ' / ' + imgs.length;
  lb.classList.add('open');
}
function lightboxNav(dir, ev) {
  if (ev) ev.stopPropagation();
  if (document.querySelector('#lightbox .lb-video')) return;   // no image-nav while a video is open
  const imgs = _galleryImages;
  if (imgs.length < 2) return;
  _lbIndex = (_lbIndex + dir + imgs.length) % imgs.length;
  document.getElementById('lightboxImg').src = imgs[_lbIndex];
  document.getElementById('lbCounter').textContent = (_lbIndex + 1) + ' / ' + imgs.length;
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const vid = lb.querySelector('.lb-video');
  if (vid) { try { if (vid.pause) vid.pause(); } catch (e) {} vid.remove(); }
  const imgEl = document.getElementById('lightboxImg'); if (imgEl) imgEl.style.display = '';
  lb.classList.remove('open');
}

// Wire the gallery main image → fullscreen lightbox, plus keyboard nav (attach once)
(function wireLightbox() {
  // Suppress double-tap zoom on controls, without suppressing either click
  // or disabling pinch zoom for the page/image.
  const lbControls = document.querySelectorAll('.lb-nav, .lb-close');
  lbControls.forEach(control => control.addEventListener('dblclick', e => e.preventDefault()));
  const thumbs = document.getElementById('galleryThumbs');
  if (thumbs) thumbs.addEventListener('wheel', e => {
    if (e.ctrlKey || e.deltaX || !e.deltaY || thumbs.scrollWidth <= thumbs.clientWidth) return;
    const before = thumbs.scrollLeft;
    const direction = getComputedStyle(thumbs).direction === 'rtl' ? -1 : 1;
    thumbs.scrollLeft += e.deltaY * direction;
    if (thumbs.scrollLeft !== before) e.preventDefault();
  }, { passive: false });
  const gm = document.getElementById('galleryMain');
  if (gm) gm.addEventListener('click', function () {
    if (this.dataset.lightbox) openLightbox(this.dataset.lightbox);
  });
  document.addEventListener('keydown', function (e) {
    const lb = document.getElementById('lightbox');
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const forwardKey = getComputedStyle(lb).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      lightboxNav(e.key === forwardKey ? 1 : -1);
    }
  });
})();

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
  if (form.querySelector('[name="_honey"]')?.value) {   // honeypot: bots fill it → drop silently
    closeModalBtn(); showToast('הפנייה נשלחה! ניצור קשר בקרוב.'); form.reset(); return;
  }
  const btn = form.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'שולח...';
  try {
    const val = sel => (form.querySelector(sel)?.value || '').trim();
    const payload = {
      _subject: 'פנייה על נכס — מבוא נכסים',
      name:    val('[name="name"]'),
      phone:   val('[name="phone"]'),
      email:   val('[name="email"]') || 'לא צוין',
      interest: val('[name="interest"]'),
      property: document.getElementById('modalFormSub')?.textContent || '',
      message: val('[name="message"]') || 'לא צוין',
      marketing_consent: form.querySelector('[name="marketingConsent"]')?.checked ? 'כן' : 'לא',
    };
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { saveLeadToDB(payload); closeModalBtn(); showToast('הפנייה נשלחה! ניצור קשר בקרוב.'); form.reset(); }
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

// Keep navigation open until the user closes it or chooses a destination.
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  const button = document.getElementById('hamburger');
  if (!menu || !button) return;
  const open = menu.classList.toggle('open');
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-controls', 'mobileMenu');
}

function setTab(el, type) {
  document.querySelectorAll('.search-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');el.dataset.type=type;
}
function filterProps(el, type) {
  el.parentElement.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');catalogFilters.type=type;applyCatalogFilters();
}

function scrollToContact() {
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}

function quickSearch(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('navSearchInput');
  const q = (input && input.value || '').trim();
  if (!q) { window.location.href = 'search.html'; return; }
  window.location.href = 'search.html?q=' + encodeURIComponent(q);
}

function doSearch() {
  const params=new URLSearchParams();
  const value=id=>document.getElementById(id)?.value||'';
  const type=document.querySelector('.search-tabs .tab.active')?.dataset.type||'all';
  for(const [key,v] of Object.entries({city:value('heroCity'),hood:value('heroHood'),type,rooms:value('heroRooms'),priceMax:value('heroBudget')}))if(v&&v!=='all')params.set(key,v);
  window.location.href='search.html?'+params.toString();
}
function setupHeroSearch(props) {
 const city=document.getElementById('heroCity'),hood=document.getElementById('heroHood');if(!city||!hood)return;
 const locations=props.map(MavoCatalog.location);
 for(const c of [...new Set(locations.map(l=>l.city).filter(Boolean))])city.add(new Option(c,c));
 const update=()=>{hood.replaceChildren(new Option('כל השכונות',''));const hoods=locations.filter(l=>!city.value||l.city===city.value).map(l=>l.hood).filter(Boolean);for(const h of [...new Set(hoods)])hood.add(new Option(h,h));};
 city.addEventListener('change',update);update();
}

async function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  if (form.querySelector('[name="_honey"]')?.value) {   // honeypot: bots fill it → drop silently
    showToast('הפנייה נשלחה! ניצור קשר בקרוב.'); form.reset(); return;
  }
  const btn = form.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'שולח...';
  try {
    const payload = {
      _subject: 'פנייה חדשה מאתר מבוא נכסים',
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
    if (res.ok) { saveLeadToDB(payload); showToast('הפנייה נשלחה! ניצור קשר בקרוב.'); form.reset(); }
    else { showToast('שגיאה בשליחה — נסה שוב.'); }
  } catch { showToast('שגיאה בשליחה — נסה שוב.'); }
  finally { btn.disabled = false; btn.textContent = origText; }
}

// Backup every lead into Supabase (in addition to the email). Silent no-op until the leads table exists.
async function saveLeadToDB(p) {
  try {
    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return;
    await fetch(window.SUPABASE_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: {
        apikey: window.SUPABASE_KEY,
        Authorization: 'Bearer ' + window.SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        name: p.name || '',
        phone: p.phone || '',
        email: (p.email && p.email !== 'לא צוין') ? p.email : '',
        subject: p.subject || p.interest || '',
        message: (p.message && p.message !== 'לא צוין') ? p.message : '',
        property: p.property || '',
        consent: p.marketing_consent === 'כן'
      })
    });
  } catch (_) { /* email already sent; DB backup is best-effort */ }
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

    // real photo if available (first non-video image; videos play inside the modal)
    const cardImg = (p.photos || []).find(u => !isVideoUrl(u));
    const hasVideo = (p.photos || []).some(isVideoUrl);
    if (cardImg) {
      const realImg = document.createElement('img');
      realImg.src = cardImg;
      realImg.alt = p.title || '';
      realImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0';
      propImg.style.position = 'relative';
      propImg.style.overflow = 'hidden';
      propImg.appendChild(realImg);
    }
    if (hasVideo) {
      const vb = document.createElement('div');
      vb.className = 'prop-video-badge';
      vb.textContent = '▶ סרטון';
      propImg.style.position = 'relative';
      propImg.appendChild(vb);
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
    // hide emoji if a real photo exists (video-only listings still show the emoji)
    if (!cardImg) iconBig.textContent = p.emoji || '🏠';
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
    loc.appendChild(document.createTextNode(' ' + MavoCatalog.locationLabel(p)));
    body.appendChild(loc);

    const feats = document.createElement('div');
    feats.className = 'prop-features';
    const addSpan = txt => { const s = document.createElement('span'); s.textContent = txt; feats.appendChild(s); };
    if (!isComm && p.rooms) {
      addSpan('🛏 ' + p.rooms + ' חדרים');
      if (hasDisplayValue(p.baths)) addSpan('🚿 ' + p.baths + ' אמבטיות');
      if (hasDisplayValue(p.sqm)) addSpan('📐 ' + p.sqm + ' מ"ר');
      if (p.extra) addSpan('🏠 ' + p.extra);
    } else {
      if (hasDisplayValue(p.sqm)) addSpan('📐 ' + p.sqm + ' מ"ר');
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
    agName.textContent = (p.agent && p.agent.name) || 'מבוא נכסים';
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
  // Live Supabase is authoritative; degraded snapshots are always disclosed in the UI.
  properties = await loadProperties();

  // Dynamically render property cards from data (replaces hardcoded HTML cards)
  const scope = {city:document.body.dataset.city||'',hood:document.body.dataset.hood||''};
  const scoped = properties.filter(p=>MavoCatalog.inScope(p,scope));
  renderPropertiesGrid(scoped);
  setupHeroSearch(properties);
  applyCatalogFilters();

  // Build neighborhood filters
  buildNeighborhoodFilters(scoped);

  // Lazy-init the map only when it scrolls into view (keeps initial load + hero smooth)
  const mapEl = document.getElementById('mainMap');
  if (mapEl) {
    if ('IntersectionObserver' in window) {
      let mapInited = false;
      const mapObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !mapInited) {
          mapInited = true;
          initMap(properties);
          mapObserver.disconnect();
        }
      }, { rootMargin: '250px' });
      mapObserver.observe(mapEl);
    } else {
      initMap(properties);
    }
  }

  // Extract gold from logo (remove blue background via Canvas)
  // Brand SVGs are rendered without destructive canvas recoloring.

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

});
