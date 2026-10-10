/* Carry an explicit language choice into the live catalog without changing IDs. */
(function () {
  'use strict';
  var supported = ['he', 'en', 'fr', 'de', 'es', 'ar'];
  var choice = new URLSearchParams(location.search).get('lang');
  if (choice && supported.includes(choice)) {
    sessionStorage.setItem('globes_lang', choice === 'he' ? 'iw' : choice);
  }
  var initial = sessionStorage.getItem('globes_lang');
  if (initial && initial !== 'iw' && supported.includes(initial)) {
    document.cookie = 'googtrans=/iw/' + initial + '; path=/; SameSite=Lax';
  }
  document.addEventListener('DOMContentLoaded', function () {
    var language = sessionStorage.getItem('globes_lang');
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
