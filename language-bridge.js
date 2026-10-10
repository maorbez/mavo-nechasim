/* Carry an explicit language choice into the live catalog without changing IDs. */
(function () {
  'use strict';
  var supported = ['he', 'en', 'fr', 'de', 'es', 'ar'];
  var choice = new URLSearchParams(location.search).get('lang');
  if (choice && supported.includes(choice)) {
    sessionStorage.setItem('globes_lang', choice === 'he' ? 'iw' : choice);
  }
  window.mavoSetLanguage = function (lang) {
    if (lang === 'iw') lang = 'he';
    if (!supported.includes(lang)) return;
    sessionStorage.setItem('globes_lang', lang === 'he' ? 'iw' : lang);
    if (lang === 'he') {
      ['/', location.pathname].forEach(function (path) {
        ['', '; domain=' + location.hostname, '; domain=.' + location.hostname].forEach(function (domain) {
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + path + domain;
        });
      });
    }
    var target = new URL(location.href);
    target.searchParams.set('lang', lang);
    var combo = document.querySelector('.goog-te-combo');
    if (combo && lang !== 'he') {
      history.replaceState(null, '', target.href);
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.classList.toggle('site-ltr', lang !== 'ar');
      document.querySelectorAll('.mavo-language-menu button').forEach(function (button) {
        button.setAttribute('aria-pressed', button.lang === lang ? 'true' : 'false');
      });
      document.querySelector('.mavo-language-menu').open = false;
    } else {
      location.href = target.href;
    }
  };
  var initial = sessionStorage.getItem('globes_lang');
  if (initial && initial !== 'iw' && supported.includes(initial)) {
    document.cookie = 'googtrans=/iw/' + initial + '; path=/; SameSite=Lax';
  }
  document.addEventListener('DOMContentLoaded', function () {
    var language = sessionStorage.getItem('globes_lang');
    // One public menu: selection reloads this exact page with its IDs and filters.
    window.changeWebsiteLanguage = window.mavoSetLanguage;
    var panel = document.querySelector('.lang-panel-wrapper');
    if (panel) panel.remove();
    var menu = document.createElement('details');
    menu.className = 'mavo-language-menu';
    menu.setAttribute('translate', 'no');
    menu.innerHTML = '<summary aria-label="שפה / Language">🌐 שפה / Language</summary><div role="group" aria-label="Choose language"></div>';
    var labels = {he:'עברית', en:'English', fr:'Français', de:'Deutsch', es:'Español', ar:'العربية'};
    supported.forEach(function (lang) {
      var button = document.createElement('button');
      button.type = 'button';
      button.lang = lang;
      button.textContent = labels[lang];
      button.setAttribute('aria-pressed', (language || 'iw') === (lang === 'he' ? 'iw' : lang) ? 'true' : 'false');
      button.addEventListener('click', function () { window.mavoSetLanguage(lang); });
      menu.querySelector('div').appendChild(button);
    });
    document.body.appendChild(menu);
    var css = document.createElement('style');
    css.textContent = '.mavo-language-menu{position:fixed;right:12px;top:100px;z-index:10000;font:15px Arial,sans-serif;color:#153f32;background:#fff;border:1px solid #b99b60;border-radius:12px;box-shadow:0 3px 16px #0002;direction:rtl}.mavo-language-menu summary{padding:12px;cursor:pointer;min-height:20px}.mavo-language-menu>div{display:grid;padding:6px;gap:4px}.mavo-language-menu button{min-height:44px;padding:8px 20px;background:#fff;color:#153f32;border:1px solid transparent;border-radius:7px;cursor:pointer;font:inherit}.mavo-language-menu button[aria-pressed=true]{background:#153f32;color:#fff}.mavo-language-menu button:focus-visible,.mavo-language-menu summary:focus-visible{outline:3px solid #b99b60;outline-offset:2px}';
    document.body.appendChild(css);
    document.querySelectorAll('.logo-main, .tl-main').forEach(function (node) {
      node.setAttribute('translate', 'no');
      if (language && language !== 'iw') node.textContent = 'MAVO';
    });
    if (!language || language === 'iw' || !supported.includes(language)) return;
    // Existing homepage/neighborhood translation owns its own initialization.
    if (typeof window.googleTranslateElementInit === 'function') return;
    var host = document.createElement('div');
    host.id = 'google_translate_element';
    host.setAttribute('translate', 'no');
    host.style.cssText = 'position:absolute;opacity:0;pointer-events:none';
    document.body.appendChild(host);
    window.mavoCatalogTranslateInit = function () {
      new google.translate.TranslateElement({pageLanguage:'iw', includedLanguages:'en,fr,de,es,ar,iw', autoDisplay:false}, host.id);
      var attempts = 0;
      var timer = setInterval(function () {
        var combo = document.querySelector('.goog-te-combo');
        if (combo) {
          clearInterval(timer);
          combo.value = language;
          combo.dispatchEvent(new Event('change'));
          document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
          document.documentElement.lang = language;
          document.documentElement.classList.toggle('site-ltr', language !== 'ar');
        } else if (++attempts >= 30) clearInterval(timer);
      }, 200);
    };
    var script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=mavoCatalogTranslateInit';
    document.body.appendChild(script);
  });
})();
