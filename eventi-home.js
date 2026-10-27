/* CVI – box unificato EVENTI in Home
   Unisce Serie Aperte ed Eventi aperti in un solo riquadro (podio + link
   all’area Eventi). Usa 2-serie-aperte-lib.js per la classifica serie. */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function tr(key, fallback) {
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : fallback;
  }

  function locale() {
    return window.CVI && typeof CVI.locale === "function" ? CVI.locale() : "it-IT";
  }

  function fmtDate(d, withYear) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString(locale(), {
        day: "numeric",
        month: "short",
        year: withYear ? "numeric" : undefined
      });
    } catch (e) {
      return "";
    }
  }

  function fmtDateTime(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString(locale(), {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  function medal(pos) {
    if (pos === 1) return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0b0f19" };
    if (pos === 2) return { bg: "linear-gradient(135deg,#94a3b8,#64748b)", color: "#0b0f19" };
    if (pos === 3) return { bg: "linear-gradient(135deg,#d97706,#b45309)", color: "#fff" };
    return { bg: "rgba(56,189,248,0.15)", color: "#7dd3fc" };
  }

  var STYLE =
    ".evh-section{margin:1.5rem 0 0}" +
    ".evh-card{background:var(--card-bg,#111827);border:1px solid rgba(56,189,248,.28);border-radius:14px;padding:1.35rem 1.5rem;box-shadow:0 8px 28px rgba(0,0,0,.28),0 0 0 1px rgba(56,189,248,.06)}" +
    ".evh-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:.85rem}" +
    ".evh-badge{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#38bdf8,#7dd3fc);padding:.22rem .65rem;border-radius:999px;margin-bottom:.4rem}" +
    ".evh-title{margin:0;color:#fff;font-size:1.28rem;font-weight:700;line-height:1.25}" +
    ".evh-date{color:#94a3b8;font-size:.88rem;margin-top:.3rem}" +
    ".evh-link{color:#7dd3fc;font-weight:700;font-size:.9rem;white-space:nowrap;align-self:center;text-decoration:none}" +
    ".evh-link:hover{color:#bae6fd}" +
    ".evh-desc{color:#cbd5e1;font-size:.92rem;margin:0 0 1rem;line-height:1.5}" +
    ".evh-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:0 0 1rem}" +
    ".evh-podium-item{background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.85rem .6rem;text-align:center}" +
    ".evh-podium-item.p1{border-color:rgba(251,191,36,.45);background:linear-gradient(180deg,rgba(251,191,36,.12),transparent)}" +
    ".evh-medal{width:2.1rem;height:2.1rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;margin-bottom:.45rem;box-shadow:0 4px 12px rgba(0,0,0,.25)}" +
    ".evh-name{color:#fff;font-weight:700;font-size:.95rem;line-height:1.25;word-break:break-word}" +
    ".evh-team{color:#94a3b8;font-size:.78rem;margin-top:.2rem}" +
    ".evh-pts{color:#7dd3fc;font-size:.82rem;font-weight:700;margin-top:.25rem}" +
    ".evh-note{margin:.35rem 0 0;font-size:.8rem;color:#64748b}" +
    ".evh-empty{padding:1rem 0;color:#64748b;font-size:.9rem}" +
    "@media(max-width:600px){.evh-podium{grid-template-columns:1fr;gap:.5rem}.evh-card{padding:1.1rem}}";


  function podiumHtml(rows, ptsFn) {
    if (!rows || !rows.length) return "";
    return (
      '<div class="evh-podium">' +
      rows
        .slice(0, 3)
        .map(function (r, i) {
          var pos = r.pos || i + 1;
          var m = medal(pos);
          return (
            '<div class="evh-podium-item' + (pos === 1 ? " p1" : "") + '">' +
            '<div class="evh-medal" style="background:' + m.bg + ";color:" + m.color + '">' + pos + "°</div>" +
            '<div class="evh-name">' + esc(r.nickname || "—") + "</div>" +
            (r.team ? '<div class="evh-team">' + esc(r.team) + "</div>" : "") +
            (ptsFn && r.pts != null ? '<div class="evh-pts">' + esc(ptsFn(r)) + "</div>" : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  async function buildFeature(sb) {
    var serieRes = await sb
      .from("serie_aperte")
      .select("*")
      .eq("pubblicato", true)
      .eq("mostra_home", true)
      .order("data_inizio", { ascending: false, nullsFirst: false })
      .limit(1);
    var serie = (serieRes.data || [])[0] || null;

    var evRes = await sb
      .from("eventi_aperti")
      .select("*")
      .eq("pubblicato", true)
      .eq("mostra_home", true)
      .order("data_evento", { ascending: false, nullsFirst: false })
      .limit(1);
    var evento = (evRes.data || [])[0] || null;
    if (!serie && !evento) return null;

    var serieTs = serie && serie.data_inizio ? new Date(serie.data_inizio).getTime() : 0;
    var eventTs = evento && evento.data_evento ? new Date(evento.data_evento).getTime() : 0;
    var pickSerie = serie && (!evento || serieTs >= eventTs);

    if (pickSerie) {
      var lib = window.CVISerieAperte;
      var regRes = await sb
        .from("serie_aperte_regate")
        .select("id,titolo,ordine,data_regata")
        .eq("serie_id", serie.id)
        .order("ordine")
        .order("data_regata", { ascending: true, nullsFirst: false });
      var regate = regRes.data || [];
      var classifica = [];
      if (lib && regate.length) {
        var risRes = await sb
          .from("serie_aperte_risultati")
          .select("*")
          .in("regata_id", regate.map(function (r) { return r.id; }));
        var byReg = {};
        (risRes.data || []).forEach(function (r) {
          var k = String(r.regata_id);
          if (!byReg[k]) byReg[k] = [];
          byReg[k].push(r);
        });
        var sistema = serie.sistema_punteggio === "high_point" ? "high_point" : "low_point";
        classifica = lib.calcClassificaSerie(
          regate.map(function (reg) {
            return { id: reg.id, titolo: reg.titolo, results: lib.calcPuntiRegata(byReg[String(reg.id)] || [], sistema) };
          }),
          serie.scarti || 0,
          { sistema: sistema, scartiAuto: !!serie.scarti_auto }
        );
      }
      var sistemaLabel = serie.sistema_punteggio === "high_point" ? "High Point" : "Low Point";
      var scartiN = lib ? lib.calcolaNumScarti(serie.scarti || 0, !!serie.scarti_auto, regate.length) : 0;
      return {
        kind: "serie",
        badge: tr("banner_open_series", "Serie aperta"),
        title: serie.titolo,
        description: serie.descrizione,
        date: serie.data_inizio || serie.data_fine
          ? fmtDate(serie.data_inizio) + (serie.data_fine ? " – " + fmtDate(serie.data_fine, true) : "")
          : "",
        podium: podiumHtml(
          classifica.map(function (r) {
            return { nickname: r.nickname, team: r.team, pos: r.pos, pts: r.netti };
          }),
          function (r) { return r.pts + " pt"; }
        ),
        note:
          sistemaLabel + " · " + tr("banner_discards", "scarti") + ": " + scartiN +
          (serie.scarti_auto ? " (" + tr("banner_automatic", "automatici") + ")" : "") +
          " · " + regate.length + " " + tr("banner_races", "regate") +
          " · " + tr("banner_series_note", "classifica aperta non ufficiale")
      };
    }

    var risRes2 = await sb
      .from("eventi_aperti_risultati")
      .select("posizione,nickname,team")
      .eq("evento_id", evento.id)
      .order("posizione")
      .limit(3);
    var rows = (risRes2.data || []).map(function (r) {
      return { nickname: r.nickname, team: r.team, pos: Number(r.posizione) || null };
    });
    return {
      kind: "evento",
      badge: tr("eventi_type_evento", "Evento aperto"),
      title: evento.titolo,
      description: evento.descrizione,
      date: fmtDateTime(evento.data_evento),
      podium: podiumHtml(rows),
      note: "Classifica dell’evento · non ufficiale"
    };
  }

  async function run() {
    if (!window.CVI || !CVI.supabase) return;
    if (document.getElementById("cvi-eventi-home")) return;

    var path = (location.pathname || "").toLowerCase();
    var isHome =
      path === "/" ||
      path === "" ||
      path.indexOf("index") !== -1 ||
      (path.indexOf("vsk5-sito-circolo") !== -1 &&
        (path.endsWith("/") || path.endsWith("/vsk5-sito-circolo")));
    if (!isHome) return;

    try {
      var feature = await buildFeature(CVI.supabase);
      if (!feature) return;

      var html =
        '<section id="cvi-eventi-home" class="evh-section">' +
        '<div class="evh-card">' +
        '<div class="evh-header">' +
        "<div>" +
        '<span class="evh-badge">' + esc(feature.badge) + "</span>" +
        '<h2 class="evh-title">' + esc(feature.title) + "</h2>" +
        (feature.date ? '<div class="evh-date">📅 ' + esc(feature.date) + "</div>" : "") +
        "</div>" +
        '<a href="eventi.html" class="evh-link">' + esc(tr("eventi_see_all", "Tutti gli eventi →")) + "</a>" +
        "</div>" +
        (feature.description ? '<p class="evh-desc">' + esc(feature.description) + "</p>" : "") +
        feature.podium +
        (feature.note ? '<p class="evh-note">' + esc(feature.note) + "</p>" : "") +
        "</div></section>";

      var main = document.getElementById("main-content") || document.querySelector("main.page-content");
      if (!main) return;

      if (!document.getElementById("evh-home-styles")) {
        var st = document.createElement("style");
        st.id = "evh-home-styles";
        st.textContent = STYLE;
        document.head.appendChild(st);
      }

      var anchor = main.querySelector(".content-row");
      if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
      else main.insertAdjacentHTML("beforeend", html);
    } catch (err) {
      console.warn("[CVI eventi home]", err);
    }
  }

  function start() {
    setTimeout(run, 700);
    setTimeout(run, 1800);
    setTimeout(run, 3500);
  }

  document.addEventListener("cvi:langchange", function () {
    var el = document.getElementById("cvi-eventi-home");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    run();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

