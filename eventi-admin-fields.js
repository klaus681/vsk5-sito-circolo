/* CVI Admin – Campi estesi Eventi (loader + salvataggio dettagli)
   1) Carica la UI completa (formato, flotta, giornate…) dal CDN storico
   2) Dopo ogni salvataggio serie/evento, aggiorna i campi dettagli su Supabase */
(function () {
  "use strict";
  if (window.__CVI_EV_ADMIN_FIELDS_LOADER__) return;
  window.__CVI_EV_ADMIN_FIELDS_LOADER__ = true;

  var CDN =
    "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@64f6844181e721152f0de9a85118ab69f10b9c82/eventi-admin-fields.js";

  function payloadFrom(prefix) {
    function val(id) {
      var el = document.getElementById(prefix + "-" + id);
      return el && el.value != null ? String(el.value).trim() : "";
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
      proteste_url: val("proteste") || null,
      updated_at: new Date().toISOString()
    };
  }

  function status(msg, ok) {
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (ok === true ? " ok" : ok === false ? " err" : "");
  }

  function missingColumn(err) {
    return /column|schema cache|does not exist/i.test((err && err.message) || "");
  }

  async function saveDetails(table, prefix, idField, titleField) {
    if (!window.CVI || !CVI.supabase) return false;
    var payload = payloadFrom(prefix);
    var hasAny = Object.keys(payload).some(function (k) {
      return k !== "updated_at" && payload[k] != null && payload[k] !== "";
    });
    if (!hasAny) return true;

    var id = ((document.getElementById(idField) || {}).value || "").trim();
    if (!id) {
      var titolo = ((document.getElementById(titleField) || {}).value || "").trim();
      if (!titolo) return false;
      for (var i = 0; i < 6 && !id; i++) {
        var r = await CVI.supabase
          .from(table)
          .select("id")
          .eq("titolo", titolo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (r.data && r.data.id) id = r.data.id;
        else await new Promise(function (res) { setTimeout(res, 500); });
      }
    }
    if (!id) {
      status("Dettagli non salvati: id evento non trovato", false);
      return false;
    }

    var res = await CVI.supabase.from(table).update(payload).eq("id", id);
    if (res.error) {
      if (missingColumn(res.error)) {
        status("Esegui eventi-unificati-sql.sql su Supabase per salvare Formato/Flotta/Iscrizioni.", false);
      } else {
        status("Dettagli non salvati: " + (res.error.message || res.error), false);
      }
      return false;
    }
    status("Dettagli evento salvati", true);
    return true;
  }

  function wireForms() {
    [
      { form: "ea-form", table: "eventi_aperti", prefix: "ea", id: "ea-id", title: "ea-titolo" },
      { form: "sa-form", table: "serie_aperte", prefix: "sa", id: "sa-id", title: "sa-titolo" }
    ].forEach(function (cfg) {
      var form = document.getElementById(cfg.form);
      if (!form || form._cviDetailsWired) return;
      form._cviDetailsWired = true;
      form.addEventListener(
        "submit",
        function () {
          setTimeout(function () {
            saveDetails(cfg.table, cfg.prefix, cfg.id, cfg.title);
          }, 1500);
        },
        true
      );
    });
  }

  function afterLoad() {
    window.CVIEventiFields = {
      payloadFrom: payloadFrom,
      saveExtra: function (table, prefix, idField, titleField) {
        return saveDetails(table || "serie_aperte", prefix || "sa", idField || "sa-id", titleField || "sa-titolo");
      },
      fillExtra: function () {},
      clearExtra: function () {}
    };
    wireForms();
    setTimeout(wireForms, 800);
    setTimeout(wireForms, 2000);
  }

  var s = document.createElement("script");
  s.src = CDN + "?v=3";
  s.onload = afterLoad;
  s.onerror = function () {
    console.warn("[CVI] eventi-admin-fields CDN fallito – uso solo salvataggio dettagli");
    afterLoad();
  };
  document.head.appendChild(s);
  setTimeout(afterLoad, 1800);
})();
