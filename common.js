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
      nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche', nav_proteste: 'Proteste',
      nav_albo: "Albo d'Oro", nav_regolamento: 'Regolamento', nav_download: 'Download',
      nav_contatti: 'Contatti', nav_membri: 'Membri', nav_unisciti: 'Unisciti',
      nav_accedi: 'Accedi', nav_area_membri: 'Il mio profilo',
      nav_galleria: 'Galleria', nav_discord: 'Discord'
    },
    en: {
      nav_home: 'Home', nav_team: 'Teams', nav_gare: 'Races & Events ▾',
      nav_gare_sub: 'Calendar', nav_classifiche: 'Standings', nav_proteste: 'Protests',
      nav_albo: 'Hall of Fame', nav_regolamento: 'Rules', nav_download: 'Download',
      nav_contatti: 'Contact', nav_membri: 'Members', nav_unisciti: 'Join Us',
      nav_accedi: 'Login', nav_area_membri: 'My profile',
      nav_galleria: 'Gallery', nav_discord: 'Discord'
    },
    fr: {
      nav_home: 'Accueil', nav_team: 'Équipes', nav_gare: 'Courses & Événements ▾',
      nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements', nav_proteste: 'Réclamations',
      nav_albo: 'Temple de la Renommée', nav_regolamento: 'Règlement', nav_download: 'Téléchargements',
      nav_contatti: 'Contact', nav_membri: 'Membres', nav_unisciti: 'Rejoindre',
      nav_accedi: 'Connexion', nav_area_membri: 'Mon profil',
      nav_galleria: 'Galerie', nav_discord: 'Discord'
    },
    es: {
      nav_home: 'Inicio', nav_team: 'Equipos', nav_gare: 'Regatas y Eventos ▾',
      nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificación', nav_proteste: 'Protestas',
      nav_albo: 'Salón de la Fama', nav_regolamento: 'Reglamento', nav_download: 'Descargas',
      nav_contatti: 'Contacto', nav_membri: 'Miembros', nav_unisciti: 'Únete',
      nav_accedi: 'Acceder', nav_area_membri: 'Mi perfil',
      nav_galleria: 'Galería', nav_discord: 'Discord'
    }
  };

  window.CVI.currentLang = localStorage.getItem('cvi_lang') || 'it';

  window.CVI.applyI18n = function (extra) {
    const dict = Object.assign({}, NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it, (extra && extra[window.CVI.currentLang]) || {});
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
        p.textContent = 'Circolo Velico Italia · Virtual Skipper dal 2003.';
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


/* —— Extra CVI: link Proteste / Eventi aperti nel menu a tendina —— */
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
      addDrop("proteste.html", pr);
      addDrop("eventi-aperti.html", "Eventi aperti");
    };
  }
})();

/* —— Box Eventi aperti in Home —— */
(function () {
  /* —— Eventi aperti: box Home migliorato (podio) —— */
  function escH(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }
  function medalStyle(pos) {
    if (pos === 1) return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0b0f19", label: "1°" };
    if (pos === 2) return { bg: "linear-gradient(135deg,#94a3b8,#64748b)", color: "#0b0f19", label: "2°" };
    if (pos === 3) return { bg: "linear-gradient(135deg,#d97706,#b45309)", color: "#fff", label: "3°" };
    return { bg: "rgba(56,189,248,0.15)", color: "#7dd3fc", label: pos + "°" };
  }
  async function loadEventiHome() {
    if (!window.CVI || !CVI.supabase) return false;
    if (document.getElementById("cvi-eventi-aperti-home")) return true;
    var path = (location.pathname || "").toLowerCase();
    var isHome =
      path === "/" ||
      path === "" ||
      path.indexOf("index") !== -1 ||
      (path.indexOf("vsk5-sito-circolo") !== -1 && (path.endsWith("/") || path.endsWith("/vsk5-sito-circolo")));
    var hasMain = document.getElementById("main-content") || document.querySelector("main.page-content");
    if (!hasMain || !isHome) return false;
    try {
      var res = await CVI.supabase
        .from("eventi_aperti")
        .select("id,titolo,data_evento,descrizione,mostra_home,pubblicato")
        .eq("pubblicato", true)
        .order("data_evento", { ascending: false });
      if (res.error) {
        console.warn("[CVI home eventi]", res.error);
        return false;
      }
      var list = (res.data || []).filter(function (x) { return x.mostra_home === true; });
      if (!list.length) return true;
      var e = list[0];
      var ris = await CVI.supabase
        .from("eventi_aperti_risultati")
        .select("posizione,nickname,team")
        .eq("evento_id", e.id)
        .order("posizione")
        .limit(12);
      var rows = ris.data || [];
      var dateStr = "";
      try {
        if (e.data_evento) {
          dateStr = new Date(e.data_evento).toLocaleDateString("it-IT", {
            weekday: "short", day: "numeric", month: "short", year: "numeric"
          });
        }
      } catch (err) {}

      var top = rows.slice(0, 3);
      var rest = rows.slice(3);

      var podiumHtml = "";
      if (top.length) {
        podiumHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:0 0 1rem">';
        top.forEach(function (r) {
          var m = medalStyle(Number(r.posizione) || 0);
          podiumHtml +=
            '<div style="background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.85rem .6rem;text-align:center">' +
            '<div style="width:2.1rem;height:2.1rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;margin-bottom:.45rem;box-shado...';
          podiumHtml += '<div style="color:#fff;font-weight:700;font-size:.95rem;line-height:1.25;word-break:break-word">' + escH(r.nickname) + '</div>' +
            (r.team ? '<div style="color:#94a3b8;font-size:.78rem;margin-top:.2rem">' + escH(r.team) + '</div>' : '') +
            '</div>';
        });
        podiumHtml += "</div>";
      }

      var restHtml = "";
      if (rest.length) {
        restHtml = '<ol style="list-style:none;padding:0;margin:0 0 .75rem;display:flex;flex-direction:column;gap:.35rem' + '\"' + '>';
        rest.forEach(function (r) {
          restHtml +=
            '<li style="display:flex;align-items:baseline;gap:.4rem;font-size:.9rem;color:#e2e8f0;padding:.25rem 0;border-bottom:1px solid rgba(255,255,255,.04)">' +
            '<span style="color:#7dd3fc;font-weight:700;min-width:1.4rem">' + escH(r.posizione) + '.</span> ' +
            '<strong>' + escH(r.nickname) + '</strong>' +
            (r.team ? ' <span style="color:#94a3b8;font-size:.85rem">(' + escH(r.team) + ')</span>' : '') +
            '</li>';
        });
        restHtml += '</ol>';
      } else if (!rows.length) {
        restHtml = '<p style="color:#64748b;margin:.5rem 0;font-size:.9rem">Classifica in aggiornamento</p>';
      }

      var html =
        '<section id="cvi-eventi-aperti-home" style="margin:1.5rem 0 0">' +
        '<div style="background:var(--card-bg,#111827);border:1px solid rgba(56,189,248,.28);border-radius:14px;padding:1.35rem 1.5rem;box-shadow:0 8px 28px rgba(0,0,0,.28)">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:.85rem">' +
        "<div>" +
        '<span style="display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#38bdf8,#7dd3fc);padding:...';
      html += '<h2 style="margin:0;color:#fff;font-size:1.28rem;font-weight:700;line-height:1.25">' + escH(e.titolo) + '</h2>' +
        (dateStr ? '<div style="color:#94a3b8;font-size:.88rem;margin-top:.3rem">📅 ' + escH(dateStr) + '</div>' : '') +
        '</div>' +
        '<a href="eventi-aperti.html" style="color:#7dd3fc;font-weight:700;font-size:.9rem;white-space:nowrap;align-self:center">Vedi tutto →</a>' +
        '</div>' +
        (e.descrizione ? '<p style="color:#cbd5e1;font-size:.92rem;margin:0 0 1rem;line-height:1.5">' + escH(e.descrizione) + '</p>' : '') +
        podiumHtml +
        restHtml +
        '<p style="margin:.5rem 0 0;font-size:.78rem;color:#64748b">Classifica separata · non ufficiale soci</p>' +
        '</div></section>';

      var main = document.getElementById("main-content") || document.querySelector("main.page-content");
      var anchor = main && main.querySelector(".content-row");
      if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
      else if (main) main.insertAdjacentHTML("beforeend", html);
      return true;
    } catch (err) {
      console.warn("[CVI home eventi]", err);
      return false;
    }
  }
  function tryHome() {
    var n = 0;
    function tick() {
      n++;
      loadEventiHome().then(function (ok) {
        if (!ok && n < 12) setTimeout(tick, 500);
      });
    }
    setTimeout(tick, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryHome);
  else tryHome();
})();
