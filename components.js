/**
 * components.js — Mavo Nechasim Shared Components v1
 *
 * Single source of truth for the contact section.
 * To update the form (field labels, consent text, options) — edit ONLY this file.
 * All neighborhood pages call GlobesComponents.renderContact() on load.
 *
 * Usage in each page HTML:
 *   <section class="section section-dark" id="contact">
 *     <div class="container" style="max-width:680px;" id="contact-root"></div>
 *   </section>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function() {
 *       GlobesComponents.renderContact('contact-root', {
 *         neighborhood: 'נווה צדק',
 *         subjects: ['קנייה בנווה צדק','השכרה','הערכת שווי','השקעה','אחר'],
 *         placeholder: 'מחפש נכס בנווה צדק...'
 *       });
 *     });
 *   </script>
 */
(function () {
  'use strict';

  /* ─── helpers ─────────────────────────────────────── */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style') {
          node.setAttribute('style', attrs[k]);
        } else if (k === 'for') {
          node.setAttribute('for', attrs[k]);
        } else if (k in node) {
          node[k] = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === 'string') {
        node.appendChild(document.createTextNode(c));
      } else if (c) {
        node.appendChild(c);
      }
    });
    return node;
  }

  function svgSend() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '18'); svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2'); svg.setAttribute('viewBox', '0 0 24 24');
    var line = document.createElementNS(ns, 'line');
    line.setAttribute('x1','22'); line.setAttribute('y1','2');
    line.setAttribute('x2','11'); line.setAttribute('y2','13');
    var poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points','22 2 15 22 11 13 2 9 22 2');
    svg.appendChild(line); svg.appendChild(poly);
    return svg;
  }

  /* ─── main renderer ────────────────────────────────── */
  function renderContact(rootId, opts) {
    var root = document.getElementById(rootId);
    if (!root) return;

    var hood     = opts.neighborhood || '';
    var heading  = opts.heading || ('מחפשים נכס' + (hood ? ' ב' + hood : '') + '?');
    var subjects = opts.subjects || ['קנייה', 'השכרה', 'הערכת שווי', 'השקעה', 'אחר'];
    var pholder  = opts.placeholder || 'ספר לנו על הנכס שאתה מחפש...';

    /* header */
    var tag = el('div', { className: 'section-tag light' }, ['צרו קשר']);
    var h2  = el('h2',  { className: 'section-title light' }, [heading]);
    var sub = el('p',   { style: 'color:#94a3b8;margin-bottom:2rem;' }, ['השאירו פרטים ויצרו איתכם קשר תוך שעה']);
    var hdr = el('div', { className: 'section-header' }, [tag, h2, sub]);

    /* name + phone row */
    var gName = el('div', { className: 'form-group' }, [
      el('label', {}, ['שם מלא *']),
      el('input', { type: 'text', placeholder: 'ישראל ישראלי', required: true })
    ]);
    var gPhone = el('div', { className: 'form-group' }, [
      el('label', {}, ['טלפון *']),
      el('input', { type: 'tel', placeholder: '050-0000000', required: true })
    ]);
    var row1 = el('div', { className: 'form-row' }, [gName, gPhone]);

    /* email */
    var gEmail = el('div', { className: 'form-group' }, [
      el('label', {}, ['אימייל']),
      el('input', { type: 'email', placeholder: 'example@email.com' })
    ]);

    /* subject select */
    var select = el('select', {});
    subjects.forEach(function (s) {
      select.appendChild(el('option', {}, [s]));
    });
    var gSubject = el('div', { className: 'form-group' }, [
      el('label', {}, ['נושא הפנייה']),
      select
    ]);

    /* message */
    var gMsg = el('div', { className: 'form-group' }, [
      el('label', {}, ['הודעה']),
      el('textarea', { rows: 4, placeholder: pholder })
    ]);

    /* consent */
    var cb   = el('input', { type: 'checkbox', id: 'marketingConsent', name: 'marketingConsent' });
    var cSpan = el('span', {}, ['אני מסכים/ה לקבל עדכוני נכסים, הצעות ותוכן שיווקי ממבוא נכסים (ניתן לביטול בכל עת).']);
    var cLabel = el('label', { className: 'consent-label' }, [cb, cSpan]);
    var privLink = el('a', { href: 'privacy.html', target: '_blank' }, ['מדיניות הפרטיות']);
    var cNote = el('p', { className: 'consent-note' });
    cNote.appendChild(document.createTextNode('בלחיצה על "שלח פנייה" אתה מאשר/ת את '));
    cNote.appendChild(privLink);
    cNote.appendChild(document.createTextNode(' שלנו.'));
    var gConsent = el('div', { className: 'form-group form-consent' }, [cLabel, cNote]);

    /* submit */
    var submitBtn = el('button', { type: 'submit', className: 'btn-primary full' }, ['שלח פנייה']);
    submitBtn.insertBefore(svgSend(), submitBtn.firstChild);

    var note = el('p', { className: 'form-note' }, ['* חוזרים תוך שעה בשעות פעילות']);

    /* form */
    var form = el('form', { className: 'contact-form', onsubmit: 'submitForm(event)' },
      [row1, gEmail, gSubject, gMsg, gConsent, submitBtn, note]);

    /* append */
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(hdr);
    root.appendChild(form);
  }

  window.GlobesComponents = { renderContact: renderContact };
})();
