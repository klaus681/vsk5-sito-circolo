/* CVI Virtual – shared nav bootstrap (Proteste + Eventi aperti + home box) */
(function () {
  var SRC = "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@13591de807901bdfebe584db659d788ecd1d2bb1/common.js";
  function inject(code) {
    code = code.replace(
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche',",
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche', nav_proteste: 'Proteste',"
    );
    code = code.replace(
      "nav_gare_sub: 'Calendar', nav_classifiche: 'Standings',",
      "nav_gare_sub: 'Calendar', nav_classifiche: 'Standings', nav_proteste: 'Protests',"
    );
    code = code.replace(
      "nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements',",
      "nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements', nav_proteste: 'Réclamations',"
    );
    code = code.replace(
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificación',",
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificación', nav_proteste: 'Protestas',"
    );
    code = code.replace("discord-notify.js?v=1", "discord-notify.js?v=3");
    code = code.replace("discord-notify.js?v=2", "discord-notify.js?v=3");
    var patch = [
      "",
      "  var _ens = window.CVI && window.CVI.ensureNavLinks;",
      "  if (_ens) {",
      "    var _orig = _ens;",
      "    window.CVI.ensureNavLinks = function () {",
      "      _orig();",
      "      function addDrop(href, label) {",
      "        var drop = document.querySelector('nav.nav-desktop .dropdown-menu');",
      "        if (drop && !drop.querySelector('a[href=\"' + href + '\"]')) {",
      "          var li = document.createElement('li');",
      "          var a = document.createElement('a');",
      "          a.href = href; a.textContent = label;",
      "          li.appendChild(a); drop.appendChild(li);",
      "        }",
      "        var mob = document.querySelector('#navMobile .mobile-dropdown');",
      "        if (mob && !mob.querySelector('a[href=\"' + href + '\"]')) {",
      "          var am = document.createElement('a');",
      "          am.href = href; am.textContent = '→ ' + label;",
      "          mob.appendChild(am);",
      "        }",
      "      }",
      "      var lang = window.CVI.currentLang || 'it';",
      "      var pr = ({ it: 'Proteste', en: 'Protests', fr: 'Réclamations', es: 'Protestas' })[lang] || 'Proteste';",
      "      addDrop('proteste.html', pr);",
      "      addDrop('eventi-aperti.html', 'Eventi aperti');",
      "    };",
      "  }",
      ""
    ].join("\n");
    var s = document.createElement("script");
    s.textContent = code + "\n;" + patch;
    document.head.appendChild(s);
  }

  // Fallback inserter if remote patch cannot be fetched/applied
  function addFallbackLinks() {
    function addDrop(href, label) {
      try {
        var drop = document.querySelector('nav.nav-desktop .dropdown-menu');
        if (drop && !drop.querySelector('a[href="' + href + '"]')) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = href; a.textContent = label;
          li.appendChild(a); drop.appendChild(li);
        }
        var mob = document.querySelector('#navMobile .mobile-dropdown');
        if (mob && !mob.querySelector('a[href="' + href + '"]')) {
          var am = document.createElement('a');
          am.href = href; am.textContent = '→ ' + label;
          mob.appendChild(am);
        }
        var navMobile = document.getElementById('navMobile');
        if (navMobile && !navMobile.querySelector('a[href="' + href + '"]')) {
          var an = document.createElement('a');
          an.href = href; an.textContent = label;
          navMobile.appendChild(an);
        }
      } catch (e) { /* ignore */ }
    }
    var lang = (window.CVI && window.CVI.currentLang) || 'it';
    var pr = ({ it: 'Proteste', en: 'Protests', fr: 'Réclamations', es: 'Protestas' })[lang] || 'Proteste';
    addDrop('proteste.html', pr);
    addDrop('eventi-aperti.html', 'Eventi aperti');
  }

  // Use fetch (async) instead of synchronous XHR to avoid blocking the main thread
  fetch(SRC).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.text();
  }).then(function (txt) {
    try {
      inject(txt);
    } catch (e) {
      console.error('[CVI] common.js restore inject error', e);
      // apply fallback to ensure nav links are present
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFallbackLinks); else addFallbackLinks();
    }
  }).catch(function (e) {
    console.error('[CVI] common.js restore', e);
    // fetch failed; ensure fallback links are added
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFallbackLinks); else addFallbackLinks();
  });

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
