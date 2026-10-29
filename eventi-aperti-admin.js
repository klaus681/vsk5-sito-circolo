/* CVI Admin – Eventi aperti – carica parser VSK */
(function () {
  "use strict";
  var URLS = [
    "eventi-aperti-admin-vsk.js?v=3",
    "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@main/eventi-aperti-admin-vsk.js",
    "https://raw.githubusercontent.com/klaus681/vsk5-sito-circolo/main/eventi-aperti-admin-vsk.js"
  ];
  function load(i) {
    if (i >= URLS.length) {
      console.error("[CVI] eventi-aperti-admin-vsk.js non caricato");
      return;
    }
    var s = document.createElement("script");
    s.src = URLS[i];
    s.onerror = function () { load(i + 1); };
    document.head.appendChild(s);
  }
  load(0);
})();
