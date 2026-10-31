/**
 * Test di comportamento delle due aree riservate (Area Membri / Area YUMA).
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
  const areaMembri = w.document.getElementById('area-membri');
  const areaYuma = w.document.getElementById('area-yuma');
  return {
    membri: shown(areaMembri),
    yuma: shown(areaYuma),
    navMembri: anyShown(w, '.nav-area-membri'),
    navYuma: anyShown(w, '.nav-area-yuma'),
    yumaHtml: (w.document.getElementById('areaYumaContent') || {}).innerHTML || '',
    membriHtml: (w.document.getElementById('areaMembriContent') || {}).innerHTML || ''
  };
}

// 1) Ospite (non loggato)
console.log('1) Ospite');
let w = boot();
w.__api.setUser(null, null, false);
let s = describe(w);
check('Area Membri nascosta', !s.membri);
check('Area YUMA nascosta', !s.yuma);
check('link .nav-area-membri tutti nascosti', allHidden(w, '.nav-area-membri'));
check('link .nav-area-yuma tutti nascosti', allHidden(w, '.nav-area-yuma'));

// 2) Socio approvato: Area Membri si', Area YUMA no
console.log('2) Socio approvato');
w = boot();
w.__api.setUser({ email: 'socio@test.it' }, { display_name: 'Mario', role: 'socio', status: 'approved' }, false);
s = describe(w);
check('Area Membri visibile', s.membri);
check('Area YUMA nascosta', !s.yuma);
check('nav Area Membri visibile', s.navMembri);
check('nav Area YUMA nascosta', !s.navYuma);
check('contenuto Area YUMA vuoto', s.yumaHtml.trim() === '');
check('Area Membri saluta Mario', s.membriHtml.indexOf('Mario') >= 0);
check('Area Membri ha blocco Download', s.membriHtml.indexOf('Area Download') >= 0);

// 3) Membro YUMA approvato: entrambe
console.log('3) Membro YUMA approvato');
w = boot();
w.__api.setUser({ email: 'crew@test.it' }, { display_name: 'Klaus', role: 'yuma', status: 'approved' }, false);
s = describe(w);
check('Area Membri visibile', s.membri);
check('Area YUMA visibile', s.yuma);
check('nav Area Membri visibile', s.navMembri);
check('nav Area YUMA visibile', s.navYuma);
check('Area YUMA saluta Klaus', s.yumaHtml.indexOf('Klaus') >= 0);
check('Area YUMA ha card "Download equipaggio"', s.yumaHtml.indexOf('Download equipaggio') >= 0);
check('Area YUMA ha card "Strumenti del team"', s.yumaHtml.indexOf('Strumenti del team') >= 0);

// 4) YUMA non ancora approvato (pending): nessuna area
console.log('4) Membro YUMA pending');
w = boot();
w.__api.setUser({ email: 'crew2@test.it' }, { display_name: 'Nuovo', role: 'yuma', status: 'pending' }, false);
s = describe(w);
check('Area Membri nascosta', !s.membri);
check('Area YUMA nascosta', !s.yuma);

// 5) Socio pending: nessuna area
console.log('5) Socio pending');
w = boot();
w.__api.setUser({ email: 'p@test.it' }, { display_name: 'P', role: 'pending', status: 'pending' }, false);
s = describe(w);
check('Area Membri nascosta', !s.membri);
check('Area YUMA nascosta', !s.yuma);

// 6) Admin: vede entrambe
console.log('6) Admin');
w = boot();
w.__api.setUser({ email: 'admin@test.it' }, { display_name: 'Admin', role: 'admin', status: 'approved' }, true);
s = describe(w);
check('Area Membri visibile', s.membri);
check('Area YUMA visibile', s.yuma);

// 7) Logout: tutto si nasconde
console.log('7) Logout');
w = boot();
w.__api.setUser({ email: 'crew@test.it' }, { display_name: 'Klaus', role: 'yuma', status: 'approved' }, false);
w.eval('logout()');
s = describe(w);
check('Area Membri nascosta dopo logout', !s.membri);
check('Area YUMA nascosta dopo logout', !s.yuma);
check('nav .nav-area-yuma nascosti dopo logout', allHidden(w, '.nav-area-yuma'));

// 8) i18n: le etichette statiche delle due aree sono tradotte
console.log('8) Traduzioni area');
w = boot();
w.eval("setLanguage('en');");
const yumaTitle = [...w.document.querySelectorAll('[data-i18n="yuma_title"]')].map(e => e.textContent);
check('yuma_title in inglese', yumaTitle.join('|') === 'YUMA Area', yumaTitle.join('|'));
const navYumaLabels = [...w.document.querySelectorAll('.nav-area-yuma')].map(e => e.textContent);
check('link Area YUMA tradotti', navYumaLabels.every(t => t === 'YUMA Area'), navYumaLabels.join('|'));

console.log('\n' + (failures ? 'FALLITI: ' + failures : 'TUTTI I CONTROLLI PASSATI ✅'));
process.exit(failures ? 1 : 0);
