/* CVI Admin Eventi – import CSV allineato a VSK Race Manager (stesso criterio Tornei) */
(function () {
  "use strict";

  function cleanVskNickname(rawNick) {
    if (!rawNick) return "";
    var clean = String(rawNick).replace(/\$([0-9a-fA-F]{3}|[isngzwomt$])/gi, "");
    clean = clean.replace(/\$[a-zA-Z0-9]/g, "").trim();
    clean = clean.replace(/\uFFFD/g, "");
    clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
    clean = clean.replace(/\s+/g, " ").trim();
    return clean || String(rawNick).trim();
  }

  function formatTimeMs(ms) {
    if (ms === null || ms === undefined || isNaN(ms) || ms <= 0) return "DNF";
    var totalSeconds = ms / 1000;
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = (totalSeconds % 60).toFixed(3);
    var formattedMin = minutes < 10 ? "0" + minutes : String(minutes);
    var formattedSec = parseFloat(seconds) < 10 ? "0" + seconds : String(seconds);
    return formattedMin + ":" + formattedSec;
  }

  function parseVskLikeTool(text) {
    var lines = String(text || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(function (line) {
        return line.trim() !== "";
      });
    var entries = [];
    lines.forEach(function (line) {
      var delimiter = line.indexOf(";") >= 0 ? ";" : ",";
      var parts = line.split(delimiter).map(function (p) {
        return p.trim().replace(/^"|"$/g, "");
      });
      if (parts.length < 3) return;
      var rawPos = parseInt(parts[0], 10);
      if (isNaN(rawPos)) return;
      var rawMs = parseInt(parts[1], 10);
      if (isNaN(rawMs)) rawMs = 0;
      var username = parts[2] || "Player";
      var rawNick = parts[3] || username;
      entries.push({
        pos: rawPos,
        ms: rawMs,
        formattedTime: formatTimeMs(rawMs),
        username: username,
        rawNick: rawNick,
        cleanNick: cleanVskNickname(rawNick),
        status: rawMs > 0 ? "FINISHED" : "DNF"
      });
    });
    return entries;
  }

  function decodeCsvBuffer(buffer) {
    var u8 = new Uint8Array(buffer);
    var utf8 = "";
    try {
      utf8 = new TextDecoder("utf-8", { fatal: false }).decode(u8);
    } catch (e) {
      utf8 = "";
    }
    var bad = (utf8.match(/\uFFFD/g) || []).length;
    if (bad === 0 && utf8) return utf8;
    try {
      var latin = new TextDecoder("iso-8859-1").decode(u8);
      if ((latin.match(/\uFFFD/g) || []).length < bad || !utf8) return latin;
    } catch (e2) {}
    return utf8 || "";
  }

  function looksLikeVskLog(text) {
    var lines = String(text || "").split(/\r?\n/).filter(function (l) {
      return l.trim();
    });
    if (lines.length < 1) return false;
    var sample = lines[0];
    var delim = sample.indexOf(";") >= 0 ? ";" : ",";
    var parts = sample.split(delim);
    if (parts.length >= 3 && /^\d+$/.test(parts[0].trim()) && /^\d+$/.test(parts[1].trim())) return true;
    if (/\$[0-9a-fA-F]{2,3}/.test(text)) return true;
    if (window.CVISerieAperte && typeof CVISerieAperte.looksLikeVskCsv === "function") {
      return CVISerieAperte.looksLikeVskCsv(text);
    }
    return false;
  }

  function addRow(pos, nick, team, note) {
    var body = document.getElementById("ea-ris-body");
    if (!body) return;
    if (typeof window.addRisRow === "function") {
      try {
        window.addRisRow(pos, nick, team, note);
        return;
      } catch (e) {}
    }
    var tr = document.createElement("tr");
    function q(s) {
      return String(s == null ? "" : s).replace(/"/g, "&" + "quot;");
    }
    tr.innerHTML =
      '<td><input type="number" min="1" class="adm-input ea-pos" value="' +
      q(pos) +
      '" style="width:4rem"></td>' +
      '<td><input type="text" class="adm-input ea-nick" value="' +
      q(nick) +
      '" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input ea-team" value="' +
      q(team) +
      '" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input ea-note" value="' +
      q(note) +
      '" style="width:100%"></td>' +
      '<td><button type="button" class="btn-danger-sm ea-rm">×</button></td>';
    body.appendChild(tr);
    var rm = tr.querySelector(".ea-rm");
    if (rm)
      rm.onclick = function () {
        tr.remove();
      };
  }

  function vskImport(text) {
    var body = document.getElementById("ea-ris-body");
    if (!body) return 0;

    if (looksLikeVskLog(text)) {
      var entries = parseVskLikeTool(text);
      if (!entries.length && window.CVISerieAperte && typeof CVISerieAperte.parseVskCsv === "function") {
        var vsk = CVISerieAperte.parseVskCsv(text);
        entries = vsk.map(function (p) {
          return {
            pos: p.posizione,
            ms: p.tempo_ms || 0,
            formattedTime: p.tempo || (p.stato && p.stato !== "FIN" ? p.stato : "DNF"),
            username: p.account_vsk || "",
            cleanNick: cleanVskNickname(p.nickname || p.nickname_raw || ""),
            status: p.stato === "FIN" || (p.tempo_ms && p.tempo_ms > 0) ? "FINISHED" : "DNF"
          };
        });
      }
      if (!entries.length) {
        alert("Log VSK non riconosciuto o vuoto.");
        return 0;
      }
      body.innerHTML = "";
      entries.forEach(function (e, i) {
        var nick = e.cleanNick || e.username || "Skipper";
        var note = e.status === "FINISHED" ? e.formattedTime : "DNF";
        var team = e.username && e.username !== nick ? e.username : "";
        addRow(e.pos != null ? e.pos : i + 1, nick, team, note);
      });
      return entries.length;
    }

    var rows = String(text || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(function (l) {
        return l.trim();
      });
    if (!rows.length) return 0;
    var sep = rows[0].split(";").length >= rows[0].split(",").length ? ";" : ",";
    var start = 0;
    if (/posiz|nick|skipper|rank/.test(rows[0].toLowerCase())) start = 1;
    body.innerHTML = "";
    var n = 0;
    for (var i = start; i < rows.length; i++) {
      var cols = rows[i].split(sep);
      var pos = parseInt(String(cols[0] || "").replace(/[^0-9]/g, ""), 10);
      var nick = cleanVskNickname(String(cols[1] || "").replace(/^"|"$/g, "").trim());
      var team = cleanVskNickname(String(cols[2] || "").replace(/^"|"$/g, "").trim());
      var note = String(cols[3] || "").replace(/^"|"$/g, "").trim();
      if (!nick) continue;
      addRow(isNaN(pos) ? n + 1 : pos, nick, team, note);
      n++;
    }
    return n;
  }

  function scrubFormRows() {
    document.querySelectorAll("#ea-ris-body tr").forEach(function (tr) {
      var nickIn = tr.querySelector(".ea-nick");
      var teamIn = tr.querySelector(".ea-team");
      if (nickIn) nickIn.value = cleanVskNickname(nickIn.value);
      if (teamIn) teamIn.value = cleanVskNickname(teamIn.value);
    });
  }

  function restyleAdminCards() {
    document.querySelectorAll("#eventi-aperti-list .admin-card").forEach(function (card) {
      card.querySelectorAll("table tbody tr").forEach(function (tr) {
        var tds = tr.querySelectorAll("td");
        if (tds.length < 2) return;
        var strong = tds[1].querySelector("strong") || tds[1];
        strong.textContent = cleanVskNickname(strong.textContent);
        if (tds[2]) tds[2].textContent = cleanVskNickname(tds[2].textContent) || "—";
      });
    });
  }

  function wireImport() {
    window.importEventoCsv = vskImport;

    var csvFile = document.getElementById("ea-csv-file");
    if (csvFile && !csvFile._cviRef) {
      csvFile._cviRef = true;
      csvFile.addEventListener(
        "change",
        function (e) {
          var f = this.files && this.files[0];
          if (!f) return;
          e.stopImmediatePropagation();
          var reader = new FileReader();
          reader.onload = function () {
            var text = decodeCsvBuffer(reader.result);
            var n = vskImport(text);
            var hint = document.getElementById("ea-csv-hint");
            if (hint) {
              hint.textContent = n
                ? "Importati " + n + " skipper (VSK Race Manager). Controlla e premi Salva evento."
                : "Nessuno skipper trovato.";
              hint.style.color = n ? "#34d399" : "#f87171";
            }
            csvFile.value = "";
          };
          reader.readAsArrayBuffer(f);
        },
        true
      );
    }

    var textBtn = document.getElementById("ea-import-csv-text");
    if (textBtn && !textBtn._cviRef) {
      textBtn._cviRef = true;
      textBtn.addEventListener(
        "click",
        function (e) {
          var ta = document.getElementById("ea-csv-text");
          var val = ta ? ta.value : "";
          if (!val.trim()) return;
          e.stopImmediatePropagation();
          e.preventDefault();
          var n = vskImport(val);
          var hint = document.getElementById("ea-csv-hint");
          if (hint) {
            hint.textContent = n
              ? "Importati " + n + " skipper (VSK Race Manager). Controlla e premi Salva."
              : "Nessuno skipper trovato.";
            hint.style.color = n ? "#34d399" : "#f87171";
          }
        },
        true
      );
    }

    var form = document.getElementById("ea-form");
    if (form && !document.getElementById("ea-scrub-btn")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "ea-scrub-btn";
      btn.className = "btn-sm";
      btn.textContent = "Ripulisci nickname";
      btn.style.marginLeft = "0.35rem";
      btn.onclick = function () {
        scrubFormRows();
        alert("Nickname ripuliti. Premi Salva evento per confermare.");
      };
      var actions = form.querySelector(".form-actions") || form;
      actions.appendChild(btn);
    }
  }

  function patchLoadList() {
    if (typeof window.loadEventiApertiAdmin !== "function") return false;
    if (window.loadEventiApertiAdmin._cviRef) return true;
    var orig = window.loadEventiApertiAdmin;
    window.loadEventiApertiAdmin = async function () {
      var r = await orig.apply(this, arguments);
      setTimeout(restyleAdminCards, 60);
      setTimeout(restyleAdminCards, 400);
      return r;
    };
    window.loadEventiApertiAdmin._cviRef = true;
    return true;
  }

  function tick() {
    wireImport();
    patchLoadList();
    restyleAdminCards();
    scrubFormRows();
  }

  function ensureOrig(cb) {
    if (typeof window.loadEventiApertiAdmin === "function") {
      cb();
      return;
    }
    var s = document.createElement("script");
    s.src =
      "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@747ca063242f040098b27ce00f7a5d0815fa8231/eventi-aperti-admin.js";
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  ensureOrig(function () {
    tick();
    setTimeout(tick, 800);
    setTimeout(tick, 2000);
    setTimeout(tick, 4000);
  });
})();
