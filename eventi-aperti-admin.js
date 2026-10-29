/* CVI Admin – Eventi aperti – bootstrap restore */
(function () {
  "use strict";
  var URLS = [
    "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@747ca063242f040098b27ce00f7a5d0815fa8231/eventi-aperti-admin.js",
    "https://raw.githubusercontent.com/klaus681/vsk5-sito-circolo/747ca063242f040098b27ce00f7a5d0815fa8231/eventi-aperti-admin.js"
  ];
  function load(i) {
    if (i >= URLS.length) {
      console.error("[CVI] impossibile ripristinare eventi-aperti-admin.js");
      return;
    }
    var s = document.createElement("script");
    s.src = URLS[i];
    s.onerror = function () { load(i + 1); };
    document.head.appendChild(s);
  }
  load(0);
})();
