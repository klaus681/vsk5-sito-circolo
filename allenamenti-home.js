/* CVI – banner prossimo allenamento in home */
(function () {
  "use strict";

  var busy = false;

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

  async function loadBanner() {
    var path = (location.pathname || "").split("/").pop() || "";
    if (path && path !== "index.html" && path !== "" && path !== "/") return;
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

      if (r.error || !r.data || !r.data.length) {
        // tabella assente o nessun slot → silenzioso
        return;
      }
      var a = r.data[0];

      var nIsc = 0;
      try {
        var ir = await CVI.supabase
          .from("allenamento_iscrizioni")
          .select("id", { count: "exact", head: true })
          .eq("allenamento_id", a.id);
        nIsc = ir.count != null ? ir.count : 0;
      } catch (e) {}

      if (document.getElementById("home-allenamento-banner")) return;

      var max =
        a.max_iscritti != null && a.max_iscritti > 0 ? a.max_iscritti : null;

      var card = document.createElement("a");
      card.id = "home-allenamento-banner";
      card.href = "allenamenti.html";
      card.style.cssText =
        "display:block;text-decoration:none;margin:1rem 0 1.25rem;padding:1.1rem 1.25rem;" +
        "border-radius:14px;border:1px solid rgba(52,211,153,0.4);" +
        "background:linear-gradient(135deg,rgba(6,40,30,0.95),rgba(15,50,40,0.85));" +
        "color:#e2e8f0;max-width:640px";

      card.innerHTML =
        '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.45rem">' +
        '<span style="font-size:0.7rem;font-weight:800;letter-spacing:0.06em;padding:0.15rem 0.55rem;border-radius:999px;background:rgba(52,211,153,0.25);color:#34d399">ALLENAMENTO</span>' +
        '<span style="font-size:0.7rem;font-weight:800;letter-spacing:0.06em;padding:0.15rem 0.55rem;border-radius:999px;background:rgba(56,189,248,0.15);color:#7dd3fc">SOLO SOCI</span>' +
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
        esc(a.titolo) +
        "</div>" +
        '<div style="font-size:0.88rem;color:#94a3b8;margin-bottom:0.35rem">📅 ' +
        esc(fmt(a.data_ora)) +
        (a.classe_barca ? " · ⛵ " + esc(a.classe_barca) : "") +
        "</div>" +
        (a.descrizione
          ? '<div style="font-size:0.9rem;color:#cbd5e1">' +
            esc(String(a.descrizione).slice(0, 140)) +
            "</div>"
          : "") +
        '<div style="margin-top:0.65rem;font-size:0.85rem;font-weight:700;color:#34d399">Iscriviti all\'allenamento →</div>';

      var nextCard =
        document.getElementById("home-torneo-banner") ||
        document.querySelector("a.home-race-card") ||
        document.querySelector(".race-highlight") ||
        document.querySelector("[class*='next-race']") ||
        document.getElementById("next-regata-card");

      var host =
        document.querySelector(".hero-stats") ||
        document.querySelector(".home-next-race") ||
        document.getElementById("next-race-card") ||
        document.querySelector("main .page-content") ||
        document.querySelector("main");

      if (nextCard && nextCard.parentNode) {
        nextCard.parentNode.insertBefore(card, nextCard.nextSibling);
      } else if (host) {
        host.insertBefore(card, host.firstChild);
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
  setTimeout(loadBanner, 2000);
  setTimeout(loadBanner, 4000);
})();
