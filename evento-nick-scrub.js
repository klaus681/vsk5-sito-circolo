/* CVI – pulizia nickname classifica eventi (stile Tornei) */
(function () {
  "use strict";
  function cleanDisplayNick(raw) {
    if (window.CVISerieAperte && typeof CVISerieAperte.cleanNick === "function") {
      var c = CVISerieAperte.cleanNick(raw);
      if (c) return c;
    }
    if (raw == null || raw === "") return "";
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
  function scrubTables() {
    document.querySelectorAll(".evp-table tbody tr").forEach(function (tr) {
      var tds = tr.querySelectorAll("td");
      if (tds.length < 2) return;
      var nickCell = tds[1];
      var nickSpan = nickCell.querySelector(".evp-nick") || nickCell;
      var raw = nickSpan.textContent || "";
      var cleaned = cleanDisplayNick(raw);
      if (cleaned && cleaned !== raw.trim()) {
        var flag = nickSpan.querySelector(".cvi-flag-img, .ev-flag-empty, img");
        nickSpan.textContent = "";
        if (flag) nickSpan.appendChild(flag);
        nickSpan.appendChild(document.createTextNode(cleaned));
      }
      if (tds[3] && /\$|\uFFFD/.test(tds[3].textContent || "")) {
        tds[3].textContent = cleanDisplayNick(tds[3].textContent) || "—";
      }
    });
  }
  function run() { scrubTables(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(run, 600); setTimeout(run, 1800); });
  else { setTimeout(run, 600); setTimeout(run, 1800); }
  document.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest(".evp-tab")) setTimeout(run, 250);
  });
})();
