import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const app = fs.readFileSync(path.join(root, '../app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, '../theme-system.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, '../sw.js'), 'utf8');

for (const token of ['docDropzone', 'docFilePreview', 'doc-preview-thumb', 'انتخاب فایل', 'برای جایگزینی']) {
  assert.ok(app.includes(token), `document upload UI missing ${token}`);
}
for (const token of ['registrationDocumentField', 'registration-file-card', 'data-clear-registration-file', 'wireRegistrationDocumentPickers']) {
  assert.ok(app.includes(token), `registration document picker missing ${token}`);
}
for (const token of ['validateDocumentFile', '۱۲ مگابایت', 'application/pdf', 'image/webp']) {
  assert.ok(app.includes(token), `document validation missing ${token}`);
}
for (const selector of ['.doc-dropzone', '.doc-file-preview', '.doc-preview-thumb', '.registration-file-card', '.registration-file-selected']) {
  assert.ok(css.includes(selector), `upload component style missing ${selector}`);
}
assert.match(sw, /v19-manual-birthdate/);
console.log('DOCUMENT UPLOAD UI SMOKE TEST: OK');
