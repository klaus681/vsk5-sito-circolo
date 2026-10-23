/* CVI – podio classifica VSK del torneo in Home
   Mostrato solo se torneo pubblicato + vsk_mostra_home e con regate VSK. */
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
      return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0b0f19", label: "1°" };
    if (pos === 2)
      return { bg: "linear-gradient(135deg,#94a3b8,#64748b)", color: "#0b0f19", label: "2°" };
    if (pos === 3)
      return { bg: "linear-gradient(135deg,#d97706,#b45309)", color: "#fff", label: "3°" };
    return { bg: "rgba(56,189,248,.15)", color: "#7dd3fc", label: pos + "°" };
  }

  var STYLE =
    ".tv-home-section{margin:1.5rem 0 0}" +
    ".tv-home-card{background:var(--card-bg,#111827);border:1px solid rgba(251,191,36,.28);border-radius:14px;padding:1.2rem 1.4rem;box-shadow:0 8px 28px rgba(0,0,0,.28)}" +
    ".tv-home-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem}" +
    ".tv-badge{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#fbbf24,#f59e0b);padding:.22rem .65rem;border-radius:999px;margin-bottom:.4rem}" +
    ".tv-home-title{margin:0;color:#fff;font-size:1.2rem;font-weight:700;line-height:1.25}" +
    ".tv-home-date{color:#94a3b8;font-size:.86rem;margin-top:.25rem}" +
    ".tv-link-more{color:#fbbf24;font-weight:700;font-size:.9rem;white-space:nowrap;align-self:center}" +
    ".tv-link-more:hover{color:#fde68a}" +
    ".tv-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:.9rem 0 .5rem}" +
    ".tv-podium-item{background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.8rem .55rem;text-align:center}" +
    ".tv-podium-item.p1{border-color:rgba(251,191,36,.45);background:linear-gradient(180deg,rgba(251,191,36,.12),transparent)}" +
    ".tv-medal{width:2rem;height:2rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.82rem;margin-bottom:.4rem}" +
    ".tv-name{color:#fff;font-weight:700;font-size:.94rem;line-height:1.25;word-break:break-word}" +
    ".tv-team{color:#94a3b8;font-size:.76rem;margin-top:.15rem}" +
    ".tv-pts{color:#fbbf24;font-size:.82rem;font-weight:700;margin-top:.25rem}" +
    ".tv-home-note{margin:.45rem 0 0;font-size:.78rem;color:#64748b}" +
    "@media(max-width:600px){.tv-podium{grid-template-columns:1fr}}";

  function isHome() {
    var path = (location.pathname || "").toLowerCase();
    return (
      path === "/" ||
      path === "" ||
      path.indexOf("index") !== -1 ||
      (path.indexOf("vsk5-sito-circolo") !== -1 &&
        (path.endsWith("/") || path.endsWith("/vsk5-sito-circolo")))
    );
  }

  async function run() {
    if (!window.CVI || !CVI.supabase || !window.CVISerieAperte) return;
    if (!isHome()) return;
    if (document.getElementById("cvi-torneo-vsk-home")) return;

    var SA = window.CVISerieAperte;
    try {
      var tr = await CVI.supabase
        .from("tornei")
        .select(
          "id,titolo,descrizione,data_inizio,data_fine,vsk_sistema_punteggio,vsk_scarti,vsk_scarti_auto"
        )
        .eq("pubblicato", true)
        .eq("vsk_mostra_home", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (tr.error || !tr.data || !tr.data.length) return;
      var t = tr.data[0];

      var rr = await CVI.supabase
        .from("torneo_regate")
        .select("id,titolo,ordine,data_regata")
        .eq("torneo_id", t.id)
        .order("ordine")
        .order("data_regata", { ascending: true, nullsFirst: false });
      if (rr.error) return;
      var regs = rr.data || [];
      if (!regs.length) return;

      var rs = await CVI.supabase
        .from("torneo_risultati")
        .select("*")
        .in(
          "regata_id",
          regs.map(function (x) {
            return x.id;
          })
        );
      if (rs.error) return;

      var byReg = {};
      (rs.data || []).forEach(function (r) {
        var k = String(r.regata_id);
        if (!byReg[k]) byReg[k] = [];
        byReg[k].push(r);
      });

      var sistema = t.vsk_sistema_punteggio === "high_point" ? "high_point" : "low_point";
      var scartiAuto = !!t.vsk_scarti_auto;
      var scarti = t.vsk_scarti != null ? Number(t.vsk_scarti) : 0;

      var hasResults = false;
      var forCl = regs.map(function (reg) {
        var rows = byReg[String(reg.id)] || [];
        if (rows.length) hasResults = true;
        return { id: reg.id, titolo: reg.titolo, results: SA.calcPuntiRegata(rows, sistema) };
      });
      if (!hasResults) return;

      var cl = SA.calcClassificaSerie(forCl, scarti, { sistema: sistema, scartiAuto: scartiAuto });
      if (!cl.length) return;

      var lastRace = null;
      for (var i = forCl.length - 1; i >= 0; i--) {
        if ((forCl[i].results || []).length) {
          lastRace = regs[i];
          break;
        }
      }

      var top = cl.slice(0, 3);
      var podium =
        '<div class="tv-podium">' +
        top
          .map(function (r, idx) {
            var m = medal(idx + 1);
            return (
              '<div class="tv-podium-item' +
              (idx === 0 ? " p1" : "") +
              '"><div class="tv-medal" style="background:' +
              m.bg +
              ";color:" +
              m.color +
              '">' +
              m.label +
              '</div><div class="tv-name">' +
              esc(r.nickname) +
              "</div>" +
              (r.team ? '<div class="tv-team">' + esc(r.team) + "</div>" : "") +
              '<div class="tv-pts">' +
              r.netti +
              " pt</div></div>"
            );
          })
          .join("") +
        "</div>";

      var dates = [t.data_inizio, t.data_fine].filter(Boolean).map(function (d) {
        try {
          return new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
        } catch (e) {
          return String(d);
        }
      });

      var html =
        '<section id="cvi-torneo-vsk-home" class="tv-home-section">' +
        '<div class="tv-home-card">' +
        '<div class="tv-home-header"><div>' +
        '<span class="tv-badge">Torneo · classifica VSK</span>' +
        '<h2 class="tv-home-title">' +
        esc(t.titolo) +
        "</h2>" +
        (dates.length
          ? '<div class="tv-home-date">📅 ' + esc(dates.join(" → ")) + "</div>"
          : "") +
        "</div>" +
        '<a href="tornei.html?id=' +
        encodeURIComponent(t.id) +
        '" class="tv-link-more">Vedi il torneo →</a></div>' +
        (t.descrizione
          ? '<p style="color:#cbd5e1;font-size:.9rem;margin:0 0 .5rem;line-height:1.5">' +
            esc(String(t.descrizione).slice(0, 160)) +
            (String(t.descrizione).length > 160 ? "…" : "") +
            "</p>"
          : "") +
        podium +
        (lastRace
          ? '<p style="margin:.3rem 0 0;font-size:.85rem;color:#cbd5e1">Ultima regata: <strong style="color:#fbbf24">' +
            esc(lastRace.titolo) +
            "</strong></p>"
          : "") +
        '<p class="tv-home-note">' +
        (sistema === "high_point" ? "High Point" : "Low Point") +
        " · scarti: " +
        (cl[0].scartiUsati || 0) +
        (scartiAuto ? " (automatici)" : "") +
        " · " +
        regs.length +
        " regate VSK</p>" +
        "</div></section>";

      var main = document.getElementById("main-content") || document.querySelector("main.page-content");
      if (!main) return;
      if (!document.getElementById("tv-home-styles")) {
        var st = document.createElement("style");
        st.id = "tv-home-styles";
        st.textContent = STYLE;
        document.head.appendChild(st);
      }
      var anchor = main.querySelector(".content-row");
      if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
      else main.insertAdjacentHTML("beforeend", html);
    } catch (e) {
      if (window.console) console.warn("[CVI torneo vsk home]", e);
    }
  }

  function start() {
    setTimeout(run, 900);
    setTimeout(run, 2000);
    setTimeout(run, 3800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
