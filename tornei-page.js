/* CVI - pagina pubblica Tornei + iscrizioni */
(function () {
  "use strict";

  var STATI = { bozza: "Bozza", aperto: "Aperto", in_corso: "In corso", chiuso: "Chiuso" };
  var currentTorneo = null;
  var currentUserId = null;
  var iscrizioniCache = [];
  var lastProfilesMap = null;

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
          CVI.supabase.from("profiles_public").select("id,nickname,team").in("id", uids),
          8000,
          "Profili"
        );
        var pmap = {};
        (pr.data || []).forEach(function (p) {
          pmap[p.id] = p;
        });
        lastProfilesMap = pmap;
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
      if (window.CVIDiscord && CVIDiscord.notifyTorneoIscrizione) {
        var me = lastProfilesMap && lastProfilesMap[currentUserId];
        var lbl = me
          ? me.nickname || [me.nome, me.cognome].filter(Boolean).join(" ")
          : "";
        try {
          await CVIDiscord.notifyTorneoIscrizione(
            { id: currentTorneo.id, titolo: currentTorneo.titolo, max_partecipanti: currentTorneo.max_partecipanti },
            lbl
          );
        } catch (e) { console.warn(e); }
      }
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

  async function renderPassword(t) {
    var el = document.getElementById("tn-detail-password");
    if (!el) return;
    el.style.display = "none";
    el.textContent = "";
    try {
      var uid = await getSessionUserId();
      if (!uid) return;
      var r = await withTimeout(
        CVI.supabase
          .from("torneo_password")
          .select("password")
          .eq("torneo_id", t.id)
          .maybeSingle(),
        8000,
        "Password torneo"
      );
      if (r.error || !r.data || !r.data.password) return;
      var pwd = String(r.data.password).trim();
      if (!pwd) return;
      el.innerHTML =
        '🔑 Password server: <code style="color:#7dd3fc;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">' +
        esc(pwd) +
        "</code>";
      el.style.display = "block";
    } catch (e) {
      // Tabella non ancora creata (tornei-password-sql.sql): nessun errore visibile.
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

  /* ---------- Classifica regate VSK (log Virtual Skipper) ---------- */
  async function renderVsk(t) {
    var box = document.getElementById("tn-vsk-box");
    if (!box) return;
    var L = window.CVISerieAperte;
    if (!L) {
      box.style.display = "none";
      return;
    }
    try {
      var rr = await withTimeout(
        CVI.supabase
          .from("torneo_regate")
          .select("id,titolo,data_regata,ordine")
          .eq("torneo_id", t.id)
          .order("ordine")
          .order("data_regata", { ascending: true, nullsFirst: false }),
        8000,
        "Regate VSK"
      );
      if (rr.error) {
        box.style.display = "none";
        return;
      }
      var regs = rr.data || [];
      if (!regs.length) {
        box.style.display = "none";
        return;
      }
      var ids = regs.map(function (r) {
        return r.id;
      });
      var rs = await withTimeout(
        CVI.supabase.from("torneo_risultati").select("*").in("regata_id", ids),
        10000,
        "Risultati VSK"
      );
      if (rs.error) throw rs.error;

      var byReg = {};
      (rs.data || []).forEach(function (r) {
        var k = String(r.regata_id);
        if (!byReg[k]) byReg[k] = [];
        byReg[k].push(r);
      });

      var sistema =
        t.vsk_sistema_punteggio === "high_point" ? "high_point" : "low_point";
      var scartiAuto = !!t.vsk_scarti_auto;
      var scarti = t.vsk_scarti != null ? Number(t.vsk_scarti) : 0;

      var forCl = regs.map(function (reg) {
        return {
          id: reg.id,
          titolo: reg.titolo,
          results: L.calcPuntiRegata(byReg[String(reg.id)] || [], sistema)
        };
      });
      var cl = L.calcClassificaSerie(forCl, scarti, {
        sistema: sistema,
        scartiAuto: scartiAuto
      });
      if (!cl.length) {
        box.style.display = "none";
        return;
      }
      var scartiN = cl[0].scartiUsati || 0;

      var html =
        '<h2 style="margin:1.5rem 0 .5rem;font-size:1.1rem;color:#7dd3fc">Classifica regate VSK</h2>' +
        '<p class="tn-meta" style="margin-bottom:.5rem">' +
        (sistema === "high_point" ? "High Point" : "Low Point") +
        " · " +
        regs.length +
        " regate · scarti: " +
        scartiN +
        (scartiAuto ? " (automatici)" : "") +
        " · " +
        cl.length +
        " skipper</p>" +
        '<div style="overflow-x:auto"><table class="tn-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th>';
      regs.forEach(function (_, i) {
        html += "<th>R" + (i + 1) + "</th>";
      });
      html += "<th>Totali</th><th>Netti</th></tr></thead><tbody>";
      cl.forEach(function (r, i) {
        html +=
          '<tr><td class="pos">' +
          (i + 1) +
          "</td><td>" +
          esc(r.nickname) +
          "</td><td>" +
          esc(r.team || "-") +
          "</td>";
        (r.punti || []).forEach(function (p, idx) {
          var disc = (r.scartiIdx || []).indexOf(idx) !== -1;
          html += disc
            ? '<td style="color:#f87171;text-decoration:line-through" title="Scartato">' +
              p +
              "</td>"
            : "<td>" + p + "</td>";
        });
        html +=
          "<td>" + r.totali + '</td><td class="pts">' + r.netti + "</td></tr>";
      });
      html += "</tbody></table></div>";

      html +=
        '<div style="margin-top:1rem"><h3 style="margin:0 0 .6rem;color:#94a3b8;font-size:.95rem;text-transform:uppercase;letter-spacing:.04em">Dettaglio regate VSK</h3>';
      regs.forEach(function (reg, rIdx) {
        var rows = (forCl[rIdx].results || []).slice();
        rows.sort(function (a, b) {
          if (a.stato === "FIN" && b.stato === "FIN")
            return (a.posizione || 99) - (b.posizione || 99);
          if (a.stato === "FIN") return -1;
          if (b.stato === "FIN") return 1;
          return String(a.nickname).localeCompare(String(b.nickname), "it");
        });
        var winner = null;
        rows.forEach(function (r) {
          if (r.tempo_ms && (winner == null || r.tempo_ms < winner))
            winner = r.tempo_ms;
        });
        var list = rows.length
          ? '<ol style="margin:.5rem 0 0;padding-left:1.2rem;color:#e2e8f0;font-size:.9rem;line-height:1.55">' +
            rows
              .map(function (r) {
                var tempo = "";
                if (r.tempo_ms) {
                  tempo = L.formatMs(r.tempo_ms);
                  if (winner && r.tempo_ms > winner)
                    tempo +=
                      " (+" + ((r.tempo_ms - winner) / 1000).toFixed(1) + "s)";
                }
                return (
                  "<li>" +
                  (r.stato !== "FIN"
                    ? '<span style="color:#f87171;font-weight:700">' +
                      esc(r.stato) +
                      "</span> "
                    : "") +
                  (r.stato === "FIN" && r.posizione
                    ? "<strong>" + esc(r.posizione) + "°</strong> "
                    : "") +
                  esc(r.nickname) +
                  (r.team ? " (" + esc(r.team) + ")" : "") +
                  (tempo
                    ? ' <span style="color:#64748b;font-family:ui-monospace,monospace;font-size:.82rem">' +
                      esc(tempo) +
                      "</span>"
                    : "") +
                  ' <span style="color:#94a3b8">(' +
                  r.punti +
                  " pt)</span></li>"
                );
              })
              .join("") +
            "</ol>"
          : '<p style="color:#64748b;margin:.4rem 0 0;font-size:.88rem">Risultati non ancora inseriti</p>';

        html +=
          '<div style="background:rgba(15,23,42,.5);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:.85rem 1rem;margin-bottom:.65rem">' +
          '<div style="font-weight:700;color:#fff">' +
          esc(reg.titolo) +
          "</div>" +
          (reg.data_regata
            ? '<div style="color:#94a3b8;font-size:.82rem;margin-top:.15rem">📅 ' +
              esc(String(reg.data_regata).slice(0, 10)) +
              "</div>"
            : "") +
          list +
          "</div>";
      });
      html += "</div>";

      box.innerHTML = html;
      box.style.display = "block";
    } catch (e) {
      box.style.display = "none";
      if (window.console) console.warn("[CVI tornei vsk]", e);
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
      await renderPassword(t);
      try {
        await renderVsk(t);
      } catch (ve) {}

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
        CVI.supabase.from("profiles_public").select("id,nickname,team,nome").in("id", uids),
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
