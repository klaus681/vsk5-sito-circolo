/* CVI – patch home: aggiunge Iscriviti al box eventi (dopo eventi-home.js) */
(function () {
  "use strict";

  function waitForBox(cb, attempts) {
    attempts = attempts || 0;
    var box = document.querySelector("#cvi-eventi-home .evh-card");
    if (box) return cb(box);
    if (attempts > 40) return;
    setTimeout(function () { waitForBox(cb, attempts + 1); }, 250);
  }

  function esc(s) {
    if (window.CVIEventi && CVIEventi.esc) return CVIEventi.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  async function enhance(card) {
    if (card.querySelector(".evh-iscr-wrap")) return;
    var link = card.querySelector(".evh-title-link");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    var kind = null, id = null;
    if (href.indexOf("tipo=serie") >= 0) {
      kind = "serie";
      id = decodeURIComponent((href.match(/[?&]id=([^&]+)/) || [])[1] || "");
    } else if (href.indexOf("tipo=evento") >= 0) {
      kind = "evento";
      id = decodeURIComponent((href.match(/[?&]id=([^&]+)/) || [])[1] || "");
    }
    if (!kind || !id) {
      var wrap0 = document.createElement("div");
      wrap0.className = "evh-iscr-wrap";
      wrap0.style.cssText = "margin-top:.85rem";
      wrap0.innerHTML = '<a class="evh-btn-iscr" href="' + esc(href) + '" style="display:inline-flex;background:#38bdf8;color:#0b0f19;font-weight:800;font-size:.82rem;padding:.5rem 1rem;border-radius:8px;text-decoration:none">Iscriviti →</a>';
      card.appendChild(wrap0);
      return;
    }

    var I = window.CVIEventiIscrizione;
    var E = window.CVIEventi;
    if (!I || !E || !window.CVI || !CVI.supabase) {
      var w2 = document.createElement("div");
      w2.className = "evh-iscr-wrap";
      w2.style.cssText = "margin-top:.85rem";
      w2.innerHTML = '<a class="evh-btn-iscr" href="' + esc(href) + '" style="display:inline-flex;background:#38bdf8;color:#0b0f19;font-weight:800;font-size:.82rem;padding:.5rem 1rem;border-radius:8px;text-decoration:none">Iscriviti →</a>';
      card.appendChild(w2);
      return;
    }

    var table = kind === "serie" ? "serie_aperte" : "eventi_aperti";
    var rawRes = await CVI.supabase.from(table).select("*").eq("id", id).maybeSingle();
    var raw = rawRes.data || {};
    var iscrizioni = await I.fetchIscrizioni(kind, id);
    var user = await E.currentUser();
    var st = I.status(kind, raw, iscrizioni, user);

    var wrap = document.createElement("div");
    wrap.className = "evh-iscr-wrap";
    wrap.style.cssText = "margin-top:.85rem;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center";
    wrap.innerHTML = I.buttonHtml(st, {
      user: user,
      className: "evh-btn-iscr",
      registerLabel: "Iscriviti",
      unregisterLabel: "Annulla iscrizione",
      loginLabel: "Accedi per iscriverti"
    }) + '<span class="evh-iscr-msg" style="font-size:.78rem;color:#94a3b8">' + esc(st.message || "") + "</span>";

    if (!document.getElementById("evh-iscr-style")) {
      var stEl = document.createElement("style");
      stEl.id = "evh-iscr-style";
      stEl.textContent =
        ".evh-btn-iscr{display:inline-flex;align-items:center;background:#38bdf8;color:#0b0f19;font-weight:800;font-size:.82rem;padding:.5rem 1rem;border-radius:8px;border:0;cursor:pointer;font-family:inherit;text-decoration:none}" +
        ".evh-btn-iscr:hover{background:#7dd3fc}" +
        ".evh-btn-iscr--out{background:transparent;color:#f87171;border:1px solid rgba(248,113,113,.4)}" +
        ".evh-btn-iscr--login{background:rgba(56,189,248,.12);color:#7dd3fc;border:1px solid rgba(56,189,248,.3)}" +
        ".evh-btn-iscr:disabled{opacity:.55;cursor:wait}";
      document.head.appendChild(stEl);
    }

    card.appendChild(wrap);

    wrap.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-ev-iscr]");
      if (!btn) return;
      var action = btn.getAttribute("data-ev-iscr");
      btn.disabled = true;
      var msgEl = wrap.querySelector(".evh-iscr-msg");
      try {
        if (action === "in") {
          await I.register(kind, id, user);
          if (msgEl) msgEl.textContent = "Iscrizione confermata.";
        } else if (action === "out") {
          if (!confirm("Annullare la tua iscrizione?")) { btn.disabled = false; return; }
          await I.unregister(kind, id, user, st.myRow);
          if (msgEl) msgEl.textContent = "Iscrizione annullata.";
        }
        iscrizioni = await I.fetchIscrizioni(kind, id);
        st = I.status(kind, raw, iscrizioni, user);
        wrap.innerHTML = I.buttonHtml(st, {
          user: user,
          className: "evh-btn-iscr",
          registerLabel: "Iscriviti",
          unregisterLabel: "Annulla iscrizione",
          loginLabel: "Accedi per iscriverti"
        }) + '<span class="evh-iscr-msg" style="font-size:.78rem;color:#94a3b8">' + esc(st.message || "") + "</span>";
      } catch (err) {
        if (msgEl) msgEl.textContent = err.message || String(err);
        btn.disabled = false;
      }
    });
  }

  function start() {
    waitForBox(function (card) { enhance(card); });
    setTimeout(function () { waitForBox(function (card) { enhance(card); }); }, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
