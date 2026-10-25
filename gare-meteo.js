/* ============================================
   CVI Virtual - Meteo gara (dati manuali admin)
   Espone window.CVIMeteo:
     has(gara)                 -> true se c'e' meteo da mostrare
     buttonHTML(gara)          -> markup del pulsante (o "")
     open(gara)                -> apre il modale
     close()                   -> chiude il modale
     adminFieldsHTML(meteo, n) -> markup campi per il pannello admin
     readAdminFields(el, vis)  -> oggetto meteo dal form
     renderAdmin(el, meteo, n) -> disegna i campi admin
   ============================================ */
(function () {
  "use strict";

  var CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                   "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

  var FIELD_DEFS = [
    { key: "ora", labelKey: "meteo_f_ora", type: "time" },
    { key: "vento_nodi", labelKey: "meteo_f_vento", phKey: "meteo_ph_wind", type: "number", min: "0", max: "80", step: "0.1" },
    { key: "vento_dir", labelKey: "meteo_f_vento_dir", type: "number", min: "0", max: "360", step: "1", ph: "0-360", dir: true },
    { key: "corrente_nodi", labelKey: "meteo_f_corrente", phKey: "meteo_ph_current", type: "number", min: "0", max: "50", step: "0.1" },
    { key: "corrente_dir", labelKey: "meteo_f_corrente_dir", type: "number", min: "0", max: "360", step: "1", ph: "0-360", dir: true },
    { key: "temperatura", labelKey: "meteo_f_temp", phKey: "meteo_ph_temp", type: "number", min: "-20", max: "60", step: "1" },
    { key: "condizioni", labelKey: "meteo_f_cond", phKey: "meteo_ph_cond", type: "text" },
    { key: "nuvole", labelKey: "meteo_f_nuvole", phKey: "meteo_ph_clouds", type: "text" }
  ];

  function tr(key, fallback) {
    return window.CVI && typeof CVI.t === "function" ? CVI.t(key, fallback) : fallback;
  }

  function locale() {
    return window.CVI && typeof CVI.locale === "function" ? CVI.locale() : "it-IT";
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function txt(v) {
    return v == null ? "" : String(v).trim();
  }

  function toNum(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function fmtNum(v, dec) {
    var n = toNum(v);
    if (n == null) return "";
    var d = dec == null ? 1 : dec;
    return String(Number(n.toFixed(d)));
  }

  function cardinal(deg) {
    var n = toNum(deg);
    if (n == null) return "";
    var d = ((n % 360) + 360) % 360;
    return CARDINALS[Math.round(d / 22.5) % 16];
  }

  function directionLabel(deg) {
    var n = toNum(deg);
    if (n == null) return "";
    return fmtNum(n, n % 1 ? 1 : 0) + "° (" + cardinal(n) + ")";
  }

  function beaufort(kn) {
    var n = toNum(kn);
    if (n == null) return "";
    if (n < 1) return tr("bf_calm", "Calma");
    if (n < 4) return tr("bf_light_air", "Bava di vento");
    if (n < 7) return tr("bf_light_breeze", "Brezza leggera");
    if (n < 11) return tr("bf_moderate_breeze", "Brezza tesa");
    if (n < 17) return tr("bf_moderate", "Vento moderato");
    if (n < 22) return tr("bf_fresh", "Vento fresco");
    if (n < 28) return tr("bf_strong", "Vento forte");
    return tr("bf_gale", "Burrasca");
  }

  function hasData(r) {
    if (!r) return false;
    return ["vento_nodi", "vento_dir", "corrente_nodi", "corrente_dir",
            "temperatura", "condizioni", "nuvole"].some(function (k) {
      var v = r[k];
      return v !== null && v !== undefined && String(v).trim() !== "";
    });
  }

  function normalize(meteo) {
    if (!meteo) return null;
    var m = meteo;
    if (typeof m === "string") {
      try { m = JSON.parse(m); } catch (e) { return null; }
    }
    if (!m || typeof m !== "object" || Array.isArray(m)) return null;
    var list = Array.isArray(m.regate) ? m.regate : [];
    var regate = list.map(function (r) {
      if (!r || typeof r !== "object") return {};
      return {
        ora: txt(r.ora),
        vento_nodi: toNum(r.vento_nodi),
        vento_dir: toNum(r.vento_dir),
        corrente_nodi: toNum(r.corrente_nodi),
        corrente_dir: toNum(r.corrente_dir),
        temperatura: toNum(r.temperatura),
        condizioni: txt(r.condizioni),
        nuvole: txt(r.nuvole)
      };
    });
    return { visibile: m.visibile !== false, regate: regate };
  }

  function has(gara) {
    var m = normalize(gara && gara.meteo);
    if (!m || !m.visibile || !m.regate.length) return false;
    return m.regate.some(hasData);
  }

  function buttonHTML(gara) {
    if (!has(gara)) return "";
    return '<button type="button" class="btn-meteo" data-meteo-id="' +
      esc(gara.id) + '">🌤 Meteo</button>';
  }

  function compassSVG(dir) {
    var labels = CARDINALS.map(function (c, i) {
      var ang = (i * 22.5 - 90) * Math.PI / 180;
      var x = 130 + Math.cos(ang) * 103;
      var y = 130 + Math.sin(ang) * 103;
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
        '" class="cvi-compass-label' + (i % 4 === 0 ? " is-main" : "") +
        '" text-anchor="middle" dominant-baseline="middle">' + c + "</text>";
    }).join("");
    var n = toNum(dir);
    var rot = n == null ? 0 : ((n % 360) + 360) % 360;
    return '<svg viewBox="0 0 260 260" class="cvi-compass-svg" role="img" aria-label="Bussola del vento">' +
      '<circle cx="130" cy="130" r="116" class="cvi-compass-ring"></circle>' +
      '<circle cx="130" cy="130" r="90" class="cvi-compass-ring cvi-compass-ring-inner"></circle>' +
      labels +
      '<g transform="rotate(' + rot + ' 130 130)">' +
      '<polygon points="130,38 146,130 130,117 114,130" class="cvi-needle-wind"></polygon>' +
      '<polygon points="130,222 146,130 130,143 114,130" class="cvi-needle-tail"></polygon>' +
      "</g>" +
      '<circle cx="130" cy="130" r="7" class="cvi-compass-hub"></circle>' +
      "</svg>";
  }

  /* ---------- Campi admin ---------- */
  function adminFieldsHTML(meteo, count) {
    var m = meteo && typeof meteo === "object" ? meteo : null;
    var list = m && Array.isArray(m.regate) ? m.regate : [];
    count = Math.max(1, Math.min(3, parseInt(count, 10) || 1));
    var out = [];
    for (var i = 0; i < count; i++) {
      var r = list[i] || {};
      out.push('<div class="meteo-admin-race" data-meteo-race="' + i + '">' +
        "<h4>" + esc(tr("meteo_race", "Regata")) + " " + (i + 1) + "</h4>" +
        '<div class="meteo-admin-grid">');
      FIELD_DEFS.forEach(function (f) {
        var val = r[f.key] == null ? "" : String(r[f.key]);
        var ph = f.phKey ? tr(f.phKey, f.ph) : f.ph;
        out.push("<label>" + esc(tr(f.labelKey, f.label)) +
          '<input type="' + f.type + '" data-mf="' + f.key + '" value="' + esc(val) + '"' +
          (f.type === "number" ? ' inputmode="decimal"' : "") +
          (f.min != null ? ' min="' + f.min + '"' : "") +
          (f.max != null ? ' max="' + f.max + '"' : "") +
          (f.step != null ? ' step="' + f.step + '"' : "") +
          (ph ? ' placeholder="' + esc(ph) + '"' : "") + ">" +
          (f.dir ? '<span class="meteo-admin-dir-hint" data-met-dir="' + f.key + '">' +
            (toNum(val) == null ? "—" : directionLabel(val)) + "</span>" : "") +
          "</label>");
      });
      out.push("</div></div>");
    }
    return out.join("");
  }

  function readAdminFields(container, visibile) {
    if (!container) return null;
    var races = container.querySelectorAll("[data-meteo-race]");
    var out = [];
    var any = false;
    Array.prototype.forEach.call(races, function (race) {
      var obj = {};
      FIELD_DEFS.forEach(function (f) {
        var el = race.querySelector('[data-mf="' + f.key + '"]');
        var v = el ? String(el.value || "").trim() : "";
        if (f.type === "number") {
          obj[f.key] = v === "" ? null : toNum(v);
        } else {
          obj[f.key] = v || null;
        }
      });
      if (hasData(obj)) any = true;
      out.push(obj);
    });
    if (!any) return null;
    return { visibile: visibile !== false, regate: out };
  }

  function wireAdmin(container) {
    if (!container || container._cviMeteoWired) return;
    container._cviMeteoWired = true;
    container.addEventListener("input", function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var key = el.getAttribute("data-mf");
      if (key !== "vento_dir" && key !== "corrente_dir") return;
      var hint = container.querySelector('[data-met-dir="' + key + '"]');
      if (hint) {
        var n = toNum(el.value);
        hint.textContent = n == null ? "—" : directionLabel(n);
      }
    });
  }

  function renderAdmin(container, meteo, count) {
    if (!container) return;
    container.innerHTML = adminFieldsHTML(meteo, count);
    wireAdmin(container);
  }

  /* ---------- Modale pubblico ---------- */
  function raceTitle(gara) {
    return gara && gara.titolo ? String(gara.titolo) : tr("meteo_default_race", "Gara CVI");
  }

  function raceDate(gara, r) {
    var base = gara && gara.data_gara ? new Date(gara.data_gara) : null;
    if (!base || isNaN(base.getTime())) return "";
    var ora = r && String(r.ora || "");
    if (/^\d{1,2}:\d{2}/.test(ora)) {
      var parts = ora.split(":");
      base.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
    }
    try {
      return base.toLocaleString(locale(), {
        weekday: "short", day: "numeric", month: "short",
        year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch (e) {
      return base.toLocaleString();
    }
  }

  function infoLine(icon, label, value) {
    if (value == null || value === "") return "";
    return '<div class="cvi-info-line"><span class="ico">' + icon + "</span>" +
      '<span class="lbl">' + esc(label) + "</span>" +
      "<strong>" + esc(value) + "</strong></div>";
  }

  function gaugeHTML(kn) {
    var n = toNum(kn);
    if (n == null) return "";
    var pct = Math.max(0, Math.min(100, (n / 40) * 100));
    var w = pct.toFixed(1);
    return '<div class="cvi-gauge">' +
      '<div class="cvi-gauge-head"><span>' + esc(tr("meteo_wind_intensity", "Intensità vento")) + '</span><span>' + esc(beaufort(n)) + "</span></div>" +
      '<div class="cvi-gauge-track">' +
        '<span class="cvi-gauge-fill" style="width:' + w + '%"></span>' +
        '<span class="cvi-gauge-marker" style="left:' + w + '%"></span>' +
      "</div>" +
      '<div class="cvi-gauge-scale"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span></div>' +
      "</div>";
  }

  function conditionsHTML(r) {
    var items = [];
    if (r.condizioni) items.push("<li><span>" + esc(tr("meteo_conditions", "Condizioni")) + ':</span> <strong>' + esc(r.condizioni) + "</strong></li>");
    if (r.nuvole) items.push("<li><span>" + esc(tr("meteo_clouds", "Nuvole")) + ':</span> <strong>' + esc(r.nuvole) + "</strong></li>");
    if (r.temperatura != null) items.push("<li><span>" + esc(tr("meteo_temp", "Temperatura")) + ':</span> <strong>' + esc(fmtNum(r.temperatura, 1)) + " °C</strong></li>");
    if (!items.length) return "";
    return '<div class="cvi-conditions"><h3>' + esc(tr("meteo_conditions", "Condizioni")) + "</h3><ul>" + items.join("") + "</ul></div>";
  }

  function panelHTML(gara, r, index) {
    var wind = toNum(r.vento_nodi);
    var dirTxt = r.vento_dir != null ? directionLabel(r.vento_dir) : "";
    var current = null;
    if (r.corrente_nodi != null) {
      current = fmtNum(r.corrente_nodi, 1) + " " + tr("meteo_knots", "nodi") +
        (r.corrente_dir != null ? " (" + cardinal(r.corrente_dir) + ")" : "");
    }
    var info = infoLine("📅", tr("meteo_date", "Data gara"), raceDate(gara, r)) +
      infoLine("🌊", tr("meteo_current", "Corrente"), current);
    var windBlock = wind != null
      ? '<div class="cvi-wind-value"><span class="num">' + esc(fmtNum(wind, 1)) +
        '</span><span class="unit">' + esc(tr("meteo_knots", "nodi")) + '</span></div>' +
        '<div class="cvi-wind-caption"><span>' + esc(tr("meteo_wind_dir", "Direzione vento")) + '</span><span>' + esc(tr("meteo_wind_intensity", "Intensità vento")) + '</span></div>' +
        (dirTxt ? '<div class="cvi-wind-dir">' + esc(dirTxt) + "</div>" : "")
      : '<div class="cvi-meteo-empty">' + esc(tr("meteo_no_wind", "Dati del vento non inseriti.")) + '</div>';
    return '<div class="cvi-meteo-panel' + (index === 0 ? " is-active" : "") +
      '" role="tabpanel">' +
      '<div class="cvi-meteo-grid">' +
        '<div class="cvi-meteo-wind">' + compassSVG(r.vento_dir) + windBlock + "</div>" +
        '<div class="cvi-meteo-info">' + info + gaugeHTML(wind) + conditionsHTML(r) + "</div>" +
      "</div></div>";
  }

  function modalHTML(gara, m) {
    var tabs = m.regate.map(function (r, i) {
      return '<button type="button" class="cvi-meteo-tab' + (i === 0 ? " is-active" : "") +
        '" role="tab" data-cvi-tab="' + i + '" aria-selected="' + (i === 0 ? "true" : "false") +
        '">' + esc(tr("meteo_race", "Regata")) + " " + (i + 1) + "</button>";
    }).join("");
    var panels = m.regate.map(function (r, i) {
      return panelHTML(gara, r, i);
    }).join("");
    return '<div class="cvi-meteo-modal" role="dialog" aria-modal="true" aria-labelledby="cvi-meteo-title">' +
      '<button type="button" class="cvi-meteo-close" aria-label="' + esc(tr("meteo_close", "Chiudi")) + '">&times;</button>' +
      '<div class="cvi-meteo-head">' +
        '<h2 id="cvi-meteo-title">🌤 ' + esc(tr("meteo_title", "Meteo gara")) + "</h2>" +
        "<p><strong>" + esc(raceTitle(gara)) + "</strong> · " + esc(tr("meteo_official", "Condizioni ufficiali della regata")) + "</p>" +
      "</div>" +
      '<div class="cvi-meteo-tabs" role="tablist" aria-label="' + esc(tr("meteo_races", "Regate")) + '">' + tabs + "</div>" +
      '<div class="cvi-meteo-panels">' + panels + "</div>" +
      '<p class="cvi-meteo-note">' + esc(tr("meteo_note", "Condizioni meteo impostate dall'organizzazione per la regata.")) + "</p>" +
      "</div>";
  }

  var lastFocus = null;
  var escHandler = null;
  var lastGara = null;

  function close() {
    var b = document.querySelector(".cvi-meteo-backdrop");
    if (b && b.parentNode) b.parentNode.removeChild(b);
    document.body.classList.remove("cvi-meteo-open");
    if (escHandler) {
      document.removeEventListener("keydown", escHandler);
      escHandler = null;
    }
    if (lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus(); } catch (e) {}
    }
    lastFocus = null;
  }

  function open(gara) {
    var m = normalize(gara && gara.meteo);
    if (!m || !m.visibile || !m.regate.length || !m.regate.some(hasData)) return;
    lastGara = gara;
    close();
    lastFocus = document.activeElement;
    var backdrop = document.createElement("div");
    backdrop.className = "cvi-meteo-backdrop";
    backdrop.innerHTML = modalHTML(gara, m);
    document.body.appendChild(backdrop);
    document.body.classList.add("cvi-meteo-open");

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) close();
    });
    var closeBtn = backdrop.querySelector(".cvi-meteo-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    var tabs = backdrop.querySelectorAll("[data-cvi-tab]");
    var panels = backdrop.querySelectorAll(".cvi-meteo-panel");
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener("click", function () {
        var idx = tab.getAttribute("data-cvi-tab");
        Array.prototype.forEach.call(tabs, function (t) {
          var on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        Array.prototype.forEach.call(panels, function (p, i) {
          p.classList.toggle("is-active", String(i) === idx);
        });
      });
    });

    escHandler = function (e) {
      if (e.key === "Escape" || e.keyCode === 27) close();
    };
    document.addEventListener("keydown", escHandler);
    if (closeBtn) closeBtn.focus();
  }

  /* cambio lingua: se il modale è aperto lo ridisegna tradotto */
  document.addEventListener("cvi:langchange", function () {
    if (!lastGara) return;
    if (!document.querySelector(".cvi-meteo-backdrop")) return;
    var g = lastGara;
    close();
    open(g);
  });

  window.CVIMeteo = {
    has: has,
    buttonHTML: buttonHTML,
    open: open,
    close: close,
    normalize: normalize,
    cardinal: cardinal,
    directionLabel: directionLabel,
    adminFieldsHTML: adminFieldsHTML,
    readAdminFields: readAdminFields,
    renderAdmin: renderAdmin,
    wireAdmin: wireAdmin
  };
})();



