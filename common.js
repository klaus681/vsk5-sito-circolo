/* CVI Virtual – shared nav, i18n helpers, mobile menu */
(function () {
  const SUPABASE_URL = 'https://kisffsyerranniypkcqa.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpc2Zmc3llcnJhbm5peXBrY3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTgxMTgsImV4cCI6MjEwNjQ5NDExOH0.1PNoShPUl32yN3aQenRNan_SCTxtKacr_VVwi5uaELs';

  window.CVI = window.CVI || {};
  window.CVI.supabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const NAV_KEYS = {
    it: {
      nav_home: 'Home', nav_team: 'Team', nav_gare: 'Gare & Eventi ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche',
      nav_albo: "Albo d'Oro", nav_regolamento: 'Regolamento', nav_download: 'Download',
      nav_contatti: 'Contatti', nav_membri: 'Membri', nav_unisciti: 'Unisciti',
      nav_accedi: 'Accedi', nav_area_membri: 'Area Membri'
    },
    en: {
      nav_home: 'Home', nav_team: 'Teams', nav_gare: 'Races & Events ▾',
      nav_gare_sub: 'Calendar', nav_classifiche: 'Standings',
      nav_albo: 'Hall of Fame', nav_regolamento: 'Rules', nav_download: 'Download',
      nav_contatti: 'Contact', nav_membri: 'Members', nav_unisciti: 'Join Us',
      nav_accedi: 'Login', nav_area_membri: 'Member Area'
    },
    fr: {
      nav_home: 'Accueil', nav_team: 'Équipes', nav_gare: 'Courses & Événements ▾',
      nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements',
      nav_albo: 'Temple de la Renommée', nav_regolamento: 'Règlement', nav_download: 'Téléchargements',
      nav_contatti: 'Contact', nav_membri: 'Membres', nav_unisciti: 'Rejoindre',
      nav_accedi: 'Connexion', nav_area_membri: 'Espace Membre'
    },
    es: {
      nav_home: 'Inicio', nav_team: 'Equipos', nav_gare: 'Regatas y Eventos ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificación',
      nav_albo: 'Salón de la Fama', nav_regolamento: 'Reglamento', nav_download: 'Descargas',
      nav_contatti: 'Contacto', nav_membri: 'Miembros', nav_unisciti: 'Únete',
      nav_accedi: 'Acceder', nav_area_membri: 'Área de Miembros'
    }
  };

  window.CVI.navKeys = NAV_KEYS;
  window.CVI.currentLang = localStorage.getItem('cvi_lang') || 'it';

  window.CVI.applyI18n = function (extra) {
    const lang = window.CVI.currentLang;
    const dict = Object.assign({}, NAV_KEYS[lang] || NAV_KEYS.it, (extra && extra[lang]) || {});
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.placeholder = dict[key];
    });
  };

  window.CVI.cambiaLingua = function (lang, extra) {
    window.CVI.currentLang = lang;
    localStorage.setItem('cvi_lang', lang);
    const sel = document.getElementById('languageSelect');
    if (sel) sel.value = lang;
    window.CVI.applyI18n(extra);
    window.CVI.aggiornaAuth();
  };

  window.CVI.aggiornaAuth = async function () {
    if (!window.CVI.supabase) return;
    const { data: { session } } = await window.CVI.supabase.auth.getSession();
    const lang = window.CVI.currentLang;
    const label = (NAV_KEYS[lang] || NAV_KEYS.it).nav_area_membri;
    ['auth-link', 'auth-link-mobile'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (session) {
        el.href = 'membri.html';
        el.textContent = label;
      } else {
        el.href = 'accedi.html';
      }
    });
  };

  window.CVI.initMobileNav = function () {
    const toggle = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    if (!toggle || !mobile) return;
    toggle.addEventListener('click', () => {
      const open = mobile.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open);
      document.body.classList.toggle('menu-open', open);
    });
    mobile.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobile.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      });
    });
  };

  window.CVI.init = function (activePage, extraI18n) {
    window.CVI.initMobileNav();
    const sel = document.getElementById('languageSelect');
    if (sel) {
      sel.value = window.CVI.currentLang;
      sel.onchange = () => window.CVI.cambiaLingua(sel.value, extraI18n);
    }
    // mark active links
    if (activePage) {
      document.querySelectorAll(`a[href="${activePage}"]`).forEach(a => a.classList.add('active'));
    }
    window.CVI.applyI18n(extraI18n);
    window.CVI.aggiornaAuth();
  };
})();
