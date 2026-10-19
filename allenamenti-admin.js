/* CVI Admin – Allenamenti programmati */
(function () {
  "use strict";

  var STATI = {
    programmato: "Programmato",
    in_corso: "In corso",
    concluso: "Concluso",
    annullato: "Annullato"
  };

  var cache = [];
  var _loading = false;

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function notify(msg, type) {
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (type ? " " + type : "");
    clearTimeout(notify._t);
    if (msg) {
      notify._t = setTimeout(function () {
        el.textContent = "";
        el.className = "admin-status";
      }, 4000);
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

  function fmt(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("it-IT", {
        weekday: "short",
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

  function panelHTML() {
    return (
      '<div class="admin-card">' +
      '<h3 id="al-form-title" style="margin:0 0 0.5rem;color:#7dd3fc">Nuovo allenamento</h3>' +
      '<p style="color:#94a3b8;font-size:0.88rem;margin:0 0 1rem">Crea uno slot singolo. Per le date fisse usa il generatore ricorrente sotto.</p>' +
      '<form id="al-form" class="form-grid">' +
      '<input type="hidden" id="al-id">' +
      '<div><label class="adm-label" for="al-titolo">Titolo *</label>' +
      '<input class="adm-input" id="al-titolo" required style="width:100%" placeholder="Es. Allenamento Martedì"></div>' +
      '<div><label class="adm-label" for="al-data">Data e ora *</label>' +
      '<input type="datetime-local" class="adm-input" id="al-data" required style="width:100%"></div>' +
      '<div style="display:flex;gap:1rem;flex-wrap:wrap">' +
      '<div><label class="adm-label" for="al-durata">Durata (min)</label>' +
      '<input type="number" min="30" max="240" class="adm-input" id="al-durata" value="90" style="width:6rem"></div>' +
      '<div><label class="adm-label" for="al-classe">Classe barca</label>' +
      '<input class="adm-input" id="al-classe" style="width:8rem" placeholder="ACC"></div>' +
      '<div><label class="adm-label" for="al-max">Max iscritti</label>' +
      '<input type="number" min="0" max="100" class="adm-input" id="al-max" style="width:6rem" placeholder="illimitati"></div>' +
      '</div>' +
      '<div><label class="adm-label" for="al-desc">Descrizione</label>' +
      '<textarea class="adm-input" id="al-desc" rows="2" style="width:100%"></textarea></div>' +
      '<div><label class="adm-label" for="al-server">Server / info</label>' +
      '<input class="adm-input" id="al-server" style="width:100%" placeholder="IP, password o link Discord"></div>' +
      '<div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:center">' +
      '<div><label class="adm-label" for="al-stato">Stato</label>' +
      '<select class="adm-select" id="al-stato">' +
      '<option value="programmato">Programmato</option>' +
      '<option value="in_corso">In corso</option>' +
      '<option value="concluso">Concluso</option>' +
      '<option value="annullato">Annullato</option>' +
      '</select></div>' +
      '<label style="color:#e2e8f0;font-size:0.88rem;margin-top:1.2rem">' +
      '<input type="checkbox" id="al-pub" checked> Pubblicato</label>' +
      '</div>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn-primary" id="al-save-btn">Salva allenamento</button>' +
      '<button type="button" class="btn-ghost" id="al-cancel-btn" style="display:none">Annulla</button>' +
      '</div></form></div>' +
      /* Generatore ricorrente */
      '<div class="admin-card" style="margin-top:1rem">' +
      '<h3 style="margin:0 0 0.5rem;color:#34d399">Genera date ricorrenti</h3>' +
      '<p style="color:#94a3b8;font-size:0.88rem;margin:0 0 1rem">Crea automaticamente gli slot per le prossime settimane (es. ogni martedì e giovedì alle 21:00).</p>' +
      '<div class="form-grid">' +
      '<div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end">' +
      '<div><label class="adm-label">Giorni</label>' +
      '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;color:#e2e8f0;font-size:0.88rem;padding-top:0.35rem">' +
      '<label><input type="checkbox" class="al-gen-day" value="1"> Lun</label>' +
      '<label><input type="checkbox" class="al-gen-day" value="2" checked> Mar</label>' +
      '<label><input type="checkbox" class="al-gen-day" value="3"> Mer</label>' +
      '<label><input type="checkbox" class="al-gen-day" value="4" checked> Gio</label>' +
      '<label><input type="checkbox" class="al-gen-day" value="5"> Ven</label>' +
      '<label><input type="checkbox" class="al-gen-day" value="6"> Sab</label>' +
      '<label><input type="checkbox" class="al-gen-day" value="7"> Dom</label>' +
      '</div></div>' +
      '<div><label class="adm-label" for="al-gen-ora">Ora</label>' +
      '<input type="time" class="adm-input" id="al-gen-ora" value="21:00" style="width:7rem"></div>' +
      '<div><label class="adm-label" for="al-gen-settimane">Settimane</label>' +
      '<input type="number" min="1" max="26" class="adm-input" id="al-gen-settimane" value="8" style="width:5rem"></div>' +
      '</div>' +
      '<div style="display:flex;gap:1rem;flex-wrap:wrap">' +
      '<div><label class="adm-label" for="al-gen-titolo">Titolo base</label>' +
      '<input class="adm-input" id="al-gen-titolo" value="Allenamento" style="width:12rem"></div>' +
      '<div><label class="adm-label" for="al-gen-classe">Classe</label>' +
      '<input class="adm-input" id="al-gen-classe" value="ACC" style="width:6rem"></div>' +
      '<div><label class="adm-label" for="al-gen-max">Max iscritti</label>' +
      '<input type="number" min="0" class="adm-input" id="al-gen-max" value="20" style="width:5rem"></div>' +
      '<div><label class="adm-label" for="al-gen-durata">Durata (min)</label>' +
      '<input type="number" min="30" class="adm-input" id="al-gen-durata" value="90" style="width:5rem"></div>' +
      '</div>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn-primary" id="al-gen-btn">Genera allenamenti</button>' +
      '</div>' +
      '<p id="al-gen-status" style="margin:0.5rem 0 0;font-size:0.85rem;color:#94a3b8"></p>' +
      '</div></div>' +
      '<div id="al-sql-hint" class="sql-hint" style="display:none">Esegui allenamenti-sql.sql su Supabase.</div>' +
      '<div id="al-list" style="margin-top:1rem"><p class="loading-text">Apri questa scheda per caricare gli allenamenti.</p></div>'
    );
  }

  function ensureUI() {
    var tabs = document.querySelector(".admin-tabs");
    if (!tabs) return false;

    var tab = tabs.querySelector('[data-tab="allenamenti"]');
    if (!tab) {
      tab = document.createElement("button");
      tab.type = "button";
      tab.className = "admin-tab";
      tab.setAttribute("data-tab", "allenamenti");
      tab.textContent = "Allenamenti";
      var tornei = tabs.querySelector('[data-tab="tornei"]');
      var eventi = tabs.querySelector('[data-tab="eventi-aperti"]');
      var reg = tabs.querySelector('[data-tab="regolamento"]');
      if (tornei && tornei.nextSibling) tabs.insertBefore(tab, tornei.nextSibling);
      else if (eventi) tabs.insertBefore(tab, eventi);
      else if (reg) tabs.insertBefore(tab, reg);
      else tabs.appendChild(tab);
    }

    var panel = document.getElementById("panel-allenamenti");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "panel-allenamenti";
      panel.className = "admin-panel";
      var before =
        document.getElementById("panel-tornei") ||
        document.getElementById("panel-eventi-aperti") ||
        document.getElementById("panel-regolamento") ||
        document.getElementById("panel-export");
      var app = document.getElementById("admin-app");
      if (before && before.parentNode) before.parentNode.insertBefore(panel, before.nextSibling);
      else if (app) app.appendChild(panel);
      else return false;
    }

    if (!document.getElementById("al-form")) panel.innerHTML = panelHTML();
    return true;
  }

  function resetForm() {
    var id = document.getElementById("al-id");
    if (!id) return;
    id.value = "";
    document.getElementById("al-titolo").value = "";
    document.getElementById("al-data").value = "";
    document.getElementById("al-durata").value = "90";
    document.getElementById("al-classe").value = "";
    document.getElementById("al-max").value = "";
    document.getElementById("al-desc").value = "";
    document.getElementById("al-server").value = "";
    document.getElementById("al-stato").value = "programmato";
    document.getElementById("al-pub").checked = true;
    document.getElementById("al-form-title").textContent = "Nuovo allenamento";
    document.getElementById("al-save-btn").textContent = "Salva allenamento";
    var c = document.getElementById("al-cancel-btn");
    if (c) c.style.display = "none";
  }

  function fillForm(a) {
    document.getElementById("al-id").value = a.id || "";
    document.getElementById("al-titolo").value = a.titolo || "";
    document.getElementById("al-data").value = toLocal(a.data_ora);
    document.getElementById("al-durata").value = a.durata_minuti != null ? a.durata_minuti : 90;
    document.getElementById("al-classe").value = a.classe_barca || "";
    document.getElementById("al-max").value =
      a.max_iscritti != null && a.max_iscritti > 0 ? a.max_iscritti : "";
    document.getElementById("al-desc").value = a.descrizione || "";
    document.getElementById("al-server").value = a.server_info || "";
    document.getElementById("al-stato").value = a.stato || "programmato";
    document.getElementById("al-pub").checked = a.pubblicato !== false;
    document.getElementById("al-form-title").textContent = a.id
      ? "Modifica allenamento"
      : "Nuovo allenamento";
    document.getElementById("al-save-btn").textContent = a.id ? "Aggiorna" : "Salva allenamento";
    var c = document.getElementById("al-cancel-btn");
    if (c) c.style.display = a.id ? "inline-block" : "none";
    document.getElementById("al-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function loadList() {
    if (!ensureUI()) return;
    if (_loading) return;
    _loading = true;
    var box = document.getElementById("al-list");
    var hint = document.getElementById("al-sql-hint");
    if (!box) {
      _loading = false;
      return;
    }
    box.innerHTML = '<p class="loading-text">Caricamento…</p>';
    try {
      if (!window.CVI || !CVI.supabase) throw new Error("Supabase non disponibile");
      var r = await CVI.supabase
        .from("allenamenti")
        .select("*")
        .order("data_ora", { ascending: true });
      if (r.error) throw r.error;
      cache = r.data || [];
      if (hint) hint.style.display = "none";

      if (!cache.length) {
        box.innerHTML =
          '<p class="empty-text">Nessun allenamento. Creane uno col form oppure usa il generatore ricorrente.</p>';
        return;
      }

      // conteggio iscritti
      var ids = cache.map(function (a) {
        return a.id;
      });
      var countMap = {};
      try {
        var ir = await CVI.supabase
          .from("allenamento_iscrizioni")
          .select("allenamento_id")
          .in("allenamento_id", ids);
        (ir.data || []).forEach(function (row) {
          countMap[row.allenamento_id] = (countMap[row.allenamento_id] || 0) + 1;
        });
      } catch (e) {}

      box.innerHTML = cache
        .map(function (a) {
          var n = countMap[a.id] || 0;
          var max =
            a.max_iscritti != null && a.max_iscritti > 0 ? a.max_iscritti : null;
          var st = STATI[a.stato] || a.stato;
          var flags = [];
          if (a.pubblicato)
            flags.push('<span style="color:#34d399;font-weight:700;font-size:.75rem">PUB</span>');
          else
            flags.push('<span style="color:#fbbf24;font-weight:700;font-size:.75rem">BOZZA</span>');
          if (a.ricorrente)
            flags.push('<span style="color:#7dd3fc;font-size:.75rem">ricorrente</span>');

          return (
            '<div class="admin-card" style="margin-bottom:0.75rem">' +
            '<div class="admin-card-head"><div>' +
            "<strong>" +
            esc(a.titolo) +
            "</strong>" +
            '<div class="meta">' +
            esc(fmt(a.data_ora)) +
            " · " +
            esc(st) +
            " · iscritti " +
            n +
            (max != null ? "/" + max : "") +
            (a.classe_barca ? " · " + esc(a.classe_barca) : "") +
            " · " +
            flags.join(" · ") +
            "</div></div>" +
            '<div style="display:flex;gap:0.4rem;flex-wrap:wrap">' +
            '<button type="button" class="btn-sm al-edit" data-id="' +
            esc(a.id) +
            '">Modifica</button>' +
            '<button type="button" class="btn-sm al-iscr" data-id="' +
            esc(a.id) +
            '">Iscritti (' +
            n +
            ")</button>" +
            '<button type="button" class="btn-danger-sm al-del" data-id="' +
            esc(a.id) +
            '">Elimina</button>' +
            "</div></div>" +
            (a.descrizione
              ? '<p class="card-desc">' + esc(a.descrizione) + "</p>"
              : "") +
            '<div id="al-iscr-box-' +
            esc(a.id) +
            '" style="display:none;margin-top:0.65rem"></div>' +
            "</div>"
          );
        })
        .join("");

      box.querySelectorAll(".al-edit").forEach(function (b) {
        b.onclick = function () {
          var a = cache.find(function (x) {
            return String(x.id) === b.getAttribute("data-id");
          });
          if (a) fillForm(a);
        };
      });

      box.querySelectorAll(".al-del").forEach(function (b) {
        b.onclick = async function () {
          var id = b.getAttribute("data-id");
          var a = cache.find(function (x) {
            return String(x.id) === id;
          });
          if (!confirm("Eliminare l'allenamento «" + (a && a.titolo ? a.titolo : "") + "»?"))
            return;
          try {
            var del = await CVI.supabase.from("allenamenti").delete().eq("id", id);
            if (del.error) throw del.error;
            notify("Allenamento eliminato", "ok");
            loadList();
          } catch (err) {
            alert("Errore: " + (err.message || err));
          }
        };
      });

      box.querySelectorAll(".al-iscr").forEach(function (b) {
        b.onclick = function () {
          showIscritti(b.getAttribute("data-id"));
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p class="empty-text" style="color:#f87171">Errore: ' +
        esc(e.message || e) +
        "</p>";
      if (hint) {
        hint.style.display = "block";
        hint.textContent = "Esegui allenamenti-sql.sql nel SQL Editor di Supabase.";
      }
    } finally {
      _loading = false;
    }
  }

  async function showIscritti(allId) {
    var box = document.getElementById("al-iscr-box-" + allId);
    if (!box) return;
    if (box.style.display === "block" && box.innerHTML) {
      box.style.display = "none";
      return;
    }
    box.style.display = "block";
    box.innerHTML = '<p class="loading-text">Caricamento iscritti…</p>';
    try {
      var r = await CVI.supabase
        .from("allenamento_iscrizioni")
        .select("id,user_id,nickname,created_at")
        .eq("allenamento_id", allId)
        .order("created_at", { ascending: true });
      if (r.error) throw r.error;
      var rows = r.data || [];
      if (!rows.length) {
        box.innerHTML = '<p class="empty-text" style="font-size:0.88rem">Nessun iscritto.</p>';
        return;
      }
      var uids = rows.map(function (i) {
        return i.user_id;
      });
      var pr = await CVI.supabase
        .from("profiles")
        .select("id,nickname,team")
        .in("id", uids);
      var pmap = {};
      (pr.data || []).forEach(function (p) {
        pmap[p.id] = p;
      });
      box.innerHTML =
        '<ul style="list-style:none;padding:0;margin:0;font-size:0.88rem">' +
        rows
          .map(function (i, idx) {
            var p = pmap[i.user_id] || {};
            var nick = i.nickname || p.nickname || String(i.user_id).slice(0, 8);
            var team = p.team ? " · " + p.team : "";
            return (
              "<li style=\"padding:0.3rem 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:center;gap:0.5rem\">" +
              "<span><strong>" +
              (idx + 1) +
              ".</strong> " +
              esc(nick) +
              esc(team) +
              "</span>" +
              '<button type="button" class="btn-danger-sm al-rm-iscr" data-iscr="' +
              esc(i.id) +
              '" data-all="' +
              esc(allId) +
              '">Rimuovi</button></li>'
            );
          })
          .join("") +
        "</ul>";
      box.querySelectorAll(".al-rm-iscr").forEach(function (btn) {
        btn.onclick = async function () {
          if (!confirm("Rimuovere questo iscritto?")) return;
          try {
            await CVI.supabase
              .from("allenamento_iscrizioni")
              .delete()
              .eq("id", btn.getAttribute("data-iscr"));
            showIscritti(btn.getAttribute("data-all"));
            loadList();
          } catch (err) {
            alert(err.message || err);
          }
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171;font-size:0.88rem">' + esc(e.message || e) + "</p>";
    }
  }

  async function saveAllenamento(e) {
    if (e) e.preventDefault();
    var id = (document.getElementById("al-id") || {}).value || "";
    var titolo = ((document.getElementById("al-titolo") || {}).value || "").trim();
    if (!titolo) return alert("Titolo obbligatorio");
    var dl = (document.getElementById("al-data") || {}).value;
    if (!dl) return alert("Data e ora obbligatorie");
    var durata = parseInt((document.getElementById("al-durata") || {}).value, 10);
    if (isNaN(durata) || durata < 30) durata = 90;
    var maxRaw = ((document.getElementById("al-max") || {}).value || "").trim();
    var maxIscr = maxRaw === "" ? null : parseInt(maxRaw, 10);
    if (maxIscr !== null && (isNaN(maxIscr) || maxIscr <= 0)) maxIscr = null;

    var payload = {
      titolo: titolo,
      data_ora: new Date(dl).toISOString(),
      durata_minuti: durata,
      classe_barca: ((document.getElementById("al-classe") || {}).value || "").trim() || null,
      max_iscritti: maxIscr,
      descrizione: ((document.getElementById("al-desc") || {}).value || "").trim() || null,
      server_info: ((document.getElementById("al-server") || {}).value || "").trim() || null,
      stato: (document.getElementById("al-stato") || {}).value || "programmato",
      pubblicato: !!(document.getElementById("al-pub") || {}).checked,
      updated_at: new Date().toISOString()
    };

    var btn = document.getElementById("al-save-btn");
    if (btn) btn.disabled = true;
    try {
      var r;
      if (id) {
        r = await CVI.supabase.from("allenamenti").update(payload).eq("id", id);
      } else {
        r = await CVI.supabase.from("allenamenti").insert(payload);
      }
      if (r.error) throw r.error;
      notify(id ? "Allenamento aggiornato" : "Allenamento creato", "ok");
      resetForm();
      loadList();
    } catch (err) {
      notify(err.message || err, "err");
      var hint = document.getElementById("al-sql-hint");
      if (hint) {
        hint.style.display = "block";
        hint.textContent =
          "Errore: " + (err.message || err) + " — esegui allenamenti-sql.sql su Supabase.";
      }
      alert("Errore salvataggio: " + (err.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /** Genera le date ricorrenti gestite dall'admin */
  async function generaRicorrenti() {
    var days = [];
    document.querySelectorAll(".al-gen-day:checked").forEach(function (cb) {
      days.push(parseInt(cb.value, 10));
    });
    if (!days.length) return alert("Seleziona almeno un giorno della settimana.");

    var ora = (document.getElementById("al-gen-ora") || {}).value || "21:00";
    var parts = ora.split(":");
    var hh = parseInt(parts[0], 10) || 21;
    var mm = parseInt(parts[1], 10) || 0;

    var settimane = parseInt((document.getElementById("al-gen-settimane") || {}).value, 10);
    if (isNaN(settimane) || settimane < 1) settimane = 8;
    if (settimane > 26) settimane = 26;

    var titoloBase =
      ((document.getElementById("al-gen-titolo") || {}).value || "Allenamento").trim() ||
      "Allenamento";
    var classe =
      ((document.getElementById("al-gen-classe") || {}).value || "").trim() || null;
    var maxRaw = ((document.getElementById("al-gen-max") || {}).value || "").trim();
    var maxIscr = maxRaw === "" ? null : parseInt(maxRaw, 10);
    if (maxIscr !== null && (isNaN(maxIscr) || maxIscr <= 0)) maxIscr = null;
    var durata = parseInt((document.getElementById("al-gen-durata") || {}).value, 10);
    if (isNaN(durata) || durata < 30) durata = 90;

    var nomiGiorno = {
      1: "Lunedì",
      2: "Martedì",
      3: "Mercoledì",
      4: "Giovedì",
      5: "Venerdì",
      6: "Sabato",
      7: "Domenica"
    };

    // ISO weekday: 1=Lun ... 7=Dom  (JS getDay: 0=Dom,1=Lun...)
    function isoWeekday(d) {
      var js = d.getDay();
      return js === 0 ? 7 : js;
    }

    var rows = [];
    var start = new Date();
    start.setHours(0, 0, 0, 0);

    for (var w = 0; w < settimane; w++) {
      for (var di = 0; di < days.length; di++) {
        var targetDay = days[di];
        // trova il prossimo giorno target a partire da start + w settimane
        var d = new Date(start);
        d.setDate(d.getDate() + w * 7);
        var currentIso = isoWeekday(d);
        var delta = targetDay - currentIso;
        if (delta < 0) delta += 7;
        // se siamo nella settimana 0 e il giorno è oggi ma l'ora è già passata, salta a +7
        d.setDate(d.getDate() + delta);
        d.setHours(hh, mm, 0, 0);
        if (d.getTime() < Date.now() + 30 * 60 * 1000) {
          // troppo vicino o passato → prossima settimana
          d.setDate(d.getDate() + 7);
        }

        rows.push({
          titolo: titoloBase + " " + (nomiGiorno[targetDay] || ""),
          data_ora: d.toISOString(),
          durata_minuti: durata,
          giorno_settimana: targetDay,
          ricorrente: true,
          classe_barca: classe,
          max_iscritti: maxIscr,
          stato: "programmato",
          pubblicato: true
        });
      }
    }

    // ordina e deduplica per data_ora (stesso giorno/ora)
    rows.sort(function (a, b) {
      return new Date(a.data_ora) - new Date(b.data_ora);
    });
    var seen = {};
    rows = rows.filter(function (r) {
      var k = r.data_ora;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });

    if (!rows.length) return alert("Nessuna data generata.");

    var st = document.getElementById("al-gen-status");
    var btn = document.getElementById("al-gen-btn");
    if (btn) btn.disabled = true;
    if (st) {
      st.style.color = "#94a3b8";
      st.textContent = "Creazione di " + rows.length + " allenamenti…";
    }

    try {
      // evita duplicati: non inserire se esiste già stesso data_ora ±1 min
      var existing = await CVI.supabase
        .from("allenamenti")
        .select("data_ora")
        .gte("data_ora", rows[0].data_ora)
        .lte("data_ora", rows[rows.length - 1].data_ora);
      var existSet = {};
      (existing.data || []).forEach(function (e) {
        if (e.data_ora) existSet[new Date(e.data_ora).toISOString().slice(0, 16)] = true;
      });

      var toInsert = rows.filter(function (r) {
        return !existSet[new Date(r.data_ora).toISOString().slice(0, 16)];
      });

      if (!toInsert.length) {
        if (st) {
          st.style.color = "#fbbf24";
          st.textContent =
            "Tutte le date selezionate esistono già. Nessun nuovo allenamento creato.";
        }
        return;
      }

      var ins = await CVI.supabase.from("allenamenti").insert(toInsert);
      if (ins.error) throw ins.error;

      if (st) {
        st.style.color = "#34d399";
        st.textContent =
          "Creati " +
          toInsert.length +
          " allenamenti" +
          (toInsert.length < rows.length
            ? " (" + (rows.length - toInsert.length) + " già esistenti saltati)"
            : "") +
          ".";
      }
      notify("Generati " + toInsert.length + " allenamenti", "ok");
      loadList();
    } catch (err) {
      if (st) {
        st.style.color = "#f87171";
        st.textContent = err.message || err;
      }
      alert("Errore generazione: " + (err.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wire() {
    if (!ensureUI()) return;

    var tab = document.querySelector('.admin-tab[data-tab="allenamenti"]');
    if (tab && !tab._alWired) {
      tab._alWired = true;
      tab.addEventListener("click", function () {
        document.querySelectorAll(".admin-tab").forEach(function (t) {
          t.classList.remove("active");
        });
        document.querySelectorAll(".admin-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        tab.classList.add("active");
        var panel = document.getElementById("panel-allenamenti");
        if (panel) panel.classList.add("active");
        loadList();
      });
    }

    var form = document.getElementById("al-form");
    if (form && !form._alWired) {
      form._alWired = true;
      form.onsubmit = saveAllenamento;
    }

    var cancel = document.getElementById("al-cancel-btn");
    if (cancel && !cancel._alWired) {
      cancel._alWired = true;
      cancel.onclick = resetForm;
    }

    var genBtn = document.getElementById("al-gen-btn");
    if (genBtn && !genBtn._alWired) {
      genBtn._alWired = true;
      genBtn.onclick = generaRicorrenti;
    }
  }

  window.loadAllenamentiAdmin = loadList;

  function boot() {
    wire();
    setTimeout(wire, 800);
    setTimeout(wire, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
