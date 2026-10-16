/* CVI Virtual – shared nav, i18n helpers, mobile menu */
(function () {
  const LANGS = ['it', 'en', 'fr', 'es'];
  const DEFAULT_LANG = 'it';

  const I18N = {
    it: {
      nav_home: 'Home', nav_team: 'Team', nav_gare: 'Gare & Eventi ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche', nav_albo: "Albo d'Oro",
      nav_regolamento: 'Regolamento', nav_download: 'Download', nav_membri: 'Membri',
      nav_contatti: 'Contatti', nav_unisciti: 'Unisciti', nav_accedi: 'Accedi',
      nav_profilo: 'Profilo', nav_esci: 'Esci'
    },
    en: {
      nav_home: 'Home', nav_team: 'Teams', nav_gare: 'Races & Events ▾',
      nav_gare_sub: 'Calendar', nav_classifiche: 'Standings', nav_albo: 'Hall of Fame',
      nav_regolamento: 'Rules', nav_download: 'Download', nav_membri: 'Members',
      nav_contatti: 'Contact', nav_unisciti: 'Join', nav_accedi: 'Log in',
      nav_profilo: 'Profile', nav_esci: 'Log out'
    },
    fr: {
      nav_home: 'Accueil', nav_team: 'Équipes', nav_gare: 'Courses & Événements ▾',
      nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements', nav_albo: "Palais d'or",
      nav_regolamento: 'Règlement', nav_download: 'Télécharger', nav_membri: 'Membres',
      nav_contatti: 'Contact', nav_unisciti: 'Rejoindre', nav_accedi: 'Connexion',
      nav_profilo: 'Profil', nav_esci: 'Déconnexion'
    },
    es: {
      nav_home: 'Inicio', nav_team: 'Equipos', nav_gare: 'Regatas y Eventos ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificaciones', nav_albo: 'Salón de la Fama',
      nav_regolamento: 'Reglamento', nav_download: 'Descargas', nav_membri: 'Miembros',
      nav_contatti: 'Contacto', nav_unisciti: 'Únete', nav_accedi: 'Acceder',
      nav_profilo: 'Perfil', nav_esci: 'Salir'
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
      if (val && val !== key) el.innerHTML = val;
    });
  }

  function setupMobileNav() {
    var btn = document.getElementById('navToggle');
    var nav = document.getElementById('navMobile');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function setupLangSelect() {
    var sel = document.getElementById('languageSelect');
    if (!sel) return;
    sel.value = getLang();
    sel.addEventListener('change', function () { setLang(sel.value); });
  }

  window.CVI = window.CVI || {};
  window.CVI.currentLang = getLang();
  window.CVI.t = t;
  window.CVI.applyI18n = applyI18n;
  window.CVI.setLang = setLang;
  window.CVI.getLang = getLang;

  // Supabase client (shared)
  var SUPABASE_URL = 'https://xvkjqjqjqjqjqjqjqj.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  // Note: real keys are set below from meta or defaults in production site

  function initSupabase() {
    if (!window.supabase) return null;
    var url = document.querySelector('meta[name="supabase-url"]');
    var key = document.querySelector('meta[name="supabase-anon"]');
    // Use embedded defaults from previous common if present in page scripts
    var u = (url && url.content) || window.CVI_SUPABASE_URL || '';
    var k = (key && key.content) || window.CVI_SUPABASE_ANON || '';
    if (!u || !k) {
      // try from existing global set by other scripts
      if (window.CVI && window.CVI.supabase) return window.CVI.supabase;
      return null;
    }
    try {
      return window.supabase.createClient(u, k);
    } catch (e) {
      console.warn('[CVI] supabase init', e);
      return null;
    }
  }

  // Will be completed with actual keys from the original file - RESTORE FROM GIT
  console.warn('[CVI] common.js needs full restore from repository history');
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
