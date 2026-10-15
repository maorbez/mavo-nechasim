/* Carry an explicit language choice into the live catalog without changing IDs. */
(function () {
  'use strict';
  var supported = ['he', 'en', 'fr', 'de', 'es', 'ar'];
  var closeLanguageMenu = function () {};
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
      document.querySelectorAll('.mavo-language-menu button[lang]').forEach(function (button) {
        button.setAttribute('aria-pressed', button.lang === lang ? 'true' : 'false');
      });
      closeLanguageMenu(true);
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
    // One public menu for every catalog page; retain the current destination.
    window.changeWebsiteLanguage = window.mavoSetLanguage;
    var panel = document.querySelector('.lang-panel-wrapper');
    if (panel) panel.remove();
    var menu = document.createElement('div');
    menu.className = 'mavo-language-menu';
    menu.setAttribute('translate', 'no');
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mavo-language-toggle';
    toggle.setAttribute('aria-label', 'שפה / Language');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mavo-language-options');
    toggle.title = 'שפה / Language';
    toggle.innerHTML = '<span aria-hidden="true">🌐</span><span>שפה</span><span class="mavo-language-chevron" aria-hidden="true">‹</span>';
    var options = document.createElement('div');
    options.id = 'mavo-language-options';
    options.className = 'mavo-language-options';
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', 'בחירת שפה / Choose language');
    options.setAttribute('aria-hidden', 'true');
    options.inert = true;
    var expanded = false;
    function setExpanded(value, restoreFocus) {
      expanded = value;
      menu.classList.toggle('is-open', value);
      toggle.setAttribute('aria-expanded', String(value));
      options.setAttribute('aria-hidden', String(!value));
      options.inert = !value;
      if (restoreFocus) toggle.focus({preventScroll:true});
    }
    closeLanguageMenu = function (restoreFocus) { setExpanded(false, restoreFocus); };
    toggle.addEventListener('click', function () { setExpanded(!expanded, false); });
    document.addEventListener('pointerdown', function (event) {
      if (expanded && !menu.contains(event.target)) closeLanguageMenu(false);
    });
    document.addEventListener('focusin', function (event) {
      if (expanded && !menu.contains(event.target)) closeLanguageMenu(false);
    });
    menu.addEventListener('keydown', function (event) {
      if (expanded && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeLanguageMenu(true);
      }
    });
    var labels = {he:'עברית', en:'English', fr:'Français', de:'Deutsch', es:'Español', ar:'العربية'};
    supported.forEach(function (lang) {
      var button = document.createElement('button');
      button.type = 'button';
      button.lang = lang;
      button.textContent = labels[lang];
      button.setAttribute('aria-pressed', (language || 'iw') === (lang === 'he' ? 'iw' : lang) ? 'true' : 'false');
      button.addEventListener('click', function () {
        closeLanguageMenu(true);
        window.mavoSetLanguage(lang);
      });
      options.appendChild(button);
    });
    menu.appendChild(toggle);
    menu.appendChild(options);
    document.body.appendChild(menu);
    var css = document.createElement('style');
    css.textContent = `
      .mavo-language-menu{position:fixed;right:12px;top:100px;z-index:10000;font:14px Arial,sans-serif;color:#28574d;direction:rtl}
      .mavo-language-menu button{font:inherit;cursor:pointer;box-sizing:border-box}
      .mavo-language-toggle{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px;border:1px solid #cbbb9f;border-radius:12px;background:#f8f3e9;color:#28574d;box-shadow:0 3px 16px #0002}
      .mavo-language-chevron{font-size:22px;line-height:1;transition:transform .24s ease}
      .mavo-language-menu.is-open .mavo-language-chevron{transform:rotate(180deg)}
      .mavo-language-options{position:absolute;right:calc(100% + 8px);top:0;width:180px;max-width:calc(100vw - 128px);max-height:calc(100dvh - 120px);overflow-y:auto;overscroll-behavior:contain;display:grid;padding:6px;gap:4px;box-sizing:border-box;border:1px solid #cbbb9f;border-radius:14px;background:#f8f3e9;box-shadow:0 8px 28px #142b2526;opacity:0;visibility:hidden;pointer-events:none;transform:translateX(18px);transition:transform .24s ease,opacity .24s ease,visibility 0s linear .24s}
      .mavo-language-menu.is-open .mavo-language-options{opacity:1;visibility:visible;pointer-events:auto;transform:translateX(0);transition-delay:0s}
      .mavo-language-options button{min-height:44px;width:100%;padding:8px 12px;background:transparent;color:#28574d;border:1px solid transparent;border-radius:9px;text-align:center}
      .mavo-language-options button:hover{background:#ece7dc}
      .mavo-language-options button[aria-pressed=true]{background:#28574d;color:#f8f3e9}
      .mavo-language-menu button:focus-visible{outline:3px solid #c8a052;outline-offset:2px}
      @media(prefers-reduced-motion:reduce){.mavo-language-options,.mavo-language-chevron{transition:none}}
    `;
    document.body.appendChild(css);
    document.querySelectorAll('.logo-main, .tl-main').forEach(function (node) {
      node.setAttribute('translate', 'no');
      if (language && language !== 'iw') node.textContent = 'MAVO';
    });
    // Existing homepage/neighborhood translation owns its own initialization.
    if (typeof window.googleTranslateElementInit === 'function') return;
    var host = document.createElement('div');
    host.id = 'google_translate_element';
    host.setAttribute('translate', 'no');
    host.style.cssText = 'position:absolute;opacity:0;pointer-events:none';
    document.body.appendChild(host);
    window.mavoCatalogTranslateInit = function () {
      new google.translate.TranslateElement({pageLanguage:'iw', includedLanguages:'en,fr,de,es,ar,iw', autoDisplay:false}, host.id);
      if (!language || language === 'iw' || !supported.includes(language)) return;
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
