/* CVI Admin – migliora input data/ora: apre il calendario nativo */
(function () {
  "use strict";

  var STYLE_ID = "cvi-adm-datetime-style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      ".adm-datetime-wrap{position:relative;display:flex;align-items:center;gap:.45rem;width:100%}" +
      ".adm-datetime-wrap .adm-input{flex:1;min-width:0;color-scheme:dark;cursor:pointer}" +
      "input[type=datetime-local].adm-input,input[type=date].adm-input{color-scheme:dark;cursor:pointer}" +
      ".adm-datetime-btn{" +
      "flex-shrink:0;width:44px;height:44px;border-radius:10px;" +
      "border:1px solid rgba(255,255,255,.35);" +
      "background:linear-gradient(135deg,#38bdf8,#0ea5e9);" +
      "color:#fff;font-size:1.2rem;cursor:pointer;line-height:1;" +
      "box-shadow:0 2px 10px rgba(14,165,233,.45);" +
      "filter:none;-webkit-filter:none" +
      "}" +
      ".adm-datetime-btn:hover{" +
      "background:linear-gradient(135deg,#7dd3fc,#38bdf8);" +
      "color:#0b0f19;" +
      "border-color:rgba(255,255,255,.6);" +
      "box-shadow:0 4px 16px rgba(56,189,248,.55)" +
      "}" +
      ".adm-datetime-btn:active{transform:scale(.96)}";
    document.head.appendChild(st);
  }

  function openPicker(el) {
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
        return;
      }
    } catch (e) {}
    el.focus();
  }

  function enhance(input) {
    if (!input || input._cviDtEnhanced) return;
    input._cviDtEnhanced = true;
    input.style.colorScheme = "dark";
    input.style.cursor = "pointer";

    input.addEventListener("click", function () {
      openPicker(input);
    });
    input.addEventListener("focus", function () {
      setTimeout(function () {
        openPicker(input);
      }, 10);
    });

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
    // SVG calendario bianco (visibile su qualsiasi sfondo)
    btn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<rect x="3" y="5" width="18" height="16" rx="2" stroke="#fff" stroke-width="2"/>' +
      '<path d="M3 10h18" stroke="#fff" stroke-width="2"/>' +
      '<path d="M8 3v4M16 3v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="8" cy="15" r="1.2" fill="#fff"/>' +
      '<circle cx="12" cy="15" r="1.2" fill="#fff"/>' +
      '<circle cx="16" cy="15" r="1.2" fill="#fff"/>' +
      "</svg>";
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
