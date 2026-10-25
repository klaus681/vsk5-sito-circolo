/* CVI – aggiunge il link Privacy al footer di tutte le pagine */
(function () {
  "use strict";
  function add() {
    var foot = document.querySelector(".footer-bottom");
    if (!foot || foot.querySelector('a[href="privacy.html"]')) return;
    var a = document.createElement("a");
    a.href = "privacy.html";
    a.textContent = "Privacy";
    a.setAttribute("data-i18n", "footer_privacy");
    a.style.cssText = "color:#7dd3fc;margin-left:.85rem;text-decoration:none;font-weight:600";
    foot.appendChild(a);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
  else add();
  setTimeout(add, 1200);
})();
