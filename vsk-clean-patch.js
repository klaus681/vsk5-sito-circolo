/* CVI – cleanNick = algoritmo VSK Race Manager (riferimento ufficiale) */
(function () {
  function betterClean(raw) {
    if (raw == null || raw === "") return "";
    var clean = String(raw).replace(/\$([0-9a-fA-F]{3}|[isngzwomt$])/gi, "");
    clean = clean.replace(/\$[a-zA-Z0-9]/g, "").trim();
    clean = clean.replace(/\uFFFD/g, "");
    clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
    clean = clean.replace(/\s+/g, " ").trim();
    return clean || String(raw).trim();
  }
  function apply() {
    var L = window.CVISerieAperte;
    if (!L) {
      setTimeout(apply, 300);
      return;
    }
    L.cleanNick = betterClean;
  }
  apply();
  setTimeout(apply, 1000);
  setTimeout(apply, 3000);
})();
