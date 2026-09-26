/* Shared keyless basemap; Leaflet retains property markers and controls. */
(function () {
  'use strict';
  if (window.maplibregl) maplibregl.setRTLTextPlugin(new URL('assets/maps/rtl-text.js', document.baseURI).href, true);
  // MapLibre 5 exposes a transform snapshot; use its public camera API.
  if (L.MaplibreGL) L.MaplibreGL.include({
    _transformGL: function (gl) {
      const center = this._map.getCenter();
      gl.jumpTo({center:[center.lng, center.lat], zoom:this._map.getZoom()-1, animate:false});
    }
  });
  window.createMavoMapPreview = function (property, count = 1) {
    const card = document.createElement('div');
    card.className = 'mavo-map-preview'; card.dir = 'rtl';
    const photo = document.createElement('div'); photo.className = 'mavo-map-preview-photo';
    const placeholder = document.createElement('span'); placeholder.textContent = 'מבוא נכסים';
    photo.appendChild(placeholder);
    const safeMedia = (property.photos || []).filter(value => {
      if (typeof value !== 'string') return false;
      try { return /^https?:$/.test(new URL(value, document.baseURI).protocol); } catch { return false; }
    });
    const videoPattern = /\.(mp4|webm|mov)(?:[?#]|$)|youtube\.com|youtu\.be|vimeo\.com/i;
    const url = safeMedia.find(value => videoPattern.test(value)) || safeMedia[0];
    if (url) {
      let media;
      const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const vimeo = url.match(/vimeo\.com\/(\d+)/);
      if (youtube || vimeo) {
        media = document.createElement('iframe'); media.title = 'סרטון הנכס';
        media.src = youtube ? 'https://www.youtube.com/embed/'+youtube[1]+'?autoplay=1&mute=1&playsinline=1' : 'https://player.vimeo.com/video/'+vimeo[1]+'?autoplay=1&muted=1';
        media.allow = 'autoplay; encrypted-media'; media.tabIndex = -1;
      } else if (videoPattern.test(url)) {
        media = document.createElement('video'); media.src = url;
        media.muted = true; media.autoplay = true; media.loop = true; media.playsInline = true; media.preload = 'metadata';
      } else {
        media = document.createElement('img'); media.alt = property.title || 'תמונת הנכס'; media.src = url; media.decoding = 'async';
      }
      media.onerror = function () {
        media.remove();
        const fallback = safeMedia.find(value => !videoPattern.test(value));
        if (videoPattern.test(url) && fallback) {
          const image = document.createElement('img'); image.alt = property.title || 'תמונת הנכס'; image.src = fallback;
          image.onerror = () => image.remove(); photo.appendChild(image);
        }
      };
      photo.appendChild(media);
    }
    const body = document.createElement('div'); body.className = 'mavo-map-preview-body';
    const price = document.createElement('strong'); price.textContent = property.priceLabel || (property.price ? '₪ ' + property.price : 'מחיר בתיאום');
    const title = document.createElement('div'); title.className = 'mavo-map-preview-title'; title.textContent = property.title || property.location || 'נכס';
    const facts = document.createElement('div'); facts.className = 'mavo-map-preview-facts';
    facts.textContent = [property.rooms ? property.rooms + ' חדרים' : '', property.sqm ? property.sqm + ' מ״ר' : '', MavoCatalog.locationLabel(property)].filter(Boolean).join(' · ');
    const hint = document.createElement('small'); hint.textContent = count > 1 ? 'ועוד ' + (count - 1) + ' נכסים באותו מיקום · לחצו לצפייה' : 'לחצו לפרטי הנכס';
    body.append(price, title, facts, hint); card.append(photo, body); return card;
  };
  window.addMavoBasemap = function (map) {
    map.setMinZoom(2);
    map.setMaxZoom(19);
    const attribution = '<a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    if (typeof L.maplibreGL === 'function') {
      try {
        const layer = L.maplibreGL({style: 'assets/maps/mavo-light.json', attribution, interactive: false, updateInterval: 16}).addTo(map);
        map._mavoBasemap = layer;
        map.getContainer().classList.add('mavo-vector-map');
      } catch (error) {
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OpenStreetMap contributors', maxZoom:19}).addTo(map);
      }
    }
    if (map.attributionControl) {
      map.attributionControl.setPrefix(false);
      const credits = map.attributionControl.getContainer();
      const footer = document.createElement('div');
      footer.className = 'mavo-map-attribution';
      footer.innerHTML = credits.innerHTML;
      map.getContainer().insertAdjacentElement('afterend', footer);
      map.removeControl(map.attributionControl);
    }
    const container = map.getContainer();
    // Leaflet TouchZoom supports two-finger translation as well as pinching.
    // Disable only its single-pointer drag handler while a touch is active.
    container.addEventListener('touchstart', function (event) {
      map.dragging.disable();
      container.classList.toggle('mavo-map-touch-hint', event.touches.length === 1);
    }, {passive:true, capture:true});
    const finish = function (event) {
      container.classList.remove('mavo-map-touch-hint');
      if (!event.touches.length) map.dragging.enable();
    };
    container.addEventListener('touchend', finish, {passive:true});
    container.addEventListener('touchcancel', finish, {passive:true});
    container.dataset.touchHint = 'הזיזו את המפה בשתי אצבעות';
    // Interpolate wheel input each animation frame rather than whole zoom jumps.
    map.options.zoomSnap = 0;
    map.options.zoomDelta = 1;
    map.scrollWheelZoom.disable();
    let frame = 0, targetZoom = map.getZoom(), anchor;
    const cancelWheel = function () {
      cancelAnimationFrame(frame); frame = 0; targetZoom = map.getZoom();
    };
    map.on('dragstart', cancelWheel);
    container.addEventListener('touchstart', cancelWheel, {passive:true});
    container.addEventListener('wheel', function (event) {
      event.preventDefault();
      if (!frame) targetZoom = map.getZoom();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1);
      targetZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), targetZoom - Math.max(-0.55,Math.min(0.55,pixels / 550))));
      anchor = map.mouseEventToContainerPoint(event);
      if (frame) return;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let previous = performance.now();
      const step = function (now) {
        const current = map.getZoom(), difference = targetZoom - current;
        const fraction = reduced ? 1 : 1 - Math.exp(-Math.min(now-previous,64)/90);
        previous = now;
        const next = Math.abs(difference)<0.002 ? targetZoom : current + difference*fraction;
        map.setZoomAround(anchor,next,{animate:false});
        frame = next === targetZoom || reduced ? 0 : requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, {passive:false});
    map.on('unload', cancelWheel);

  };
})();
