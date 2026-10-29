/* CVI Admin Eventi – ripristino completo + import VSK */
(function () {
  "use strict";
  // 1) carica versione admin completa (lista, modifica, elimina)
  var ORIG =
    "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@747ca063242f040098b27ce00f7a5d0815fa8231/eventi-aperti-admin.js";
  var s = document.createElement("script");
  s.src = ORIG;
  s.onload = function () {
    // 2) dopo il carico, potenzia importEventoCsv con parser VSK se disponibile
    try {
      patchImport();
    } catch (e) {
      console.warn("[CVI eventi] patch import", e);
    }
  };
  s.onerror = function () {
    console.error("[CVI] impossibile caricare eventi-aperti-admin originale");
  };
  document.head.appendChild(s);

  function cleanNickFallback(raw) {
    if (raw == null) return "";
    var t = String(raw).replace(/\u00a0/g, " ");
    t = t.replace(/\$[0-9a-fA-F]{3}/g, "");
    t = t.replace(/\$[isngzwomt$]/g, "");
    t = t.replace(/\$[0-9a-fA-F]/g, "");
    t = t.replace(/\$./g, "");
    return t.replace(/\s+/g, " ").trim();
  }

  function patchImport() {
    // Intercetta i file CSV scelti dall'utente e usa parseVskCsv quando possibile
    function betterImport(text) {
      var L = window.CVISerieAperte;
      if (L && typeof L.looksLikeVskCsv === "function" && L.looksLikeVskCsv(text)) {
        var vsk = L.parseVskCsv(text);
        if (!vsk.length) {
          alert("Log VSK non riconosciuto.");
          return 0;
        }
        var bodyV = document.getElementById("ea-ris-body");
        if (bodyV) bodyV.innerHTML = "";
        vsk.forEach(function (p, i) {
          var nick = p.nickname || cleanNickFallback(p.nickname_raw) || "";
          var note = p.stato && p.stato !== "FIN" ? p.stato : p.tempo || "";
          if (typeof addRisRow === "function") {
            addRisRow(p.posizione != null ? p.posizione : i + 1, nick, "", note);
          } else if (bodyV) {
            var tr = document.createElement("tr");
            tr.innerHTML =
              "<td><input type=number min=1 class='adm-input ea-pos' value='" +
              (p.posizione != null ? p.posizione : i + 1) +
              "' style='width:4rem'></td>" +
              "<td><input type=text class='adm-input ea-nick' value='" +
              String(nick).replace(/\"/g, "&quot;") +
              "' style='width:100%'></td>" +
              "<td><input type=text class='adm-input ea-team' value='' style='width:100%'></td>" +
              "<td><input type=text class='adm-input ea-note' value='" +
              String(note || "").replace(/\"/g, "&quot;") +
              "' style='width:100%'></td>" +
              "<td><button type=button class='btn-danger-sm ea-rm'>×</button></td>";
            bodyV.appendChild(tr);
            tr.querySelector(".ea-rm").onclick = function () {
              tr.remove();
            };
          }
        });
        return vsk.length;
      }
      // fallback: se esiste importEventoCsv originale, usalo ma pulisci i nick dopo
      if (typeof window.__eaImportOrig === "function") {
        var n = window.__eaImportOrig(text);
        setTimeout(function () {
          document.querySelectorAll("#ea-ris-body .ea-nick").forEach(function (inp) {
            var c = cleanNickFallback(inp.value);
            if (c) inp.value = c;
          });
        }, 0);
        return n;
      }
      return 0;
    }

    // wrap importEventoCsv se esiste
    if (typeof window.importEventoCsv === "function" && !window.importEventoCsv._vsk) {
      window.__eaImportOrig = window.importEventoCsv;
      window.importEventoCsv = betterImport;
      window.importEventoCsv._vsk = true;
    }

    // patch file input handler
    var csvFile = document.getElementById("ea-csv-file");
    if (csvFile && !csvFile._vskPatched) {
      csvFile._vskPatched = true;
      csvFile.addEventListener("change", function (ev) {
        var f = this.files && this.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var n = betterImport(reader.result);
          var hint = document.getElementById("ea-csv-hint");
          if (n && hint) {
            hint.textContent =
              "Importati " + n + " skipper da «" + f.name + "». Controlla e premi Salva evento.";
            hint.style.color = "#34d399";
          }
          csvFile.value = "";
        };
        reader.readAsText(f, "UTF-8");
        // evita doppio handling del listener originale se possibile
      });
    }

    // riprova tra poco (wire originale arriva async)
    setTimeout(patchImport, 1200);
  }
})();
