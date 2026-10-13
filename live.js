/* CVI - Live gara (versione minima) */
(function () {
  "use strict";

  var REFRESH_MS = 20000;
  var currentGaraId = null;
  var timer = null;

  function esc(s) {
    if (s == null) return "";
    var t = String(s);
    var a = String.fromCharCode(38);
    return t.split(a).join(a + "amp;").split("<").join(a + "lt;").split(">").join(a + "gt;").split('"').join(a + "quot;");
  }

  function qs(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function statoGara(gara) {
    if (!gara || !gara.data_gara) return { key: "none", label: "" };
    var start = new Date(gara.data_gara).getTime();
    if (isNaN(start)) return { key: "none", label: "" };
    var now = Date.now();
    var chiusuraOre = gara.chiusura_ore != null ? parseInt(gara.chiusura_ore, 10) : 2;
    if (isNaN(chiusuraOre) || chiusuraOre < 0) chiusuraOre = 2;
    var nr = Math.min(3, Math.max(1, parseInt(gara.num_regate, 10) || 1));
    var durataMs = Math.max(2, nr * 1.5) * 60 * 60 * 1000;
    if (now >= start + durataMs) return { key: "conclusa", label: "Conclusa" };
    if (now >= start) return { key: "corso", label: "In corso" };
    if (now >= start - chiusuraOre * 60 * 60 * 1000)
      return { key: "chiuse", label: "Iscrizioni chiuse" };
    return { key: "aperte", label: "Iscrizioni aperte" };
  }

  function inLiveWindow(gara) {
    if (!gara || !gara.data_gara) return false;
    var start = new Date(gara.data_gara).getTime();
    if (isNaN(start)) return false;
    var nr = Math.min(3, Math.max(1, parseInt(gara.num_regate, 10) || 1));
    var durataMs = Math.max(2, nr * 1.5) * 60 * 60 * 1000;
    var preMs = 6 * 60 * 60 * 1000;
    var postMs = 2 * 60 * 60 * 1000;
    var now = Date.now();
    return now >= start - preMs && now <= start + durataMs + postMs;
  }

  function pickLiveGara(list) {
    if (!list || !list.length) return null;
    var live = list.filter(inLiveWindow);
    if (live.length) {
      live.sort(function (a, b) {
        return new Date(a.data_gara) - new Date(b.data_gara);
      });
      var corso = live.filter(function (g) {
        return statoGara(g).key === "corso";
      });
      if (corso.length) return corso[0];
      return live[0];
    }
    var now = Date.now();
    var soon = list
      .filter(function (g) {
        var t = new Date(g.data_gara).getTime();
        return t >= now && t - now <= 24 * 60 * 60 * 1000;
      })
      .sort(function (a, b) {
        return new Date(a.data_gara) - new Date(b.data_gara);
      });
    return soon[0] || null;
  }

  function profileLabel(p) {
    if (!p) return "?";
    return (p.nickname || [p.nome, p.cognome].filter(Boolean).join(" ") || String(p.id).slice(0, 8)).trim();
  }

  async function loadGara(id) {
    if (!window.CVI || !CVI.supabase) return null;
    if (id) {
      var one = await CVI.supabase
        .from("gare")
        .select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore")
        .eq("id", id)
        .maybeSingle();
      if (one.error) throw one.error;
      return one.data;
    }
    var all = await CVI.supabase
      .from("gare")
      .select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore")
      .order("data_gara", { ascending: false })
      .limit(30);
    if (all.error) throw all.error;
    return pickLiveGara(all.data || []);
  }

  async function loadIscritti(garaId) {
    var iscr = await CVI.supabase
      .from("iscrizioni_gare")
      .select("user_id")
      .eq("gara_id", garaId);
    if (iscr.error) throw iscr.error;
    var ids = (iscr.data || []).map(function (r) {
      return r.user_id;
    });
    if (!ids.length) return [];
    var pr = await CVI.supabase
      .from("profiles")
      .select("id,nickname,nome,cognome,team")
      .in("id", ids);
    if (pr.error) {
      var all = await CVI.supabase.from("profiles").select("id,nickname,nome,cognome,team");
      var by = {};
      (all.data || []).forEach(function (p) {
        by[String(p.id)] = p;
      });
      return ids.map(function (id) {
        return by[String(id)] || { id: id, nickname: String(id).slice(0, 8) };
      });
    }
    var list = pr.data || [];
    list.sort(function (a, b) {
      return profileLabel(a).localeCompare(profileLabel(b), "it");
    });
    return list;
  }

  async function loadRisultati(garaId) {
    var r = await CVI.supabase.from("risultati_gara").select("*").eq("gara_id", garaId);
    if (r.error) return [];
    return r.data || [];
  }

  function renderRisultati(rows, profiles) {
    var wrap = document.getElementById("live-risultati-wrap");
    if (!rows.length) {
      wrap.innerHTML =
        '<p class="live-empty" id="live-risultati-empty">Ancora nessun risultato pubblicato.</p>';
      return;
    }
    var byUser = {};
    rows.forEach(function (row) {
      var uid = String(row.user_id);
      if (!byUser[uid]) byUser[uid] = { user_id: uid, punti: 0, n: 0 };
      var pt = row.punti != null ? Number(row.punti) : null;
      if (pt != null && !isNaN(pt)) {
        byUser[uid].punti += pt;
        byUser[uid].n += 1;
      }
    });
    var profBy = {};
    (profiles || []).forEach(function (p) {
      profBy[String(p.id)] = p;
    });
    var ranking = Object.keys(byUser).map(function (k) {
      return byUser[k];
    });
    ranking.sort(function (a, b) {
      if (a.punti !== b.punti) return a.punti - b.punti;
      return a.n - b.n;
    });
    var html =
      '<table class="live-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Punti</th></tr></thead><tbody>';
    ranking.forEach(function (r, i) {
      var p = profBy[r.user_id] || {};
      html +=
        '<tr><td class="pos">' +
        (i + 1) +
        "</td><td>" +
        esc(profileLabel(p) || r.user_id.slice(0, 8)) +
        "</td><td>" +
        esc(p.team || "—") +
        "</td><td>" +
        esc(String(r.punti)) +
        "</td></tr>";
    });
    html += "</tbody></table>";
    wrap.innerHTML = html;
  }

  function renderHeader(gara) {
    var st = statoGara(gara);
    var badges = document.getElementById("live-badges");
    badges.innerHTML =
      '<span class="live-badge vs">Virtual Skipper</span>' +
      (st.label
        ? '<span class="live-badge ' + st.key + '">' + esc(st.label) + "</span>"
        : "");
    document.getElementById("live-title").textContent = gara.titolo || "Gara";
    var dataFmt = gara.data_gara
      ? new Date(gara.data_gara).toLocaleString("it-IT", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "—";
    var nr = Math.min(3, Math.max(1, parseInt(gara.num_regate, 10) || 1));
    document.getElementById("live-meta").textContent =
      "📅 " + dataFmt + " · " + nr + (nr === 1 ? " regata" : " regate");
    document.getElementById("live-desc").textContent = gara.descrizione || "";
    var self = document.getElementById("live-self-link");
    if (self) self.href = "live.html?id=" + encodeURIComponent(gara.id);
  }

  function renderIscritti(list) {
    document.getElementById("live-n-iscritti").textContent = String(list.length);
    var ul = document.getElementById("live-iscritti");
    var empty = document.getElementById("live-iscritti-empty");
    if (!list.length) {
      ul.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    ul.innerHTML = list
      .map(function (p) {
        var team = p.team ? ' <span class="team">(' + esc(p.team) + ")</span>" : "";
        return "<li>" + esc(profileLabel(p)) + team + "</li>";
      })
      .join("");
  }

  async function refresh() {
    try {
      if (!window.CVI || !CVI.supabase) {
        document.getElementById("live-meta").textContent = "Database non disponibile.";
        return;
      }
      var idParam = qs("id");
      var gara = await loadGara(idParam || currentGaraId);
      if (!gara) {
        document.getElementById("live-content").style.display = "none";
        document.getElementById("live-empty").style.display = "block";
        document.getElementById("live-title").textContent = "Live gara";
        document.getElementById("live-meta").textContent =
          "Nessuna gara in finestra live.";
        return;
      }
      currentGaraId = gara.id;
      document.getElementById("live-empty").style.display = "none";
      document.getElementById("live-content").style.display = "block";
      renderHeader(gara);
      var iscritti = await loadIscritti(gara.id);
      renderIscritti(iscritti);
      var risultati = await loadRisultati(gara.id);
      renderRisultati(risultati, iscritti);
      document.getElementById("live-updated").textContent =
        "Ultimo aggiornamento: " +
        new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
    } catch (e) {
      document.getElementById("live-meta").textContent =
        "Errore: " + (e.message || e);
    }
  }

  function start() {
    if (window.CVI && CVI.init) CVI.init("live.html");
    refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(refresh, REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(start, 200);
    });
  } else {
    setTimeout(start, 200);
  }
})();
