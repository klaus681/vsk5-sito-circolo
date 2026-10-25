/* CVI – box Eventi aperti in Home (podio + design migliorato) */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tr(key, fallback) {
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : fallback;
  }

  function locale() {
    return window.CVI && typeof CVI.locale === "function" ? CVI.locale() : "it-IT";
  }

  function medal(pos) {
    if (pos === 1) return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0b0f19", label: "1°" };
    if (pos === 2) return { bg: "linear-gradient(135deg,#94a3b8,#64748b)", color: "#0b0f19", label: "2°" };
    if (pos === 3) return { bg: "linear-gradient(135deg,#d97706,#b45309)", color: "#fff", label: "3°" };
    return { bg: "rgba(56,189,248,0.15)", color: "#7dd3fc", label: pos + "°" };
  }

  async function run() {
    if (!window.CVI || !CVI.supabase) return;
    if (document.getElementById("cvi-eventi-aperti-home")) return;

    var path = (location.pathname || "").toLowerCase();
    var isHome =
      path === "/" ||
      path === "" ||
      path.indexOf("index") !== -1 ||
      (path.indexOf("vsk5-sito-circolo") !== -1 && (path.endsWith("/") || path.endsWith("/vsk5-sito-circolo")));
    if (!isHome) return;

    try {
      var res = await CVI.supabase
        .from("eventi_aperti")
        .select("id,titolo,data_evento,descrizione")
        .eq("pubblicato", true)
        .eq("mostra_home", true)
        .order("data_evento", { ascending: false, nullsFirst: false })
        .limit(1);

      if (res.error || !res.data || !res.data.length) return;

      var e = res.data[0];
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
          dateStr = new Date(e.data_evento).toLocaleDateString(locale(), {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
          });
        }
      } catch (err) {}

      var top = rows.slice(0, 3);
      var rest = rows.slice(3);

      var podiumHtml = "";
      if (top.length) {
        podiumHtml =
          '<div class="ea-podium">' +
          top
            .map(function (r) {
              var m = medal(Number(r.posizione) || 0);
              return (
                '<div class="ea-podium-item">' +
                '<div class="ea-medal" style="background:' +
                m.bg +
                ";color:" +
                m.color +
                '">' +
                m.label +
                "</div>" +
                '<div class="ea-podium-name">' +
                esc(r.nickname) +
                "</div>" +
                (r.team
                  ? '<div class="ea-podium-team">' + esc(r.team) + "</div>"
                  : "") +
                "</div>"
              );
            })
            .join("") +
          "</div>";
      }

      var restHtml = "";
      if (rest.length) {
        restHtml =
          '<ol class="ea-rest-list">' +
          rest
            .map(function (r) {
              return (
                "<li>" +
                '<span class="ea-pos">' +
                esc(r.posizione) +
                ".</span> " +
                "<strong>" +
                esc(r.nickname) +
                "</strong>" +
                (r.team
                  ? ' <span class="ea-team">(' + esc(r.team) + ")</span>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
          "</ol>";
      }

      if (!rows.length) {
        restHtml =
          '<p class="ea-empty">' + esc(tr("banner_standings_updating", "Classifica in aggiornamento")) + '</p>';
      }

      var html =
        '<section id="cvi-eventi-aperti-home" class="ea-home-section">' +
        '<div class="ea-home-card">' +
        '<div class="ea-home-header">' +
        "<div>" +
        '<span class="ea-badge">' + esc(tr("banner_open_event", "Evento aperto")) + '</span>' +
        '<h2 class="ea-home-title">' +
        esc(e.titolo) +
        "</h2>" +
        (dateStr
          ? '<div class="ea-home-date">📅 ' + esc(dateStr) + "</div>"
          : "") +
        "</div>" +
        '<a href="eventi-aperti.html" class="ea-link-more">' + esc(tr("banner_see_all", "Vedi tutto →")) + '</a>' +
        "</div>" +
        (e.descrizione
          ? '<p class="ea-home-desc">' + esc(e.descrizione) + "</p>"
          : "") +
        podiumHtml +
        restHtml +
        '<p class="ea-home-note">' + esc(tr("banner_open_note", "Classifica separata · non ufficiale soci")) + '</p>' +
        "</div>" +
        "</section>";

      var style =
        "<style>" +
        ".ea-home-section{margin:1.5rem 0 0}" +
        ".ea-home-card{background:var(--card-bg,#111827);border:1px solid rgba(56,189,248,.28);border-radius:14px;padding:1.35rem 1.5rem;box-shadow:0 8px 28px rgba(0,0,0,.28),0 0 0 1px rgba(56,189,248,.06)}" +
        ".ea-home-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:.85rem}" +
        ".ea-badge{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#38bdf8,#7dd3fc);padding:.22rem .65rem;border-radius:999px;margin-bottom:.4rem}" +
        ".ea-home-title{margin:0;color:#fff;font-size:1.28rem;font-weight:700;line-height:1.25}" +
        ".ea-home-date{color:#94a3b8;font-size:.88rem;margin-top:.3rem}" +
        ".ea-link-more{color:#7dd3fc;font-weight:700;font-size:.9rem;white-space:nowrap;align-self:center}" +
        ".ea-link-more:hover{color:#bae6fd}" +
        ".ea-home-desc{color:#cbd5e1;font-size:.92rem;margin:0 0 1rem;line-height:1.5}" +
        ".ea-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:0 0 1rem}" +
        ".ea-podium-item{background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.85rem .6rem;text-align:center}" +
        ".ea-medal{width:2.1rem;height:2.1rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;margin-bottom:.45rem;box-shadow:0 4px 12px rgba(0,0,0,.25)}" +
        ".ea-podium-name{color:#fff;font-weight:700;font-size:.95rem;line-height:1.25;word-break:break-word}" +
        ".ea-podium-team{color:#94a3b8;font-size:.78rem;margin-top:.2rem}" +
        ".ea-rest-list{list-style:none;padding:0;margin:0 0 .75rem;display:flex;flex-direction:column;gap:.35rem}" +
        ".ea-rest-list li{display:flex;align-items:baseline;gap:.4rem;font-size:.9rem;color:#e2e8f0;padding:.25rem 0;border-bottom:1px solid rgba(255,255,255,.04)}" +
        ".ea-rest-list li:last-child{border-bottom:0}" +
        ".ea-pos{color:#7dd3fc;font-weight:700;min-width:1.4rem}" +
        ".ea-team{color:#94a3b8;font-size:.85rem}" +
        ".ea-empty{color:#64748b;margin:.5rem 0;font-size:.9rem}" +
        ".ea-home-note{margin:.5rem 0 0;font-size:.78rem;color:#64748b}" +
        "@media(max-width:600px){.ea-podium{grid-template-columns:1fr;gap:.5rem}.ea-home-card{padding:1.1rem}}" +
        "</style>";

      var main =
        document.getElementById("main-content") ||
        document.querySelector("main.page-content");
      if (!main) return;

      if (!document.getElementById("ea-home-styles")) {
        var st = document.createElement("div");
        st.id = "ea-home-styles";
        st.innerHTML = style;
        document.head.appendChild(st.firstChild || st);
      }

      var anchor = main.querySelector(".content-row");
      if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
      else main.insertAdjacentHTML("beforeend", html);
    } catch (err) {
      console.warn("[CVI eventi aperti home]", err);
    }
  }

  function start() {
    setTimeout(run, 700);
    setTimeout(run, 1800);
    setTimeout(run, 3500);
  }

  /* cambio lingua: rimuove e ridisegna il box nella lingua corrente */
  document.addEventListener("cvi:langchange", function () {
    var el = document.getElementById("cvi-eventi-aperti-home");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    run();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
