/* CVI – pulizia nickname classifica eventi (dati già salvati sporchi) */
(function () {
  "use strict";
  function cleanDisplayNick(raw) {
    if (raw == null || raw === "") return "";
    var L = window.CVISerieAperte;
    if (L && typeof L.cleanNick === "function") {
      var c = L.cleanNick(raw);
      if (c) return c;
    }
    var s = String(raw).replace(/\u00a0/g, " ");
    s = s.replace(/\$[0-9a-fA-F]{3}/g, "");
    s = s.replace(/\$[isngzwomt$]/g, "");
    s = s.replace(/\$[0-9a-fA-F]/g, "");
    s = s.replace(/\$./g, "");
    return s.replace(/\s+/g, " ").trim() || String(raw).trim();
  }
  function pickLabel(r) {
    var nick = cleanDisplayNick(r.nickname);
    var team = cleanDisplayNick(r.team);
    var note = cleanDisplayNick(r.note);
    var nickIsId = /^\d{5,}$/.test(String(r.nickname || "").trim()) || /^-?\d+$/.test(nick);
    if (nickIsId && team) return team;
    if (nickIsId && note) return note;
    return nick || team || note || String(r.nickname || "—");
  }
  function scrubTables() {
    var tables = document.querySelectorAll(".evp-table tbody tr");
    tables.forEach(function (tr) {
      var tds = tr.querySelectorAll("td");
      if (tds.length < 4) return;
      var nickCell = tds[1];
      var teamCell = tds[2];
      var noteCell = tds[3];
      if (!nickCell) return;
      var nickSpan = nickCell.querySelector(".evp-nick") || nickCell;
      var rawNick = nickSpan.textContent || "";
      var rawTeam = teamCell ? teamCell.textContent : "";
      var rawNote = noteCell ? noteCell.textContent : "";
      var r = { nickname: rawNick.trim(), team: rawTeam.trim(), note: rawNote.trim() };
      if (!/\$/.test(rawNick + rawNote) && !/^\d{5,}$/.test(rawNick.trim())) return;
      var label = pickLabel(r);
      var cleanedNote = /\$/.test(rawNote) ? "—" : cleanDisplayNick(rawNote);
      if (nickSpan.classList && nickSpan.classList.contains("evp-nick")) {
        var flag = nickSpan.querySelector(".cvi-flag-img, .ev-flag-empty, img");
        nickSpan.textContent = "";
        if (flag) nickSpan.appendChild(flag);
        nickSpan.appendChild(document.createTextNode(label));
      } else {
        nickCell.textContent = label;
      }
      if (teamCell && /^\d{5,}$/.test(rawNick.trim()) && rawTeam && rawTeam === label) {
        teamCell.textContent = "—";
      }
      if (noteCell && /\$/.test(rawNote)) noteCell.textContent = cleanedNote || "—";
    });
  }
  function run() {
    scrubTables();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(run, 800); setTimeout(run, 2000); });
  else { setTimeout(run, 800); setTimeout(run, 2000); }
  document.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest(".evp-tab")) setTimeout(run, 200);
  });
})();
