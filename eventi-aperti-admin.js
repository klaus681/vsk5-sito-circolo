/* CVI Admin – Eventi aperti (con auto-unica mostra_home + CSV) */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(iso) {
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

  function downloadEventoCSV(evento, rows) {
    var titolo = (evento && evento.titolo) || "evento";
    var lines = ["Posizione;Nickname;Team;Note"];
    (rows || []).forEach(function (r) {
      lines.push(
        [
          r.posizione != null ? r.posizione : "",
          '"' + String(r.nickname || "").replace(/"/g, '""') + '"',
          '"' + String(r.team || "").replace(/"/g, '""') + '"',
          '"' + String(r.note || "").replace(/"/g, '""') + '"'
        ].join(";")
      );
    });
    var safe = String(titolo).replace(/[^\w\-]+/g, "_").slice(0, 40);
    var blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;"
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "classifica-evento-" + safe + ".csv";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
    var st = document.getElementById("admin-status");
    if (st) {
      st.textContent = "CSV scaricato";
      st.className = "admin-status ok";
    }
  }

  async function loadEventiApertiAdmin() {
    var box = document.getElementById("eventi-aperti-list");
    if (!box || !window.CVI || !CVI.supabase) return;
    box.innerHTML = '<p class="loading-text">Caricamento…</p>';
    try {
      var res = await CVI.supabase
        .from("eventi_aperti")
        .select("*")
        .order("data_evento", { ascending: false, nullsFirst: false });
      if (res.error) throw res.error;
      var eventi = res.data || [];
      if (!eventi.length) {
        box.innerHTML = '<p class="empty-text">Nessun evento aperto.</p>';
        return;
      }
      var ids = eventi.map(function (e) {
        return e.id;
      });
      var ris = await CVI.supabase
        .from("eventi_aperti_risultati")
        .select("*")
        .in("evento_id", ids)
        .order("posizione");
      var byEv = {};
      (ris.data || []).forEach(function (r) {
        var k = String(r.evento_id);
        if (!byEv[k]) byEv[k] = [];
        byEv[k].push(r);
      });
      box.innerHTML = eventi
        .map(function (e) {
          var rows = byEv[String(e.id)] || [];
          var flags = [];
          if (e.pubblicato)
            flags.push(
              '<span style="color:#34d399;font-weight:700;font-size:.75rem">PUBBLICATO</span>'
            );
          else
            flags.push(
              '<span style="color:#fbbf24;font-weight:700;font-size:.75rem">BOZZA</span>'
            );
          if (e.mostra_home)
            flags.push(
              '<span style="color:#7dd3fc;font-size:.75rem;font-weight:700">★ HOME</span>'
            );
          var list = rows.length
            ? rows
                .map(function (r) {
                  return (
                    esc(r.posizione) +
                    ". <strong>" +
                    esc(r.nickname) +
                    "</strong>" +
                    (r.team ? " (" + esc(r.team) + ")" : "") +
                    (r.note ? " — " + esc(r.note) : "")
                  );
                })
                .join("<br>")
            : '<span style="color:#64748b">Nessun risultato</span>';
          return (
            '<div class="admin-card" data-ev-id="' +
            esc(e.id) +
            '"><div class="admin-card-head"><div><strong style="color:#fff">' +
            esc(e.titolo) +
            '</strong><div class="meta">' +
            esc(fmt(e.data_evento)) +
            " · " +
            flags.join(" · ") +
            '</div></div><div style="display:flex;gap:.35rem;flex-wrap:wrap">' +
            '<button type="button" class="btn-sm ea-csv" data-id="' +
            esc(e.id) +
            '">⬇ CSV</button> ' +
            '<button type="button" class="btn-sm ea-edit" data-id="' +
            esc(e.id) +
            '">Modifica</button> ' +
            '<button type="button" class="btn-danger-sm ea-del" data-id="' +
            esc(e.id) +
            '">Elimina</button></div></div>' +
            (e.descrizione
              ? '<p class="card-desc">' + esc(e.descrizione) + "</p>"
              : "") +
            '<div style="margin-top:.65rem;font-size:.88rem;color:#cbd5e1;line-height:1.5">' +
            list +
            "</div></div>"
          );
        })
        .join("");
      box.querySelectorAll(".ea-csv").forEach(function (b) {
        b.onclick = function () {
          var eid = b.getAttribute("data-id");
          var e = eventi.find(function (x) {
            return String(x.id) === eid;
          });
          if (!e) return;
          downloadEventoCSV(e, byEv[String(e.id)] || []);
        };
      });
      box.querySelectorAll(".ea-edit").forEach(function (b) {
        b.onclick = function () {
          var e = eventi.find(function (x) {
            return String(x.id) === b.getAttribute("data-id");
          });
          if (!e) return;
          fillForm(e, byEv[String(e.id)] || []);
        };
      });
      box.querySelectorAll(".ea-del").forEach(function (b) {
        b.onclick = async function () {
          if (!confirm("Eliminare evento e risultati?")) return;
          await CVI.supabase
            .from("eventi_aperti")
            .delete()
            .eq("id", b.getAttribute("data-id"));
          loadEventiApertiAdmin();
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171">' +
        esc(e.message || e) +
        '</p><p class="sql-hint" style="display:block">Esegui eventi-aperti-sql.sql su Supabase.</p>';
    }
  }

  function fillForm(e, rows) {
    document.getElementById("ea-id").value = e.id || "";
    document.getElementById("ea-titolo").value = e.titolo || "";
    document.getElementById("ea-data").value = toLocal(e.data_evento);
    document.getElementById("ea-desc").value = e.descrizione || "";
    document.getElementById("ea-pub").checked = !!e.pubblicato;
    document.getElementById("ea-home").checked = !!e.mostra_home;
    document.getElementById("ea-form-title").textContent = e.id
      ? "Modifica evento"
      : "Nuovo evento aperto";
    document.getElementById("ea-cancel").style.display = e.id
      ? "inline-block"
      : "none";
    var body = document.getElementById("ea-ris-body");
    body.innerHTML = "";
    if (rows && rows.length)
      rows.forEach(function (r) {
        addRisRow(r.posizione, r.nickname, r.team, r.note);
      });
    else for (var i = 1; i <= 5; i++) addRisRow(i, "", "", "");
  }

  function addRisRow(pos, nick, team, note) {
    var body = document.getElementById("ea-ris-body");
    if (!body) return;
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><input type="number" min="1" class="adm-input ea-pos" value="' +
      esc(pos || body.children.length + 1) +
      '" style="width:4rem"></td>' +
      '<td><input type="text" class="adm-input ea-nick" value="' +
      esc(nick || "") +
      '" placeholder="Nickname" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input ea-team" value="' +
      esc(team || "") +
      '" placeholder="Team" style="width:100%"></td>' +
      '<td><input type="text" class="adm-input ea-note" value="' +
      esc(note || "") +
      '" placeholder="Note" style="width:100%"></td>' +
      '<td><button type="button" class="btn-danger-sm ea-rm">×</button></td>';
    body.appendChild(tr);
    tr.querySelector(".ea-rm").onclick = function () {
      tr.remove();
    };
  }

  /* ---- Import CSV classifica ---- */
  function parseCSVText(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    var firstLine = text.split(/\r?\n/)[0] || "";
    var sep = firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";
    var rows = [], row = [], cur = "", inQ = false, i = 0;
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cur += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === sep) { row.push(cur); cur = ""; i++; continue; }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = ""; rows.push(row); row = []; i++; continue;
      }
      cur += c; i++;
    }
    row.push(cur); rows.push(row);
    return rows.filter(function (r) {
      return r.some(function (x) { return String(x).trim() !== ""; });
    });
  }

  function importEventoCsv(text) {
    var rows = parseCSVText(text);
    if (!rows.length) { alert("CSV vuoto o non leggibile."); return 0; }
    var idx = { pos: 0, nick: 1, team: 2, note: 3 };
    var start = 0;
    var h = rows[0].map(function (x) { return String(x).trim().toLowerCase(); });
    var hasHeader =
      h.some(function (x) { return /posiz|^pos\b|pos\.|rank|^#$/.test(x); }) ||
      h.some(function (x) { return /nick|skipper/.test(x); });
    if (hasHeader) {
      start = 1;
      var find = function (re, def) {
        for (var k = 0; k < h.length; k++) if (re.test(h[k])) return k;
        return def;
      };
      idx.pos = find(/posiz|^pos\b|pos\.|rank|^#$/, 0);
      idx.nick = find(/nick|skipper|nome/, 1);
      idx.team = find(/team|squadra/, 2);
      idx.note = find(/note|nota|comment/, 3);
    }
    var parsed = [];
    for (var i = start; i < rows.length; i++) {
      var r = rows[i];
      var nick = String(r[idx.nick] == null ? "" : r[idx.nick]).trim();
      if (!nick) continue;
      var pos = parseInt(String(r[idx.pos] == null ? "" : r[idx.pos]).replace(/[^0-9]/g, ""), 10);
      parsed.push({
        pos: isNaN(pos) ? null : pos,
        nick: nick,
        team: String(r[idx.team] == null ? "" : r[idx.team]).trim(),
        note: String(r[idx.note] == null ? "" : r[idx.note]).trim()
      });
    }
    if (!parsed.length) {
      alert("Nessuno skipper trovato nel CSV: serve una colonna Nickname (es. Posizione;Nickname;Team;Note).");
      return 0;
    }
    if (parsed.some(function (p) { return p.pos != null; })) {
      parsed.sort(function (a, b) {
        return (a.pos == null ? 9999 : a.pos) - (b.pos == null ? 9999 : b.pos);
      });
    }
    var body = document.getElementById("ea-ris-body");
    if (body) body.innerHTML = "";
    parsed.forEach(function (p, i) {
      addRisRow(p.pos != null ? p.pos : i + 1, p.nick, p.team, p.note);
    });
    return parsed.length;
  }

  function downloadCsvTemplate() {
    var lines = [
      "Posizione;Nickname;Team;Note",
      "1;Skipper Uno;Team A;",
      "2;Skipper Due;Team B;",
      "3;Skipper Tre;;",
      "4;Skipper Quattro;;"
    ];
    var blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modello-classifica-evento.csv";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function resetForm() {
    fillForm(
      {
        id: "",
        titolo: "",
        data_evento: null,
        descrizione: "",
        pubblicato: false,
        mostra_home: false
      },
      []
    );
  }

  async function saveEvento(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var id = document.getElementById("ea-id").value.trim();
    var titolo = document.getElementById("ea-titolo").value.trim();
    if (!titolo) return alert("Titolo obbligatorio");
    var dl = document.getElementById("ea-data").value;
    var mostraHome = document.getElementById("ea-home").checked;
    var payload = {
      titolo: titolo,
      data_evento: dl ? new Date(dl).toISOString() : null,
      descrizione: document.getElementById("ea-desc").value.trim() || null,
      pubblicato: document.getElementById("ea-pub").checked,
      mostra_home: mostraHome,
      updated_at: new Date().toISOString()
    };
    var btn = document.getElementById("ea-save");
    if (btn) btn.disabled = true;
    try {
      if (mostraHome) {
        var clearQ = CVI.supabase
          .from("eventi_aperti")
          .update({ mostra_home: false })
          .eq("mostra_home", true);
        if (id) clearQ = clearQ.neq("id", id);
        var clearRes = await clearQ;
        if (clearRes.error) console.warn("clear mostra_home", clearRes.error);
      }

      var eventoId = id;
      if (id) {
        var u = await CVI.supabase
          .from("eventi_aperti")
          .update(payload)
          .eq("id", id);
        if (u.error) throw u.error;
      } else {
        var ins = await CVI.supabase
          .from("eventi_aperti")
          .insert(payload)
          .select("id")
          .maybeSingle();
        if (ins.error) throw ins.error;
        eventoId = ins.data.id;
      }

      await CVI.supabase
        .from("eventi_aperti_risultati")
        .delete()
        .eq("evento_id", eventoId);

      var rows = [];
      document.querySelectorAll("#ea-ris-body tr").forEach(function (tr) {
        var nick = (tr.querySelector(".ea-nick") || {}).value;
        nick = nick ? String(nick).trim() : "";
        if (!nick) return;
        var pos = parseInt((tr.querySelector(".ea-pos") || {}).value, 10) || 1;
        rows.push({
          evento_id: eventoId,
          posizione: pos,
          nickname: nick,
          team: ((tr.querySelector(".ea-team") || {}).value || "").trim() || null,
          note: ((tr.querySelector(".ea-note") || {}).value || "").trim() || null
        });
      });
      if (rows.length) {
        var ir = await CVI.supabase
          .from("eventi_aperti_risultati")
          .insert(rows);
        if (ir.error) throw ir.error;
      }

      var st = document.getElementById("admin-status");
      if (st) {
        st.textContent = "Evento salvato" + (mostraHome ? " · in Home" : "");
        st.className = "admin-status ok";
      }
      resetForm();
      loadEventiApertiAdmin();
    } catch (err) {
      alert(err.message || err);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  window.loadEventiApertiAdmin = loadEventiApertiAdmin;

  function wire() {
    var tab = document.querySelector('.admin-tab[data-tab="eventi-aperti"]');
    if (tab && !tab._eaWired) {
      tab._eaWired = true;
      tab.onclick = function () {
        document.querySelectorAll(".admin-tab").forEach(function (t) {
          t.classList.remove("active");
        });
        document.querySelectorAll(".admin-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        tab.classList.add("active");
        var panel = document.getElementById("panel-eventi-aperti");
        if (panel) panel.classList.add("active");
        loadEventiApertiAdmin();
      };
    }
    var form = document.getElementById("ea-form");
    if (form && !form._eaWired) {
      form._eaWired = true;
      form.onsubmit = saveEvento;
    }
    var add = document.getElementById("ea-add-row");
    if (add && !add._eaWired) {
      add._eaWired = true;
      add.onclick = function () {
        addRisRow(
          document.querySelectorAll("#ea-ris-body tr").length + 1,
          "",
          "",
          ""
        );
      };
    }
    var impBtn = document.getElementById("ea-import-csv");
    var csvFile = document.getElementById("ea-csv-file");
    if (impBtn && !impBtn._eaWired) {
      impBtn._eaWired = true;
      impBtn.onclick = function () { if (csvFile) csvFile.click(); };
    }
    if (csvFile && !csvFile._eaWired) {
      csvFile._eaWired = true;
      csvFile.onchange = function () {
        var f = this.files && this.files[0];
        if (!f) return;
        var hint = document.getElementById("ea-csv-hint");
        var reader = new FileReader();
        reader.onload = function () {
          var n = importEventoCsv(reader.result);
          if (n && hint) {
            hint.textContent = "Importati " + n + " skipper dal file \u00ab" + f.name + "\u00bb. Controlla le righe e premi Salva evento.";
            hint.style.color = "#34d399";
          }
          csvFile.value = "";
        };
        reader.onerror = function () { alert("Impossibile leggere il file."); csvFile.value = ""; };
        reader.readAsText(f, "UTF-8");
      };
    }
    var tplBtn = document.getElementById("ea-csv-template");
    if (tplBtn && !tplBtn._eaWired) {
      tplBtn._eaWired = true;
      tplBtn.onclick = downloadCsvTemplate;
    }
    var textTa = document.getElementById("ea-csv-text");
    var textBtn = document.getElementById("ea-import-csv-text");
    if (textBtn && !textBtn._eaWired) {
      textBtn._eaWired = true;
      textBtn.onclick = function () {
        var val = textTa ? textTa.value : "";
        if (!val.trim()) { alert("Incolla prima il testo CSV (es. Posizione;Nickname;Team;Note)."); return; }
        var n = importEventoCsv(val);
        var hint = document.getElementById("ea-csv-hint");
        if (n && hint) {
          hint.textContent = "Importati " + n + " skipper dal testo incollato. Controlla le righe e premi Salva evento.";
          hint.style.color = "#34d399";
        }
      };
    }
    var textClear = document.getElementById("ea-clear-csv-text");
    if (textClear && !textClear._eaWired) {
      textClear._eaWired = true;
      textClear.onclick = function () { if (textTa) textTa.value = ""; };
    }
    var cancel = document.getElementById("ea-cancel");
    if (cancel && !cancel._eaWired) {
      cancel._eaWired = true;
      cancel.onclick = resetForm;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(wire, 800);
      setTimeout(wire, 2000);
    });
  } else {
    setTimeout(wire, 800);
    setTimeout(wire, 2000);
  }
})();
