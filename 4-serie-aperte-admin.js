/* CVI Admin – Serie Aperte (classifiche professionali Low Point)
   Stati: FIN, DNF, DNS, DSQ, RET
   Import CSV supportato
   Completamente separato da gare ufficiali e soci
*/
(function () {
  "use strict";

  var STATI = [
    { v: "FIN", label: "FIN – Arrivato" },
    { v: "DNF", label: "DNF – Non terminato" },
    { v: "DNS", label: "DNS – Non partito" },
    { v: "DSQ", label: "DSQ – Squalificato" },
    { v: "RET", label: "RET – Ritirato" }
  ];

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso);
    }
  }

  function toLocal(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) {
      return String(n).padStart(2, "0");
    }
    return (
      d.getFullYear() +
      "-" +
      p(d.getMonth() + 1) +
      "-" +
      p(d.getDate()) +
      "T" +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes())
    );
  }

  function toDateInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) {
      return String(n).padStart(2, "0");
    }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  /* ---------- Calcolo punti (delegato a 2-serie-aperte-lib.js) ---------- */
  function lib() {
    return window.CVISerieAperte || null;
  }

  function calcPuntiRegata(rows, sistema) {
    var L = lib();
    return L ? L.calcPuntiRegata(rows, sistema) : rows || [];
  }

  function calcClassificaSerie(regateWithResults, scarti, opts) {
    var L = lib();
    return L ? L.calcClassificaSerie(regateWithResults, scarti, opts) : [];
  }

  /* Configurazione corrente del pannello regate */
  function saCfg() {
    var p = document.getElementById("sa-regate-panel");
    return {
      scarti: parseInt((p && p.dataset.scarti) || "0", 10) || 0,
      sistema: (p && p.dataset.sistema) || "low_point",
      scartiAuto: !!(p && p.dataset.scartiAuto === "1")
    };
  }

  function avvisoSqlMancante() {
    var st = document.getElementById("admin-status");
    if (st) {
      st.textContent =
        "Serie salvata. Esegui serie-aperte-vsk-sql.sql su Supabase per attivare tempi, sistema punteggio e scarti automatici.";
      st.className = "admin-status";
    }
  }

  /* Campi extra nel form serie (iniettati: valgono anche col pannello generato) */
  function ensureExtraOpts() {
    var form = document.getElementById("sa-form");
    if (!form || document.getElementById("sa-extra-opts")) return;
    var wrap = document.createElement("div");
    wrap.id = "sa-extra-opts";
    wrap.style.cssText =
      "display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:0.75rem;align-items:end";
    wrap.innerHTML =
      '<div><label class="adm-label" for="sa-sistema">Sistema punteggio</label>' +
      '<select class="adm-input" id="sa-sistema" style="width:100%">' +
      '<option value="low_point">Low Point (1° = 1 pt · DNF/DNS = N+1)</option>' +
      '<option value="high_point">High Point (1° = N pt · DNF = 0)</option>' +
      "</select></div>" +
      '<label style="color:#e2e8f0;font-size:0.88rem;padding-bottom:0.5rem">' +
      '<input type="checkbox" id="sa-scarti-auto"> Scarti automatici (1 ogni 4 regate)</label>';
    var actions = form.querySelector(".form-actions");
    if (actions && actions.parentNode === form) form.insertBefore(wrap, actions);
    else form.appendChild(wrap);
  }

  /* ---------- UI helpers ---------- */
  function statusBadge(stato) {
    var colors = {
      FIN: "#34d399",
      DNF: "#fbbf24",
      DNS: "#94a3b8",
      DSQ: "#f87171",
      RET: "#fb923c"
    };
    var c = colors[stato] || "#94a3b8";
    return (
      '<span style="display:inline-block;padding:0.12rem 0.45rem;border-radius:6px;font-size:0.72rem;font-weight:700;background:rgba(0,0,0,0.25);color:' +
      c +
      ";border:1px solid " +
      c +
      '40">' +
      esc(stato) +
      "</span>"
    );
  }

  /* ---------- Load lista serie ---------- */
  async function loadSerieAperteAdmin() {
    var box = document.getElementById("serie-aperte-list");
    if (!box || !window.CVI || !CVI.supabase) return;
    box.innerHTML = '<p class="loading-text">Caricamento…</p>';

    try {
      var res = await CVI.supabase
        .from("serie_aperte")
        .select("*")
        .order("data_inizio", { ascending: false, nullsFirst: false });

      if (res.error) throw res.error;
      var serie = res.data || [];

      if (!serie.length) {
        box.innerHTML =
          '<p class="empty-text">Nessuna serie aperta. Creane una con il form sopra.</p>';
        return;
      }

      var ids = serie.map(function (s) {
        return s.id;
      });
      var regRes = await CVI.supabase
        .from("serie_aperte_regate")
        .select("*")
        .in("serie_id", ids)
        .order("ordine");

      var bySerie = {};
      (regRes.data || []).forEach(function (r) {
        var k = String(r.serie_id);
        if (!bySerie[k]) bySerie[k] = [];
        bySerie[k].push(r);
      });

      box.innerHTML = serie
        .map(function (s) {
          var regs = bySerie[String(s.id)] || [];
          var flags = [];
          if (s.pubblicato)
            flags.push(
              '<span style="color:#34d399;font-weight:700;font-size:.75rem">PUBBLICATA</span>'
            );
          else
            flags.push(
              '<span style="color:#fbbf24;font-weight:700;font-size:.75rem">BOZZA</span>'
            );
          if (s.mostra_home)
            flags.push(
              '<span style="color:#7dd3fc;font-size:.75rem;font-weight:700">★ HOME</span>'
            );

          var regList =
            regs.length === 0
              ? '<span style="color:#64748b">Nessuna regata</span>'
              : regs
                  .map(function (r, i) {
                    return (
                      (i + 1) +
                      ". " +
                      esc(r.titolo) +
                      (r.data_regata
                        ? " <span style=\"color:#94a3b8\">(" +
                          esc(fmtDate(r.data_regata)) +
                          ")</span>"
                        : "")
                    );
                  })
                  .join("<br>");

          return (
            '<div class="admin-card" data-serie-id="' +
            esc(s.id) +
            '">' +
            '<div class="admin-card-head">' +
            "<div><strong style=\"color:#fff\">" +
            esc(s.titolo) +
            '</strong><div class="meta">' +
            esc(
              (s.data_inizio ? toDateInput(s.data_inizio) : "—") +
                " → " +
                (s.data_fine ? toDateInput(s.data_fine) : "—")
            ) +
            " · Scarti: " +
            (s.scarti_auto ? "auto (1/4)" : s.scarti || 0) +
            " · " +
            (s.sistema_punteggio === "high_point" ? "High Point" : "Low Point") +
            " · " +
            flags.join(" · ") +
            "</div></div>" +
            '<div style="display:flex;gap:.35rem;flex-wrap:wrap">' +
            '<button type="button" class="btn-sm sa-edit" data-id="' +
            esc(s.id) +
            '">Modifica</button> ' +
            '<button type="button" class="btn-sm sa-regate" data-id="' +
            esc(s.id) +
            '">Regate & Risultati</button> ' +
            '<button type="button" class="btn-danger-sm sa-del" data-id="' +
            esc(s.id) +
            '">Elimina</button></div></div>' +
            (s.descrizione
              ? '<p class="card-desc">' + esc(s.descrizione) + "</p>"
              : "") +
            '<div style="margin-top:.65rem;font-size:.88rem;color:#cbd5e1;line-height:1.5">' +
            regList +
            "</div></div>"
          );
        })
        .join("");

      box.querySelectorAll(".sa-edit").forEach(function (b) {
        b.onclick = function () {
          var s = serie.find(function (x) {
            return String(x.id) === b.getAttribute("data-id");
          });
          if (s) fillSerieForm(s);
        };
      });

      box.querySelectorAll(".sa-regate").forEach(function (b) {
        b.onclick = function () {
          openRegatePanel(b.getAttribute("data-id"), serie, bySerie);
        };
      });

      box.querySelectorAll(".sa-del").forEach(function (b) {
        b.onclick = async function () {
          if (
            !confirm(
              "Eliminare la serie, tutte le regate e i risultati collegati?"
            )
          )
            return;
          await CVI.supabase
            .from("serie_aperte")
            .delete()
            .eq("id", b.getAttribute("data-id"));
          loadSerieAperteAdmin();
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171">' +
        esc(e.message || e) +
        '</p><p class="sql-hint" style="display:block">Esegui <strong>serie-aperte-sql.sql</strong> su Supabase.</p>';
    }
  }

  function fillSerieForm(s) {
    ensureExtraOpts();
    document.getElementById("sa-id").value = s.id || "";
    document.getElementById("sa-titolo").value = s.titolo || "";
    document.getElementById("sa-desc").value = s.descrizione || "";
    document.getElementById("sa-inizio").value = toDateInput(s.data_inizio);
    document.getElementById("sa-fine").value = toDateInput(s.data_fine);
    document.getElementById("sa-scarti").value = s.scarti != null ? s.scarti : 0;
    document.getElementById("sa-pub").checked = !!s.pubblicato;
    document.getElementById("sa-home").checked = !!s.mostra_home;
    var sis = document.getElementById("sa-sistema");
    if (sis) sis.value = s.sistema_punteggio || "low_point";
    var sau = document.getElementById("sa-scarti-auto");
    if (sau) sau.checked = !!s.scarti_auto;
    document.getElementById("sa-form-title").textContent = s.id
      ? "Modifica serie aperta"
      : "Nuova serie aperta";
    document.getElementById("sa-cancel").style.display = s.id
      ? "inline-block"
      : "none";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetSerieForm() {
    fillSerieForm({
      id: "",
      titolo: "",
      descrizione: "",
      data_inizio: null,
      data_fine: null,
      scarti: 0,
      sistema_punteggio: "low_point",
      scarti_auto: false,
      pubblicato: false,
      mostra_home: false
    });
  }

  async function saveSerie(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var id = document.getElementById("sa-id").value.trim();
    var titolo = document.getElementById("sa-titolo").value.trim();
    if (!titolo) return alert("Titolo obbligatorio");

    var mostraHome = document.getElementById("sa-home").checked;
    var sisEl = document.getElementById("sa-sistema");
    var sauEl = document.getElementById("sa-scarti-auto");
    var payload = {
      titolo: titolo,
      descrizione: document.getElementById("sa-desc").value.trim() || null,
      data_inizio: document.getElementById("sa-inizio").value || null,
      data_fine: document.getElementById("sa-fine").value || null,
      scarti: parseInt(document.getElementById("sa-scarti").value, 10) || 0,
      pubblicato: document.getElementById("sa-pub").checked,
      mostra_home: mostraHome,
      updated_at: new Date().toISOString()
    };
    if (sisEl) payload.sistema_punteggio = sisEl.value || "low_point";
    if (sauEl) payload.scarti_auto = !!sauEl.checked;

    /* retro-compatibilità: se le colonne non esistono ancora, salva senza */
    function senzaExtra(p) {
      var c = {};
      Object.keys(p).forEach(function (k) {
        if (k !== "sistema_punteggio" && k !== "scarti_auto") c[k] = p[k];
      });
      return c;
    }

    var btn = document.getElementById("sa-save");
    if (btn) btn.disabled = true;

    try {
      if (mostraHome) {
        var clearQ = CVI.supabase
          .from("serie_aperte")
          .update({ mostra_home: false })
          .eq("mostra_home", true);
        if (id) clearQ = clearQ.neq("id", id);
        await clearQ;
      }

      if (id) {
        var u = await CVI.supabase
          .from("serie_aperte")
          .update(payload)
          .eq("id", id);
        if (u.error && colonnaMancante(u.error)) {
          u = await CVI.supabase
            .from("serie_aperte")
            .update(senzaExtra(payload))
            .eq("id", id);
          if (!u.error) avvisoSqlMancante();
        }
        if (u.error) throw u.error;
      } else {
        var ins = await CVI.supabase.from("serie_aperte").insert(payload);
        if (ins.error && colonnaMancante(ins.error)) {
          ins = await CVI.supabase
            .from("serie_aperte")
            .insert(senzaExtra(payload));
          if (!ins.error) avvisoSqlMancante();
        }
        if (ins.error) throw ins.error;
      }

      var st = document.getElementById("admin-status");
      if (st) {
        st.textContent =
          "Serie salvata" + (mostraHome ? " · in Home" : "");
        st.className = "admin-status ok";
      }
      resetSerieForm();
      loadSerieAperteAdmin();
    } catch (err) {
      alert(err.message || err);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ---------- Pannello Regate & Risultati ---------- */
  async function openRegatePanel(serieId, serieList, bySerieCache) {
    var panel = document.getElementById("sa-regate-panel");
    if (!panel) return;

    var s =
      (serieList || []).find(function (x) {
        return String(x.id) === String(serieId);
      }) || null;

    if (!s) {
      var r = await CVI.supabase
        .from("serie_aperte")
        .select("*")
        .eq("id", serieId)
        .maybeSingle();
      s = r.data;
    }
    if (!s) return alert("Serie non trovata");

    panel.style.display = "block";
    panel.dataset.serieId = serieId;
    panel.dataset.scarti = String(s.scarti || 0);
    panel.dataset.sistema = s.sistema_punteggio || "low_point";
    panel.dataset.scartiAuto = s.scarti_auto ? "1" : "0";
    document.getElementById("sa-regate-title").textContent =
      "Regate & Risultati – " + (s.titolo || "");

    await loadRegateOfSerie(serieId);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadRegateOfSerie(serieId) {
    var box = document.getElementById("sa-regate-list");
    if (!box) return;
    var cfg = saCfg();
    box.innerHTML = '<p class="loading-text">Caricamento regate…</p>';

    try {
      var regRes = await CVI.supabase
        .from("serie_aperte_regate")
        .select("*")
        .eq("serie_id", serieId)
        .order("ordine")
        .order("data_regata", { ascending: true, nullsFirst: false });

      if (regRes.error) throw regRes.error;
      var regate = regRes.data || [];

      if (!lib()) {
        box.innerHTML =
          '<p style="color:#f87171">Libreria serie-aperte non caricata (2-serie-aperte-lib.js).</p>';
        return;
      }

      if (!regate.length) {
        box.innerHTML =
          '<p class="empty-text">Nessuna regata in questa serie. Aggiungine una sotto oppure importa i log VSK.</p>';
        renderClassificaPreview([], cfg, []);
        return;
      }

      var regIds = regate.map(function (r) {
        return r.id;
      });
      var risRes = await CVI.supabase
        .from("serie_aperte_risultati")
        .select("*")
        .in("regata_id", regIds);

      var byReg = {};
      (risRes.data || []).forEach(function (r) {
        var k = String(r.regata_id);
        if (!byReg[k]) byReg[k] = [];
        byReg[k].push(r);
      });

      // Prepara dati per classifica
      var forClassifica = regate.map(function (reg) {
        var raw = byReg[String(reg.id)] || [];
        var scored = calcPuntiRegata(raw, cfg.sistema);
        return {
          id: reg.id,
          titolo: reg.titolo,
          ordine: reg.ordine,
          results: scored
        };
      });

      var classifica = calcClassificaSerie(forClassifica, cfg.scarti, cfg);
      renderClassificaPreview(classifica, cfg, regate);

      box.innerHTML = regate
        .map(function (reg, idx) {
          var rows = byReg[String(reg.id)] || [];
          rows.sort(function (a, b) {
            if (a.stato === "FIN" && b.stato === "FIN")
              return (a.posizione || 99) - (b.posizione || 99);
            if (a.stato === "FIN") return -1;
            if (b.stato === "FIN") return 1;
            return String(a.nickname).localeCompare(String(b.nickname), "it");
          });

          var scored = calcPuntiRegata(rows, cfg.sistema);
          var listHtml =
            rows.length === 0
              ? '<span style="color:#64748b">Nessun risultato</span>'
              : scored
                  .map(function (r) {
                    return (
                      statusBadge(r.stato) +
                      " " +
                      (r.stato === "FIN"
                        ? "<strong>" + esc(r.posizione) + "°</strong> "
                        : "") +
                      "<strong>" +
                      esc(r.nickname) +
                      "</strong>" +
                      (r.team ? " (" + esc(r.team) + ")" : "") +
                      (r.tempo_ms
                        ? ' <span style="color:#64748b">' +
                          esc(fmtTempo(r.tempo_ms)) +
                          "</span>"
                        : "") +
                      ' <span style="color:#94a3b8">→ ' +
                      r.punti +
                      " pt</span>"
                    );
                  })
                  .join("<br>");

          return (
            '<div class="admin-card" style="margin-bottom:0.75rem">' +
            '<div class="admin-card-head">' +
            "<div><strong style=\"color:#fff\">" +
            esc(reg.titolo) +
            '</strong><div class="meta">' +
            esc(fmtDate(reg.data_regata)) +
            " · Ordine: " +
            (reg.ordine != null ? reg.ordine : idx + 1) +
            " · " +
            rows.length +
            " skipper</div></div>" +
            '<div style="display:flex;gap:.35rem;flex-wrap:wrap">' +
            '<button type="button" class="btn-sm sa-edit-reg" data-id="' +
            esc(reg.id) +
            '">Modifica risultati</button> ' +
            '<button type="button" class="btn-sm sa-csv-reg" data-id="' +
            esc(reg.id) +
            '">⬇ CSV</button> ' +
            '<button type="button" class="btn-danger-sm sa-del-reg" data-id="' +
            esc(reg.id) +
            '">Elimina</button></div></div>' +
            '<div style="margin-top:.55rem;font-size:.88rem;color:#cbd5e1;line-height:1.55">' +
            listHtml +
            "</div></div>"
          );
        })
        .join("");

      // wire buttons
      box.querySelectorAll(".sa-edit-reg").forEach(function (b) {
        b.onclick = function () {
          var reg = regate.find(function (x) {
            return String(x.id) === b.getAttribute("data-id");
          });
          if (reg) openRisultatiEditor(reg, byReg[String(reg.id)] || []);
        };
      });

      box.querySelectorAll(".sa-csv-reg").forEach(function (b) {
        b.onclick = function () {
          var reg = regate.find(function (x) {
            return String(x.id) === b.getAttribute("data-id");
          });
          if (!reg) return;
          downloadRegataCSV(reg, byReg[String(reg.id)] || []);
        };
      });

      box.querySelectorAll(".sa-del-reg").forEach(function (b) {
        b.onclick = async function () {
          if (!confirm("Eliminare regata e tutti i suoi risultati?")) return;
          await CVI.supabase
            .from("serie_aperte_regate")
            .delete()
            .eq("id", b.getAttribute("data-id"));
          loadRegateOfSerie(serieId);
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  }

  function renderClassificaPreview(classifica, cfg, regate) {
    var el = document.getElementById("sa-classifica-preview");
    if (!el) return;
    var sistema = (cfg && cfg.sistema) || "low_point";
    var numScarti = classifica && classifica.length
      ? classifica[0].scartiUsati || 0
      : 0;
    var label =
      '<div style="margin-bottom:0.5rem;font-weight:700;color:#7dd3fc">Classifica generale' +
      '<span style="color:#94a3b8;font-weight:500;font-size:0.82rem"> · ' +
      (sistema === "high_point" ? "High Point" : "Low Point") +
      " · scarti: " +
      numScarti +
      (cfg && cfg.scartiAuto ? " (auto)" : "") +
      "</span></div>";

    if (!classifica || !classifica.length) {
      el.innerHTML =
        label +
        '<p style="color:#64748b;margin:0">Nessuna regata con risultati.</p>';
      return;
    }

    var regs = regate || [];
    var html = label + '<div style="overflow-x:auto">';
    html +=
      '<table class="admin-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th>';
    regs.forEach(function (_, i) {
      html += "<th>R" + (i + 1) + "</th>";
    });
    html += "<th>Totali</th><th>Netti</th><th>Gare</th></tr></thead><tbody>";

    classifica.slice(0, 20).forEach(function (r, i) {
      html +=
        "<tr><td><strong>" +
        (i + 1) +
        "</strong></td><td>" +
        esc(r.nickname) +
        "</td><td>" +
        esc(r.team || "—") +
        "</td>";
      (r.punti || []).forEach(function (p, idx) {
        if ((r.scartiIdx || []).indexOf(idx) !== -1) {
          html +=
            '<td style="color:#f87171;text-decoration:line-through">' + p + "</td>";
        } else {
          html += "<td>" + p + "</td>";
        }
      });
      html +=
        "<td>" +
        r.totali +
        "</td><td><strong>" +
        r.netti +
        "</strong></td><td>" +
        r.gare +
        "</td></tr>";
    });
    html += "</tbody></table></div>";
    if (classifica.length > 20)
      html +=
        '<p style="color:#94a3b8;font-size:0.82rem;margin:0.4rem 0 0">… e altri ' +
        (classifica.length - 20) +
        " skipper</p>";
    html +=
      '<div style="margin-top:0.5rem;display:flex;gap:0.4rem;flex-wrap:wrap">' +
      '<button type="button" class="btn-sm" id="sa-export-classifica">⬇ Esporta classifica CSV</button>' +
      '<button type="button" class="btn-sm" id="sa-export-excel">⬇ Esporta Excel (.xlsx)</button>' +
      '<button type="button" class="btn-sm" id="sa-copy-classifica">📋 Copia HTML</button>' +
      "</div>";
    el.innerHTML = html;

    var btn = document.getElementById("sa-export-classifica");
    if (btn) {
      btn.onclick = function () {
        exportClassificaCSV(classifica, regs, sistema);
      };
    }
    var xlsBtn = document.getElementById("sa-export-excel");
    if (xlsBtn) {
      xlsBtn.onclick = function () {
        exportClassificaExcel(classifica, regs, sistema, xlsBtn);
      };
    }
    var copyBtn = document.getElementById("sa-copy-classifica");
    if (copyBtn) {
      copyBtn.onclick = function () {
        copiaTesto(buildClassificaHtml(classifica, regs, sistema));
      };
    }
  }

  /* SheetJS caricato on-demand: nessun impatto sulle pagine pubbliche */
  function loadXlsx(cb) {
    if (window.XLSX) return cb(null);
    var prev = document.getElementById("sa-xlsx-lib");
    if (prev) {
      prev.addEventListener("load", function () {
        cb(window.XLSX ? null : new Error("modulo non disponibile"));
      });
      return;
    }
    var s = document.createElement("script");
    s.id = "sa-xlsx-lib";
    s.async = true;
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = function () {
      cb(window.XLSX ? null : new Error("modulo non disponibile"));
    };
    s.onerror = function () {
      cb(new Error("CDN non raggiungibile"));
    };
    document.head.appendChild(s);
  }

  function exportClassificaExcel(classifica, regate, sistema, btn) {
    var label = "⬇ Esporta Excel (.xlsx)";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Preparo Excel…";
    }
    loadXlsx(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
      if (err || !window.XLSX) {
        alert(
          "Modulo Excel non disponibile (" +
            (err && err.message ? err.message : "errore") +
            "). Esporto il CSV."
        );
        exportClassificaCSV(classifica, regate, sistema);
        return;
      }
      try {
        var XLSX = window.XLSX;
        var wb = XLSX.utils.book_new();

        /* Foglio 1: classifica generale */
        var head = ["Pos", "Skipper", "Team"];
        (regate || []).forEach(function (_, i) {
          head.push("R" + (i + 1));
        });
        head.push("Totali", "Netti", "Gare");
        var aoa = [head];
        (classifica || []).forEach(function (r, i) {
          var row = [i + 1, r.nickname, r.team || ""];
          (r.punti || []).forEach(function (p, idx) {
            var disc = (r.scartiIdx || []).indexOf(idx) !== -1;
            row.push(disc ? p + " (scartato)" : p);
          });
          row.push(r.totali, r.netti, r.gare);
          aoa.push(row);
        });
        var ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [{ wch: 5 }, { wch: 24 }, { wch: 16 }].concat(
          (regate || []).map(function () {
            return { wch: 11 };
          }),
          [{ wch: 9 }, { wch: 9 }, { wch: 7 }]
        );
        XLSX.utils.book_append_sheet(wb, ws, "Classifica");

        /* Fogli 2..N: singole regate */
        (regate || []).forEach(function (reg, rIdx) {
          var rows = [["Pos", "Skipper", "Stato", "Tempo", "Punti"]];
          var entries = [];
          (classifica || []).forEach(function (r) {
            var d = (r.dettaglio || [])[rIdx];
            if (!d) return;
            entries.push({
              pos: d.posizione || 999,
              nick: r.nickname,
              stato: d.stato,
              tempo: d.tempo_ms ? fmtTempo(d.tempo_ms) : "",
              punti: d.punti
            });
          });
          entries.sort(function (a, b) {
            return a.pos - b.pos;
          });
          entries.forEach(function (e) {
            rows.push([
              e.pos === 999 ? "" : e.pos,
              e.nick,
              e.stato,
              e.tempo,
              e.punti
            ]);
          });
          var wsR = XLSX.utils.aoa_to_sheet(rows);
          wsR["!cols"] = [
            { wch: 5 },
            { wch: 24 },
            { wch: 8 },
            { wch: 12 },
            { wch: 7 }
          ];
          var name = ("R" + (rIdx + 1) + " " + (reg.titolo || ""))
            .replace(/[\\\/\?\*\[\]:]/g, "")
            .slice(0, 31);
          XLSX.utils.book_append_sheet(wb, wsR, name || "R" + (rIdx + 1));
        });

        XLSX.writeFile(
          wb,
          "Classifica_Serie_Aperta_" +
            new Date().toISOString().slice(0, 10) +
            ".xlsx"
        );
        alert(
          "Excel generato: " +
            (sistema === "high_point" ? "High Point" : "Low Point") +
            ", " +
            (regate || []).length +
            " regate."
        );
      } catch (e) {
        alert(
          "Errore nella creazione dell'Excel: " +
            (e.message || e) +
            ". Esporto il CSV."
        );
        exportClassificaCSV(classifica, regate, sistema);
      }
    });
  }

  function buildClassificaHtml(classifica, regate, sistema) {
    var out =
      '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">\n' +
      '  <tr style="background-color:#1B365D;color:#ffffff">\n' +
      "    <th>Pos</th><th>Skipper</th><th>Team</th>";
    (regate || []).forEach(function (_, i) {
      out += "<th>R" + (i + 1) + "</th>";
    });
    out += "<th>Totali</th><th>Netti</th></tr>\n";
    (classifica || []).forEach(function (r, i) {
      out += "  <tr>\n";
      out += '    <td align="center"><b>' + (i + 1) + "</b></td>\n";
      out += "    <td>" + esc(r.nickname) + "</td>\n";
      out += "    <td>" + esc(r.team || "") + "</td>\n";
      (r.punti || []).forEach(function (p, idx) {
        var disc = (r.scartiIdx || []).indexOf(idx) !== -1;
        out += disc
          ? '    <td align="center" style="color:#e53e3e;text-decoration:line-through">' +
            p +
            "</td>\n"
          : '    <td align="center">' + p + "</td>\n";
      });
      out += '    <td align="center">' + r.totali + "</td>\n";
      out +=
        '    <td align="center" style="font-weight:bold;color:#00A8CC">' +
        r.netti +
        "</td>\n";
      out += "  </tr>\n";
    });
    out += "</table>\n";
    out +=
      "<p><small>" +
      (sistema === "high_point" ? "High Point" : "Low Point") +
      " · barrato = scarto</small></p>";
    return out;
  }

  function copiaTesto(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          alert("HTML della classifica copiato negli appunti.");
        },
        function () {
          copiaFallback(text);
        }
      );
    } else {
      copiaFallback(text);
    }
  }

  function copiaFallback(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      alert("HTML della classifica copiato negli appunti.");
    } catch (e) {
      alert("Impossibile copiare: " + (e.message || e));
    }
    document.body.removeChild(ta);
  }

  function exportClassificaCSV(classifica, regate, sistema) {
    var lines = [];
    var head = ["Pos", "Skipper", "Team"];
    (regate || []).forEach(function (_, i) {
      head.push("R" + (i + 1));
    });
    head.push("Totali", "Netti", "Gare");
    lines.push(head.join(";"));
    (classifica || []).forEach(function (r, i) {
      var cells = [i + 1, r.nickname, r.team || ""];
      (r.punti || []).forEach(function (p, idx) {
        var disc = (r.scartiIdx || []).indexOf(idx) !== -1;
        cells.push(disc ? "(" + p + ")" : p);
      });
      cells.push(r.totali, r.netti, r.gare);
      lines.push(cells.join(";"));
    });
    lines.push("");
    lines.push(
      "# Sistema: " +
        (sistema === "high_point" ? "High Point" : "Low Point") +
        " · (n) = scartato"
    );
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;"
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "classifica-serie-aperta.csv";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  /* ---------- Editor risultati di una regata ---------- */
  function openRisultatiEditor(reg, rows) {
    var modal = document.getElementById("sa-ris-modal");
    if (!modal) return;
    modal.style.display = "block";
    document.getElementById("sa-ris-reg-id").value = reg.id;
    document.getElementById("sa-ris-reg-title").textContent =
      "Risultati – " + (reg.titolo || "");

    var body = document.getElementById("sa-ris-body");
    body.innerHTML = "";
    if (rows && rows.length) {
      rows.forEach(function (r) {
        addRisRow(
          r.stato || "FIN",
          r.posizione,
          r.nickname,
          r.team,
          r.note,
          r.tempo_ms ? r.tempo_ms : ""
        );
      });
    } else {
      for (var i = 0; i < 5; i++) addRisRow("FIN", i + 1, "", "", "", "");
    }
  }

  function addRisRow(stato, pos, nick, team, note, tempo) {
    var body = document.getElementById("sa-ris-body");
    if (!body) return;
    var tempoFmt = "";
    if (tempo !== "" && tempo != null) {
      tempoFmt =
        lib() && isFinite(Number(tempo)) && Number(tempo) > 0
          ? lib().formatMs(Number(tempo))
          : String(tempo);
    }
    var tr = document.createElement("tr");
    var opts = STATI.map(function (s) {
      return (
        '<option value="' +
        s.v +
        '"' +
        (s.v === (stato || "FIN") ? " selected" : "") +
        ">" +
        s.label +
        "</option>"
      );
    }).join("");

    tr.innerHTML =
      '<td><select class="adm-select sa-stato" style="min-width:7.5rem">' +
      opts +
      "</select></td>" +
      '<td><input type="number" min="1" class="adm-input sa-pos" value="' +
      esc(pos || "") +
      '" style="width:4rem" placeholder="—"></td>' +
      '<td><input type="text" class="adm-input sa-nick" value="' +
      esc(nick || "") +
      '" placeholder="Nickname" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input sa-team" value="' +
      esc(team || "") +
      '" placeholder="Team" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input sa-tempo" value="' +
      esc(tempoFmt) +
      '" placeholder="mm:ss.mmm" style="width:7.5rem"></td>' +
      '<td><input type="text" class="adm-input sa-note" value="' +
      esc(note || "") +
      '" placeholder="Note" style="width:100%"></td>' +
      '<td><button type="button" class="btn-danger-sm sa-rm">×</button></td>';
    body.appendChild(tr);
    tr.querySelector(".sa-rm").onclick = function () {
      tr.remove();
    };
    // se stato != FIN, disabilita posizione
    var sel = tr.querySelector(".sa-stato");
    var posInp = tr.querySelector(".sa-pos");
    function syncPos() {
      if (sel.value !== "FIN") {
        posInp.value = "";
        posInp.disabled = true;
      } else {
        posInp.disabled = false;
      }
    }
    sel.onchange = syncPos;
    syncPos();
  }

  async function saveRisultati() {
    var regId = document.getElementById("sa-ris-reg-id").value;
    if (!regId) return;

    var rows = [];
    document.querySelectorAll("#sa-ris-body tr").forEach(function (tr) {
      var nick = (tr.querySelector(".sa-nick") || {}).value;
      nick = nick ? String(nick).trim() : "";
      if (!nick) return;
      var stato = (tr.querySelector(".sa-stato") || {}).value || "FIN";
      var posRaw = (tr.querySelector(".sa-pos") || {}).value;
      var pos = posRaw ? parseInt(posRaw, 10) : null;
      var tempoRaw = (tr.querySelector(".sa-tempo") || {}).value || "";
      var tempoMs = lib() ? lib().parseTimeToMs(tempoRaw) : 0;
      if (stato === "FIN" && (!pos || pos < 1)) {
        // se manca posizione ma è FIN, mettiamo comunque e avvisiamo dopo
      }
      rows.push({
        regata_id: regId,
        nickname: nick,
        team: ((tr.querySelector(".sa-team") || {}).value || "").trim() || null,
        stato: stato,
        posizione: stato === "FIN" ? pos : null,
        tempo_ms: tempoMs > 0 ? tempoMs : null,
        note: ((tr.querySelector(".sa-note") || {}).value || "").trim() || null
      });
    });

    try {
      await CVI.supabase
        .from("serie_aperte_risultati")
        .delete()
        .eq("regata_id", regId);
      if (rows.length) {
        var ir = await CVI.supabase
          .from("serie_aperte_risultati")
          .insert(rows);
        if (ir.error && colonnaMancante(ir.error)) {
          var rowsLegacy = rows.map(function (r) {
            return {
              regata_id: r.regata_id,
              nickname: r.nickname,
              team: r.team,
              stato: r.stato,
              posizione: r.posizione,
              note: r.note
            };
          });
          ir = await CVI.supabase
            .from("serie_aperte_risultati")
            .insert(rowsLegacy);
          if (!ir.error) avvisoSqlMancante();
        }
        if (ir.error) throw ir.error;
      }
      document.getElementById("sa-ris-modal").style.display = "none";
      var serieId = document.getElementById("sa-regate-panel").dataset.serieId;
      loadRegateOfSerie(serieId);
      var st = document.getElementById("admin-status");
      if (st) {
        st.textContent = "Risultati salvati (" + rows.length + " skipper)";
        st.className = "admin-status ok";
      }
    } catch (err) {
      alert(err.message || err);
    }
  }

  /* ---------- Import log VSK (multi-file) ---------- */

  function fmtTempo(ms) {
    var L = lib();
    return L && ms ? L.formatMs(ms) : "—";
  }

  function vskLog(msg, color) {
    var el = document.getElementById("sa-vsk-log");
    if (!el) return;
    var p = document.createElement("div");
    p.style.color = color || "#cbd5e1";
    p.textContent = msg;
    el.appendChild(p);
  }

  function titoloDaFile(name) {
    var base = String(name || "").replace(/\.(csv|txt)$/i, "");
    var m = base.match(
      /(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})/
    );
    if (m) {
      var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      if (!isNaN(d.getTime())) {
        return {
          titolo:
            "Regata " +
            d.toLocaleString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            }),
          data: d.toISOString()
        };
      }
    }
    var m2 = base.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
    if (m2) {
      var d2 = new Date(+m2[1], +m2[2] - 1, +m2[3], 12, 0, 0);
      return {
        titolo: "Regata " + d2.toLocaleDateString("it-IT"),
        data: d2.toISOString()
      };
    }
    return { titolo: base || "Regata VSK", data: null };
  }

  function readFileText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(String(r.result || ""));
      };
      r.onerror = function () {
        reject(r.error || new Error("lettura fallita"));
      };
      r.readAsText(file, "UTF-8");
    });
  }

  function colonnaMancante(err) {
    return /column|schema cache|sorgente_file|sistema_punteggio|scarti_auto|tempo_ms|account_vsk|nickname_raw/i.test(
      String((err && err.message) || err || "")
    );
  }

  async function importVskFiles(fileList) {
    var panel = document.getElementById("sa-regate-panel");
    var serieId = panel && panel.dataset.serieId;
    if (!serieId) return alert("Apri prima una serie (Regate & Risultati).");
    if (!lib()) return alert("Libreria serie-aperte non caricata.");

    var files = Array.prototype.slice
      .call(fileList || [])
      .filter(function (f) {
        return /\.(csv|txt)$/i.test(f.name);
      });
    if (!files.length) {
      alert("Seleziona uno o più file .csv di Virtual Skipper.");
      return;
    }

    var logEl = document.getElementById("sa-vsk-log");
    if (logEl) logEl.innerHTML = "";
    var cleanEl = document.getElementById("sa-vsk-clean");
    var doClean = !cleanEl || cleanEl.checked;

    var prev = await CVI.supabase
      .from("serie_aperte_regate")
      .select("ordine,sorgente_file")
      .eq("serie_id", serieId);
    if (prev.error)
      prev = await CVI.supabase
        .from("serie_aperte_regate")
        .select("ordine")
        .eq("serie_id", serieId);
    var existing = {};
    var ordine = 0;
    (prev.data || []).forEach(function (r) {
      if (r.sorgente_file) existing[String(r.sorgente_file)] = true;
      if ((r.ordine || 0) > ordine) ordine = r.ordine || 0;
    });

    var ok = 0,
      skip = 0,
      fail = 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (existing[file.name]) {
        skip++;
        vskLog("⏭ " + file.name + " già importata, saltata.", "#fbbf24");
        continue;
      }
      try {
        var text = await readFileText(file);
        var rows = lib().parseVskCsv(text);
        if (!rows.length) {
          fail++;
          vskLog("⚠ " + file.name + ": nessuno skipper riconosciuto.", "#fbbf24");
          continue;
        }
        var meta = titoloDaFile(file.name);
        ordine += 1;

        var regPayload = {
          serie_id: serieId,
          titolo: meta.titolo,
          data_regata: meta.data,
          ordine: ordine,
          sorgente_file: file.name
        };
        var regIns = await CVI.supabase
          .from("serie_aperte_regate")
          .insert(regPayload)
          .select("id")
          .single();
        if (regIns.error && colonnaMancante(regIns.error)) {
          delete regPayload.sorgente_file;
          regIns = await CVI.supabase
            .from("serie_aperte_regate")
            .insert(regPayload)
            .select("id")
            .single();
          if (!regIns.error)
            vskLog(
              "⚠ Colonna sorgente_file assente: esegui serie-aperte-vsk-sql.sql.",
              "#fbbf24"
            );
        }
        if (regIns.error) throw regIns.error;

        var regId = regIns.data && regIns.data.id;
        var payload = rows.map(function (r) {
          return {
            regata_id: regId,
            nickname: doClean
              ? lib().cleanNick(r.nickname_raw) || r.nickname
              : r.nickname_raw,
            nickname_raw: r.nickname_raw,
            account_vsk: r.account_vsk,
            stato: r.stato,
            posizione: r.posizione,
            tempo_ms: r.tempo_ms
          };
        });
        var ins = await CVI.supabase
          .from("serie_aperte_risultati")
          .insert(payload);
        if (ins.error && colonnaMancante(ins.error)) {
          payload = payload.map(function (r) {
            return {
              regata_id: r.regata_id,
              nickname: r.nickname,
              stato: r.stato,
              posizione: r.posizione
            };
          });
          ins = await CVI.supabase
            .from("serie_aperte_risultati")
            .insert(payload);
          if (!ins.error)
            vskLog(
              "⚠ Tempi e account non salvati: esegui serie-aperte-vsk-sql.sql.",
              "#fbbf24"
            );
        }
        if (ins.error) throw ins.error;

        ok++;
        vskLog(
          "✅ " +
            file.name +
            " → " +
            meta.titolo +
            " (" +
            rows.length +
            " skipper)",
          "#34d399"
        );
      } catch (e) {
        fail++;
        vskLog("❌ " + file.name + ": " + (e.message || e), "#f87171");
      }
    }

    vskLog(
      "Import terminati: " + ok + " ok · " + skip + " saltati · " + fail + " errori.",
      fail ? "#fbbf24" : "#7dd3fc"
    );
    await loadRegateOfSerie(serieId);

    var st = document.getElementById("admin-status");
    if (st && ok) {
      st.textContent = "Importate " + ok + " regate VSK";
      st.className = "admin-status ok";
    }
  }

  function ensureVskImport() {
    var panel = document.getElementById("sa-regate-panel");
    if (!panel || document.getElementById("sa-vsk-import")) return;
    var box = document.createElement("details");
    box.id = "sa-vsk-import";
    box.style.cssText =
      "margin-bottom:1rem;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.25);border-radius:12px;padding:0.85rem 1rem";
    box.innerHTML =
      '<summary style="cursor:pointer;color:#7dd3fc;font-weight:700;font-size:0.92rem">⚡ Importa log VSK (.csv multipli)</summary>' +
      '<div id="sa-vsk-drop" style="margin-top:0.75rem;border:2px dashed rgba(125,211,252,0.35);border-radius:12px;padding:1.1rem;text-align:center;cursor:pointer;color:#94a3b8;font-size:0.88rem">' +
      "Trascina qui i file <strong>Result_YYYY_MM_DD_HH_MM_SS.csv</strong> oppure " +
      '<span style="color:#7dd3fc;text-decoration:underline">sfoglia dal computer</span>' +
      "</div>" +
      '<input type="file" id="sa-vsk-files" multiple accept=".csv,.txt,text/csv" style="display:none">' +
      '<label style="display:block;margin-top:0.6rem;color:#e2e8f0;font-size:0.85rem">' +
      '<input type="checkbox" id="sa-vsk-clean" checked> Rimuovi i codici colore Nadeo ($) dai nickname</label>' +
      '<p style="margin:0.5rem 0 0;font-size:0.78rem;color:#64748b">Ogni file crea una regata nella serie corrente. I file già importati vengono saltati.</p>' +
      '<div id="sa-vsk-log" style="margin-top:0.5rem;font-size:0.82rem;line-height:1.5;color:#cbd5e1"></div>';
    var anchor = document.getElementById("sa-classifica-preview");
    if (anchor && anchor.parentNode === panel) panel.insertBefore(box, anchor);
    else panel.insertBefore(box, panel.firstChild);
  }

  function wireVskImport() {
    ensureVskImport();
    var drop = document.getElementById("sa-vsk-drop");
    var input = document.getElementById("sa-vsk-files");
    if (!drop || !input || drop._saWired) return;
    drop._saWired = true;
    drop.onclick = function () {
      input.click();
    };
    drop.ondragover = function (e) {
      e.preventDefault();
      drop.style.borderColor = "#7dd3fc";
    };
    drop.ondragleave = function () {
      drop.style.borderColor = "rgba(125,211,252,0.35)";
    };
    drop.ondrop = function (e) {
      e.preventDefault();
      drop.style.borderColor = "rgba(125,211,252,0.35)";
      importVskFiles(e.dataTransfer.files);
    };
    input.onchange = function () {
      importVskFiles(input.files);
      input.value = "";
    };
  }

  /* ---------- Nuova regata ---------- */
  async function saveNuovaRegata(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var serieId = document.getElementById("sa-regate-panel").dataset.serieId;
    if (!serieId) return alert("Apri prima una serie");

    var titolo = document.getElementById("sa-new-reg-titolo").value.trim();
    if (!titolo) return alert("Titolo regata obbligatorio");

    var ordine =
      parseInt(document.getElementById("sa-new-reg-ordine").value, 10) || 0;
    var dataVal = document.getElementById("sa-new-reg-data").value;

    try {
      var ins = await CVI.supabase.from("serie_aperte_regate").insert({
        serie_id: serieId,
        titolo: titolo,
        data_regata: dataVal ? new Date(dataVal).toISOString() : null,
        ordine: ordine
      });
      if (ins.error) throw ins.error;
      document.getElementById("sa-new-reg-titolo").value = "";
      document.getElementById("sa-new-reg-data").value = "";
      document.getElementById("sa-new-reg-ordine").value = "";
      loadRegateOfSerie(serieId);
    } catch (err) {
      alert(err.message || err);
    }
  }

  /* ---------- CSV ---------- */
  function downloadRegataCSV(reg, rows) {
    var lines = ["Stato;Posizione;Nickname;Team;Note"];
    (rows || []).forEach(function (r) {
      lines.push(
        [
          r.stato || "FIN",
          r.posizione != null ? r.posizione : "",
          '"' + String(r.nickname || "").replace(/"/g, '""') + '"',
          '"' + String(r.team || "").replace(/"/g, '""') + '"',
          '"' + String(r.note || "").replace(/"/g, '""') + '"'
        ].join(";")
      );
    });
    var safe = String(reg.titolo || "regata")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 40);
    var blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;"
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "risultati-" + safe + ".csv";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  function parseCSVText(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    var firstLine = text.split(/\r?\n/)[0] || "";
    var sep =
      firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";
    var rows = [],
      row = [],
      cur = "",
      inQ = false,
      i = 0;
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i += 2;
            continue;
          }
          inQ = false;
          i++;
          continue;
        }
        cur += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (c === sep) {
        row.push(cur);
        cur = "";
        i++;
        continue;
      }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        cur = "";
        rows.push(row);
        row = [];
        i++;
        continue;
      }
      cur += c;
      i++;
    }
    row.push(cur);
    rows.push(row);
    return rows.filter(function (r) {
      return r.some(function (x) {
        return String(x).trim() !== "";
      });
    });
  }

  function importRisultatiCsv(text) {
    var L = lib();
    if (L && L.looksLikeVskCsv(text)) {
      var vsk = L.parseVskCsv(text);
      if (!vsk.length) {
        alert("Log VSK non riconosciuto.");
        return 0;
      }
      var bodyV = document.getElementById("sa-ris-body");
      if (bodyV) bodyV.innerHTML = "";
      vsk.forEach(function (p) {
        addRisRow(p.stato, p.posizione, p.nickname, "", "", p.tempo_ms || "");
      });
      return vsk.length;
    }
    var rows = parseCSVText(text);
    if (!rows.length) {
      alert("CSV vuoto o non leggibile.");
      return 0;
    }
    var idx = { stato: 0, pos: 1, nick: 2, team: 3, note: 4 };
    var start = 0;
    var h = rows[0].map(function (x) {
      return String(x).trim().toLowerCase();
    });
    var hasHeader =
      h.some(function (x) {
        return /stato|status|posiz|^pos\b|nick|skipper/.test(x);
      });
    if (hasHeader) {
      start = 1;
      var find = function (re, def) {
        for (var k = 0; k < h.length; k++) if (re.test(h[k])) return k;
        return def;
      };
      idx.stato = find(/stato|status/, 0);
      idx.pos = find(/posiz|^pos\b|pos\.|rank|^#$/, 1);
      idx.nick = find(/nick|skipper|nome/, 2);
      idx.team = find(/team|squadra/, 3);
      idx.note = find(/note|nota|comment/, 4);
    }

    var parsed = [];
    for (var i = start; i < rows.length; i++) {
      var r = rows[i];
      var nick = String(r[idx.nick] == null ? "" : r[idx.nick]).trim();
      if (!nick) continue;
      var statoRaw = String(r[idx.stato] == null ? "FIN" : r[idx.stato])
        .trim()
        .toUpperCase();
      if (!["FIN", "DNF", "DNS", "DSQ", "RET"].includes(statoRaw))
        statoRaw = "FIN";
      var pos = parseInt(
        String(r[idx.pos] == null ? "" : r[idx.pos]).replace(/[^0-9]/g, ""),
        10
      );
      parsed.push({
        stato: statoRaw,
        pos: isNaN(pos) ? null : pos,
        nick: nick,
        team: String(r[idx.team] == null ? "" : r[idx.team]).trim(),
        note: String(r[idx.note] == null ? "" : r[idx.note]).trim()
      });
    }
    if (!parsed.length) {
      alert(
        "Nessuno skipper trovato. Formato atteso: Stato;Posizione;Nickname;Team;Note"
      );
      return 0;
    }

    var body = document.getElementById("sa-ris-body");
    if (body) body.innerHTML = "";
    parsed.forEach(function (p) {
      addRisRow(p.stato, p.pos, p.nick, p.team, p.note);
    });
    return parsed.length;
  }

  function downloadCsvTemplate() {
    var lines = [
      "Stato;Posizione;Nickname;Team;Note",
      "FIN;1;Skipper Uno;Team A;",
      "FIN;2;Skipper Due;Team B;",
      "DNF;;Skipper Tre;;",
      "DNS;;Skipper Quattro;;",
      "DSQ;;Skipper Cinque;;"
    ];
    var blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;"
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modello-risultati-serie.csv";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  /* ---------- Wire ---------- */
  function wire() {
    ensureExtraOpts();
    wireVskImport();
    var tab = document.querySelector('.admin-tab[data-tab="serie-aperte"]');
    if (tab && !tab._saWired) {
      tab._saWired = true;
      tab.onclick = function () {
        document.querySelectorAll(".admin-tab").forEach(function (t) {
          t.classList.remove("active");
        });
        document.querySelectorAll(".admin-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        tab.classList.add("active");
        var panel = document.getElementById("panel-serie-aperte");
        if (panel) panel.classList.add("active");
        ensureExtraOpts();
        wireVskImport();
        loadSerieAperteAdmin();
      };
    }

    // anche se si apre il vecchio tab eventi-aperti, non interferiamo
    var form = document.getElementById("sa-form");
    if (form && !form._saWired) {
      form._saWired = true;
      form.onsubmit = saveSerie;
    }
    var cancel = document.getElementById("sa-cancel");
    if (cancel && !cancel._saWired) {
      cancel._saWired = true;
      cancel.onclick = resetSerieForm;
    }

    var newRegForm = document.getElementById("sa-new-reg-form");
    if (newRegForm && !newRegForm._saWired) {
      newRegForm._saWired = true;
      newRegForm.onsubmit = saveNuovaRegata;
    }

    var closeRegate = document.getElementById("sa-close-regate");
    if (closeRegate && !closeRegate._saWired) {
      closeRegate._saWired = true;
      closeRegate.onclick = function () {
        document.getElementById("sa-regate-panel").style.display = "none";
      };
    }

    var addRow = document.getElementById("sa-add-ris-row");
    if (addRow && !addRow._saWired) {
      addRow._saWired = true;
      addRow.onclick = function () {
        addRisRow("FIN", "", "", "", "");
      };
    }

    var saveRis = document.getElementById("sa-save-ris");
    if (saveRis && !saveRis._saWired) {
      saveRis._saWired = true;
      saveRis.onclick = saveRisultati;
    }

    var closeRis = document.getElementById("sa-close-ris");
    if (closeRis && !closeRis._saWired) {
      closeRis._saWired = true;
      closeRis.onclick = function () {
        document.getElementById("sa-ris-modal").style.display = "none";
      };
    }

    // CSV import nel modal risultati
    var impBtn = document.getElementById("sa-import-csv");
    var csvFile = document.getElementById("sa-csv-file");
    if (impBtn && !impBtn._saWired) {
      impBtn._saWired = true;
      impBtn.onclick = function () {
        if (csvFile) csvFile.click();
      };
    }
    if (csvFile && !csvFile._saWired) {
      csvFile._saWired = true;
      csvFile.onchange = function () {
        var f = this.files && this.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var n = importRisultatiCsv(reader.result);
          var hint = document.getElementById("sa-csv-hint");
          if (n && hint) {
            hint.textContent =
              "Importati " + n + " skipper da «" + f.name + "». Controlla e salva.";
            hint.style.color = "#34d399";
          }
          csvFile.value = "";
        };
        reader.readAsText(f, "UTF-8");
      };
    }
    var tplBtn = document.getElementById("sa-csv-template");
    if (tplBtn && !tplBtn._saWired) {
      tplBtn._saWired = true;
      tplBtn.onclick = downloadCsvTemplate;
    }

    var textBtn = document.getElementById("sa-import-csv-text");
    var textTa = document.getElementById("sa-csv-text");
    if (textBtn && !textBtn._saWired) {
      textBtn._saWired = true;
      textBtn.onclick = function () {
        var val = textTa ? textTa.value : "";
        if (!val.trim()) {
          alert("Incolla prima il testo CSV.");
          return;
        }
        var n = importRisultatiCsv(val);
        var hint = document.getElementById("sa-csv-hint");
        if (n && hint) {
          hint.textContent =
            "Importati " + n + " skipper dal testo. Controlla e salva.";
          hint.style.color = "#34d399";
        }
      };
    }
  }

  window.loadSerieAperteAdmin = loadSerieAperteAdmin;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(wire, 600);
    });
  } else {
    setTimeout(wire, 600);
  }
})();
