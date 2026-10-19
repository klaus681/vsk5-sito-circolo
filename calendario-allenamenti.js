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

      // Patch: dopo che calendario ha renderizzato, aggiungi eventi nei giorni
      // Approccio: per ogni allenamento trova la cella del giorno e appendi link
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

      function paint() {
        var box = document.getElementById("cal-container");
        if (!box || /Caricamento/i.test(box.textContent || "")) return;

        // Inietta solo nel mese attualmente visualizzato.
        var vm = visibleMonth();
        if (!vm) return;

        // Se il filtro nasconde gli allenamenti, non aggiungerli.
        var f = currentFilter();
        if (f !== "all" && f !== "allenamenti") return;

        r.data.forEach(function (a) {
          if (!a.data_ora) return;
          var dt = new Date(a.data_ora);
          if (isNaN(dt.getTime())) return;
          if (dt.getFullYear() !== vm.year || dt.getMonth() !== vm.month) return;

          var key = dayKey(a.data_ora);
          if (!key) return;
          var parts = key.split("-");
          var dayNum = parseInt(parts[2], 10);

          // Trova celle del giorno corrente (mese)
          box.querySelectorAll(".cal-day").forEach(function (cell) {
            if (cell.classList.contains("other-month")) return;
            var numEl = cell.querySelector(".cal-day-num");
            if (!numEl) return;
            if (parseInt(numEl.textContent, 10) !== dayNum) return;
            if (cell.querySelector('[data-al-id="' + a.id + '"]')) return;
            var link = document.createElement("a");
            link.href = "allenamenti.html";
            link.className = "cal-event allenamento";
            link.setAttribute("data-al-id", a.id);
            link.title = a.titolo || "Allenamento";
            link.textContent =
              (fmtTime(a.data_ora) ? fmtTime(a.data_ora) + " " : "") +
              (a.titolo || "Allenamento");
            cell.appendChild(link);
            cell.classList.add("has-events");
          });

          // Vista settimana
          box.querySelectorAll(".cal-week-cell").forEach(function (cell) {
            // meno preciso: aggiungi se data match nell'header della colonna
          });
        });

        // Non marcare permanente perché il calendario re-renderizza: ripeti
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
