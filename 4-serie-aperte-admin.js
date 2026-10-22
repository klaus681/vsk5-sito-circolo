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

  /* ---------- Calcolo punti Low Point ---------- */
  function calcPuntiRegata(rows) {
    // rows: [{stato, posizione, nickname, ...}]
    var starters = rows.filter(function (r) {
      return r.stato !== "DNS";
    }).length;
    var penalty = Math.max(starters, 1) + 1;

    return rows.map(function (r) {
      var punti;
      if (r.stato === "FIN" && r.posizione != null && r.posizione >= 1) {
        punti = r.posizione;
      } else {
        punti = penalty;
      }
      return {
        nickname: r.nickname,
        team: r.team || null,
        stato: r.stato,
        posizione: r.posizione,
        punti: punti,
        note: r.note || null
      };
    });
  }

  function calcClassificaSerie(regateWithResults, scarti) {
    // regateWithResults: [{id, titolo, ordine, results: [{nickname, punti, stato, ...}]}]
    var byNick = {};
    var regateCount = regateWithResults.length;

    regateWithResults.forEach(function (reg) {
      (reg.results || []).forEach(function (r) {
        var k = String(r.nickname).trim().toLowerCase();
        if (!byNick[k]) {
          byNick[k] = {
            nickname: r.nickname,
            team: r.team || null,
            punti: [],
            totali: 0,
            netti: 0,
            gare: 0
          };
        }
        if (r.team && !byNick[k].team) byNick[k].team = r.team;
        byNick[k].punti.push({
          regata_id: reg.id,
          punti: r.punti,
          stato: r.stato,
          posizione: r.posizione
        });
        byNick[k].gare += 1;
      });
    });

    // Per chi non ha corso una regata: assegna penalty della regata (starters+1)
    // Per semplicità e professionalità: se non risulta in una regata = DNS di quella regata
    regateWithResults.forEach(function (reg) {
      var starters = (reg.results || []).filter(function (r) {
        return r.stato !== "DNS";
      }).length;
      var penalty = Math.max(starters, 1) + 1;
      var present = {};
      (reg.results || []).forEach(function (r) {
        present[String(r.nickname).trim().toLowerCase()] = true;
      });
      Object.keys(byNick).forEach(function (k) {
        if (!present[k]) {
          byNick[k].punti.push({
            regata_id: reg.id,
            punti: penalty,
            stato: "DNS",
            posizione: null
          });
        }
      });
    });

    var list = Object.keys(byNick).map(function (k) {
      var s = byNick[k];
      var pts = s.punti.map(function (p) {
        return p.punti;
      });
      pts.sort(function (a, b) {
        return b - a;
      }); // peggiori prima
      var discard = Math.min(scarti || 0, pts.length);
      var netti = pts.slice(discard).reduce(function (a, b) {
        return a + b;
      }, 0);
      var totali = pts.reduce(function (a, b) {
        return a + b;
      }, 0);
      return {
        nickname: s.nickname,
        team: s.team,
        totali: totali,
        netti: netti,
        scarti_usati: discard,
        gare: s.gare,
        dettaglio: s.punti
      };
    });

    list.sort(function (a, b) {
      if (a.netti !== b.netti) return a.netti - b.netti;
      if (a.totali !== b.totali) return a.totali - b.totali;
      return a.nickname.localeCompare(b.nickname, "it");
    });

    return list;
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
            (s.scarti || 0) +
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
    document.getElementById("sa-id").value = s.id || "";
    document.getElementById("sa-titolo").value = s.titolo || "";
    document.getElementById("sa-desc").value = s.descrizione || "";
    document.getElementById("sa-inizio").value = toDateInput(s.data_inizio);
    document.getElementById("sa-fine").value = toDateInput(s.data_fine);
    document.getElementById("sa-scarti").value = s.scarti != null ? s.scarti : 0;
    document.getElementById("sa-pub").checked = !!s.pubblicato;
    document.getElementById("sa-home").checked = !!s.mostra_home;
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
        if (u.error) throw u.error;
      } else {
        var ins = await CVI.supabase.from("serie_aperte").insert(payload);
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
    document.getElementById("sa-regate-title").textContent =
      "Regate & Risultati – " + (s.titolo || "");

    await loadRegateOfSerie(serieId, s.scarti || 0);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadRegateOfSerie(serieId, scarti) {
    var box = document.getElementById("sa-regate-list");
    if (!box) return;
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

      if (!regate.length) {
        box.innerHTML =
          '<p class="empty-text">Nessuna regata in questa serie. Aggiungine una sotto.</p>';
        renderClassificaPreview([], scarti);
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
        var scored = calcPuntiRegata(raw);
        return {
          id: reg.id,
          titolo: reg.titolo,
          ordine: reg.ordine,
          results: scored
        };
      });

      var classifica = calcClassificaSerie(forClassifica, scarti);
      renderClassificaPreview(classifica, scarti);

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

          var scored = calcPuntiRegata(rows);
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
          loadRegateOfSerie(serieId, scarti);
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  }

  function renderClassificaPreview(classifica, scarti) {
    var el = document.getElementById("sa-classifica-preview");
    if (!el) return;
    if (!classifica || !classifica.length) {
      el.innerHTML =
        '<p style="color:#64748b;margin:0">Classifica generale: nessuna regata con risultati.</p>';
      return;
    }
    var html =
      '<div style="margin-bottom:0.5rem;font-weight:700;color:#7dd3fc">Classifica generale' +
      (scarti > 0 ? " (scarti: " + scarti + ")" : "") +
      "</div>" +
      '<table class="admin-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Netti</th><th>Totali</th><th>Gare</th></tr></thead><tbody>';
    classifica.slice(0, 20).forEach(function (r, i) {
      html +=
        "<tr><td><strong>" +
        (i + 1) +
        "</strong></td><td>" +
        esc(r.nickname) +
        "</td><td>" +
        esc(r.team || "—") +
        "</td><td><strong>" +
        r.netti +
        "</strong></td><td>" +
        r.totali +
        "</td><td>" +
        r.gare +
        "</td></tr>";
    });
    html += "</tbody></table>";
    if (classifica.length > 20)
      html +=
        '<p style="color:#94a3b8;font-size:0.82rem;margin:0.4rem 0 0">… e altri ' +
        (classifica.length - 20) +
        " skipper</p>";
    el.innerHTML = html;
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
        addRisRow(r.stato || "FIN", r.posizione, r.nickname, r.team, r.note);
      });
    } else {
      for (var i = 0; i < 5; i++) addRisRow("FIN", i + 1, "", "", "");
    }
  }

  function addRisRow(stato, pos, nick, team, note) {
    var body = document.getElementById("sa-ris-body");
    if (!body) return;
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
      if (stato === "FIN" && (!pos || pos < 1)) {
        // se manca posizione ma è FIN, mettiamo comunque e avvisiamo dopo
      }
      rows.push({
        regata_id: regId,
        nickname: nick,
        team: ((tr.querySelector(".sa-team") || {}).value || "").trim() || null,
        stato: stato,
        posizione: stato === "FIN" ? pos : null,
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
        if (ir.error) throw ir.error;
      }
      document.getElementById("sa-ris-modal").style.display = "none";
      var serieId = document.getElementById("sa-regate-panel").dataset.serieId;
      var scarti =
        parseInt(
          (document.getElementById("sa-scarti") || {}).value || "0",
          10
        ) || 0;
      // ricarica scarti dalla serie se possibile
      loadRegateOfSerie(serieId, scarti);
      var st = document.getElementById("admin-status");
      if (st) {
        st.textContent = "Risultati salvati (" + rows.length + " skipper)";
        st.className = "admin-status ok";
      }
    } catch (err) {
      alert(err.message || err);
    }
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
      loadRegateOfSerie(serieId, 0);
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
