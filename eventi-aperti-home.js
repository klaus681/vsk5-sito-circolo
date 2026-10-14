/* CVI – box Eventi aperti in Home (se mostra_home) */
(function () {
  "use strict";
  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }
  async function run() {
    if (!window.CVI || !CVI.supabase) return;
    var path = (location.pathname || "").toLowerCase();
    if (path.indexOf("index") === -1 && path !== "/" && path.slice(-1) !== "/") return;
    try {
      var res = await CVI.supabase
        .from("eventi_aperti")
        .select("id,titolo,data_evento,descrizione")
        .eq("pubblicato", true)
        .eq("mostra_home", true)
        .order("data_evento", { ascending: false, nullsFirst: false })
        .limit(1);
      if (res.error || !res.data || !res.data.length) return;
      var e = res.data[0];
      var ris = await CVI.supabase
        .from("eventi_aperti_risultati")
        .select("posizione,nickname,team")
        .eq("evento_id", e.id)
        .order("posizione")
        .limit(10);
      var rows = ris.data || [];
      var dateStr = "";
      try {
        if (e.data_evento) {
          dateStr = new Date(e.data_evento).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
        }
      } catch (err) {}
      var list = rows.length
        ? rows.map(function (r) {
            return '<li style="margin:.2rem 0"><strong style="color:#7dd3fc">' +
              esc(r.posizione) + ".</strong> " + esc(r.nickname) +
              (r.team ? ' <span style="color:#94a3b8">(' + esc(r.team) + ")</span>" : "") +
              "</li>";
          }).join("")
        : '<li style="color:#64748b">Classifica in aggiornamento</li>';
      var html =
        '<section id="cvi-eventi-aperti-home" class="content-row" style="margin-top:1.5rem">' +
        '<div class="content-box" style="max-width:100%">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">' +
        "<div><h2 style=\"margin:0;color:#fff;font-size:1.25rem\">Evento aperto</h2>" +
        '<p style="margin:.35rem 0 0;color:#94a3b8;font-size:.9rem">Classifica separata · non ufficiali soci</p></div>' +
        '<a href="eventi-aperti.html" class="link-more" style="color:#7dd3fc">Vedi tutto →</a></div>' +
        '<h3 style="margin:1rem 0 .25rem;color:#7dd3fc;font-size:1.05rem">' + esc(e.titolo) + "</h3>" +
        (dateStr ? '<div style="color:#94a3b8;font-size:.85rem;margin-bottom:.65rem">' + esc(dateStr) + "</div>" : "") +
        '<ol style="list-style:none;padding:0;margin:0;color:#e2e8f0;font-size:.92rem">' + list + "</ol>" +
        "</div></section>";
      var main = document.getElementById("main-content") || document.querySelector("main.page-content");
      if (!main) return;
      if (document.getElementById("cvi-eventi-aperti-home")) return;
      var anchor = main.querySelector(".content-row");
      if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
      else main.insertAdjacentHTML("beforeend", html);
    } catch (e) {
      console.warn("[CVI eventi aperti home]", e);
    }
  }
  function start() {
    setTimeout(run, 1200);
    setTimeout(run, 3000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
