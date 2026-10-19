/* CVI - link Tutor nel menu */
(function () {
  "use strict";

  function labels() {
    var lang = (window.CVI && CVI.currentLang) || "it";
    return (
      {
        it: "Tutor",
        en: "Tutors",
        fr: "Tuteurs",
        es: "Tutores"
      }[lang] || "Tutor"
    );
  }

  function addLink() {
    var label = labels();
    var drop = document.querySelector("nav.nav-desktop .dropdown-menu");
    if (drop && !drop.querySelector('a[href="tutor.html"]')) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "tutor.html";
      a.textContent = label;
      var al = drop.querySelector('a[href="allenamenti.html"]');
      if (al && al.parentElement) {
        al.parentElement.insertAdjacentElement("afterend", li);
        li.appendChild(a);
      } else {
        li.appendChild(a);
        drop.appendChild(li);
      }
    }
    var mob = document.querySelector("#navMobile .mobile-dropdown");
    if (mob && !mob.querySelector('a[href="tutor.html"]')) {
      var am = document.createElement("a");
      am.href = "tutor.html";
      am.textContent = "\u2192 " + label;
      var mal = mob.querySelector('a[href="allenamenti.html"]');
      if (mal) mal.insertAdjacentElement("afterend", am);
      else mob.appendChild(am);
    }
  }

  function boot() {
    addLink();
    setTimeout(addLink, 300);
    setTimeout(addLink, 1200);
    setTimeout(addLink, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
