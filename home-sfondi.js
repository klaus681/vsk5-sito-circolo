/* CVI - applica sfondi home da site_settings */
(function () {
  "use strict";

  var DEFAULTS = {
    home_bg_hero:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1400&q=70",
    home_bg_next_race:
      "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1000&q=70",
    home_bg_torneo: ""
  };

  function waitCVI() {
    return new Promise(function (resolve) {
      var n = 0;
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (++n > 80) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
  }

  function isHome() {
    var path = (location.pathname || "").split("/").pop() || "";
    return !path || path === "index.html" || path === "/";
  }

  function applyHero(url) {
    var el = document.querySelector(".hero-wrap");
    if (!el) return;
    var u = url || DEFAULTS.home_bg_hero;
    el.style.background =
      "linear-gradient(180deg, rgba(11, 15, 25, 0.5) 0%, rgba(11, 15, 25, 0.72) 55%, #0b0f19 100%), " +
      'url("' +
      u.replace(/"/g, "") +
      '") center/cover no-repeat';
    el.style.backgroundColor = "#0b0f19";
  }

  function applyNextRace(url) {
    var el = document.getElementById("next-regata-card");
    if (!el) return;
    var u = url || DEFAULTS.home_bg_next_race;
    el.style.backgroundImage =
      "linear-gradient(135deg, rgba(11, 15, 25, 0.55) 0%, rgba(15, 40, 70, 0.45) 40%, rgba(11, 15, 25, 0.75) 100%), " +
      'url("' +
      u.replace(/"/g, "") +
      '")';
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  }

  function applyTorneo(url) {
    window.__CVI_BG_TORNEO = url || "";
    var el = document.getElementById("home-torneo-banner");
    if (!el) return;
    if (url) {
      el.style.backgroundImage =
        "linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,58,95,0.75)), " +
        'url("' +
        url.replace(/"/g, "") +
        '")';
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }
  }

  async function loadAndApply() {
    if (!isHome()) return;
    var ok = await waitCVI();
    if (!ok) return;
    try {
      var res = await CVI.supabase
        .from("site_settings")
        .select("key,value")
        .in("key", ["home_bg_hero", "home_bg_next_race", "home_bg_torneo"]);
      if (res.error) throw res.error;
      var map = {};
      (res.data || []).forEach(function (r) {
        map[r.key] = r.value;
      });
      applyHero(map.home_bg_hero || "");
      applyNextRace(map.home_bg_next_race || "");
      applyTorneo(map.home_bg_torneo || "");
      // se il banner torneo arriva dopo, riapplica
      setTimeout(function () {
        applyTorneo(map.home_bg_torneo || "");
      }, 2500);
    } catch (e) {
      console.warn("[CVI home-sfondi]", e);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadAndApply);
  else loadAndApply();
  setTimeout(loadAndApply, 1800);
})();
