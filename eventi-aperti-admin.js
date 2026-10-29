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

  /* ---------- Import log VSK multi-regata (eventi_aperti_regate) ---------- */

  function titoloDaFile(name) {
    var base = String(name || "").replace(/\.(csv|txt)$/i, "");
    var m = base.match(/(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})/);
    if (m) {
      var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      if (!isNaN(d.getTime())) {
        return {
          titolo:
            "Regata " +
            d.toLocaleString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            }),
          data: d.toISOString()
        };
      }
    }
    var m2 = base.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
    if (m2) {
      var d2 = new Date(+m2[1], +m2[2] - 1, +m2[3], 12, 0, 0);
      return { titolo: "Regata " + d2.toLocaleDateString("it-IT"), data: d2.toISOString() };
    }
    return { titolo: base || "Regata VSK", data: null };
  }

  function readFileBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(r.result);
      };
      r.onerror = function () {
        reject(r.error || new Error("lettura fallita"));
      };
      r.readAsArrayBuffer(file);
    });
  }

  function eventoCorrente() {
    var el = document.getElementById("ea-id");
    return el ? String(el.value || "").trim() : "";
  }

  function vskLog(msg, color) {
    var el = document.getElementById("ea-vsk-log");
    if (!el) return;
    var p = document.createElement("div");
    p.style.color = color || "#cbd5e1";
    p.textContent = msg;
    el.appendChild(p);
  }

  var scoreLoadedFor = "";

  /* Carica sistema/scarti dell'evento aperto in modifica */
  async function refreshScoreInputs() {
    var el = document.getElementById("ea-vsk-score");
    var id = eventoCorrente();
    if (!el || !id || scoreLoadedFor === id) return;
    var sb = window.CVI && CVI.supabase;
    if (!sb) return;
    scoreLoadedFor = id;
    try {
      var r = await sb
        .from("eventi_aperti")
        .select("sistema_punteggio,scarti,scarti_auto")
        .eq("id", id)
        .maybeSingle();
      if (r.error || !r.data) return;
      var sel = document.getElementById("ea-vsk-sistema");
      var num = document.getElementById("ea-vsk-scarti");
      var auto = document.getElementById("ea-vsk-scarti-auto");
      if (sel) sel.value = r.data.sistema_punteggio === "high_point" ? "high_point" : "low_point";
      if (num) num.value = r.data.scarti != null ? String(r.data.scarti) : "0";
      if (auto) auto.checked = !!r.data.scarti_auto;
    } catch (e) {}
  }

  async function saveScoreConfig(eventoId) {
    var sel = document.getElementById("ea-vsk-sistema");
    var num = document.getElementById("ea-vsk-scarti");
    var auto = document.getElementById("ea-vsk-scarti-auto");
    if (!sel && !num && !auto) return;
    var sb = window.CVI && CVI.supabase;
    if (!sb) return;
    var payload = {
      sistema_punteggio: sel && sel.value === "high_point" ? "high_point" : "low_point",
      scarti: num ? Math.max(0, parseInt(num.value, 10) || 0) : 0,
      scarti_auto: auto ? !!auto.checked : false
    };
    try {
      await sb.from("eventi_aperti").update(payload).eq("id", eventoId);
    } catch (e) {}
  }


  function ensureVskUi() {
    var panel = document.getElementById("panel-eventi-aperti");
    if (!panel || document.getElementById("ea-vsk-import")) return false;
    var box = document.createElement("div");
    box.id = "ea-vsk-import";
    box.className = "admin-card";
    box.style.cssText = "margin-bottom:1rem";
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap">' +
      '<strong style="color:#7dd3fc;font-size:.9rem">⚡ Importa log VSK (un file = una regata)</strong>' +
      '<button type="button" class="btn-ghost" id="ea-vsk-toggle">Mostra</button></div>' +
      '<div id="ea-vsk-body" style="display:none;margin-top:.75rem">' +
      '<p style="margin:0 0 .6rem;font-size:.8rem;color:#94a3b8">Apri <strong>Modifica</strong> su un evento salvato, poi trascina i file ' +
      '<strong>Result_*.csv</strong>: ogni file diventa una regata con tempi, stati e classifica calcolata. ' +
      'La classifica pubblica usa Low/High Point e gli scarti qui sotto.</p>' +
      '<div id="ea-vsk-drop" style="border:2px dashed rgba(125,211,252,.35);border-radius:12px;padding:1rem;text-align:center;color:#94a3b8;font-size:.86rem;cursor:pointer">' +
      'Trascina qui i file oppure clicca per sceglierli</div>' +
      '<input type="file" id="ea-vsk-files" multiple accept=".csv,.txt,text/csv" style="display:none">' +
      '<div id="ea-vsk-score" style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:flex-end;margin:.75rem 0">' +
      '<label style="font-size:.78rem;color:#cbd5e1">Punteggio<br><select id="ea-vsk-sistema" class="adm-select">' +
      '<option value="low_point">Low Point</option><option value="high_point">High Point</option></select></label>' +
      '<label style="font-size:.78rem;color:#cbd5e1">Scarti<br><input type="number" min="0" id="ea-vsk-scarti" class="adm-input" value="0" style="width:5rem"></label>' +
      '<label style="font-size:.78rem;color:#cbd5e1"><input type="checkbox" id="ea-vsk-scarti-auto"> Scarti automatici (1 ogni 4 regate)</label>' +
      '<button type="button" class="btn-sm" id="ea-vsk-score-save">Salva punteggio</button></div>' +
      '<label style="display:block;margin:.35rem 0;font-size:.8rem;color:#cbd5e1">' +
      '<input type="checkbox" id="ea-vsk-clean" checked> Rimuovi i codici colore Nadeo ($) dai nickname</label>' +
      '<div id="ea-vsk-log" style="font-size:.82rem;line-height:1.5;color:#cbd5e1"></div></div>';

    var form = document.getElementById("ea-form");
    if (form && form.parentNode) form.parentNode.insertBefore(box, form);
    else panel.insertBefore(box, panel.firstChild);

    var toggle = document.getElementById("ea-vsk-toggle");
    var bodyWrap = document.getElementById("ea-vsk-body");
    if (toggle && bodyWrap) {
      toggle.onclick = function () {
        var open = bodyWrap.style.display === "none";
        bodyWrap.style.display = open ? "block" : "none";
        toggle.textContent = open ? "Nascondi" : "Mostra";
      };
    }
    var drop = document.getElementById("ea-vsk-drop");
    var input = document.getElementById("ea-vsk-files");
    if (drop && input) {
      drop.onclick = function () {
        input.click();
      };
      input.onchange = function () {
        var files = this.files;
        importEventiVskFiles(files);
        this.value = "";
      };
      ["dragenter", "dragover"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.style.borderColor = "rgba(125,211,252,.85)";
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.style.borderColor = "rgba(125,211,252,.35)";
        });
      });
      drop.addEventListener("drop", function (e) {
        if (e.dataTransfer && e.dataTransfer.files) importEventiVskFiles(e.dataTransfer.files);
      });
    }
    var scoreBtn = document.getElementById("ea-vsk-score-save");
    if (scoreBtn) {
      scoreBtn.onclick = async function () {
        var id = eventoCorrente();
        if (!id) {
          alert("Apri in modifica un evento salvato per salvare il punteggio.");
          return;
        }
        await saveScoreConfig(id);
        alert("Punteggio evento salvato.");
      };
    }
    return true;
  }


  async function importEventiVskFiles(fileList) {
    var sb = window.CVI && CVI.supabase;
    if (!sb) return;
    var eventoId = eventoCorrente();
    if (!eventoId) {
      alert("Apri in modifica un evento già salvato (serve l'ID evento) e riprova.");
      return;
    }
    var L = libParser();
    if (!L) {
      alert("Libreria di calcolo non caricata (2-serie-aperte-lib.js).");
      return;
    }
    var files = Array.prototype.slice.call(fileList || []).filter(function (f) {
      return /\.(csv|txt)$/i.test(f.name);
    });
    if (!files.length) {
      alert("Seleziona uno o più file .csv di Virtual Skipper.");
      return;
    }

    var logEl = document.getElementById("ea-vsk-log");
    if (logEl) logEl.innerHTML = "";
    var cleanEl = document.getElementById("ea-vsk-clean");
    var doClean = !cleanEl || cleanEl.checked;

    await saveScoreConfig(eventoId);

    var prev = await sb
      .from("eventi_aperti_regate")
      .select("ordine,sorgente_file")
      .eq("evento_id", eventoId);
    if (prev.error) prev = await sb.from("eventi_aperti_regate").select("ordine").eq("evento_id", eventoId);
    var existing = {};
    var ordine = 0;
    (prev.data || []).forEach(function (r) {
      if (r.sorgente_file) existing[String(r.sorgente_file)] = true;
      if ((r.ordine || 0) > ordine) ordine = r.ordine || 0;
    });

    var ok = 0,
      skip = 0,
      fail = 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (existing[file.name]) {
        skip++;
        vskLog("⏭ " + file.name + " già importata, saltata.", "#fbbf24");
        continue;
      }
      try {
        var text = decodeCsvBuffer(await readFileBuffer(file));
        var rows = L.parseVskCsv(text);
        if (!rows.length) {
          fail++;
          vskLog("⚠ " + file.name + ": nessuno skipper riconosciuto.", "#fbbf24");
          continue;
        }
        var meta = titoloDaFile(file.name);
        ordine += 1;
        var regPayload = {
          evento_id: eventoId,
          titolo: meta.titolo,
          data_regata: meta.data,
          ordine: ordine,
          sorgente_file: file.name
        };
        var regIns = await sb
          .from("eventi_aperti_regate")
          .insert(regPayload)
          .select("id")
          .single();
        if (regIns.error && /sorgente_file|column|schema cache/i.test(String(regIns.error.message || ""))) {
          delete regPayload.sorgente_file;
          regIns = await sb
            .from("eventi_aperti_regate")
            .insert(regPayload)
            .select("id")
            .single();
          if (!regIns.error)
            vskLog("⚠ Colonna sorgente_file assente: esegui eventi-risultati-vsk-sql.sql.", "#fbbf24");
        }
        if (regIns.error) throw regIns.error;
        var regId = regIns.data && regIns.data.id;

        var payload = rows.map(function (r) {
          return {
            evento_id: eventoId,
            regata_id: regId,
            nickname: doClean ? L.cleanNick(r.nickname_raw) || r.nickname : r.nickname_raw,
            nickname_raw: r.nickname_raw,
            account_vsk: r.account_vsk,
            stato: r.stato,
            posizione: r.posizione,
            tempo_ms: r.tempo_ms
          };
        });
        var ins = await sb.from("eventi_aperti_risultati").insert(payload);
        if (ins.error && /column|schema cache|nickname_raw|account_vsk|tempo_ms/i.test(String(ins.error.message || ""))) {
          var legacy = payload.map(function (r) {
            return {
              evento_id: r.evento_id,
              regata_id: r.regata_id,
              nickname: r.nickname,
              stato: r.stato,
              posizione: r.posizione
            };
          });
          ins = await sb.from("eventi_aperti_risultati").insert(legacy);
          if (!ins.error)
            vskLog("⚠ Tempi e account non salvati: esegui eventi-risultati-vsk-sql.sql.", "#fbbf24");
        }
        if (ins.error) throw ins.error;

        ok++;
        vskLog("✅ " + file.name + " → " + meta.titolo + " (" + rows.length + " skipper)", "#34d399");
      } catch (e) {
        fail++;
        vskLog("❌ " + file.name + ": " + (e.message || e), "#f87171");
      }
    }

    /* Con le regate la classifica è calcolata: via le righe "classifica unica"
       rimaste da import manuali (regata_id nullo). */
    if (ok) {
      try {
        await sb
          .from("eventi_aperti_risultati")
          .delete()
          .eq("evento_id", eventoId)
          .is("regata_id", null);
      } catch (e) {}
    }

    vskLog(
      "Import terminati: " + ok + " ok · " + skip + " saltati · " + fail + " errori.",
      fail ? "#fbbf24" : "#7dd3fc"
    );
    if (ok && typeof window.loadEventiApertiAdmin === "function") {
      try {
        await window.loadEventiApertiAdmin();
      } catch (e) {}
    }
  }


  function patchSaveEvento() {
    var form = document.getElementById("ea-form");
    if (!form || typeof form.onsubmit !== "function") return false;
    if (form.onsubmit._cviWrapped) return true;
    var orig = form.onsubmit;
    var wrapped = async function (ev) {
      /* il vincolo unique (evento_id, posizione) non perdona duplicati/buchi */
      normalizeRisultatiRows();
      return orig.call(form, ev);
    };
    wrapped._cviWrapped = true;
    form.onsubmit = wrapped;
    form._eaWired = true; /* il wire() originale non deve riagganciare saveEvento */
    return true;
  }

  function tick() {
    wireImport();
    ensureVskUi();
    patchLoadList();
    restyleAdminCards();
    scrubFormRows();
    patchSaveEvento();
    refreshScoreInputs();
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
    function fallbackCdn() {
      loadScript(
        "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@747ca063242f040098b27ce00f7a5d0815fa8231/eventi-aperti-admin.js",
        function () {
          window.__cviEaOrigLoading = false;
          cb();
        }
      );
    }
    function loadScript(src, onerror) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = cb;
      s.onerror = onerror;
      document.head.appendChild(s);
    }
    /* pannello base locale (niente dipendenza da un commit CDN fissato) */
    loadScript("eventi-aperti-admin-base.js?v=1", fallbackCdn);
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
