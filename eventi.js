/* CVI – Area Eventi: elenco unificato (campionati/serie + eventi singoli) */
(function () {
  "use strict";

  var E = window.CVIEventi;
  var esc = E.esc;
  var tr = E.tr;
  var lastData = null;

  var STYLE =
    ".ev-list-hero{margin:0 0 1.75rem}" +
    ".ev-list-hero h1{margin:0;font-size:2.4rem;letter-spacing:.02em;font-weight:800;color:#fff;text-transform:uppercase}" +
    ".ev-list-hero p{margin:.5rem 0 0;color:#94a3b8;max-width:720px;line-height:1.55}" +
    ".ev-list{max-width:980px;margin:0 auto}" +
    ".ev-group{margin:0 0 2rem}" +
    ".ev-group-head{display:flex;align-items:center;gap:.75rem;margin:0 0 .35rem}" +
    ".ev-group-title{margin:0;font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;white-space:nowrap}" +
    ".ev-group-line{flex:1;height:1px;background:rgba(255,255,255,.08)}" +
    ".ev-group-empty{color:#64748b;font-size:.9rem;padding:.85rem 0 .25rem}" +
    ".ev-row{display:grid;grid-template-columns:88px 92px minmax(0,1fr) auto;gap:1rem;align-items:center;padding:.9rem 0;border-bottom:1px solid rgba(255,255,255,.06);text-decoration:none;color:inherit;transition:background .15s ease}" +
    ".ev-row:hover{background:rgba(56,189,248,.04)}" +
    ".ev-row-date{font-size:.72rem;line-height:1.35;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}" +
    ".ev-row-date strong{display:block;color:#e2e8f0;font-size:.86rem;letter-spacing:.04em}" +
    ".ev-row-date span{display:block;margin-top:.15rem;font-size:.66rem;color:#64748b}" +
    ".ev-row-poster{width:92px;height:58px;border-radius:8px;overflow:hidden;background:linear-gradient(145deg,#1e3a5f,#0f172a);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center}" +
    ".ev-row-poster img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".ev-row-poster span{font-size:.6rem;font-weight:800;color:rgba(255,255,255,.75);text-align:center;padding:.25rem;line-height:1.2;text-transform:uppercase;letter-spacing:.04em}" +
    ".ev-row-main{min-width:0}" +
    ".ev-row-title{margin:0 0 .2rem;font-size:1.05rem;font-weight:700;color:#fff;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".ev-row-sub{color:#64748b;font-size:.8rem}" +
    ".ev-row-side{display:flex;flex-direction:column;align-items:flex-end;gap:.35rem;min-width:118px}" +
    ".ev-row-count{font-size:.78rem;color:#64748b;white-space:nowrap}" +
    ".ev-row-count strong{color:#e2e8f0;font-size:.9rem}" +
    ".ev-progress{width:100%;max-width:118px;height:4px;border-radius:999px;background:rgba(148,163,184,.18);overflow:hidden}" +
    ".ev-progress span{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#7dd3fc)}" +
    ".ev-status{font-size:.66rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:.2rem .55rem;border-radius:5px;white-space:nowrap}" +
    ".ev-status.in-corso{background:rgba(34,197,94,.14);color:#4ade80;border:1px solid rgba(34,197,94,.35)}" +
    ".ev-status.prossimo{background:rgba(56,189,248,.12);color:#7dd3fc;border:1px solid rgba(56,189,248,.35)}" +
    ".ev-status.passato{background:rgba(148,163,184,.12);color:#94a3b8;border:1px solid rgba(148,163,184,.25)}" +
    ".ev-loading{text-align:center;color:#94a3b8;padding:2rem 1rem}" +
    ".ev-empty{text-align:center;color:#64748b;padding:2.5rem 1rem}" +
    "@media(max-width:640px){.ev-list-hero h1{font-size:1.9rem}.ev-row{grid-template-columns:74px 74px minmax(0,1fr);gap:.75rem}.ev-row-poster{width:74px;height:50px}.ev-row-side{grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between;min-width:0}.ev-progress{max-width:140px}.ev-row-title{white-space:normal}}";

  function injectStyles() {
    if (document.getElementById("ev-list-styles")) return;
    var st = document.createElement("style");
    st.id = "ev-list-styles";
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  function statusRank(s) {
    return s === "in-corso" ? 0 : s === "prossimo" ? 1 : 2;
  }

  function statusText(status) {
    if (status === "in-corso") return tr("ev_status_live", "IN CORSO");
    if (status === "prossimo") return tr("ev_status_next", "PROSSIMO");
    return tr("ev_status_past", "PASSATO");
  }

  async function fetchData() {
    var sb = CVI.supabase;
    var serie = [];
    var eventi = [];
    var regate = [];
    var iscrizioni = [];
    var risEventi = [];

    var rSerie = await sb.from("serie_aperte").select("*").eq("pubblicato", true).order("data_inizio", { ascending: false, nullsFirst: false });
    if (!rSerie.error) serie = rSerie.data || [];

    var rEventi = await sb.from("eventi_aperti").select("*").eq("pubblicato", true).order("data_evento", { ascending: false, nullsFirst: false });
    if (!rEventi.error) eventi = rEventi.data || [];

    if (serie.length) {
      var ids = serie.map(function (s) { return s.id; });
      var rReg = await sb.from("serie_aperte_regate").select("id,serie_id,giornata,data_regata,ordine").in("serie_id", ids);
      if (!rReg.error) regate = rReg.data || [];
      var rIscr = await sb.from("serie_aperte_iscrizioni").select("serie_id,girone_id").in("serie_id", ids);
      if (!rIscr.error) iscrizioni = rIscr.data || [];
    }
    if (eventi.length) {
      var rRis = await sb.from("eventi_aperti_risultati").select("evento_id").in("evento_id", eventi.map(function (e) { return e.id; }));
      if (!rRis.error) risEventi = rRis.data || [];
    }

    return { serie: serie, eventi: eventi, regate: regate, iscrizioni: iscrizioni, risEventi: risEventi };
  }

  function buildItems(data) {
    var regBySerie = E.groupBy(data.regate, "serie_id");
    var iscrBySerie = E.groupBy(data.iscrizioni, "serie_id");
    var risByEvento = E.groupBy(data.risEventi, "evento_id");

    var items = data.serie.map(function (s) {
      var regs = regBySerie[String(s.id)] || [];
      var days = E.buildDays(regs);
      var iscr = iscrBySerie[String(s.id)] || [];
      var max = s.max_iscritti != null && Number(s.max_iscritti) > 0 ? Number(s.max_iscritti) : null;
      return {
        id: s.id,
        kind: "serie",
        href: E.eventHref("serie", s.id),
        title: s.titolo || tr("ev_type_serie", "Serie aperta"),
        poster: s.poster || "",
        start: s.data_inizio,
        end: s.data_fine,
        status: E.deriveStatus(s.data_inizio, s.data_fine),
        typeLabel: tr("ev_type_championship", "Campionato"),
        metaParts: [
          regs.length ? regs.length + " " + tr("ev_races", "regate") : "",
          days.length ? days.length + " " + tr("ev_days", "giornate") : "",
          s.flotta || ""
        ].filter(Boolean),
        participants: iscr.length ? iscr.length : null,
        max: max
      };
    });

    data.eventi.forEach(function (e) {
      var ris = risByEvento[String(e.id)] || [];
      var max = e.max_iscritti != null && Number(e.max_iscritti) > 0 ? Number(e.max_iscritti) : null;
      items.push({
        id: e.id,
        kind: "evento",
        href: E.eventHref("evento", e.id),
        title: e.titolo || tr("ev_title_event", "Evento aperto"),
        poster: e.poster || "",
        start: e.data_evento,
        end: e.data_evento,
        status: E.deriveStatus(e.data_evento, e.data_evento),
        typeLabel: tr("ev_type_event", "Evento"),
        metaParts: [ris.length ? ris.length + " " + tr("ev_participants", "partecipanti") : "", e.flotta || ""].filter(Boolean),
        participants: ris.length ? ris.length : null,
        max: max
      });
    });

    items.sort(function (a, b) {
      var ra = statusRank(a.status);
      var rb = statusRank(b.status);
      if (ra !== rb) return ra - rb;
      var ta = a.start ? new Date(a.start).getTime() : 0;
      var tb = b.start ? new Date(b.start).getTime() : 0;
      return a.status === "passato" ? tb - ta : ta - tb;
    });
    return items;
  }


  function rowHtml(item) {
    var dateMain = E.fmtDateShort(item.start) || "—";
    var dateSub = "";
    if (item.kind === "serie" && item.end && item.end !== item.start) {
      dateSub = tr("ev_until", "FINO AL") + " " + E.fmtDateShort(item.end);
    } else if (item.start) {
      dateSub = E.fmtTime(item.start) || "";
    }
    var poster = item.poster
      ? '<img src="' + esc(item.poster) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span style="display:none">' + esc(item.title) + "</span>"
      : "<span>" + esc(item.title) + "</span>";

    var countHtml = "";
    if (item.participants != null) {
      countHtml = "<strong>" + item.participants + "</strong>" + (item.max ? " / " + item.max : "");
    } else if (item.max) {
      countHtml = tr("ev_max", "max") + " <strong>" + item.max + "</strong>";
    }
    var progress = "";
    if (item.participants != null && item.max) {
      var pct = Math.max(0, Math.min(100, Math.round((item.participants / item.max) * 100)));
      progress = '<div class="ev-progress" aria-hidden="true"><span style="width:' + pct + '%"></span></div>';
    }

    return (
      '<a class="ev-row" href="' + esc(item.href) + '">' +
      '<div class="ev-row-date"><strong>' + esc(dateMain) + "</strong>" + (dateSub ? "<span>" + esc(dateSub) + "</span>" : "") + "</div>" +
      '<div class="ev-row-poster">' + poster + "</div>" +
      '<div class="ev-row-main">' +
      '<h3 class="ev-row-title">' + esc(item.title) + "</h3>" +
      '<div class="ev-row-sub">' + esc([item.typeLabel].concat(item.metaParts).join(" · ")) + "</div>" +
      "</div>" +
      '<div class="ev-row-side">' +
      (countHtml ? '<div class="ev-row-count">' + countHtml + "</div>" : "") +
      progress +
      '<span class="ev-status ' + item.status + '">' + esc(statusText(item.status)) + "</span>" +
      "</div></a>"
    );
  }

  function groupHtml(title, status, items, emptyText) {
    var list = items.filter(function (i) { return i.status === status; });
    return (
      '<section class="ev-group">' +
      '<div class="ev-group-head"><h2 class="ev-group-title">' + esc(title) + '</h2><div class="ev-group-line"></div></div>' +
      (list.length ? list.map(rowHtml).join("") : '<p class="ev-group-empty">' + esc(emptyText) + "</p>") +
      "</section>"
    );
  }

  function render(items) {
    var box = document.getElementById("eventi-list");
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<p class="ev-empty">' + esc(tr("ev_empty_all", "Nessun evento o campionato pubblicato al momento.")) + "</p>";
      return;
    }
    box.innerHTML =
      groupHtml(tr("ev_group_live", "IN CORSO"), "in-corso", items, tr("ev_empty_live", "Nessun evento in corso.")) +
      groupHtml(tr("ev_group_next", "PROSSIMI"), "prossimo", items, tr("ev_empty_next", "Nessun evento in programma. La prossima regata comparirà qui.")) +
      groupHtml(tr("ev_group_past", "PASSATI"), "passato", items, tr("ev_empty_past", "Ancora nessun evento passato."));
  }

  function redirectLegacyHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    var m = hash.match(/^(serie|evento)-(.+)$/);
    if (!m) return false;
    try {
      location.replace(E.eventHref(m[1], decodeURIComponent(m[2])));
    } catch (e) {
      location.replace(E.eventHref(m[1], m[2]));
    }
    return true;
  }

  async function load() {
    injectStyles();
    var box = document.getElementById("eventi-list");
    if (!box) return;
    if (!window.CVI || !CVI.supabase) {
      box.innerHTML = '<p class="ev-empty">' + esc(tr("ev_unavailable", "Servizio non disponibile. Ricarica la pagina.")) + "</p>";
      return;
    }
    if (redirectLegacyHash()) return;

    box.innerHTML = '<p class="ev-loading">' + esc(tr("ev_loading", "Caricamento eventi…")) + "</p>";
    try {
      lastData = await fetchData();
      render(buildItems(lastData));
    } catch (err) {
      console.warn("[CVI eventi]", err);
      box.innerHTML = '<p class="ev-empty">' + esc(tr("ev_error", "Errore nel caricamento degli eventi.")) + "</p>";
    }
  }

  document.addEventListener("cvi:langchange", function () {
    document.title = tr("ev_doc_title", "Eventi - CVI Virtual");
    if (lastData) render(buildItems(lastData));
    else load();
  });

  function start() {
    if (window.CVI && typeof CVI.init === "function") {
      try { CVI.init("eventi.html", E.I18N); } catch (e) { console.warn("[CVI eventi] init", e); }
    }
    document.title = tr("ev_doc_title", "Eventi - CVI Virtual");
    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

