/* CVI Admin – Campi estesi Eventi (loader + salvataggio dettagli)
   1) Carica la UI completa (formato, flotta, giornate…) dal CDN storico
   2) Al submit cattura SUBITO i valori (prima del reset form) e li salva su Supabase */
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

  async function saveDetailsCaptured(table, payload, idField, titleField) {
    if (!window.CVI || !CVI.supabase) return false;
    var hasAny = Object.keys(payload).some(function (k) {
      return k !== "updated_at" && payload[k] != null && payload[k] !== "";
    });
    if (!hasAny) {
      status("Nessun dettaglio da salvare (campi vuoti)", false);
      return true;
    }

    var id = ((document.getElementById(idField) || {}).value || "").trim();
    if (!id) {
      var titolo = ((document.getElementById(titleField) || {}).value || "").trim();
      if (!titolo) return false;
      for (var i = 0; i < 8 && !id; i++) {
        var r = await CVI.supabase
          .from(table)
          .select("id")
          .eq("titolo", titolo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (r.data && r.data.id) id = r.data.id;
        else await new Promise(function (res) { setTimeout(res, 600); });
      }
    }
    if (!id) {
      status("Dettagli non salvati: id evento non trovato", false);
      return false;
    }

    payload.updated_at = new Date().toISOString();
    var res = await CVI.supabase.from(table).update(payload).eq("id", id);
    if (res.error) {
      if (missingColumn(res.error)) {
        status("Esegui eventi-unificati-sql.sql su Supabase per salvare Formato/Flotta/Iscrizioni.", false);
      } else {
        status("Dettagli non salvati: " + (res.error.message || res.error), false);
        console.warn("[CVI dettagli]", res.error);
      }
      return false;
    }
    status("Dettagli evento salvati", true);
    console.info("[CVI dettagli] salvati su", table, id, payload);
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
          /* CATTURA IMMEDIATA: il form principale può resettarsi dopo il save */
          var captured = payloadFrom(cfg.prefix);
          var idNow = ((document.getElementById(cfg.id) || {}).value || "").trim();
          var titleNow = ((document.getElementById(cfg.title) || {}).value || "").trim();
          console.info("[CVI dettagli] capture", cfg.prefix, captured, "id=", idNow);
          setTimeout(function () {
            /* se l'id era già presente usalo; altrimenti cerca per titolo catturato */
            if (idNow) {
              var el = document.getElementById(cfg.id);
              if (el && !el.value) el.value = idNow;
            }
            if (titleNow) {
              var tel = document.getElementById(cfg.title);
              if (tel && !tel.value) tel.value = titleNow;
            }
            saveDetailsCaptured(cfg.table, captured, cfg.id, cfg.title);
          }, 1800);
        },
        true
      );
    });
  }

  function afterLoad() {
    window.CVIEventiFields = {
      payloadFrom: payloadFrom,
      saveExtra: function (table, prefix, idField, titleField) {
        return saveDetailsCaptured(
          table || "serie_aperte",
          payloadFrom(prefix || "sa"),
          idField || "sa-id",
          titleField || "sa-titolo"
        );
      },
      fillExtra: function () {},
      clearExtra: function () {}
    };
    wireForms();
    setTimeout(wireForms, 800);
    setTimeout(wireForms, 2000);
  }

  var s = document.createElement("script");
  s.src = CDN + "?v=4";
  s.onload = afterLoad;
  s.onerror = function () {
    console.warn("[CVI] eventi-admin-fields CDN fallito – uso solo salvataggio dettagli");
    afterLoad();
  };
  document.head.appendChild(s);
  setTimeout(afterLoad, 1800);
})();
