/* CVI – Pagina unificata EVENTI
   Unisce Eventi aperti e Serie Aperte in un’unica lista con filtri e card.
   Non modifica i motori di classifica esistenti. */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function locale() {
    return window.CVI && typeof CVI.locale === "function" ? CVI.locale() : "it-IT";
  }

  function fmtDate(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString(locale(), {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
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

  /** Deriva uno stato semplice per i filtri */
  function deriveStatus(item) {
    var now = Date.now();
    var start = item.start ? new Date(item.start).getTime() : null;
    var end = item.end ? new Date(item.end).getTime() : null;

    if (end && end < now) return "passato";
    if (start && start > now) return "prossimo";
    if ((start && start <= now) || (end && end >= now) || (!start && !end)) {
      // se ha risultati o è pubblicato senza date chiare → in corso
      return "in-corso";
    }
    return "prossimo";
  }

  var STYLE =
    ".ev-filters{display:flex;gap:.5rem;flex-wrap:wrap;margin:0 0 1.5rem}" +
    ".ev-filter{background:transparent;border:1px solid rgba(148,163,184,.25);color:#94a3b8;padding:.45rem 1rem;border-radius:999px;font-size:.875rem;cursor:pointer;transition:all .15s}" +
    ".ev-filter:hover{border-color:#38bdf8;color:#e2e8f0}" +
    ".ev-filter.active{background:#38bdf8;border-color:#38bdf8;color:#0b0f19;font-weight:700}" +
    ".ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.15rem}" +
    ".ev-card{background:var(--card-bg,#111827);border:1px solid rgba(56,189,248,.2);border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s;text-decoration:none;color:inherit;display:block}" +
    ".ev-card:hover{transform:translateY(-3px);border-color:#38bdf8}" +
    ".ev-card-poster{height:150px;background:linear-gradient(145deg,#1e3a5f,#0f172a);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}" +
    ".ev-card-poster img{width:100%;height:100%;object-fit:cover}" +
    ".ev-card-poster .ev-fallback{color:rgba(255,255,255,.7);font-weight:700;font-size:1.05rem;text-align:center;padding:1rem;line-height:1.3}" +
    ".ev-badge{position:absolute;top:10px;right:10px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:.22rem .6rem;border-radius:6px}" +
    ".ev-badge.in-corso{background:#22c55e;color:#052e16}" +
    ".ev-badge.prossimo{background:#38bdf8;color:#0b0f19}" +
    ".ev-badge.passato{background:#475569;color:#e2e8f0}" +
    ".ev-badge.serie{background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff}" +
    ".ev-card-body{padding:1rem 1.15rem 1.2rem}" +
    ".ev-card-type{font-size:.7rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#7dd3fc;margin-bottom:.3rem}" +
    ".ev-card-title{margin:0 0 .35rem;font-size:1.1rem;font-weight:700;color:#fff;line-height:1.25}" +
    ".ev-card-dates{color:#94a3b8;font-size:.85rem;margin-bottom:.25rem}" +
    ".ev-card-meta{color:#64748b;font-size:.8rem}" +
    ".ev-empty{text-align:center;padding:3rem 1rem;color:#64748b;font-size:.95rem}" +
    ".ev-loading{text-align:center;padding:2rem;color:#94a3b8}";

  function injectStyles() {
    if (document.getElementById("ev-unified-styles")) return;
    var st = document.createElement("style");
    st.id = "ev-unified-styles";
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  var allItems = [];
  var currentFilter = "all";

  function render(filter) {
    currentFilter = filter || "all";
    var grid = document.getElementById("eventi-grid");
    var empty = document.getElementById("eventi-empty");
    if (!grid) return;

    document.querySelectorAll(".ev-filter").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-filter") === currentFilter);
    });

    var list = allItems.slice();
    if (currentFilter === "serie") {
      list = list.filter(function (i) { return i.kind === "serie"; });
    } else if (currentFilter !== "all") {
      list = list.filter(function (i) { return i.status === currentFilter; });
    }

    // ordinamento: in corso prima, poi prossimi, poi passati; per data desc
    var order = { "in-corso": 0, "prossimo": 1, "passato": 2 };
    list.sort(function (a, b) {
      var oa = order[a.status] != null ? order[a.status] : 9;
      var ob = order[b.status] != null ? order[b.status] : 9;
      if (oa !== ob) return oa - ob;
      var da = a.sortDate || 0;
      var db = b.sortDate || 0;
      return db - da;
    });

    grid.innerHTML = "";
    if (!list.length) {
      if (empty) {
        empty.style.display = "block";
        empty.textContent =
          currentFilter === "prossimo"
            ? "Nessun evento in programma. La prossima regata comparirà qui."
            : currentFilter === "passato"
            ? "Ancora nessun evento passato."
            : "Nessun evento in questa sezione.";
      }
      return;
    }
    if (empty) empty.style.display = "none";

    list.forEach(function (item) {
      var badgeClass = item.status;
      var badgeText =
        item.status === "in-corso"
          ? "IN CORSO"
          : item.status === "prossimo"
          ? "PROSSIMO"
          : "PASSATO";

      var typeLabel = item.kind === "serie" ? "Serie" : "Evento";
      var href =
        item.kind === "serie"
          ? "eventi-aperti.html#serie-" + encodeURIComponent(item.id)
          : "eventi-aperti.html#evento-" + encodeURIComponent(item.id);

      var posterHtml = item.poster
        ? '<img src="' + esc(item.poster) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
          '<div class="ev-fallback" style="display:none">' + esc(item.title) + "</div>"
        : '<div class="ev-fallback">' + esc(item.title) + "</div>";

      var card = document.createElement("a");
      card.className = "ev-card";
      card.href = href;
      card.innerHTML =
        '<div class="ev-card-poster">' +
        posterHtml +
        '<span class="ev-badge ' + badgeClass + '">' + badgeText + "</span>" +
        "</div>" +
        '<div class="ev-card-body">' +
        '<div class="ev-card-type">' + typeLabel + "</div>" +
        '<h2 class="ev-card-title">' + esc(item.title) + "</h2>" +
        (item.dates ? '<div class="ev-card-dates">' + esc(item.dates) + "</div>" : "") +
        (item.meta ? '<div class="ev-card-meta">' + esc(item.meta) + "</div>" : "") +
        "</div>";
      grid.appendChild(card);
    });
  }

  async function load() {
    injectStyles();
    var container = document.getElementById("eventi-container");
    if (!container) return;

    if (!window.CVI || !CVI.supabase) {
      container.innerHTML =
        '<p class="ev-empty">Servizio non disponibile. Ricarica la pagina.</p>';
      return;
    }

    container.innerHTML =
      '<div class="ev-filters" id="eventi-filters">' +
      '<button type="button" class="ev-filter active" data-filter="all">Tutti</button>' +
      '<button type="button" class="ev-filter" data-filter="in-corso">In corso</button>' +
      '<button type="button" class="ev-filter" data-filter="prossimo">Prossimi</button>' +
      '<button type="button" class="ev-filter" data-filter="serie">Serie</button>' +
      '<button type="button" class="ev-filter" data-filter="passato">Passati</button>' +
      "</div>" +
      '<div class="ev-loading" id="eventi-loading">Caricamento eventi…</div>' +
      '<div class="ev-grid" id="eventi-grid" style="display:none"></div>' +
      '<div class="ev-empty" id="eventi-empty" style="display:none"></div>';

    document.getElementById("eventi-filters").addEventListener("click", function (e) {
      var btn = e.target.closest(".ev-filter");
      if (!btn) return;
      render(btn.getAttribute("data-filter"));
    });

    try {
      var sb = CVI.supabase;
      var items = [];

      // --- Serie Aperte ---
      var serRes = await sb
        .from("serie_aperte")
        .select("id,titolo,descrizione,data_inizio,data_fine,pubblicato,mostra_home")
        .eq("pubblicato", true)
        .order("data_inizio", { ascending: false, nullsFirst: false });

      (serRes.data || []).forEach(function (s) {
        var item = {
          id: s.id,
          kind: "serie",
          title: s.titolo,
          description: s.descrizione || "",
          start: s.data_inizio,
          end: s.data_fine,
          dates: fmtRange(s.data_inizio, s.data_fine),
          meta: "Serie aperta",
          poster: "",
          sortDate: s.data_inizio ? new Date(s.data_inizio).getTime() : 0
        };
        item.status = deriveStatus(item);
        items.push(item);
      });

      // --- Eventi aperti (singoli) ---
      var evRes = await sb
        .from("eventi_aperti")
        .select("id,titolo,descrizione,data_evento,pubblicato,mostra_home")
        .eq("pubblicato", true)
        .order("data_evento", { ascending: false, nullsFirst: false });

      (evRes.data || []).forEach(function (e) {
        var item = {
          id: e.id,
          kind: "evento",
          title: e.titolo,
          description: e.descrizione || "",
          start: e.data_evento,
          end: e.data_evento,
          dates: fmtDate(e.data_evento),
          meta: "Evento aperto",
          poster: "",
          sortDate: e.data_evento ? new Date(e.data_evento).getTime() : 0
        };
        item.status = deriveStatus(item);
        items.push(item);
      });

      allItems = items;

      var loading = document.getElementById("eventi-loading");
      var grid = document.getElementById("eventi-grid");
      if (loading) loading.style.display = "none";
      if (grid) grid.style.display = "grid";

      render("all");
    } catch (err) {
      console.warn("[CVI eventi unificati]", err);
      container.innerHTML =
        '<p class="ev-empty">Errore nel caricamento degli eventi.</p>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
