/* CVI – Regolamento dinamico da site_settings.regolamento_json */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function chevronSvg() {
    return '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  }

  function buildToc(rules) {
    var toc = document.querySelector(".rules-toc ol");
    if (!toc) return;
    toc.innerHTML = rules
      .map(function (r) {
        var n = r.num != null ? r.num : "";
        return (
          '<li><a href="#regola-' +
          n +
          '">' +
          n +
          ". <span>" +
          esc(r.title || "") +
          "</span></a></li>"
        );
      })
      .join("");
  }

  function buildAccordion(rules) {
    var acc = document.getElementById("rulesAccordion");
    if (!acc) return;
    acc.innerHTML = rules
      .map(function (r) {
        var n = r.num != null ? r.num : 1;
        var id = "regola-" + n;
        var titleId = id + "-t";
        var bodyId = id + "-body";
        return (
          '<div class="rule-item" id="' +
          id +
          '">' +
          '<button type="button" class="rule-toggle" aria-expanded="false" aria-controls="' +
          bodyId +
          '">' +
          "<span><span class=\"rule-num\">" +
          n +
          '</span><span id="' +
          titleId +
          '">' +
          esc(r.title || "") +
          "</span></span>" +
          chevronSvg() +
          "</button>" +
          '<div class="rule-body" id="' +
          bodyId +
          '" role="region" aria-labelledby="' +
          titleId +
          '">' +
          '<div class="rule-body-inner">' +
          (r.body || "") +
          "</div></div></div>"
        );
      })
      .join("");
  }

  function applyMeta(data) {
    var meta = document.querySelector(".rules-meta");
    if (!meta) return;
    var parts = [];
    if (data.version) parts.push(esc(data.version));
    if (data.updated) parts.push(esc(data.updated));
    if (parts.length) meta.innerHTML = parts.join(" · ");
  }

  function rewireAccordion() {
    // Riusa la logica già presente in regolamento.html se esposta,
    // altrimenti re-inizializza in modo minimale.
    var items = document.querySelectorAll(".rule-item");
    items.forEach(function (item) {
      var toggle = item.querySelector(".rule-toggle");
      var body = item.querySelector(".rule-body");
      if (!toggle || !body || toggle._cviDyn) return;
      toggle._cviDyn = true;
      toggle.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
          body.style.maxHeight = body.scrollHeight + "px";
        } else {
          body.style.maxHeight = "0";
        }
      });
    });

    var expand = document.getElementById("rules-expand");
    if (expand) {
      expand.onclick = function () {
        items.forEach(function (it) {
          it.classList.add("is-open");
          var t = it.querySelector(".rule-toggle");
          var b = it.querySelector(".rule-body");
          if (t) t.setAttribute("aria-expanded", "true");
          if (b) b.style.maxHeight = b.scrollHeight + "px";
        });
      };
    }
    var collapse = document.getElementById("rules-collapse");
    if (collapse) {
      collapse.onclick = function () {
        items.forEach(function (it) {
          it.classList.remove("is-open");
          var t = it.querySelector(".rule-toggle");
          var b = it.querySelector(".rule-body");
          if (t) t.setAttribute("aria-expanded", "false");
          if (b) b.style.maxHeight = "0";
        });
      };
    }
  }

  async function loadDynamic() {
    try {
      if (!window.CVI || !CVI.supabase) return;
      var res = await CVI.supabase
        .from("site_settings")
        .select("value")
        .eq("key", "regolamento_json")
        .maybeSingle();
      if (res.error || !res.data || !res.data.value) return;

      var data =
        typeof res.data.value === "string"
          ? JSON.parse(res.data.value)
          : res.data.value;
      if (!data || !Array.isArray(data.rules) || !data.rules.length) return;

      applyMeta(data);
      buildToc(data.rules);
      buildAccordion(data.rules);
      rewireAccordion();

      // Apri sezione da hash se presente
      if (location.hash && location.hash.indexOf("#regola-") === 0) {
        var target = document.querySelector(location.hash);
        if (target) {
          target.classList.add("is-open");
          var t = target.querySelector(".rule-toggle");
          var b = target.querySelector(".rule-body");
          if (t) t.setAttribute("aria-expanded", "true");
          if (b) b.style.maxHeight = b.scrollHeight + "px";
          setTimeout(function () {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      }
    } catch (e) {
      console.warn("[CVI regolamento dinamico]", e);
    }
  }

  function boot() {
    // Attendi che CVI sia pronto
    function tryLoad(n) {
      if (window.CVI && CVI.supabase) {
        loadDynamic();
        return;
      }
      if (n > 20) return;
      setTimeout(function () {
        tryLoad(n + 1);
      }, 250);
    }
    tryLoad(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
