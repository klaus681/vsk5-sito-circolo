/* CVI – patch home: Iscriviti sul banner eventi (robusto v3) */
(function () {
  "use strict";

  function ensureStyles() {
    if (document.getElementById("evh-iscr-style")) return;
    var stEl = document.createElement("style");
    stEl.id = "evh-iscr-style";
    stEl.textContent =
      ".evh-iscr-wrap{margin-top:.9rem;padding:.75rem .9rem;border:1px solid rgba(56,189,248,.25);border-radius:10px;background:rgba(15,23,42,.4);display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}" +
      ".evh-btn-iscr{display:inline-flex;align-items:center;background:#38bdf8;color:#0b0f19;font-weight:800;font-size:.82rem;padding:.5rem 1rem;border-radius:8px;border:0;cursor:pointer;font-family:inherit;text-decoration:none}" +
      ".evh-btn-iscr:hover{background:#7dd3fc}" +
      ".evh-btn-iscr--out{background:transparent;color:#f87171;border:1px solid rgba(248,113,113,.4)}" +
      ".evh-btn-iscr--login{background:rgba(56,189,248,.12);color:#7dd3fc;border:1px solid rgba(56,189,248,.3)}" +
      ".evh-btn-iscr:disabled{opacity:.55;cursor:wait}" +
      ".evh-iscr-msg{font-size:.78rem;color:#94a3b8}";
    document.head.appendChild(stEl);
  }

  function esc(s) {
    if (window.CVIEventi && CVIEventi.esc) return CVIEventi.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function enhance(card) {
    if (!card) return;
    if (card.querySelector(".evh-iscr-wrap")) return;
    ensureStyles();

    var link = card.querySelector(".evh-title-link") || card.querySelector("a[href*='evento.html']");
    var href = link ? link.getAttribute("href") || "" : "eventi.html";
    var kind = null, id = null;
    if (href.indexOf("tipo=serie") >= 0) {
      kind = "serie";
      id = decodeURIComponent((href.match(/[?&]id=([^&]+)/) || [])[1] || "");
    } else if (href.indexOf("tipo=evento") >= 0) {
      kind = "evento";
      id = decodeURIComponent((href.match(/[?&]id=([^&]+)/) || [])[1] || "");
    }

    var wrap = document.createElement("div");
    wrap.className = "evh-iscr-wrap";
    wrap.innerHTML = '<span class="evh-iscr-msg">Caricamento iscrizione…</span>';
    card.appendChild(wrap);

    var I = window.CVIEventiIscrizione;
    var E = window.CVIEventi;
    if (!kind || !id || !I || !E || !window.CVI || !CVI.supabase) {
      wrap.innerHTML =
        '<a class="evh-btn-iscr" href="' + esc(href) + '">Iscriviti →</a>' +
        '<span class="evh-iscr-msg">Apri la pagina evento per iscriverti</span>';
      return;
    }

    try {
      var table = kind === "serie" ? "serie_aperte" : "eventi_aperti";
      var rawRes = await CVI.supabase.from(table).select("*").eq("id", id).maybeSingle();
      var raw = rawRes.data || {};
      var iscrizioni = await I.fetchIscrizioni(kind, id);
      var user = await E.currentUser();
      var st = I.status(kind, raw, iscrizioni, user);

      function render(st2) {
        if (!wrap.parentNode) return;
        var btn = I.buttonHtml(st2, {
          user: user,
          className: "evh-btn-iscr",
          registerLabel: "Iscriviti",
          unregisterLabel: "Annulla iscrizione",
          loginLabel: "Accedi per iscriverti"
        });
        if (!btn && !user) {
          btn = '<a class="evh-btn-iscr evh-btn-iscr--login" href="accedi.html">Accedi per iscriverti</a>';
        }
        if (!btn && user && !st2.isRegistered) {
          btn = '<a class="evh-btn-iscr" href="' + esc(href) + '">Vedi evento →</a>';
        }
        wrap.innerHTML =
          (btn || "") +
          '<span class="evh-iscr-msg">' + esc(st2.message || "") + "</span>";
        wrap.querySelectorAll("[data-ev-iscr]").forEach(function (b) {
          b.addEventListener("click", async function () {
            var action = b.getAttribute("data-ev-iscr");
            b.disabled = true;
            var msgEl = wrap.querySelector(".evh-iscr-msg");
            try {
              if (action === "in") {
                await I.register(kind, id, user);
                if (msgEl) msgEl.textContent = "Iscrizione confermata.";
              } else if (action === "out") {
                if (!confirm("Annullare la tua iscrizione?")) {
                  b.disabled = false;
                  return;
                }
                await I.unregister(kind, id, user, st2.myRow);
                if (msgEl) msgEl.textContent = "Iscrizione annullata.";
              }
              iscrizioni = await I.fetchIscrizioni(kind, id);
              st2 = I.status(kind, raw, iscrizioni, user);
              render(st2);
            } catch (err) {
              if (msgEl) msgEl.textContent = err.message || String(err);
              b.disabled = false;
            }
          });
        });
      }

      render(st);
    } catch (err) {
      wrap.innerHTML =
        '<a class="evh-btn-iscr" href="' + esc(href) + '">Iscriviti →</a>' +
        '<span class="evh-iscr-msg">' + esc(err.message || "Errore caricamento") + "</span>";
    }
  }

  function scan() {
    var card = document.querySelector("#cvi-eventi-home .evh-card");
    if (card) enhance(card);
  }

  function start() {
    var tries = 0;
    function tick() {
      scan();
      tries++;
      if (tries < 80 && !document.querySelector(".evh-iscr-wrap")) {
        setTimeout(tick, 350);
      }
    }
    tick();
    try {
      var main = document.getElementById("main-content") || document.body;
      var obs = new MutationObserver(function () { scan(); });
      obs.observe(main, { childList: true, subtree: true });
      setTimeout(function () { obs.disconnect(); }, 60000);
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
