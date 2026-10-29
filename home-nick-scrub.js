/* CVI – pulizia nickname podio Home (Serie / Eventi) */
(function () {
  "use strict";
  function clean(raw) {
    if (window.CVISerieAperte && typeof CVISerieAperte.cleanNick === "function") {
      var c = CVISerieAperte.cleanNick(raw);
      if (c) return c;
    }
    if (raw == null) return "";
    var s = String(raw);
    try { if (s.normalize) s = s.normalize("NFKC"); } catch (e) {}
    s = s.replace(/\u00a0/g, " ");
    s = s.replace(/\$[0-9a-fA-F]{3}/gi, "");
    s = s.replace(/\$[isngzwomtlh$]/gi, "");
    s = s.replace(/\$[0-9a-fA-F]/gi, "");
    s = s.replace(/\$./g, "");
    s = s.replace(/\uFFFD/g, "");
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
    s = s.replace(/[\u0300-\u036F]/g, "");
    return s.replace(/\s+/g, " ").trim() || String(raw).trim();
  }
  function scrub() {
    var root = document.getElementById("home-extra-banners") || document.body;
    if (!root) return;
    root.querySelectorAll("div").forEach(function (el) {
      if (el.children.length > 3) return;
      if (el.querySelector("input,button,a,img,svg,table")) return;
      var textNodes = [];
      el.childNodes.forEach(function (n) {
        if (n.nodeType === 3 && n.textContent && n.textContent.trim()) textNodes.push(n);
      });
      if (!textNodes.length) return;
      textNodes.forEach(function (n) {
        var t = n.textContent;
        if (!/\uFFFD|\$/.test(t) && t.length > 60) return;
        if (!/\uFFFD|\$/.test(t) && !/[^\x20-\x7E\u00C0-\u024F\s*@().,_-]/.test(t)) return;
        var cleaned = clean(t);
        if (cleaned && cleaned !== t.trim()) n.textContent = cleaned;
      });
    });
  }
  function run() { scrub(); }
  setTimeout(run, 900);
  setTimeout(run, 2000);
  setTimeout(run, 4500);
  if (document.body) {
    var obs = new MutationObserver(function () { setTimeout(run, 120); });
    obs.observe(document.body, { childList: true, subtree: true });
  }
})();
