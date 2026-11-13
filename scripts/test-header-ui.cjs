// Source/release contracts; native geometry is checked separately in browser QA.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
const targets = process.argv.includes('--source-only') ? ['src/index.template.html'] :
  ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html', 'markdown-preview-lab.html'];
for (const target of targets) {
  let html = fs.readFileSync(path.join(root, target), 'utf8');
  if (target.includes('self-extract') && !html.includes('class="brand-name"')) {
    const payload = html.match(/<script\b[^>]*id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/)?.[1]
      || html.match(/['"](H4sI[A-Za-z0-9+/=]+)['"]/)?.[1];
    assert.ok(payload, target + ': gzip payload exists');
    html = zlib.gunzipSync(Buffer.from(payload.trim(), 'base64')).toString('utf8');
  }
  const help = html.match(/<button\b[^>]*id="helpButton"[^>]*>([\s\S]*?)<\/button>/)?.[1];
  assert.ok(help, target + ': Help control exists');
  assert.match(help, /M12 17h\.01/, target + ': question-mark dot geometry');
  assert.match(help, /<svg\b[^>]*stroke-linecap="round"/, target + ': Help dot has round caps');
  assert.doesNotMatch(html, /v1\.0\.4|version-badge/, target + ': no version number in the UI');
  const dialog = html.match(/<dialog id="helpDialog">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, target + ': Help dialog exists');
  const ja = html.split('      ja: {')[1]?.split('      en: {')[0];
  const en = html.split('      en: {')[1]?.split('\n      }\n    };')[0];
  assert.ok(ja && en, target + ': both locales exist');
  for (let i = 1; i <= 4; i++) {
    const key = 'helpSyntaxItem' + i;
    assert.match(dialog, new RegExp('<li data-i18n="' + key + '">'), target + ': syntax item is translated');
    assert.ok(ja.includes(key + ":'"), target + ': Japanese syntax item exists');
    assert.ok(en.includes(key + ":'"), target + ': English syntax item exists');
  }
  console.log('PASS header UI: ' + target);
}
