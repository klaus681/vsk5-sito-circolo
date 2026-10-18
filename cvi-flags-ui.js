/* CVI – mostra bandiere in classifica, membri, iscritti */
(function () {
  "use strict";

  var path = location.pathname + location.href;
  var onClass = /classifiche\.html/i.test(path);
  var onMembri = /membri\.html/i.test(path);
  var onGare = /gare\.html/i.test(path);
  var onHome = /(index\.html|\/$|\/vsk5-sito-circolo\/?$)/i.test(path);
  if (!onClass && !onMembri && !onGare && !onHome) return;

  var byNick = {};
  var byId = {};
  var loaded = false;
  var timer = null;

  function waitCVI(maxMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        if (window.CVI && CVI.supabase && CVI.flagImg) return resolve(true);
        if (Date.now() - t0 > (maxMs || 8000)) return resolve(false);
        setTimeout(tick, 40);
      })();
    });
  }

  async function loadProfiles() {
    if (!CVI.supabase) return;
    try {
      var res = await CVI.supabase
        .from("profiles")
        .select("id, nickname, nome, cognome, nazionalita");
      if (res.error) return;
      byNick = {};
      byId = {};
      (res.data || []).forEach(function (p) {
        if (p.id) byId[String(p.id)] = p;
        var nick = (p.nickname || "").trim().toLowerCase();
        if (nick) byNick[nick] = p;
        var full = [p.nome, p.cognome].filter(Boolean).join(" ").trim().toLowerCase();
        if (full) byNick[full] = p;
      });
      loaded = true;
    } catch (e) {}
  }

  function stripFlag(text) {
    return String(text || "")
      .replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, "")
      .replace(/^@/, "")
      .trim();
  }

  function applyToElement(el) {
    if (!el || el.dataset.cviFlag === "1") return;
    var raw = (el.textContent || "").trim();
    if (!raw || raw === "—" || raw === "-") return;
    var key = stripFlag(raw).toLowerCase();
    if (!key) return;
    var p = byNick[key];
    if (!p || !p.nazionalita) return;
    var flag = CVI.flagImg(p.nazionalita);
    if (!flag) return;
    el.dataset.cviFlag = "1";
    if (!el.querySelector || !el.querySelector("img.cvi-flag-img")) {
      el.innerHTML = flag + el.innerHTML;
    }
  }

  function scan() {
    if (!loaded || !CVI.flagImg) return;

    document.querySelectorAll(".nick, .rank-info strong, #home-ranking strong").forEach(applyToElement);

    if (onMembri) {
      document.querySelectorAll("#members-container table tbody tr").forEach(function (tr) {
        var tds = tr.querySelectorAll("td");
        if (tds.length >= 2) applyToElement(tds[1]);
      });
    }

    if (onGare) {
      document
        .querySelectorAll(
          ".iscritti-list li, .iscritti-list span, .iscritti-box li, .iscritti-box .nick, [class*='iscritt'] li, [class*='iscritt'] .name"
        )
        .forEach(applyToElement);
      document.querySelectorAll(".iscritti-list, .iscritti-box ul, #iscritti-list").forEach(function (box) {
        box.querySelectorAll("li, div, span").forEach(function (el) {
          if ((el.textContent || "").trim().length < 40) applyToElement(el);
        });
      });
    }
  }

  function scheduleScan() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(scan, 120);
  }

  async function boot() {
    var ok = await waitCVI(8000);
    if (!ok) return;
    await loadProfiles();
    if (!loaded) return;
    scan();
    setTimeout(scan, 600);
    setTimeout(scan, 1500);
    setTimeout(scan, 3000);
    try {
      var obs = new MutationObserver(scheduleScan);
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
