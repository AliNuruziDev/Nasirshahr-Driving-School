import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../theme-system.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

assert.match(html, /href="theme-system\.css\?v=6"/, 'The complete theme stylesheet must be loaded');
assert.ok(html.indexOf("localStorage.getItem('nasirUiTheme')") < html.indexOf('rel="stylesheet" href="styles.css"'), 'Saved theme must be applied before styles load');
assert.match(css, /html\[data-theme="light"\]/, 'Light theme tokens are required');
assert.match(css, /html\[data-theme="dark"\]/, 'Dark theme tokens are required');
for (const selector of ['.login-panel-wrap', '.sidebar', '.topbar', '.panel', '.stat-card', '.table-wrap', '.field input', '.app-modal', '.notification-panel', '.case-record', '.learning-module', '.settings-toggle', '.jalali-date-icon', '.jalali-date-picker']) {
  assert.ok(css.includes(selector), `Global theme must cover ${selector}`);
}
assert.match(sw, /v19-manual-birthdate/, 'PWA shell cache must be invalidated');
assert.match(sw, /\.\/theme-system\.css\?v=6/, 'PWA shell must precache the versioned global theme');
console.log('FULL PROJECT THEME SMOKE TEST: OK');
