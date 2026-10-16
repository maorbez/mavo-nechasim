const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Small DOM boundary for executing the real disclosure handlers. Scroll does
// not bubble: a nested scrolling surface reaches document only in capture.
function disclosure() {
  const nodes = [];
  let document;
  function node(tag = '') {
    const listeners = new Map(), attributes = new Map();
    const el = {
      tagName: tag.toUpperCase(), children: [], parentNode: null,
      className: '', style: {}, inert: false,
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      contains(child) { return child === this || this.children.some(n => n.contains(child)); },
      addEventListener(type, callback, options = {}) {
        const capture = options === true || options.capture === true;
        listeners.set(type, [...(listeners.get(type) || []), {callback, capture}]);
      },
      focus() { document.activeElement = this; dispatch(this, 'focusin'); },
      listeners,
    };
    el.classList = {
      contains(name) { return el.className.split(/\s+/).includes(name); },
      toggle(name, force) {
        const classes = new Set(el.className.split(/\s+/).filter(Boolean));
        const enabled = force === undefined ? !classes.has(name) : force;
        if (enabled) classes.add(name); else classes.delete(name);
        el.className = [...classes].join(' ');
        return enabled;
      },
    };
    nodes.push(el);
    return el;
  }
  function dispatch(target, type, extra = {}) {
    const event = {target, type, ...extra, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.stopped = true; }};
    const ancestors = [];
    for (let parent = target.parentNode; parent; parent = parent.parentNode) ancestors.push(parent);
    const call = (current, capture) => {
      for (const listener of current.listeners.get(type) || []) {
        if (listener.capture === capture) listener.callback(event);
      }
    };
    for (const ancestor of [...ancestors].reverse()) {
      call(ancestor, true);
      if (event.stopped) return event;
    }
    call(target, true);
    call(target, false);
    if (type !== 'scroll') for (const ancestor of ancestors) {
      if (event.stopped) break;
      call(ancestor, false);
    }
    return event;
  }
  document = node();
  document.body = node('body');
  document.documentElement = node('html');
  document.appendChild(document.documentElement);
  document.documentElement.appendChild(document.body);
  document.activeElement = document.body;
  document.createElement = node;
  document.querySelector = selector => selector.startsWith('.')
    ? nodes.find(el => el.classList.contains(selector.slice(1))) || null : null;
  document.querySelectorAll = () => [];
  const stored = new Map();
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../language-bridge.js'), 'utf8'), {
    document, window: {googleTranslateElementInit() {}}, URL, URLSearchParams,
    location: {search: '', href: 'https://mavorealestate.com/looking.html'},
    sessionStorage: {getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value)},
  });
  dispatch(document, 'DOMContentLoaded');
  const menu = document.querySelector('.mavo-language-menu');
  const toggle = document.querySelector('.mavo-language-toggle');
  const options = document.querySelector('.mavo-language-options');
  const outside = document.body.appendChild(node('input'));
  return {document, menu, toggle, options, outside, dispatch};
}

function assertExpanded(ui, expanded) {
  assert.equal(ui.toggle.getAttribute('aria-expanded'), String(expanded));
  assert.equal(ui.options.getAttribute('aria-hidden'), String(!expanded));
  assert.equal(ui.options.inert, !expanded);
}

test('language disclosure toggles and immediately makes closed choices inert', () => {
  const ui = disclosure();
  assertExpanded(ui, false);
  ui.dispatch(ui.toggle, 'click');
  assertExpanded(ui, true);
  ui.dispatch(ui.toggle, 'click');
  assertExpanded(ui, false);
});

test('page and nested outside scroll close the language drawer', () => {
  for (const target of ['document', 'outside']) {
    const ui = disclosure();
    ui.dispatch(ui.toggle, 'click');
    assertExpanded(ui, true);
    ui.dispatch(ui[target], 'scroll');
    assertExpanded(ui, false);
  }
});

test('scrolling language options does not close the drawer', () => {
  const ui = disclosure();
  ui.dispatch(ui.toggle, 'click');
  ui.dispatch(ui.options, 'scroll');
  assertExpanded(ui, true);
  ui.dispatch(ui.options.children[0], 'scroll');
  assertExpanded(ui, true);
});

test('Escape closes after a pointer open that leaves focus outside and returns focus to the tab', () => {
  const ui = disclosure();
  ui.outside.focus();
  // Pointer activation need not focus a button, notably in Safari.
  ui.dispatch(ui.toggle, 'click');
  assertExpanded(ui, true);
  assert.equal(ui.document.activeElement, ui.outside);
  const event = ui.dispatch(ui.outside, 'keydown', {key: 'Escape'});
  assertExpanded(ui, false);
  assert.equal(ui.document.activeElement, ui.toggle);
  assert.equal(event.defaultPrevented, true);
});

test('outside pointer and focus departure dismiss while inside interactions keep choices open', () => {
  const ui = disclosure();
  ui.dispatch(ui.toggle, 'click');
  ui.dispatch(ui.options.children[0], 'pointerdown');
  ui.options.children[0].focus();
  assertExpanded(ui, true);
  ui.dispatch(ui.outside, 'pointerdown');
  assertExpanded(ui, false);
  ui.dispatch(ui.toggle, 'click');
  ui.outside.focus();
  assertExpanded(ui, false);
});
