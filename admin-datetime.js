/* CVI Admin – migliora input data/ora: apre il calendario nativo */
(function () {
  "use strict";

  var STYLE_ID = "cvi-adm-datetime-style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      ".adm-datetime-wrap{position:relative;display:flex;align-items:center;gap:.4rem;width:100%}" +
      ".adm-datetime-wrap .adm-input{flex:1;min-width:0;color-scheme:dark;cursor:pointer}" +
      "input[type=datetime-local].adm-input,input[type=date].adm-input{color-scheme:dark;cursor:pointer}" +
      ".adm-datetime-btn{flex-shrink:0;width:42px;height:42px;border-radius:8px;" +
      "border:1px solid rgba(56,189,248,.4);background:rgba(56,189,248,.12);" +
      "color:#7dd3fc;font-size:1.15rem;cursor:pointer;line-height:1}" +
      ".adm-datetime-btn:hover{background:rgba(56,189,248,.25)}";
    document.head.appendChild(st);
  }

  function openPicker(el) {
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
        return;
      }
    } catch (e) {
      /* showPicker può fallire se non c'è gesture utente */
    }
    el.focus();
  }

  function enhance(input) {
    if (!input || input._cviDtEnhanced) return;
    input._cviDtEnhanced = true;
    input.style.colorScheme = "dark";
    input.style.cursor = "pointer";

    // click sul campo → apri calendario
    input.addEventListener("click", function () {
      openPicker(input);
    });
    input.addEventListener("focus", function () {
      // piccolo delay per evitare conflitti con focus
      setTimeout(function () {
        openPicker(input);
      }, 10);
    });

    // se già in un wrap, non raddoppiare
    if (input.parentElement && input.parentElement.classList.contains("adm-datetime-wrap"))
      return;

    var wrap = document.createElement("div");
    wrap.className = "adm-datetime-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adm-datetime-btn";
    btn.title = "Apri calendario";
    btn.setAttribute("aria-label", "Apri calendario");
    btn.textContent = "📅";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPicker(input);
    });
    wrap.appendChild(btn);
  }

  function scan() {
    injectStyle();
    document
      .querySelectorAll('input[type="datetime-local"], input[type="date"]')
      .forEach(enhance);
  }

  // MutationObserver: form dinamici (tornei, allenamenti, eventi)
  function observe() {
    var root = document.getElementById("admin-app") || document.body;
    if (!root || root._cviDtObs) return;
    root._cviDtObs = true;
    var obs = new MutationObserver(function () {
      scan();
    });
    obs.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    scan();
    observe();
    setTimeout(scan, 800);
    setTimeout(scan, 2000);
    setTimeout(scan, 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
