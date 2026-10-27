/* CVI – patch pagina evento: pulsante Iscriviti / Annulla iscrizione */
(function () {
  "use strict";

  function wait(cb, n) {
    n = n || 0;
    var head = document.querySelector(".evp-head");
    if (head && window.CVIEventiIscrizione && window.CVIEventi) return cb(head);
    if (n > 60) return;
    setTimeout(function () { wait(cb, n + 1); }, 200);
  }

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name) || ""; }
    catch (e) { return ""; }
  }

  async function run(head) {
    if (document.getElementById("evp-iscr-actions")) return;
    var kind = qs("tipo");
    var id = qs("id");
    if ((kind !== "serie" && kind !== "evento") || !id) return;
    if (!window.CVI || !CVI.supabase) return;

    var I = window.CVIEventiIscrizione;
    var E = window.CVIEventi;
    var table = kind === "serie" ? "serie_aperte" : "eventi_aperti";
    var rawRes = await CVI.supabase.from(table).select("*").eq("id", id).eq("pubblicato", true).maybeSingle();
    if (rawRes.error || !rawRes.data) return;
    var raw = rawRes.data;
    var iscrizioni = await I.fetchIscrizioni(kind, id);
    var user = await E.currentUser();
    var st = I.status(kind, raw, iscrizioni, user);

    if (!document.getElementById("evp-iscr-style")) {
      var style = document.createElement("style");
      style.id = "evp-iscr-style";
      style.textContent =
        ".evp-btn-iscr{display:inline-flex;align-items:center;margin-top:.85rem;margin-right:.5rem;background:#38bdf8;color:#0b0f19;font-weight:800;font-size:.82rem;padding:.55rem 1.1rem;border-radius:8px;border:0;cursor:pointer;font-family:inherit;text-decoration:none}" +
        ".evp-btn-iscr:hover{background:#7dd3fc}" +
        ".evp-btn-iscr--out{background:transparent;color:#f87171;border:1px solid rgba(248,113,113,.45)}" +
        ".evp-btn-iscr--login{background:rgba(56,189,248,.15);color:#7dd3fc;border:1px solid rgba(56,189,248,.35)}" +
        ".evp-btn-iscr:disabled{opacity:.55;cursor:wait}" +
        ".evp-iscr-msg{margin:.45rem 0 0;font-size:.8rem;color:#94a3b8}" +
        ".evp-iscr-msg.ok{color:#4ade80}.evp-iscr-msg.err{color:#f87171}";
      document.head.appendChild(style);
    }

    function render(st2) {
      var box = document.getElementById("evp-iscr-actions");
      if (!box) {
        box = document.createElement("div");
        box.id = "evp-iscr-actions";
        head.appendChild(box);
      }
      box.innerHTML =
        I.buttonHtml(st2, { user: user }) +
        '<p class="evp-iscr-msg" id="evp-iscr-msg">' + E.esc(st2.message || "") + "</p>";
      box.querySelectorAll("[data-ev-iscr]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var action = btn.getAttribute("data-ev-iscr");
          btn.disabled = true;
          var msg = document.getElementById("evp-iscr-msg");
          try {
            if (action === "in") {
              await I.register(kind, id, user);
              if (msg) { msg.textContent = "Iscrizione confermata."; msg.className = "evp-iscr-msg ok"; }
            } else if (action === "out") {
              if (!confirm("Annullare la tua iscrizione a questo evento?")) {
                btn.disabled = false;
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
            btn.disabled = false;
          }
        });
      });
    }

    render(st);
  }

  function start() {
    wait(run);
    setTimeout(function () { wait(run); }, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
