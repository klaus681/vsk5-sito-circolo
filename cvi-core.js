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
      nav_gare_sub: 'Calendario', nav_cal_vista: 'Vista calendario', nav_classifiche: 'Classifiche', nav_proteste: 'Proteste',
      nav_albo: "Albo d'Oro", nav_regolamento: 'Regolamento', nav_download: 'Download',
      nav_contatti: 'Contatti', nav_membri: 'Membri', nav_unisciti: 'Unisciti',
      nav_accedi: 'Accedi', nav_area_membri: 'Il mio profilo',
      nav_galleria: 'Galleria', nav_discord: 'Discord', nav_eventi_aperti: 'Eventi aperti',
      nav_risorse: 'Download e Risorse', nav_tornei: 'Tornei', nav_allenamenti: 'Allenamenti',

      /* Home */
      home_cta1: 'Calendario Regate',
      home_stat_soci_label: 'Soci', home_stat_squadre_label: 'Squadre',
      home_stat_regate_label: 'Regate 2026', home_stat_dal_label: 'Dal',
      home_ranking_title: 'Classifica generale', home_see_all: 'Vedi tutto →',
      home_highlights: 'Ultime Regate & Highlights', home_rank_loading: 'Caricamento classifica…',
      home_rank_empty: 'Nessun risultato ancora',
      home_rank_empty_sub: 'Inserisci i risultati dalla pagina Classifiche',
      home_rank_error: 'Errore caricamento',

      /* Scheda prossima gara + countdown */
      race_next: 'Prossima gara', race_last: 'Ultima gara', race_running: 'Gara in corso',
      race_done: 'Conclusa', race_live: 'In corso', race_status: 'Stato',
      race_starts_in: 'Parte tra', race_finished: 'Gara conclusa',
      race_open_event: 'Evento aperto', race_special_event: 'Evento speciale · soci',
      race_members_only: 'Riservata ai soci', race_upcoming: 'In arrivo',
      race_no_signup: 'Senza iscrizione', race_signup_open: 'Iscrizioni aperte',
      race_signup_closed: 'Iscrizioni chiuse', race_entries: 'Iscritti',
      race_full: 'Al completo', race_password: 'Password server:',
      race_none: 'Nessuna gara in programma', race_check_later: 'Controlla più tardi per nuovi eventi.',
      race_load_error: 'Impossibile caricare le gare', race_loading: 'Caricamento da database...',
      race_no_title: 'Gara senza titolo', race_date_tbd: 'Data da definirsi',
      race_follow_live: 'Segui LIVE', day_short: 'g',

      /* Footer / banner siti amici */
      footer_circolo: 'Circolo', footer_gare: 'Gare', footer_privacy: 'Privacy',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper dal 2003.',
      skip_to_content: 'Vai al contenuto',
      friends_eyebrow: 'Community', friends_title: 'Siti amici & link utili',
      friends_sub: 'Realtà e risorse che seguiamo', friends_visit: 'Visita',
      opens_new_tab: 'si apre in una nuova scheda'
    },
    en: {
      nav_home: 'Home', nav_team: 'Teams', nav_gare: 'Races & Events ▾',
      nav_gare_sub: 'Calendar', nav_cal_vista: 'Calendar view', nav_classifiche: 'Standings', nav_proteste: 'Protests',
      nav_albo: 'Hall of Fame', nav_regolamento: 'Rules', nav_download: 'Download',
      nav_contatti: 'Contact', nav_membri: 'Members', nav_unisciti: 'Join Us',
      nav_accedi: 'Login', nav_area_membri: 'My profile',
      nav_galleria: 'Gallery', nav_discord: 'Discord', nav_eventi_aperti: 'Open events',
      nav_risorse: 'Downloads & Resources', nav_tornei: 'Tournaments', nav_allenamenti: 'Training',

      home_cta1: 'Race Calendar',
      home_stat_soci_label: 'Members', home_stat_squadre_label: 'Teams',
      home_stat_regate_label: 'Races 2026', home_stat_dal_label: 'Since',
      home_ranking_title: 'Overall standings', home_see_all: 'See all →',
      home_highlights: 'Latest races & highlights', home_rank_loading: 'Loading standings…',
      home_rank_empty: 'No results yet',
      home_rank_empty_sub: 'Add results from the Standings page',
      home_rank_error: 'Loading error',

      race_next: 'Next race', race_last: 'Last race', race_running: 'Race in progress',
      race_done: 'Finished', race_live: 'Live', race_status: 'Status',
      race_starts_in: 'Starts in', race_finished: 'Race finished',
      race_open_event: 'Open event', race_special_event: 'Special event · members',
      race_members_only: 'Members only', race_upcoming: 'Starting soon',
      race_no_signup: 'No sign-up needed', race_signup_open: 'Registration open',
      race_signup_closed: 'Registration closed', race_entries: 'Entries',
      race_full: 'Full', race_password: 'Server password:',
      race_none: 'No races scheduled', race_check_later: 'Check back later for new events.',
      race_load_error: 'Unable to load races', race_loading: 'Loading from database...',
      race_no_title: 'Untitled race', race_date_tbd: 'Date to be confirmed',
      race_follow_live: 'Follow LIVE', day_short: 'd',

      footer_circolo: 'Club', footer_gare: 'Races', footer_privacy: 'Privacy',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper since 2003.',
      skip_to_content: 'Skip to content',
      friends_eyebrow: 'Community', friends_title: 'Partner sites & useful links',
      friends_sub: 'Communities and resources we follow', friends_visit: 'Visit',
      opens_new_tab: 'opens in a new tab'
    },
    fr: {
      nav_home: 'Accueil', nav_team: 'Équipes', nav_gare: 'Courses & Événements ▾',
      nav_gare_sub: 'Calendrier', nav_cal_vista: 'Vue calendrier', nav_classifiche: 'Classements', nav_proteste: 'Réclamations',
      nav_albo: 'Temple de la Renommée', nav_regolamento: 'Règlement', nav_download: 'Téléchargements',
      nav_contatti: 'Contact', nav_membri: 'Membres', nav_unisciti: 'Rejoindre',
      nav_accedi: 'Connexion', nav_area_membri: 'Mon profil',
      nav_galleria: 'Galerie', nav_discord: 'Discord', nav_eventi_aperti: 'Événements ouverts',
      nav_risorse: 'Téléchargements & Ressources', nav_tornei: 'Tournois', nav_allenamenti: 'Entraînements',

      home_cta1: 'Calendrier des courses',
      home_stat_soci_label: 'Membres', home_stat_squadre_label: 'Équipes',
      home_stat_regate_label: 'Courses 2026', home_stat_dal_label: 'Depuis',
      home_ranking_title: 'Classement général', home_see_all: 'Voir tout →',
      home_highlights: 'Dernières courses & temps forts', home_rank_loading: 'Chargement du classement…',
      home_rank_empty: 'Aucun résultat pour le moment',
      home_rank_empty_sub: 'Saisissez les résultats depuis la page Classements',
      home_rank_error: 'Erreur de chargement',

      race_next: 'Prochaine course', race_last: 'Dernière course', race_running: 'Course en cours',
      race_done: 'Terminée', race_live: 'En direct', race_status: 'Statut',
      race_starts_in: 'Départ dans', race_finished: 'Course terminée',
      race_open_event: 'Événement ouvert', race_special_event: 'Événement spécial · membres',
      race_members_only: 'Réservée aux membres', race_upcoming: 'Bientôt',
      race_no_signup: 'Sans inscription', race_signup_open: 'Inscriptions ouvertes',
      race_signup_closed: 'Inscriptions fermées', race_entries: 'Inscrits',
      race_full: 'Complet', race_password: 'Mot de passe serveur :',
      race_none: 'Aucune course au programme', race_check_later: 'Revenez plus tard pour de nouveaux événements.',
      race_load_error: 'Impossible de charger les courses', race_loading: 'Chargement depuis la base de données...',
      race_no_title: 'Course sans titre', race_date_tbd: 'Date à définir',
      race_follow_live: 'Suivre en direct', day_short: 'j',

      footer_circolo: 'Club', footer_gare: 'Courses', footer_privacy: 'Confidentialité',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper depuis 2003.',
      skip_to_content: 'Aller au contenu',
      friends_eyebrow: 'Communauté', friends_title: 'Sites partenaires & liens utiles',
      friends_sub: 'Communautés et ressources que nous suivons', friends_visit: 'Visiter',
      opens_new_tab: 's’ouvre dans un nouvel onglet'
    },
    es: {
      nav_home: 'Inicio', nav_team: 'Equipos', nav_gare: 'Regatas y Eventos ▾',
      nav_gare_sub: 'Calendario', nav_cal_vista: 'Vista calendario', nav_classifiche: 'Clasificación', nav_proteste: 'Protestas',
      nav_albo: 'Salón de la Fama', nav_regolamento: 'Reglamento', nav_download: 'Descargas',
      nav_contatti: 'Contacto', nav_membri: 'Miembros', nav_unisciti: 'Únete',
      nav_accedi: 'Acceder', nav_area_membri: 'Mi perfil',
      nav_galleria: 'Galería', nav_discord: 'Discord', nav_eventi_aperti: 'Eventos abiertos',
      nav_risorse: 'Descargas y Recursos', nav_tornei: 'Torneos', nav_allenamenti: 'Entrenamientos',

      home_cta1: 'Calendario de Regatas',
      home_stat_soci_label: 'Socios', home_stat_squadre_label: 'Equipos',
      home_stat_regate_label: 'Regatas 2026', home_stat_dal_label: 'Desde',
      home_ranking_title: 'Clasificación general', home_see_all: 'Ver todo →',
      home_highlights: 'Últimas regatas y destacados', home_rank_loading: 'Cargando clasificación…',
      home_rank_empty: 'Aún no hay resultados',
      home_rank_empty_sub: 'Introduce los resultados desde la página Clasificación',
      home_rank_error: 'Error de carga',

      race_next: 'Próxima regata', race_last: 'Última regata', race_running: 'Regata en curso',
      race_done: 'Finalizada', race_live: 'En vivo', race_status: 'Estado',
      race_starts_in: 'Empieza en', race_finished: 'Regata finalizada',
      race_open_event: 'Evento abierto', race_special_event: 'Evento especial · socios',
      race_members_only: 'Solo socios', race_upcoming: 'Muy pronto',
      race_no_signup: 'Sin inscripción', race_signup_open: 'Inscripciones abiertas',
      race_signup_closed: 'Inscripciones cerradas', race_entries: 'Inscritos',
      race_full: 'Completo', race_password: 'Contraseña del servidor:',
      race_none: 'No hay regatas programadas', race_check_later: 'Vuelve más tarde para nuevos eventos.',
      race_load_error: 'No se pudieron cargar las regatas', race_loading: 'Cargando desde la base de datos...',
      race_no_title: 'Regata sin título', race_date_tbd: 'Fecha por confirmar',
      race_follow_live: 'Seguir en vivo', day_short: 'd',

      footer_circolo: 'Club', footer_gare: 'Regatas', footer_privacy: 'Privacidad',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper desde 2003.',
      skip_to_content: 'Ir al contenido',
      friends_eyebrow: 'Comunidad', friends_title: 'Sitios amigos y enlaces útiles',
      friends_sub: 'Comunidades y recursos que seguimos', friends_visit: 'Visitar',
      opens_new_tab: 'se abre en una nueva pestaña'
    }
  };

  const LOCALES = { it: 'it-IT', en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };

  window.CVI.currentLang = localStorage.getItem('cvi_lang') || 'it';

  /** Dizionario del lingua richiesta (default: lingua corrente). */
  window.CVI.dict = function (lang) {
    return NAV_KEYS[lang || window.CVI.currentLang] || NAV_KEYS.it;
  };

  /** Traduce una chiave nel dizionario corrente; `fallback` se manca. */
  window.CVI.t = function (key, fallback) {
    var val = window.CVI.dict()[key];
    return val == null ? (fallback == null ? key : fallback) : val;
  };

  /** Locale BCP-47 per toLocaleString/toLocaleDateString. */
  window.CVI.locale = function (lang) {
    return LOCALES[lang || window.CVI.currentLang] || LOCALES.it;
  };

  /* Footer: etichetta le colonne e i link una sola volta, così basta il
     normale ciclo data-i18n per tradurli su tutte le pagine. */
  var FOOTER_LINK_KEYS = {
    'team.html': 'nav_team',
    'classifiche.html': 'nav_classifiche',
    'albo-doro.html': 'nav_albo',
    'galleria.html': 'nav_galleria',
    'discord.html': 'nav_discord',
    'regolamento.html': 'nav_regolamento',
    'gare.html': 'nav_gare_sub',
    'risorse.html': 'nav_risorse',
    'contatti.html': 'nav_contatti',
    'unisciti.html': 'nav_unisciti',
    'eventi-aperti.html': 'nav_eventi_aperti',
    'proteste.html': 'nav_proteste',
    'tornei.html': 'nav_tornei',
    'allenamenti.html': 'nav_allenamenti',
    'privacy.html': 'footer_privacy'
  };

  function annotateFooter() {
    document.querySelectorAll('.footer-col a[href]').forEach(function (a) {
      if (a.getAttribute('data-i18n')) return;
      var file = (a.getAttribute('href') || '').split('#')[0].split('?')[0].split('/').pop();
      var key = FOOTER_LINK_KEYS[file];
      if (key) a.setAttribute('data-i18n', key);
    });
    document.querySelectorAll('.footer-col h4').forEach(function (h) {
      if (h.getAttribute('data-i18n')) return;
      var txt = (h.textContent || '').trim().toLowerCase();
      h.setAttribute('data-i18n', /^(gare|races|courses|regatas|competiciones|wettbewerbe)/.test(txt) ? 'footer_gare' : 'footer_circolo');
    });
    document.querySelectorAll('.skip-link').forEach(function (a) {
      if (!a.getAttribute('data-i18n')) a.setAttribute('data-i18n', 'skip_to_content');
    });
  }

  window.CVI.applyI18n = function (extra) {
    annotateFooter();
    const dict = Object.assign({}, NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it, (extra && extra[window.CVI.currentLang]) || {});
    document.documentElement.lang = window.CVI.currentLang || 'it';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (dict[key] == null) return;
      var val = dict[key];
      if (/<[a-z][\s\S]*>/i.test(val)) el.innerHTML = val;
      else el.textContent = val;
    });
  };

  window.CVI.cambiaLingua = function (lang, extra) {
    window.CVI.currentLang = lang;
    localStorage.setItem('cvi_lang', lang);
    window.CVI.applyI18n(extra);
    /* Notifica gli script che generano contenuti dinamici (gare, banner, ...)
       così possono ridisegnarli nella nuova lingua. */
    try {
      document.dispatchEvent(new CustomEvent('cvi:langchange', { detail: { lang: lang } }));
    } catch (e) {
      var ev = document.createEvent('Event');
      ev.initEvent('cvi:langchange', true, true);
      ev.detail = { lang: lang };
      document.dispatchEvent(ev);
    }
  };

  window.CVI.initMobileNav = function () {
    const btn = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    if (!btn || !mobile) return;

    function setOpen(open) {
      mobile.classList.toggle('is-open', open);
      btn.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    }

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!mobile.classList.contains('is-open'));
    };

    mobile.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobile.classList.contains('is-open')) {
        setOpen(false);
      }
    });
  };

  /** Logo header uniforme: immagine + testo su tutte le pagine */
  window.CVI.upgradeHeaderLogo = function () {
    var container = document.querySelector('header .logo-container');
    if (!container) return;

    if (!container.querySelector('img.logo-img')) {
      var img = document.createElement('img');
      img.src = 'logo-cvi.png';
      img.alt = 'Logo Circolo Velico Italia';
      img.className = 'logo-img';
      img.width = 32;
      img.height = 32;
      img.loading = 'eager';
      img.decoding = 'async';
      container.insertBefore(img, container.firstChild);
    }

    var textEl = container.querySelector('.logo-text');
    if (!textEl) {
      textEl = document.createElement('span');
      textEl.className = 'logo-text';
      container.appendChild(textEl);
    }
    // Rimuove emoji ancora se presente e uniforma testo
    textEl.innerHTML = 'CVI <span>Virtual</span>';
  };

  /** Footer: naming uniforme Circolo Velico Italia */
  window.CVI.ensureFooter = function () {
    document.querySelectorAll('.footer-bottom').forEach(function (el) {
      el.textContent = '© 2003–2026 Circolo Velico Italia · Virtual Skipper';
    });
    document.querySelectorAll('.footer-brand p').forEach(function (p) {
      if (/Virtual Skipper/i.test(p.textContent) || /skipper/i.test(p.textContent)) {
        p.textContent = window.CVI.t('footer_tagline', 'Circolo Velico Italia · Virtual Skipper dal 2003.');
      }
    });
    document.querySelectorAll('.footer-brand .logo-text').forEach(function (el) {
      el.innerHTML = 'CVI <span style="color: var(--accent-color)">Virtual</span>';
    });
  };

  window.CVI.ensureNavAlign = function () {};

  /** Inserisce Galleria e Discord nel menu se mancano (desktop + mobile) */
  window.CVI.ensureNavLinks = function () {
    var dict = NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it;

    var ul = document.querySelector('nav.nav-desktop ul');
    if (ul) {
      function insertAfterAlbo(href, label, i18nKey) {
        if (ul.querySelector('a[href="' + href + '"]')) return;
        var albo = ul.querySelector('a[href="albo-doro.html"]');
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = href;
        a.setAttribute('data-i18n', i18nKey);
        a.textContent = label;
        li.appendChild(a);
        if (albo && albo.parentElement && albo.parentElement.parentElement === ul) {
          albo.parentElement.insertAdjacentElement('afterend', li);
        } else {
          ul.appendChild(li);
        }
      }
      insertAfterAlbo('galleria.html', dict.nav_galleria || 'Galleria', 'nav_galleria');
      insertAfterAlbo('discord.html', dict.nav_discord || 'Discord', 'nav_discord');
    }

    var mobile = document.getElementById('navMobile');
    if (mobile) {
      function insertMobileAfterAlbo(href, label, i18nKey) {
        if (mobile.querySelector('a[href="' + href + '"]')) return;
        var a = document.createElement('a');
        a.href = href;
        a.setAttribute('data-i18n', i18nKey);
        a.textContent = label;
        var albo = mobile.querySelector('a[href="albo-doro.html"]');
        if (albo) albo.insertAdjacentElement('afterend', a);
        else mobile.appendChild(a);
      }
      insertMobileAfterAlbo('galleria.html', dict.nav_galleria || 'Galleria', 'nav_galleria');
      insertMobileAfterAlbo('discord.html', dict.nav_discord || 'Discord', 'nav_discord');
    }
  };

  window.CVI.aggiornaAuth = async function () {
    try {
      if (!CVI.supabase) return;
      const { data: { session } } = await CVI.supabase.auth.getSession();
      const links = [document.getElementById('auth-link'), document.getElementById('auth-link-mobile')].filter(Boolean);
      if (session && session.user) {
        links.forEach(function (a) {
          a.textContent = (NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it).nav_area_membri || 'Il mio profilo';
          a.href = 'profilo.html';
          a.setAttribute('data-i18n', 'nav_area_membri');
        });
      } else {
        links.forEach(function (a) {
          a.textContent = (NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it).nav_accedi || 'Accedi';
          a.href = 'accedi.html';
          a.setAttribute('data-i18n', 'nav_accedi');
        });
      }
    } catch (e) { console.warn('[CVI] auth', e); }
  };

  window.CVI.initFloatingDiscord = function () {
    if (document.getElementById('cvi-discord-fab')) return;
    const a = document.createElement('a');
    a.id = 'cvi-discord-fab';
    a.href = 'discord.html';
    a.title = 'Community Discord';
    a.setAttribute('aria-label', 'Discord');
    a.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.688-.608 1.024a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.024.077.077 0 0 0-.078-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';
    a.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:9000;width:52px;height:52px;border-radius:50%;background:#5865F2;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 28px rgba(88,101,242,.35);text-decoration:none;transition:transform .2s ease,background .2s ease;';
    a.onmouseenter = function () { a.style.transform = 'scale(1.08)'; a.style.background = '#4752c4'; };
    a.onmouseleave = function () { a.style.transform = 'scale(1)'; a.style.background = '#5865F2'; };
    document.body.appendChild(a);
  };

  window.CVI.resolveRole = function (prof) {
    if (!prof) return 'socio';
    var r = (prof.role || '').toString().toLowerCase();
    if (r === 'admin' || r === 'scorer' || r === 'caposquadra' || r === 'socio') return r;
    if (prof.is_admin === true) return 'admin';
    return 'socio';
  };

  window.CVI.canAccessAdmin = function (role) {
    return role === 'admin' || role === 'scorer';
  };

  window.CVI.ensureAdminNavLink = async function () {
    try {
      if (!CVI.supabase) return;
      var res = await CVI.supabase.auth.getSession();
      var session = res.data && res.data.session;
      if (!session || !session.user) return;
      var pr = await CVI.supabase.from('profiles').select('is_admin, role').eq('id', session.user.id).maybeSingle();
      var role = CVI.resolveRole(pr.data);
      if (!CVI.canAccessAdmin(role)) return;
      function addLink(container, isMobile) {
        if (!container) return;
        if (container.querySelector('a[href="admin.html"]')) return;
        var a = document.createElement('a');
        a.href = 'admin.html';
        a.textContent = 'Admin';
        a.style.color = '#38bdf8';
        a.style.fontWeight = '700';
        if (isMobile) { container.appendChild(a); }
        else { var li = document.createElement('li'); li.appendChild(a); container.appendChild(li); }
      }
      addLink(document.querySelector('nav.nav-desktop ul'), false);
      addLink(document.getElementById('navMobile'), true);
    } catch (e) { console.warn('[CVI] ensureAdminNavLink', e); }
  };

  window.CVI.init = function (activePage, extraI18n) {
    window.CVI.initMobileNav();
    window.CVI.upgradeHeaderLogo();
    window.CVI.ensureNavAlign();
    window.CVI.ensureNavLinks();
    window.CVI.ensureFooter();
    const sel = document.getElementById('languageSelect');
    if (sel) {
      sel.value = window.CVI.currentLang;
      sel.onchange = function () { window.CVI.cambiaLingua(sel.value, extraI18n); };
    }
    if (activePage) {
      document.querySelectorAll('a[href="' + activePage + '"]').forEach(function (a) { a.classList.add('active'); });
    }
    window.CVI.applyI18n(extraI18n);
    window.CVI.aggiornaAuth();
    window.CVI.initFloatingDiscord();
    window.CVI.ensureAdminNavLink();
    try {
      var s = document.createElement('script');
      s.src = 'discord-notify.js?v=3';
      s.async = true;
      document.head.appendChild(s);
    } catch (e) {}
  };
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
      var pr = ({ it: "Proteste", en: "Protests", fr: "R\u00e9clamations", es: "Protestas" })[lang] || "Proteste";
      var calLabel = ({ it: "Vista calendario", en: "Calendar view", fr: "Vue calendrier", es: "Vista calendario" })[lang] || "Vista calendario";
      addDrop("calendario.html", calLabel);
      addDrop("proteste.html", pr);
      addDrop("eventi-aperti.html", "Eventi aperti");
    };
  }
})();
