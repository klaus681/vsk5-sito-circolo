/* CVI Serie Aperte – shared calc (Low Point) */
(function (w) {
  "use strict";
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function calcPuntiRegata(rows) {
    var starters = rows.filter(function (r) {
      return r.stato !== "DNS";
    }).length;
    var penalty = Math.max(starters, 1) + 1;
    return rows.map(function (r) {
      var punti =
        r.stato === "FIN" && r.posizione != null && r.posizione >= 1
          ? r.posizione
          : penalty;
      return {
        nickname: r.nickname,
        team: r.team || null,
        stato: r.stato,
        posizione: r.posizione,
        punti: punti,
        note: r.note || null
      };
    });
  }
  function calcClassificaSerie(regateWithResults, scarti) {
    var byNick = {};
    regateWithResults.forEach(function (reg) {
      (reg.results || []).forEach(function (r) {
        var k = String(r.nickname).trim().toLowerCase();
        if (!byNick[k])
          byNick[k] = {
            nickname: r.nickname,
            team: r.team || null,
            punti: []
          };
        if (r.team && !byNick[k].team) byNick[k].team = r.team;
        byNick[k].punti.push(r.punti);
      });
    });
    regateWithResults.forEach(function (reg) {
      var starters = (reg.results || []).filter(function (r) {
        return r.stato !== "DNS";
      }).length;
      var penalty = Math.max(starters, 1) + 1;
      var present = {};
      (reg.results || []).forEach(function (r) {
        present[String(r.nickname).trim().toLowerCase()] = true;
      });
      Object.keys(byNick).forEach(function (k) {
        if (!present[k]) byNick[k].punti.push(penalty);
      });
    });
    var list = Object.keys(byNick).map(function (k) {
      var s = byNick[k];
      var pts = s.punti.slice().sort(function (a, b) {
        return b - a;
      });
      var discard = Math.min(scarti || 0, pts.length);
      var netti = pts.slice(discard).reduce(function (a, b) {
        return a + b;
      }, 0);
      var totali = pts.reduce(function (a, b) {
        return a + b;
      }, 0);
      return {
        nickname: s.nickname,
        team: s.team,
        netti: netti,
        totali: totali
      };
    });
    list.sort(function (a, b) {
      if (a.netti !== b.netti) return a.netti - b.netti;
      if (a.totali !== b.totali) return a.totali - b.totali;
      return a.nickname.localeCompare(b.nickname, "it");
    });
    return list;
  }
  w.CVISerieAperte = {
    esc: esc,
    calcPuntiRegata: calcPuntiRegata,
    calcClassificaSerie: calcClassificaSerie
  };
})(window);
