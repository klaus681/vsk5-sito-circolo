/* CVI – patch pagina evento: Iscriviti / Annulla (robusto) */
(function () {
  "use strict";

  var started = false;

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name) || ""; }
    catch (e) { return ""; }
  }

  function ensureStyles() {
    if (document.getElementById("evp-iscr-style")) return;
    var style = document.createElement("style");
    style.id = "evp-iscr-style";
    style.textContent =
      ".evp-iscr-box{margin-top:1rem;padding:.85rem 1rem;border:1px solid rgba(56,189,248,.28);border-radius:10px;background:rgba(15,23,42,.45)}" +
      ".evp-iscr-box .evp-iscr-title{font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc;margin:0 0 .55rem}" +
      ".evp-btn-iscr{display:inline-flex;align-items:center;margin-right:.5rem;background:#38bdf8;color:#0b0f19;font-weight:800;font-size:.82rem;padding:.55rem 1.1rem;border-radius:8px;border:0;cursor:pointer;font-family:inherit;text-decoration:none}" +
      ".evp-btn-iscr:hover{background:#7dd3fc}" +
      ".evp-btn-iscr--out{background:transparent;color:#f87171;border:1px solid rgba(248,113,113,.45)}" +
      ".evp-btn-iscr--login{background:rgba(56,189,248,.15);color:#7dd3fc;border:1px solid rgba(56,189,248,.35)}" +
      ".evp-btn-iscr:disabled{opacity:.55;cursor:wait}" +
      ".evp-iscr-msg{margin:.5rem 0 0;font-size:.82rem;color:#94a3b8}" +
      ".evp-iscr-msg.ok{color:#4ade80}.evp-iscr-msg.err{color:#f87171}";
    document.head.appendChild(style);
  }

  function mountTarget() {
    return (
      document.querySelector(".evp-head") ||
      document.querySelector(".evp-hero") ||
      document.getElementById("event-detail")
    );
  }

  async function enhance() {
    if (document.getElementById("evp-iscr-actions")) return true;
    var kind = qs("tipo");
    var id = qs("id");
    if ((kind !== "serie" && kind !== "evento") || !id) return false;
    if (!window.CVI || !CVI.supabase) return false;
    if (!window.CVIEventiIscrizione || !window.CVIEventi) return false;

    var target = mountTarget();
    if (!target) return false;

    ensureStyles();
    var I = window.CVIEventiIscrizione;
    var E = window.CVIEventi;
    var table = kind === "serie" ? "serie_aperte" : "eventi_aperti";
    var rawRes = await CVI.supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (rawRes.error || !rawRes.data) return false;
    var raw = rawRes.data;
    var iscrizioni = await I.fetchIscrizioni(kind, id);
    var user = await E.currentUser();
    var st = I.status(kind, raw, iscrizioni, user);

    function render(st2) {
      var box = document.getElementById("evp-iscr-actions");
      if (!box) {
        box = document.createElement("div");
        box.id = "evp-iscr-actions";
        box.className = "evp-iscr-box";
        target.appendChild(box);
      }
      var btn = I.buttonHtml(st2, { user: user });
      if (!btn && !user) {
        btn = '<a class="evp-btn-iscr evp-btn-iscr--login" href="accedi.html">Accedi per iscriverti</a>';
      }
      if (!btn && user && !st2.isRegistered) {
        btn = '<button type="button" class="evp-btn-iscr" disabled style="opacity:.55;cursor:not-allowed">Iscrizioni non disponibili</button>';
      }
      box.innerHTML =
        '<p class="evp-iscr-title">Iscrizione</p>' +
        btn +
        '<p class="evp-iscr-msg" id="evp-iscr-msg">' + E.esc(st2.message || "") + "</p>";

      box.querySelectorAll("[data-ev-iscr]").forEach(function (b) {
        b.addEventListener("click", async function () {
          var action = b.getAttribute("data-ev-iscr");
          b.disabled = true;
          var msg = document.getElementById("evp-iscr-msg");
          try {
            if (action === "in") {
              await I.register(kind, id, user);
              if (msg) { msg.textContent = "Iscrizione confermata."; msg.className = "evp-iscr-msg ok"; }
            } else if (action === "out") {
              if (!confirm("Annullare la tua iscrizione a questo evento?")) {
                b.disabled = false;
                return;
              }
              await I.unregister(kind, id, user, st2.myRow);
              if (msg) { msg.textContent = "Iscrizione annullata."; msg.className = "evp-iscr-msg ok"; }
            }
            iscrizioni = await I.fetchIscrizioni(kind, id);
            st2 = I.status(kind, raw, iscrizioni, user);
            render(st2);
          } catch (err) {
            if (msg) { msg.textContent = err.message || String(err); msg.className = "evp-iscr-msg err"; }
            b.disabled = false;
          }
        });
      });
    }

    render(st);
    return true;
  }

  function start() {
    if (started) return;
    started = true;
    var tries = 0;
    function tick() {
      tries++;
      enhance().then(function (ok) {
        if (!ok && tries < 50) setTimeout(tick, 300);
      }).catch(function () {
        if (tries < 50) setTimeout(tick, 300);
      });
    }
    tick();
    try {
      var root = document.getElementById("event-detail") || document.body;
      var obs = new MutationObserver(function () {
        if (!document.getElementById("evp-iscr-actions")) enhance();
      });
      obs.observe(root, { childList: true, subtree: true });
      setTimeout(function () { obs.disconnect(); }, 20000);
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
