/* CVI – pulizia classifica evento (nick + colonne come Tornei) */
(function () {
  "use strict";

  function cleanDisplayNick(raw) {
    if (window.CVISerieAperte && typeof CVISerieAperte.cleanNick === "function") {
      var c = CVISerieAperte.cleanNick(raw);
      if (c) raw = c;
    }
    if (raw == null || raw === "") return "";
    var s = String(raw);
    try {
      if (s.normalize) s = s.normalize("NFKC");
    } catch (e) {}
    s = s.replace(/\u00a0/g, " ");
    s = s.replace(/\$([0-9a-fA-F]{3}|[isngzwomt$])/gi, "");
    s = s.replace(/\$[a-zA-Z0-9]/g, "");
    s = s.replace(/\uFFFD/g, "");
    s = s.replace(/[©®°²³¹¼½¾¤¦§¨«»]/g, "");
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
    s = s.replace(/[\u0300-\u036F]/g, "");
    return s.replace(/\s+/g, " ").trim() || String(raw).trim();
  }

  function scrubTables() {
    document.querySelectorAll(".evp-table").forEach(function (table) {
      var ths = table.querySelectorAll("thead th");
      if (ths.length >= 4) {
        var h2 = (ths[2].textContent || "").trim().toLowerCase();
        var h3 = (ths[3].textContent || "").trim().toLowerCase();
        if (h2 === "team") ths[2].textContent = "Account";
        if (h3 === "note") {
          var hasTime = false;
          table.querySelectorAll("tbody tr").forEach(function (tr) {
            var tds = tr.querySelectorAll("td");
            if (tds[3] && /^\d{1,2}:\d{2}/.test((tds[3].textContent || "").trim())) hasTime = true;
          });
          if (hasTime) ths[3].textContent = "Tempo";
        }
      }

      table.querySelectorAll("tbody tr").forEach(function (tr) {
        var tds = tr.querySelectorAll("td");
        if (tds.length < 2) return;
        var nickCell = tds[1];
        var nickSpan = nickCell.querySelector(".evp-nick") || nickCell;
        var flag = nickSpan.querySelector("img, .flag, .evp-flag");
        var textNode = null;
        nickSpan.childNodes.forEach(function (n) {
          if (n.nodeType === 3 && n.textContent.trim()) textNode = n;
        });
        var raw = textNode ? textNode.textContent : nickSpan.textContent || "";
        var cleaned = cleanDisplayNick(raw);
        if (cleaned && cleaned !== raw.trim()) {
          if (textNode) textNode.textContent = cleaned;
          else if (!flag) nickSpan.textContent = cleaned;
          else {
            nickSpan.childNodes.forEach(function (n) {
              if (n.nodeType === 3) n.textContent = cleaned;
            });
          }
        }
        if (tds[2]) {
          var team = cleanDisplayNick(tds[2].textContent || "");
          if (team !== (tds[2].textContent || "").trim()) tds[2].textContent = team || "—";
        }
      });
    });
  }

  function run() {
    scrubTables();
  }
  setTimeout(run, 400);
  setTimeout(run, 1200);
  setTimeout(run, 2500);
  if (document.body) {
    var obs = new MutationObserver(function () {
      setTimeout(run, 80);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
})();
