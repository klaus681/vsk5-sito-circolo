/* CVI – banner per account in attesa di approvazione, sospesi o bannati */
(function () {
  "use strict";
  var ID = "cvi-membership-banner";
  var lastStato = "";

  function tr(key, fallback) {
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : fallback;
  }

  function show(stato) {
    lastStato = stato || "";
    var pending = stato === "pending";
    var bar = document.getElementById(ID);
    if (!bar) {
      bar = document.createElement("div");
      bar.id = ID;
      bar.setAttribute("role", "status");
      bar.style.cssText =
        "position:sticky;top:0;z-index:9999;padding:.6rem 1rem;text-align:center;" +
        "font:700 .88rem/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#0b0f19;" +
        "box-shadow:0 2px 10px rgba(0,0,0,.25)";
      document.body.insertBefore(bar, document.body.firstChild);
    }
    var banned = stato === "bannato";
    bar.style.background = pending ? "rgba(251,191,36,.95)" : "rgba(248,113,113,.95)";
    bar.innerHTML =
      (banned
        ? tr("membership_banned", "🚫 Account bannato.")
        : pending
          ? tr("membership_pending", "⏳ Account in attesa di approvazione.")
          : tr("membership_suspended", "⛔ Account sospeso.")) +
      " " + (banned
        ? tr("membership_banned_help", "Non puoi usare le aree riservate del circolo.")
        : tr("membership_public_only", "Puoi consultare solo i contenuti pubblici.")) +
      ' <a href="profilo.html" style="color:#0b0f19;text-decoration:underline">' +
      tr("membership_details", "Dettagli") + "</a>";
  }

  document.addEventListener("cvi:langchange", function () {
    if (lastStato && document.getElementById(ID)) show(lastStato);
  });

  async function check() {
    if (!window.CVI || !CVI.supabase) return;
    var path = (location.pathname || "").split("/").pop();
    if (path === "profilo.html") return;
    try {
      var res = await CVI.supabase.auth.getSession();
      var session = res.data && res.data.session;
      if (!session || !session.user) return;
      var pr = await CVI.supabase.from("profiles").select("stato").eq("id", session.user.id).maybeSingle();
      if (pr.error || !pr.data || !pr.data.stato || pr.data.stato === "attivo") return;
      show(pr.data.stato);
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check);
  else check();
})();
