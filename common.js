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
      if (dict[key] != null) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = dict[key];
        else el.innerHTML = dict[key];
      }
    });
  };

  window.CVI.cambiaLingua = function (lang, extra) {
    window.CVI.currentLang = lang;
    localStorage.setItem('cvi_lang', lang);
    window.CVI.applyI18n(extra);
  };

  window.CVI.aggiornaAuth = async function () {
    if (!window.CVI.supabase) return;
    const { data: { session } } = await window.CVI.supabase.auth.getSession();
    const link = document.getElementById('auth-link');
    const linkM = document.getElementById('auth-link-mobile');
    const label = session ? (NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it).nav_area_membri : (NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it).nav_accedi;
    const href = session ? 'membri.html' : 'accedi.html';
    if (link) { link.textContent = label; link.href = href; }
    if (linkM) { linkM.textContent = label; linkM.href = href; }
  };

  window.CVI.initMobileNav = function () {
    const toggle = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    if (!toggle || !mobile) return;
    toggle.addEventListener('click', () => {
      const open = mobile.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('menu-open', open);
    });
  };

  window.CVI.ensureNavAlign = function () {
    if (!document.querySelector('link[href="fix-nav.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'fix-nav.css';
      document.head.appendChild(link);
    }
    const desktopUl = document.querySelector('.nav-desktop > ul');
    if (desktopUl && !desktopUl.querySelector('a[href="membri.html"]')) {
      const contatti = desktopUl.querySelector('a[href="contatti.html"]');
      const li = document.createElement('li');
      li.innerHTML = '<a href="membri.html" data-i18n="nav_membri">Membri</a>';
      if (contatti && contatti.parentElement) {
        contatti.parentElement.parentElement.insertBefore(li, contatti.parentElement);
      } else {
        desktopUl.appendChild(li);
      }
    }
    const mobile = document.getElementById('navMobile');
    if (mobile && !mobile.querySelector('a[href="membri.html"]')) {
      const contatti = mobile.querySelector('a[href="contatti.html"]');
      const a = document.createElement('a');
      a.href = 'membri.html';
      a.setAttribute('data-i18n', 'nav_membri');
      a.textContent = 'Membri';
      if (contatti) mobile.insertBefore(a, contatti.nextSibling);
      else mobile.appendChild(a);
    }
  };

  /** Sostituisce l'ancora testuale con il logo CVI nell'header */
  window.CVI.upgradeHeaderLogo = function () {
    document.querySelectorAll('header .logo-container').forEach(function (el) {
      if (el.querySelector('img.logo-img')) return;
      const text = el.querySelector('.logo-text');
      if (!text) return;
      text.innerHTML = text.innerHTML.replace(/⚓\s*/g, '');
      const img = document.createElement('img');
      img.src = 'logo-cvi.png';
      img.alt = 'CVI';
      img.className = 'logo-img';
      img.width = 32;
      img.height = 32;
      el.insertBefore(img, text);
    });
  };

  window.CVI.init = function (activePage, extraI18n) {
    window.CVI.initMobileNav();
    window.CVI.upgradeHeaderLogo();
    window.CVI.ensureNavAlign();
    const sel = document.getElementById('languageSelect');
    if (sel) {
      sel.value = window.CVI.currentLang;
      sel.onchange = () => window.CVI.cambiaLingua(sel.value, extraI18n);
    }
    if (activePage) {
      document.querySelectorAll(`a[href="${activePage}"]`).forEach(a => a.classList.add('active'));
    }
    window.CVI.applyI18n(extraI18n);
    window.CVI.aggiornaAuth();
  };
})();
