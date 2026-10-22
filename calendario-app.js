/* CVI Virtual - Calendario mensile/settimanale */
(function () {
  "use strict";

  var state = { view: "month", filter: "all", cursor: new Date(), events: [], loading: true };
  var SITE = "https://www.circolovelicoitalia.it";
  var WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  var MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }

  function startOfDay(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function dayKeyFromDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function dayKeyFromEvent(iso) {
    if (!iso) return "";
    var s = String(iso).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    try { return dayKeyFromDate(new Date(s)); } catch (e) { return ""; }
  }

  function parseEventLocal(iso) {
    if (!iso) return null;
    var s = String(iso).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      var p = s.split("-");
      return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
    }
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function mondayOf(d) {
    var x = startOfDay(d);
    var day = x.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function addDays(d, n) {
    var x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function fmtTime(iso) {
    if (!iso) return "";
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso).trim())) return "";
      var d = parseEventLocal(iso) || new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  function fmtFull(iso) {
    if (!iso) return "Data da definire";
    try {
      var d = parseEventLocal(iso) || new Date(iso);
      return d.toLocaleString("it-IT", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return String(iso); }
  }

  function filteredEvents() {
    var list = state.events;
    if (state.filter === "ufficiali") list = list.filter(function (e) { return e.type === "ufficiale" || e.type === "speciale"; });
    if (state.filter === "aperti") list = list.filter(function (e) { return e.type === "aperto"; });
    if (state.filter === "speciali") list = list.filter(function (e) { return e.type === "speciale"; });
    if (state.filter === "allenamenti") list = list.filter(function (e) { return e.type === "allenamento"; });
    return list;
  }

  function eventsOnDay(dayDate) {
    var key = dayKeyFromDate(dayDate);
    return filteredEvents().filter(function (e) {
      if (!e.date) return false;
      return dayKeyFromEvent(e.date) === key;
    });
  }

  async function loadEvents() {
    state.loading = true;
    render();
    if (!window.CVI || !CVI.supabase) {
      state.loading = false;
      state.events = [];
      render();
      setTimeout(function () {
        if (window.CVI && CVI.supabase) loadEvents();
      }, 600);
      return;
    }
    try {
      var results = await Promise.all([
        CVI.supabase.from("gare").select("id, titolo, descrizione, data_gara, tipo").order("data_gara", { ascending: true }),
        CVI.supabase.from("eventi_aperti").select("id, titolo, descrizione, data_evento, pubblicato").eq("pubblicato", true).order("data_evento", { ascending: true })
      ]);
      var gare = results[0].data || [];
      var aperti = results[1].data || [];
      if (results[0].error) console.warn("[calendario] gare:", results[0].error.message);
      if (results[1].error) console.warn("[calendario] eventi_aperti:", results[1].error.message);
      var events = [];
      gare.forEach(function (g) {
        if (!g.data_gara) return;
        var calType = g.tipo === "speciale" ? "speciale" : (g.tipo === "aperto" ? "aperto" : "ufficiale");
        events.push({ id: "g-" + g.id, type: calType, title: g.titolo || "Gara", date: g.data_gara, desc: g.descrizione || "", link: "gare.html" });
      });
      aperti.forEach(function (e) {
        if (!e.data_evento) return;
        events.push({ id: "e-" + e.id, type: "aperto", title: e.titolo || "Evento aperto", date: e.data_evento, desc: e.descrizione || "", link: "eventi-aperti.html" });
      });
      state.events = events;
    } catch (err) {
      console.warn("[calendario]", err);
      state.events = [];
    }
    state.loading = false;
    render();
  }

  function updateTitle() {
    var el = document.getElementById("cal-title");
    if (!el) return;
    if (state.view === "month") {
      el.textContent = MONTHS[state.cursor.getMonth()] + " " + state.cursor.getFullYear();
    } else {
      var mon = mondayOf(state.cursor);
      var sun = addDays(mon, 6);
      if (mon.getMonth() === sun.getMonth()) {
        el.textContent = mon.getDate() + "\u2013" + sun.getDate() + " " + MONTHS[mon.getMonth()] + " " + mon.getFullYear();
      } else {
        el.textContent = mon.getDate() + " " + MONTHS[mon.getMonth()].slice(0, 3) + " \u2013 " + sun.getDate() + " " + MONTHS[sun.getMonth()].slice(0, 3) + " " + sun.getFullYear();
      }
    }
  }

  function renderMonth(container) {
    var year = state.cursor.getFullYear();
    var month = state.cursor.getMonth();
    var start = mondayOf(new Date(year, month, 1));
    var today = startOfDay(new Date());
    var now = Date.now();
    var html = '<div class="cal-month-grid">';
    WEEKDAYS.forEach(function (w) { html += '<div class="cal-weekday">' + w + "</div>"; });
    for (var i = 0; i < 42; i++) {
      var day = addDays(start, i);
      var inMonth = day.getMonth() === month;
      var isToday = isSameDay(day, today);
      var dayEvents = inMonth ? eventsOnDay(day) : [];
      var cls = "cal-day" + (inMonth ? "" : " other-month") + (isToday ? " today" : "") + (dayEvents.length ? " has-events" : "");
      var dayNumLabel = inMonth
        ? String(day.getDate())
        : (String(day.getDate()) + " " + MONTHS[day.getMonth()].slice(0, 3).toLowerCase());
      html += '<div class="' + cls + '"><div class="cal-day-num">' + dayNumLabel + "</div>";
      dayEvents.slice(0, 3).forEach(function (ev) {
        var past = (parseEventLocal(ev.date) || new Date(ev.date)).getTime() < now;
        html += '<a href="#" class="cal-event ' + esc(ev.type) + (past ? " past" : "") + '" data-id="' + esc(ev.id) + '" title="' + esc(ev.title) + '">' + esc(fmtTime(ev.date)) + " " + esc(ev.title) + "</a>";
      });
      if (dayEvents.length > 3) html += '<div class="cal-more">+' + (dayEvents.length - 3) + " altri</div>";
      html += "</div>";
    }
    html += "</div>";
    container.innerHTML = html;
  }

  function renderWeek(container) {
    var mon = mondayOf(state.cursor);
    var today = startOfDay(new Date());
    var hours = [];
    for (var h = 8; h <= 22; h++) hours.push(h);
    var html = '<div class="cal-week-grid"><div class="cal-week-corner"></div>';
    for (var d = 0; d < 7; d++) {
      var day = addDays(mon, d);
      html += '<div class="cal-week-head' + (isSameDay(day, today) ? " today-col" : "") + '">' + WEEKDAYS[d] + "<br>" + day.getDate() + "/" + (day.getMonth() + 1) + "</div>";
    }
    hours.forEach(function (hour) {
      html += '<div class="cal-week-hour">' + String(hour).padStart(2, "0") + ":00</div>";
      for (var d = 0; d < 7; d++) {
        var day = addDays(mon, d);
        var dayEvents = eventsOnDay(day).filter(function (ev) {
          var t = parseEventLocal(ev.date) || new Date(ev.date);
          return !isNaN(t.getTime()) && t.getHours() === hour;
        });
        html += '<div class="cal-week-cell">';
        dayEvents.forEach(function (ev) {
          html += '<a href="#" class="cal-week-event ' + esc(ev.type) + '" data-id="' + esc(ev.id) + '">' + esc(fmtTime(ev.date)) + " " + esc(ev.title) + "</a>";
        });
        html += "</div>";
      }
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function render() {
    updateTitle();
    var box = document.getElementById("cal-container") || document.getElementById("cal-grid");
    if (!box) return;
    if (state.loading) {
      box.innerHTML = '<p class="cal-loading">Caricamento calendario\u2026</p>';
      return;
    }
    if (state.view === "month") renderMonth(box);
    else renderWeek(box);
    box.querySelectorAll("[data-id]").forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        openEvent(a.getAttribute("data-id"));
      };
    });
  }

  function openEvent(id) {
    var ev = state.events.find(function (x) { return x.id === id; });
    var modal = document.getElementById("cal-modal");
    if (!modal || !ev) return;
    document.getElementById("cal-modal-title").textContent = ev.title || "Evento";
    var tipo =
      ev.type === "aperto" ? "Evento aperto" :
      ev.type === "speciale" ? "Evento speciale" :
      ev.type === "allenamento" ? "Allenamento" : "Gara ufficiale";
    document.getElementById("cal-modal-meta").textContent = fmtFull(ev.date) + " \u00b7 " + tipo;
    document.getElementById("cal-modal-desc").textContent = ev.desc || "";
    var link = document.getElementById("cal-modal-link");
    if (link) {
      link.href = ev.link || "#";
      link.style.display = ev.link ? "inline-flex" : "none";
    }
    modal.style.display = "flex";
  }

  function closeModal() {
    var modal = document.getElementById("cal-modal");
    if (modal) modal.style.display = "none";
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function icsEscape(s) {
    return String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  function foldLine(line) {
    if (line.length <= 73) return line;
    var out = "", i = 0;
    while (i < line.length) {
      var size = i === 0 ? 73 : 72;
      var chunk = line.slice(i, i + size);
      out += (i === 0 ? "" : "\r\n ") + chunk;
      i += chunk.length;
    }
    return out;
  }

  function isDateOnly(iso) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || "").trim());
  }

  function icsStamp(iso) {
    var s = String(iso || "").trim();
    if (!s) return null;
    if (isDateOnly(s)) {
      var p = s.split("-");
      return { allDay: true, value: p[0] + p[1] + p[2] };
    }
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return { allDay: false, value: d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "") };
  }

  function utcStamp(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function addDaysToStamp(stamp, n) {
    var d = new Date(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8));
    d.setDate(d.getDate() + n);
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  function buildVEvent(ev) {
    var st = icsStamp(ev.date);
    if (!st) return "";
    var url = ev.link ? SITE + "/" + ev.link : SITE;
    var lines = ["BEGIN:VEVENT", "UID:" + ev.id + "@circolovelicoitalia.it", "DTSTAMP:" + utcStamp(new Date())];
    if (st.allDay) {
      lines.push("DTSTART;VALUE=DATE:" + st.value);
      lines.push("DTEND;VALUE=DATE:" + addDaysToStamp(st.value, 1));
    } else {
      lines.push("DTSTART:" + st.value);
      var end = new Date(ev.date);
      end.setTime(end.getTime() + 2 * 3600 * 1000);
      lines.push("DTEND:" + utcStamp(end));
    }
    lines.push("SUMMARY:" + icsEscape(ev.title || "Evento"));
    if (ev.desc) lines.push("DESCRIPTION:" + icsEscape(ev.desc));
    lines.push("URL:" + url);
    lines.push("END:VEVENT");
    return lines.map(foldLine).join("\r\n");
  }

  function downloadICS() {
    var list = filteredEvents();
    if (!list.length) {
      alert("Nessun evento da esportare.");
      return;
    }
    var body = list.map(buildVEvent).filter(Boolean).join("\r\n");
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Circolo Velico Italia//Calendario//IT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      body,
      "END:VCALENDAR"
    ].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cvi-calendario.ics";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function wire() {
    var prev = document.getElementById("cal-prev");
    var next = document.getElementById("cal-next");
    var todayBtn = document.getElementById("cal-today");
    if (prev) {
      prev.onclick = function () {
        if (state.view === "month") state.cursor.setMonth(state.cursor.getMonth() - 1);
        else state.cursor = addDays(state.cursor, -7);
        render();
      };
    }
    if (next) {
      next.onclick = function () {
        if (state.view === "month") state.cursor.setMonth(state.cursor.getMonth() + 1);
        else state.cursor = addDays(state.cursor, 7);
        render();
      };
    }
    if (todayBtn) {
      todayBtn.onclick = function () {
        state.cursor = new Date();
        render();
      };
    }

    document.querySelectorAll("[data-view], [data-cal-view]").forEach(function (btn) {
      btn.onclick = function () {
        state.view = btn.getAttribute("data-view") || btn.getAttribute("data-cal-view") || "month";
        document.querySelectorAll("[data-view], [data-cal-view]").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        render();
      };
    });

    var filterSel = document.getElementById("cal-filter");
    if (filterSel) {
      filterSel.onchange = function () {
        state.filter = filterSel.value || "all";
        render();
      };
    }

    var closeBtn = document.getElementById("cal-modal-close");
    if (closeBtn) closeBtn.onclick = closeModal;
    var modal = document.getElementById("cal-modal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }

    var icsBtn = document.getElementById("cal-ics") || document.getElementById("cal-ics-all");
    if (icsBtn) icsBtn.onclick = downloadICS;

    loadEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
