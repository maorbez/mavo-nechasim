(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const photo = document.getElementById('main-photo');
  const thumbnails = Array.from(document.querySelectorAll('.thumbnail'));
  const counter = document.getElementById('counter');
  const notice = document.getElementById('notice');
  const error = document.getElementById('load-error');
  if (!stage || !photo || !thumbnails.length) return;
  let selected = 0;
  let noticeTimer;
  let start;

  function show(index) {
    selected = (index + thumbnails.length) % thumbnails.length;
    const thumbnail = thumbnails[selected];
    error.hidden = true;
    photo.src = thumbnail.querySelector('img').getAttribute('src');
    photo.alt = `תמונת הנכס ${selected + 1} מתוך ${thumbnails.length}`;
    counter.textContent = `תמונה ${selected + 1} מתוך ${thumbnails.length}`;
    thumbnails.forEach((item, i) => item.setAttribute('aria-pressed', String(i === selected)));
    thumbnail.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  function showNotice(event) {
    event.preventDefault();
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 2200);
  }

  photo.addEventListener('error', () => { error.hidden = false; });
  photo.addEventListener('load', () => { error.hidden = true; });
  document.getElementById('next').addEventListener('click', () => show(selected + 1));
  document.getElementById('previous').addEventListener('click', () => show(selected - 1));
  thumbnails.forEach((item, index) => item.addEventListener('click', () => show(index)));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && ['s', 'p'].includes(event.key.toLowerCase())) {
      showNotice(event);
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault(); show(selected + 1);
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'ArrowRight') {
      event.preventDefault(); show(selected - 1);
    }
  });
  document.querySelectorAll('.stage,.thumbnails,.static-gallery').forEach(surface => {
    surface.addEventListener('contextmenu', showNotice);
    surface.addEventListener('dragstart', showNotice);
    surface.addEventListener('copy', showNotice);
  });
  stage.addEventListener('touchstart', event => {
    start = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) show(selected + (dx > 0 ? 1 : -1));
    start = null;
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { start = null; }, { passive: true });
})();
