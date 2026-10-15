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
    code = code.replace("discord-notify.js?v=1", "discord-notify.js?v=2");
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
  var xhr = new XMLHttpRequest();
  xhr.open("GET", SRC, false);
  try {
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) inject(xhr.responseText);
    else console.error("[CVI] common.js restore failed", xhr.status);
  } catch (e) {
    console.error("[CVI] common.js restore", e);
  }

  /* —— Eventi aperti: box in Home —— */
  function escH(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }
  async function loadEventiHome() {
    if (!window.CVI || !CVI.supabase) return false;
    if (document.getElementById("cvi-eventi-aperti-home")) return true;
    var path = (location.pathname || "").toLowerCase();
    var isHome =
      path === "/" ||
      path === "" ||
      path.indexOf("index") !== -1 ||
      path.indexOf("vsk5-sito-circolo") !== -1 && (path.endsWith("/") || path.endsWith("/vsk5-sito-circolo"));
    var hasMain = document.getElementById("main-content") || document.querySelector("main.page-content");
    if (!hasMain) return false;
    if (!isHome && !document.querySelector(".content-row")) return false;
    if (!isHome && !document.querySelector("h2")) return false;
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
      if (!list.length) {
        console.info("[CVI home eventi] nessun evento con mostra_home");
        return true;
      }
      var e = list[0];
      var ris = await CVI.supabase
        .from("eventi_aperti_risultati")
        .select("posizione,nickname,team")
        .eq("evento_id", e.id)
        .order("posizione")
        .limit(10);
      var rows = ris.data || [];
      var dateStr = "";
      try {
        if (e.data_evento) {
          dateStr = new Date(e.data_evento).toLocaleDateString("it-IT", {
            day: "numeric", month: "short", year: "numeric"
          });
        }
      } catch (err) {}
      var items = rows.length
        ? rows.map(function (r) {
            return "<li style=\"margin:.25rem 0\"><strong style=\"color:#7dd3fc\">" +
              escH(r.posizione) + ".</strong> " + escH(r.nickname) +
              (r.team ? " <span style=\"color:#94a3b8\">(" + escH(r.team) + ")</span>" : "") +
              "</li>";
          }).join("")
        : "<li style=\"color:#64748b\">Classifica in aggiornamento</li>";
      var html =
        "<section id=\"cvi-eventi-aperti-home\" class=\"content-row\" style=\"margin:1.25rem 0 0\">" +
        "<div class=\"content-box\" style=\"max-width:100%;border:1px solid rgba(56,189,248,.25)\">" +
        "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap\">" +
        "<div><h2 style=\"margin:0;color:#fff;font-size:1.2rem\">Evento aperto</h2>" +
        "<p style=\"margin:.3rem 0 0;color:#94a3b8;font-size:.88rem\">Classifica separata · non ufficiali soci</p></div>" +
        "<a href=\"eventi-aperti.html\" class=\"link-more\" style=\"color:#7dd3fc\">Vedi tutto →</a></div>" +
        "<h3 style=\"margin:0.85rem 0 0.25rem;color:#7dd3fc;font-size:1.05rem\">" + escH(e.titolo) + "</h3>" +
        (dateStr ? "<div style=\"color:#94a3b8;font-size:.85rem;margin-bottom:.5rem\">" + escH(dateStr) + "</div>" : "") +
        "<ol style=\"list-style:none;padding:0;margin:0;color:#e2e8f0;font-size:.92rem\">" + items + "</ol>" +
        "</div></section>";
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
