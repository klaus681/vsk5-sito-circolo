/* CVI – bridge: carica common funzionante + extra */
(function () {
  "use strict";
  var GOOD =
    "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@fcfda77768bf8325478797c745a9d65cf1f133d6/common.js";
  var s = document.createElement("script");
  s.src = GOOD;
  s.async = false;
  s.onload = function () {
    try {
      if (window.CVI && typeof CVI.ensureNavLinks === "function") {
        var _ens = CVI.ensureNavLinks;
        CVI.ensureNavLinks = function () {
          _ens();
          function addDrop(href, label) {
            var drop = document.querySelector("nav.nav-desktop .dropdown-menu");
            if (drop && !drop.querySelector('a[href="' + href + '"]')) {
              var li = document.createElement("li");
              var a = document.createElement("a");
              a.href = href;
              a.textContent = label;
              li.appendChild(a);
              drop.appendChild(li);
            }
            var mob = document.querySelector("#navMobile .mobile-dropdown");
            if (mob && !mob.querySelector('a[href="' + href + '"]')) {
              var am = document.createElement("a");
              am.href = href;
              am.textContent = "→ " + label;
              mob.appendChild(am);
            }
          }
          var lang = (window.CVI && CVI.currentLang) || "it";
          var calLabel =
            ({ it: "Vista calendario", en: "Calendar view", fr: "Vue calendrier", es: "Vista calendario" })[lang] ||
            "Vista calendario";
          var pr =
            ({ it: "Proteste", en: "Protests", fr: "Réclamations", es: "Protestas" })[lang] || "Proteste";
          addDrop("calendario.html", calLabel);
          addDrop("proteste.html", pr);
          addDrop("eventi-aperti.html", "Eventi aperti");
        };
      }
    } catch (e) {}
    try {
      if (/profilo\.html/i.test(location.pathname + location.href)) {
        var s2 = document.createElement("script");
        s2.src = "profilo-nazionalita.js?v=1";
        s2.async = true;
        document.head.appendChild(s2);
      }
    } catch (e2) {}
  };
  s.onerror = function () {
    console.error("[CVI] Impossibile caricare common.js di backup");
  };
  document.head.appendChild(s);
})();
