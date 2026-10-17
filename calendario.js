/* CVI Virtual – Calendario mensile/settimanale */
(function () {
  "use strict";

  var state = { view: "month", filter: "all", cursor: new Date(), events: [], loading: true };
  var SITE = "https://www.circolovelicoitalia.it";
  var openEventId = null;
  var WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  var MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, String.fromCharCode(38, 97, 109, 112, 59))
      .replace(/</g, String.fromCharCode(38, 108, 116, 59))
      .replace(/>/g, String.fromCharCode(38, 103, 116, 59))
      .replace(/"/g, String.fromCharCode(38, 113, 117, 111, 116, 59));
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
      return d.toLocaleString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return String(iso); }
  }

  function filteredEvents() {
    var list = state.events;
    if (state.filter === "ufficiali") list = list.filter(function (e) { return e.type === "ufficiale" || e.type === "speciale"; });
    if (state.filter === "aperti") list = list.filter(function (e) { return e.type === "aperto"; });
    if (state.filter === "speciali") list = list.filter(function (e) { return e.type === "speciale"; });
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
        var gTipo = (g.tipo || "ufficiale").toLowerCase();
        var calType = gTipo === "aperto" ? "aperto" : (gTipo === "speciale" ? "speciale" : "ufficiale");
        events.push({ id: "g-" + g.id, type: calType, title: g.titolo || "Gara", date: g.data_gara, desc: g.descrizione || "", link: "gare.html" });
      });
      aperti.forEach(function (e) {
        if (!e.data_evento) return;
        events.push({ id: "e-" + e.id, type: "aperto", title: e.titolo || "Evento aperto", date: e.data_evento, desc: e.descrizione || "", link: "eventi-aperti.html" });
      });
      state.events = events;
    } catch (err) {
      console.error("[calendario]", err);
      state.events = [];
    }
    state.loading = false;
    render();
  }

  function renderTitle() {
    var el = document.getElementById("cal-title");
    if (!el) return;
    if (state.view === "month") {
      el.textContent = MONTHS[state.cursor.getMonth()] + " " + state.cursor.getFullYear();
    } else {
      var mon = mondayOf(state.cursor);
      var sun = addDays(mon, 6);
      if (mon.getMonth() === sun.getMonth()) {
        el.textContent = mon.getDate() + "–" + sun.getDate() + " " + MONTHS[mon.getMonth()] + " " + mon.getFullYear();
      } else {
        el.textContent = mon.getDate() + " " + MONTHS[mon.getMonth()].slice(0, 3) + " – " + sun.getDate() + " " + MONTHS[sun.getMonth()].slice(0, 3) + " " + sun.getFullYear();
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
      var dayEvents = eventsOnDay(day);
      var cls = "cal-day" + (inMonth ? "" : " other-month") + (isToday ? " today" : "") + (dayEvents.length ? " has-events" : "");
      html += '<div class="' + cls + '"><div class="cal-day-num">' + day.getDate() + "</div>";
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
          return t.getHours() === hour;
        });
        if (hour === 10) {
          eventsOnDay(day).forEach(function (ev) {
            var t = parseEventLocal(ev.date) || new Date(ev.date);
            if (t.getHours() < 8 || t.getHours() > 22) {
              if (dayEvents.indexOf(ev) < 0) dayEvents.push(ev);
            }
          });
        }
        html += '<div class="cal-week-cell' + (isSameDay(day, today) ? " today-col" : "") + '">';
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
    renderTitle();
    var box = document.getElementById("cal-container");
    if (!box) return;
    if (state.loading) {
      box.innerHTML = '<p class="cal-loading">Caricamento calendario…</p>';
      return;
    }
    if (state.view === "month") renderMonth(box);
    else renderWeek(box);
    box.querySelectorAll("[data-id]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(el.getAttribute("data-id"));
      });
    });
  }

  function openModal(id) {
    var ev = state.events.find(function (x) { return x.id === id; });
    if (!ev) return;
    openEventId = id;
    document.getElementById("cal-modal-title").textContent = ev.title;
    document.getElementById("cal-modal-meta").textContent =
      fmtFull(ev.date) + " · " + (ev.type === "aperto" ? "Evento aperto" : (ev.type === "speciale" ? "Evento speciale" : "Gara ufficiale"));
    document.getElementById("cal-modal-desc").textContent = ev.desc || "Nessuna descrizione.";
    var link = document.getElementById("cal-modal-link");
    if (link) {
      link.href = ev.link || "#";
      link.style.display = ev.link ? "inline-block" : "none";
    }
    document.getElementById("cal-modal").classList.add("open");
  }

  function closeModal() {
    var m = document.getElementById("cal-modal");
    if (m) m.classList.remove("open");
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function icsEscape(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
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

  function isDateOnly(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || "").trim()); }

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
      var end = new Date(ev.date); end.setTime(end.getTime() + 2 * 3600 * 1000);
      lines.push("DTEND:" + utcStamp(end));
    }
    lines.push("SUMMARY:" + icsEscape(ev.title || "Evento"));
    if (ev.desc) lines.push("DESCRIPTION:" + icsEscape(ev.desc));
    lines.push("URL:" + url);
    lines.push("LOCATION:Virtual Skipper \u2013 Circolo Velico Italia");
    lines.push("END:VEVENT");
    return lines.map(foldLine).join("\r\n");
  }

  function buildICS(events) {
    var parts = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CVI Virtual//Calendario//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    (events || []).forEach(function (ev) { var v = buildVEvent(ev); if (v) parts.push(v); });
    parts.push("END:VCALENDAR");
    return parts.join("\r\n") + "\r\n";
  }

  function downloadICS(filename, content) {
    var blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function exportAllICS() {
    var list = filteredEvents();
    if (!list.length) { alert("Nessun evento da esportare."); return; }
    downloadICS("calendario-cvi.ics", buildICS(list));
  }

  function exportEventICS(ev) {
    if (!ev) return;
    var safe = String(ev.title || "evento").replace(/[^\w\-]+/g, "_").slice(0, 40);
    downloadICS("cvi-" + safe + ".ics", buildICS([ev]));
  }

  function gcalUrl(ev) {
    var st = icsStamp(ev.date);
    if (!st) return "";
    var dates;
    if (st.allDay) {
      dates = st.value + "/" + addDaysToStamp(st.value, 1);
    } else {
      var end = new Date(ev.date); end.setTime(end.getTime() + 2 * 3600 * 1000);
      dates = st.value + "/" + utcStamp(end);
    }
    return "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent(ev.title || "Evento")
      + "&dates=" + dates
      + "&details=" + encodeURIComponent(ev.desc || "")
      + "&location=" + encodeURIComponent("Virtual Skipper \u2013 Circolo Velico Italia");
  }

  function currentEvent() {
    return state.events.find(function (x) { return x.id === openEventId; });
  }

  function wire() {
    var prev = document.getElementById("cal-prev");
    var next = document.getElementById("cal-next");
    var todayBtn = document.getElementById("cal-today");
    if (prev) prev.onclick = function () {
      if (state.view === "month") state.cursor.setMonth(state.cursor.getMonth() - 1);
      else state.cursor = addDays(state.cursor, -7);
      render();
    };
    if (next) next.onclick = function () {
      if (state.view === "month") state.cursor.setMonth(state.cursor.getMonth() + 1);
      else state.cursor = addDays(state.cursor, 7);
      render();
    };
    if (todayBtn) todayBtn.onclick = function () { state.cursor = new Date(); render(); };
    document.querySelectorAll(".cal-view-toggle").forEach(function (btn) {
      if (btn.id === "cal-today") return;
      btn.onclick = function () {
        document.querySelectorAll(".cal-view-toggle").forEach(function (b) {
          if (b.id !== "cal-today") b.classList.remove("active");
        });
        btn.classList.add("active");
        state.view = btn.getAttribute("data-view") || "month";
        render();
      };
    });
    var filter = document.getElementById("cal-filter");
    if (filter) filter.onchange = function () { state.filter = filter.value || "all"; render(); };
    var modal = document.getElementById("cal-modal");
    var closeBtn = document.getElementById("cal-modal-close");
    if (closeBtn) closeBtn.onclick = closeModal;
    if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
    var icsAllBtn = document.getElementById("cal-ics-all");
    if (icsAllBtn) icsAllBtn.onclick = exportAllICS;
    var icsBtn = document.getElementById("cal-modal-ics");
    if (icsBtn) icsBtn.onclick = function () { exportEventICS(currentEvent()); };
    var gcalBtn = document.getElementById("cal-modal-gcal");
    if (gcalBtn) gcalBtn.onclick = function () {
      var ev = currentEvent();
      var u = ev && gcalUrl(ev);
      if (u) window.open(u, "_blank", "noopener");
    };
  }

  function waitCVI(cb) {
    var n = 0;
    (function tick() {
      if (window.CVI && CVI.supabase) return cb();
      if (++n > 80) return cb();
      setTimeout(tick, 50);
    })();
  }

  function boot() {
    wire();
    waitCVI(loadEvents);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
