/* CVI Virtual – shared nav bootstrap (restores full common + Proteste link) */
(function () {
  var SRC = "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@13591de807901bdfebe584db659d788ecd1d2bb1/common.js";
  function inject(code) {
    code = code.replace(
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche',",
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Classifiche', nav_proteste: 'Proteste',"
    );
    code = code.replace(
      "nav_gare_sub: 'Calendar', nav_classifiche: 'Standings',",
      "nav_gare_sub: 'Calendar', nav_classifiche: 'Standings', nav_proteste: 'Protests',"
    );
    code = code.replace(
      "nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements',",
      "nav_gare_sub: 'Calendrier', nav_classifiche: 'Classements', nav_proteste: 'Réclamations',"
    );
    code = code.replace(
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificación',",
      "nav_gare_sub: 'Calendario', nav_classifiche: 'Clasificación', nav_proteste: 'Protestas',"
    );
    code = code.replace("discord-notify.js?v=1", "discord-notify.js?v=2");
    var patch = "\n  var _ens = window.CVI && window.CVI.ensureNavLinks;\n  if (_ens) {\n    var _orig = _ens;\n    window.CVI.ensureNavLinks = function () {\n      _orig();\n      var dict = (window.CVI.currentLang && {it:{nav_proteste:'Proteste'},en:{nav_proteste:'Protests'},fr:{nav_proteste:'Réclamations'},es:{nav_proteste:'Protestas'}}[window.CVI.currentLang]) || {nav_proteste:'Proteste'};\n      var drop = document.querySelector('nav.nav-desktop .dropdown-menu');\n      if (drop && !drop.querySelector('a[href=\\\"proteste.html\\\"]')) {\n        var li = document.createElement('li');\n        var a = document.createElement('a');\n        a.href = 'proteste.html'; a.setAttribute('data-i18n','nav_proteste'); a.textContent = dict.nav_proteste;\n        li.appendChild(a); drop.appendChild(li);\n      }\n      var mob = document.querySelector('#navMobile .mobile-dropdown');\n      if (mob && !mob.querySelector('a[href=\\\"proteste.html\\\"]')) {\n        var am = document.createElement('a');\n        am.href = 'proteste.html'; am.setAttribute('data-i18n','nav_proteste'); am.textContent = '→ ' + dict.nav_proteste;\n        mob.appendChild(am);\n      }\n    };\n  }\n";
    // Append patch after IIFE closes poorly - instead eval base then run patch
    var s = document.createElement("script");
    s.textContent = code + "\n;" + patch;
    document.head.appendChild(s);
  }
  var xhr = new XMLHttpRequest();
  xhr.open("GET", SRC, false); // sync so callers after script tag work
  try {
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) inject(xhr.responseText);
    else console.error("[CVI] common.js restore failed", xhr.status);
  } catch (e) {
    console.error("[CVI] common.js restore", e);
  }
})();
