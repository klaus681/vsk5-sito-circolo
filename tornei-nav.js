/* CVI - link Tornei nel menu dropdown Gare & Eventi */
(function () {
  "use strict";

  function labels() {
    var lang = (window.CVI && CVI.currentLang) || "it";
    return (
      {
        it: "Tornei",
        en: "Tournaments",
        fr: "Tournois",
        es: "Torneos"
      }[lang] || "Tornei"
    );
  }

  function addTorneiLink() {
    var label = labels();
    var drop = document.querySelector("nav.nav-desktop .dropdown-menu");
    if (drop && !drop.querySelector('a[href="tornei.html"]')) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "tornei.html";
      a.textContent = label;
      a.setAttribute("data-i18n", "nav_tornei");
      // dopo Classifiche se presente
      var cls = drop.querySelector('a[href="classifiche.html"]');
      if (cls && cls.parentElement) {
        cls.parentElement.insertAdjacentElement("afterend", li);
        li.appendChild(a);
      } else {
        li.appendChild(a);
        drop.appendChild(li);
      }
    }
    var mob = document.querySelector("#navMobile .mobile-dropdown");
    if (mob && !mob.querySelector('a[href="tornei.html"]')) {
      var am = document.createElement("a");
      am.href = "tornei.html";
      am.textContent = "\u2192 " + label;
      am.setAttribute("data-i18n", "nav_tornei");
      var mcls = mob.querySelector('a[href="classifiche.html"]');
      if (mcls) mcls.insertAdjacentElement("afterend", am);
      else mob.appendChild(am);
    }
  }

  function boot() {
    addTorneiLink();
    // dopo ensureNavLinks di common (che ricostruisce a volte)
    setTimeout(addTorneiLink, 300);
    setTimeout(addTorneiLink, 1200);
    setTimeout(addTorneiLink, 2500);
    if (window.CVI && typeof CVI.ensureNavLinks === "function" && !CVI.ensureNavLinks._torneiWrapped) {
      var orig = CVI.ensureNavLinks;
      CVI.ensureNavLinks = function () {
        orig.apply(this, arguments);
        addTorneiLink();
      };
      CVI.ensureNavLinks._torneiWrapped = true;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
