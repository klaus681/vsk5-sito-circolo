/* CVI - link Biblioteca vicino a Download */
(function () {
  "use strict";

  function labels() {
    var lang = (window.CVI && CVI.currentLang) || "it";
    return (
      {
        it: "Biblioteca",
        en: "Library",
        fr: "Bibliothèque",
        es: "Biblioteca"
      }[lang] || "Biblioteca"
    );
  }

  function addLink() {
    var label = labels();
    var nav = document.querySelector("nav.nav-desktop ul");
    if (nav && !nav.querySelector('a[href="biblioteca.html"]')) {
      var dl = nav.querySelector('a[href="download.html"]');
      if (dl && dl.parentElement) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "biblioteca.html";
        a.textContent = label;
        a.setAttribute("data-i18n", "nav_biblioteca");
        li.appendChild(a);
        dl.parentElement.insertAdjacentElement("afterend", li);
      }
    }
    var mob = document.getElementById("navMobile");
    if (mob && !mob.querySelector('a[href="biblioteca.html"]')) {
      var mdl = mob.querySelector('a[href="download.html"]');
      var am = document.createElement("a");
      am.href = "biblioteca.html";
      am.textContent = label;
      am.setAttribute("data-i18n", "nav_biblioteca");
      if (mdl) mdl.insertAdjacentElement("afterend", am);
      else mob.appendChild(am);
    }
  }

  function boot() {
    addLink();
    setTimeout(addLink, 400);
    setTimeout(addLink, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
