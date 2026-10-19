/* CVI - voce "Messaggi" nel menu + badge non letti */
(function () {
  "use strict";

  var LABELS = {
    it: "Messaggi",
    en: "Messages",
    fr: "Messages",
    es: "Mensajes"
  };
  var UNREAD = {
    it: "messaggi non letti",
    en: "unread messages",
    fr: "messages non lus",
    es: "mensajes sin leer"
  };

  var currentUserId = null;
  var unreadCount = 0;
  var timer = null;

  function lang() {
    return (window.CVI && CVI.currentLang) || "it";
  }

  function label() {
    return LABELS[lang()] || LABELS.it;
  }

  function unreadLabel() {
    return UNREAD[lang()] || UNREAD.it;
  }

  function ensureStyle() {
    if (document.getElementById("cvi-msg-nav-css")) return;
    var style = document.createElement("style");
    style.id = "cvi-msg-nav-css";
    style.textContent =
      ".nav-msg-link{display:inline-flex !important;align-items:center;gap:.3rem;position:relative}" +
      ".nav-msg-link-mobile{display:inline-flex;align-items:center;gap:.35rem}" +
      ".nav-msg-badge{display:inline-flex;align-items:center;justify-content:center;" +
      "min-width:1.15rem;height:1.15rem;padding:0 .3rem;border-radius:999px;" +
      "background:#ef4444;color:#fff;font-size:.65rem;font-weight:800;line-height:1;" +
      "box-shadow:0 2px 6px rgba(239,68,68,.4)}" +
      ".nav-msg-badge[hidden]{display:none}" +
      ".nav-msg-link.has-unread .nav-msg-icon{filter:drop-shadow(0 0 6px rgba(239,68,68,.7))}";
    document.head.appendChild(style);
  }

  function refreshLinkLabels() {
    document.querySelectorAll(".nav-msg-label").forEach(function (el) {
      el.textContent = label();
    });
    var text = label() + (unreadCount > 0 ? " (" + unreadCount + " " + unreadLabel() + ")" : "");
    document.querySelectorAll("a.nav-msg-link, a.nav-msg-link-mobile").forEach(function (a) {
      a.setAttribute("aria-label", text);
      a.title = text;
    });
  }

  function setBadge(count) {
    unreadCount = Math.max(0, Number(count) || 0);
    document.querySelectorAll(".nav-msg-badge").forEach(function (el) {
      el.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      el.hidden = unreadCount <= 0;
    });
    document.querySelectorAll("a.nav-msg-link, a.nav-msg-link-mobile").forEach(function (a) {
      a.classList.toggle("has-unread", unreadCount > 0);
    });
    refreshLinkLabels();
  }

  function markActive() {
    var onPage = /messaggi\.html/i.test(location.pathname);
    document.querySelectorAll("a.nav-msg-link, a.nav-msg-link-mobile").forEach(function (a) {
      a.classList.toggle("active", onPage);
    });
  }

  function ensureLinks() {
    var desktop = document.querySelector("nav.nav-desktop ul");
    if (desktop && !desktop.querySelector('a[href="messaggi.html"]')) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = "messaggi.html";
      link.className = "nav-msg-link";
      link.innerHTML = '<span class="nav-msg-icon" aria-hidden="true">✉️</span>' +
        '<span class="nav-msg-label"></span>' +
        '<span class="nav-msg-badge" hidden></span>';
      li.appendChild(link);

      var contatti = desktop.querySelector('a[href="contatti.html"]');
      if (contatti && contatti.parentElement && contatti.parentElement.tagName === "LI") {
        contatti.parentElement.insertAdjacentElement("beforebegin", li);
      } else {
        desktop.appendChild(li);
      }
    }

    var mobile = document.getElementById("navMobile");
    if (mobile && !mobile.querySelector('a[href="messaggi.html"]')) {
      var mobileLink = document.createElement("a");
      mobileLink.href = "messaggi.html";
      mobileLink.className = "nav-msg-link-mobile";
      mobileLink.innerHTML = '<span class="nav-msg-icon" aria-hidden="true">✉️</span>' +
        '<span class="nav-msg-label"></span>' +
        '<span class="nav-msg-badge" hidden></span>';

      var auth = mobile.querySelector("#auth-link-mobile") ||
        mobile.querySelector('a[href="accedi.html"]');
      if (auth) auth.insertAdjacentElement("beforebegin", mobileLink);
      else mobile.appendChild(mobileLink);
    }

    refreshLinkLabels();
    markActive();
  }

  async function refreshBadge() {
    if (!currentUserId || !window.CVI || !CVI.supabase) return;
    try {
      var res = await CVI.supabase
        .from("member_messages")
        .select("id")
        .eq("recipient_id", currentUserId)
        .is("read_at", null);
      if (res.error) {
        setBadge(0);
        return;
      }
      setBadge((res.data || []).length);
    } catch (e) {
      setBadge(0);
    }
  }

  window.CVIrefreshMessagesBadge = refreshBadge;

  function waitForCVI(maxMs) {
    return new Promise(function (resolve) {
      var started = Date.now();
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (Date.now() - started > (maxMs || 8000)) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
  }

  async function boot() {
    ensureStyle();
    var ready = await waitForCVI(8000);
    if (!ready) return;

    var res = await CVI.supabase.auth.getSession();
    var session = res.data && res.data.session;
    if (!session || !session.user) return;

    currentUserId = session.user.id;
    ensureLinks();
    await refreshBadge();

    clearInterval(timer);
    timer = setInterval(refreshBadge, 60000);
    window.addEventListener("focus", refreshBadge);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshBadge();
    });
  }

  if (window.CVI && typeof CVI.applyI18n === "function" && !CVI.applyI18n._cviMsgNav) {
    var orig = CVI.applyI18n;
    CVI.applyI18n = function () {
      orig.apply(this, arguments);
      refreshLinkLabels();
    };
    CVI.applyI18n._cviMsgNav = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
