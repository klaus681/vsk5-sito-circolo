/* CVI Virtual – shared nav, i18n helpers, mobile menu */
(function () {
  const SUPABASE_URL = 'https://kisffsyerranniypkcqa.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpc2Zmc3llcnJhbm5peXBrY3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTgxMTgsImV4cCI6MjEwNjQ5NDExOH0.1PNoShPUl32yN3aQenRNan_SCTxtKacr_VVwi5uaELs';

  window.CVI = window.CVI || {};
  window.CVI.supabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const LANGS = ['it', 'en', 'fr', 'es'];
  const DEFAULT_LANG = 'it';

  const I18N = {
    it: {
      nav_home: 'Home', nav_team: 'Team', nav_gare: 'Gare & Eventi ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche', nav_albo: "Albo d'Oro",
      nav_regolamento: 'Regolamento', nav_download: 'Download', nav_membri: 'Membri',
      nav_contatti: 'Contatti', nav_unisciti: 'Unisciti', nav_accedi: 'Accedi',
      nav_profilo: 'Profilo', nav_esci: 'Esci', nav_galleria: 'Galleria'
    },
    en: {
      nav_home: 'Home', nav_team: 'Teams', nav_gare: 'Races & Events ▾',
      nav_gare_sub: 'Calendar', nav_classifiche: 'Standings', nav_albo: 'Hall of Fame',
      nav_regolamento: 'Rules', nav_download: 'Download', nav_membri: 'Members',
      nav_contatti: 'Contact', nav_unisciti: 'Join', nav_accedi: 'Log in',
      nav_profilo: 'Profile', nav_esci: 'Log out', nav_galleria: 'Gallery'
    },
    fr: {
      nav_home: 'Accueil', nav_team: 'Équipes', nav_gare: 'Courses & Événements ▾',
      nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements', nav_albo: "Palais d'or",
      nav_regolamento: 'Règlement', nav_download: 'Télécharger', nav_membri: 'Membres',
      nav_contatti: 'Contact', nav_unisciti: 'Rejoindre', nav_accedi: 'Connexion',
      nav_profilo: 'Profil', nav_esci: 'Déconnexion', nav_galleria: 'Galerie'
    },
    es: {
      nav_home: 'Inicio', nav_team: 'Equipos', nav_gare: 'Regatas y Eventos ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificaciones', nav_albo: 'Salón de la Fama',
      nav_regolamento: 'Reglamento', nav_download: 'Descargas', nav_membri: 'Miembros',
      nav_contatti: 'Contacto', nav_unisciti: 'Únete', nav_accedi: 'Acceder',
      nav_profilo: 'Perfil', nav_esci: 'Salir', nav_galleria: 'Galería'
    }
  };

  function getLang() {
    try {
      var s = localStorage.getItem('cvi_lang');
      if (s && LANGS.indexOf(s) >= 0) return s;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) < 0) lang = DEFAULT_LANG;
    try { localStorage.setItem('cvi_lang', lang); } catch (e) {}
    window.CVI.currentLang = lang;
    applyI18n(lang);
    var sel = document.getElementById('languageSelect');
    if (sel) sel.value = lang;
  }

  function t(key, extra) {
    var lang = window.CVI.currentLang || DEFAULT_LANG;
    if (extra && extra[lang] && extra[lang][key] != null) return extra[lang][key];
    if (I18N[lang] && I18N[lang][key] != null) return I18N[lang][key];
    if (I18N.it && I18N.it[key] != null) return I18N.it[key];
    return key;
  }

  function applyI18n(lang, extra) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = t(key, extra);
      if (val && val !== key) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
        else el.innerHTML = val;
      }
    });
  }

  function setupMobileNav() {
    var btn = document.getElementById('navToggle');
    var nav = document.getElementById('navMobile');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('nav-open', open);
    });
  }

  function setupLangSelect(extra) {
    var sel = document.getElementById('languageSelect');
    if (!sel) return;
    sel.value = getLang();
    sel.addEventListener('change', function () {
      setLang(sel.value);
      if (extra) applyI18n(sel.value, extra);
    });
  }

  function resolveRole(p) {
    if (!p) return 'socio';
    var r = String(p.role || '').toLowerCase();
    if (r === 'admin' || r === 'scorer' || r === 'caposquadra' || r === 'socio') return r;
    return p.is_admin === true ? 'admin' : 'socio';
  }

  function canAccessAdmin(role) {
    return role === 'admin' || role === 'scorer';
  }

  window.CVI.resolveRole = resolveRole;
  window.CVI.canAccessAdmin = canAccessAdmin;
  window.CVI.currentLang = getLang();
  window.CVI.t = t;
  window.CVI.applyI18n = applyI18n;
  window.CVI.setLang = setLang;
  window.CVI.getLang = getLang;

  window.CVI.ensureNavLinks = function () {
    // placeholder extended below
  };

  window.CVI.updateAuthUI = async function () {
    try {
      if (!CVI.supabase) return;
      const { data: { session } } = await CVI.supabase.auth.getSession();
      var links = [document.getElementById('auth-link'), document.getElementById('auth-link-mobile')];
      links.forEach(function (a) {
        if (!a) return;
        if (session && session.user) {
          a.href = 'profilo.html';
          a.textContent = CVI.t('nav_profilo');
          a.classList.add('is-logged');
        } else {
          a.href = 'accedi.html';
          a.textContent = CVI.t('nav_accedi');
          a.classList.remove('is-logged');
        }
      });
    } catch (e) {
      console.warn('[CVI] auth UI', e);
    }
  };

  window.CVI.init = function (page, extra) {
    setupMobileNav();
    setupLangSelect(extra);
    applyI18n(getLang(), extra);
    if (typeof CVI.ensureNavLinks === 'function') CVI.ensureNavLinks();
    CVI.updateAuthUI();
  };

  // boot light
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupMobileNav();
      setupLangSelect();
      applyI18n(getLang());
      if (typeof CVI.ensureNavLinks === 'function') CVI.ensureNavLinks();
      CVI.updateAuthUI();
    });
  } else {
    setupMobileNav();
    setupLangSelect();
    applyI18n(getLang());
    if (typeof CVI.ensureNavLinks === 'function') CVI.ensureNavLinks();
    CVI.updateAuthUI();
  }
})();

/* —— Extra CVI: link Proteste / Eventi aperti / Vista calendario nel menu a tendina —— */
(function () {
  "use strict";
  var _ens = window.CVI && window.CVI.ensureNavLinks;
  if (_ens) {
    window.CVI.ensureNavLinks = function () {
      _ens();
      function addDrop(href, label) {
        var drop = document.querySelector("nav.nav-desktop .dropdown-menu");
        if (drop && !drop.querySelector('a[href="' + href + '"]')) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = href; a.textContent = label;
          li.appendChild(a); drop.appendChild(li);
        }
        var mob = document.querySelector("#navMobile .mobile-dropdown");
        if (mob && !mob.querySelector('a[href="' + href + '"]')) {
          var am = document.createElement("a");
          am.href = href; am.textContent = "\u2192 " + label;
          mob.appendChild(am);
        }
      }
      var lang = window.CVI.currentLang || "it";
      var pr = ({ it: "Proteste", en: "Protests", fr: "Réclamations", es: "Protestas" })[lang] || "Proteste";
      var calLabel = ({ it: "Vista calendario", en: "Calendar view", fr: "Vue calendrier", es: "Vista calendario" })[lang] || "Vista calendario";
      addDrop("calendario.html", calLabel);
      addDrop("proteste.html", pr);
      addDrop("eventi-aperti.html", "Eventi aperti");
    };
  }
})();

/* —— Extra CVI: nazionalità profilo —— */
(function () {
  try {
    if (!/profilo\.html/i.test(location.pathname + location.href)) return;
    var s = document.createElement('script');
    s.src = 'profilo-nazionalita.js?v=1';
    s.async = true;
    document.head.appendChild(s);
  } catch (e) {}
})();
