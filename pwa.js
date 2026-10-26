/* CVI Virtual – PWA: registrazione service worker, prompt di installazione,
   aggiornamento della cache e stato offline. Nessuna dipendenza esterna. */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var STACK_ID = 'cvi-pwa-stack';
  var DISMISS_KEY = 'cvi_pwa_install_dismissed';
  var DISMISS_DAYS = 14;
  var isPrivate = /\/(admin|accedi|unisciti|profilo|messaggi)\.html$/.test(window.location.pathname);
  var deferredPrompt = null;
  var updateRequested = false;
  var registration = null;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }

  function recentlyDismissed() {
    try {
      var ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      return ts && (Date.now() - ts) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }

  function dismissInstall() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('cvi-pwa-styles')) return;
    var style = document.createElement('style');
    style.id = 'cvi-pwa-styles';
    style.textContent = [
      '.cvi-pwa-stack{position:fixed;left:1rem;bottom:1rem;z-index:9500;display:flex;flex-direction:column;gap:.6rem;width:min(360px,calc(100vw - 2rem));pointer-events:none}',
      '.cvi-pwa-card{pointer-events:auto;display:flex;align-items:flex-start;gap:.75rem;padding:.9rem 1rem;border:1px solid rgba(56,189,248,.38);border-radius:12px;background:#111827;color:#e2e8f0;box-shadow:0 18px 40px rgba(0,0,0,.45);font-family:inherit;font-size:.88rem;line-height:1.45;animation:cviPwaIn .22s ease-out}',
      '@keyframes cviPwaIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '.cvi-pwa-copy{flex:1 1 auto;min-width:0}',
      '.cvi-pwa-copy strong{display:block;color:#fff;font-size:.92rem;margin-bottom:.15rem}',
      '.cvi-pwa-copy span{display:block;color:#a8b4c7}',
      '.cvi-pwa-actions{display:flex;align-items:center;gap:.35rem;flex:0 0 auto}',
      '.cvi-pwa-btn{min-height:38px;padding:.45rem .7rem;border:1px solid rgba(56,189,248,.5);border-radius:8px;background:#38bdf8;color:#0b0f19;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer}',
      '.cvi-pwa-btn:hover{background:#7dd3fc}',
      '.cvi-pwa-btn[disabled]{opacity:.65;cursor:progress}',
      '.cvi-pwa-close{width:34px;height:34px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:transparent;color:#a8b4c7;font:inherit;font-size:1rem;line-height:1;cursor:pointer}',
      '.cvi-pwa-close:hover{color:#fff;border-color:rgba(255,255,255,.3)}',
      '.cvi-pwa-card:focus-visible,.cvi-pwa-btn:focus-visible,.cvi-pwa-close:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}',
      '@media(max-width:640px){.cvi-pwa-stack{left:.75rem;right:.75rem;bottom:5.5rem;width:auto}.cvi-pwa-card{flex-wrap:wrap}.cvi-pwa-actions{width:100%;justify-content:flex-end}}',
      '@media(prefers-reduced-motion:reduce){.cvi-pwa-card{animation:none}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function stack() {
    injectStyles();
    if (!document.body) return null;
    var el = document.getElementById(STACK_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STACK_ID;
      el.className = 'cvi-pwa-stack';
      document.body.appendChild(el);
    }
    return el;
  }

  function removeCard(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function makeCard(id, title, text, actionLabel, onAction, dismissible, isStatus) {
    removeCard(id);
    var card = document.createElement('div');
    card.id = id;
    card.className = 'cvi-pwa-card';
    card.setAttribute('role', isStatus ? 'status' : 'region');
    if (isStatus) card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-label', title);

    var copy = document.createElement('div');
    copy.className = 'cvi-pwa-copy';
    var strong = document.createElement('strong');
    strong.textContent = title;
    var span = document.createElement('span');
    span.textContent = text;
    copy.appendChild(strong);
    copy.appendChild(span);

    var actions = document.createElement('div');
    actions.className = 'cvi-pwa-actions';
    if (actionLabel && onAction) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cvi-pwa-btn';
      btn.textContent = actionLabel;
      btn.addEventListener('click', onAction);
      actions.appendChild(btn);
    }
    if (dismissible) {
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'cvi-pwa-close';
      close.setAttribute('aria-label', 'Chiudi');
      close.textContent = '\u00d7';
      close.addEventListener('click', function () {
        removeCard(id);
        if (id === 'cvi-pwa-install' || id === 'cvi-pwa-ios') dismissInstall();
      });
      actions.appendChild(close);
    }

    card.appendChild(copy);
    card.appendChild(actions);
    var host = stack();
    if (!host) return null;
    host.appendChild(card);
    return card;
  }

  function showInstall() {
    if (isPrivate || isStandalone() || recentlyDismissed() || !deferredPrompt) return;
    makeCard(
      'cvi-pwa-install',
      'Installa CVI Virtual',
      'Accesso rapido al circolo dalla schermata Home del telefono.',
      'Installa',
      function () {
        var promptEvent = deferredPrompt;
        deferredPrompt = null;
        removeCard('cvi-pwa-install');
        if (!promptEvent) return;
        promptEvent.prompt();
        if (promptEvent.userChoice) {
          promptEvent.userChoice.then(function () { promptEvent = null; }).catch(function () {});
        }
      },
      true,
      false
    );
  }

  function showIOSHint() {
    if (isPrivate || isStandalone() || recentlyDismissed()) return;
    makeCard(
      'cvi-pwa-ios',
      'Aggiungi alla Home',
      'Su iPhone o iPad tocca Condividi, poi “Aggiungi alla Home”.',
      null,
      null,
      true,
      false
    );
  }

  function showNetwork(text, timeout) {
    makeCard('cvi-pwa-network', 'Connessione', text, null, null, false, true);
    if (timeout) {
      setTimeout(function () { removeCard('cvi-pwa-network'); }, timeout);
    }
  }
  function showUpdate(reg) {
    if (!reg || !reg.waiting || document.getElementById('cvi-pwa-update')) return;
    var card = makeCard(
      'cvi-pwa-update',
      'Nuova versione disponibile',
      'Aggiorna per usare l’ultima versione del sito.',
      'Aggiorna',
      function () {
        var btn = card && card.querySelector('.cvi-pwa-btn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Aggiornamento…';
        }
        updateRequested = true;
        if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      },
      true,
      false
    );
  }

  function watchRegistration(reg) {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
    reg.addEventListener('updatefound', function () {
      var installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdate(reg);
        }
      });
    });
    /* controllo periodico: utile per le PWA lasciate aperte a lungo */
    setInterval(function () {
      try {
        var p = reg.update();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }, 60 * 60 * 1000);
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (updateRequested) window.location.reload();
  });

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showInstall);
    } else {
      showInstall();
    }
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    removeCard('cvi-pwa-install');
    removeCard('cvi-pwa-ios');
  });

  window.addEventListener('offline', function () {
    showNetwork('Sei offline: stai usando i contenuti salvati.', 0);
  });

  window.addEventListener('online', function () {
    removeCard('cvi-pwa-network');
    showNetwork('Connessione ripristinata.', 3500);
    if (registration) {
      try {
        var p = registration.update();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
  });

  window.addEventListener('load', function () {
    if (isStandalone()) return;
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) setTimeout(showIOSHint, 2500);
    if (navigator.onLine === false) showNetwork('Sei offline: stai usando i contenuti salvati.', 0);
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './' }).then(watchRegistration).catch(function (err) {
      if (window.console) console.warn('[CVI PWA] service worker non registrato:', err && err.message);
    });
  });

  /* utile nei test e per diagnostica */
  window.CVIPWA = {
    showInstall: showInstall,
    showUpdate: showUpdate,
    showNetwork: showNetwork,
    registration: function () { return registration; },
    hasPrompt: function () { return !!deferredPrompt; }
  };


})();
