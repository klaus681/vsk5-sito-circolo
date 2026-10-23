/* CVI – box Serie Aperte in Home (podio, top 10 e ultima regata)
   Usa la libreria condivisa 2-serie-aperte-lib.js (caricata in index.html) */
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

  function medal(pos) {
    if (pos === 1)
      return {
        bg: "linear-gradient(135deg,#fbbf24,#f59e0b)",
        color: "#0b0f19",
        label: "1°"
      };
    if (pos === 2)
      return {
        bg: "linear-gradient(135deg,#94a3b8,#64748b)",
        color: "#0b0f19",
        label: "2°"
      };
    if (pos === 3)
      return {
        bg: "linear-gradient(135deg,#d97706,#b45309)",
        color: "#fff",
        label: "3°"
      };
    return { bg: "rgba(56,189,248,0.15)", color: "#7dd3fc", label: pos + "°" };
  }

  function dateRange(a, b) {
    try {
      var d1 = a
        ? new Date(a).toLocaleDateString("it-IT", { day: "numeric", month: "short" })
        : "";
      var d2 = b
        ? new Date(b).toLocaleDateString("it-IT", {
            day: "numeric",
            month: "short",
            year: "numeric"
          })
        : "";
      return d1 && d2 ? d1 + " – " + d2 : d1 || d2;
    } catch (e) {
      return "";
    }
  }

  var STYLE =
    ".sa-home-section{margin:1.5rem 0 0}" +
    ".sa-home-card{background:var(--card-bg,#111827);border:1px solid rgba(56,189,248,.28);border-radius:14px;padding:1.35rem 1.5rem;box-shadow:0 8px 28px rgba(0,0,0,.28),0 0 0 1px rgba(56,189,248,.06)}" +
    ".sa-home-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:.85rem}" +
    ".sa-badge{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#38bdf8,#7dd3fc);padding:.22rem .65rem;border-radius:999px;margin-bottom:.4rem}" +
    ".sa-home-title{margin:0;color:#fff;font-size:1.28rem;font-weight:700;line-height:1.25}" +
    ".sa-home-date{color:#94a3b8;font-size:.88rem;margin-top:.3rem}" +
    ".sa-link-more{color:#7dd3fc;font-weight:700;font-size:.9rem;white-space:nowrap;align-self:center}" +
    ".sa-link-more:hover{color:#bae6fd}" +
    ".sa-home-desc{color:#cbd5e1;font-size:.92rem;margin:0 0 1rem;line-height:1.5}" +
    ".sa-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:0 0 1rem}" +
    ".sa-podium-item{background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.85rem .6rem;text-align:center}" +
    ".sa-podium-item.p1{border-color:rgba(251,191,36,.45);background:linear-gradient(180deg,rgba(251,191,36,.12),transparent)}" +
    ".sa-medal{width:2.1rem;height:2.1rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;margin-bottom:.45rem;box-shadow:0 4px 12px rgba(0,0,0,.25)}" +
    ".sa-podium-name{color:#fff;font-weight:700;font-size:.95rem;line-height:1.25;word-break:break-word}" +
    ".sa-podium-team{color:#94a3b8;font-size:.78rem;margin-top:.2rem}" +
    ".sa-podium-pts{color:#7dd3fc;font-size:.82rem;font-weight:700;margin-top:.25rem}" +
    ".sa-rest-list{list-style:none;padding:0;margin:0 0 .75rem;display:flex;flex-direction:column;gap:.35rem}" +
    ".sa-rest-list li{display:flex;align-items:baseline;gap:.4rem;font-size:.9rem;color:#e2e8f0;padding:.25rem 0;border-bottom:1px solid rgba(255,255,255,.04)}" +
    ".sa-rest-list li:last-child{border-bottom:0}" +
    ".sa-pos{color:#7dd3fc;font-weight:700;min-width:1.4rem}" +
    ".sa-team{color:#94a3b8;font-size:.85rem}" +
    ".sa-gare{color:#64748b;font-size:.78rem}" +
    ".sa-pts{color:#94a3b8;font-size:.82rem;margin-left:auto}" +
    ".sa-last{margin:.35rem 0 0;font-size:.85rem;color:#cbd5e1}" +
    ".sa-last strong{color:#7dd3fc}" +
    ".sa-home-note{margin:.5rem 0 0;font-size:.78rem;color:#64748b}" +
    "@media(max-width:600px){.sa-podium{grid-template-columns:1fr;gap:.5rem}.sa-home-card{padding:1.1rem}}";

  async function run() {
    if (!window.CVI || !CVI.supabase) return;
    if (!window.CVISerieAperte) return;
    if (document.getElementById("cvi-serie-aperte-home")) return;

    var path = (location.pathname || "").toLowerCase();
    var isHome =
      path === "/" ||
      path === "" ||
      path.indexOf("index") !== -1 ||
      (path.indexOf("vsk5-sito-circolo") !== -1 &&
        (path.endsWith("/") || path.endsWith("/vsk5-sito-circolo")));
    if (!isHome) return;

    var SA = window.CVISerieAperte;

    try {
      var res = await CVI.supabase
        .from("serie_aperte")
        .select(
          "id,titolo,descrizione,scarti,scarti_auto,sistema_punteggio,data_inizio,data_fine"
        )
        .eq("pubblicato", true)
        .eq("mostra_home", true)
        .order("data_inizio", { ascending: false, nullsFirst: false })
        .limit(1);

      if (res.error || !res.data || !res.data.length) return;
      var serie = res.data[0];
      var sistema =
        serie.sistema_punteggio === "high_point" ? "high_point" : "low_point";
      var scartiAuto = !!serie.scarti_auto;

      var regRes = await CVI.supabase
        .from("serie_aperte_regate")
        .select("id,titolo,ordine,data_regata")
        .eq("serie_id", serie.id)
        .order("ordine")
        .order("data_regata", { ascending: true, nullsFirst: false });

      var regate = regRes.data || [];
      if (!regate.length) return;

      var regIds = regate.map(function (r) {
        return r.id;
      });
      var risRes = await CVI.supabase
        .from("serie_aperte_risultati")
        .select("*")
        .in("regata_id", regIds);

      var byReg = {};
      (risRes.data || []).forEach(function (r) {
        var k = String(r.regata_id);
        if (!byReg[k]) byReg[k] = [];
        byReg[k].push(r);
      });

      var hasResults = false;
      var forCl = regate.map(function (reg) {
        var rows = byReg[String(reg.id)] || [];
        if (rows.length) hasResults = true;
        return {
          id: reg.id,
          titolo: reg.titolo,
          results: SA.calcPuntiRegata(rows, sistema)
        };
      });
      if (!hasResults) return;

      var classifica = SA.calcClassificaSerie(forCl, serie.scarti || 0, {
        sistema: sistema,
        scartiAuto: scartiAuto
      });
      if (!classifica.length) return;

      var scartiN = classifica[0].scartiUsati || 0;
      var lastRace = null;
      var lastWinner = null;
      for (var i = forCl.length - 1; i >= 0; i--) {
        var rr = forCl[i].results || [];
        if (!rr.length) continue;
        lastRace = regate[i];
        var fin = rr
          .filter(function (x) {
            return x.stato === "FIN" && x.posizione;
          })
          .sort(function (a, b) {
            return a.posizione - b.posizione;
          });
        if (fin.length) lastWinner = fin[0].nickname;
        break;
      }

      var top = classifica.slice(0, 3);
      var rest = classifica.slice(3, 10);

      var podiumHtml =
        '<div class="sa-podium">' +
        top
          .map(function (r, idx) {
            var m = medal(idx + 1);
            return (
              '<div class="sa-podium-item' +
              (idx === 0 ? " p1" : "") +
              '">' +
              '<div class="sa-medal" style="background:' +
              m.bg +
              ";color:" +
              m.color +
              '">' +
              m.label +
              "</div>" +
              '<div class="sa-podium-name">' +
              esc(r.nickname) +
              "</div>" +
              (r.team ? '<div class="sa-podium-team">' + esc(r.team) + "</div>" : "") +
              '<div class="sa-podium-pts">' +
              r.netti +
              " pt \u00b7 " +
              r.gare +
              " gare</div>" +
              "</div>"
            );
          })
          .join("") +
        "</div>";

      var restHtml = "";
      if (rest.length) {
        restHtml =
          '<ol class="sa-rest-list">' +
          rest
            .map(function (r, idx) {
              return (
                "<li>" +
                '<span class="sa-pos">' +
                (idx + 4) +
                ".</span> " +
                "<strong>" +
                esc(r.nickname) +
                "</strong>" +
                (r.team ? ' <span class="sa-team">(' + esc(r.team) + ")</span>" : "") +
                ' <span class="sa-gare">' + r.gare + " gare</span>" +
                ' <span class="sa-pts">' +
                r.netti +
                " pt</span>" +
                "</li>"
              );
            })
            .join("") +
          "</ol>";
      }

      var lastHtml =
        lastRace && lastWinner
          ? '<p class="sa-last">\ud83c\udfc1 Ultima regata: <strong>' +
            esc(lastRace.titolo) +
            "</strong> \u00b7 vince <strong>" +
            esc(lastWinner) +
            "</strong></p>"
          : "";

      var dr = dateRange(serie.data_inizio, serie.data_fine);

      var html =
        '<section id="cvi-serie-aperte-home" class="sa-home-section">' +
        '<div class="sa-home-card">' +
        '<div class="sa-home-header">' +
        "<div>" +
        '<span class="sa-badge">Serie Aperta</span>' +
        '<h2 class="sa-home-title">' +
        esc(serie.titolo) +
        "</h2>" +
        (dr ? '<div class="sa-home-date">\ud83d\udcc5 ' + esc(dr) + "</div>" : "") +
        "</div>" +
        '<a href="eventi-aperti.html" class="sa-link-more">Classifica completa \u2192</a>' +
        "</div>" +
        (serie.descrizione ? '<p class="sa-home-desc">' + esc(serie.descrizione) + "</p>" : "") +
        podiumHtml +
        restHtml +
        lastHtml +
        '<p class="sa-home-note">' +
        (sistema === "high_point" ? "High Point" : "Low Point") +
        " \u00b7 scarti: " +
        scartiN +
        (scartiAuto ? " (automatici)" : "") +
        " \u00b7 " +
        regate.length +
        " regate \u00b7 classifica aperta non ufficiale</p>" +
        "</div>" +
        "</section>";

      var main =
        document.getElementById("main-content") ||
        document.querySelector("main.page-content");
      if (!main) return;

      if (!document.getElementById("sa-home-styles")) {
        var st = document.createElement("style");
        st.id = "sa-home-styles";
        st.textContent = STYLE;
        document.head.appendChild(st);
      }

      var anchor = main.querySelector(".content-row");
      if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
      else main.insertAdjacentHTML("beforeend", html);
    } catch (err) {
      console.warn("[CVI serie aperte home]", err);
    }
  }

  function start() {
    setTimeout(run, 700);
    setTimeout(run, 1800);
    setTimeout(run, 3500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
