/* CVI – helper condivisi per l’area Eventi (lista + pagina evento) */
(function () {
  "use strict";

  /* Traduzioni dell'area Eventi (lista + testi condivisi).
     Sono qui e non in cvi-core.js per non toccare il dizionario globale:
     evento.html carica già questo file. */
  var I18N = {
    it: {
      ev_doc_title: "Eventi - CVI Virtual",
      ev_page_title: "Eventi",
      ev_page_sub: "Campionati e eventi singoli. Classifiche separate da quelle ufficiali del circolo.",
      ev_loading: "Caricamento eventi…",
      ev_empty_all: "Nessun evento o campionato pubblicato al momento.",
      ev_error: "Errore nel caricamento degli eventi.",
      ev_unavailable: "Servizio non disponibile. Ricarica la pagina.",
      ev_group_live: "IN CORSO",
      ev_group_next: "PROSSIMI",
      ev_group_past: "PASSATI",
      ev_empty_live: "Nessun evento in corso.",
      ev_empty_next: "Nessun evento in programma. La prossima regata comparirà qui.",
      ev_empty_past: "Ancora nessun evento passato.",
      ev_status_live: "IN CORSO",
      ev_status_next: "PROSSIMO",
      ev_status_past: "PASSATO",
      ev_type_championship: "Campionato",
      ev_type_event: "Evento",
      ev_type_serie: "Serie aperta",
      ev_title_event: "Evento aperto",
      ev_races: "regate",
      ev_days: "giornate",
      ev_participants: "partecipanti",
      ev_until: "FINO AL",
      ev_max: "max"
    },
    en: {
      ev_doc_title: "Events - CVI Virtual",
      ev_page_title: "Events",
      ev_page_sub: "Championships and single events. Standings are separate from the club's official ones.",
      ev_loading: "Loading events…",
      ev_empty_all: "No events or championships published yet.",
      ev_error: "Error loading events.",
      ev_unavailable: "Service unavailable. Reload the page.",
      ev_group_live: "LIVE",
      ev_group_next: "UPCOMING",
      ev_group_past: "PAST",
      ev_empty_live: "No events live right now.",
      ev_empty_next: "No upcoming events. The next race will appear here.",
      ev_empty_past: "No past events yet.",
      ev_status_live: "LIVE",
      ev_status_next: "UPCOMING",
      ev_status_past: "PAST",
      ev_type_championship: "Championship",
      ev_type_event: "Event",
      ev_type_serie: "Open series",
      ev_title_event: "Open event",
      ev_races: "races",
      ev_days: "days",
      ev_participants: "participants",
      ev_until: "UNTIL",
      ev_max: "max"
    },
    fr: {
      ev_doc_title: "Événements - CVI Virtual",
      ev_page_title: "Événements",
      ev_page_sub: "Championnats et événements individuels. Classements séparés de ceux officiels du club.",
      ev_loading: "Chargement des événements…",
      ev_empty_all: "Aucun événement ni championnat publié pour le moment.",
      ev_error: "Erreur lors du chargement des événements.",
      ev_unavailable: "Service indisponible. Rechargez la page.",
      ev_group_live: "EN COURS",
      ev_group_next: "À VENIR",
      ev_group_past: "PASSÉS",
      ev_empty_live: "Aucun événement en cours.",
      ev_empty_next: "Aucun événement à venir. La prochaine régate apparaîtra ici.",
      ev_empty_past: "Aucun événement passé pour le moment.",
      ev_status_live: "EN COURS",
      ev_status_next: "À VENIR",
      ev_status_past: "PASSÉ",
      ev_type_championship: "Championnat",
      ev_type_event: "Événement",
      ev_type_serie: "Série ouverte",
      ev_title_event: "Événement ouvert",
      ev_races: "régates",
      ev_days: "journées",
      ev_participants: "participants",
      ev_until: "JUSQU'AU",
      ev_max: "max"
    },
    es: {
      ev_doc_title: "Eventos - CVI Virtual",
      ev_page_title: "Eventos",
      ev_page_sub: "Campeonatos y eventos individuales. Clasificaciones separadas de las oficiales del club.",
      ev_loading: "Cargando eventos…",
      ev_empty_all: "No hay eventos ni campeonatos publicados por el momento.",
      ev_error: "Error al cargar los eventos.",
      ev_unavailable: "Servicio no disponible. Recarga la página.",
      ev_group_live: "EN CURSO",
      ev_group_next: "PRÓXIMOS",
      ev_group_past: "PASADOS",
      ev_empty_live: "No hay eventos en curso.",
      ev_empty_next: "No hay eventos programados. La próxima regata aparecerá aquí.",
      ev_empty_past: "Aún no hay eventos pasados.",
      ev_status_live: "EN CURSO",
      ev_status_next: "PRÓXIMO",
      ev_status_past: "PASADO",
      ev_type_championship: "Campeonato",
      ev_type_event: "Evento",
      ev_type_serie: "Serie abierta",
      ev_title_event: "Evento abierto",
      ev_races: "regatas",
      ev_days: "jornadas",
      ev_participants: "participantes",
      ev_until: "HASTA EL",
      ev_max: "máx"
    }
  };

  function currentLang() {
    return (window.CVI && window.CVI.currentLang) || "it";
  }

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
    var dict = I18N[currentLang()] || I18N.it;
    if (dict && dict[key] != null) return dict[key];
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : (fallback == null ? key : fallback);
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
    I18N: I18N,
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

