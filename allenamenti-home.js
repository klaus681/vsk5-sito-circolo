/* CVI – banner prossimo allenamento in home (stile allineato a Prossima gara) */
(function () {
  "use strict";

  var busy = false;
  var DEFAULT_BG =
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=70";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function fmt(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso);
    }
  }

  function isHome() {
    var path = (location.pathname || "").split("/").pop() || "";
    return !path || path === "index.html" || path === "/";
  }

  /**
   * Inserisce il banner SOTTO la riga stats+prossima gara,
   * MAI dentro .next-regata-wrap (altrimenti il btn-meteo assoluto
   * finisce sopra l'allenamento).
   */
  function findInsertPoint() {
    var wrap = document.querySelector(".next-regata-wrap");
    if (wrap && wrap.parentNode) return { parent: wrap.parentNode, before: wrap.nextSibling };

    var race =
      document.getElementById("next-regata-card") ||
      document.querySelector("a.home-race-card") ||
      document.querySelector(".race-highlight");
    if (race) {
      // sali al contenitore della riga, non al wrap interno
      var row = race.closest(".hero-stats, .stats-row, .home-next-race, .content-row") || race.parentNode;
      if (row && row.parentNode) return { parent: row.parentNode, before: row.nextSibling };
      if (race.parentNode) return { parent: race.parentNode, before: race.nextSibling };
    }

    var host =
      document.querySelector("main .page-content") ||
      document.querySelector("main") ||
      document.body;
    return { parent: host, before: host.firstChild };
  }

  function applyBg(card, url) {
    var u = (url || DEFAULT_BG).replace(/"/g, "");
    card.style.backgroundImage =
      "linear-gradient(135deg, rgba(11,15,25,0.55) 0%, rgba(6,40,30,0.5) 40%, rgba(11,15,25,0.78) 100%), " +
      'url("' +
      u +
      '")';
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
  }

  async function loadBgUrl() {
    try {
      var res = await CVI.supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_bg_allenamento")
        .maybeSingle();
      if (res.data && res.data.value) return String(res.data.value).trim();
    } catch (e) {}
    return window.__CVI_BG_ALLENAMENTO || "";
  }

  async function loadBanner() {
    if (!isHome()) return;
    if (busy || document.getElementById("home-allenamento-banner")) return;
    busy = true;

    var ok = await waitCVI();
    if (!ok) {
      busy = false;
      return;
    }

    try {
      var nowIso = new Date().toISOString();
      var r = await CVI.supabase
        .from("allenamenti")
        .select("id,titolo,descrizione,data_ora,classe_barca,max_iscritti,stato,pubblicato")
        .eq("pubblicato", true)
        .neq("stato", "annullato")
        .gte("data_ora", nowIso)
        .order("data_ora", { ascending: true })
        .limit(1);

      if (r.error || !r.data || !r.data.length) return;
      if (document.getElementById("home-allenamento-banner")) return;

      var a = r.data[0];
      var nIsc = 0;
      try {
        var ir = await CVI.supabase
          .from("allenamento_iscrizioni")
          .select("id", { count: "exact", head: true })
          .eq("allenamento_id", a.id);
        nIsc = ir.count != null ? ir.count : 0;
      } catch (e) {}

      var max =
        a.max_iscritti != null && a.max_iscritti > 0 ? a.max_iscritti : null;

      var bgUrl = await loadBgUrl();

      // Wrapper full-width sotto la riga gara (non dentro next-regata-wrap)
      var outer = document.createElement("div");
      outer.id = "home-allenamento-banner-wrap";
      outer.style.cssText =
        "width:100%;max-width:640px;margin:0.85rem 0 1.25rem;clear:both;";

      var card = document.createElement("a");
      card.id = "home-allenamento-banner";
      card.href = "allenamenti.html";
      card.className = "home-allenamento-card";
      card.style.cssText =
        "display:block;text-decoration:none;position:relative;overflow:hidden;" +
        "padding:1.15rem 1.3rem 1.2rem;border-radius:16px;" +
        "border:1px solid rgba(52,211,153,0.35);" +
        "color:#e2e8f0;box-shadow:0 12px 36px rgba(0,0,0,0.35);" +
        "transition:border-color .25s ease, transform .2s ease;";

      applyBg(card, bgUrl);
      window.__CVI_BG_ALLENAMENTO = bgUrl;

      card.innerHTML =
        '<div style="position:relative;z-index:1">' +
        '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.55rem">' +
        '<span style="font-size:0.68rem;font-weight:800;letter-spacing:0.06em;padding:0.18rem 0.55rem;border-radius:999px;background:rgba(52,211,153,0.9);color:#0b0f19">ALLENAMENTO</span>' +
        '<span style="font-size:0.68rem;font-weight:800;letter-spacing:0.06em;padding:0.18rem 0.55rem;border-radius:999px;background:rgba(56,189,248,0.2);color:#7dd3fc;border:1px solid rgba(56,189,248,0.35)">SOLO SOCI</span>' +
        (max != null
          ? '<span style="font-size:0.68rem;font-weight:700;padding:0.18rem 0.55rem;border-radius:999px;background:rgba(15,23,42,0.55);color:#cbd5e1;border:1px solid rgba(255,255,255,0.1)">ISCRITTI ' +
            nIsc +
            " / " +
            max +
            "</span>"
          : '<span style="font-size:0.68rem;font-weight:700;padding:0.18rem 0.55rem;border-radius:999px;background:rgba(15,23,42,0.55);color:#cbd5e1;border:1px solid rgba(255,255,255,0.1)">ISCRITTI ' +
            nIsc +
            "</span>") +
        "</div>" +
        '<div style="font-size:1.35rem;font-weight:800;color:#fff;margin-bottom:0.4rem;line-height:1.25;text-shadow:0 2px 12px rgba(0,0,0,0.45)">' +
        esc(a.titolo) +
        "</div>" +
        '<div style="font-size:0.9rem;color:#e2e8f0;margin-bottom:0.35rem;opacity:0.95">📅 ' +
        esc(fmt(a.data_ora)) +
        (a.classe_barca ? " · ⛵ " + esc(a.classe_barca) : "") +
        "</div>" +
        (a.descrizione
          ? '<div style="font-size:0.88rem;color:#cbd5e1;margin-bottom:0.35rem;line-height:1.45">' +
            esc(String(a.descrizione).slice(0, 120)) +
            "</div>"
          : "") +
        '<div style="margin-top:0.7rem;font-size:0.88rem;font-weight:700;color:#34d399">Iscriviti all\'allenamento →</div>' +
        "</div>";

      card.addEventListener("mouseenter", function () {
        card.style.borderColor = "rgba(52,211,153,0.7)";
        card.style.transform = "translateY(-2px)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.borderColor = "rgba(52,211,153,0.35)";
        card.style.transform = "none";
      });

      outer.appendChild(card);

      var point = findInsertPoint();
      if (point.parent) {
        if (point.before) point.parent.insertBefore(outer, point.before);
        else point.parent.appendChild(outer);
      }
    } catch (e) {
      console.warn("[CVI allenamenti-home]", e);
    } finally {
      busy = false;
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", loadBanner);
  else loadBanner();
  setTimeout(loadBanner, 1800);
  setTimeout(loadBanner, 3500);
})();
