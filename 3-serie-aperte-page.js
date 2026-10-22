/* CVI – pagina pubblica Serie Aperte (usa serie-aperte-lib.js) */
(function () {
  "use strict";
  function medalClass(pos) {
    if (pos === 1) return "gold";
    if (pos === 2) return "silver";
    if (pos === 3) return "bronze";
    return "";
  }
  function statusBadge(stato, esc) {
    var colors = { FIN: "#34d399", DNF: "#fbbf24", DNS: "#94a3b8", DSQ: "#f87171", RET: "#fb923c" };
    var c = colors[stato] || "#94a3b8";
    return '<span style="display:inline-block;padding:0.1rem 0.4rem;border-radius:5px;font-size:0.7rem;font-weight:700;color:' + c + ";border:1px solid " + c + '50">' + esc(stato) + "</span>";
  }
  function fmt(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return String(iso); }
  }
  async function load() {
    var box = document.getElementById("eventi-aperti-container");
    if (!box || !window.CVI || !CVI.supabase || !window.CVISerieAperte) return;
    var esc = CVISerieAperte.esc;
    var calcPunti = CVISerieAperte.calcPuntiRegata;
    var calcCl = CVISerieAperte.calcClassificaSerie;
    box.innerHTML = '<p class="ea-loading">Caricamento…</p>';
    try {
      var res = await CVI.supabase.from("serie_aperte").select("*").eq("pubblicato", true).order("data_inizio", { ascending: false, nullsFirst: false });
      if (res.error) throw res.error;
      var serieList = res.data || [];
      var oldRes = await CVI.supabase.from("eventi_aperti").select("*").eq("pubblicato", true).order("data_evento", { ascending: false, nullsFirst: false });
      var oldEventi = oldRes.error ? [] : oldRes.data || [];
      if (!serieList.length && !oldEventi.length) {
        box.innerHTML = '<p class="ea-empty-msg">Nessuna serie aperta o evento pubblicato al momento.</p>';
        return;
      }
      var htmlParts = [];
      if (serieList.length) {
        var serieIds = serieList.map(function (s) { return s.id; });
        var regRes = await CVI.supabase.from("serie_aperte_regate").select("*").in("serie_id", serieIds).order("ordine").order("data_regata", { ascending: true, nullsFirst: false });
        var bySerieReg = {};
        (regRes.data || []).forEach(function (r) {
          var k = String(r.serie_id);
          if (!bySerieReg[k]) bySerieReg[k] = [];
          bySerieReg[k].push(r);
        });
        var allRegIds = (regRes.data || []).map(function (r) { return r.id; });
        var risRes = { data: [] };
        if (allRegIds.length) risRes = await CVI.supabase.from("serie_aperte_risultati").select("*").in("regata_id", allRegIds);
        var byReg = {};
        (risRes.data || []).forEach(function (r) {
          var k = String(r.regata_id);
          if (!byReg[k]) byReg[k] = [];
          byReg[k].push(r);
        });
        serieList.forEach(function (serie) {
          var regate = bySerieReg[String(serie.id)] || [];
          var forCl = regate.map(function (reg) {
            return { id: reg.id, titolo: reg.titolo, results: calcPunti(byReg[String(reg.id)] || []) };
          });
          var classifica = calcCl(forCl, serie.scarti || 0);
          var top = classifica.slice(0, 3);
          var podium = "";
          if (top.length) {
            podium = '<div class="ea-page-podium">' + top.map(function (r, i) {
              var cls = medalClass(i + 1);
              return '<div class="ea-page-podium-item ' + cls + '"><div class="ea-page-medal">' + (i + 1) + '°</div><div class="ea-page-nick">' + esc(r.nickname) + "</div>" + (r.team ? '<div class="ea-page-team">' + esc(r.team) + "</div>" : "") + '<div class="ea-page-pts">' + r.netti + " pt</div></div>";
            }).join("") + "</div>";
          }
          var table = "";
          if (classifica.length) {
            table = '<div class="ea-table-wrap"><table class="ea-results-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Netti</th><th>Totali</th></tr></thead><tbody>' +
              classifica.map(function (r, i) {
                return '<tr class="' + medalClass(i + 1) + '"><td><strong>' + (i + 1) + "</strong></td><td>" + esc(r.nickname) + "</td><td>" + esc(r.team || "—") + "</td><td><strong>" + r.netti + "</strong></td><td>" + r.totali + "</td></tr>";
              }).join("") + "</tbody></table></div>";
          }
          var regateHtml = "";
          if (regate.length) {
            regateHtml = '<div style="margin-top:1.25rem"><h3 style="margin:0 0 0.75rem;color:#94a3b8;font-size:0.95rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em">Regate della serie</h3>' +
              regate.map(function (reg) {
                var rows = calcPunti(byReg[String(reg.id)] || []);
                rows.sort(function (a, b) {
                  if (a.stato === "FIN" && b.stato === "FIN") return (a.posizione || 99) - (b.posizione || 99);
                  if (a.stato === "FIN") return -1;
                  if (b.stato === "FIN") return 1;
                  return String(a.nickname).localeCompare(String(b.nickname), "it");
                });
                var list = rows.length === 0
                  ? '<p style="color:#64748b;margin:0.4rem 0 0;font-size:0.88rem">Risultati non ancora inseriti</p>'
                  : '<ol style="margin:0.5rem 0 0;padding-left:1.2rem;color:#e2e8f0;font-size:0.9rem;line-height:1.55">' +
                    rows.map(function (r) {
                      return "<li>" + statusBadge(r.stato, esc) + " " + (r.stato === "FIN" ? "<strong>" + esc(r.posizione) + "°</strong> " : "") + esc(r.nickname) + (r.team ? " (" + esc(r.team) + ")" : "") + ' <span style="color:#94a3b8">(' + r.punti + " pt)</span></li>";
                    }).join("") + "</ol>";
                return '<div style="background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.65rem"><div style="font-weight:700;color:#fff">' + esc(reg.titolo) + "</div>" + (reg.data_regata ? '<div style="color:#94a3b8;font-size:0.82rem;margin-top:0.15rem">📅 ' + esc(fmt(reg.data_regata)) + "</div>" : "") + list + "</div>";
              }).join("") + "</div>";
          }
          htmlParts.push('<article class="ea-event-card"><div class="ea-event-head"><div><span class="sa-badge-inline">Serie Aperta</span><h2 class="ea-event-title">' + esc(serie.titolo) + "</h2></div></div>" + (serie.descrizione ? '<p class="ea-event-desc">' + esc(serie.descrizione) + "</p>" : "") + '<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 0.75rem">Sistema Low Point' + (serie.scarti > 0 ? " · scarti: " + serie.scarti : "") + "</p>" + podium + table + regateHtml + "</article>");
        });
      }
      if (oldEventi.length) {
        var oldIds = oldEventi.map(function (e) { return e.id; });
        var oldRis = await CVI.supabase.from("eventi_aperti_risultati").select("*").in("evento_id", oldIds).order("posizione");
        var byOld = {};
        (oldRis.data || []).forEach(function (r) {
          var k = String(r.evento_id);
          if (!byOld[k]) byOld[k] = [];
          byOld[k].push(r);
        });
        oldEventi.forEach(function (e) {
          var rows = byOld[String(e.id)] || [];
          var top = rows.slice(0, 3);
          var podium = top.length ? '<div class="ea-page-podium">' + top.map(function (r) {
            var cls = medalClass(Number(r.posizione) || 0);
            return '<div class="ea-page-podium-item ' + cls + '"><div class="ea-page-medal">' + esc(r.posizione) + '°</div><div class="ea-page-nick">' + esc(r.nickname) + "</div>" + (r.team ? '<div class="ea-page-team">' + esc(r.team) + "</div>" : "") + "</div>";
          }).join("") + "</div>" : "";
          var table = rows.length ? '<div class="ea-table-wrap"><table class="ea-results-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Note</th></tr></thead><tbody>' + rows.map(function (r) {
            return '<tr class="' + medalClass(Number(r.posizione) || 0) + '"><td><strong>' + esc(r.posizione) + "</strong></td><td>" + esc(r.nickname) + "</td><td>" + esc(r.team || "—") + "</td><td>" + esc(r.note || "—") + "</td></tr>";
          }).join("") + "</tbody></table></div>" : "";
          htmlParts.push('<article class="ea-event-card"><div class="ea-event-head"><div><h2 class="ea-event-title">' + esc(e.titolo) + "</h2>" + (e.data_evento ? '<div class="ea-event-date">📅 ' + esc(fmt(e.data_evento)) + "</div>" : "") + "</div></div>" + (e.descrizione ? '<p class="ea-event-desc">' + esc(e.descrizione) + "</p>" : "") + podium + table + "</article>");
        });
      }
      var styles = "<style>.ea-loading,.ea-empty-msg{color:#94a3b8;text-align:center;padding:2rem 1rem}.ea-event-card{position:relative;overflow:hidden;background:linear-gradient(165deg,#152033 0%,#111827 55%,#0f1524 100%);border:1px solid rgba(56,189,248,.2);border-radius:16px;padding:1.4rem 1.5rem;margin-bottom:1.35rem;box-shadow:0 6px 20px rgba(0,0,0,.22)}.ea-event-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--accent-color,#38bdf8),#0ea5e9)}.ea-event-title{margin:0 0 .3rem;color:#7dd3fc;font-size:1.25rem;font-weight:700}.ea-event-date{color:#94a3b8;font-size:.88rem}.ea-event-desc{color:#cbd5e1;margin:.75rem 0 1rem;line-height:1.55;font-size:.95rem}.sa-badge-inline{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#38bdf8,#7dd3fc);padding:.18rem .55rem;border-radius:999px;margin-bottom:.35rem}.ea-page-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:1rem 0 1.15rem}.ea-page-podium-item{text-align:center;background:rgba(15,23,42,.65);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:1rem .6rem}.ea-page-podium-item.gold{border-color:rgba(251,191,36,.45);background:linear-gradient(180deg,rgba(251,191,36,.12),transparent)}.ea-page-podium-item.silver{border-color:rgba(148,163,184,.4)}.ea-page-podium-item.bronze{border-color:rgba(217,119,6,.4)}.ea-page-medal{font-size:1.35rem;font-weight:800;margin-bottom:.35rem;color:#7dd3fc}.ea-page-podium-item.gold .ea-page-medal{color:#fbbf24}.ea-page-podium-item.silver .ea-page-medal{color:#cbd5e1}.ea-page-podium-item.bronze .ea-page-medal{color:#f59e0b}.ea-page-nick{color:#fff;font-weight:700;font-size:1rem}.ea-page-team{color:#94a3b8;font-size:.82rem;margin-top:.2rem}.ea-page-pts{color:#7dd3fc;font-size:.85rem;font-weight:700;margin-top:.3rem}.ea-table-wrap{overflow-x:auto;margin-top:.5rem}.ea-results-table{width:100%;border-collapse:collapse;font-size:.9rem}.ea-results-table th{text-align:left;padding:.55rem .7rem;color:#94a3b8;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid rgba(255,255,255,.08)}.ea-results-table td{padding:.6rem .7rem;border-bottom:1px solid rgba(255,255,255,.04);color:#e2e8f0}.ea-results-table tr.gold td:first-child{color:#fbbf24}.ea-results-table tr.silver td:first-child{color:#cbd5e1}.ea-results-table tr.bronze td:first-child{color:#f59e0b}@media(max-width:600px){.ea-page-podium{grid-template-columns:1fr}}</style>";
      if (!document.getElementById("ea-page-styles")) {
        var st = document.createElement("div");
        st.id = "ea-page-styles";
        st.innerHTML = styles;
        document.head.appendChild(st.firstChild || st);
      }
      box.innerHTML = htmlParts.join("") || '<p class="ea-empty-msg">Nessun contenuto pubblicato.</p>';
    } catch (e) {
      box.innerHTML = '<p style="color:#f87171;text-align:center;padding:1.5rem">' + (window.CVISerieAperte ? CVISerieAperte.esc(e.message || e) : String(e)) + "</p>";
    }
  }
  if (typeof CVI !== "undefined" && CVI.init) CVI.init("eventi-aperti.html");
  load();
})();
