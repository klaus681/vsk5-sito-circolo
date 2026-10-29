/* CVI Admin Eventi – import CSV allineato a VSK Race Manager (stesso criterio Tornei) */
(function () {
  "use strict";
  if (window.__cviEaPatchLoaded) return;
  window.__cviEaPatchLoaded = true;

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
    var L = window.CVISerieAperte;
    if (L && typeof L.decodeBuffer === "function") return L.decodeBuffer(buffer);
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

  function libParser() {
    var L = window.CVISerieAperte;
    return L && typeof L.parseVskCsv === "function" ? L : null;
  }

  /* Nota mostrata nella tabella Eventi: stato (DNF/DSQ/...) oppure tempo. */
  function notaDaRiga(stato, tempoMs) {
    if (stato && stato !== "FIN") return stato;
    if (!tempoMs) return "";
    var L = libParser();
    if (L && typeof L.formatMs === "function") return L.formatMs(tempoMs);
    return formatTimeMs(tempoMs);
  }

  function vskImport(text) {
    var body = document.getElementById("ea-ris-body");
    if (!body) return 0;
    var L = libParser();

    /* 1) Stesso parser di Gare / Serie / Tornei: mapping delle colonne
       dall'header, pulizia nickname, dedupe e posizioni mancanti dai tempi. */
    if (L && typeof L.looksLikeVskCsv === "function" && L.looksLikeVskCsv(text)) {
      var rows = L.parseVskCsv(text);
      if (rows.length) {
        body.innerHTML = "";
        rows.forEach(function (p) {
          var nick = p.nickname || p.nickname_raw || "";
          if (!nick) return;
          addRow(
            p.posizione != null ? p.posizione : "",
            nick,
            "",
            notaDaRiga(p.stato, p.tempo_ms)
          );
        });
        return rows.length;
      }
    }

    /* 2) Fallback: log VSK riconosciuto dal criterio storico del pannello */
    if (looksLikeVskLog(text)) {
      var entries = parseVskLikeTool(text);
      if (!entries.length) {
        alert("Log VSK non riconosciuto o vuoto.");
        return 0;
      }
      body.innerHTML = "";
      var visti = {};
      var aggiunti = 0;
      entries.forEach(function (e, i) {
        var nick = e.cleanNick || e.username || "Skipper";
        var k = String(nick).trim().toLowerCase();
        if (!k || visti[k]) return; /* stesso dedupe del parser condiviso */
        visti[k] = true;
        addRow(
          e.pos != null ? e.pos : i + 1,
          nick,
          "",
          e.status === "FINISHED" ? e.formattedTime : "DNF"
        );
        aggiunti++;
      });
      return aggiunti;
    }

    /* 3) CSV generico: Posizione;Nickname;Team;Note */
    var rowsTxt = String(text || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(function (l) {
        return l.trim();
      });
    if (!rowsTxt.length) return 0;
    var sep = rowsTxt[0].split(";").length >= rowsTxt[0].split(",").length ? ";" : ",";
    var start = 0;
    if (/posiz|nick|skipper|rank/.test(rowsTxt[0].toLowerCase())) start = 1;
    body.innerHTML = "";
    var n = 0;
    for (var i = start; i < rowsTxt.length; i++) {
      var cols = rowsTxt[i].split(sep);
      var pos = parseInt(String(cols[0] || "").replace(/[^0-9]/g, ""), 10);
      var nick = cleanVskNickname(String(cols[1] || "").replace(/^"|"$/g, "").trim());
      var team = cleanVskNickname(String(cols[2] || "").replace(/^"|"$/g, "").trim());
      var note = String(cols[3] || "").replace(/^"|"$/g, "").trim();
      if (!nick) continue;
      addRow(isNaN(pos) ? "" : pos, nick, team, note);
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
    var textBtn = document.getElementById("ea-import-csv-text");

    /* Il pannello originale (caricato da CDN) aggancia i propri handler a
       #ea-csv-file e #ea-import-csv-text: li sostituiamo UNA sola volta,
       impostando anche _eaWired così il suo wire() non li riaggancia.
       Risultato: un solo import per file, sempre con lo stesso parser. */
    if (!window.__cviEaVskWired && (csvFile || textBtn)) {
      window.__cviEaVskWired = true;
      if (csvFile) {
        csvFile._eaWired = true;
        csvFile.onchange = function () {
          var f = this.files && this.files[0];
          if (!f) return;
          var input = this;
          var reader = new FileReader();
          reader.onload = function () {
            var n = vskImport(decodeCsvBuffer(reader.result));
            var hint = document.getElementById("ea-csv-hint");
            if (hint) {
              hint.textContent = n
                ? "Importati " + n + " skipper (log VSK / CSV). Controlla e premi Salva evento."
                : "Nessuno skipper trovato.";
              hint.style.color = n ? "#34d399" : "#f87171";
            }
            input.value = "";
          };
          reader.onerror = function () {
            alert("Impossibile leggere il file.");
            input.value = "";
          };
          reader.readAsArrayBuffer(f);
        };
      }
      if (textBtn) {
        textBtn._eaWired = true;
        textBtn.onclick = function (e) {
          if (e) e.preventDefault();
          var ta = document.getElementById("ea-csv-text");
          var val = ta ? ta.value : "";
          if (!val.trim()) {
            alert("Incolla prima il testo CSV (es. Posizione;Nickname;Team;Note).");
            return;
          }
          var n = vskImport(val);
          var hint = document.getElementById("ea-csv-hint");
          if (hint) {
            hint.textContent = n
              ? "Importati " + n + " skipper (log VSK / CSV). Controlla e premi Salva."
              : "Nessuno skipper trovato.";
            hint.style.color = n ? "#34d399" : "#f87171";
          }
        };
      }
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

  /* Il vincolo unique (evento_id, posizione) fa fallire il salvataggio se due
     righe hanno la stessa posizione (o nessuna: l'originale usa 1).
     Normalizziamo le posizioni in tabella prima di salvare. */
  function normalizeRisultatiRows() {
    var body = document.getElementById("ea-ris-body");
    if (!body) return;
    var usate = {};
    var next = 1;
    body.querySelectorAll("tr").forEach(function (tr) {
      var nickIn = tr.querySelector(".ea-nick");
      if (!nickIn || !String(nickIn.value || "").trim()) return;
      var posIn = tr.querySelector(".ea-pos");
      var pos = posIn ? parseInt(posIn.value, 10) : NaN;
      if (!pos || pos < 1 || usate[pos]) {
        while (usate[next]) next++;
        pos = next;
        if (posIn) posIn.value = String(pos);
      }
      usate[pos] = true;
      if (pos >= next) next = pos + 1;
    });
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

  function scrub(payload) {
    if (!payload) return payload;
    if (Array.isArray(payload)) return payload.map(scrub);
    var out = {};
    var ban = { scarti: 1, scarti_auto: 1, sistema_punteggio: 1 };
    Object.keys(payload).forEach(function (k) {
      if (!ban[k]) out[k] = payload[k];
    });
    return out;
  }

  /* Il salvataggio dell'evento lo fa il pannello originale (form.onsubmit).
     Qui lo intercettiamo per: normalizzare le posizioni (vincolo unique) e
     togliere dal payload i campi che appartengono alle serie, non agli eventi. */
  function patchSaveEvento() {
    var form = document.getElementById("ea-form");
    if (!form || typeof form.onsubmit !== "function") return false;
    if (form.onsubmit._cviWrapped) return true;
    var orig = form.onsubmit;
    var wrapped = async function (ev) {
      normalizeRisultatiRows();
      var sb = window.CVI && CVI.supabase;
      if (!sb || !sb.from) return orig.call(form, ev);
      var realFrom = sb.from.bind(sb);
      sb.from = function (table) {
        var q = realFrom(table);
        if (table !== "eventi_aperti") return q;
        var realInsert = q.insert && q.insert.bind(q);
        var realUpdate = q.update && q.update.bind(q);
        if (realInsert) {
          q.insert = function (payload) {
            return realInsert(scrub(payload));
          };
        }
        if (realUpdate) {
          q.update = function (payload) {
            return realUpdate(scrub(payload));
          };
        }
        return q;
      };
      try {
        return await orig.call(form, ev);
      } finally {
        sb.from = realFrom;
      }
    };
    wrapped._cviWrapped = true;
    form.onsubmit = wrapped;
    form._eaWired = true; /* il wire() originale non deve riagganciare saveEvento */
    return true;
  }

  function tick() {
    wireImport();
    patchLoadList();
    restyleAdminCards();
    scrubFormRows();
    patchSaveEvento();
  }

  function forceCleanSave() {
    if (!patchSaveEvento()) setTimeout(forceCleanSave, 500);
  }

  function ensureOrig(cb) {
    if (typeof window.loadEventiApertiAdmin === "function") {
      cb();
      return;
    }
    /* un solo caricamento del pannello originale, anche se questo file
       viene incluso due volte (admin.html + admin.js) */
    if (window.__cviEaOrigLoading) {
      setTimeout(function () {
        ensureOrig(cb);
      }, 300);
      return;
    }
    window.__cviEaOrigLoading = true;
    var s = document.createElement("script");
    s.src =
      "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@747ca063242f040098b27ce00f7a5d0815fa8231/eventi-aperti-admin.js";
    s.onload = cb;
    s.onerror = function () {
      window.__cviEaOrigLoading = false;
      cb();
    };
    document.head.appendChild(s);
  }

  ensureOrig(function () {
    tick();
    forceCleanSave();
    setTimeout(tick, 800);
    setTimeout(tick, 2000);
    setTimeout(tick, 4000);
    setTimeout(forceCleanSave, 1500);
  });
})();
