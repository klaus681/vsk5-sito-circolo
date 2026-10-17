/* CVI - pagina pubblica Tornei */
(function () {
  "use strict";

  var STATI = {
    bozza: "Bozza",
    aperto: "Aperto",
    in_corso: "In corso",
    chiuso: "Chiuso"
  };

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
      rows.push({
        user_id: uid,
        punti_totali: total,
        prove: byUser[uid].length
      });
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

  async function loadList() {
    var box = document.getElementById("tn-list");
    if (!box) return;
    try {
      var r = await CVI.supabase
        .from("tornei")
        .select("*")
        .eq("pubblicato", true)
        .order("data_inizio", { ascending: false });
      if (r.error) throw r.error;
      var list = r.data || [];
      if (!list.length) {
        setMsg(
          box,
          "Nessun torneo pubblicato al momento. Creane uno da Admin - Tornei e spunta Pubblicato."
        );
        return;
      }
      box.innerHTML = list
        .map(function (t) {
          var st = STATI[t.stato] || t.stato;
          var dates = [];
          if (t.data_inizio) dates.push(t.data_inizio);
          if (t.data_fine) dates.push(t.data_fine);
          return (
            '<div class="tn-card" data-id="' +
            esc(t.id) +
            '">' +
            "<h2>" +
            esc(t.titolo) +
            "</h2>" +
            '<div class="tn-meta">' +
            '<span class="tn-badge ' +
            esc(t.stato || "") +
            '">' +
            esc(st) +
            "</span>" +
            "scarti " +
            esc(String(t.scarti != null ? t.scarti : 0)) +
            (t.gare_previste ? " · " + esc(String(t.gare_previste)) + " gare previste" : "") +
            (t.max_partecipanti ? " · max " + esc(String(t.max_partecipanti)) + " iscritti" : "") +
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
        card.onclick = function () {
          var id = card.getAttribute("data-id");
          history.pushState(null, "", "tornei.html?id=" + encodeURIComponent(id));
          showDetail(id);
        };
      });
    } catch (e) {
      var msg = e && (e.message || e.details || String(e));
      if (/relation|does not exist|42P01/i.test(msg || "")) {
        setMsg(
          box,
          "Tabelle tornei non ancora create. Esegui tornei-sql.sql nel SQL Editor di Supabase.",
          true
        );
      } else {
        setMsg(box, "Errore caricamento: " + msg, true);
      }
    }
  }

  async function showDetail(id) {
    document.getElementById("tn-list-view").style.display = "none";
    document.getElementById("tn-detail-view").style.display = "block";
    var rankBox = document.getElementById("tn-rank-box");
    rankBox.innerHTML =
      '<p class="loading-text" style="color:var(--text-muted)">Calcolo classifica...</p>';

    try {
      var tr = await CVI.supabase.from("tornei").select("*").eq("id", id).maybeSingle();
      if (tr.error) throw tr.error;
      var t = tr.data;
      if (!t) {
        setMsg(rankBox, "Torneo non trovato.", true);
        return;
      }

      document.getElementById("tn-detail-title").textContent = t.titolo || "Torneo";
      var st = STATI[t.stato] || t.stato;
      var meta = st + " · scarti " + (t.scarti != null ? t.scarti : 0);
      if (t.gare_previste) meta += " · " + t.gare_previste + " gare previste";
      if (t.max_partecipanti) meta += " · max " + t.max_partecipanti + " partecipanti";
      if (t.data_inizio || t.data_fine)
        meta += " · " + [t.data_inizio, t.data_fine].filter(Boolean).join(" / ");
      document.getElementById("tn-detail-meta").textContent = meta;
      document.getElementById("tn-detail-desc").textContent = t.descrizione || "";

      var links = await CVI.supabase
        .from("torneo_gare")
        .select("gara_id,ordine")
        .eq("torneo_id", id)
        .order("ordine", { ascending: true });
      if (links.error) throw links.error;
      var garaIds = (links.data || []).map(function (l) {
        return l.gara_id;
      });

      var gareList = document.getElementById("tn-detail-gare");
      if (!garaIds.length) {
        gareList.innerHTML = "<li>Nessuna gara collegata.</li>";
        setMsg(
          rankBox,
          "Collega le gare dal pannello Admin - Tornei per generare la classifica."
        );
        return;
      }

      var gr = await CVI.supabase.from("gare").select("id,titolo,data_gara").in("id", garaIds);
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
          return (
            "<li><strong>" +
            (i + 1) +
            ".</strong> " +
            esc(label) +
            (d ? " · " + esc(d) : "") +
            "</li>"
          );
        })
        .join("");

      var ris = await CVI.supabase
        .from("risultati_gara")
        .select("user_id,punti,gara_id,regata_num")
        .in("gara_id", garaIds);
      if (ris.error) throw ris.error;
      var risultati = ris.data || [];

      var scarti = t.scarti != null ? Number(t.scarti) : 0;
      document.getElementById("tn-rank-hint").textContent =
        "Low Point · " +
        risultati.length +
        " risultati · scarti: " +
        scarti +
        " (i punteggi peggiori non contano nel totale)";

      var ranked = calcRanking(risultati, scarti);
      if (!ranked.length) {
        setMsg(rankBox, "Ancora nessun risultato nelle gare del torneo.");
        return;
      }

      var uids = ranked.map(function (r) {
        return r.user_id;
      });
      var pr = await CVI.supabase.from("profiles").select("id,nickname,team,nome").in("id", uids);
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
    var ok = await waitCVI();
    var box = document.getElementById("tn-list");
    if (!ok || !window.CVI || !CVI.supabase) {
      setMsg(box, "Connessione Supabase non disponibile. Ricarica la pagina.", true);
      return;
    }
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
