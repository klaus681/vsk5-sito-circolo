/* CVI Admin – Import CSV/VSK per risultati Gare (stesso criterio Tornei) */
(function () {
  "use strict";

  function nickKey(s) {
    return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " ");
  }

  function cleanNickLocal(raw) {
    var L = window.CVISerieAperte;
    if (L && typeof L.cleanNick === "function") return L.cleanNick(raw) || String(raw || "").trim();
    if (raw == null) return "";
    var s = String(raw).replace(/\u00a0/g, " ");
    s = s.replace(/\$[0-9a-fA-F]{3}/g, "");
    s = s.replace(/\$[isngzwomt$]/g, "");
    s = s.replace(/\$[0-9a-fA-F]/g, "");
    s = s.replace(/\$./g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  function decodeFileBuffer(buf) {
    var L = window.CVISerieAperte;
    if (L && typeof L.decodeBuffer === "function") return L.decodeBuffer(buf);
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));
    } catch (e) {
      return "";
    }
  }

  function parseGareCsvText(text) {
    var L = window.CVISerieAperte;
    if (L && typeof L.looksLikeVskCsv === "function" && L.looksLikeVskCsv(text)) {
      var vsk = L.parseVskCsv(text);
      return vsk
        .map(function (p) {
          var st = p.stato && p.stato !== "FIN" ? String(p.stato).toLowerCase() : "ok";
          if (st === "ret") st = "dnf";
          return {
            pos: p.posizione != null ? p.posizione : null,
            nick: p.nickname || cleanNickLocal(p.nickname_raw) || "",
            stato: st
          };
        })
        .filter(function (x) {
          return x.nick;
        });
    }
    text = String(text || "").replace(/^\uFEFF/, "");
    var firstLine = text.split(/\r?\n/)[0] || "";
    var sep = firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";
    var rows = [],
      row = [],
      cur = "",
      inQ = false,
      i = 0;
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i += 2;
            continue;
          }
          inQ = false;
          i++;
          continue;
        }
        cur += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (c === sep) {
        row.push(cur);
        cur = "";
        i++;
        continue;
      }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        cur = "";
        rows.push(row);
        row = [];
        i++;
        continue;
      }
      cur += c;
      i++;
    }
    row.push(cur);
    rows.push(row);
    rows = rows.filter(function (r) {
      return r.some(function (x) {
        return String(x).trim() !== "";
      });
    });
    if (!rows.length) return [];
    var idx = { pos: 0, nick: 1, stato: 2 };
    var start = 0;
    var h = rows[0].map(function (x) {
      return String(x).trim().toLowerCase();
    });
    var hasHeader = h.some(function (x) {
      return /posiz|^pos\b|rank|^#$|nick|skipper|stato|status/.test(x);
    });
    if (hasHeader) {
      start = 1;
      var find = function (re, def) {
        for (var k = 0; k < h.length; k++) if (re.test(h[k])) return k;
        return def;
      };
      idx.pos = find(/posiz|^pos\b|pos\.|rank|^#$/, 0);
      idx.nick = find(/nick|skipper|nome|player/, 1);
      idx.stato = find(/stato|status/, 2);
    }
    var out = [];
    for (var r = start; r < rows.length; r++) {
      var line = rows[r];
      var nickRaw = String(line[idx.nick] == null ? "" : line[idx.nick]).trim();
      if (!nickRaw) continue;
      var nick = cleanNickLocal(nickRaw) || nickRaw;
      var pos = parseInt(String(line[idx.pos] == null ? "" : line[idx.pos]).replace(/[^0-9]/g, ""), 10);
      var stRaw = String(line[idx.stato] == null ? "ok" : line[idx.stato]).trim().toLowerCase();
      var st = "ok";
      if (/dnf|ret/.test(stRaw)) st = "dnf";
      else if (/dsq/.test(stRaw)) st = "dsq";
      else if (/dns|dnc/.test(stRaw)) st = stRaw.indexOf("dnc") >= 0 ? "dnc" : "dns";
      out.push({ pos: isNaN(pos) ? null : pos, nick: nick, stato: st });
    }
    return out;
  }

  function applyCsvToRegata(regataNum, parsed) {
    var form = document.querySelector('.form-resultati[data-regata="' + regataNum + '"]');
    if (!form) return { matched: 0, unmatched: [] };
    var rows = form.querySelectorAll(".result-row");
    var byNick = {};
    rows.forEach(function (row) {
      var labelCell = row.querySelector("td");
      var label = labelCell ? labelCell.textContent : "";
      var k = nickKey(cleanNickLocal(label) || label);
      if (k) byNick[k] = row;
      var k2 = nickKey(label);
      if (k2) byNick[k2] = row;
    });
    var matched = 0,
      unmatched = [],
      used = {};
    parsed.forEach(function (p) {
      var k = nickKey(p.nick);
      var row = byNick[k];
      if (!row) {
        var found = null;
        Object.keys(byNick).forEach(function (bk) {
          if (found) return;
          if (bk && k && (bk.indexOf(k) >= 0 || k.indexOf(bk) >= 0) && Math.min(bk.length, k.length) >= 3)
            found = byNick[bk];
        });
        row = found;
      }
      if (!row) {
        unmatched.push(p.nick);
        return;
      }
      var uid = row.getAttribute("data-user-id");
      if (used[uid]) return;
      used[uid] = true;
      var posIn = row.querySelector(".input-pos");
      var stIn = row.querySelector(".input-stato");
      if (p.stato === "ok") {
        if (posIn && p.pos != null) posIn.value = String(p.pos);
        if (stIn) stIn.value = "ok";
      } else {
        if (stIn) stIn.value = p.stato;
        if (posIn) posIn.value = "";
      }
      matched++;
    });
    return { matched: matched, unmatched: unmatched };
  }

  function injectCsvUi(wrap) {
    if (!wrap || wrap.querySelector("#ris-csv-box")) return;
    var forms = wrap.querySelectorAll(".form-resultati");
    if (!forms.length) return;
    var nr = forms.length;
    var box = document.createElement("div");
    box.id = "ris-csv-box";
    box.style.cssText =
      "margin:.65rem 0 .85rem;padding:.75rem .9rem;border:1px solid rgba(56,189,248,.28);border-radius:10px;background:rgba(56,189,248,.06)";
    var opts = "";
    for (var i = 1; i <= nr; i++) opts += '<option value="' + i + '">' + i + "</option>";
    box.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.4rem">' +
      '<strong style="color:#7dd3fc;font-size:.88rem">⬆ Importa CSV / log VSK</strong>' +
      '<label style="color:#e2e8f0;font-size:.82rem">Regata <select id="ris-csv-regata" class="adm-input" style="width:auto;display:inline-block;margin-left:.25rem">' +
      opts +
      "</select></label>" +
      '<input type="file" id="ris-csv-file" accept=".csv,.txt,text/csv" style="display:none">' +
      '<button type="button" class="btn-sm" id="ris-csv-btn">Scegli file</button></div>' +
      '<p style="margin:0;font-size:.78rem;color:#94a3b8">Accetta log <strong>Result_*.csv</strong> di Virtual Skipper (codici $ rimossi) oppure CSV <strong>Posizione;Nickname;Stato</strong>. I nickname vengono abbinati agli iscritti: controlla e premi Salva.</p>' +
      '<p id="ris-csv-hint" style="margin:.35rem 0 0;font-size:.8rem;color:#64748b"></p>';
    var meta = wrap.querySelector(".ris-meta");
    if (meta && meta.nextSibling) wrap.insertBefore(box, meta.nextSibling);
    else wrap.insertBefore(box, wrap.firstChild);

    var csvBtn = document.getElementById("ris-csv-btn");
    var csvFile = document.getElementById("ris-csv-file");
    if (csvBtn && csvFile) {
      csvBtn.onclick = function () {
        csvFile.click();
      };
      csvFile.onchange = function () {
        var f = this.files && this.files[0];
        if (!f) return;
        var regSel = document.getElementById("ris-csv-regata");
        var regNum = regSel ? parseInt(regSel.value, 10) || 1 : 1;
        var hint = document.getElementById("ris-csv-hint");
        var reader = new FileReader();
        reader.onload = function () {
          var parsed = parseGareCsvText(decodeFileBuffer(reader.result));
          if (!parsed.length) {
            if (hint) {
              hint.textContent = "Nessuno skipper trovato nel file.";
              hint.style.color = "#f87171";
            }
            csvFile.value = "";
            return;
          }
          var res = applyCsvToRegata(regNum, parsed);
          var msg = "Regata " + regNum + ": abbinati " + res.matched + " / " + parsed.length;
          if (res.unmatched.length)
            msg +=
              " · non trovati: " +
              res.unmatched.slice(0, 8).join(", ") +
              (res.unmatched.length > 8 ? "…" : "");
          if (hint) {
            hint.textContent = msg;
            hint.style.color = res.matched ? "#34d399" : "#fbbf24";
          }
          if (typeof status === "function") status(msg, res.matched ? "ok" : "");
          csvFile.value = "";
        };
        reader.onerror = function () {
          alert("Impossibile leggere il file.");
          csvFile.value = "";
        };
        reader.readAsArrayBuffer(f);
      };
    }
  }

  function patchLoadFormRis() {
    if (typeof window.loadFormRis !== "function" || window.loadFormRis._csvPatched) return false;
    var orig = window.loadFormRis;
    window.loadFormRis = function (garaId) {
      orig(garaId);
      setTimeout(function () {
        var wrap = document.getElementById("ris-form-wrap");
        injectCsvUi(wrap);
      }, 0);
    };
    window.loadFormRis._csvPatched = true;
    return true;
  }

  function tryPatch() {
    if (patchLoadFormRis()) return;
    setTimeout(tryPatch, 400);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryPatch);
  else tryPatch();
  setTimeout(tryPatch, 1500);
  setTimeout(tryPatch, 3500);
})();
