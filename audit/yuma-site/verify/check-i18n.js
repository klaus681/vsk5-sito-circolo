#!/usr/bin/env node
/**
 * Verifica copertura i18n di yuma-site.
 * Uso: node verify/check-i18n.js /percorso/al/repo
 *
 * Controlla che ogni chiave usata in index.html (data-i18n,
 * data-i18n-placeholder, data-i18n-title, data-i18n-html) e in app.js
 * (t('...') / _t('...')) esista in tutte le lingue di i18n.js.
 */
const fs = require('fs');
const path = require('path');

const repo = process.argv[2];
if (!repo) {
  console.error('Uso: node verify/check-i18n.js <repo>');
  process.exit(2);
}

const langs = ['it', 'en', 'es', 'fr'];
const i18nSrc = fs.readFileSync(path.join(repo, 'i18n.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');

// Suddivide i18n.js nei blocchi delle singole lingue.
const starts = {};
for (const m of i18nSrc.matchAll(/^\s{2}(it|en|es|fr):\s*\{/gm)) starts[m[1]] = m.index;
const bodies = {};
langs.forEach((lang, i) => {
  bodies[lang] = i18nSrc.slice(starts[lang], i + 1 < langs.length ? starts[langs[i + 1]] : i18nSrc.length);
});

const collect = (src, re) => [...src.matchAll(re)].map(m => m[1]);
const fromHtml = [
  ...collect(htmlSrc, /data-i18n="([^"]+)"/g),
  ...collect(htmlSrc, /data-i18n-(?:placeholder|title|html)="([^"]+)"/g),
];
const fromJs = collect(appSrc, /[^A-Za-z0-9_](?:_t|t)\('([a-z0-9_]+)'/g);
const used = [...new Set([...fromHtml, ...fromJs])].sort();

const has = (body, key) => new RegExp('(^|[\\s{,"\'])' + key + '\\s*:').test(body);

let failures = 0;
console.log('i18n.js      : ' + langs.join(' / '));
console.log('chiavi usate : ' + used.length + ' (' + new Set(fromHtml).size + ' da HTML, ' + new Set(fromJs).size + ' da JS)');
for (const lang of langs) {
  const missing = used.filter(k => !has(bodies[lang], k));
  if (missing.length) failures += missing.length;
  console.log('  ' + lang + ': ' + (missing.length ? 'MANCANTI -> ' + missing.join(', ') : 'tutte presenti ✅'));
}

process.exit(failures ? 1 : 0);
