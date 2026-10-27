/* CVI – Area unificata EVENTI
   Unisce "Eventi aperti" e "Serie Aperte" in un’unica pagina: elenco con
   filtri + dettaglio inline (podio, classifica serie, risultati evento).
   Sostituisce eventi-aperti.html, che ora reindirizza qui.
   Richiede 2-serie-aperte-lib.js (motore di classifica, opzionale). */
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

  function fmtDate(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString(locale(), {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return "";
    }
  }

  function fmtDateTime(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString(locale(), {
        weekday: "short",
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

  function fmtRange(a, b) {
    var d1 = fmtDate(a);
    var d2 = fmtDate(b);
    if (d1 && d2) return d1 + " – " + d2;
    return d1 || d2 || "";
  }

  function medalClass(pos) {
    if (pos === 1) return "gold";
    if (pos === 2) return "silver";
    if (pos === 3) return "bronze";
    return "";
  }

  function deriveStatus(item) {
    var now = Date.now();
    var start = item.start ? new Date(item.start).getTime() : null;
    var end = item.end ? new Date(item.end).getTime() : null;
    if (end && end < now) return "passato";
    if (start && start > now) return "prossimo";
    if ((start && start <= now) || (end && end >= now) || (!start && !end)) {
      return "in-corso";
    }
    return "prossimo";
  }

  var state = { items: [], currentFilter: "all" };

  var STYLE =
    ".ev-filters{display:flex;gap:.5rem;flex-wrap:wrap;margin:0 0 1.5rem}" +
    ".ev-filter{background:transparent;border:1px solid rgba(148,163,184,.25);color:#94a3b8;padding:.45rem 1rem;border-radius:999px;font-size:.875rem;cursor:pointer;transition:all .15s;font-family:inherit}" +
    ".ev-filter:hover{border-color:#38bdf8;color:#e2e8f0}" +
    ".ev-filter.active{background:#38bdf8;border-color:#38bdf8;color:#0b0f19;font-weight:700}" +
    ".ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.15rem}" +
    ".ev-card{background:var(--card-bg,#111827);border:1px solid rgba(56,189,248,.2);border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s;text-decoration:none;color:inherit;display:block}" +
    ".ev-card:hover{transform:translateY(-3px);border-color:#38bdf8}" +
    ".ev-card-poster{height:150px;background:linear-gradient(145deg,#1e3a5f,#0f172a);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}" +
    ".ev-card-poster img{width:100%;height:100%;object-fit:cover}" +
    ".ev-card-poster .ev-fallback{color:rgba(255,255,255,.7);font-weight:700;font-size:1.05rem;text-align:center;padding:1rem;line-height:1.3}" +
    ".ev-badge{position:absolute;top:10px;right:10px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:.22rem .6rem;border-radius:6px}" +
    ".ev-badge.in-corso{background:#22c55e;color:#052e16}" +
    ".ev-badge.prossimo{background:#38bdf8;color:#0b0f19}" +
    ".ev-badge.passato{background:#475569;color:#e2e8f0}" +
    ".ev-card-body{padding:1rem 1.15rem 1.2rem}" +
    ".ev-card-type{font-size:.7rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#7dd3fc;margin-bottom:.3rem}" +
    ".ev-card-title{margin:0 0 .35rem;font-size:1.1rem;font-weight:700;color:#fff;line-height:1.25}" +
    ".ev-card-dates{color:#94a3b8;font-size:.85rem;margin-bottom:.25rem}" +
    ".ev-card-meta{color:#64748b;font-size:.8rem}" +
    ".ev-empty{text-align:center;padding:3rem 1rem;color:#64748b;font-size:.95rem}" +
    ".ev-loading{text-align:center;padding:2rem;color:#94a3b8}";

  var DETAIL_STYLE =
    ".ev-details{margin-top:2.25rem;display:flex;flex-direction:column;gap:1.35rem}" +
    ".ev-detail{position:relative;overflow:hidden;background:linear-gradient(165deg,#152033 0%,#111827 55%,#0f1524 100%);border:1px solid rgba(56,189,248,.2);border-radius:16px;padding:1.4rem 1.5rem;box-shadow:0 6px 20px rgba(0,0,0,.22);scroll-margin-top:90px}" +
    ".ev-detail::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--accent-color,#38bdf8),#0ea5e9);pointer-events:none;z-index:1}" +
    ".ev-detail.ev-highlight{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.35),0 6px 20px rgba(0,0,0,.22)}" +
    ".ev-detail-head{display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap}" +
    ".ev-detail-poster{width:132px;height:88px;flex:0 0 auto;border-radius:10px;overflow:hidden;background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.08)}" +
    ".ev-detail-poster img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".ev-detail-main{flex:1 1 220px;min-width:0}" +
    ".ev-badge-inline{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#38bdf8,#7dd3fc);padding:.18rem .55rem;border-radius:999px;margin-bottom:.35rem}" +
    ".ev-detail-title{margin:0 0 .3rem;color:#7dd3fc;font-size:1.3rem;font-weight:700;line-height:1.25}" +
    ".ev-detail-date{color:#94a3b8;font-size:.88rem}" +
    ".ev-detail-desc{color:#cbd5e1;margin:.85rem 0 1rem;line-height:1.55;font-size:.95rem}" +
    ".ev-detail-note{color:#94a3b8;font-size:.82rem;margin:0 0 .9rem}" +
    ".ev-back{display:inline-block;margin-left:auto;color:#7dd3fc;font-size:.82rem;font-weight:700;text-decoration:none;align-self:center}" +
    ".ev-back:hover{color:#bae6fd}" +
    ".ev-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:1rem 0 1.15rem}" +
    ".ev-podium-item{text-align:center;background:rgba(15,23,42,.65);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:1rem .6rem}" +
    ".ev-podium-item.gold{border-color:rgba(251,191,36,.45);background:linear-gradient(180deg,rgba(251,191,36,.12),transparent)}" +
    ".ev-podium-item.silver{border-color:rgba(148,163,184,.4);background:linear-gradient(180deg,rgba(148,163,184,.1),transparent)}" +
    ".ev-podium-item.bronze{border-color:rgba(217,119,6,.4);background:linear-gradient(180deg,rgba(217,119,6,.1),transparent)}" +
    ".ev-medal{font-size:1.35rem;font-weight:800;margin-bottom:.35rem;color:#7dd3fc}" +
    ".ev-podium-item.gold .ev-medal{color:#fbbf24}" +
    ".ev-podium-item.silver .ev-medal{color:#cbd5e1}" +
    ".ev-podium-item.bronze .ev-medal{color:#f59e0b}" +
    ".ev-nick{color:#fff;font-weight:700;font-size:1rem;word-break:break-word}" +
    ".ev-team{color:#94a3b8;font-size:.82rem;margin-top:.2rem}" +
    ".ev-pts{color:#7dd3fc;font-size:.85rem;font-weight:700;margin-top:.3rem}";


  var DETAIL_STYLE_2 =
    ".ev-table-wrap{overflow-x:auto;margin-top:.5rem}" +
    ".ev-table{width:100%;border-collapse:collapse;font-size:.9rem}" +
    ".ev-table th{text-align:left;padding:.55rem .7rem;color:#94a3b8;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap}" +
    ".ev-table td{padding:.6rem .7rem;border-bottom:1px solid rgba(255,255,255,.04);color:#e2e8f0;white-space:nowrap}" +
    ".ev-table tr.gold td:first-child{color:#fbbf24}" +
    ".ev-table tr.silver td:first-child{color:#cbd5e1}" +
    ".ev-table tr.bronze td:first-child{color:#f59e0b}" +
    ".ev-disc{color:#f87171;text-decoration:line-through}" +
    ".ev-no-rank{color:#64748b;margin:.75rem 0 0;font-size:.9rem}" +
    ".ev-races{margin-top:1.1rem}" +
    ".ev-races summary{cursor:pointer;color:#7dd3fc;font-weight:700;font-size:.9rem;padding:.35rem 0}" +
    ".ev-races summary:hover{color:#bae6fd}" +
    ".ev-race{background:rgba(15,23,42,.5);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:.85rem 1rem;margin-top:.65rem}" +
    ".ev-race-title{font-weight:700;color:#fff}" +
    ".ev-race-date{color:#94a3b8;font-size:.82rem;margin-top:.15rem}" +
    ".ev-race ol{margin:.5rem 0 0;padding-left:1.2rem;color:#e2e8f0;font-size:.9rem;line-height:1.55}" +
    ".ev-status{display:inline-block;padding:.1rem .4rem;border-radius:5px;font-size:.7rem;font-weight:700;border:1px solid}" +
    "@media(max-width:600px){.ev-podium{grid-template-columns:1fr}.ev-detail{padding:1.15rem}.ev-detail-poster{width:100%;height:120px}}";

  function injectStyles() {
    if (document.getElementById("ev-unified-styles")) return;
    var st = document.createElement("style");
    st.id = "ev-unified-styles";
    st.textContent = STYLE + DETAIL_STYLE + DETAIL_STYLE_2;
    document.head.appendChild(st);
  }

  function statusColor(stato) {
    var colors = { FIN: "#34d399", DNF: "#fbbf24", DNS: "#94a3b8", DSQ: "#f87171", RET: "#fb923c" };
    return colors[stato] || "#94a3b8";
  }

  function groupBy(rows, field) {
    var out = {};
    (rows || []).forEach(function (r) {
      var k = String(r[field]);
      if (!out[k]) out[k] = [];
      out[k].push(r);
    });
    return out;
  }

  async function fetchSerie() {
    var res = await CVI.supabase
      .from("serie_aperte")
      .select("*")
      .eq("pubblicato", true)
      .order("data_inizio", { ascending: false, nullsFirst: false });
    return res.error ? [] : res.data || [];
  }

  async function fetchEventi() {
    var res = await CVI.supabase
      .from("eventi_aperti")
      .select("*")
      .eq("pubblicato", true)
      .order("data_evento", { ascending: false, nullsFirst: false });
    return res.error ? [] : res.data || [];
  }

  async function fetchDetails(serieList, eventiList) {
    var out = { regateBySerie: {}, risByReg: {}, risEventi: {} };
    var sb = CVI.supabase;
    try {
      if (serieList.length) {
        var regRes = await sb
          .from("serie_aperte_regate")
          .select("*")
          .in("serie_id", serieList.map(function (s) { return s.id; }))
          .order("ordine")
          .order("data_regata", { ascending: true, nullsFirst: false });
        var regate = regRes.data || [];
        out.regateBySerie = groupBy(regate, "serie_id");
        if (regate.length) {
          var risRes = await sb
            .from("serie_aperte_risultati")
            .select("*")
            .in("regata_id", regate.map(function (r) { return r.id; }));
          out.risByReg = groupBy(risRes.data || [], "regata_id");
        }
      }
    } catch (err) {
      console.warn("[CVI eventi] dettagli serie", err);
    }
    try {
      if (eventiList.length) {
        var evRes = await sb
          .from("eventi_aperti_risultati")
          .select("*")
          .in("evento_id", eventiList.map(function (e) { return e.id; }))
          .order("posizione");
        out.risEventi = groupBy(evRes.data || [], "evento_id");
      }
    } catch (err) {
      console.warn("[CVI eventi] dettagli eventi", err);
    }
    return out;
  }

  function serieClassifica(serie, details) {
    var lib = window.CVISerieAperte;
    var regate = details.regateBySerie[String(serie.id)] || [];
    var sistema = serie.sistema_punteggio === "high_point" ? "high_point" : "low_point";
    var scartiAuto = !!serie.scarti_auto;
    if (!lib || typeof lib.calcClassificaSerie !== "function") {
      return { regate: regate, classifica: [], sistema: sistema, scarti: 0, missingLib: true };
    }
    var forCl = regate.map(function (reg) {
      return {
        id: reg.id,
        titolo: reg.titolo,
        results: lib.calcPuntiRegata(details.risByReg[String(reg.id)] || [], sistema)
      };
    });
    return {
      regate: regate,
      classifica: lib.calcClassificaSerie(forCl, serie.scarti || 0, {
        sistema: sistema,
        scartiAuto: scartiAuto
      }),
      sistema: sistema,
      scartiAuto: scartiAuto,
      scarti: lib.calcolaNumScarti(serie.scarti || 0, scartiAuto, regate.length)
    };
  }

  function statusBadge(stato) {
    var c = statusColor(stato);
    return '<span class="ev-status" style="color:' + c + ";border-color:" + c + '50">' + esc(stato) + "</span>";
  }



  function renderPodium(rows, ptsFn) {
    if (!rows || !rows.length) return "";
    return (
      '<div class="ev-podium">' +
      rows
        .slice(0, 3)
        .map(function (r, i) {
          var pos = r.pos || i + 1;
          return (
            '<div class="ev-podium-item ' + medalClass(pos) + '">' +
            '<div class="ev-medal">' + pos + "°</div>" +
            '<div class="ev-nick">' + esc(r.nickname || "—") + "</div>" +
            (r.team ? '<div class="ev-team">' + esc(r.team) + "</div>" : "") +
            (ptsFn ? '<div class="ev-pts">' + ptsFn(r) + "</div>" : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function detailShell(item, badge, bodyHtml) {
    var dates =
      item.kind === "serie"
        ? fmtRange(item.start, item.end)
        : fmtDateTime(item.start);
    var poster = item.poster
      ? '<div class="ev-detail-poster"><img src="' + esc(item.poster) + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>'
      : "";
    return (
      '<article class="ev-detail" id="' + esc(item.anchor) + '" data-kind="' + item.kind + '" data-status="' + item.status + '">' +
      '<div class="ev-detail-head">' +
      poster +
      '<div class="ev-detail-main">' +
      '<span class="ev-badge-inline">' + esc(badge) + "</span>" +
      '<h2 class="ev-detail-title">' + esc(item.title) + "</h2>" +
      (dates ? '<div class="ev-detail-date">📅 ' + esc(dates) + "</div>" : "") +
      "</div>" +
      '<a class="ev-back" href="#eventi-filters">↑ ' + esc(tr("eventi_back_top", "Torna all’elenco")) + "</a>" +
      "</div>" +
      (item.description ? '<p class="ev-detail-desc">' + esc(item.description) + "</p>" : "") +
      bodyHtml +
      "</article>"
    );
  }

  function renderSerieBody(item, details) {
    var res = serieClassifica(item.raw, details);
    var regate = res.regate || [];
    var classifica = res.classifica || [];

    if (res.missingLib) {
      return '<p class="ev-no-rank">Motore classifiche non disponibile: ricarica la pagina.</p>';
    }

    var note =
      '<p class="ev-detail-note">' +
      (res.sistema === "high_point" ? "High Point" : "Low Point") +
      " · " +
      esc(tr("banner_discards", "scarti")) + ": " + res.scarti +
      (res.scartiAuto ? " (" + esc(tr("banner_automatic", "automatici")) + ")" : "") +
      " · " + regate.length + " " + esc(tr("banner_races", "regate")) +
      " · " + esc(tr("banner_series_note", "classifica aperta non ufficiale")) +
      "</p>";

    if (!classifica.length) {
      return note + '<p class="ev-no-rank">Classifica non ancora disponibile.</p>';
    }

    var table =
      '<div class="ev-table-wrap"><table class="ev-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th>';
    regate.forEach(function (_, i) {
      table += "<th>R" + (i + 1) + "</th>";
    });
    table += "<th>Totali</th><th>Netti</th></tr></thead><tbody>";
    classifica.forEach(function (r) {
      table += '<tr class="' + medalClass(r.pos) + '"><td><strong>' + r.pos + "</strong></td>";
      table += "<td>" + esc(r.nickname) + "</td><td>" + esc(r.team || "—") + "</td>";
      (r.punti || []).forEach(function (p, idx) {
        var disc = (r.scartiIdx || []).indexOf(idx) !== -1;
        table += disc ? '<td><span class="ev-disc" title="Scartato">' + p + "</span></td>" : "<td>" + p + "</td>";
      });
      table += "<td>" + r.totali + "</td><td><strong>" + r.netti + "</strong></td></tr>";
    });
    table += "</tbody></table></div>";

    var races = "";
    if (regate.length) {
      races =
        '<details class="ev-races"><summary>' +
        esc(tr("eventi_races_detail", "Regate della serie")) + " (" + regate.length + ")</summary>" +
        regate
          .map(function (reg) {
            var rows = (details.risByReg[String(reg.id)] || []).slice().sort(function (a, b) {
              return (Number(a.posizione) || 999) - (Number(b.posizione) || 999);
            });
            var winner = null;
            rows.forEach(function (r) {
              var t = r.tempo_ms != null ? Number(r.tempo_ms) : null;
              if (t && (winner == null || t < winner)) winner = t;
            });
            var list = rows.length
              ? "<ol>" +
                rows
                  .map(function (r) {
                    var tempo = "";
                    var t = r.tempo_ms != null ? Number(r.tempo_ms) : null;
                    if (t && window.CVISerieAperte && CVISerieAperte.formatMs) {
                      tempo = CVISerieAperte.formatMs(t);
                      if (winner && t > winner) tempo += " (+" + ((t - winner) / 1000).toFixed(1) + "s)";
                    }
                    return (
                      "<li>" + statusBadge(r.stato) + " " +
                      (r.posizione ? "<strong>" + esc(r.posizione) + "°</strong> " : "") +
                      esc(r.nickname) +
                      (r.team ? " (" + esc(r.team) + ")" : "") +
                      (tempo ? ' <span style="color:#64748b;font-family:ui-monospace,monospace;font-size:.82rem">' + esc(tempo) + "</span>" : "") +
                      "</li>"
                    );
                  })
                  .join("") +
                "</ol>"
              : '<p class="ev-no-rank">Risultati non ancora inseriti.</p>';
            return (
              '<div class="ev-race"><div class="ev-race-title">' + esc(reg.titolo) + "</div>" +
              (reg.data_regata ? '<div class="ev-race-date">📅 ' + esc(fmtDateTime(reg.data_regata)) + "</div>" : "") +
              list + "</div>"
            );
          })
          .join("") +
        "</details>";
    }

    return (
      note +
      renderPodium(classifica, function (r) { return r.netti + " pt"; }) +
      table +
      races
    );
  }

  function renderEventoBody(item, details) {
    var rows = (details.risEventi[String(item.raw.id)] || []).slice().sort(function (a, b) {
      return (Number(a.posizione) || 999) - (Number(b.posizione) || 999);
    });
    if (!rows.length) {
      return '<p class="ev-no-rank">Classifica non ancora inserita.</p>';
    }
    var podiumRows = rows.map(function (r) {
      return { nickname: r.nickname, team: r.team, pos: Number(r.posizione) || null };
    });
    var table =
      '<div class="ev-table-wrap"><table class="ev-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Note</th></tr></thead><tbody>' +
      rows
        .map(function (r) {
          var pos = Number(r.posizione) || 0;
          return (
            '<tr class="' + medalClass(pos) + '"><td><strong>' + esc(r.posizione || "—") + "</strong></td>" +
            "<td>" + esc(r.nickname) + "</td>" +
            "<td>" + esc(r.team || "—") + "</td>" +
            "<td>" + esc(r.note || "—") + "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>";
    return renderPodium(podiumRows) + table;
  }

  function cardHtml(item) {
    var badgeText =
      item.status === "in-corso" ? "IN CORSO" : item.status === "prossimo" ? "PROSSIMO" : "PASSATO";
    var typeLabel = item.kind === "serie"
      ? tr("eventi_type_serie", "Serie aperta")
      : tr("eventi_type_evento", "Evento aperto");
    var posterHtml = item.poster
      ? '<img src="' + esc(item.poster) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="ev-fallback" style="display:none">' + esc(item.title) + "</div>"
      : '<div class="ev-fallback">' + esc(item.title) + "</div>";
    return (
      '<a class="ev-card" href="#' + esc(item.anchor) + '" data-kind="' + item.kind + '" data-status="' + item.status + '">' +
      '<div class="ev-card-poster">' + posterHtml +
      '<span class="ev-badge ' + item.status + '">' + badgeText + "</span></div>" +
      '<div class="ev-card-body">' +
      '<div class="ev-card-type">' + esc(typeLabel) + "</div>" +
      '<h2 class="ev-card-title">' + esc(item.title) + "</h2>" +
      (item.dates ? '<div class="ev-card-dates">' + esc(item.dates) + "</div>" : "") +
      (item.meta ? '<div class="ev-card-meta">' + esc(item.meta) + "</div>" : "") +
      "</div></a>"
    );
  }

  function applyFilter(filter) {
    state.currentFilter = filter || "all";
    document.querySelectorAll(".ev-filter").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-filter") === state.currentFilter);
    });
    var visible = 0;
    state.items.forEach(function (item) {
      var show =
        state.currentFilter === "all" ||
        (state.currentFilter === "serie" && item.kind === "serie") ||
        (state.currentFilter === "evento" && item.kind === "evento") ||
        (state.currentFilter === item.status);
      [document.getElementById(item.anchor), document.querySelector('.ev-card[href="#' + item.anchor + '"]')].forEach(function (el) {
        if (el) el.style.display = show ? "" : "none";
      });
      if (show) visible++;
    });
    var empty = document.getElementById("eventi-empty");
    if (empty) {
      empty.style.display = visible ? "none" : "block";
      if (!visible) {
        empty.textContent =
          state.currentFilter === "prossimo"
            ? "Nessun evento in programma al momento."
            : state.currentFilter === "passato"
            ? "Ancora nessun evento passato."
            : "Nessun evento in questa sezione.";
      }
    }
  }

  function openFromHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return;
    var target = document.getElementById(hash);
    if (!target || (target.className || "").indexOf("ev-detail") < 0) return;
    target.classList.add("ev-highlight");
    setTimeout(function () {
      if (typeof target.scrollIntoView !== "function") return;
      try {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {
        try { target.scrollIntoView(); } catch (e2) {}
      }
    }, 60);
    setTimeout(function () { target.classList.remove("ev-highlight"); }, 2600);
  }

  async function load() {
    injectStyles();
    var container = document.getElementById("eventi-container");
    if (!container) return;

    if (!window.CVI || !CVI.supabase) {
      container.innerHTML = '<p class="ev-empty">Servizio non disponibile. Ricarica la pagina.</p>';
      return;
    }

    container.innerHTML =
      '<div class="ev-filters" id="eventi-filters">' +
      '<button type="button" class="ev-filter active" data-filter="all">' + esc(tr("eventi_filter_all", "Tutti")) + "</button>" +
      '<button type="button" class="ev-filter" data-filter="in-corso">' + esc(tr("eventi_filter_live", "In corso")) + "</button>" +
      '<button type="button" class="ev-filter" data-filter="prossimo">' + esc(tr("eventi_filter_next", "Prossimi")) + "</button>" +
      '<button type="button" class="ev-filter" data-filter="serie">' + esc(tr("eventi_filter_serie", "Serie")) + "</button>" +
      '<button type="button" class="ev-filter" data-filter="evento">' + esc(tr("eventi_filter_evento", "Eventi singoli")) + "</button>" +
      '<button type="button" class="ev-filter" data-filter="passato">' + esc(tr("eventi_filter_past", "Passati")) + "</button>" +
      "</div>" +
      '<div class="ev-loading" id="eventi-loading">Caricamento eventi…</div>' +
      '<div class="ev-grid" id="eventi-grid" style="display:none"></div>' +
      '<div class="ev-empty" id="eventi-empty" style="display:none"></div>' +
      '<div class="ev-details" id="eventi-details"></div>';

    document.getElementById("eventi-filters").addEventListener("click", function (e) {
      var btn = e.target.closest(".ev-filter");
      if (!btn) return;
      applyFilter(btn.getAttribute("data-filter"));
    });

    try {
      var results = await Promise.all([fetchSerie(), fetchEventi()]);
      var serieList = results[0] || [];
      var eventiList = results[1] || [];
      var items = [];

      serieList.forEach(function (s) {
        var item = {
          id: s.id, kind: "serie", anchor: "serie-" + s.id,
          title: s.titolo || "Serie aperta", description: s.descrizione || "",
          start: s.data_inizio, end: s.data_fine,
          dates: fmtRange(s.data_inizio, s.data_fine), meta: "",
          poster: s.poster || "",
          sortDate: s.data_inizio ? new Date(s.data_inizio).getTime() : 0,
          raw: s
        };
        item.status = deriveStatus(item);
        items.push(item);
      });
      eventiList.forEach(function (e) {
        var item = {
          id: e.id, kind: "evento", anchor: "evento-" + e.id,
          title: e.titolo || "Evento aperto", description: e.descrizione || "",
          start: e.data_evento, end: e.data_evento,
          dates: fmtDateTime(e.data_evento), meta: "",
          poster: e.poster || "",
          sortDate: e.data_evento ? new Date(e.data_evento).getTime() : 0,
          raw: e
        };
        item.status = deriveStatus(item);
        items.push(item);
      });


      var order = { "in-corso": 0, prossimo: 1, passato: 2 };
      items.sort(function (a, b) {
        var oa = order[a.status] != null ? order[a.status] : 9;
        var ob = order[b.status] != null ? order[b.status] : 9;
        if (oa !== ob) return oa - ob;
        if (a.status === "passato") return (b.sortDate || 0) - (a.sortDate || 0);
        return (a.sortDate || 0) - (b.sortDate || 0);
      });

      state.items = items;

      var loading = document.getElementById("eventi-loading");
      var grid = document.getElementById("eventi-grid");
      var detailsBox = document.getElementById("eventi-details");
      if (loading) loading.style.display = "none";
      if (grid) grid.style.display = "grid";

      if (!items.length) {
        if (grid) grid.style.display = "none";
        var empty = document.getElementById("eventi-empty");
        if (empty) {
          empty.style.display = "block";
          empty.textContent = "Nessun evento o serie pubblicato al momento.";
        }
        return;
      }

      var details = await fetchDetails(serieList, eventiList);
      var cardsHtml = "";
      var detailsHtml = "";
      items.forEach(function (item) {
        if (item.kind === "serie") {
          item.meta = tr("eventi_type_serie", "Serie aperta");
          cardsHtml += cardHtml(item);
          detailsHtml += detailShell(item, item.meta, renderSerieBody(item, details));
        } else {
          item.meta = tr("eventi_type_evento", "Evento aperto");
          cardsHtml += cardHtml(item);
          detailsHtml += detailShell(item, item.meta, renderEventoBody(item, details));
        }
      });

      if (grid) grid.innerHTML = cardsHtml;
      if (detailsBox) detailsBox.innerHTML = detailsHtml;

      applyFilter("all");
      openFromHash();
    } catch (err) {
      console.warn("[CVI eventi]", err);
      container.innerHTML = '<p class="ev-empty">Errore nel caricamento degli eventi.</p>';
    }
  }

  window.addEventListener("hashchange", openFromHash);

  function start() {
    if (window.CVI && typeof CVI.init === "function") {
      try { CVI.init("eventi.html"); } catch (e) { console.warn("[CVI eventi] init", e); }
    }
    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

