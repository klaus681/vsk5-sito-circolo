/* CVI – Pagina evento unificata (campionato/serie o evento singolo)
   Tab: INFO · PROGRAMMA · CLASSIFICA · PROTESTE */
(function () {
  "use strict";

  var E = window.CVIEventi;
  var esc = E.esc;
  var state = { model: null, tab: "info", timer: null };

  var STYLE =
    ".evp-wrap{max-width:1000px;margin:0 auto}" +
    ".evp-back{display:inline-block;margin:0 0 1.35rem;color:#94a3b8;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}" +
    ".evp-back:hover{color:#7dd3fc}" +
    ".evp-hero{display:flex;gap:1.75rem;align-items:flex-start;margin-bottom:1.5rem}" +
    ".evp-poster{width:178px;aspect-ratio:3/4;flex:0 0 auto;border-radius:6px;overflow:hidden;background:linear-gradient(145deg,#1e3a5f,#0f172a);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center}" +
    ".evp-poster img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".evp-poster span{padding:.75rem;text-align:center;color:rgba(255,255,255,.8);font-weight:800;font-size:.85rem;line-height:1.25;text-transform:uppercase;letter-spacing:.05em}" +
    ".evp-head{flex:1 1 260px;min-width:0}" +
    ".evp-eyebrow{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc;margin-bottom:.55rem}" +
    ".evp-sep{width:5px;height:5px;background:#38bdf8;display:inline-block;border-radius:1px}" +
    ".evp-status{font-size:.64rem;font-weight:800;letter-spacing:.06em;padding:.16rem .5rem;border-radius:4px}" +
    ".evp-status.in-corso{background:rgba(34,197,94,.14);color:#4ade80;border:1px solid rgba(34,197,94,.35)}" +
    ".evp-status.prossimo{background:rgba(56,189,248,.12);color:#7dd3fc;border:1px solid rgba(56,189,248,.35)}" +
    ".evp-status.passato{background:rgba(148,163,184,.12);color:#94a3b8;border:1px solid rgba(148,163,184,.25)}" +
    ".evp-title{margin:0 0 .55rem;font-size:clamp(1.8rem,4vw,2.45rem);line-height:1.08;font-weight:800;letter-spacing:.01em;color:#fff;text-transform:uppercase}" +
    ".evp-dates{color:#e2e8f0;font-size:.9rem;margin-bottom:.25rem}" +
    ".evp-meta{color:#64748b;font-size:.82rem;margin-bottom:1rem}" +
    ".evp-countdown-label{font-size:.64rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-bottom:.2rem}" +
    ".evp-countdown{font-size:clamp(1.9rem,5vw,2.9rem);font-weight:400;letter-spacing:.02em;color:#f1f5f9;line-height:1.05;margin-bottom:1rem;font-variant-numeric:tabular-nums}" +
    ".evp-notice{margin:0;color:#94a3b8;font-size:.84rem;line-height:1.55}" +
    ".evp-notice strong{color:#e2e8f0}" +
    ".evp-notice .evp-dot{display:inline-block;width:6px;height:6px;background:#38bdf8;border-radius:50%;margin-right:.45rem;vertical-align:1px}" +
    ".evp-tabs{display:flex;gap:.15rem;border-bottom:1px solid rgba(255,255,255,.1);margin:0 0 1.35rem;overflow-x:auto;scrollbar-width:none}" +
    ".evp-tabs::-webkit-scrollbar{display:none}" +
    ".evp-tab{appearance:none;background:none;border:0;border-bottom:2px solid transparent;color:#94a3b8;font-family:inherit;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:.7rem .95rem;cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s}" +
    ".evp-tab:hover{color:#e2e8f0}" +
    ".evp-tab[aria-selected=\"true\"]{color:#fff;border-bottom-color:#38bdf8}" +
    ".evp-panel{display:none}" +
    ".evp-panel.active{display:block}" +
    ".evp-section-title{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin:1.6rem 0 .65rem;display:flex;align-items:center;gap:.75rem}" +
    ".evp-section-title::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}" +
    ".evp-desc{color:#cbd5e1;line-height:1.65;font-size:.95rem;margin:0}" +
    ".evp-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;margin-top:.85rem}" +
    ".evp-fact{padding:.8rem .95rem;border-right:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);background:rgba(15,23,42,.35)}" +
    ".evp-fact-label{font-size:.6rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:.25rem}" +
    ".evp-fact-value{color:#e2e8f0;font-size:.9rem;font-weight:600;line-height:1.35}" +
    ".evp-empty{color:#64748b;font-size:.9rem;padding:.75rem 0}";

  var STYLE2 =
    ".evp-pools{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.85rem;margin:.85rem 0 0}" +
    ".evp-pool{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:.85rem .95rem;background:rgba(15,23,42,.35)}" +
    ".evp-pool-name{font-size:.7rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc;margin-bottom:.55rem}" +
    ".evp-pool-members{display:grid;grid-template-columns:1fr 1fr;gap:.2rem .85rem;font-size:.82rem;color:#cbd5e1}" +
    ".evp-pool-member{display:flex;align-items:center;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".evp-pool-member .ev-flag-empty{display:inline-block;width:1.45em;margin-right:.4em}" +
    ".evp-days{margin:.85rem 0 0;border-top:1px solid rgba(255,255,255,.06)}" +
    ".evp-day{display:flex;align-items:center;gap:1rem;padding:.72rem 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.85rem}" +
    ".evp-day-id{font-size:.68rem;font-weight:800;letter-spacing:.08em;color:#64748b;min-width:2rem}" +
    ".evp-day-date{color:#e2e8f0;flex:1 1 auto;min-width:0}" +
    ".evp-day-right{display:flex;align-items:center;gap:.6rem;color:#94a3b8;font-size:.78rem;white-space:nowrap}" +
    ".evp-pool-tag{font-size:.62rem;font-weight:800;letter-spacing:.06em;color:#7dd3fc}" +
    ".evp-table-wrap{overflow-x:auto;margin-top:.45rem}" +
    ".evp-table{width:100%;border-collapse:collapse;font-size:.86rem}" +
    ".evp-table th{text-align:left;padding:.55rem .6rem;color:#64748b;font-size:.62rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.1);white-space:nowrap}" +
    ".evp-table th.num,.evp-table td.num{text-align:center}" +
    ".evp-table td{padding:.6rem .6rem;border-bottom:1px solid rgba(255,255,255,.05);color:#e2e8f0;white-space:nowrap}" +
    ".evp-table tbody tr:hover{background:rgba(56,189,248,.04)}" +
    ".evp-table tr.gold td:first-child{color:#fbbf24}" +
    ".evp-table tr.silver td:first-child{color:#cbd5e1}" +
    ".evp-table tr.bronze td:first-child{color:#f59e0b}" +
    ".evp-rank{font-weight:800;color:#7dd3fc;min-width:1.5rem;display:inline-block}" +
    ".evp-nick{font-weight:600;color:#fff;display:inline-flex;align-items:center;gap:.1rem}" +
    ".evp-nick .cvi-flag-img{margin-right:.4em}" +
    ".evp-flag-empty{display:inline-block;width:1.45em;margin-right:.4em}" +
    ".ev-flag-empty{display:inline-block;width:1.45em;margin-right:.4em}" +
    ".evp-scartato{color:#f87171;text-decoration:line-through}" +
    ".evp-stato{font-size:.6rem;font-weight:800;letter-spacing:.04em;color:#94a3b8;margin-left:.25rem}" +
    ".evp-netto{font-weight:800;color:#fff}" +
    ".evp-legend{color:#64748b;font-size:.75rem;line-height:1.5;margin:.15rem 0 .85rem}" +
    ".evp-prot-box{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:1rem 1.1rem;background:rgba(15,23,42,.35);color:#94a3b8;font-size:.9rem;line-height:1.55}" +
    ".evp-btn{display:inline-block;margin-top:.85rem;background:#38bdf8;color:#0b0f19;font-weight:800;font-size:.82rem;padding:.55rem 1rem;border-radius:8px;text-decoration:none}" +
    ".evp-btn:hover{background:#7dd3fc}" +
    ".evp-error{max-width:640px;margin:3rem auto;text-align:center;color:#94a3b8}" +
    ".evp-error h1{color:#fff;font-size:1.5rem}" +
    "@media(max-width:640px){.evp-hero{flex-direction:column;gap:1.1rem}.evp-poster{width:132px}.evp-title{font-size:1.75rem}.evp-pool-members{grid-template-columns:1fr}.evp-day{flex-wrap:wrap;gap:.35rem 1rem}.evp-day-date{flex-basis:calc(100% - 3rem)}}";

  function injectStyles() {
    if (document.getElementById("evp-styles")) return;
    var st = document.createElement("style");
    st.id = "evp-styles";
    st.textContent = STYLE + STYLE2;
    document.head.appendChild(st);
  }


  async function fetchSerieDetail(id) {
    var sb = CVI.supabase;
    var r = await sb.from("serie_aperte").select("*").eq("id", id).eq("pubblicato", true).maybeSingle();
    if (r.error || !r.data) return null;
    var serie = r.data;

    var regRes = await sb
      .from("serie_aperte_regate")
      .select("*")
      .eq("serie_id", id)
      .order("ordine")
      .order("data_regata", { ascending: true, nullsFirst: false });
    var regate = regRes.data || [];
    var risultati = [];
    if (regate.length) {
      var risRes = await sb
        .from("serie_aperte_risultati")
        .select("*")
        .in("regata_id", regate.map(function (x) { return x.id; }));
      risultati = risRes.data || [];
    }

    var girRes = await sb.from("serie_aperte_gironi").select("*").eq("serie_id", id).order("ordine");
    var iscRes = await sb.from("serie_aperte_iscrizioni").select("*").eq("serie_id", id);

    return {
      serie: serie,
      regate: regate,
      risultati: risultati,
      gironi: girRes.error ? [] : girRes.data || [],
      iscrizioni: iscRes.error ? [] : iscRes.data || []
    };
  }

  async function fetchEventoDetail(id) {
    var sb = CVI.supabase;
    var r = await sb.from("eventi_aperti").select("*").eq("id", id).eq("pubblicato", true).maybeSingle();
    if (r.error || !r.data) return null;
    var ris = await sb
      .from("eventi_aperti_risultati")
      .select("*")
      .eq("evento_id", id)
      .order("posizione");
    return { evento: r.data, risultati: ris.data || [] };
  }

  function computeStandings(serie, regate, risultati) {
    var lib = window.CVISerieAperte;
    if (!lib || typeof lib.calcClassificaSerie !== "function") return null;
    var byReg = E.groupBy(risultati, "regata_id");
    var sistema = serie.sistema_punteggio === "high_point" ? "high_point" : "low_point";
    var scartiAuto = !!serie.scarti_auto;
    var forCl = regate.map(function (reg) {
      return {
        id: reg.id,
        titolo: reg.titolo,
        results: lib.calcPuntiRegata(byReg[String(reg.id)] || [], sistema)
      };
    });
    return {
      rows: lib.calcClassificaSerie(forCl, serie.scarti || 0, { sistema: sistema, scartiAuto: scartiAuto }),
      sistema: sistema,
      scartiAuto: scartiAuto,
      scarti: lib.calcolaNumScarti(serie.scarti || 0, scartiAuto, regate.length)
    };
  }

  function buildModel(detail, kind, flags, user) {
    var raw = kind === "serie" ? detail.serie : detail.evento;
    var isSerie = kind === "serie";
    var status = isSerie
      ? E.deriveStatus(raw.data_inizio, raw.data_fine)
      : E.deriveStatus(raw.data_evento, raw.data_evento);
    var days = isSerie ? E.buildDays(detail.regate) : [];
    var standings = isSerie ? computeStandings(raw, detail.regate, detail.risultati) : null;
    var iscrizioni = isSerie ? detail.iscrizioni || [] : [];
    var gironi = isSerie ? detail.gironi || [] : [];
    var poolByNick = {};
    var poolById = {};
    gironi.forEach(function (g) { poolById[String(g.id)] = g.nome || g.titolo || ""; });
    iscrizioni.forEach(function (i) {
      var name = poolById[String(i.girone_id)] || "";
      if (i.nickname && name) poolByNick[String(i.nickname).trim().toLowerCase()] = name;
    });

    var participants = isSerie
      ? (iscrizioni.length ? iscrizioni.length : (standings && standings.rows ? standings.rows.length : 0))
      : detail.risultati.length;

    var typeLabel = isSerie
      ? (raw.tipo_evento === "evento" ? "EVENTO" : "CAMPIONATO")
      : "EVENTO";

    var metaParts = [];
    if (isSerie) {
      if (detail.regate.length) metaParts.push(detail.regate.length + " regate");
      if (days.length) metaParts.push(days.length + " giornate");
    }
    if (raw.flotta) metaParts.push(raw.flotta);
    if (!isSerie && raw.formato) metaParts.unshift(raw.formato);

    var myPool = "";
    if (user && user.nickname) myPool = poolByNick[String(user.nickname).trim().toLowerCase()] || "";

    return {
      kind: kind,
      raw: raw,
      status: status,
      typeLabel: typeLabel,
      title: raw.titolo || (isSerie ? "Serie aperta" : "Evento aperto"),
      description: raw.descrizione || "",
      poster: raw.poster || "",
      start: isSerie ? raw.data_inizio : raw.data_evento,
      end: isSerie ? raw.data_fine : raw.data_evento,
      dates: isSerie ? E.fmtRange(raw.data_inizio, raw.data_fine) : E.fmtDateTime(raw.data_evento),
      metaParts: metaParts,
      regate: isSerie ? detail.regate : [],
      days: days,
      standings: standings,
      risultati: detail.risultati,
      gironi: gironi,
      iscrizioni: iscrizioni,
      poolByNick: poolByNick,
      myPool: myPool,
      participants: participants,
      flags: flags,
      user: user
    };
  }


  function nextTarget(m) {
    var now = Date.now();
    if (m.kind === "serie") {
      var future = m.regate
        .filter(function (r) { return r.data_regata && new Date(r.data_regata).getTime() > now; })
        .sort(function (a, b) { return new Date(a.data_regata).getTime() - new Date(b.data_regata).getTime(); });
      if (future.length) return { ts: new Date(future[0].data_regata).getTime(), label: "PROSSIMA GIORNATA TRA" };
      if (m.status === "prossimo" && m.start) {
        return { ts: new Date(m.start).getTime(), label: "INIZIO TRA" };
      }
      return null;
    }
    if (m.start && new Date(m.start).getTime() > now) {
      return { ts: new Date(m.start).getTime(), label: "INIZIO TRA" };
    }
    return null;
  }

  function noticeHtml(m, target) {
    if (m.myPool) {
      var extra = "";
      if (target && m.kind === "serie") {
        var d = m.regate.filter(function (r) { return r.data_regata && new Date(r.data_regata).getTime() === target.ts; })[0];
        if (d) extra = " La prossima giornata è " + E.fmtDateTime(d.data_regata) + ".";
      }
      return '<p class="evp-notice"><span class="evp-dot"></span>Sei iscritto. Regati in <strong>' + esc(m.myPool) + "</strong>." + esc(extra) + "</p>";
    }
    var raw = m.raw;
    var open = raw.iscrizioni_apertura ? E.fmtDateTime(raw.iscrizioni_apertura) : "";
    var close = raw.iscrizioni_chiusura ? E.fmtDateTime(raw.iscrizioni_chiusura) : "";
    if (open || close) {
      var txt = "Iscrizioni";
      if (open) txt += " dal " + open;
      if (close) txt += (open ? " al " : " fino al ") + close;
      return '<p class="evp-notice"><span class="evp-dot"></span>' + esc(txt) + ".</p>";
    }
    return '<p class="evp-notice"><span class="evp-dot"></span>Evento aperto anche ai non soci · classifica non ufficiale.</p>';
  }

  function heroHtml(m) {
    var poster = m.poster
      ? '<div class="evp-poster"><img src="' + esc(m.poster) + '" alt="Locandina di ' + esc(m.title) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span style="display:none">' + esc(m.title) + "</span></div>"
      : '<div class="evp-poster"><span>' + esc(m.title) + "</span></div>";
    var meta = m.metaParts.length ? '<div class="evp-meta">' + esc(m.metaParts.join(" · ")) + "</div>" : "";
    var target = nextTarget(m);
    var countdown = target
      ? '<div class="evp-countdown-label">' + esc(target.label) + '</div><div class="evp-countdown" id="evp-countdown" data-ts="' + target.ts + '">' + E.countdownText(target.ts - Date.now()) + "</div>"
      : "";
    return (
      '<div class="evp-hero">' + poster +
      '<div class="evp-head">' +
      '<div class="evp-eyebrow">' + esc(m.typeLabel) +
      '<span class="evp-sep"></span><span class="evp-status ' + m.status + '">' + esc(E.statusLabel(m.status)) + "</span></div>" +
      '<h1 class="evp-title">' + esc(m.title) + "</h1>" +
      (m.dates ? '<div class="evp-dates">' + esc(m.dates) + "</div>" : "") +
      meta +
      countdown +
      noticeHtml(m, target) +
      "</div></div>"
    );
  }

  function factsHtml(m) {
    var raw = m.raw;
    var facts = [];
    function add(label, value) {
      if (value == null || value === "" || value === "—") return;
      facts.push({ label: label, value: String(value) });
    }
    var derivedFormat = m.kind === "serie" && m.regate.length ? m.regate.length + " regate" : "";
    add("Formato", raw.formato || derivedFormat);
    add("Flotta", raw.flotta);
    add("Procedura di partenza", raw.procedura_partenza);
    if (raw.iscrizioni_apertura || raw.iscrizioni_chiusura) {
      add("Iscrizioni", E.fmtRange(raw.iscrizioni_apertura, raw.iscrizioni_chiusura) || E.fmtDateTime(raw.iscrizioni_apertura || raw.iscrizioni_chiusura));
    }
    var max = raw.max_iscritti != null && Number(raw.max_iscritti) > 0 ? Number(raw.max_iscritti) : null;
    add("Posti", m.participants || max ? m.participants + (max ? " / " + max : "") : "");
    if (m.kind === "serie") {
      add("Giornate", m.days.length || "");
      if (m.standings) {
        add("Sistema", (m.standings.sistema === "high_point" ? "High Point" : "Low Point") +
          " · " + E.tr("banner_discards", "scarti") + ": " + m.standings.scarti +
          (m.standings.scartiAuto ? " (" + E.tr("banner_automatic", "automatici") + ")" : ""));
      }
    } else {
      add("Partecipanti", m.risultati.length || "");
    }
    if (!facts.length) return "";
    return (
      '<div class="evp-facts">' +
      facts.map(function (f) {
        return '<div class="evp-fact"><div class="evp-fact-label">' + esc(f.label) + '</div><div class="evp-fact-value">' + esc(f.value) + "</div></div>";
      }).join("") +
      "</div>"
    );
  }

  function infoHtml(m) {
    return (
      '<h2 class="evp-section-title">Presentazione</h2>' +
      '<p class="evp-desc">' + (m.description ? esc(m.description) : "Nessuna descrizione disponibile.") + "</p>" +
      (factsHtml(m) ? '<h2 class="evp-section-title">Dettagli</h2>' + factsHtml(m) : "")
    );
  }


  function poolMembersHtml(m, poolId) {
    var members = m.iscrizioni
      .filter(function (i) { return String(i.girone_id) === String(poolId); })
      .map(function (i) { return i.nickname; })
      .filter(Boolean);
    if (!members.length) return '<p class="evp-empty">Nessun iscritto in questo girone.</p>';
    return (
      '<div class="evp-pool-members">' +
      members.map(function (nick) {
        return '<span class="evp-pool-member">' + E.flagHtml(nick, m.flags) + esc(nick) + "</span>";
      }).join("") +
      "</div>"
    );
  }

  function poolsHtml(m) {
    if (m.gironi.length) {
      var mine = m.myPool
        ? m.gironi.filter(function (g) { return (g.nome || g.titolo) === m.myPool; })
        : [];
      if (mine.length) {
        return (
          '<h2 class="evp-section-title">Il mio girone</h2>' +
          '<div class="evp-pools"><div class="evp-pool"><div class="evp-pool-name">' +
          esc(mine[0].nome || mine[0].titolo) + "</div>" + poolMembersHtml(m, mine[0].id) + "</div></div>"
        );
      }
      return (
        '<h2 class="evp-section-title">Gironi</h2>' +
        '<div class="evp-pools">' +
        m.gironi.map(function (g) {
          return '<div class="evp-pool"><div class="evp-pool-name">' + esc(g.nome || g.titolo) + "</div>" + poolMembersHtml(m, g.id) + "</div>";
        }).join("") +
        "</div>"
      );
    }
    if (m.iscrizioni.length) {
      var members = m.iscrizioni.map(function (i) { return i.nickname; }).filter(Boolean);
      return (
        '<h2 class="evp-section-title">Partecipanti</h2>' +
        '<div class="evp-pool"><div class="evp-pool-members">' +
        members.map(function (nick) {
          return '<span class="evp-pool-member">' + E.flagHtml(nick, m.flags) + esc(nick) + "</span>";
        }).join("") +
        "</div></div>"
      );
    }
    if (m.kind === "serie" && m.standings && m.standings.rows.length) {
      return (
        '<h2 class="evp-section-title">Partecipanti</h2>' +
        '<div class="evp-pool"><div class="evp-pool-members">' +
        m.standings.rows.map(function (r) {
          return '<span class="evp-pool-member">' + E.flagHtml(r.nickname, m.flags) + esc(r.nickname) + "</span>";
        }).join("") +
        "</div></div>"
      );
    }
    return "";
  }

  function scheduleHtml(m) {
    if (m.kind === "serie") {
      if (!m.days.length) return '<p class="evp-empty">Nessuna giornata programmata.</p>';
      var doneByReg = {};
      m.risultati.forEach(function (r) { doneByReg[String(r.regata_id)] = true; });
      return (
        '<h2 class="evp-section-title">Programma · il tuo fuso orario</h2>' +
        '<div class="evp-days">' +
        m.days.map(function (day) {
          var done = day.regate.filter(function (r) { return doneByReg[String(r.id)]; }).length;
          var total = day.regate.length;
          var status = done === 0 ? "Programmata" : done >= total ? "Disputata" : "In corso";
          var pools = [];
          day.regate.forEach(function (r) {
            if (r.girone_id) {
              var g = m.gironi.filter(function (x) { return String(x.id) === String(r.girone_id); })[0];
              if (g) {
                var name = g.nome || g.titolo;
                if (pools.indexOf(name) < 0) pools.push(name);
              }
            }
          });
          return (
            '<div class="evp-day">' +
            '<div class="evp-day-id">' + esc(day.label) + "</div>" +
            '<div class="evp-day-date">' + esc(E.fmtDateTime(day.date) || "Data da definire") + "</div>" +
            '<div class="evp-day-right">' +
            (pools.length ? '<span class="evp-pool-tag">' + esc(pools.join(" · ")) + "</span>" : "") +
            "<span>" + esc(status) + " · " + total + " regate</span></div>" +
            "</div>"
          );
        }).join("") +
        "</div>"
      );
    }
    if (!m.start) return '<p class="evp-empty">Nessuna data programmata.</p>';
    return (
      '<h2 class="evp-section-title">Programma · il tuo fuso orario</h2>' +
      '<div class="evp-days"><div class="evp-day">' +
      '<div class="evp-day-id">D1</div>' +
      '<div class="evp-day-date">' + esc(E.fmtDateTime(m.start)) + "</div>" +
      '<div class="evp-day-right"><span>Evento singolo</span></div></div></div>'
    );
  }

  function programmaHtml(m) {
    return poolsHtml(m) + scheduleHtml(m);
  }


  function classificaSerieHtml(m) {
    if (!m.standings) {
      return '<p class="evp-empty">Motore classifiche non disponibile: ricarica la pagina.</p>';
    }
    if (!m.standings.rows.length) {
      return '<p class="evp-empty">Classifica non ancora disponibile.</p>';
    }
    var showPool = m.gironi.length > 0;
    var legend =
      '<p class="evp-legend">Punteggio minimo per regata' +
      (showPool ? " all’interno del girone" : "") +
      ". I punteggi scartati sono barrati. Tra i gironi, per punti netti.</p>";

    var head = '<tr><th class="num">#</th><th>Velista</th>';
    if (showPool) head += "<th>Girone</th>";
    m.regate.forEach(function (reg) {
      head += '<th class="num" title="' + esc(reg.titolo || "") + '">' + esc(reg._colLabel || "") + "</th>";
    });
    head += '<th class="num">Netto</th></tr>';

    var body = m.standings.rows.map(function (r) {
      var pool = showPool ? (m.poolByNick[String(r.nickname || "").trim().toLowerCase()] || "—") : "";
      var cells = (r.punti || []).map(function (p, i) {
        var d = r.dettaglio ? r.dettaglio[i] : null;
        var stato = d && d.stato && d.stato !== "FIN" ? d.stato : "";
        var disc = (r.scartiIdx || []).indexOf(i) !== -1;
        return (
          '<td class="num"><span class="' + (disc ? "evp-scartato" : "") + '">' + esc(p) + "</span>" +
          (stato ? '<span class="evp-stato">' + esc(stato) + "</span>" : "") + "</td>"
        );
      }).join("");
      return (
        '<tr class="' + E.medalClass(r.pos) + '">' +
        '<td class="num"><span class="evp-rank">' + esc(r.pos) + "</span></td>" +
        '<td><span class="evp-nick">' + E.flagHtml(r.nickname, m.flags) + esc(r.nickname) + "</span></td>" +
        (showPool ? "<td>" + esc(pool) + "</td>" : "") +
        cells +
        '<td class="num"><span class="evp-netto">' + esc(r.netti) + "</span></td>" +
        "</tr>"
      );
    }).join("");

    return legend + '<div class="evp-table-wrap"><table class="evp-table"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>";
  }

  function classificaEventoHtml(m) {
    if (!m.risultati.length) return '<p class="evp-empty">Classifica non ancora inserita.</p>';
    var rows = m.risultati.slice().sort(function (a, b) {
      return (Number(a.posizione) || 999) - (Number(b.posizione) || 999);
    });
    var body = rows.map(function (r) {
      var pos = Number(r.posizione) || 0;
      return (
        '<tr class="' + E.medalClass(pos) + '">' +
        '<td class="num"><span class="evp-rank">' + esc(r.posizione || "—") + "</span></td>" +
        '<td><span class="evp-nick">' + E.flagHtml(r.nickname, m.flags) + esc(r.nickname) + "</span></td>" +
        "<td>" + esc(r.team || "—") + "</td>" +
        "<td>" + esc(r.note || "—") + "</td></tr>"
      );
    }).join("");
    return (
      '<div class="evp-table-wrap"><table class="evp-table"><thead><tr><th class="num">#</th><th>Velista</th><th>Team</th><th>Note</th></tr></thead><tbody>' +
      body + "</tbody></table></div>"
    );
  }

  function classificaHtml(m) {
    return m.kind === "serie" ? classificaSerieHtml(m) : classificaEventoHtml(m);
  }

  function protesteHtml(m) {
    if (m.raw.proteste_url) {
      return (
        '<h2 class="evp-section-title">Proteste</h2>' +
        '<div class="evp-prot-box">Le proteste di questo evento sono raccolte nella pagina dedicata.' +
        '<br><a class="evp-btn" href="' + esc(m.raw.proteste_url) + '" target="_blank" rel="noopener">Apri le proteste →</a></div>'
      );
    }
    return (
      '<h2 class="evp-section-title">Proteste</h2>' +
      '<div class="evp-prot-box">Nessuna protesta registrata per questo evento. Le proteste ufficiali del circolo restano nella pagina dedicata.' +
      '<br><a class="evp-btn" href="proteste.html">Vai a Proteste →</a></div>'
    );
  }


  var TABS = [
    { id: "info", label: "Info" },
    { id: "programma", label: "Programma" },
    { id: "classifica", label: "Classifica" },
    { id: "proteste", label: "Proteste" }
  ];

  function tabsHtml() {
    return (
      '<nav class="evp-tabs" role="tablist" aria-label="Sezioni evento">' +
      TABS.map(function (t) {
        return (
          '<button type="button" class="evp-tab" role="tab" id="tab-' + t.id + '" aria-controls="panel-' + t.id +
          '" aria-selected="false" data-tab="' + t.id + '">' + esc(t.label) + "</button>"
        );
      }).join("") +
      "</nav>"
    );
  }

  function activateTab(tab, updateHash) {
    var valid = TABS.some(function (t) { return t.id === tab; });
    if (!valid) tab = "info";
    state.tab = tab;
    document.querySelectorAll(".evp-tab").forEach(function (btn) {
      var on = btn.getAttribute("data-tab") === tab;
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    TABS.forEach(function (t) {
      var panel = document.getElementById("panel-" + t.id);
      if (panel) panel.classList.toggle("active", t.id === tab);
    });
    if (updateHash) {
      try { history.replaceState(null, "", "#" + tab); } catch (e) { location.hash = tab; }
    }
  }

  function startCountdown() {
    var el = document.getElementById("evp-countdown");
    if (!el) return;
    var ts = Number(el.getAttribute("data-ts"));
    if (!ts) return;
    function tick() {
      el.textContent = E.countdownText(ts - Date.now());
    }
    if (state.timer) clearInterval(state.timer);
    tick();
    state.timer = setInterval(tick, 1000);
  }

  function render(m) {
    var root = document.getElementById("event-detail");
    if (!root) return;
    root.innerHTML =
      '<a class="evp-back" href="eventi.html">← Tutti gli eventi</a>' +
      heroHtml(m) +
      tabsHtml() +
      '<section class="evp-panel" id="panel-info" role="tabpanel" aria-labelledby="tab-info">' + infoHtml(m) + "</section>" +
      '<section class="evp-panel" id="panel-programma" role="tabpanel" aria-labelledby="tab-programma">' + programmaHtml(m) + "</section>" +
      '<section class="evp-panel" id="panel-classifica" role="tabpanel" aria-labelledby="tab-classifica">' + classificaHtml(m) + "</section>" +
      '<section class="evp-panel" id="panel-proteste" role="tabpanel" aria-labelledby="tab-proteste">' + protesteHtml(m) + "</section>";

    document.querySelectorAll(".evp-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateTab(btn.getAttribute("data-tab"), true);
      });
    });

    var initial = (location.hash || "").replace(/^#/, "");
    activateTab(initial, false);
    startCountdown();
  }

  function errorHtml(title, text) {
    return (
      '<div class="evp-error"><h1>' + esc(title) + "</h1><p>" + esc(text) +
      '</p><p><a class="evp-back" href="eventi.html">← Torna agli eventi</a></p></div>'
    );
  }

  async function load() {
    injectStyles();
    var root = document.getElementById("event-detail");
    if (!root) return;

    var kind = E.qs("tipo");
    var id = E.qs("id");
    if ((kind !== "serie" && kind !== "evento") || !id) {
      root.innerHTML = errorHtml("Evento non trovato", "Il link non contiene un evento valido.");
      return;
    }
    if (!window.CVI || !CVI.supabase) {
      root.innerHTML = errorHtml("Evento non disponibile", "Servizio non disponibile. Ricarica la pagina.");
      return;
    }

    try {
      var detail = kind === "serie" ? await fetchSerieDetail(id) : await fetchEventoDetail(id);
      if (!detail) {
        root.innerHTML = errorHtml("Evento non trovato", "L’evento non esiste oppure non è pubblicato.");
        return;
      }
      var flags = await E.fetchFlags();
      var user = await E.currentUser();
      var m = buildModel(detail, kind, flags, user);
      render(m);
      document.title = m.title + " – CVI Virtual";
    } catch (err) {
      console.warn("[CVI evento]", err);
      root.innerHTML = errorHtml("Errore di caricamento", "Non è stato possibile caricare l’evento. Riprova più tardi.");
    }
  }

  function start() {
    if (window.CVI && typeof CVI.init === "function") {
      try { CVI.init("eventi.html"); } catch (e) { console.warn("[CVI evento] init", e); }
    }
    load();
  }

  window.addEventListener("hashchange", function () {
    if (document.getElementById("event-detail")) activateTab((location.hash || "").replace(/^#/, ""), false);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

