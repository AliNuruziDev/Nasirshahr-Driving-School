import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const store = new Map([['nasirUiLanguage', 'en']]);
const themeMeta = { content: '' };
const descriptionMeta = { content: '' };
const themeLabel = { textContent: '' };
const themeButton = {
  attrs: {},
  getAttribute(name) { return this.attrs[name] ?? null; },
  setAttribute(name, value) { this.attrs[name] = value; }
};
const bodyClasses = new Set(['locale-en']);
const listeners = new Map();
const document = {
  title: '',
  documentElement: { lang: '', dir: '', dataset: {}, style: {} },
  body: {
    classList: {
      remove(name) { bodyClasses.delete(name); },
      toggle(name, enabled) { enabled ? bodyClasses.add(name) : bodyClasses.delete(name); }
    }
  },
  querySelector(selector) {
    if (selector === 'meta[name="theme-color"]') return themeMeta;
    if (selector === 'meta[name="description"]') return descriptionMeta;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-theme-label]') return [themeLabel];
    if (selector === '[data-theme-toggle]') return [themeButton];
    return [];
  },
  getElementById() { return null; },
  addEventListener(type, callback) {
    const list = listeners.get(type) || [];
    list.push(callback);
    listeners.set(type, list);
  }
};

class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
}

const window = {};
const context = {
  document,
  window,
  localStorage: {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); }
  },
  MutationObserver,
  console
};
vm.runInNewContext(fs.readFileSync(new URL('../appearance.js', import.meta.url), 'utf8'), context);

const prefs = window.NasirPreferences;
assert.equal(prefs.theme, 'light');
assert.equal(document.documentElement.lang, 'fa');
assert.equal(document.documentElement.dir, 'rtl');
assert.equal(bodyClasses.has('locale-en'), false);
assert.equal(store.has('nasirUiLanguage'), false);
assert.equal(document.title, 'آموزشگاه رانندگی نصیرشهر | NASIR');
assert.match(descriptionMeta.content, /آموزشگاه رانندگی نصیرشهر/);
assert.equal(themeLabel.textContent, 'تم تاریک');
assert.equal(themeButton.getAttribute('aria-label'), 'فعال کردن تم تاریک');

prefs.toggleTheme();
assert.equal(prefs.theme, 'dark');
assert.equal(document.documentElement.dataset.theme, 'dark');
assert.equal(document.documentElement.style.colorScheme, 'dark');
assert.equal(themeMeta.content, '#0d171a');
assert.equal(store.get('nasirUiTheme'), 'dark');
assert.equal(themeLabel.textContent, 'تم روشن');
assert.equal(themeButton.getAttribute('aria-label'), 'فعال کردن تم روشن');

prefs.toggleTheme();
assert.equal(prefs.theme, 'light');
assert.equal(document.documentElement.dataset.theme, 'light');
assert.equal(themeMeta.content, '#f2f6f5');
assert.equal(themeLabel.textContent, 'تم تاریک');

console.log('PERSIAN-ONLY + THEME SMOKE TEST: OK');
