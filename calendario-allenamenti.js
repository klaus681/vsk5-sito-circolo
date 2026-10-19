/* CVI – inietta gli allenamenti nel calendario esistente */
(function () {
  "use strict";

  function waitCal(cb) {
    var n = 0;
    (function tick() {
      // calendario.js non espone API; ri-carichiamo eventi dopo e patchiamo DOM/state se accessibile
      if (window.CVI && CVI.supabase) return cb();
      if (++n > 80) return;
      setTimeout(tick, 50);
    })();
  }

  async function inject() {
    if (!window.CVI || !CVI.supabase) return;
    var path = (location.pathname || "").split("/").pop() || "";
    if (path !== "calendario.html" && path.indexOf("calendario") < 0) return;

    try {
      var r = await CVI.supabase
        .from("allenamenti")
        .select("id,titolo,descrizione,data_ora,classe_barca,stato,pubblicato")
        .eq("pubblicato", true)
        .neq("stato", "annullato")
        .order("data_ora", { ascending: true });
      if (r.error || !r.data || !r.data.length) return;

      // Aggiungi legenda se manca
      var legend = document.querySelector(".cal-legend");
      if (legend && !legend.querySelector(".cal-dot.allenamento")) {
        var span = document.createElement("span");
        span.innerHTML =
          '<i class="cal-dot allenamento" style="background:#fbbf24;width:10px;height:10px;border-radius:3px;display:inline-block"></i> Allenamenti';
        legend.appendChild(span);
      }

      // Filtro
      var filter = document.getElementById("cal-filter");
      if (filter && !filter.querySelector('option[value="allenamenti"]')) {
        var opt = document.createElement("option");
        opt.value = "allenamenti";
        opt.textContent = "Solo allenamenti";
        filter.appendChild(opt);
      }

      // Stile eventi
      if (!document.getElementById("cal-al-style")) {
        var st = document.createElement("style");
        st.id = "cal-al-style";
        st.textContent =
          ".cal-event.allenamento,.cal-week-event.allenamento{background:#fbbf24!important;color:#0b0f19!important}" +
          ".cal-dot.allenamento{background:#fbbf24}";
        document.head.appendChild(st);
      }

      var MONTH_NAMES = {
        gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
        luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11
      };

      function visibleMonth() {
        var title = (document.getElementById("cal-title") || {}).textContent || "";
        var m = title.match(/(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i);
        if (!m) return null;
        return { year: parseInt(m[2], 10), month: MONTH_NAMES[m[1].toLowerCase()] };
      }

      function currentFilter() {
        var f = document.getElementById("cal-filter");
        return f ? f.value : "all";
      }

      function dayKey(iso) {
        if (!iso) return "";
        var d = new Date(iso);
        if (!isNaN(d.getTime())) {
          return (
            d.getFullYear() +
            "-" +
            String(d.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(d.getDate()).padStart(2, "0")
          );
        }
        var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? m[1] + "-" + m[2] + "-" + m[3] : "";
      }

      function fmtTime(iso) {
        try {
          return new Date(iso).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit"
          });
        } catch (e) {
          return "";
        }
      }

      // Ricava le date delle 7 colonne della vista settimanale
      // dall'header (es. "Lun<br>19/10") e l'anno dal titolo.
      function weekColumns(box) {
        var heads = box.querySelectorAll(".cal-week-head");
        if (!heads.length) return [];
        var title = (document.getElementById("cal-title") || {}).textContent || "";
        var ym = title.match(/(\d{4})/);
        var titleYear = ym ? parseInt(ym[1], 10) : new Date().getFullYear();
        var cols = [];
        heads.forEach(function (head, index) {
          var m = (head.textContent || "").match(/(\d{1,2})\/(\d{1,2})/);
          if (!m) return;
          cols.push({
            index: index,
            day: parseInt(m[1], 10),
            month: parseInt(m[2], 10) - 1
          });
        });
        if (!cols.length) return [];
        var crossYear =
          cols.length > 1 &&
          cols[0].month === 11 &&
          cols[cols.length - 1].month === 0;
        cols.forEach(function (c) {
          c.year = crossYear && c.month === 11 ? titleYear - 1 : titleYear;
        });
        return cols;
      }

      function eventLink(a, cls) {
        var link = document.createElement("a");
        link.href = "allenamenti.html";
        link.className = cls + " allenamento";
        link.setAttribute("data-al-id", a.id);
        link.title = a.titolo || "Allenamento";
        link.textContent =
          (fmtTime(a.data_ora) ? fmtTime(a.data_ora) + " " : "") +
          (a.titolo || "Allenamento");
        return link;
      }

      function paintMonth(box) {
        var vm = visibleMonth();
        if (!vm) return;
        r.data.forEach(function (a) {
          if (!a.data_ora) return;
          var dt = new Date(a.data_ora);
          if (isNaN(dt.getTime())) return;
          if (dt.getFullYear() !== vm.year || dt.getMonth() !== vm.month) return;

          var key = dayKey(a.data_ora);
          var dayNum = parseInt(key.split("-")[2], 10);
          if (!dayNum) return;

          box.querySelectorAll(".cal-day").forEach(function (cell) {
            if (cell.classList.contains("other-month")) return;
            var numEl = cell.querySelector(".cal-day-num");
            if (!numEl || parseInt(numEl.textContent, 10) !== dayNum) return;
            if (cell.querySelector('[data-al-id="' + a.id + '"]')) return;
            cell.appendChild(eventLink(a, "cal-event"));
            cell.classList.add("has-events");
          });
        });
      }

      function paintWeek(box) {
        var cols = weekColumns(box);
        if (!cols.length) return;
        var cells = box.querySelectorAll(".cal-week-cell");
        if (!cells.length) return;

        r.data.forEach(function (a) {
          if (!a.data_ora) return;
          var dt = new Date(a.data_ora);
          if (isNaN(dt.getTime())) return;

          var col = null;
          for (var i = 0; i < cols.length; i++) {
            if (
              cols[i].year === dt.getFullYear() &&
              cols[i].month === dt.getMonth() &&
              cols[i].day === dt.getDate()
            ) {
              col = cols[i];
              break;
            }
          }
          if (!col) return;

          var hour = dt.getHours();
          if (hour < 8 || hour > 22) hour = 10;
          var cell = cells[(hour - 8) * 7 + col.index];
          if (!cell || cell.querySelector('[data-al-id="' + a.id + '"]')) return;
          cell.appendChild(eventLink(a, "cal-week-event"));
        });
      }

      function paint() {
        var box = document.getElementById("cal-container");
        if (!box || /Caricamento/i.test(box.textContent || "")) return;

        // Gli allenamenti compaiono solo con filtro "Tutte" o "Solo allenamenti".
        var f = currentFilter();
        if (f !== "all" && f !== "allenamenti") return;

        if (box.querySelector(".cal-month-grid")) paintMonth(box);
        else if (box.querySelector(".cal-week-grid")) paintWeek(box);
      }


      // Osserva re-render del calendario
      var box = document.getElementById("cal-container");
      if (box) {
        var obs = new MutationObserver(function () {
          setTimeout(paint, 50);
        });
        obs.observe(box, { childList: true, subtree: true });
      }
      setTimeout(paint, 500);
      setTimeout(paint, 1500);
      setTimeout(paint, 3000);
    } catch (e) {
      console.warn("[CVI calendario-allenamenti]", e);
    }
  }

  waitCal(function () {
    setTimeout(inject, 400);
    setTimeout(inject, 2000);
  });
})();
