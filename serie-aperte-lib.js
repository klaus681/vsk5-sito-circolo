/* CVI – Serie Aperte: libreria condivisa
   - Pulizia nickname Nadeo/VSK ($ colori, $i, $n, ...)
   - Parsing log VSK (Result_YYYY_MM_DD_HH_MM_SS.csv) e CSV custom
   - Punteggi regata: Low Point / High Point
   - Classifica serie: scarti fissi o automatici (1 ogni 4 regate)
   Usata da: admin, area Eventi (eventi.html), widget Home
*/
(function (w) {
  "use strict";

  var STATI_VALIDI = ["FIN", "DNF", "DNS", "DSQ", "RET"];

  /* ---------- Utility ---------- */

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function key(nick) {
    return String(nick == null ? "" : nick).trim().toLowerCase();
  }

  /* Rimuove i codici colore/stile Nadeo: $fff, $0f, $i, $n, $s, $$ ... */
  function cleanNick(raw) {
    if (raw == null) return "";
    var s = String(raw).replace(/\u00a0/g, " ");
    s = s.replace(/\$[0-9a-fA-F]{3}/g, ""); // colori esadecimali
    s = s.replace(/\$[isngzwomt$]/g, ""); // stili / reset
    s = s.replace(/\$[0-9a-fA-F]/g, ""); // colori a 1 cifra
    s = s.replace(/\$./g, ""); // qualsiasi codice residuo
    return s.replace(/\s+/g, " ").trim();
  }

  /* Tempo -> millisecondi. Accetta 1480567, "24:40.567", "1:02:03.400", "0" */
  function parseTimeToMs(v) {
    if (v == null) return 0;
    var s = String(v).replace(/\u00a0/g, " ").replace(/["']/g, "").trim();
    if (!s) return 0;
    if (/^-\d/.test(s)) return 0;
    if (s.indexOf(":") !== -1) {
      var parts = s.split(":");
      var total = 0;
      for (var i = 0; i < parts.length; i++) {
        total = total * 60 + (parseFloat(String(parts[i]).replace(",", ".")) || 0);
      }
      if (!isFinite(total) || total <= 0) return 0;
      return Math.round(total * 1000);
    }
    var n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }

  /* Millisecondi -> mm:ss.mmm */
  function formatMs(ms) {
    var n = Number(ms);
    if (!isFinite(n) || n <= 0) return "DNF";
    var t = n / 1000;
    var m = Math.floor(t / 60);
    var sec = parseFloat((t - m * 60).toFixed(3));
    var sSec = (sec < 10 ? "0" : "") + sec.toFixed(3);
    return (m < 10 ? "0" + m : String(m)) + ":" + sSec;
  }

  function statoValido(s) {
    var v = String(s == null ? "" : s).trim().toUpperCase();
    return STATI_VALIDI.indexOf(v) !== -1 ? v : "FIN";
  }

  /* Stato letto dal log VSK/CSV: sinonimi -> valori ammessi dalle tabelle.
     DNC (non classificato) rientra in DNS perché le tabelle risultati
     accettano solo FIN/DNF/DNS/DSQ/RET. */
  var STATI_ALIAS = {
    FIN: "FIN", FINISHED: "FIN", ARRIVATO: "FIN", ARRIVATA: "FIN", OK: "FIN",
    DNF: "DNF", RET: "RET", RETIRED: "RET", WITHDRAWN: "RET", RITIRATO: "RET",
    DNS: "DNS", DNC: "DNS", DSQ: "DSQ", DQ: "DSQ", DISQ: "DSQ",
    DISQUALIFIED: "DSQ", SQUALIFICATO: "DSQ",
    "NON ARRIVATO": "DNF", "NON PARTITO": "DNS"
  };

  function statoDaFile(raw, ms) {
    var v = String(raw == null ? "" : raw).trim().toUpperCase();
    if (v && STATI_ALIAS[v]) return STATI_ALIAS[v];
    return ms > 0 ? "FIN" : "DNF";
  }

  /* ---------- Lettura file ---------- */

  /* Buffer(file) -> testo. UTF-8, con fallback ISO-8859-1 per i log VSK
     salvati da Windows (stessa funzione di 2-serie-aperte-lib.js). */
  function decodeBuffer(buffer) {
    if (buffer == null) return "";
    if (typeof buffer === "string") return buffer;
    var u8;
    try {
      u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    } catch (e) {
      return String(buffer);
    }
    var utf8 = "";
    try {
      utf8 = new TextDecoder("utf-8", { fatal: false }).decode(u8);
    } catch (e2) {
      utf8 = "";
    }
    var bad = (utf8.match(/\uFFFD/g) || []).length;
    if (bad === 0 && utf8) return utf8;
    try {
      var latin = new TextDecoder("iso-8859-1").decode(u8);
      if (!utf8 || (latin.match(/\uFFFD/g) || []).length < bad) return latin;
    } catch (e3) {}
    return utf8 || "";
  }

  /* ---------- Parsing CSV ---------- */

  function detectSeparator(text) {
    var lines = String(text || "").split(/\r?\n/);
    var line = "";
    for (var i = 0; i < lines.length; i++) {
      if (String(lines[i]).trim() !== "") {
        line = lines[i];
        break;
      }
    }
    var cands = [";", ",", "\t", "|"];
    var best = ";";
    var max = -1;
    cands.forEach(function (c) {
      var n = line.split(c).length - 1;
      if (n > max) {
        max = n;
        best = c;
      }
    });
    return max <= 0 ? "," : best;
  }

  function parseRows(text, sep) {
    var s = String(text || "").replace(/^\uFEFF/, "");
    var rows = [],
      row = [],
      cur = "",
      inQ = false,
      i = 0;
    while (i < s.length) {
      var c = s[i];
      if (inQ) {
        if (c === '"') {
          if (s[i + 1] === '"') {
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
        if (c === "\r" && s[i + 1] === "\n") i++;
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
    return rows.filter(function (r) {
      return r.some(function (x) {
        return String(x).trim() !== "";
      });
    });
  }

  function cell(row, idx) {
    if (!row || idx == null || idx < 0 || idx >= row.length) return "";
    return row[idx] == null ? "" : row[idx];
  }

  var RE_HEADER = /rank|posiz|^pos$|^pos\b|place|class|piazz|^#$|time|temps|tempo|durata|ms|millisec|account|username|login|user|nick|player|pilote|pseudo|nome/;

  /* Riconosce un log VSK (header con time/account/nick oppure colonna 2 = ms) */
  function looksLikeVskCsv(text) {
    var sep = detectSeparator(text);
    var rows = parseRows(text, sep);
    if (!rows.length) return false;
    var h = rows[0].map(function (x) {
      return String(x).trim().toLowerCase();
    });
    var headerVsk = h.some(function (x) {
      return /tempo|time|temps|durata|millisec|^ms$|account|username|login|compte|cuenta/.test(x);
    });
    if (headerVsk) return true;
    var r = rows[0];
    return r.length >= 3 && /^\d{5,}$/.test(String(r[1] == null ? "" : r[1]).trim());
  }

  /* Log VSK -> righe risultato pronte per serie_aperte_risultati */
  function parseVskCsv(text) {
    var sep = detectSeparator(text);
    var rows = parseRows(text, sep);
    var idx = { pos: 0, ms: 1, account: 2, nick: 3, stato: -1 };
    var start = 0;

    if (rows.length) {
      var h = rows[0].map(function (x) {
        return String(x).trim().toLowerCase();
      });
      var isHeader =
        h.some(function (x) {
          return RE_HEADER.test(x);
        }) && !/^\d+$/.test(h[0] || "");
      if (isHeader) {
        start = 1;
        var find = function (re, def) {
          for (var k = 0; k < h.length; k++) if (re.test(h[k])) return k;
          return def;
        };
        idx.pos = find(/rank|posiz|^pos$|^pos\b|place|class|piazz|^#$/, 0);
        idx.ms = find(/time|temps|tempo|durata|ms|millisec/, 1);
        idx.nick = find(/nick|player|pilote|pseudo/, -1);
        idx.account = find(/account|username|login|user|compte|cuenta/, -1);
        idx.stato = find(/stato|status|state|esito|risultat|result/, -1);
        if (idx.nick < 0 && idx.account < 0) {
          idx.nick = 3;
          idx.account = 2;
        } else if (idx.nick < 0) {
          idx.nick = idx.account;
        } else if (idx.account < 0) {
          idx.account = idx.nick;
        }
      }
    }

    var out = [];
    for (var i = start; i < rows.length; i++) {
      var r = rows[i];
      var nickRaw = String(cell(r, idx.nick)).trim();
      var acc = String(cell(r, idx.account)).trim();
      if (!nickRaw && !acc) continue;
      var posRaw = parseInt(String(cell(r, idx.pos)).replace(/[^0-9-]/g, ""), 10);
      var ms = parseTimeToMs(cell(r, idx.ms));
      var clean = cleanNick(nickRaw) || nickRaw || acc;
      var stato = statoDaFile(cell(r, idx.stato), ms);
      /* le posizioni valgono solo per chi ha finito (come nell'editor manuale) */
      var pos = stato !== "FIN" || isNaN(posRaw) || posRaw < 1 ? null : posRaw;
      out.push({
        posizione: pos,
        tempo_ms: ms > 0 ? ms : null,
        tempo: ms > 0 ? formatMs(ms) : "",
        account_vsk: cleanNick(acc) || acc || null,
        nickname_raw: nickRaw || acc,
        nickname: clean,
        stato: stato
      });
    }

    /* posizioni mancanti ricavate dall'ordine dei tempi */
    var used = {};
    out.forEach(function (e) {
      if (e.posizione) used[e.posizione] = true;
    });
    var next = 1;
    out.forEach(function (e) {
      if (e.posizione == null && e.stato === "FIN" && e.tempo_ms) {
        while (used[next]) next++;
        e.posizione = next;
        used[next] = true;
      }
    });

    /* dedupe per nickname (vincolo unique regata_id + nickname) */
    var seen = {};
    return out.filter(function (e) {
      var k = key(e.nickname);
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  /* ---------- Punteggi ---------- */

  function normalizzaSistema(s) {
    return String(s || "").toLowerCase() === "high_point" ? "high_point" : "low_point";
  }

  function calcPuntiRegata(rows, sistema) {
    var high = normalizzaSistema(sistema) === "high_point";
    var list = rows || [];
    var starters = list.filter(function (r) {
      return r.stato !== "DNS";
    }).length;
    var n = Math.max(starters, 1);
    var penalty = n + 1;

    return list.map(function (r) {
      var finished = r.stato === "FIN" && r.posizione != null && r.posizione >= 1;
      var punti;
      if (high) punti = finished ? Math.max(n - r.posizione + 1, 0) : 0;
      else punti = finished ? r.posizione : penalty;
      return {
        nickname: r.nickname,
        team: r.team || null,
        stato: r.stato,
        posizione: r.posizione,
        punti: punti,
        note: r.note || null,
        tempo_ms: r.tempo_ms != null ? Number(r.tempo_ms) : null,
        account_vsk: r.account_vsk || null,
        nickname_raw: r.nickname_raw || null
      };
    });
  }

  /* Scarti effettivamente applicabili */
  function calcolaNumScarti(scarti, scartiAuto, numRegate) {
    if (!numRegate || numRegate <= 0) return 0;
    var n = scartiAuto ? Math.floor(numRegate / 4) : parseInt(scarti, 10) || 0;
    if (n < 0) n = 0;
    /* almeno una prova deve restare valida */
    return Math.min(n, numRegate - 1);
  }

  function calcClassificaSerie(regateWithResults, scarti, opts) {
    var regs = regateWithResults || [];
    var sistema = normalizzaSistema(opts && opts.sistema);
    var scartiAuto = !!(opts && opts.scartiAuto);
    var high = sistema === "high_point";
    var numScarti = calcolaNumScarti(scarti, scartiAuto, regs.length);

    /* penalita per regata (chi non ha corso = DNS implicito) */
    var penalties = regs.map(function (reg) {
      var results = reg.results || [];
      var starters = results.filter(function (r) {
        return r.stato !== "DNS";
      }).length;
      return Math.max(starters, 1) + 1;
    });

    var byNick = {};
    var presenti = regs.map(function (reg) {
      var set = {};
      (reg.results || []).forEach(function (r) {
        set[key(r.nickname)] = true;
      });
      return set;
    });

    /* 1) registra tutti gli skipper */
    regs.forEach(function (reg, rIdx) {
      (reg.results || []).forEach(function (r) {
        var k = key(r.nickname);
        if (!k) return;
        if (!byNick[k]) {
          byNick[k] = {
            nickname: r.nickname,
            team: r.team || null,
            punti: [],
            dettaglio: [],
            gare: 0
          };
        }
        if (r.team && !byNick[k].team) byNick[k].team = r.team;
        byNick[k].punti[rIdx] = r.punti;
        byNick[k].dettaglio[rIdx] = {
          regata_id: reg.id,
          titolo: reg.titolo,
          punti: r.punti,
          stato: r.stato,
          posizione: r.posizione,
          tempo_ms: r.tempo_ms != null ? r.tempo_ms : null,
          account_vsk: r.account_vsk || null
        };
        byNick[k].gare += 1;
      });
    });

    var list = Object.keys(byNick).map(function (k) {
      var s = byNick[k];
      var pts = [];
      var dettaglio = [];
      for (var i = 0; i < regs.length; i++) {
        if (presenti[i][k]) {
          pts[i] = s.punti[i] == null ? 0 : s.punti[i];
          dettaglio[i] = s.dettaglio[i] || null;
        } else {
          pts[i] = high ? 0 : penalties[i];
          dettaglio[i] = {
            regata_id: regs[i].id,
            titolo: regs[i].titolo,
            punti: pts[i],
            stato: "DNS",
            posizione: null,
            tempo_ms: null,
            account_vsk: null
          };
        }
      }

      var indexed = pts.map(function (p, i) {
        return { p: p, i: i };
      });
      indexed.sort(function (a, b) {
        if (a.p !== b.p) return high ? a.p - b.p : b.p - a.p;
        return a.i - b.i;
      });
      var scartiIdx = indexed.slice(0, numScarti).map(function (o) {
        return o.i;
      });
      scartiIdx.sort(function (a, b) {
        return a - b;
      });

      var netti = 0;
      var totali = 0;
      pts.forEach(function (p, i) {
        totali += p;
        if (scartiIdx.indexOf(i) === -1) netti += p;
      });

      /* conteggio piazzamenti per spareggio (RRS A8.1) */
      var posCounts = {};
      var posizioni = [];
      dettaglio.forEach(function (d, i) {
        posizioni[i] = d && d.stato === "FIN" && d.posizione ? d.posizione : null;
        if (d && d.stato === "FIN" && d.posizione) {
          posCounts[d.posizione] = (posCounts[d.posizione] || 0) + 1;
        }
      });

      return {
        nickname: s.nickname,
        team: s.team,
        punti: pts,
        scartiIdx: scartiIdx,
        scartiUsati: scartiIdx.length,
        netti: netti,
        totali: totali,
        gare: s.gare,
        dettaglio: dettaglio,
        posCounts: posCounts,
        posizioni: posizioni
      };
    });

    list.sort(function (a, b) {
      if (a.netti !== b.netti) return high ? b.netti - a.netti : a.netti - b.netti;
      if (a.totali !== b.totali) return high ? b.totali - a.totali : a.totali - b.totali;
      /* spareggio: più primi posti, poi più secondi, ... */
      for (var p = 1; p <= 30; p++) {
        var ca = a.posCounts[p] || 0;
        var cb = b.posCounts[p] || 0;
        if (ca !== cb) return cb - ca;
      }
      /* ultima regata: vale il piazzamento migliore */
      for (var li = a.posizioni.length - 1; li >= 0; li--) {
        var pa = a.posizioni[li] || 999;
        var pb = b.posizioni[li] || 999;
        if (pa !== pb) return pa - pb;
      }
      return String(a.nickname).localeCompare(String(b.nickname), "it");
    });

    list.forEach(function (r, i) {
      r.pos = i + 1;
    });

    return list;
  }

  w.CVISerieAperte = {
    esc: esc,
    cleanNick: cleanNick,
    parseTimeToMs: parseTimeToMs,
    formatMs: formatMs,
    statoValido: statoValido,
    statoDaFile: statoDaFile,
    decodeBuffer: decodeBuffer,
    detectSeparator: detectSeparator,
    parseRows: parseRows,
    looksLikeVskCsv: looksLikeVskCsv,
    parseVskCsv: parseVskCsv,
    normalizzaSistema: normalizzaSistema,
    calcPuntiRegata: calcPuntiRegata,
    calcolaNumScarti: calcolaNumScarti,
    calcClassificaSerie: calcClassificaSerie
  };
})(typeof window !== "undefined" ? window : this);
