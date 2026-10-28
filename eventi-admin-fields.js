/* CVI Admin – Campi estesi Eventi (loader)
   Carica la versione completa e espone CVIEventiFields per il salvataggio unificato. */
(function () {
  "use strict";
  if (window.__CVI_EV_ADMIN_FIELDS_LOADER__) return;
  window.__CVI_EV_ADMIN_FIELDS_LOADER__ = true;

  var CDN =
    "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@64f6844181e721152f0de9a85118ab69f10b9c82/eventi-admin-fields.js";

  function payloadFrom(prefix) {
    function val(id) {
      var el = document.getElementById(prefix + "-" + id);
      return el && el.value ? String(el.value).trim() : "";
    }
    function toIso(v) {
      if (!v) return null;
      var d = new Date(v);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    var maxNum = parseInt(val("max"), 10);
    return {
      formato: val("formato") || null,
      flotta: val("flotta") || null,
      procedura_partenza: val("procedura-partenza") || null,
      max_iscritti: isNaN(maxNum) || maxNum < 1 ? null : maxNum,
      iscrizioni_apertura: toIso(val("iscr-open")),
      iscrizioni_chiusura: toIso(val("iscr-close")),
      proteste_url: val("proteste") || null
    };
  }

  function afterLoad() {
    window.CVIEventiFields = {
      payloadFrom: payloadFrom,
      saveExtra: async function () { return true; },
      fillExtra: function () {},
      clearExtra: function () {}
    };
  }

  var s = document.createElement("script");
  s.src = CDN + "?v=2";
  s.onload = afterLoad;
  s.onerror = function () {
    console.warn("[CVI] eventi-admin-fields CDN fallito");
    afterLoad();
  };
  document.head.appendChild(s);
  setTimeout(afterLoad, 1500);
})();
