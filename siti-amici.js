/* CVI – blocco "Siti amici & link utili" in Home
   I link sono gestiti dal pannello Admin → Siti amici.
   Fallback: se Supabase non risponde, non mostra nulla. */
(function () {
  "use strict";

  var STYLE =
    ".lb-section{margin:1.6rem 0 0}" +
    ".lb-head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.85rem}" +
    ".lb-title{margin:0;font-size:1.2rem;font-weight:700;color:#fff}" +
    ".lb-sub{margin:0;font-size:.85rem;color:#94a3b8}" +
    ".lb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:.75rem}" +
    ".lb-card{display:flex;gap:.7rem;align-items:flex-start;text-decoration:none;background:var(--card-bg,#111827);border:1px solid rgba(56,189,248,.22);border-radius:12px;padding:.85rem .95rem;transition:border-color .2s ease,transform .2s ease,box-shadow .2s ease}" +
    ".lb-card:hover{border-color:rgba(56,189,248,.65);transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.25)}" +
    ".lb-ico{flex:0 0 auto;width:2.1rem;height:2.1rem;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.28)}" +
    ".lb-name{display:block;color:#e2e8f0;font-weight:700;font-size:.94rem;line-height:1.25}" +
    ".lb-desc{display:block;color:#94a3b8;font-size:.8rem;line-height:1.35;margin-top:.15rem}" +
    ".lb-go{display:inline-block;margin-top:.3rem;color:#7dd3fc;font-size:.78rem;font-weight:700}" +
    "@media(max-width:520px){.lb-grid{grid-template-columns:1fr}}";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderList(list) {
    if (document.getElementById("cvi-link-amici")) return;
    list = (list || []).filter(function (s) {
      return s && s.url && /^https?:\/\//i.test(s.url);
    });
    if (!list.length) return;

    var main =
      document.getElementById("main-content") ||
      document.querySelector("main.page-content") ||
      document.querySelector("main");
    if (!main) return;

    if (!document.getElementById("lb-home-styles")) {
      var st = document.createElement("style");
      st.id = "lb-home-styles";
      st.textContent = STYLE;
      document.head.appendChild(st);
    }

    var html =
      '<section id="cvi-link-amici" class="lb-section" aria-labelledby="lb-title">' +
      '<div class="lb-head">' +
      '<h2 class="lb-title" id="lb-title">Siti amici &amp; link utili</h2>' +
      '<p class="lb-sub">Realtà e risorse che seguiamo</p>' +
      "</div>" +
      '<div class="lb-grid">' +
      list
        .map(function (s) {
          return (
            '<a class="lb-card" href="' +
            esc(s.url) +
            '" target="_blank" rel="noopener noreferrer nofollow">' +
            '<span class="lb-ico" aria-hidden="true">' +
            (s.emoji ? esc(s.emoji) : "⚓") +
            "</span>" +
            "<span>" +
            '<span class="lb-name">' +
            esc(s.nome) +
            "</span>" +
            (s.descrizione
              ? '<span class="lb-desc">' + esc(s.descrizione) + "</span>"
              : "") +
            '<span class="lb-go">Visita →</span>' +
            "</span></a>"
          );
        })
        .join("") +
      "</div></section>";

    var row = main.querySelector(".content-row");
    if (row) row.insertAdjacentHTML("afterend", html);
    else main.insertAdjacentHTML("beforeend", html);
  }

  async function loadAndRender() {
    if (document.getElementById("cvi-link-amici")) return;
    try {
      if (!window.CVI || !CVI.supabase) return;
      var res = await CVI.supabase
        .from("siti_amici")
        .select("nome,url,descrizione,emoji,ordine")
        .eq("attivo", true)
        .order("ordine", { ascending: true });
      if (res.error) {
        console.warn("siti-amici:", res.error.message || res.error);
        return;
      }
      renderList(res.data || []);
    } catch (e) {
      console.warn("siti-amici load error", e);
    }
  }

  function boot() {
    loadAndRender();
    setTimeout(loadAndRender, 800);
    setTimeout(loadAndRender, 2200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
