/* CVI - Live gara (versione minima) */
(function () {
  "use strict";

  var REFRESH_MS = 20000;
  var currentGaraId = null;
  var currentGara = null;
  var timer = null;
  var tickTimer = null;
  var nextAt = 0;
  var liveState = { intervalMs: REFRESH_MS, realtime: false };
  var realtimeChannel = null;
  var realtimeGaraId = null;
  var realtimeDebounce = null;
  var refreshing = false;

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
        .select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore,meteo")
        .eq("id", id)
        .maybeSingle();
      if (one.error && /meteo/i.test(one.error.message || "")) {
        one = await CVI.supabase
          .from("gare")
          .select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore")
          .eq("id", id)
          .maybeSingle();
      }
      if (one.error) throw one.error;
      return one.data;
    }
    var all = await CVI.supabase
      .from("gare")
      .select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore,meteo")
      .order("data_gara", { ascending: false })
      .limit(30);
    if (all.error && /meteo/i.test(all.error.message || "")) {
      all = await CVI.supabase
        .from("gare")
        .select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore")
        .order("data_gara", { ascending: false })
        .limit(30);
    }
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
      .from("profiles_public")
      .select("id,nickname,nome,cognome,team")
      .in("id", ids);
    if (pr.error) {
      var all = await CVI.supabase.from("profiles_public").select("id,nickname,nome,cognome,team");
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
    var meteoBtn = document.getElementById("live-meteo-btn");
    if (meteoBtn) {
      var hasMeteo = !!(window.CVIMeteo && CVIMeteo.has(gara));
      meteoBtn.style.display = hasMeteo ? "inline-flex" : "none";
      meteoBtn.onclick = function () {
        if (window.CVIMeteo) CVIMeteo.open(gara);
      };
    }
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

  function stopRealtime() {
    if (realtimeDebounce) {
      clearTimeout(realtimeDebounce);
      realtimeDebounce = null;
    }
    if (realtimeChannel && window.CVI && CVI.supabase && CVI.supabase.removeChannel) {
      try { CVI.supabase.removeChannel(realtimeChannel); } catch (e) {}
    }
    realtimeChannel = null;
    realtimeGaraId = null;
    liveState.realtime = false;
  }

  function scheduleRealtimeRefresh() {
    if (realtimeDebounce) clearTimeout(realtimeDebounce);
    realtimeDebounce = setTimeout(function () {
      realtimeDebounce = null;
      refresh();
    }, 400);
  }

  function startRealtime(garaId) {
    if (!window.CVI || !CVI.supabase || typeof CVI.supabase.channel !== "function") return;
    if (realtimeChannel && realtimeGaraId === garaId) return;
    stopRealtime();
    realtimeGaraId = garaId;
    try {
      var channel = CVI.supabase.channel("cvi-live-" + garaId);
      var onChange = function () { scheduleRealtimeRefresh(); };
      channel
        .on("postgres_changes", {
          event: "*", schema: "public", table: "risultati_gara",
          filter: "gara_id=eq." + garaId
        }, onChange)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "iscrizioni_gare",
          filter: "gara_id=eq." + garaId
        }, onChange)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "gare",
          filter: "id=eq." + garaId
        }, onChange)
        .subscribe(function (status) {
          liveState.realtime = status === "SUBSCRIBED";
          if (liveState.realtime && currentGara) {
            liveState.intervalMs = intervalForGara(currentGara);
            scheduleNext();
          }
          updateTick();
        });
      realtimeChannel = channel;
    } catch (e) {
      liveState.realtime = false;
      if (window.console) console.warn("[CVI live] realtime non disponibile:", e && e.message);
    }
  }

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      if (!window.CVI || !CVI.supabase) {
        document.getElementById("live-meta").textContent = "Database non disponibile.";
        return;
      }
      var idParam = qs("id");
      var gara = await loadGara(idParam || currentGaraId);
      if (!gara) {
        currentGara = null;
        stopRealtime();
        liveState.intervalMs = 60000;
        document.getElementById("live-content").style.display = "none";
        document.getElementById("live-empty").style.display = "block";
        document.getElementById("live-title").textContent = "Live gara";
        document.getElementById("live-meta").textContent =
          "Nessuna gara in finestra live.";
        var mb = document.getElementById("live-meteo-btn");
        if (mb) mb.style.display = "none";
        return;
      }
      currentGaraId = gara.id;
      currentGara = gara;
      document.getElementById("live-empty").style.display = "none";
      document.getElementById("live-content").style.display = "block";
      liveState.intervalMs = intervalForGara(gara);
      renderHeader(gara);
      var iscritti = await loadIscritti(gara.id);
      renderIscritti(iscritti);
      var risultati = await loadRisultati(gara.id);
      renderRisultati(risultati, iscritti);
      startRealtime(gara.id);
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
    } finally {
      refreshing = false;
      scheduleNext();
    }
  }

  function intervalForGara(gara) {
    if (!gara) return 60000;
    if (liveState.realtime) return 60000;
    var k = statoGara(gara).key;
    if (k === "corso") return 5000;
    if (k === "chiuse" || k === "aperte") return 15000;
    return 60000;
  }

  function updateTick() {
    var el = document.getElementById("live-tick");
    if (!el) return;
    var ogni = Math.round(liveState.intervalMs / 1000);
    var secs = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
    if (liveState.realtime) {
      el.textContent = "Aggiornamento in tempo reale · fallback ogni " + ogni + "s";
      return;
    }
    el.textContent = "Aggiornamento automatico ogni " + ogni + "s · prossimo tra " + secs + "s";
  }

  function scheduleNext() {
    if (timer) clearTimeout(timer);
    nextAt = Date.now() + liveState.intervalMs;
    timer = setTimeout(function () {
      if (document.hidden) { scheduleNext(); return; }
      refresh();
    }, liveState.intervalMs);
    updateTick();
  }

  function startTick() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      if (document.hidden) return;
      updateTick();
    }, 1000);
  }

  function start() {
    if (window.CVI && CVI.init) CVI.init("live.html");
    var btn = document.getElementById("live-refresh-btn");
    if (btn && !btn._wired) {
      btn._wired = true;
      btn.onclick = function () { refresh(); };
    }
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refresh();
    });
    window.addEventListener("pagehide", stopRealtime);
    startTick();
    refresh();
  }

  window.CVILive = {
    refresh: refresh,
    isRealtime: function () { return liveState.realtime; },
    realtimeGaraId: function () { return realtimeGaraId; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(start, 200);
    });
  } else {
    setTimeout(start, 200);
  }
})();
