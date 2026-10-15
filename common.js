/* CVI Virtual – shared nav bootstrap (Proteste + Eventi aperti) */
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
    var patch = [
      "",
      "  var _ens = window.CVI && window.CVI.ensureNavLinks;",
      "  if (_ens) {",
      "    var _orig = _ens;",
      "    window.CVI.ensureNavLinks = function () {",
      "      _orig();",
      "      function addDrop(href, label) {",
      "        var drop = document.querySelector('nav.nav-desktop .dropdown-menu');",
      "        if (drop && !drop.querySelector('a[href=\"' + href + '\"]')) {",
      "          var li = document.createElement('li');",
      "          var a = document.createElement('a');",
      "          a.href = href; a.textContent = label;",
      "          li.appendChild(a); drop.appendChild(li);",
      "        }",
      "        var mob = document.querySelector('#navMobile .mobile-dropdown');",
      "        if (mob && !mob.querySelector('a[href=\"' + href + '\"]')) {",
      "          var am = document.createElement('a');",
      "          am.href = href; am.textContent = '→ ' + label;",
      "          mob.appendChild(am);",
      "        }",
      "      }",
      "      var lang = window.CVI.currentLang || 'it';",
      "      var pr = ({ it: 'Proteste', en: 'Protests', fr: 'Réclamations', es: 'Protestas' })[lang] || 'Proteste';",
      "      addDrop('proteste.html', pr);",
      "      addDrop('eventi-aperti.html', 'Eventi aperti');",
      "    };",
      "  }",
      ""
    ].join("\n");
    var s = document.createElement("script");
    s.textContent = code + "\n;" + patch;
    document.head.appendChild(s);
  }
  var xhr = new XMLHttpRequest();
  xhr.open("GET", SRC, false);
  try {
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) inject(xhr.responseText);
    else console.error("[CVI] common.js restore failed", xhr.status);
  } catch (e) {
    console.error("[CVI] common.js restore", e);
  }
  try {
    var hs = document.createElement("script");
    hs.src = "eventi-aperti-home.js?v=2";
    hs.async = true;
    document.head.appendChild(hs);
  } catch (e2) {}
})();
