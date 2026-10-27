/* CVI – helper condivisi per l’area Eventi (lista + pagina evento) */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function tr(key, fallback) {
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : fallback;
  }

  function locale() {
    return window.CVI && typeof CVI.locale === "function" ? CVI.locale() : "it-IT";
  }

  function toDate(d) {
    if (!d) return null;
    var x = new Date(d);
    return isNaN(x.getTime()) ? null : x;
  }

  function fmtDate(d, opts) {
    var x = toDate(d);
    if (!x) return "";
    try {
      return x.toLocaleDateString(locale(), opts || { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function fmtDateShort(d) {
    return fmtDate(d, { day: "2-digit", month: "short" }).toUpperCase();
  }

  function fmtDateTime(d) {
    var x = toDate(d);
    if (!x) return "";
    try {
      return x.toLocaleString(locale(), {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  function fmtTime(d) {
    var x = toDate(d);
    if (!x) return "";
    try {
      return x.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function fmtRange(a, b) {
    var d1 = fmtDate(a);
    var d2 = fmtDate(b);
    if (d1 && d2) return d1 + " – " + d2;
    return d1 || d2 || "";
  }

  function deriveStatus(start, end) {
    var now = Date.now();
    var s = toDate(start);
    var e = toDate(end);
    var st = s ? s.getTime() : null;
    var en = e ? e.getTime() : null;
    if (en && en < now) return "passato";
    if (st && st > now) return "prossimo";
    if ((st && st <= now) || (en && en >= now) || (!st && !en)) return "in-corso";
    return "prossimo";
  }

  function statusLabel(status) {
    if (status === "in-corso") return "IN CORSO";
    if (status === "prossimo") return "PROSSIMO";
    return "PASSATO";
  }

  function medalClass(pos) {
    if (pos === 1) return "gold";
    if (pos === 2) return "silver";
    if (pos === 3) return "bronze";
    return "";
  }

  function groupBy(rows, field) {
    var out = {};
    (rows || []).forEach(function (r) {
      var k = String(r[field]);
      if (!out[k]) out[k] = [];
      out[k].push(r);
    });
    return out;
  }

  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function eventHref(kind, id) {
    return "evento.html?tipo=" + encodeURIComponent(kind) + "&id=" + encodeURIComponent(id);
  }

  /* Giornate: usa serie_aperte_regate.giornata se presente, altrimenti la data. */
  function buildDays(regate) {
    var groups = [];
    var byKey = {};
    (regate || []).forEach(function (reg) {
      var key;
      if (reg.giornata != null && String(reg.giornata) !== "") {
        key = "g" + reg.giornata;
      } else {
        var d = toDate(reg.data_regata);
        key = d ? "d" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() : "nd";
      }
      if (!byKey[key]) {
        byKey[key] = { key: key, date: reg.data_regata || null, regate: [] };
        groups.push(byKey[key]);
      }
      byKey[key].regate.push(reg);
      if (!byKey[key].date && reg.data_regata) byKey[key].date = reg.data_regata;
    });
    groups.sort(function (a, b) {
      var da = a.date ? new Date(a.date).getTime() : 0;
      var db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
    groups.forEach(function (g, i) {
      g.index = i + 1;
      g.label = "D" + (i + 1);
      g.regate.forEach(function (reg, j) {
        reg._dayIndex = i + 1;
        reg._raceIndex = j + 1;
        reg._colLabel = pad2(i + 1) + "-" + (j + 1);
      });
    });
    return groups;
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  async function fetchFlags() {
    var map = {};
    try {
      if (!window.CVI || !CVI.supabase) return map;
      var res = await CVI.supabase.from("profiles_public").select("nickname,nazionalita");
      (res.data || []).forEach(function (p) {
        var key = String(p.nickname || "").trim().toLowerCase();
        if (key) map[key] = p.nazionalita || "";
      });
    } catch (e) {
      console.warn("[CVI eventi] bandiere", e);
    }
    return map;
  }

  function flagHtml(nickname, flags) {
    var code = flags ? flags[String(nickname || "").trim().toLowerCase()] : "";
    if (code && window.CVI && typeof CVI.flagImg === "function") {
      var img = CVI.flagImg(code);
      if (img) return img;
    }
    return '<span class="ev-flag-empty" aria-hidden="true"></span>';
  }

  async function currentUser() {
    try {
      if (!window.CVI || !CVI.supabase) return null;
      var res = await CVI.supabase.auth.getSession();
      var user = res && res.data && res.data.session && res.data.session.user;
      if (!user) return null;
      var p = await CVI.supabase.from("profiles_public").select("nickname").eq("id", user.id).maybeSingle();
      return { id: user.id, nickname: (p.data && p.data.nickname) || "" };
    } catch (e) {
      return null;
    }
  }

  function countdownText(ms) {
    if (ms <= 0) return "0d 00:00:00";
    var total = Math.floor(ms / 1000);
    var d = Math.floor(total / 86400);
    var h = Math.floor((total % 86400) / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    return d + "d " + pad2(h) + ":" + pad2(m) + ":" + pad2(s);
  }

  window.CVIEventi = {
    esc: esc,
    tr: tr,
    locale: locale,
    fmtDate: fmtDate,
    fmtDateShort: fmtDateShort,
    fmtDateTime: fmtDateTime,
    fmtTime: fmtTime,
    fmtRange: fmtRange,
    deriveStatus: deriveStatus,
    statusLabel: statusLabel,
    medalClass: medalClass,
    groupBy: groupBy,
    qs: qs,
    eventHref: eventHref,
    buildDays: buildDays,
    pad2: pad2,
    fetchFlags: fetchFlags,
    flagHtml: flagHtml,
    currentUser: currentUser,
    countdownText: countdownText
  };
})();

