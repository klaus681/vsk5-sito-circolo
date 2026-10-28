/* CVI – blocca registrazione se email in ban_list */
(function () {
  "use strict";
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  ready(function () {
    var form = document.getElementById("register-form");
    if (!form || !window.CVI || !CVI.supabase) return;
    form.addEventListener("submit", async function (e) {
      var emailEl = document.getElementById("email");
      var email = emailEl ? String(emailEl.value || "").trim() : "";
      if (!email) return;
      try {
        var br = await CVI.supabase.rpc("is_email_banned", { p_email: email });
        if (br.data === true) {
          e.preventDefault();
          e.stopImmediatePropagation();
          var msg = document.getElementById("reg-msg");
          if (msg) {
            msg.style.display = "block";
            msg.style.background = "rgba(248,113,113,0.12)";
            msg.style.color = "#f87171";
            msg.textContent = "Errore: questa email non può registrarsi (account bannato).";
            msg.focus();
          } else {
            alert("Questa email non può registrarsi (account bannato).");
          }
          var btn = document.getElementById("register-btn");
          if (btn) {
            btn.disabled = false;
            btn.removeAttribute("aria-busy");
          }
        }
      } catch (err) {
        /* ban-list-sql.sql non ancora eseguito */
      }
    }, true);
  });
})();
