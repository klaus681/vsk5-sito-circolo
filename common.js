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
      nav_accedi: 'Accedi', nav_area_membri: 'Area Membri',
      nav_galleria: 'Galleria', nav_discord: 'Discord'
    },
    en: {
      nav_home: 'Home', nav_team: 'Teams', nav_gare: 'Races & Events ▾',
      nav_gare_sub: 'Calendar', nav_classifiche: 'Standings',
      nav_albo: 'Hall of Fame', nav_regolamento: 'Rules', nav_download: 'Download',
      nav_contatti: 'Contact', nav_membri: 'Members', nav_unisciti: 'Join Us',
      nav_accedi: 'Login', nav_area_membri: 'Member Area',
      nav_galleria: 'Gallery', nav_discord: 'Discord'
    },
    fr: {
      nav_home: 'Accueil', nav_team: 'Équipes', nav_gare: 'Courses & Événements ▾',
      nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements',
      nav_albo: 'Temple de la Renommée', nav_regolamento: 'Règlement', nav_download: 'Téléchargements',
      nav_contatti: 'Contact', nav_membri: 'Membres', nav_unisciti: 'Rejoindre',
      nav_accedi: 'Connexion', nav_area_membri: 'Espace Membre',
      nav_galleria: 'Galerie', nav_discord: 'Discord'
    },
    es: {
      nav_home: 'Inicio', nav_team: 'Equipos', nav_gare: 'Regatas y Eventos ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificación',
      nav_albo: 'Salón de la Fama', nav_regolamento: 'Reglamento', nav_download: 'Descargas',
      nav_contatti: 'Contacto', nav_membri: 'Miembros', nav_unisciti: 'Únete',
      nav_accedi: 'Acceder', nav_area_membri: 'Área miembros',
      nav_galleria: 'Galería', nav_discord: 'Discord'
    }
  };

  window.CVI.currentLang = localStorage.getItem('cvi_lang') || 'it';

  window.CVI.applyI18n = function (extra) {
    const dict = Object.assign({}, NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it, (extra && extra[window.CVI.currentLang]) || {});
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key] != null) el.setAttribute('placeholder', dict[key]);
    });
  };

  window.CVI.cambiaLingua = function (lang, extra) {
    window.CVI.currentLang = lang;
    localStorage.setItem('cvi_lang', lang);
    window.CVI.applyI18n(extra);
  };

  window.CVI.initMobileNav = function () {
    const btn = document.getElementById('navToggle');
    const nav = document.getElementById('navMobile');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  };

  window.CVI.aggiornaAuth = async function () {
    if (!window.CVI.supabase) return;
    try {
      const { data: { session } } = await CVI.supabase.auth.getSession();
      const links = [document.getElementById('auth-link'), document.getElementById('auth-link-mobile')].filter(Boolean);
      links.forEach(a => {
        if (session) {
          a.textContent = (NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it).nav_area_membri || 'Area Membri';
          a.href = 'membri.html';
        }
      });
    } catch (e) {}
  };

  window.CVI.ensureNavAlign = function () {};

  window.CVI.upgradeHeaderLogo = function () {
    document.querySelectorAll('.logo-container').forEach(el => {
      if (el.querySelector('.logo-img')) return;
      const text = el.querySelector('.logo-text');
      if (!text) return;
      const img = document.createElement('img');
      img.src = 'logo-cvi.png';
      img.alt = 'CVI';
      img.className = 'logo-img';
      img.width = 32;
      img.height = 32;
      el.insertBefore(img, text);
    });
  };

  window.CVI.ensureNavLinks = function () {
    function addDesktop(ul, href, label, afterHref) {
      if (!ul || ul.classList.contains('dropdown-menu') || ul.closest('.dropdown-menu')) return;
      if (ul.querySelector('a[href="' + href + '"]')) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      a.setAttribute('data-i18n', href === 'galleria.html' ? 'nav_galleria' : 'nav_discord');
      li.appendChild(a);
      const after = afterHref && ul.querySelector('a[href="' + afterHref + '"]');
      if (after && after.parentElement) after.parentElement.after(li);
      else ul.appendChild(li);
    }
    document.querySelectorAll('nav.nav-desktop > ul').forEach(function (ul) {
      addDesktop(ul, 'galleria.html', 'Galleria', 'albo-doro.html');
      addDesktop(ul, 'discord.html', 'Discord', 'galleria.html');
    });
    const mobile = document.getElementById('navMobile');
    if (mobile) {
      function addMobile(href, label, afterHref) {
        if (mobile.querySelector('a[href="' + href + '"]')) return;
        const a = document.createElement('a');
        a.href = href;
        a.textContent = label;
        a.setAttribute('data-i18n', href === 'galleria.html' ? 'nav_galleria' : 'nav_discord');
        const after = afterHref && mobile.querySelector('a[href="' + afterHref + '"]');
        if (after) after.after(a);
        else mobile.appendChild(a);
      }
      addMobile('galleria.html', 'Galleria', 'albo-doro.html');
      addMobile('discord.html', 'Discord', 'galleria.html');
    }
  };

  window.CVI.initFloatingDiscord = function () {
    if (document.getElementById('cvi-discord-fab')) return;
    const a = document.createElement('a');
    a.id = 'cvi-discord-fab';
    a.href = 'https://discord.gg/fEF5MeF47';
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Community Discord';
    a.setAttribute('aria-label', 'Discord');
    a.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';
    a.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:9000;width:52px;height:52px;border-radius:50%;background:#5865F2;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(88,101,242,0.45);text-decoration:none;transition:transform .15s,background .2s;';
    a.onmouseenter = function () { a.style.transform = 'scale(1.08)'; a.style.background = '#4752c4'; };
    a.onmouseleave = function () { a.style.transform = 'scale(1)'; a.style.background = '#5865F2'; };
    document.body.appendChild(a);
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
    window.CVI.ensureNavLinks();
    window.CVI.initFloatingDiscord();
  };
})();
