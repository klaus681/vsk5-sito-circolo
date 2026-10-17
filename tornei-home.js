/* CVI - banner Torneo in home quando pubblicato */
(function () {
  "use strict";

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

  async function loadBanner() {
    var path = (location.pathname || "").split("/").pop() || "";
    if (path && path !== "index.html" && path !== "" && path !== "/") return;

    var ok = await waitCVI();
    if (!ok) return;

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

      var nIsc = 0;
      try {
        var ir = await CVI.supabase
          .from("torneo_iscrizioni")
          .select("id", { count: "exact", head: true })
          .eq("torneo_id", t.id);
        nIsc = ir.count != null ? ir.count : 0;
      } catch (e) {}

      var host =
        document.querySelector(".hero-stats") ||
        document.querySelector(".home-next-race") ||
        document.getElementById("next-race-card") ||
        document.querySelector(".stats-row") ||
        document.querySelector("main .page-content") ||
        document.querySelector("main");

      var nextCard =
        document.querySelector("a.home-race-card") ||
        document.querySelector(".race-highlight") ||
        document.querySelector("[class*='next-race']") ||
        document.querySelector("[class*='prossima']") ||
        document.getElementById("next-regata-card");

      if (document.getElementById("home-torneo-banner")) return;

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
        "display:block;text-decoration:none;margin:1rem 0 1.25rem;padding:1.1rem 1.25rem;" +
        "border-radius:14px;border:1px solid rgba(56,189,248,0.35);" +
        "background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,58,95,0.85));" +
        "color:#e2e8f0;max-width:640px";

      if (window.__CVI_BG_TORNEO) {
        card.style.backgroundImage =
          "linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,58,95,0.75)), url(\"" +
          String(window.__CVI_BG_TORNEO).replace(/"/g, "") +
          "\")";
        card.style.backgroundSize = "cover";
        card.style.backgroundPosition = "center";
      }

      card.innerHTML =
        '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.45rem">' +
        '<span style="font-size:0.7rem;font-weight:800;letter-spacing:0.06em;padding:0.15rem 0.55rem;border-radius:999px;background:rgba(56,189,248,0.2);color:#7dd3fc">TORNEO</span>' +
        '<span style="font-size:0.7rem;font-weight:800;letter-spacing:0.06em;padding:0.15rem 0.55rem;border-radius:999px;background:rgba(52,211,153,0.15);color:#34d399">' +
        esc(stLabel) +
        "</span>" +
        (max != null
          ? '<span style="font-size:0.7rem;font-weight:700;padding:0.15rem 0.55rem;border-radius:999px;background:rgba(148,163,184,0.15);color:#94a3b8">ISCRITTI ' +
            nIsc +
            " / " +
            max +
            "</span>"
          : '<span style="font-size:0.7rem;font-weight:700;padding:0.15rem 0.55rem;border-radius:999px;background:rgba(148,163,184,0.15);color:#94a3b8">ISCRITTI ' +
            nIsc +
            "</span>") +
        "</div>" +
        '<div style="font-size:1.25rem;font-weight:800;color:#fff;margin-bottom:0.35rem">' +
        esc(t.titolo) +
        "</div>" +
        (dates.length
          ? '<div style="font-size:0.88rem;color:#94a3b8;margin-bottom:0.35rem">' +
            esc(dates.join(" \u2192 ")) +
            "</div>"
          : "") +
        (t.descrizione
          ? '<div style="font-size:0.9rem;color:#cbd5e1">' +
            esc(String(t.descrizione).slice(0, 140)) +
            "</div>"
          : "") +
        '<div style="margin-top:0.65rem;font-size:0.85rem;font-weight:700;color:#7dd3fc">Vai al torneo \u2192</div>';

      if (nextCard && nextCard.parentNode) {
        nextCard.parentNode.insertBefore(card, nextCard.nextSibling);
      } else if (host) {
        host.insertBefore(card, host.firstChild);
      }
    } catch (e) {
      console.warn("[CVI tornei-home]", e);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadBanner);
  else loadBanner();
  setTimeout(loadBanner, 2000);
})();
