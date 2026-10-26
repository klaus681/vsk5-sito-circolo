/* CVI Virtual – accessibilità condivisa:
   - focus trap e background inert per qualsiasi [role="dialog"] visibile
   - ripristino del focus alla chiusura
   - role="status" / aria-live sui contenitori di messaggi asincroni
   Nessuna dipendenza da CVI: funziona anche sulle pagine di errore. */
(function () {
  'use strict';

  var current = null;
  var lastFocus = null;
  var inerted = [];
  var previousOverflow = null;
  var scheduled = false;

  function isVisible(el) {
    if (!el || !el.isConnected || el.hidden) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    var cs = window.getComputedStyle(el);
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') return false;
    return el.getClientRects().length > 0;
  }

  function visibleDialog() {
    var nodes = document.querySelectorAll('[role="dialog"]');
    for (var i = 0; i < nodes.length; i++) {
      if (isVisible(nodes[i])) return nodes[i];
    }
    return null;
  }

  function focusables(root) {
    var selector = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
      'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),' +
      '[contenteditable="true"]';
    return Array.prototype.filter.call(root.querySelectorAll(selector), function (el) {
      return isVisible(el) && !el.closest('[inert]');
    });
  }

  function lockBackground(dialog) {
    var node = dialog;
    while (node && node !== document.body && node.parentElement) {
      var parent = node.parentElement;
      Array.prototype.forEach.call(parent.children, function (child) {
        if (child === node) return;
        var tag = (child.tagName || '').toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta') return;
        if (!child.hasAttribute('inert')) {
          child.setAttribute('inert', '');
          inerted.push(child);
        }
      });
      node = parent;
    }
  }

  function unlockBackground() {
    inerted.forEach(function (el) {
      if (el && el.isConnected) el.removeAttribute('inert');
    });
    inerted = [];
  }

  function focusFirst(dialog) {
    if (dialog.contains(document.activeElement)) return;
    var list = focusables(dialog);
    var target = list.length ? list[0] : dialog;
    try {
      target.focus({ preventScroll: true });
    } catch (e) {
      try { target.focus(); } catch (e2) {}
    }
  }

  function activate(dialog) {
    if (current === dialog) return;
    if (current) deactivate();
    current = dialog;
    lastFocus = dialog.contains(document.activeElement) ? null : document.activeElement;

    lockBackground(dialog);

    if (previousOverflow === null) {
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }
    if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
    setTimeout(function () { if (current === dialog) focusFirst(dialog); }, 0);
  }

  function deactivate() {
    unlockBackground();
    if (previousOverflow !== null) {
      document.documentElement.style.overflow = previousOverflow;
      previousOverflow = null;
    }
    var back = lastFocus;
    lastFocus = null;
    current = null;
    if (back && back.isConnected) {
      setTimeout(function () {
        try { back.focus({ preventScroll: true }); } catch (e) {}
      }, 0);
    }
  }

  function sync() {
    var dialog = visibleDialog();
    if (dialog && dialog !== current) activate(dialog);
    else if (!dialog && current) deactivate();
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      sync();
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && current) {
      var close = current.querySelector(
        '#cal-modal-close,.rs-modal-close,.cvi-modal-close,.cvi-meteo-close,[data-modal-close]'
      );
      if (close) {
        event.preventDefault();
        close.click();
      }
      return;
    }
    if (!current || event.key !== 'Tab') return;
    var list = focusables(current);
    if (!list.length) {
      event.preventDefault();
      try { current.focus(); } catch (e) {}
      return;
    }
    var first = list[0];
    var last = list[list.length - 1];
    var active = document.activeElement;

    if (!current.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (event.shiftKey && (active === first || active === current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('focusin', function (event) {
    if (!current || current.contains(event.target)) return;
    var list = focusables(current);
    var target = list.length ? list[0] : current;
    try { target.focus({ preventScroll: true }); } catch (e) {}
  });

  function enhanceLiveRegions() {
    var nodes = document.querySelectorAll('.auth-msg,.cvi-modal-status,[id$="-msg"],[id$="-status"]');
    Array.prototype.forEach.call(nodes, function (el) {
      var tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (!el.hasAttribute('role')) el.setAttribute('role', 'status');
      if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
      if (!el.hasAttribute('aria-atomic')) el.setAttribute('aria-atomic', 'true');
    });
  }

  function init() {
    enhanceLiveRegions();
    sync();
    var observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* diagnostica / test */
  window.CVIA11y = {
    sync: sync,
    currentDialog: function () { return current; },
    focusables: focusables
  };
})();
