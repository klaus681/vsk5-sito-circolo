/* CVI Virtual – Calendario mensile/settimanale (gare ufficiali + eventi aperti)
   Solo lettura. Non modifica tabelle né logiche admin esistenti. */
(function () {
  "use strict";

  var state = {
    view: "month",
    filter: "all",
    cursor: new Date(),
    events: [],
    loading: true
  };

  var WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  var MONTHS = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function startOfDay(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  /** Chiave giorno YYYY-MM-DD in locale (evita shift UTC) */
  function dayKeyFromDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  /** Per eventi: data di calendario dal valore salvato (primi 10 char se ISO) */
  function dayKeyFromEvent(iso) {
    if (!iso) return "";
    var s = String(iso).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    try {
      return dayKeyFromDate(new Date(s));
    } catch (e) {
      return "";
    }
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
    } catch (e) {
      return "";
    }
  }

  function fmtFull(iso) {
    if (!iso) return "Data da definire";
    try {
      var d = parseEventLocal(iso) || new Date(iso);
      return d.toLocaleString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso);
    }
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
        CVI.supabase
          .from("gare")
          .select("id, titolo, descrizione, data_gara, tipo")
          .order("data_gara", { ascending: true }),
        CVI.supabase
          .from("eventi_aperti")
          .select("id, titolo, descrizione, data_evento, pubblicato")
          .eq("pubblicato", true)
          .order("data_evento", { ascending: true })
      ]);

      var gare = (results[0].data || []);
      var aperti = (results[1].data || []);

      if (results[0].error) console.warn("[calendario] gare:", results[0].error.message);
      if (results[1].error) console.warn("[calendario] eventi_aperti:", results[1].error.message);

      var events = [];

      gare.forEach(function (g) {
        if (!g.data_gara) return;
        var gTipo = (g.tipo || "ufficiale").toLowerCase();
        var calType = gTipo === "aperto" ? "aperto" : (gTipo === "speciale" ? "speciale" : "ufficiale");
        if (calType !== "aperto" && calType !== "speciale") calType = "ufficiale";
        events.push({
          id: "g-" + g.id,
          type: calType,
          title: g.titolo || "Gara",
          date: g.data_gara,
          desc: g.descrizione || "",
          link: "gare.html"
        });
      });

      aperti.forEach(function (e) {
        if (!e.data_evento) return;
        events.push({
          id: "e-" + e.id,
          type: "aperto",
          title: e.titolo || "Evento aperto",
          date: e.data_evento,
          desc: e.descrizione || "",
          link: "eventi-aperti.html"
        });
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
      var sameMonth = mon.getMonth() === sun.getMonth();
      if (sameMonth) {
        el.textContent = mon.getDate() + "–" + sun.getDate() + " " + MONTHS[mon.getMonth()] + " " + mon.getFullYear();
      } else {
        el.textContent =
          mon.getDate() + " " + MONTHS[mon.getMonth()].slice(0, 3) +
          " – " + sun.getDate() + " " + MONTHS[sun.getMonth()].slice(0, 3) + " " + sun.getFullYear();
      }
    }
  }

  function renderMonth(container) {
    var year = state.cursor.getFullYear();
    var month = state.cursor.getMonth();
    var first = new Date(year, month, 1);
    var start = mondayOf(first);
    var today = startOfDay(new Date());
    var now = Date.now();

    var html = '<div class="cal-month-grid">';
    WEEKDAYS.forEach(function (w) {
      html += '<div class="cal-weekday">' + w + "</div>";
    });

    for (var i = 0; i < 42; i++) {
      var day = addDays(start, i);
      var inMonth = day.getMonth() === month;
      var isToday = isSameDay(day, today);
      var dayEvents = eventsOnDay(day);
      var cls = "cal-day" + (inMonth ? "" : " other-month") + (isToday ? " today" : "") + (dayEvents.length ? " has-events" : "");

      html += '<div class="' + cls + '">';
      html += '<div class="cal-day-num">' + day.getDate() + "</div>";

      var maxShow = 3;
      dayEvents.slice(0, maxShow).forEach(function (ev) {
        var past = (parseEventLocal(ev.date) || new Date(ev.date)).getTime() < now;
        html +=
          '<a href="#" class="cal-event ' + esc(ev.type) + (past ? " past" : "") +
          '" data-id="' + esc(ev.id) + '" title="' + esc(ev.title) + " · " + esc(fmtTime(ev.date)) + '">' +
          esc(fmtTime(ev.date)) + " " + esc(ev.title) +
          "</a>";
      });
      if (dayEvents.length > maxShow) {
        html += '<div class="cal-more">+' + (dayEvents.length - maxShow) + " altri</div>";
      }
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

    var html = '<div class="cal-week-grid">';
    html += '<div class="cal-week-corner"></div>';

    for (var d = 0; d < 7; d++) {
      var day = addDays(mon, d);
      var isToday = isSameDay(day, today);
      html +=
        '<div class="cal-week-head' + (isToday ? " today-col" : "") + '">' +
        WEEKDAYS[d] + "<br>" + day.getDate() + "/" + (day.getMonth() + 1) +
        "</div>";
    }

    hours.forEach(function (hour) {
      html += '<div class="cal-week-hour">' + String(hour).padStart(2, "0") + ":00</div>";
      for (var d = 0; d < 7; d++) {
        var day = addDays(mon, d);
        var isToday = isSameDay(day, today);
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

        html += '<div class="cal-week-cell' + (isToday ? " today-col" : "") + '">';
        dayEvents.forEach(function (ev) {
          html +=
            '<a href="#" class="cal-week-event ' + esc(ev.type) +
            '" data-id="' + esc(ev.id) + '" title="' + esc(ev.title) + '">' +
            esc(fmtTime(ev.date)) + " " + esc(ev.title) +
            "</a>";
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
      box.innerHTML = '<p class="loading-text" style="color:var(--text-muted);padding:2rem 0">Caricamento calendario...</p>';
      return;
    }

    if (state.view === "week") renderWeek(box);
    else renderMonth(box);

    box.querySelectorAll("[data-id]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var id = a.getAttribute("data-id");
        var ev = state.events.find(function (x) { return x.id === id; });
        if (!ev) return;
        var detail = document.getElementById("cal-detail");
        if (!detail) return;
        detail.style.display = "block";
        detail.innerHTML =
          "<h3>" + esc(ev.title) + "</h3>" +
          '<p class="cal-detail-meta">' + esc(fmtFull(ev.date)) +
          ' · <span class="cal-dot ' + esc(ev.type) + '" style="display:inline-block;vertical-align:middle"></span> ' +
          esc(ev.type === "aperto" ? "Evento aperto" : (ev.type === "speciale" ? "Evento speciale" : "Gara ufficiale")) +
          "</p>" +
          (ev.desc ? "<p>" + esc(ev.desc) + "</p>" : "") +
          (ev.link ? '<p><a href="' + esc(ev.link) + '">Vai alla pagina →</a></p>' : "");
        detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
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
    if (todayBtn) todayBtn.onclick = function () {
      state.cursor = new Date();
      render();
    };

    document.querySelectorAll(".cal-view-toggle").forEach(function (btn) {
      btn.onclick = function () {
        document.querySelectorAll(".cal-view-toggle").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state.view = btn.getAttribute("data-view") || "month";
        render();
      };
    });

    var filter = document.getElementById("cal-filter");
    if (filter) filter.onchange = function () {
      state.filter = filter.value || "all";
      render();
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
