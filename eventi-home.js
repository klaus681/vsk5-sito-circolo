/* CVI – banner EVENTI in Home (stile card Gare / Allenamenti)
   Serie aperte o Eventi aperti con mostra_home; sfondo da site_settings
   (home_bg_eventi) gestibile da Admin → Sfondi. */
(function () {
  "use strict";

  var busy = false;
  var DEFAULT_BG =
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1000&q=70";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "&#39;");
  }

  function tr(key, fallback) {
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : fallback;
  }

  function locale() {
    return window.CVI && typeof CVI.locale === "function" ? CVI.locale() : "it-IT";
  }

  function waitCVI() {
    return new Promise(function (resolve) {
      var n = 0;
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (++n > 80) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
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

  function ensureRow() {
    var row = document.getElementById("home-extra-banners");
    if (row) return row;

    row = document.createElement("div");
    row.id = "home-extra-banners";
    row.style.cssText =
      "display:flex;flex-wrap:wrap;gap:1rem;align-items:stretch;" +
      "width:100%;max-width:960px;margin:0.85rem auto 1.25rem;" +
      "padding:0 0.5rem;box-sizing:border-box;clear:both;";

    var wrap = document.querySelector(".next-regata-wrap");
    var race =
      document.getElementById("next-regata-card") ||
      document.querySelector("a.home-race-card");
    var statsRow =
      document.querySelector(".hero-stats") ||
      document.querySelector(".stats-row") ||
      document.querySelector(".home-next-race");

    var anchor =
      wrap ||
      (race && race.closest(".hero-stats, .stats-row, .home-next-race, .content-row")) ||
      statsRow;
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    } else {
      var main =
        document.querySelector("main.page-content") ||
        document.querySelector("main");
      if (main) main.insertBefore(row, main.firstChild);
    }
    return row;
  }

  function applyBg(card, url) {
    var u = (url || DEFAULT_BG).replace(/"/g, "");
    card.style.backgroundImage =
      "linear-gradient(135deg, rgba(11,15,25,0.55) 0%, rgba(15,40,70,0.5) 40%, rgba(11,15,25,0.78) 100%), " +
      'url("' +
      u +
      '")';
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
  }

  async function loadBgUrl() {
    try {
      if (window.__CVI_BG_EVENTI) return window.__CVI_BG_EVENTI;
      var res = await CVI.supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_bg_eventi")
        .maybeSingle();
      if (res.data && res.data.value) return String(res.data.value).trim();
    } catch (e) {}
    return "";
  }

  function medal(pos) {
    if (pos === 1) return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#0b0f19" };
    if (pos === 2) return { bg: "linear-gradient(135deg,#94a3b8,#64748b)", color: "#0b0f19" };
    if (pos === 3) return { bg: "linear-gradient(135deg,#d97706,#b45309)", color: "#fff" };
    return { bg: "rgba(56,189,248,0.15)", color: "#7dd3fc" };
  }

  function podiumHtml(rows, ptsFn) {
    if (!rows || !rows.length) return "";
    return (
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin:0.75rem 0 0.35rem">' +
      rows
        .slice(0, 3)
        .map(function (r, i) {
          var pos = r.pos || i + 1;
          var m = medal(pos);
          return (
            '<div style="background:rgba(15,23,42,0.65);border:1px solid ' +
            (pos === 1 ? "rgba(251,191,36,0.45)" : "rgba(255,255,255,0.08)") +
            ';border-radius:10px;padding:0.55rem 0.4rem;text-align:center">' +
            '<div style="width:1.7rem;height:1.7rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:0.75rem;margin-bottom:0.3rem;background:' +
            m.bg +
            ";color:" +
            m.color +
            '">' +
            pos +
            "°</div>" +
            '<div style="color:#fff;font-weight:700;font-size:0.85rem;line-height:1.2;word-break:break-word">' +
            esc(r.nickname || "—") +
            "</div>" +
            (r.team
              ? '<div style="color:#94a3b8;font-size:0.72rem;margin-top:0.15rem">' +
                esc(r.team) +
                "</div>"
              : "") +
            (ptsFn && r.pts != null
              ? '<div style="color:#7dd3fc;font-size:0.75rem;font-weight:700;margin-top:0.15rem">' +
                esc(ptsFn(r)) +
                "</div>"
              : "") +
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
          .in(
            "regata_id",
            regate.map(function (r) {
              return r.id;
            })
          );
        var byReg = {};
        (risRes.data || []).forEach(function (r) {
          var k = String(r.regata_id);
          if (!byReg[k]) byReg[k] = [];
          byReg[k].push(r);
        });
        var sistema = serie.sistema_punteggio === "high_point" ? "high_point" : "low_point";
        classifica = lib.calcClassificaSerie(
          regate.map(function (reg) {
            return {
              id: reg.id,
              titolo: reg.titolo,
              results: lib.calcPuntiRegata(byReg[String(reg.id)] || [], sistema)
            };
          }),
          serie.scarti || 0,
          { sistema: sistema, scartiAuto: !!serie.scarti_auto }
        );
      }
      var sistemaLabel = serie.sistema_punteggio === "high_point" ? "High Point" : "Low Point";
      var scartiN = lib
        ? lib.calcolaNumScarti(serie.scarti || 0, !!serie.scarti_auto, regate.length)
        : 0;
      return {
        kind: "serie",
        href: "evento.html?tipo=serie&id=" + encodeURIComponent(serie.id),
        badge: tr("banner_open_series", "Serie aperta"),
        title: serie.titolo,
        description: serie.descrizione,
        date: serie.data_inizio || serie.data_fine
          ? fmtDate(serie.data_inizio) +
            (serie.data_fine ? " – " + fmtDate(serie.data_fine, true) : "")
          : "",
        podium: podiumHtml(
          classifica.map(function (r) {
            return { nickname: r.nickname, team: r.team, pos: r.pos, pts: r.netti };
          }),
          function (r) {
            return r.pts + " pt";
          }
        ),
        note:
          sistemaLabel +
          " · " +
          tr("banner_discards", "scarti") +
          ": " +
          scartiN +
          (serie.scarti_auto ? " (" + tr("banner_automatic", "automatici") + ")" : "") +
          " · " +
          regate.length +
          " " +
          tr("banner_races", "regate")
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
      href: "evento.html?tipo=evento&id=" + encodeURIComponent(evento.id),
      badge: tr("eventi_type_evento", "Evento aperto"),
      title: evento.titolo,
      description: evento.descrizione,
      date: fmtDateTime(evento.data_evento),
      podium: podiumHtml(rows),
      note: tr("banner_event_note", "Classifica dell’evento · non ufficiale")
    };
  }

  async function loadBanner() {
    if (!isHome()) return;
    if (busy || document.getElementById("home-eventi-banner")) return;
    busy = true;

    var ok = await waitCVI();
    if (!ok) {
      busy = false;
      return;
    }

    try {
      var feature = await buildFeature(CVI.supabase);
      if (!feature) return;
      if (document.getElementById("home-eventi-banner")) return;

      var bgUrl = await loadBgUrl();

      var card = document.createElement("a");
      card.id = "home-eventi-banner";
      card.href = feature.href || "eventi.html";
      card.className = "home-eventi-card";
      card.style.cssText =
        "display:block;text-decoration:none;flex:1 1 280px;min-width:260px;max-width:460px;" +
        "position:relative;overflow:hidden;" +
        "padding:1.15rem 1.3rem;border-radius:16px;" +
        "border:1px solid rgba(56,189,248,0.35);" +
        "color:#e2e8f0;box-shadow:0 12px 36px rgba(0,0,0,0.35);" +
        "transition:border-color .25s ease, transform .2s ease;";

      applyBg(card, bgUrl);
      window.__CVI_BG_EVENTI = bgUrl || DEFAULT_BG;

      var desc = feature.description
        ? String(feature.description).slice(0, 120) +
          (String(feature.description).length > 120 ? "…" : "")
        : "";

      card.innerHTML =
        '<div style="position:relative;z-index:1">' +
        '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.55rem">' +
        '<span style="font-size:0.68rem;font-weight:800;letter-spacing:0.06em;padding:0.18rem 0.55rem;border-radius:999px;background:linear-gradient(135deg,#38bdf8,#7dd3fc);color:#0b0f19">' +
        esc(feature.badge) +
        "</span>" +
        '<span style="font-size:0.68rem;font-weight:800;letter-spacing:0.06em;padding:0.18rem 0.55rem;border-radius:999px;background:rgba(56,189,248,0.2);color:#7dd3fc;border:1px solid rgba(56,189,248,0.35)">' +
        esc(tr("banner_open", "APERTO")) +
        "</span>" +
        "</div>" +
        '<div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:0.4rem;line-height:1.25;text-shadow:0 2px 12px rgba(0,0,0,0.45)">' +
        esc(feature.title) +
        "</div>" +
        (feature.date
          ? '<div style="font-size:0.9rem;color:#e2e8f0;margin-bottom:0.35rem;opacity:0.95">📅 ' +
            esc(feature.date) +
            "</div>"
          : "") +
        (desc
          ? '<div style="font-size:0.88rem;color:#cbd5e1;margin-bottom:0.25rem;line-height:1.45">' +
            esc(desc) +
            "</div>"
          : "") +
        (feature.podium || "") +
        (feature.note
          ? '<div style="margin-top:0.45rem;font-size:0.78rem;color:#94a3b8">' +
            esc(feature.note) +
            "</div>"
          : "") +
        '<div style="margin-top:0.7rem;font-size:0.88rem;font-weight:700;color:#7dd3fc">' +
        esc(tr("eventi_see_all", "Tutti gli eventi →")) +
        "</div>" +
        "</div>";

      card.addEventListener("mouseenter", function () {
        card.style.borderColor = "rgba(56,189,248,0.7)";
        card.style.transform = "translateY(-2px)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.borderColor = "rgba(56,189,248,0.35)";
        card.style.transform = "none";
      });

      var row = ensureRow();
      var al = document.getElementById("home-allenamento-banner");
      var tor = document.getElementById("home-torneo-banner");
      if (al && al.parentNode === row) {
        if (al.nextSibling) row.insertBefore(card, al.nextSibling);
        else row.appendChild(card);
      } else if (tor && tor.parentNode === row) {
        if (tor.nextSibling) row.insertBefore(card, tor.nextSibling);
        else row.appendChild(card);
      } else {
        row.appendChild(card);
      }
    } catch (e) {
      console.warn("[CVI eventi-home]", e);
    } finally {
      busy = false;
    }
  }

  function start() {
    setTimeout(loadBanner, 700);
    setTimeout(loadBanner, 1800);
    setTimeout(loadBanner, 3500);
  }

  document.addEventListener("cvi:langchange", function () {
    var el = document.getElementById("home-eventi-banner");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    loadBanner();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
