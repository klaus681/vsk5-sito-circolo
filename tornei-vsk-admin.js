/* CVI Admin – Tornei: regate VSK e classifica (Low/High Point, scarti)
   Pannello autonomo dentro la tab "Tornei". Usa 2-serie-aperte-lib.js */
(function () {
  "use strict";

  var tornei = [];
  var regate = [];
  var byReg = {};
  var currentId = "";
  var cfg = { sistema: "low_point", scarti: 0, scartiAuto: false, mostraHome: false };

  function lib() {
    return window.CVISerieAperte || null;
  }

  /* Buffer(file) -> testo (UTF-8 con fallback ISO-8859-1), come gli altri import. */
  function decodeFileBuffer(buf) {
    var L = lib();
    if (L && typeof L.decodeBuffer === "function") return L.decodeBuffer(buf);
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));
    } catch (e) {
      return "";
    }
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function notify(msg, ok) {
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (ok ? " ok" : "");
    clearTimeout(notify._t);
    if (msg)
      notify._t = setTimeout(function () {
        el.textContent = "";
        el.className = "admin-status";
      }, 5000);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso);
    }
  }

  function fmtTempo(ms) {
    var L = lib();
    return L && ms ? L.formatMs(ms) : "—";
  }

  function colonnaMancante(err) {
    return /column|schema cache|relation|does not exist|42P01|vsk_/i.test(
      String((err && err.message) || err || "")
    );
  }

  /* ---------- UI ---------- */

  function ensureUI() {
    var panel = document.getElementById("panel-tornei");
    if (!panel) return false;
    if (document.getElementById("tnvsk-card")) return true;

    var card = document.createElement("div");
    card.className = "admin-card";
    card.id = "tnvsk-card";
    card.style.marginTop = "1.25rem";
    card.innerHTML =
      '<h3 style="margin:0 0 .4rem;color:#7dd3fc">⚡ Regate VSK &amp; classifica torneo</h3>' +
      '<p style="color:#94a3b8;font-size:.88rem;margin:0 0 .9rem">Importa i log <strong>Result_*.csv</strong> di Virtual Skipper come regate del torneo. Classifica separata da quella delle gare ufficiali (Low/High Point, scarti, tempi).</p>' +
      '<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:end">' +
      '<div style="flex:1;min-width:240px"><label class="adm-label" for="tnvsk-torneo">Torneo</label>' +
      '<select class="adm-input" id="tnvsk-torneo" style="width:100%"><option value="">— seleziona —</option></select></div>' +
      '<button type="button" class="btn-ghost" id="tnvsk-refresh">Aggiorna</button>' +
      "</div>" +
      '<div id="tnvsk-settings" style="display:none;margin-top:.9rem;padding:.8rem .9rem;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(15,23,42,.35)">' +
      '<div style="display:flex;gap:.9rem;flex-wrap:wrap;align-items:end">' +
      '<div><label class="adm-label" for="tnvsk-sistema">Sistema punteggio</label>' +
      '<select id="tnvsk-sistema" class="adm-input">' +
      '<option value="low_point">Low Point (1° = 1 pt · DNF = N+1)</option>' +
      '<option value="high_point">High Point (1° = N pt · DNF = 0)</option>' +
      "</select></div>" +
      '<div><label class="adm-label" for="tnvsk-scarti">Scarti</label>' +
      '<input type="number" min="0" max="20" id="tnvsk-scarti" class="adm-input" style="width:5rem" value="0"></div>' +
      '<label style="color:#e2e8f0;font-size:.86rem;padding-bottom:.45rem"><input type="checkbox" id="tnvsk-scarti-auto"> Scarti automatici (1 ogni 4)</label>' +
      '<label style="color:#e2e8f0;font-size:.86rem;padding-bottom:.45rem"><input type="checkbox" id="tnvsk-mostra-home"> Podio in Home</label>' +
      '<button type="button" class="btn-primary" id="tnvsk-save-cfg">Salva impostazioni</button>' +
      '<span id="tnvsk-cfg-status" style="font-size:.8rem;color:#94a3b8"></span>' +
      "</div></div>" +
      '<details id="tnvsk-import" style="margin-top:.9rem;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.25);border-radius:12px;padding:.8rem .95rem">' +
      '<summary style="cursor:pointer;color:#7dd3fc;font-weight:700;font-size:.92rem">⬆ Importa log VSK (.csv multipli)</summary>' +
      '<div id="tnvsk-drop" style="margin-top:.7rem;border:2px dashed rgba(125,211,252,.35);border-radius:12px;padding:1.1rem;text-align:center;cursor:pointer;color:#94a3b8;font-size:.88rem">' +
      "Trascina qui i file <strong>Result_YYYY_MM_DD_HH_MM_SS.csv</strong> oppure " +
      '<span style="color:#7dd3fc;text-decoration:underline">sfoglia dal computer</span></div>' +
      '<input type="file" id="tnvsk-files" multiple accept=".csv,.txt,text/csv" style="display:none">' +
      '<label style="display:block;margin-top:.55rem;color:#e2e8f0;font-size:.85rem"><input type="checkbox" id="tnvsk-clean" checked> Rimuovi i codici colore ($) dai nickname</label>' +
      '<p style="margin:.45rem 0 0;font-size:.78rem;color:#64748b">Ogni file = una regata del torneo. I file già importati vengono saltati.</p>' +
      '<div id="tnvsk-log" style="margin-top:.45rem;font-size:.82rem;line-height:1.5"></div>' +
      "</details>" +
      '<div id="tnvsk-preview" style="margin-top:1rem"></div>' +
      '<div id="tnvsk-list" style="margin-top:1rem"></div>' +
      '<div id="tnvsk-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;overflow:auto;padding:1.25rem">' +
      '<div class="admin-card" style="max-width:960px;margin:1rem auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:.8rem">' +
      '<h3 id="tnvsk-modal-title" style="margin:0;color:#7dd3fc">Risultati</h3>' +
      '<button type="button" class="btn-ghost" id="tnvsk-modal-close">Chiudi</button></div>' +
      '<input type="hidden" id="tnvsk-reg-id">' +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem;align-items:center">' +
      '<input type="file" id="tnvsk-reg-file" accept=".csv,text/csv,text/plain" style="display:none">' +
      '<button type="button" class="btn-sm" id="tnvsk-reg-import">⬆ Importa CSV</button>' +
      '<button type="button" class="btn-sm" id="tnvsk-reg-add">+ Riga</button>' +
      "</div>" +
      '<p id="tnvsk-reg-hint" style="margin:0 0 .5rem;font-size:.78rem;color:#94a3b8">CSV manuale: <strong>Stato;Posizione;Nickname;Team;Note;Tempo</strong> — oppure un log VSK</p>' +
      '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Stato</th><th>Pos</th><th>Nickname</th><th>Team</th><th>Tempo</th><th>Note</th><th></th></tr></thead>' +
      '<tbody id="tnvsk-reg-body"></tbody></table></div>' +
      '<div class="form-actions" style="margin-top:.8rem">' +
      '<button type="button" class="btn-primary" id="tnvsk-reg-save">Salva risultati</button>' +
      '<button type="button" class="btn-ghost" id="tnvsk-reg-cancel">Annulla</button></div>' +
      "</div></div>";

    panel.appendChild(card);
    return true;
  }

  /* ---------- Tornei ---------- */

  function avvisoMigrazione() {
    var el = document.getElementById("tnvsk-list");
    if (el)
      el.innerHTML =
        '<p style="color:#fbbf24;margin:0">Esegui <strong>tornei-vsk-sql.sql</strong> su Supabase per attivare import e classifica VSK.</p>';
  }

  function fillSelect() {
    var sel = document.getElementById("tnvsk-torneo");
    if (!sel) return;
    var cur = currentId || sel.value;
    sel.innerHTML =
      '<option value="">— seleziona —</option>' +
      tornei
        .map(function (t) {
          return (
            '<option value="' +
            esc(t.id) +
            '">' +
            esc(t.titolo || "Torneo") +
            (t.pubblicato ? "" : " (bozza)") +
            "</option>"
          );
        })
        .join("");
    if (cur) {
      var found = tornei.some(function (t) {
        return String(t.id) === String(cur);
      });
      if (found) sel.value = cur;
    }
  }

  async function loadTornei() {
    try {
      var r = await CVI.supabase
        .from("tornei")
        .select(
          "id,titolo,pubblicato,stato,vsk_sistema_punteggio,vsk_scarti,vsk_scarti_auto,vsk_mostra_home"
        )
        .order("created_at", { ascending: false });
      if (r.error) {
        if (!colonnaMancante(r.error)) throw r.error;
        var r2 = await CVI.supabase
          .from("tornei")
          .select("id,titolo,pubblicato,stato")
          .order("created_at", { ascending: false });
        if (r2.error) throw r2.error;
        tornei = r2.data || [];
        avvisoMigrazione();
      } else {
        tornei = r.data || [];
      }
      fillSelect();
      if (currentId) openTorneo(currentId);
    } catch (e) {
      var box = document.getElementById("tnvsk-list");
      if (box)
        box.innerHTML = '<p style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  }

  function openTorneo(id) {
    currentId = id || "";
    var settings = document.getElementById("tnvsk-settings");
    if (!currentId) {
      if (settings) settings.style.display = "none";
      var prev = document.getElementById("tnvsk-preview");
      if (prev) prev.innerHTML = "";
      var list = document.getElementById("tnvsk-list");
      if (list) list.innerHTML = "";
      return;
    }
    var t = null;
    tornei.forEach(function (x) {
      if (String(x.id) === String(currentId)) t = x;
    });
    cfg = {
      sistema: (t && t.vsk_sistema_punteggio) || "low_point",
      scarti: t && t.vsk_scarti != null ? Number(t.vsk_scarti) : 0,
      scartiAuto: !!(t && t.vsk_scarti_auto),
      mostraHome: !!(t && t.vsk_mostra_home)
    };
    var sis = document.getElementById("tnvsk-sistema");
    if (sis) sis.value = cfg.sistema;
    var sc = document.getElementById("tnvsk-scarti");
    if (sc) sc.value = cfg.scarti;
    var sa = document.getElementById("tnvsk-scarti-auto");
    if (sa) sa.checked = cfg.scartiAuto;
    var mh = document.getElementById("tnvsk-mostra-home");
    if (mh) mh.checked = cfg.mostraHome;
    if (settings) settings.style.display = "block";
    loadRegate();
  }

  async function saveConfig() {
    if (!currentId) return;
    var sis = document.getElementById("tnvsk-sistema");
    var sc = document.getElementById("tnvsk-scarti");
    var sa = document.getElementById("tnvsk-scarti-auto");
    var mh = document.getElementById("tnvsk-mostra-home");
    var payload = {
      vsk_sistema_punteggio: (sis && sis.value) || "low_point",
      vsk_scarti: sc ? parseInt(sc.value, 10) || 0 : 0,
      vsk_scarti_auto: !!(sa && sa.checked),
      vsk_mostra_home: !!(mh && mh.checked)
    };
    var st = document.getElementById("tnvsk-cfg-status");
    try {
      if (payload.vsk_mostra_home) {
        await CVI.supabase
          .from("tornei")
          .update({ vsk_mostra_home: false })
          .eq("vsk_mostra_home", true)
          .neq("id", currentId);
      }
      var r = await CVI.supabase
        .from("tornei")
        .update(payload)
        .eq("id", currentId);
      if (r.error) throw r.error;
      if (st) {
        st.style.color = "#34d399";
        st.textContent = "Salvato";
      }
      notify("Impostazioni classifica VSK salvate", true);
      tornei.forEach(function (t) {
        if (String(t.id) === String(currentId)) {
          t.vsk_sistema_punteggio = payload.vsk_sistema_punteggio;
          t.vsk_scarti = payload.vsk_scarti;
          t.vsk_scarti_auto = payload.vsk_scarti_auto;
          t.vsk_mostra_home = payload.vsk_mostra_home;
        } else if (payload.vsk_mostra_home) {
          t.vsk_mostra_home = false;
        }
      });
      openTorneo(currentId);
    } catch (e) {
      if (st) {
        st.style.color = "#f87171";
        st.textContent = colonnaMancante(e)
          ? "Esegui tornei-vsk-sql.sql"
          : e.message || e;
      } else {
        notify(e.message || e);
      }
    }
  }

  /* ---------- Regate + classifica ---------- */

  async function loadRegate() {
    var list = document.getElementById("tnvsk-list");
    var prev = document.getElementById("tnvsk-preview");
    if (!list || !currentId) return;
    var L = lib();
    if (!L) {
      list.innerHTML =
        '<p style="color:#f87171">Libreria di calcolo non caricata (2-serie-aperte-lib.js).</p>';
      return;
    }
    list.innerHTML = '<p class="loading-text">Caricamento regate VSK…</p>';
    if (prev) prev.innerHTML = "";
    try {
      var rr = await CVI.supabase
        .from("torneo_regate")
        .select("*")
        .eq("torneo_id", currentId)
        .order("ordine")
        .order("data_regata", { ascending: true, nullsFirst: false });
      if (rr.error) throw rr.error;
      regate = rr.data || [];
      byReg = {};

      if (regate.length) {
        var ids = regate.map(function (r) {
          return r.id;
        });
        var rs = await CVI.supabase
          .from("torneo_risultati")
          .select("*")
          .in("regata_id", ids);
        if (rs.error) throw rs.error;
        (rs.data || []).forEach(function (r) {
          var k = String(r.regata_id);
          if (!byReg[k]) byReg[k] = [];
          byReg[k].push(r);
        });
      }

      var forCl = regate.map(function (reg) {
        return {
          id: reg.id,
          titolo: reg.titolo,
          results: L.calcPuntiRegata(byReg[String(reg.id)] || [], cfg.sistema)
        };
      });
      var classifica = L.calcClassificaSerie(forCl, cfg.scarti, {
        sistema: cfg.sistema,
        scartiAuto: cfg.scartiAuto
      });

      renderPreview(classifica);
      renderList();
    } catch (e) {
      if (colonnaMancante(e)) avvisoMigrazione();
      else list.innerHTML = '<p style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  }

  function renderPreview(classifica) {
    var el = document.getElementById("tnvsk-preview");
    if (!el) return;
    var numScarti =
      classifica && classifica.length ? classifica[0].scartiUsati || 0 : 0;
    var label =
      '<div style="margin-bottom:.5rem;font-weight:700;color:#7dd3fc">Classifica VSK' +
      '<span style="color:#94a3b8;font-weight:500;font-size:.82rem"> · ' +
      (cfg.sistema === "high_point" ? "High Point" : "Low Point") +
      " · scarti: " +
      numScarti +
      (cfg.scartiAuto ? " (auto)" : "") +
      "</span></div>";

    if (!regate.length) {
      el.innerHTML =
        label +
        '<p style="color:#64748b;margin:0">Nessuna regata VSK: importa uno o più log per generare la classifica.</p>';
      return;
    }
    if (!classifica.length) {
      el.innerHTML =
        label +
        '<p style="color:#64748b;margin:0">Regate presenti ma senza risultati.</p>';
      return;
    }

    var html = label + '<div style="overflow-x:auto">';
    html +=
      '<table class="admin-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th>';
    regate.forEach(function (_, i) {
      html += "<th>R" + (i + 1) + "</th>";
    });
    html += "<th>Totali</th><th>Netti</th><th>Gare</th></tr></thead><tbody>";
    classifica.slice(0, 30).forEach(function (r, i) {
      html +=
        "<tr><td><strong>" +
        (i + 1) +
        "</strong></td><td>" +
        esc(r.nickname) +
        "</td><td>" +
        esc(r.team || "—") +
        "</td>";
      (r.punti || []).forEach(function (p, idx) {
        var disc = (r.scartiIdx || []).indexOf(idx) !== -1;
        html += disc
          ? '<td style="color:#f87171;text-decoration:line-through">' + p + "</td>"
          : "<td>" + p + "</td>";
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
    if (classifica.length > 30)
      html +=
        '<p style="color:#94a3b8;font-size:.82rem;margin:.4rem 0 0">… e altri ' +
        (classifica.length - 30) +
        " skipper</p>";
    html +=
      '<div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap">' +
      '<button type="button" class="btn-sm" id="tnvsk-exp-csv">⬇ CSV</button>' +
      '<button type="button" class="btn-sm" id="tnvsk-exp-xlsx">⬇ Excel (.xlsx)</button>' +
      '<button type="button" class="btn-sm" id="tnvsk-exp-html">📋 Copia HTML</button>' +
      "</div>";
    el.innerHTML = html;

    var b1 = document.getElementById("tnvsk-exp-csv");
    if (b1) b1.onclick = function () { exportCsv(classifica); };
    var b2 = document.getElementById("tnvsk-exp-xlsx");
    if (b2) b2.onclick = function () { exportXlsx(classifica, b2); };
    var b3 = document.getElementById("tnvsk-exp-html");
    if (b3) b3.onclick = function () { copiaTesto(buildHtml(classifica)); };
  }

  function statusBadge(stato) {
    var colors = { FIN: "#34d399", DNF: "#fbbf24", DNS: "#94a3b8", DSQ: "#f87171", RET: "#fb923c" };
    var c = colors[stato] || "#94a3b8";
    return (
      '<span style="display:inline-block;padding:.12rem .45rem;border-radius:6px;font-size:.72rem;font-weight:700;background:rgba(0,0,0,.25);color:' +
      c +
      ";border:1px solid " +
      c +
      '40">' +
      esc(stato) +
      "</span>"
    );
  }

  function renderList() {
    var el = document.getElementById("tnvsk-list");
    if (!el) return;
    if (!regate.length) {
      el.innerHTML =
        '<p class="empty-text">Nessuna regata VSK in questo torneo. Usa “Importa log VSK” qui sopra.</p>';
      return;
    }
    var L = lib();
    el.innerHTML = regate
      .map(function (reg, idx) {
        var rows = (byReg[String(reg.id)] || []).slice();
        rows.sort(function (a, b) {
          if (a.stato === "FIN" && b.stato === "FIN")
            return (a.posizione || 99) - (b.posizione || 99);
          if (a.stato === "FIN") return -1;
          if (b.stato === "FIN") return 1;
          return String(a.nickname).localeCompare(String(b.nickname), "it");
        });
        var scored = L.calcPuntiRegata(rows, cfg.sistema);
        var listHtml =
          rows.length === 0
            ? '<span style="color:#64748b">Nessun risultato</span>'
            : scored
                .map(function (r) {
                  return (
                    statusBadge(r.stato) +
                    " " +
                    (r.stato === "FIN" && r.posizione
                      ? "<strong>" + esc(r.posizione) + "°</strong> "
                      : "") +
                    "<strong>" +
                    esc(r.nickname) +
                    "</strong>" +
                    (r.team ? " (" + esc(r.team) + ")" : "") +
                    (r.tempo_ms
                      ? ' <span style="color:#64748b">' + esc(fmtTempo(r.tempo_ms)) + "</span>"
                      : "") +
                    ' <span style="color:#94a3b8">→ ' +
                    r.punti +
                    " pt</span>"
                  );
                })
                .join("<br>");

        return (
          '<div class="admin-card" style="margin-bottom:.75rem">' +
          '<div class="admin-card-head"><div><strong style="color:#fff">R' +
          (idx + 1) +
          " · " +
          esc(reg.titolo) +
          '</strong><div class="meta">' +
          esc(fmtDate(reg.data_regata)) +
          " · " +
          rows.length +
          " skipper" +
          (reg.sorgente_file ? " · " + esc(reg.sorgente_file) : "") +
          '</div></div><div style="display:flex;gap:.35rem;flex-wrap:wrap">' +
          '<button type="button" class="btn-sm tnvsk-edit" data-id="' +
          esc(reg.id) +
          '">Modifica risultati</button> ' +
          '<button type="button" class="btn-danger-sm tnvsk-del" data-id="' +
          esc(reg.id) +
          '">Elimina</button></div></div>' +
          '<div style="margin-top:.55rem;font-size:.88rem;color:#cbd5e1;line-height:1.55">' +
          listHtml +
          "</div></div>"
        );
      })
      .join("");

    el.querySelectorAll(".tnvsk-edit").forEach(function (b) {
      b.onclick = function () {
        var reg = null;
        regate.forEach(function (x) {
          if (String(x.id) === String(b.getAttribute("data-id"))) reg = x;
        });
        if (reg) openEditor(reg);
      };
    });
    el.querySelectorAll(".tnvsk-del").forEach(function (b) {
      b.onclick = async function () {
        if (!confirm("Eliminare questa regata VSK e i suoi risultati?")) return;
        await CVI.supabase
          .from("torneo_regate")
          .delete()
          .eq("id", b.getAttribute("data-id"));
        loadRegate();
      };
    });
  }

  /* ---------- Import log VSK ---------- */

  function vskLog(msg, color) {
    var el = document.getElementById("tnvsk-log");
    if (!el) return;
    var p = document.createElement("div");
    p.style.color = color || "#cbd5e1";
    p.textContent = msg;
    el.appendChild(p);
  }

  function titoloDaFile(name) {
    var base = String(name || "").replace(/\.(csv|txt)$/i, "");
    var m = base.match(/(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})/);
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
      return { titolo: "Regata " + d2.toLocaleDateString("it-IT"), data: d2.toISOString() };
    }
    return { titolo: base || "Regata VSK", data: null };
  }

  function readFileText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(decodeFileBuffer(r.result));
      };
      r.onerror = function () {
        reject(r.error || new Error("lettura fallita"));
      };
      r.readAsArrayBuffer(file);
    });
  }

  async function importVskFiles(fileList) {
    if (!currentId) return alert("Seleziona prima un torneo.");
    var L = lib();
    if (!L) return alert("Libreria di calcolo non caricata.");
    var files = Array.prototype.slice
      .call(fileList || [])
      .filter(function (f) {
        return /\.(csv|txt)$/i.test(f.name);
      });
    if (!files.length) return alert("Seleziona uno o più file .csv di Virtual Skipper.");

    var logEl = document.getElementById("tnvsk-log");
    if (logEl) logEl.innerHTML = "";
    var cleanEl = document.getElementById("tnvsk-clean");
    var doClean = !cleanEl || cleanEl.checked;

    var prev = await CVI.supabase
      .from("torneo_regate")
      .select("ordine,sorgente_file")
      .eq("torneo_id", currentId);
    if (prev.error)
      prev = await CVI.supabase
        .from("torneo_regate")
        .select("ordine")
        .eq("torneo_id", currentId);

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
        var rows = L.parseVskCsv(text);
        if (!rows.length) {
          fail++;
          vskLog("⚠ " + file.name + ": nessuno skipper riconosciuto.", "#fbbf24");
          continue;
        }
        var meta = titoloDaFile(file.name);
        ordine += 1;
        var regPayload = {
          torneo_id: currentId,
          titolo: meta.titolo,
          data_regata: meta.data,
          ordine: ordine,
          sorgente_file: file.name
        };
        var ins = await CVI.supabase
          .from("torneo_regate")
          .insert(regPayload)
          .select("id")
          .single();
        if (ins.error) throw ins.error;
        var regId = ins.data && ins.data.id;

        var payload = rows.map(function (r) {
          return {
            regata_id: regId,
            nickname: doClean ? L.cleanNick(r.nickname_raw) || r.nickname : r.nickname_raw,
            nickname_raw: r.nickname_raw,
            account_vsk: r.account_vsk,
            stato: r.stato,
            posizione: r.posizione,
            tempo_ms: r.tempo_ms
          };
        });
        var ris = await CVI.supabase.from("torneo_risultati").insert(payload);
        if (ris.error) throw ris.error;

        ok++;
        vskLog(
          "✅ " + file.name + " → " + meta.titolo + " (" + rows.length + " skipper)",
          "#34d399"
        );
      } catch (e) {
        fail++;
        vskLog("❌ " + file.name + ": " + (e.message || e), "#f87171");
        if (colonnaMancante(e)) avvisoMigrazione();
      }
    }

    vskLog(
      "Import terminati: " + ok + " ok · " + skip + " saltati · " + fail + " errori.",
      fail ? "#fbbf24" : "#7dd3fc"
    );
    await loadRegate();
    if (ok) notify("Importate " + ok + " regate VSK nel torneo", true);
  }

  /* ---------- Editor risultati ---------- */

  var STATI = [
    { v: "FIN", label: "FIN – Arrivato" },
    { v: "DNF", label: "DNF – Non terminato" },
    { v: "DNS", label: "DNS – Non partito" },
    { v: "DSQ", label: "DSQ – Squalificato" },
    { v: "RET", label: "RET – Ritirato" }
  ];

  function openEditor(reg) {
    var modal = document.getElementById("tnvsk-modal");
    if (!modal) return;
    modal.style.display = "block";
    document.getElementById("tnvsk-reg-id").value = reg.id;
    document.getElementById("tnvsk-modal-title").textContent = "Risultati – " + (reg.titolo || "");
    var hint = document.getElementById("tnvsk-reg-hint");
    if (hint) hint.style.color = "#94a3b8";

    var body = document.getElementById("tnvsk-reg-body");
    body.innerHTML = "";
    var rows = byReg[String(reg.id)] || [];
    if (rows.length) {
      rows.forEach(function (r) {
        addRow(r.stato || "FIN", r.posizione, r.nickname, r.team, r.note, r.tempo_ms || "");
      });
    } else {
      for (var i = 0; i < 5; i++) addRow("FIN", i + 1, "", "", "", "");
    }
  }

  function addRow(stato, pos, nick, team, note, tempo) {
    var body = document.getElementById("tnvsk-reg-body");
    if (!body) return;
    var L = lib();
    var tempoFmt = "";
    if (tempo !== "" && tempo != null) {
      tempoFmt =
        L && isFinite(Number(tempo)) && Number(tempo) > 0
          ? L.formatMs(Number(tempo))
          : String(tempo);
    }
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><select class="adm-select tnvsk-stato" style="min-width:7.5rem">' +
      STATI.map(function (s) {
        return (
          '<option value="' + s.v + '"' + (s.v === (stato || "FIN") ? " selected" : "") + ">" + s.label + "</option>"
        );
      }).join("") +
      "</select></td>" +
      '<td><input type="number" min="1" class="adm-input tnvsk-pos" value="' +
      esc(pos || "") +
      '" style="width:4rem" placeholder="—"></td>' +
      '<td><input type="text" class="adm-input tnvsk-nick" value="' +
      esc(nick || "") +
      '" placeholder="Nickname" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input tnvsk-team" value="' +
      esc(team || "") +
      '" placeholder="Team" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input tnvsk-tempo" value="' +
      esc(tempoFmt) +
      '" placeholder="mm:ss.mmm" style="width:7.5rem"></td>' +
      '<td><input type="text" class="adm-input tnvsk-note" value="' +
      esc(note || "") +
      '" placeholder="Note" style="width:100%"></td>' +
      '<td><button type="button" class="btn-danger-sm tnvsk-rm">×</button></td>';
    body.appendChild(tr);
    tr.querySelector(".tnvsk-rm").onclick = function () {
      tr.remove();
    };
    var sel = tr.querySelector(".tnvsk-stato");
    var posInp = tr.querySelector(".tnvsk-pos");
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

  async function saveRows() {
    var regId = document.getElementById("tnvsk-reg-id").value;
    if (!regId) return;
    var L = lib();
    var rows = [];
    document.querySelectorAll("#tnvsk-reg-body tr").forEach(function (tr) {
      var nick = (tr.querySelector(".tnvsk-nick") || {}).value;
      nick = nick ? String(nick).trim() : "";
      if (!nick) return;
      var stato = (tr.querySelector(".tnvsk-stato") || {}).value || "FIN";
      var posRaw = (tr.querySelector(".tnvsk-pos") || {}).value;
      var pos = posRaw ? parseInt(posRaw, 10) : null;
      var tempoRaw = (tr.querySelector(".tnvsk-tempo") || {}).value || "";
      var tempoMs = L ? L.parseTimeToMs(tempoRaw) : 0;
      rows.push({
        regata_id: regId,
        nickname: nick,
        team: ((tr.querySelector(".tnvsk-team") || {}).value || "").trim() || null,
        stato: stato,
        posizione: stato === "FIN" ? pos : null,
        tempo_ms: tempoMs > 0 ? tempoMs : null,
        note: ((tr.querySelector(".tnvsk-note") || {}).value || "").trim() || null
      });
    });

    try {
      var del = await CVI.supabase.from("torneo_risultati").delete().eq("regata_id", regId);
      if (del.error) throw del.error;
      if (rows.length) {
        var ins = await CVI.supabase.from("torneo_risultati").insert(rows);
        if (ins.error) throw ins.error;
      }
      document.getElementById("tnvsk-modal").style.display = "none";
      notify("Risultati salvati (" + rows.length + " skipper)", true);
      loadRegate();
    } catch (e) {
      alert(e.message || e);
    }
  }

  /* ---------- CSV manuale / VSK nel modale ---------- */

  function importCsvToModal(text) {
    var L = lib();
    if (!L) return 0;
    var body = document.getElementById("tnvsk-reg-body");
    if (L.looksLikeVskCsv(text)) {
      var vsk = L.parseVskCsv(text);
      if (!vsk.length) return 0;
      if (body) body.innerHTML = "";
      vsk.forEach(function (p) {
        addRow(p.stato, p.posizione, p.nickname, "", "", p.tempo_ms || "");
      });
      return vsk.length;
    }

    var sep = L.detectSeparator(text);
    var rows = L.parseRows(text, sep);
    if (!rows.length) return 0;
    var h = rows[0].map(function (x) {
      return String(x).trim().toLowerCase();
    });
    var start = 0;
    var idx = { stato: 0, pos: 1, nick: 2, team: 3, note: 4, tempo: -1 };
    var hasHeader = h.some(function (x) {
      return /stato|status|posiz|^pos$|nick|skipper/.test(x);
    });
    if (hasHeader) {
      start = 1;
      var find = function (re, def) {
        for (var k = 0; k < h.length; k++) if (re.test(h[k])) return k;
        return def;
      };
      idx.stato = find(/stato|status/, 0);
      idx.pos = find(/posiz|^pos$|^pos\b|rank|^#$/, 1);
      idx.nick = find(/nick|skipper|nome/, 2);
      idx.team = find(/team|squadra/, 3);
      idx.tempo = find(/tempo|time|temps|ms/, -1);
      idx.note = find(/note|nota|comment/, 4);
    }
    var parsed = [];
    for (var i = start; i < rows.length; i++) {
      var r = rows[i];
      var nick = String(r[idx.nick] == null ? "" : r[idx.nick]).trim();
      if (!nick) continue;
      var stato = L.statoValido(r[idx.stato]);
      var pos = parseInt(String(r[idx.pos] == null ? "" : r[idx.pos]).replace(/[^0-9]/g, ""), 10);
      var tempoMs = idx.tempo >= 0 ? L.parseTimeToMs(r[idx.tempo]) : 0;
      parsed.push({
        stato: stato,
        pos: isNaN(pos) ? null : pos,
        nick: nick,
        team: String(r[idx.team] == null ? "" : r[idx.team]).trim(),
        note: String(r[idx.note] == null ? "" : r[idx.note]).trim(),
        tempo: tempoMs > 0 ? tempoMs : ""
      });
    }
    if (!parsed.length) return 0;
    if (body) body.innerHTML = "";
    parsed.forEach(function (p) {
      addRow(p.stato, p.pos, p.nick, p.team, p.note, p.tempo);
    });
    return parsed.length;
  }

  /* ---------- Export ---------- */

  function exportCsv(classifica) {
    var head = ["Pos", "Skipper", "Team"];
    regate.forEach(function (_, i) {
      head.push("R" + (i + 1));
    });
    head.push("Totali", "Netti", "Gare");
    var lines = [head.join(";")];
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
    lines.push("# (n) = scartato");
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;"
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "classifica-torneo-vsk.csv";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  function buildHtml(classifica) {
    var out =
      '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">\n' +
      '  <tr style="background-color:#1B365D;color:#ffffff"><th>Pos</th><th>Skipper</th><th>Team</th>';
    regate.forEach(function (_, i) {
      out += "<th>R" + (i + 1) + "</th>";
    });
    out += "<th>Totali</th><th>Netti</th></tr>\n";
    (classifica || []).forEach(function (r, i) {
      out += "  <tr><td align=\"center\"><b>" + (i + 1) + "</b></td><td>" + esc(r.nickname) + "</td><td>" + esc(r.team || "") + "</td>";
      (r.punti || []).forEach(function (p, idx) {
        var disc = (r.scartiIdx || []).indexOf(idx) !== -1;
        out += disc
          ? '<td align="center" style="color:#e53e3e;text-decoration:line-through">' + p + "</td>"
          : '<td align="center">' + p + "</td>";
      });
      out += '<td align="center">' + r.totali + "</td>";
      out += '<td align="center" style="font-weight:bold;color:#00A8CC">' + r.netti + "</td></tr>\n";
    });
    return out + "</table>";
  }

  function copiaTesto(text) {
    var done = function () {
      alert("HTML della classifica copiato negli appunti.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        copiaFallback(text, done);
      });
    } else {
      copiaFallback(text, done);
    }
  }

  function copiaFallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {
      alert("Impossibile copiare: " + (e.message || e));
    }
    document.body.removeChild(ta);
  }

  function loadXlsx(cb) {
    if (window.XLSX) return cb(null);
    var prev = document.getElementById("tnvsk-xlsx-lib");
    if (prev) {
      prev.addEventListener("load", function () {
        cb(window.XLSX ? null : new Error("modulo non disponibile"));
      });
      return;
    }
    var s = document.createElement("script");
    s.id = "tnvsk-xlsx-lib";
    s.async = true;
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = function () {
      cb(window.XLSX ? null : new Error("modulo non disponibile"));
    };
    s.onerror = function () {
      cb(new Error("CDN non raggiungibile"));
    };
    document.head.appendChild(s);
  }

  function exportXlsx(classifica, btn) {
    var label = "⬇ Excel (.xlsx)";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Preparo…";
    }
    loadXlsx(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
      if (err || !window.XLSX) {
        alert("Modulo Excel non disponibile (" + (err && err.message ? err.message : "errore") + "). Esporto il CSV.");
        exportCsv(classifica);
        return;
      }
      try {
        var X = window.XLSX;
        var wb = X.utils.book_new();
        var head = ["Pos", "Skipper", "Team"];
        regate.forEach(function (_, i) {
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
        var ws = X.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [{ wch: 5 }, { wch: 24 }, { wch: 16 }].concat(
          regate.map(function () { return { wch: 11 }; }),
          [{ wch: 9 }, { wch: 9 }, { wch: 7 }]
        );
        X.utils.book_append_sheet(wb, ws, "Classifica");

        regate.forEach(function (reg, rIdx) {
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
            rows.push([e.pos === 999 ? "" : e.pos, e.nick, e.stato, e.tempo, e.punti]);
          });
          var wsR = X.utils.aoa_to_sheet(rows);
          wsR["!cols"] = [{ wch: 5 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 7 }];
          var name = ("R" + (rIdx + 1) + " " + (reg.titolo || ""))
            .replace(/[\\\/\?\*\[\]:]/g, "")
            .slice(0, 31);
          X.utils.book_append_sheet(wb, wsR, name || "R" + (rIdx + 1));
        });
        X.writeFile(wb, "Classifica_Torneo_VSK_" + new Date().toISOString().slice(0, 10) + ".xlsx");
      } catch (e) {
        alert("Errore Excel: " + (e.message || e) + ". Esporto il CSV.");
        exportCsv(classifica);
      }
    });
  }

  /* ---------- Wire ---------- */

  function wire() {
    if (!ensureUI()) return false;

    var sel = document.getElementById("tnvsk-torneo");
    if (sel && !sel._tnvskWired) {
      sel._tnvskWired = true;
      sel.onchange = function () {
        openTorneo(sel.value);
      };
    }
    var rf = document.getElementById("tnvsk-refresh");
    if (rf && !rf._tnvskWired) {
      rf._tnvskWired = true;
      rf.onclick = function () {
        loadTornei();
      };
    }
    var saveCfg = document.getElementById("tnvsk-save-cfg");
    if (saveCfg && !saveCfg._tnvskWired) {
      saveCfg._tnvskWired = true;
      saveCfg.onclick = saveConfig;
    }

    var drop = document.getElementById("tnvsk-drop");
    var input = document.getElementById("tnvsk-files");
    if (drop && input && !drop._tnvskWired) {
      drop._tnvskWired = true;
      drop.onclick = function () {
        input.click();
      };
      drop.ondragover = function (e) {
        e.preventDefault();
        drop.style.borderColor = "#7dd3fc";
      };
      drop.ondragleave = function () {
        drop.style.borderColor = "rgba(125,211,252,.35)";
      };
      drop.ondrop = function (e) {
        e.preventDefault();
        drop.style.borderColor = "rgba(125,211,252,.35)";
        importVskFiles(e.dataTransfer.files);
      };
      input.onchange = function () {
        importVskFiles(input.files);
        input.value = "";
      };
    }

    var close = document.getElementById("tnvsk-modal-close");
    if (close && !close._tnvskWired) {
      close._tnvskWired = true;
      close.onclick = function () {
        document.getElementById("tnvsk-modal").style.display = "none";
      };
    }
    var cancel = document.getElementById("tnvsk-reg-cancel");
    if (cancel && !cancel._tnvskWired) {
      cancel._tnvskWired = true;
      cancel.onclick = function () {
        document.getElementById("tnvsk-modal").style.display = "none";
      };
    }
    var addB = document.getElementById("tnvsk-reg-add");
    if (addB && !addB._tnvskWired) {
      addB._tnvskWired = true;
      addB.onclick = function () {
        addRow("FIN", "", "", "", "", "");
      };
    }
    var saveB = document.getElementById("tnvsk-reg-save");
    if (saveB && !saveB._tnvskWired) {
      saveB._tnvskWired = true;
      saveB.onclick = saveRows;
    }
    var impBtn = document.getElementById("tnvsk-reg-import");
    var impFile = document.getElementById("tnvsk-reg-file");
    if (impBtn && impFile && !impBtn._tnvskWired) {
      impBtn._tnvskWired = true;
      impBtn.onclick = function () {
        impFile.click();
      };
      impFile.onchange = function () {
        var f = impFile.files && impFile.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var n = importCsvToModal(decodeFileBuffer(reader.result));
          var hint = document.getElementById("tnvsk-reg-hint");
          if (n && hint) {
            hint.style.color = "#34d399";
            hint.textContent = "Importati " + n + " skipper da «" + f.name + "». Controlla e salva.";
          } else if (!n && hint) {
            hint.style.color = "#f87171";
            hint.textContent = "Nessuno skipper riconosciuto in «" + f.name + "».";
          }
          impFile.value = "";
        };
        reader.readAsArrayBuffer(f);
      };
    }

    document.querySelectorAll('.admin-tab[data-tab="tornei"]').forEach(function (tab) {
      if (tab._tnvskTab) return;
      tab._tnvskTab = true;
      tab.addEventListener(
        "click",
        function () {
          setTimeout(loadTornei, 400);
        },
        true
      );
    });

    return true;
  }

  function boot() {
    var tries = 0;
    (function tick() {
      if (wire()) {
        loadTornei();
        return;
      }
      if (++tries < 40) setTimeout(tick, 400);
    })();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
