/* CVI – pagina pubblica Allenamenti + iscrizioni */
(function () {
  "use strict";

  var STATI = {
    programmato: "Programmato",
    in_corso: "In corso",
    concluso: "Concluso",
    annullato: "Annullato"
  };

  var currentUserId = null;
  var iscrizioniByAll = {}; // allenamento_id -> [{id,user_id,nickname,...}]

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("it-IT", {
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

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error((label || "Operazione") + " in timeout (" + ms + "ms)"));
        }, ms);
      })
    ]);
  }

  function waitCVI() {
    return new Promise(function (resolve) {
      var n = 0;
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (++n > 100) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
  }

  async function getSessionUserId() {
    try {
      var res = await withTimeout(CVI.supabase.auth.getSession(), 5000, "Sessione");
      var session = res.data && res.data.session;
      return session && session.user ? session.user.id : null;
    } catch (e) {
      return null;
    }
  }

  async function loadIscrizioni(ids) {
    if (!ids.length) {
      iscrizioniByAll = {};
      return;
    }
    var r = await withTimeout(
      CVI.supabase
        .from("allenamento_iscrizioni")
        .select("id,allenamento_id,user_id,nickname,created_at")
        .in("allenamento_id", ids)
        .order("created_at", { ascending: true }),
      8000,
      "Iscrizioni"
    );
    if (r.error) throw r.error;
    iscrizioniByAll = {};
    (r.data || []).forEach(function (row) {
      var k = String(row.allenamento_id);
      if (!iscrizioniByAll[k]) iscrizioniByAll[k] = [];
      iscrizioniByAll[k].push(row);
    });
  }

  function isIscritto(allId) {
    if (!currentUserId) return false;
    var list = iscrizioniByAll[String(allId)] || [];
    return list.some(function (i) {
      return String(i.user_id) === String(currentUserId);
    });
  }

  async function iscriviti(allId) {
    if (!currentUserId) return;
    var btn = document.querySelector('[data-iscr="' + allId + '"]');
    var msg = document.querySelector('[data-msg="' + allId + '"]');
    if (btn) btn.disabled = true;
    try {
      var a = window._alCache && window._alCache[allId];
      var list = iscrizioniByAll[String(allId)] || [];
      var max = a && a.max_iscritti != null && a.max_iscritti > 0 ? a.max_iscritti : null;
      if (max != null && list.length >= max) {
        if (msg) {
          msg.style.color = "#f87171";
          msg.textContent = "Posti esauriti.";
        }
        return;
      }
      if (a && a.stato === "annullato") {
        if (msg) {
          msg.style.color = "#f87171";
          msg.textContent = "Allenamento annullato.";
        }
        return;
      }

      var nick = null;
      try {
        var pr = await CVI.supabase
          .from("profiles")
          .select("nickname")
          .eq("id", currentUserId)
          .maybeSingle();
        nick = pr.data && pr.data.nickname ? pr.data.nickname : null;
      } catch (e) {}

      var ins = await CVI.supabase.from("allenamento_iscrizioni").insert({
        allenamento_id: allId,
        user_id: currentUserId,
        nickname: nick
      });
      if (ins.error) throw ins.error;
      if (msg) {
        msg.style.color = "#34d399";
        msg.textContent = "Iscrizione confermata!";
      }

      // Notifica Discord
      if (window.CVIDiscord && CVIDiscord.notifyAllenamentoIscrizione && a) {
        try {
          await CVIDiscord.notifyAllenamentoIscrizione(
            {
              id: a.id,
              titolo: a.titolo,
              data_ora: a.data_ora,
              max_iscritti: a.max_iscritti
            },
            nick || ""
          );
        } catch (e) {
          console.warn(e);
        }
      }

      await loadIscrizioni([allId].concat(Object.keys(iscrizioniByAll)));
      renderList(window._alList || []);
    } catch (e) {
      var m = e.message || e;
      if (/duplicate|unique|23505/i.test(String(m))) m = "Sei già iscritto.";
      if (msg) {
        msg.style.color = "#f87171";
        msg.textContent = "Errore: " + m;
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function disiscriviti(allId) {
    if (!currentUserId) return;
    if (!confirm("Annullare la tua iscrizione a questo allenamento?")) return;
    var btn = document.querySelector('[data-dis="' + allId + '"]');
    var msg = document.querySelector('[data-msg="' + allId + '"]');
    if (btn) btn.disabled = true;
    try {
      var del = await CVI.supabase
        .from("allenamento_iscrizioni")
        .delete()
        .eq("allenamento_id", allId)
        .eq("user_id", currentUserId);
      if (del.error) throw del.error;
      if (msg) {
        msg.style.color = "#94a3b8";
        msg.textContent = "Iscrizione annullata.";
      }
      await loadIscrizioni([allId].concat(Object.keys(iscrizioniByAll)));
      renderList(window._alList || []);
    } catch (e) {
      if (msg) {
        msg.style.color = "#f87171";
        msg.textContent = "Errore: " + (e.message || e);
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function renderList(list) {
    var box = document.getElementById("al-list");
    if (!box) return;

    window._alList = list;
    window._alCache = {};
    list.forEach(function (a) {
      window._alCache[a.id] = a;
    });

    if (!list.length) {
      box.innerHTML =
        '<p class="al-empty">Nessun allenamento programmato al momento.<br>Gli admin li inseriscono dal pannello di gestione.</p>';
      return;
    }

    var now = Date.now();

    box.innerHTML = list
      .map(function (a) {
        var iscr = iscrizioniByAll[String(a.id)] || [];
        var n = iscr.length;
        var max = a.max_iscritti != null && a.max_iscritti > 0 ? a.max_iscritti : null;
        var pieno = max != null && n >= max;
        var annullato = a.stato === "annullato";
        var concluso =
          a.stato === "concluso" ||
          (a.data_ora && new Date(a.data_ora).getTime() < now - 3 * 3600 * 1000);
        var sonoIscritto = isIscritto(a.id);
        var stLabel = STATI[a.stato] || a.stato;
        if (concluso && a.stato === "programmato") stLabel = "Passato";

        var badgeCls = a.stato || "";
        if (concluso && a.stato === "programmato") badgeCls = "concluso";

        var actions = "";
        if (!annullato && !concluso) {
          if (sonoIscritto) {
            actions =
              '<button type="button" class="btn-ghost" data-dis="' +
              esc(a.id) +
              '">Annulla iscrizione</button>';
          } else if (pieno) {
            actions =
              '<span style="color:#f87171;font-size:.88rem">Posti esauriti</span>';
          } else {
            actions =
              '<button type="button" class="btn-primary" data-iscr="' +
              esc(a.id) +
              '">Iscriviti</button>';
          }
        }

        var listHtml = "";
        if (iscr.length) {
          listHtml =
            '<details style="margin-top:.75rem">' +
            '<summary style="cursor:pointer;color:#7dd3fc;font-size:.88rem;font-weight:600">Elenco iscritti (' +
            n +
            ")</summary>" +
            '<ul class="al-list">' +
            iscr
              .map(function (i, idx) {
                var nick = i.nickname || String(i.user_id).slice(0, 8);
                return (
                  "<li><strong>" + (idx + 1) + ".</strong> " + esc(nick) + "</li>"
                );
              })
              .join("") +
            "</ul></details>";
        }

        return (
          '<article class="al-card' +
          (annullato ? " annullato" : "") +
          '">' +
          '<h2 class="al-title">' +
          esc(a.titolo) +
          "</h2>" +
          '<div class="al-meta">' +
          '<span class="al-badge ' +
          esc(badgeCls) +
          '">' +
          esc(stLabel) +
          "</span>" +
          "<span>📅 " +
          esc(fmt(a.data_ora)) +
          "</span>" +
          (a.classe_barca ? "<span>⛵ " + esc(a.classe_barca) + "</span>" : "") +
          (a.durata_minuti
            ? "<span>⏱ " + esc(String(a.durata_minuti)) + " min</span>"
            : "") +
          "</div>" +
          (a.descrizione ? '<p class="al-desc">' + esc(a.descrizione) + "</p>" : "") +
          (a.server_info
            ? '<p class="al-desc" style="color:#94a3b8">Server: ' +
              esc(a.server_info) +
              "</p>"
            : "") +
          '<div class="al-actions">' +
          '<span class="al-iscr-count">Iscritti: ' +
          n +
          (max != null ? " / " + max : "") +
          "</span>" +
          actions +
          "</div>" +
          '<p class="al-msg" data-msg="' +
          esc(a.id) +
          '"></p>' +
          listHtml +
          "</article>"
        );
      })
      .join("");

    box.querySelectorAll("[data-iscr]").forEach(function (btn) {
      btn.onclick = function () {
        iscriviti(btn.getAttribute("data-iscr"));
      };
    });
    box.querySelectorAll("[data-dis]").forEach(function (btn) {
      btn.onclick = function () {
        disiscriviti(btn.getAttribute("data-dis"));
      };
    });
  }

  async function load() {
    var box = document.getElementById("al-list");
    var gate = document.getElementById("al-auth-gate");
    if (!box) return;

    box.innerHTML = '<p class="al-empty">Caricamento…</p>';

    try {
      currentUserId = await getSessionUserId();

      if (!currentUserId) {
        if (gate) gate.style.display = "block";
        box.innerHTML = "";
        return;
      }
      if (gate) gate.style.display = "none";

      var r = await withTimeout(
        CVI.supabase
          .from("allenamenti")
          .select("*")
          .eq("pubblicato", true)
          .order("data_ora", { ascending: true }),
        10000,
        "Allenamenti"
      );
      if (r.error) throw r.error;
      var list = r.data || [];

      var ids = list.map(function (a) {
        return a.id;
      });
      try {
        await loadIscrizioni(ids);
      } catch (ie) {
        console.warn("Iscrizioni non disponibili", ie);
      }

      renderList(list);
    } catch (e) {
      var msg = e && (e.message || e.details || String(e));
      if (/relation|does not exist|42P01/i.test(msg || "")) {
        box.innerHTML =
          '<p class="al-empty" style="color:#f87171">Tabelle allenamenti non create.<br>Esegui <code>allenamenti-sql.sql</code> nel SQL Editor di Supabase.</p>';
      } else {
        box.innerHTML =
          '<p class="al-empty" style="color:#f87171">Errore: ' + esc(msg) + "</p>";
      }
    }
  }

  async function boot() {
    var ok = await waitCVI();
    if (!ok || !window.CVI || !CVI.supabase) {
      var box = document.getElementById("al-list");
      if (box)
        box.innerHTML =
          '<p class="al-empty" style="color:#f87171">Impossibile inizializzare Supabase. Ricarica la pagina.</p>';
      return;
    }
    load();
  }

  boot();
})();
