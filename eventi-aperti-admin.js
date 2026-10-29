/* CVI Admin Eventi – import VSK robusto + ripulitura risultati sporchi */
(function () {
  "use strict";

  function cleanNick(raw) {
    if (window.CVISerieAperte && typeof CVISerieAperte.cleanNick === "function") {
      var c = CVISerieAperte.cleanNick(raw);
      if (c) return c;
    }
    if (raw == null) return "";
    var s = String(raw).replace(/\u00a0/g, " ");
    s = s.replace(/\$[0-9a-fA-F]{3}/g, "");
    s = s.replace(/\$[isngzwomt$]/g, "");
    s = s.replace(/\$[0-9a-fA-F]/g, "");
    s = s.replace(/\$./g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  function isNumericId(v) {
    return /^\d{4,}$/.test(String(v == null ? "" : v).trim());
  }

  function bestNick(row) {
    var nick = cleanNick(row.nickname);
    var team = cleanNick(row.team);
    var note = cleanNick(row.note);
    if (isNumericId(row.nickname) || isNumericId(nick)) {
      if (team) return team;
      if (note) return note;
    }
    if (nick && !/\$/.test(String(row.nickname || ""))) return nick;
    if (note) return note;
    if (team) return team;
    return nick || String(row.nickname || "").trim() || "—";
  }

  function bestTeam(row, label) {
    var team = cleanNick(row.team);
    if (!team) return "";
    if (team === label) return "";
    if (isNumericId(row.nickname) && team === label) return "";
    return team;
  }

  function bestNote(row) {
    var note = String(row.note || "");
    if (/\$/.test(note)) return "";
    var c = cleanNick(note);
    return c || "";
  }

  function scrubAdminList() {
    var cards = document.querySelectorAll("#eventi-aperti-list .admin-card");
    cards.forEach(function (card) {
      card.querySelectorAll("table tbody tr").forEach(function (tr) {
        var tds = tr.querySelectorAll("td");
        if (tds.length < 4) return;
        var nickTd = tds[1];
        var teamTd = tds[2];
        var noteTd = tds[3];
        var strong = nickTd.querySelector("strong") || nickTd;
        var rawNick = strong.textContent.trim();
        var rawTeam = teamTd.textContent.trim();
        var rawNote = noteTd.textContent.trim();
        if (!/\$/.test(rawNick + rawNote) && !isNumericId(rawNick)) return;
        var row = { nickname: rawNick, team: rawTeam === "—" ? "" : rawTeam, note: rawNote === "—" ? "" : rawNote };
        var label = bestNick(row);
        strong.textContent = label;
        var t = bestTeam(row, label);
        teamTd.textContent = t || "—";
        var n = bestNote(row);
        noteTd.textContent = n || "—";
      });
    });
  }

  function scrubFormRows() {
    document.querySelectorAll("#ea-ris-body tr").forEach(function (tr) {
      var nickIn = tr.querySelector(".ea-nick");
      var teamIn = tr.querySelector(".ea-team");
      var noteIn = tr.querySelector(".ea-note");
      if (!nickIn) return;
      var row = {
        nickname: nickIn.value,
        team: teamIn ? teamIn.value : "",
        note: noteIn ? noteIn.value : ""
      };
      if (!/\$/.test(row.nickname + row.note) && !isNumericId(row.nickname)) return;
      var label = bestNick(row);
      nickIn.value = label;
      if (teamIn) teamIn.value = bestTeam(row, label);
      if (noteIn) noteIn.value = bestNote(row);
    });
  }

  function vskImport(text) {
    var L = window.CVISerieAperte;
    if (!L || typeof L.parseVskCsv !== "function") {
      alert("Libreria VSK non caricata. Ricarica la pagina admin (Ctrl+F5).");
      return 0;
    }
    var useVsk =
      (typeof L.looksLikeVskCsv === "function" && L.looksLikeVskCsv(text)) ||
      /\$[0-9a-fA-F]{2,3}/.test(text) ||
      (text.split(/\r?\n/).length > 2 && /\d{5,}/.test(text));

    var body = document.getElementById("ea-ris-body");
    if (!body) return 0;

    if (useVsk) {
      var vsk = L.parseVskCsv(text);
      if (!vsk.length) {
        alert("Log VSK non riconosciuto o vuoto.");
        return 0;
      }
      body.innerHTML = "";
      vsk.forEach(function (p, i) {
        var nick = p.nickname || cleanNick(p.nickname_raw) || p.nickname_raw || "";
        var note = "";
        if (p.stato && p.stato !== "FIN") note = p.stato;
        else if (p.tempo) note = p.tempo;
        addRow(p.posizione != null ? p.posizione : i + 1, nick, "", note);
      });
      return vsk.length;
    }

    var rows = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(function (l) {
      return l.trim();
    });
    if (!rows.length) return 0;
    var sep = rows[0].split(";").length >= rows[0].split(",").length ? ";" : ",";
    var start = 0;
    var h = rows[0].toLowerCase();
    if (/posiz|nick|skipper|rank/.test(h)) start = 1;
    body.innerHTML = "";
    var n = 0;
    for (var i = start; i < rows.length; i++) {
      var cols = rows[i].split(sep);
      var pos = parseInt(String(cols[0] || "").replace(/[^0-9]/g, ""), 10);
      var nick = cleanNick(String(cols[1] || "").replace(/^"|"$/g, "").trim());
      var team = String(cols[2] || "").replace(/^"|"$/g, "").trim();
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
    tr.querySelector(".ea-rm").onclick = function () {
      tr.remove();
    };
  }

  function wireImport() {
    window.importEventoCsv = vskImport;

    var csvFile = document.getElementById("ea-csv-file");
    if (csvFile && !csvFile._cviVsk) {
      csvFile._cviVsk = true;
      csvFile.addEventListener(
        "change",
        function (e) {
          var f = this.files && this.files[0];
          if (!f) return;
          e.stopImmediatePropagation();
          var reader = new FileReader();
          reader.onload = function () {
            var n = vskImport(reader.result);
            var hint = document.getElementById("ea-csv-hint");
            if (hint) {
              hint.textContent = n
                ? "Importati " + n + " skipper da «" + f.name + "» (parser VSK). Controlla e premi Salva evento."
                : "Nessuno skipper trovato.";
              hint.style.color = n ? "#34d399" : "#f87171";
            }
            csvFile.value = "";
          };
          reader.readAsText(f, "UTF-8");
        },
        true
      );
    }

    var textBtn = document.getElementById("ea-import-csv-text");
    if (textBtn && !textBtn._cviVsk) {
      textBtn._cviVsk = true;
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
      btn.textContent = "Ripulisci nickname ($ / ID)";
      btn.style.marginLeft = "0.35rem";
      btn.onclick = function () {
        scrubFormRows();
        alert("Nickname ripuliti nel form. Premi Salva evento per confermare.");
      };
      var actions = form.querySelector(".form-actions") || form;
      actions.appendChild(btn);
    }
  }

  function patchLoadList() {
    if (typeof window.loadEventiApertiAdmin !== "function") return false;
    if (window.loadEventiApertiAdmin._cviScrub) return true;
    var orig = window.loadEventiApertiAdmin;
    window.loadEventiApertiAdmin = async function () {
      var r = await orig.apply(this, arguments);
      setTimeout(scrubAdminList, 50);
      setTimeout(scrubAdminList, 400);
      return r;
    };
    window.loadEventiApertiAdmin._cviScrub = true;
    return true;
  }

  function patchFillForm() {
    var body = document.getElementById("ea-ris-body");
    if (!body || body._cviObs) return;
    body._cviObs = true;
    var obs = new MutationObserver(function () {
      setTimeout(scrubFormRows, 30);
    });
    obs.observe(body, { childList: true });
  }

  function tick() {
    wireImport();
    patchLoadList();
    patchFillForm();
    scrubAdminList();
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
