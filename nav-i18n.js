/* CVI - traduzioni extra menu Gare & Eventi (Live, Tornei, Eventi, ...) */
(function () {
  "use strict";

  var EXTRA = {
    it: {
      nav_live: "Live",
      nav_tornei: "Tornei",
      nav_eventi: "Eventi",
      nav_eventi_aperti: "Eventi aperti",
      nav_cal_vista: "Vista calendario",
      nav_proteste: "Proteste",
      nav_gare_sub: "Calendario",
      nav_classifiche: "Classifiche",
      nav_risorse: "Download e Risorse"
    },
    en: {
      nav_live: "Live",
      nav_tornei: "Tournaments",
      nav_eventi: "Events",
      nav_eventi_aperti: "Open events",
      nav_cal_vista: "Calendar view",
      nav_proteste: "Protests",
      nav_gare_sub: "Calendar",
      nav_classifiche: "Standings",
      nav_risorse: "Downloads & Resources"
    },
    fr: {
      nav_live: "Direct",
      nav_tornei: "Tournois",
      nav_eventi: "Événements",
      nav_eventi_aperti: "Événements ouverts",
      nav_cal_vista: "Vue calendrier",
      nav_proteste: "Réclamations",
      nav_gare_sub: "Calendrier",
      nav_classifiche: "Classements",
      nav_risorse: "Téléchargements & Ressources"
    },
    es: {
      nav_live: "En vivo",
      nav_tornei: "Torneos",
      nav_eventi: "Eventos",
      nav_eventi_aperti: "Eventos abiertos",
      nav_cal_vista: "Vista calendario",
      nav_proteste: "Protestas",
      nav_gare_sub: "Calendario",
      nav_classifiche: "Clasificación",
      nav_risorse: "Descargas y Recursos"
    }
  };

  var LINK_KEYS = {
    "live.html": "nav_live",
    "tornei.html": "nav_tornei",
    "eventi.html": "nav_eventi",
    "calendario.html": "nav_cal_vista",
    "proteste.html": "nav_proteste",
    "gare.html": "nav_gare_sub",
    "classifiche.html": "nav_classifiche"
  };

  function currentDict() {
    var lang = (window.CVI && CVI.currentLang) || "it";
    return EXTRA[lang] || EXTRA.it;
  }

  function fileOf(a) {
    var href = (a.getAttribute("href") || "").split("#")[0].split("?")[0];
    return href.split("/").pop();
  }

  function ensureLiveMobile() {
    var mob = document.querySelector("#navMobile .mobile-dropdown");
    if (!mob || mob.querySelector('a[href="live.html"]')) return;
    var a = document.createElement("a");
    a.href = "live.html";
    a.setAttribute("data-i18n", "nav_live");
    a.textContent = "\u2192 Live";
    var cal = mob.querySelector('a[href="gare.html"]');
    if (cal) cal.insertAdjacentElement("afterend", a);
    else mob.appendChild(a);
  }

  function annotate() {
    document
      .querySelectorAll("nav.nav-desktop .dropdown-menu a, #navMobile .mobile-dropdown a")
      .forEach(function (a) {
        if (a.getAttribute("data-i18n")) return;
        var key = LINK_KEYS[fileOf(a)];
        if (key) a.setAttribute("data-i18n", key);
      });
  }

  function applyExtra() {
    var dict = currentDict();
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] == null) return;
      el.textContent = dict[key];
    });
  }

  function fixMobileArrows() {
    document.querySelectorAll("#navMobile .mobile-dropdown a").forEach(function (a) {
      var t = (a.textContent || "").trim();
      if (t && t.indexOf("\u2192") !== 0) a.textContent = "\u2192 " + t;
    });
  }

  function refresh() {
    ensureLiveMobile();
    annotate();
    applyExtra();
    fixMobileArrows();
  }

  if (window.CVI && typeof CVI.applyI18n === "function" && !CVI.applyI18n._cviMenuExtra) {
    var orig = CVI.applyI18n;
    CVI.applyI18n = function () {
      orig.apply(this, arguments);
      refresh();
    };
    CVI.applyI18n._cviMenuExtra = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh);
  else refresh();
  [300, 1200, 2500].forEach(function (ms) {
    setTimeout(refresh, ms);
  });
})();
