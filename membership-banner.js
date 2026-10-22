/* CVI – banner per account in attesa di approvazione o sospesi */
(function () {
  "use strict";
  var ID = "cvi-membership-banner";

  function show(stato) {
    if (document.getElementById(ID)) return;
    var pending = stato === "pending";
    var bar = document.createElement("div");
    bar.id = ID;
    bar.setAttribute("role", "status");
    bar.style.cssText =
      "position:sticky;top:0;z-index:9999;padding:.6rem 1rem;text-align:center;" +
      "font:700 .88rem/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#0b0f19;" +
      "background:" + (pending ? "rgba(251,191,36,.95)" : "rgba(248,113,113,.95)") + ";" +
      "box-shadow:0 2px 10px rgba(0,0,0,.25)";
    bar.innerHTML =
      (pending ? "⏳ Account in attesa di approvazione. " : "⛔ Account sospeso. ") +
      'Puoi consultare solo i contenuti pubblici. <a href="profilo.html" style="color:#0b0f19;text-decoration:underline">Dettagli</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  async function check() {
    if (!window.CVI || !CVI.supabase) return;
    var path = (location.pathname || "").split("/").pop();
    if (path === "profilo.html") return; // il profilo ha già il suo banner
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
