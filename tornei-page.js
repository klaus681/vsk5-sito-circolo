/* CVI - pagina pubblica Tornei + iscrizioni */
(function () {
  "use strict";

  var STATI = { bozza: "Bozza", aperto: "Aperto", in_corso: "In corso", chiuso: "Chiuso" };
  var currentTorneo = null;
  var currentUserId = null;
  var iscrizioniCache = [];

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, String.fromCharCode(38, 97, 109, 112, 59))
      .replace(/</g, String.fromCharCode(38, 108, 116, 59))
      .replace(/>/g, String.fromCharCode(38, 103, 116, 59))
      .replace(/"/g, String.fromCharCode(38, 113, 117, 111, 116, 59));
  }

  function qs(name) {
    var m = location.search.match(new RegExp("[?&]" + name + "=([^&]*)"));
    return m ? decodeURIComponent(m[1]) : "";
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

  function setMsg(el, msg, isErr) {
    if (!el) return;
    el.innerHTML =
      '<p class="' +
      (isErr ? "" : "empty-text") +
      '" style="color:' +
      (isErr ? "#f87171" : "var(--text-muted)") +
      '">' +
      esc(msg) +
      "</p>";
  }

  function calcRanking(risultati, scarti) {
    var byUser = {};
    risultati.forEach(function (r) {
      var uid = String(r.user_id);
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(Number(r.punti) || 0);
    });
    var rows = [];
    Object.keys(byUser).forEach(function (uid) {
      var scores = byUser[uid].slice().sort(function (a, b) {
        return b - a;
      });
      var kept = scores.slice(Math.min(scarti, scores.length));
      var total = kept.reduce(function (s, x) {
        return s + x;
      }, 0);
      rows.push({ user_id: uid, punti_totali: total, prove: byUser[uid].length });
    });
    rows.sort(function (a, b) {
      if (a.punti_totali !== b.punti_totali) return a.punti_totali - b.punti_totali;
      return b.prove - a.prove;
    });
    rows.forEach(function (r, i) {
      r.posizione = i + 1;
    });
    return rows;
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

  async function loadIscrizioni(torneoId) {
    var r = await withTimeout(
      CVI.supabase
        .from("torneo_iscrizioni")
        .select("id,user_id,created_at")
        .eq("torneo_id", torneoId)
        .order("created_at", { ascending: true }),
      8000,
      "Iscrizioni"
    );
    if (r.error) throw r.error;
    iscrizioniCache = r.data || [];
    return iscrizioniCache;
  }

  async function renderIscrizioni(t) {
    var countEl = document.getElementById("tn-iscr-count");
    var statusEl = document.getElementById("tn-iscr-status");
    var msgEl = document.getElementById("tn-iscr-msg");
    var btnIn = document.getElementById("tn-iscr-btn");
    var btnOut = document.getElementById("tn-disiscr-btn");
    var loginLink = document.getElementById("tn-iscr-login");
    var listEl = document.getElementById("tn-iscr-list");
    if (!countEl) return;

    var n = iscrizioniCache.length;
    var max = t.max_partecipanti != null && t.max_partecipanti > 0 ? t.max_partecipanti : null;
    countEl.textContent = "Iscritti: " + n + (max != null ? " / " + max : "");

    var pieno = max != null && n >= max;
    var chiuso = t.stato === "chiuso";
    var aperto = t.stato === "aperto" || t.stato === "in_corso";

    if (statusEl) {
      if (chiuso) statusEl.textContent = "(iscrizioni chiuse)";
      else if (pieno) statusEl.textContent = "(completo)";
      else if (aperto) statusEl.textContent = "(iscrizioni aperte)";
      else statusEl.textContent = "(non aperto)";
    }

    currentUserId = await getSessionUserId();
    var sonoIscritto =
      currentUserId &&
      iscrizioniCache.some(function (i) {
        return String(i.user_id) === String(currentUserId);
      });

    if (btnIn) btnIn.style.display = "none";
    if (btnOut) btnOut.style.display = "none";
    if (loginLink) loginLink.style.display = "none";
    if (msgEl) msgEl.textContent = "";

    if (!currentUserId) {
      if (loginLink) {
        loginLink.style.display = "inline-block";
        loginLink.href = "accedi.html?redirect=" + encodeURIComponent("tornei.html?id=" + t.id);
      }
      if (msgEl && !chiuso) msgEl.textContent = "Accedi con il tuo account socio per iscriverti al torneo.";
    } else if (sonoIscritto) {
      if (btnOut) btnOut.style.display = "inline-block";
      if (msgEl) msgEl.textContent = "Sei iscritto a questo torneo.";
    } else if (chiuso) {
      if (msgEl) msgEl.textContent = "Il torneo e chiuso: non e possibile iscriversi.";
    } else if (pieno) {
      if (msgEl) msgEl.textContent = "Raggiunto il numero massimo di partecipanti.";
    } else if (!aperto && t.stato === "bozza") {
      if (msgEl) msgEl.textContent = "Torneo non ancora aperto alle iscrizioni.";
    } else {
      if (btnIn) btnIn.style.display = "inline-block";
    }

    if (listEl) {
      if (!iscrizioniCache.length) {
        listEl.innerHTML = "<li>Nessun iscritto.</li>";
        return;
      }
      var uids = iscrizioniCache.map(function (i) {
        return i.user_id;
      });
      try {
        var pr = await withTimeout(
          CVI.supabase.from("profiles").select("id,nickname,team").in("id", uids),
          8000,
          "Profili"
        );
        var pmap = {};
        (pr.data || []).forEach(function (p) {
          pmap[p.id] = p;
        });
        listEl.innerHTML = iscrizioniCache
          .map(function (i, idx) {
            var p = pmap[i.user_id] || {};
            var nick = p.nickname || String(i.user_id).slice(0, 8);
            var team = p.team ? " · " + p.team : "";
            return "<li><strong>" + (idx + 1) + ".</strong> " + esc(nick) + esc(team) + "</li>";
          })
          .join("");
      } catch (e) {
        listEl.innerHTML = "<li>" + iscrizioniCache.length + " iscritti</li>";
      }
    }
  }

  async function iscriviti() {
    if (!currentTorneo || !currentUserId) return;
    var msgEl = document.getElementById("tn-iscr-msg");
    var btn = document.getElementById("tn-iscr-btn");
    if (btn) btn.disabled = true;
    try {
      await loadIscrizioni(currentTorneo.id);
      var max =
        currentTorneo.max_partecipanti != null && currentTorneo.max_partecipanti > 0
          ? currentTorneo.max_partecipanti
          : null;
      if (max != null && iscrizioniCache.length >= max) {
        if (msgEl) {
          msgEl.style.color = "#f87171";
          msgEl.textContent = "Torneo completo.";
        }
        await renderIscrizioni(currentTorneo);
        return;
      }
      var ins = await CVI.supabase.from("torneo_iscrizioni").insert({
        torneo_id: currentTorneo.id,
        user_id: currentUserId
      });
      if (ins.error) throw ins.error;
      if (msgEl) {
        msgEl.style.color = "#34d399";
        msgEl.textContent = "Iscrizione confermata!";
      }
      await loadIscrizioni(currentTorneo.id);
      await renderIscrizioni(currentTorneo);
    } catch (e) {
      var m = e.message || e;
      if (/duplicate|unique|23505/i.test(String(m))) m = "Sei gia iscritto.";
      if (msgEl) {
        msgEl.style.color = "#f87171";
        msgEl.textContent = "Errore: " + m;
      }
      if (/relation|does not exist|42P01/i.test(String(m))) {
        if (msgEl) msgEl.textContent = "Tabella iscrizioni mancante: esegui tornei-sql.sql su Supabase.";
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function disiscriviti() {
    if (!currentTorneo || !currentUserId) return;
    if (!confirm("Annullare la tua iscrizione a questo torneo?")) return;
    var msgEl = document.getElementById("tn-iscr-msg");
    var btn = document.getElementById("tn-disiscr-btn");
    if (btn) btn.disabled = true;
    try {
      var del = await CVI.supabase
        .from("torneo_iscrizioni")
        .delete()
        .eq("torneo_id", currentTorneo.id)
        .eq("user_id", currentUserId);
      if (del.error) throw del.error;
      if (msgEl) {
        msgEl.style.color = "#94a3b8";
        msgEl.textContent = "Iscrizione annullata.";
      }
      await loadIscrizioni(currentTorneo.id);
      await renderIscrizioni(currentTorneo);
    } catch (e) {
      if (msgEl) {
        msgEl.style.color = "#f87171";
        msgEl.textContent = "Errore: " + (e.message || e);
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wireIscrButtons() {
    var btnIn = document.getElementById("tn-iscr-btn");
    var btnOut = document.getElementById("tn-disiscr-btn");
    if (btnIn && !btnIn._wired) {
      btnIn._wired = true;
      btnIn.onclick = iscriviti;
    }
    if (btnOut && !btnOut._wired) {
      btnOut._wired = true;
      btnOut.onclick = disiscriviti;
    }
  }

  async function loadList() {
    var box = document.getElementById("tn-list");
    if (!box) return;
    box.innerHTML = '<p class="loading-text" style="color:var(--text-muted)">Caricamento...</p>';
    try {
      var r = await withTimeout(
        CVI.supabase.from("tornei").select("*").eq("pubblicato", true).neq("stato", "bozza").order("created_at", { ascending: false }),
        10000,
        "Caricamento tornei"
      );
      if (r.error) throw r.error;
      var list = r.data || [];
      if (!list.length) {
        setMsg(box, "Nessun torneo pubblicato. In Admin - Tornei spunta Pubblicato e imposta stato Aperto o In corso.");
        return;
      }

      var ids = list.map(function (t) {
        return t.id;
      });
      var iscrMap = {};
      try {
        var ir = await withTimeout(
          CVI.supabase.from("torneo_iscrizioni").select("torneo_id").in("torneo_id", ids),
          8000,
          "Conteggio iscritti"
        );
        (ir.data || []).forEach(function (row) {
          iscrMap[row.torneo_id] = (iscrMap[row.torneo_id] || 0) + 1;
        });
      } catch (e) {}

      box.innerHTML = list
        .map(function (t) {
          var st = STATI[t.stato] || t.stato;
          var dates = [];
          if (t.data_inizio) dates.push(t.data_inizio);
          if (t.data_fine) dates.push(t.data_fine);
          var ni = iscrMap[t.id] || 0;
          var max = t.max_partecipanti != null && t.max_partecipanti > 0 ? t.max_partecipanti : null;
          return (
            '<div class="tn-card" role="button" tabindex="0" aria-label="Apri torneo: ' +
            esc(t.titolo) +
            '" data-id="' +
            esc(t.id) +
            '"><h2>' +
            esc(t.titolo) +
            '</h2><div class="tn-meta"><span class="tn-badge ' +
            esc(t.stato || "") +
            '">' +
            esc(st) +
            "</span>scarti " +
            esc(String(t.scarti != null ? t.scarti : 0)) +
            (t.gare_previste ? " · " + esc(String(t.gare_previste)) + " gare previste" : "") +
            " · iscritti " +
            ni +
            (max != null ? "/" + max : "") +
            (dates.length ? " · " + esc(dates.join(" / ")) : "") +
            "</div>" +
            (t.descrizione
              ? '<p style="color:#94a3b8;font-size:.9rem;margin:.5rem 0 0">' +
                esc(String(t.descrizione).slice(0, 160)) +
                "</p>"
              : "") +
            "</div>"
          );
        })
        .join("");

      box.querySelectorAll(".tn-card").forEach(function (card) {
        var open = function () {
          var id = card.getAttribute("data-id");
          history.pushState(null, "", "tornei.html?id=" + encodeURIComponent(id));
          showDetail(id);
        };
        card.onclick = open;
        card.onkeydown = function (ev) {
          if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
            ev.preventDefault();
            open();
          }
        };
      });
    } catch (e) {
      var msg = e && (e.message || e.details || String(e));
      if (/relation|does not exist|42P01/i.test(msg || "")) {
        setMsg(box, "Tabelle tornei non create. Esegui tornei-sql.sql nel SQL Editor di Supabase.", true);
      } else {
        setMsg(box, "Errore caricamento: " + msg, true);
      }
    }
  }

  async function showDetail(id) {
    document.getElementById("tn-list-view").style.display = "none";
    document.getElementById("tn-detail-view").style.display = "block";
    var rankBox = document.getElementById("tn-rank-box");
    rankBox.innerHTML = '<p class="loading-text" style="color:var(--text-muted)">Calcolo classifica...</p>';
    wireIscrButtons();

    try {
      var tr = await withTimeout(
        CVI.supabase.from("tornei").select("*").eq("id", id).maybeSingle(),
        10000,
        "Dettaglio torneo"
      );
      if (tr.error) throw tr.error;
      var t = tr.data;
      if (!t) {
        setMsg(rankBox, "Torneo non trovato.", true);
        return;
      }
      currentTorneo = t;

      document.getElementById("tn-detail-title").textContent = t.titolo || "Torneo";
      var st = STATI[t.stato] || t.stato;
      var meta = st + " · scarti " + (t.scarti != null ? t.scarti : 0);
      if (t.gare_previste) meta += " · " + t.gare_previste + " gare previste";
      if (t.max_partecipanti) meta += " · max " + t.max_partecipanti + " partecipanti";
      if (t.data_inizio || t.data_fine)
        meta += " · " + [t.data_inizio, t.data_fine].filter(Boolean).join(" / ");
      document.getElementById("tn-detail-meta").textContent = meta;
      document.getElementById("tn-detail-desc").textContent = t.descrizione || "";

      try {
        await loadIscrizioni(t.id);
        await renderIscrizioni(t);
      } catch (ie) {
        var ce = document.getElementById("tn-iscr-count");
        if (ce) ce.textContent = "Iscritti: —";
        var me = document.getElementById("tn-iscr-msg");
        if (me) {
          me.style.color = "#f87171";
          me.textContent = "Iscrizioni non disponibili. Esegui tornei-sql.sql su Supabase se manca la tabella.";
        }
      }

      var links = await withTimeout(
        CVI.supabase
          .from("torneo_gare")
          .select("gara_id,ordine")
          .eq("torneo_id", id)
          .order("ordine", { ascending: true }),
        8000,
        "Gare torneo"
      );
      if (links.error) throw links.error;
      var garaIds = (links.data || []).map(function (l) {
        return l.gara_id;
      });

      var gareList = document.getElementById("tn-detail-gare");
      if (!garaIds.length) {
        gareList.innerHTML = "<li>Nessuna gara collegata.</li>";
        setMsg(rankBox, "Collega le gare dal pannello Admin - Tornei per generare la classifica.");
        return;
      }

      var gr = await withTimeout(
        CVI.supabase.from("gare").select("id,titolo,data_gara").in("id", garaIds),
        8000,
        "Dati gare"
      );
      if (gr.error) throw gr.error;
      var gareMap = {};
      (gr.data || []).forEach(function (g) {
        gareMap[g.id] = g;
      });
      gareList.innerHTML = garaIds
        .map(function (gid, i) {
          var g = gareMap[gid];
          var label = g ? g.titolo : gid;
          var d = g && g.data_gara ? String(g.data_gara).slice(0, 10) : "";
          return "<li><strong>" + (i + 1) + ".</strong> " + esc(label) + (d ? " · " + esc(d) : "") + "</li>";
        })
        .join("");

      var ris = await withTimeout(
        CVI.supabase.from("risultati_gara").select("user_id,punti,gara_id,regata_num").in("gara_id", garaIds),
        10000,
        "Risultati"
      );
      if (ris.error) throw ris.error;
      var risultati = ris.data || [];

      var scarti = t.scarti != null ? Number(t.scarti) : 0;
      document.getElementById("tn-rank-hint").textContent =
        "Low Point · " + risultati.length + " risultati · scarti: " + scarti;

      var ranked = calcRanking(risultati, scarti);
      if (!ranked.length) {
        setMsg(rankBox, "Ancora nessun risultato nelle gare del torneo.");
        return;
      }

      var uids = ranked.map(function (r) {
        return r.user_id;
      });
      var pr = await withTimeout(
        CVI.supabase.from("profiles").select("id,nickname,team,nome").in("id", uids),
        8000,
        "Profili classifica"
      );
      var pmap = {};
      (pr.data || []).forEach(function (p) {
        pmap[p.id] = p;
      });

      var html =
        '<table class="tn-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Prove</th><th>Punti</th></tr></thead><tbody>';
      ranked.forEach(function (r) {
        var p = pmap[r.user_id] || {};
        var nick = p.nickname || String(r.user_id).slice(0, 8);
        html +=
          '<tr><td class="pos">' +
          r.posizione +
          "</td><td>" +
          esc(nick) +
          "</td><td>" +
          esc(p.team || "-") +
          "</td><td>" +
          r.prove +
          '</td><td class="pts">' +
          r.punti_totali +
          "</td></tr>";
      });
      html += "</tbody></table>";
      rankBox.innerHTML = html;
    } catch (e) {
      setMsg(rankBox, "Errore: " + (e.message || e), true);
    }
  }

  async function boot() {
    var box = document.getElementById("tn-list");
    // safety: se dopo 12s ancora loading, messaggio
    setTimeout(function () {
      if (box && /Caricamento/i.test(box.textContent || "")) {
        setMsg(
          box,
          "Il caricamento sta impiegando troppo. Controlla di aver eseguito tornei-sql.sql su Supabase e ricarica.",
          true
        );
      }
    }, 12000);

    var ok = await waitCVI();
    if (!ok || !window.CVI || !CVI.supabase) {
      setMsg(box, "Connessione Supabase non disponibile. Ricarica la pagina.", true);
      return;
    }
    wireIscrButtons();
    var id = qs("id");
    if (id) showDetail(id);
    else loadList();

    window.addEventListener("popstate", function () {
      var id2 = qs("id");
      if (id2) showDetail(id2);
      else {
        document.getElementById("tn-detail-view").style.display = "none";
        document.getElementById("tn-list-view").style.display = "block";
        loadList();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
