/* CVI Admin Eventi – import VSK = stesso criterio Tornei + nick puliti */
(function () {
  "use strict";

  function cleanNick(raw) {
    if (window.CVISerieAperte && typeof CVISerieAperte.cleanNick === "function") {
      var c = CVISerieAperte.cleanNick(raw);
      if (c) return c;
    }
    if (raw == null) return "";
    var s = String(raw);
    try {
      if (s.normalize) s = s.normalize("NFKC");
    } catch (e) {}
    s = s.replace(/\u00a0/g, " ");
    s = s.replace(/\$[0-9a-fA-F]{3}/gi, "");
    s = s.replace(/\$[isngzwomtlh$]/gi, "");
    s = s.replace(/\$[0-9a-fA-F]/gi, "");
    s = s.replace(/\$./g, "");
    s = s.replace(/\uFFFD/g, "");
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
    s = s.replace(/[\u0300-\u036F]/g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  function isNumericId(v) {
    return /^\d{4,}$/.test(String(v == null ? "" : v).trim());
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
      var badL = (latin.match(/\uFFFD/g) || []).length;
      if (badL < bad || !utf8) return latin;
    } catch (e2) {}
    return utf8 || "";
  }

  function vskImport(text) {
    var L = window.CVISerieAperte;
    if (!L || typeof L.parseVskCsv !== "function") {
      alert("Libreria VSK non caricata. Ricarica admin con Ctrl+F5.");
      return 0;
    }
    var body = document.getElementById("ea-ris-body");
    if (!body) return 0;

    var useVsk =
      (typeof L.looksLikeVskCsv === "function" && L.looksLikeVskCsv(text)) ||
      /\$[0-9a-fA-F]{2,3}/.test(text) ||
      (text.split(/\r?\n/).length > 2 && /\d{5,}/.test(text));

    if (useVsk) {
      var vsk = L.parseVskCsv(text);
      if (!vsk.length) {
        alert("Log VSK non riconosciuto o vuoto.");
        return 0;
      }
      body.innerHTML = "";
      vsk.forEach(function (p, i) {
        var nick = cleanNick(p.nickname || p.nickname_raw || "");
        var note = "";
        if (p.stato && p.stato !== "FIN") note = p.stato;
        else if (p.tempo) note = p.tempo;
        addRow(p.posizione != null ? p.posizione : i + 1, nick, "", note);
      });
      return vsk.length;
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
      var nick = cleanNick(String(cols[1] || "").replace(/^"|"$/g, "").trim());
      var team = cleanNick(String(cols[2] || "").replace(/^"|"$/g, "").trim());
      var note = String(cols[3] || "").replace(/^"|"$/g, "").trim();
      if (!nick) continue;
      addRow(isNaN(pos) ? n + 1 : pos, nick, team, note);
      n++;
    }
    return n;
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

  function scrubFormRows() {
    document.querySelectorAll("#ea-ris-body tr").forEach(function (tr) {
      var nickIn = tr.querySelector(".ea-nick");
      var teamIn = tr.querySelector(".ea-team");
      var noteIn = tr.querySelector(".ea-note");
      if (!nickIn) return;
      nickIn.value = cleanNick(nickIn.value);
      if (teamIn) teamIn.value = cleanNick(teamIn.value);
      if (noteIn && /\$|\uFFFD/.test(noteIn.value)) noteIn.value = cleanNick(noteIn.value);
    });
  }

  function restyleAdminCards() {
    document.querySelectorAll("#eventi-aperti-list .admin-card").forEach(function (card) {
      card.querySelectorAll("table tbody tr").forEach(function (tr) {
        var tds = tr.querySelectorAll("td");
        if (tds.length < 2) return;
        var nickTd = tds[1];
        var strong = nickTd.querySelector("strong") || nickTd;
        strong.textContent = cleanNick(strong.textContent);
        if (tds[2]) tds[2].textContent = cleanNick(tds[2].textContent) || "—";
        if (tds[3] && /\$|\uFFFD/.test(tds[3].textContent)) tds[3].textContent = cleanNick(tds[3].textContent) || "—";
      });
    });
  }

  function wireImport() {
    window.importEventoCsv = vskImport;

    var csvFile = document.getElementById("ea-csv-file");
    if (csvFile && !csvFile._cviVsk2) {
      csvFile._cviVsk2 = true;
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
                ? "Importati " + n + " skipper (parser VSK come Tornei). Controlla e premi Salva evento."
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
    if (textBtn && !textBtn._cviVsk2) {
      textBtn._cviVsk2 = true;
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
              ? "Importati " + n + " skipper (parser VSK). Controlla e premi Salva."
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
    if (window.loadEventiApertiAdmin._cviScrub2) return true;
    var orig = window.loadEventiApertiAdmin;
    window.loadEventiApertiAdmin = async function () {
      var r = await orig.apply(this, arguments);
      setTimeout(restyleAdminCards, 60);
      setTimeout(restyleAdminCards, 400);
      return r;
    };
    window.loadEventiApertiAdmin._cviScrub2 = true;
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
