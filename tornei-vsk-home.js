/* CVI – podio classifica VSK del torneo in Home
   Mostrato solo se torneo pubblicato + vsk_mostra_home e con regate VSK. */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }

  function tr(key, fallback) {
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : fallback;
  }

  function locale() {
    return window.CVI && typeof CVI.locale === "function" ? CVI.locale() : "it-IT";
  }

  function deriveStatus(startIso, endIso) {
    var now = Date.now();
    function parseEnd(iso) {
      if (!iso) return null;
      var d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        return d.getTime() + 24 * 60 * 60 * 1000 - 1;
      }
      return d.getTime();
    }
    function parseStart(iso) {
      if (!iso) return null;
      var d = new Date(iso);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    var start = parseStart(startIso);
    var end = parseEnd(endIso || startIso);
    if (end != null && now > end) return "passato";
    if (start != null && now < start) return "prossimo";
    return "aperto";
  }

  function statusBadge(status) {
    var label, bg, color, border;
    if (status === "passato") {
      label = tr("banner_past", "PASSATO");
      bg = "rgba(148,163,184,0.25)"; color = "#94a3b8"; border = "rgba(148,163,184,0.4)";
    } else if (status === "prossimo") {
      label = tr("banner_soon", "PROSSIMO");
      bg = "rgba(56,189,248,0.25)"; color = "#7dd3fc"; border = "rgba(56,189,248,0.4)";
    } else {
      label = tr("banner_open", "APERTO");
      bg = "rgba(34,197,94,0.25)"; color = "#4ade80"; border = "rgba(34,197,94,0.4)";
    }
    return (
      '<span style="display:inline-block;font-size:0.68rem;font-weight:800;letter-spacing:0.06em;padding:0.18rem 0.55rem;border-radius:999px;margin-left:0.4rem;background:' +
      bg + ";color:" + color + ";border:1px solid " + border + '">' +
      esc(label) +
      "</span>"
    );
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
    ".tv-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin:.9rem 0 .35rem}" +
    ".tv-podium-item{background:rgba(15,23,42,.65);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:.55rem .4rem;text-align:center}" +
    ".tv-podium-item.is-first{border-color:rgba(251,191,36,.45)}" +
    ".tv-medal{width:1.7rem;height:1.7rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.75rem;margin-bottom:.3rem}" +
    ".tv-nick{font-size:.88rem;font-weight:700;color:#f1f5f9;line-height:1.2;word-break:break-word}" +
    ".tv-pts{font-size:.8rem;color:#fbbf24;font-weight:700;margin-top:.25rem}" +
    ".tv-meta{font-size:.78rem;color:#94a3b8;margin-top:.35rem}" +
    ".tv-link-more{color:#7dd3fc;font-size:.85rem;font-weight:600;text-decoration:none}" +
    ".tv-link-more:hover{text-decoration:underline}";

  function injectStyle() {
    if (document.getElementById("tv-home-css")) return;
    var s = document.createElement("style");
    s.id = "tv-home-css";
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function cleanNick(raw) {
    if (window.CVISerieAperte && typeof CVISerieAperte.cleanNick === "function") {
      var c = CVISerieAperte.cleanNick(raw);
      if (c) return c;
    }
    if (raw == null) return "";
    var s = String(raw);
    s = s.replace(/\$([0-9a-fA-F]{3}|[isngzwomt$])/gi, "");
    s = s.replace(/\$[a-zA-Z0-9]/g, "").trim();
    s = s.replace(/\uFFFD/g, "");
    return s.replace(/\s+/g, " ").trim() || String(raw).trim();
  }

  function podiumHtml(rows) {
    if (!rows || !rows.length) return "";
    return (
      '<div class="tv-podium">' +
      rows
        .slice(0, 3)
        .map(function (r, i) {
          var pos = r.pos || i + 1;
          var m = medal(pos);
          var nick = cleanNick(r.nickname);
          return (
            '<div class="tv-podium-item' +
            (pos === 1 ? " is-first" : "") +
            '">' +
            '<div class="tv-medal" style="background:' +
            m.bg +
            ";color:" +
            m.color +
            '">' +
            m.label +
            "</div>" +
            '<div class="tv-nick">' +
            esc(nick || "—") +
            "</div>" +
            '<div class="tv-pts">' +
            esc(String(r.pts != null ? r.pts : "—")) +
            " " +
            esc(tr("banner_points_short", "pt")) +
            "</div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  async function load() {
    if (!window.CVI || !CVI.supabase) return;
    injectStyle();
    var host =
      document.getElementById("home-extra-banners") ||
      document.getElementById("home-eventi-banner") ||
      document.querySelector(".dashboard-grid");
    if (!host) return;

    try {
      var res = await CVI.supabase
        .from("tornei")
        .select(
          "id,titolo,descrizione,data_inizio,data_fine,vsk_sistema_punteggio,vsk_scarti,vsk_scarti_auto"
        )
        .eq("pubblicato", true)
        .eq("vsk_mostra_home", true)
        .order("data_inizio", { ascending: false })
        .limit(1);
      if (res.error || !res.data || !res.data.length) return;
      var t = res.data[0];

      var regRes = await CVI.supabase
        .from("tornei_regate")
        .select("id,titolo,ordine,data_regata")
        .eq("torneo_id", t.id)
        .order("ordine", { ascending: true })
        .order("data_regata", { ascending: true, nullsFirst: false });
      var regate = regRes.error ? [] : regRes.data || [];
      if (!regate.length) return;

      var ids = regate.map(function (r) {
        return r.id;
      });
      var risRes = await CVI.supabase
        .from("tornei_risultati_vsk")
        .select("regata_id,posizione,nickname,account_vsk,punti,stato")
        .in("regata_id", ids);
      var risultati = risRes.error ? [] : risRes.data || [];

      var byReg = {};
      risultati.forEach(function (r) {
        var k = String(r.regata_id);
        if (!byReg[k]) byReg[k] = [];
        byReg[k].push(r);
      });

      var lib = window.CVISerieAperte;
      var sistema = t.vsk_sistema_punteggio === "high_point" ? "high_point" : "low_point";
      var classifica = [];
      if (lib && typeof lib.calcClassificaSerie === "function") {
        classifica = lib.calcClassificaSerie(
          regate.map(function (reg) {
            return {
              id: reg.id,
              titolo: reg.titolo,
              results: (byReg[String(reg.id)] || []).map(function (r) {
                return {
                  nickname: r.nickname,
                  team: r.account_vsk,
                  posizione: r.posizione,
                  punti: r.punti,
                  stato: r.stato
                };
              })
            };
          }),
          t.vsk_scarti || 0,
          { sistema: sistema, scartiAuto: !!t.vsk_scarti_auto }
        );
      }

      var rows = (classifica || []).slice(0, 3).map(function (r) {
        return {
          nickname: r.nickname,
          pos: r.pos,
          pts: r.netti != null ? r.netti : r.punti
        };
      });
      if (!rows.length) return;

      var dates = [t.data_inizio, t.data_fine].filter(Boolean).map(function (d) {
        try {
          return new Date(d).toLocaleDateString(locale(), { day: "numeric", month: "short" });
        } catch (e) {
          return "";
        }
      }).filter(Boolean);

      var scartiN = lib && lib.calcolaNumScarti
        ? lib.calcolaNumScarti(t.vsk_scarti || 0, !!t.vsk_scarti_auto, regate.length)
        : t.vsk_scarti || 0;

      var section = document.createElement("section");
      section.className = "tv-home-section";
      section.innerHTML =
        '<div class="tv-home-card">' +
        '<div class="tv-home-header">' +
        "<div>" +
        '<span class="tv-badge">' +
        esc(tr("banner_tournament_vsk", "Torneo · classifica VSK")) +
        "</span>" +
        statusBadge(deriveStatus(t.data_inizio, t.data_fine)) +
        '<h2 class="tv-home-title">' +
        esc(t.titolo) +
        "</h2>" +
        (dates.length
          ? '<div class="tv-home-date">📅 ' + esc(dates.join(" → ")) + "</div>"
          : "") +
        "</div>" +
        '<a href="torneo.html?id=' +
        encodeURIComponent(t.id) +
        '" class="tv-link-more">' +
        esc(tr("banner_view_tournament", "Vedi il torneo →")) +
        "</a></div>" +
        podiumHtml(rows) +
        '<p class="tv-meta">' +
        esc(sistema === "high_point" ? "High Point" : "Low Point") +
        " · " +
        esc(tr("banner_discards", "scarti")) +
        ": " +
        esc(String(scartiN)) +
        (t.vsk_scarti_auto ? " " + esc(tr("banner_automatic", "(automatici)")) : "") +
        " · " +
        esc(String(regate.length)) +
        " " +
        esc(tr("banner_races_vsk", "regate VSK")) +
        "</p></div>";

      var existing = document.getElementById("tv-home-banner");
      if (existing) existing.remove();
      section.id = "tv-home-banner";
      host.appendChild(section);
    } catch (e) {
      console.warn("[CVI tornei home]", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
  setTimeout(load, 1200);
})();
