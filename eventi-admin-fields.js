/* CVI Admin – Campi estesi Eventi
   - Carica UI dettagli dal CDN
   - Avvolge form.onsubmit di serie/eventi e salva formato/flotta/... subito dopo */
(function () {
  "use strict";
  if (window.__CVI_EV_ADMIN_FIELDS_LOADER__) return;
  window.__CVI_EV_ADMIN_FIELDS_LOADER__ = true;

  var CDN =
    "https://cdn.jsdelivr.net/gh/klaus681/vsk5-sito-circolo@64f6844181e721152f0de9a85118ab69f10b9c82/eventi-admin-fields.js";

  function val(prefix, id) {
    var el = document.getElementById(prefix + "-" + id);
    return el && el.value != null ? String(el.value).trim() : "";
  }

  function toIso(v) {
    if (!v) return null;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function payloadFrom(prefix) {
    var maxNum = parseInt(val(prefix, "max"), 10);
    return {
      formato: val(prefix, "formato") || null,
      flotta: val(prefix, "flotta") || null,
      procedura_partenza: val(prefix, "procedura-partenza") || null,
      max_iscritti: isNaN(maxNum) || maxNum < 1 ? null : maxNum,
      iscrizioni_apertura: toIso(val(prefix, "iscr-open")),
      iscrizioni_chiusura: toIso(val(prefix, "iscr-close")),
      proteste_url: val(prefix, "proteste") || null,
      updated_at: new Date().toISOString()
    };
  }

  function status(msg, ok) {
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (ok === true ? " ok" : ok === false ? " err" : "");
  }

  async function resolveId(table, idField, titleField, titleHint) {
    var id = ((document.getElementById(idField) || {}).value || "").trim();
    if (id) return id;
    var titolo = (titleHint || ((document.getElementById(titleField) || {}).value || "")).trim();
    if (!titolo || !window.CVI || !CVI.supabase) return "";
    for (var i = 0; i < 10 && !id; i++) {
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
    return id || "";
  }

  async function persist(table, payload, id) {
    if (!window.CVI || !CVI.supabase || !id) return false;
    var hasAny = Object.keys(payload).some(function (k) {
      return k !== "updated_at" && payload[k] != null && payload[k] !== "";
    });
    if (!hasAny) {
      status("Campi dettaglio vuoti: niente da salvare", false);
      return false;
    }
    payload.updated_at = new Date().toISOString();
    var res = await CVI.supabase.from(table).update(payload).eq("id", id).select("id,formato,flotta,procedura_partenza").maybeSingle();
    if (res.error) {
      status("Dettagli NON salvati: " + (res.error.message || res.error), false);
      console.warn("[CVI dettagli] error", res.error);
      return false;
    }
    if (!res.data) {
      status("Dettagli NON salvati: nessun record aggiornato (permessi RLS?)", false);
      console.warn("[CVI dettagli] 0 rows", table, id);
      return false;
    }
    status("Dettagli salvati: " + (res.data.formato || "") + " / " + (res.data.flotta || ""), true);
    console.info("[CVI dettagli] OK", res.data);
    return true;
  }

  function wrapForm(cfg) {
    var form = document.getElementById(cfg.form);
    if (!form) return;

    /* Avvolge SEMPRE l'handler corrente (anche se wire() lo reimposta) */
    var current = form.onsubmit;
    if (current && current._cviDetailsWrap) return;

    var wrapped = async function (e) {
      var captured = payloadFrom(cfg.prefix);
      var titleNow = ((document.getElementById(cfg.title) || {}).value || "").trim();
      var idNow = ((document.getElementById(cfg.id) || {}).value || "").trim();
      console.info("[CVI dettagli] capture@submit", cfg.prefix, captured);

      var ret;
      if (typeof current === "function") {
        ret = current.call(form, e);
        if (ret && typeof ret.then === "function") {
          try { await ret; } catch (err) { console.warn(err); }
        }
      }

      var id = idNow || (await resolveId(cfg.table, cfg.id, cfg.title, titleNow));
      if (!id) {
        status("Dettagli non salvati: id non trovato", false);
        return ret;
      }
      await persist(cfg.table, captured, id);
      return ret;
    };
    wrapped._cviDetailsWrap = true;
    form.onsubmit = wrapped;
  }

  function wireAll() {
    wrapForm({ form: "sa-form", table: "serie_aperte", prefix: "sa", id: "sa-id", title: "sa-titolo" });
    wrapForm({ form: "ea-form", table: "eventi_aperti", prefix: "ea", id: "ea-id", title: "ea-titolo" });
  }

  function afterLoad() {
    window.CVIEventiFields = { payloadFrom: payloadFrom };
    wireAll();
    /* re-wrap periodico: wire() di serie/eventi può reimpostare onsubmit */
    var n = 0;
    var t = setInterval(function () {
      wireAll();
      if (++n > 20) clearInterval(t);
    }, 1000);
  }

  var s = document.createElement("script");
  s.src = CDN + "?v=5";
  s.onload = afterLoad;
  s.onerror = function () {
    console.warn("[CVI] CDN campi estesi non caricato");
    afterLoad();
  };
  document.head.appendChild(s);
  setTimeout(afterLoad, 2000);
})();
