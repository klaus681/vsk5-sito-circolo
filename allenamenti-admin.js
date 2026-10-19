/* CVI Admin – Allenamenti: carica versione completa + hook Discord */
(async function () {
  "use strict";
  try {
    // Base funzionante (CRUD + generatore ricorrente)
    var baseUrl =
      "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@874b89a41903e1e5b65a95f645145f4dca08e63c/allenamenti-admin.js";
    var code = await fetch(baseUrl).then(function (r) {
      if (!r.ok) throw new Error("admin base " + r.status);
      return r.text();
    });
    var s = document.createElement("script");
    s.textContent = code;
    document.head.appendChild(s);

    // Hook Discord dopo il boot del pannello
    function patchDiscord() {
      if (!window.CVIDiscord) return;
      // Intercetta submit form se presente
      var form = document.getElementById("al-form");
      if (form && !form._discordHook) {
        form._discordHook = true;
        form.addEventListener(
          "submit",
          function () {
            var id = (document.getElementById("al-id") || {}).value || "";
            if (id) return; // solo creazione
            var pub = !!(document.getElementById("al-pub") || {}).checked;
            if (!pub) return;
            var titolo = ((document.getElementById("al-titolo") || {}).value || "").trim();
            var dl = (document.getElementById("al-data") || {}).value;
            var payload = {
              titolo: titolo,
              data_ora: dl ? new Date(dl).toISOString() : null,
              descrizione: ((document.getElementById("al-desc") || {}).value || "").trim() || null,
              classe_barca: ((document.getElementById("al-classe") || {}).value || "").trim() || null,
              max_iscritti: parseInt((document.getElementById("al-max") || {}).value, 10) || null,
              durata_minuti: parseInt((document.getElementById("al-durata") || {}).value, 10) || 90
            };
            setTimeout(function () {
              if (titolo && window.CVIDiscord.notifyAllenamento) {
                CVIDiscord.notifyAllenamento(payload).catch(function (e) {
                  console.warn(e);
                });
              }
            }, 1800);
          },
          true
        );
      }
      var genBtn = document.getElementById("al-gen-btn");
      if (genBtn && !genBtn._discordHook) {
        genBtn._discordHook = true;
        genBtn.addEventListener(
          "click",
          function () {
            setTimeout(function () {
              var st = document.getElementById("al-gen-status");
              var txt = st ? st.textContent || "" : "";
              var m = txt.match(/Creati\s+(\d+)/);
              if (m && window.CVIDiscord.notifyAllenamentiGenerati) {
                CVIDiscord.notifyAllenamentiGenerati(parseInt(m[1], 10), {}).catch(function (e) {
                  console.warn(e);
                });
              }
            }, 2500);
          },
          true
        );
      }
    }
    // Conferma prima della generazione massiva: evita di creare
    // decine di date con un click accidentale. Il listener è in capture
    // phase, quindi intercetta il click prima dell'handler del pulsante.
    function installGeneratorConfirm() {
      if (document._cviGenConfirm) return;
      document._cviGenConfirm = true;
      document.addEventListener(
        "click",
        function (e) {
          var target = e.target;
          var btn = target && target.closest ? target.closest("#al-gen-btn") : null;
          if (!btn) return;

          var days = document.querySelectorAll(".al-gen-day:checked").length;
          var weeks = parseInt((document.getElementById("al-gen-settimane") || {}).value, 10);
          if (isNaN(weeks) || weeks < 1) weeks = 8;
          if (weeks > 26) weeks = 26;
          var count = days * weeks;

          if (days > 0) {
            var msg =
              "Verranno create fino a " +
              count +
              " date (" +
              days +
              " giorni × " +
              weeks +
              " settimane).\n\nContinuare?";
            if (!window.confirm(msg)) {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
          }
        },
        true
      );
    }

    installGeneratorConfirm();
    setTimeout(patchDiscord, 1200);
    setTimeout(patchDiscord, 3000);
    setTimeout(patchDiscord, 6000);
  } catch (e) {
    console.error("[CVI allenamenti-admin]", e);
  }
})();
