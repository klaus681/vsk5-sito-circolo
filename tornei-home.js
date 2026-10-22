/* CVI - banner Torneo in home quando pubblicato
   NON inserire dentro .next-regata-wrap (btn-meteo position:absolute) */
(function () {
  "use strict";

  var busy = false;

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, String.fromCharCode(38, 97, 109, 112, 59))
      .replace(/</g, String.fromCharCode(38, 108, 116, 59))
      .replace(/>/g, String.fromCharCode(38, 103, 116, 59))
      .replace(/"/g, String.fromCharCode(38, 113, 117, 111, 116, 59));
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

  function isHome() {
    var path = (location.pathname || "").split("/").pop() || "";
    return !path || path === "index.html" || path === "/";
  }

  /** Riga dedicata sotto stats+gara, mai dentro next-regata-wrap */
  function ensureRow() {
    var row = document.getElementById("home-extra-banners");
    if (row) return row;

    row = document.createElement("div");
    row.id = "home-extra-banners";
    row.style.cssText =
      "display:flex;flex-wrap:wrap;gap:1rem;align-items:stretch;" +
      "width:100%;max-width:960px;margin:0.85rem auto 1.25rem;" +
      "padding:0 0.5rem;box-sizing:border-box;clear:both;";

    // Inserisci DOPO .next-regata-wrap o dopo la riga stats
    var wrap = document.querySelector(".next-regata-wrap");
    var race =
      document.getElementById("next-regata-card") ||
      document.querySelector("a.home-race-card");
    var statsRow =
      document.querySelector(".hero-stats") ||
      document.querySelector(".stats-row") ||
      document.querySelector(".home-next-race");

    var anchor = wrap || (race && race.closest(".hero-stats, .stats-row, .home-next-race, .content-row")) || statsRow;
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    } else {
      var main =
        document.querySelector("main .page-content") ||
        document.querySelector("main");
      if (main) main.insertBefore(row, main.firstChild);
    }
    return row;
  }

  async function loadBanner() {
    if (!isHome()) return;
    if (busy || document.getElementById("home-torneo-banner")) return;
    busy = true;

    var ok = await waitCVI();
    if (!ok) {
      busy = false;
      return;
    }

    try {
      var r = await CVI.supabase
        .from("tornei")
        .select("id,titolo,descrizione,stato,data_inizio,data_fine,max_partecipanti,pubblicato")
        .eq("pubblicato", true)
        .in("stato", ["aperto", "in_corso"])
        .order("data_inizio", { ascending: true })
        .limit(1);

      if (r.error || !r.data || !r.data.length) return;
      var t = r.data[0];
      if (document.getElementById("home-torneo-banner")) return;

      var nIsc = 0;
      try {
        var ir = await CVI.supabase
          .from("torneo_iscrizioni")
          .select("id", { count: "exact", head: true })
          .eq("torneo_id", t.id);
        nIsc = ir.count != null ? ir.count : 0;
      } catch (e) {}

      // Password server: mostrata solo ai soci loggati (RLS su torneo_password
      // non restituisce nulla in anonimo). Se la tabella non esiste la
      // migrazione tornei-password-sql.sql non è stata eseguita: si ignora.
      var pwd = "";
      try {
        var sr = await CVI.supabase.auth.getSession();
        var logged = !!(sr && sr.data && sr.data.session);
        if (logged) {
          var pr = await CVI.supabase
            .from("torneo_password")
            .select("password")
            .eq("torneo_id", t.id)
            .maybeSingle();
          if (!pr.error && pr.data && pr.data.password) {
            pwd = String(pr.data.password).trim();
          }
        }
      } catch (e) {}

      var max =
        t.max_partecipanti != null && t.max_partecipanti > 0
          ? t.max_partecipanti
          : null;
      var stLabel =
        t.stato === "in_corso"
          ? "IN CORSO"
          : t.stato === "aperto"
            ? "ISCRIZIONI APERTE"
            : String(t.stato || "").toUpperCase();

      var dates = [];
      if (t.data_inizio) dates.push(t.data_inizio);
      if (t.data_fine) dates.push(t.data_fine);

      var card = document.createElement("a");
      card.id = "home-torneo-banner";
      card.href = "tornei.html?id=" + encodeURIComponent(t.id);
      card.style.cssText =
        "display:block;text-decoration:none;flex:1 1 280px;min-width:260px;max-width:460px;" +
        "padding:1.15rem 1.3rem;border-radius:16px;position:relative;overflow:hidden;" +
        "border:1px solid rgba(56,189,248,0.35);" +
        "background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,58,95,0.85));" +
        "color:#e2e8f0;box-shadow:0 12px 36px rgba(0,0,0,0.35);" +
        "transition:border-color .25s ease, transform .2s ease;";

      if (window.__CVI_BG_TORNEO) {
        card.style.backgroundImage =
          "linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,58,95,0.75)), url(\"" +
          String(window.__CVI_BG_TORNEO).replace(/"/g, "") +
          "\")";
        card.style.backgroundSize = "cover";
        card.style.backgroundPosition = "center";
      }

      card.innerHTML =
        '<div style="position:relative;z-index:1">' +
        '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.55rem">' +
        '<span style="font-size:0.68rem;font-weight:800;letter-spacing:0.06em;padding:0.18rem 0.55rem;border-radius:999px;background:rgba(56,189,248,0.9);color:#0b0f19">TORNEO</span>' +
        '<span style="font-size:0.68rem;font-weight:800;letter-spacing:0.06em;padding:0.18rem 0.55rem;border-radius:999px;background:rgba(52,211,153,0.2);color:#34d399;border:1px solid rgba(52,211,153,0.35)">' +
        esc(stLabel) +
        "</span>" +
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
        '<div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:0.4rem;line-height:1.25;text-shadow:0 2px 12px rgba(0,0,0,0.45)">' +
        esc(t.titolo) +
        "</div>" +
        (dates.length
          ? '<div style="font-size:0.9rem;color:#e2e8f0;margin-bottom:0.35rem;opacity:0.95">📅 ' +
            esc(dates.join(" → ")) +
            "</div>"
          : "") +
        (t.descrizione
          ? '<div style="font-size:0.88rem;color:#cbd5e1;margin-bottom:0.35rem;line-height:1.45">' +
            esc(String(t.descrizione).slice(0, 120)) +
            "</div>"
          : "") +
        (pwd
          ? '<div style="margin-top:0.55rem;display:inline-flex;align-items:center;gap:0.35rem;background:rgba(56,189,248,0.14);border:1px solid rgba(56,189,248,0.35);border-radius:8px;padding:0.3rem 0.65rem;font-size:0.85rem;color:#cbd5e1">🔑 Password server: <code style="color:#7dd3fc;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">' +
            esc(pwd) +
            "</code></div>"
          : "") +
        '<div style="margin-top:0.7rem;font-size:0.88rem;font-weight:700;color:#7dd3fc">Vai al torneo →</div>' +
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
      // Torneo a sinistra nella riga
      var al = document.getElementById("home-allenamento-banner");
      if (al && al.parentNode === row) {
        row.insertBefore(card, al);
      } else {
        row.insertBefore(card, row.firstChild);
      }
    } catch (e) {
      console.warn("[CVI tornei-home]", e);
    } finally {
      busy = false;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadBanner);
  else loadBanner();
  setTimeout(loadBanner, 2000);
  setTimeout(loadBanner, 4000);
})();
