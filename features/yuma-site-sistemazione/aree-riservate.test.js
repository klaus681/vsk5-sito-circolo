/**
 * Test di comportamento delle due aree riservate (Area Soci / Area YUMA).
 * Uso: npm i --no-save jsdom && node tests/aree-riservate.test.js [repo]
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const REPO = process.argv[2] || path.join(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const i18n = fs.readFileSync(path.join(REPO, 'i18n.js'), 'utf8');
const app = fs.readFileSync(path.join(REPO, 'app.js'), 'utf8');

// app.js usa const/let a livello di script: aggiungiamo hook dentro lo stesso
// eval per poter pilotare lo stato (isYuma/isAdmin/userProfile/currentUser).
const appWithHooks = app + `
window.__api = {
  setDownloads: function (list) {
    downloadsCache = list || [];
    downloadsLoaded = true;
  },
  setUser: function (user, profile, adminFlag) {
    currentUser = user || null;
    userProfile = profile || null;
    var approved = !!(userProfile && (userProfile.status === 'approved' || !userProfile.status));
    isAdmin = !!adminFlag || !!(userProfile && userProfile.role === 'admin' && approved);
    isYuma = isAdmin || !!(userProfile && userProfile.role === 'yuma' && approved);
    updateAuthUI();
  }
};
`;

function boot() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://yuma.test/' });
  const w = dom.window;
  // Come nel browser: i due file condividono lo stesso scope globale
  // (i18n.js legge currentUser/userProfile definiti in app.js).
  w.eval(i18n + '\n;\n' + appWithHooks);
  w.eval("setLanguage('it');");
  return w;
}

const shown = el => !!el && !el.classList.contains('hidden');
const anyShown = (w, sel) => [...w.document.querySelectorAll(sel)].some(shown);
const allHidden = (w, sel) => [...w.document.querySelectorAll(sel)].every(el => el.classList.contains('hidden'));

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  ok   ' + name); return; }
  failures++;
  console.log('  FAIL ' + name + (extra ? ' -> ' + extra : ''));
}

function describe(w) {
  const areaSoci = w.document.getElementById('area-soci');
  const areaYuma = w.document.getElementById('area-yuma');
  return {
    soci: shown(areaSoci),
    yuma: shown(areaYuma),
    navSoci: anyShown(w, '.nav-area-soci'),
    navYuma: anyShown(w, '.nav-area-yuma'),
    yumaHtml: (w.document.getElementById('areaYumaContent') || {}).innerHTML || '',
    sociHtml: (w.document.getElementById('areaSociContent') || {}).innerHTML || ''
  };
}

// 1) Ospite (non loggato)
console.log('1) Ospite');
let w = boot();
w.__api.setUser(null, null, false);
let s = describe(w);
check('Area Soci nascosta', !s.soci);
check('Area YUMA nascosta', !s.yuma);
check('link .nav-area-soci tutti nascosti', allHidden(w, '.nav-area-soci'));
check('link .nav-area-yuma tutti nascosti', allHidden(w, '.nav-area-yuma'));
const candOut = w.document.getElementById('navCandidati');
check('pulsante "Candidati" visibile da ospite', !!candOut && candOut.style.display !== 'none', candOut && candOut.style.display);

// 2) Socio approvato: Area Soci si', Area YUMA no
console.log('2) Socio approvato');
w = boot();
w.__api.setUser({ email: 'socio@test.it' }, { display_name: 'Mario', role: 'socio', status: 'approved' }, false);
s = describe(w);
check('Area Soci visibile', s.soci);
check('Area YUMA nascosta', !s.yuma);
check('nav Area Soci visibile', s.navSoci);
check('nav Area YUMA nascosta', !s.navYuma);
check('contenuto Area YUMA vuoto', s.yumaHtml.trim() === '');
check('Area Soci saluta Mario', s.sociHtml.indexOf('Mario') >= 0);
check('Area Soci ha blocco Download', s.sociHtml.indexOf('Area Download') >= 0);
check('Area Soci mostra lo stato vuoto dei contenuti', s.sociHtml.indexOf('Nessun contenuto pubblicato per ora') >= 0);

// 3) Membro YUMA approvato: entrambe
console.log('3) Membro YUMA approvato');
w = boot();
w.__api.setUser({ email: 'crew@test.it' }, { display_name: 'Klaus', role: 'yuma', status: 'approved' }, false);
s = describe(w);
check('Area Soci visibile', s.soci);
check('Area YUMA visibile', s.yuma);
check('nav Area Soci visibile', s.navSoci);
check('nav Area YUMA visibile', s.navYuma);
check('Area YUMA saluta Klaus', s.yumaHtml.indexOf('Klaus') >= 0);
check('Area YUMA ha card "Download equipaggio"', s.yumaHtml.indexOf('Download equipaggio') >= 0);
check('Area YUMA ha card "Strumenti del team"', s.yumaHtml.indexOf('Strumenti del team') >= 0);
const nSoci = w.document.querySelectorAll('.nav-area-soci').length;
const nYuma = w.document.querySelectorAll('.nav-area-yuma').length;
check('un solo link per area: desktop + mobile, nessun doppione', nSoci === 2 && nYuma === 2, nSoci + '/' + nYuma);
const candIn = w.document.getElementById('navCandidati');
check('pulsante "Candidati" nascosto da loggati', !!candIn && candIn.style.display === 'none', candIn && candIn.style.display);

// 4) YUMA non ancora approvato (pending): nessuna area
console.log('4) Membro YUMA pending');
w = boot();
w.__api.setUser({ email: 'crew2@test.it' }, { display_name: 'Nuovo', role: 'yuma', status: 'pending' }, false);
s = describe(w);
check('Area Soci nascosta', !s.soci);
check('Area YUMA nascosta', !s.yuma);

// 5) Socio pending: nessuna area
console.log('5) Socio pending');
w = boot();
w.__api.setUser({ email: 'p@test.it' }, { display_name: 'P', role: 'pending', status: 'pending' }, false);
s = describe(w);
check('Area Soci nascosta', !s.soci);
check('Area YUMA nascosta', !s.yuma);

// 6) Admin: vede entrambe
console.log('6) Admin');
w = boot();
w.__api.setUser({ email: 'admin@test.it' }, { display_name: 'Admin', role: 'admin', status: 'approved' }, true);
s = describe(w);
check('Area Soci visibile', s.soci);
check('Area YUMA visibile', s.yuma);

// 7) Logout: tutto si nasconde
console.log('7) Logout');
w = boot();
w.__api.setUser({ email: 'crew@test.it' }, { display_name: 'Klaus', role: 'yuma', status: 'approved' }, false);
w.eval('logout()');
s = describe(w);
check('Area Soci nascosta dopo logout', !s.soci);
check('Area YUMA nascosta dopo logout', !s.yuma);
check('nav .nav-area-yuma nascosti dopo logout', allHidden(w, '.nav-area-yuma'));

// 8) i18n: le etichette statiche delle due aree sono tradotte
console.log('8) Traduzioni area');
w = boot();
w.eval("setLanguage('en');");
const yumaTitle = [...w.document.querySelectorAll('[data-i18n="yuma_title"]')].map(e => e.textContent);
check('yuma_title è "YUMA Only" (uguale in tutte le lingue)', yumaTitle.join('|') === 'YUMA Only', yumaTitle.join('|'));
const navYumaLabels = [...w.document.querySelectorAll('.nav-area-yuma')].map(e => e.textContent);
check('link YUMA Only coerenti', navYumaLabels.every(t => t === 'YUMA Only'), navYumaLabels.join('|'));

// 9) Nome utente: se il display_name è un'email non va mostrato per intero
console.log('9) Nome utente senza dominio email');
w = boot();
w.__api.setUser({ email: 'klaus68@hotmail.it' }, { display_name: 'klaus68@hotmail.it', role: 'admin', status: 'approved' }, true);
s = describe(w);
check('saluto senza dominio email', s.sociHtml.indexOf('klaus68@hotmail.it') < 0, 'trovata email intera');
check('saluto con nome breve', s.sociHtml.indexOf('klaus68') >= 0);
const chip = (w.document.getElementById('userEmailLabel') || {}).textContent;
check('chip utente = klaus68', chip === 'klaus68', chip);

// 10) Contenuti delle due aree, pubblicati dall'admin
console.log('10) Contenuti delle aree (gestiti dal pannello admin)');
w = boot();
w.__api.setDownloads([
  { id: 1, area: 'soci', titolo: 'Regolamento 2026', descrizione: 'PDF ufficiale', url: 'https://example.com/regolamento.pdf', sort_order: 1 },
  { id: 2, area: 'yuma', titolo: 'Briefing regata', descrizione: 'Solo equipaggio', url: 'https://example.com/briefing', sort_order: 1 },
  { id: 3, area: 'soci', titolo: 'Foto raduno', descrizione: null, url: null, sort_order: 2 }
]);
w.__api.setUser({ email: 'crew@test.it' }, { display_name: 'Klaus', role: 'yuma', status: 'approved' }, false);
s = describe(w);
check('Area Soci mostra i contenuti soci', s.sociHtml.indexOf('Regolamento 2026') >= 0);
check('Area Soci mostra anche la voce senza URL', s.sociHtml.indexOf('Foto raduno') >= 0);
check('Area Soci NON mostra i contenuti YUMA Only', s.sociHtml.indexOf('Briefing regata') < 0);
check('YUMA Only mostra i contenuti suoi', s.yumaHtml.indexOf('Briefing regata') >= 0);
check('YUMA Only NON mostra i contenuti soci', s.yumaHtml.indexOf('Regolamento 2026') < 0);
check('i link esterni sono noreferrer', s.sociHtml.indexOf('rel="noopener noreferrer"') >= 0 && s.yumaHtml.indexOf('rel="noopener noreferrer"') >= 0);
check('lo stato vuoto sparisce quando ci sono contenuti', s.sociHtml.indexOf('Nessun contenuto pubblicato per ora') < 0);
check('pannello admin: tab "Aree" presente', !!w.document.getElementById('tab-aree') && !!w.document.getElementById('adminTab-aree'));
check('pannello admin: due liste (Area Soci / YUMA Only)', !!w.document.getElementById('adminDownloadsSoci') && !!w.document.getElementById('adminDownloadsYuma'));

console.log('\n' + (failures ? 'FALLITI: ' + failures : 'TUTTI I CONTROLLI PASSATI ✅'));
process.exit(failures ? 1 : 0);
