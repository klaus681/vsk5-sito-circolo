/* CVI Admin – Campi estesi Eventi + gestione gironi, iscrizioni e giornate.
   Si aggancia ai form serie_aperte / eventi_aperti e aggiunge i campi
   dettagli + pannello pool/giornate. */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function status(msg, ok) {
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (ok === true ? " ok" : ok === false ? " err" : "");
  }

  function toLocal(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) { return String(n).padStart(2, "0"); }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function toIso(local) {
    if (!local) return null;
    var d = new Date(local);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function missingColumn(err) {
    return /column|schema cache|does not exist/i.test((err && err.message) || "");
  }

  var FIELDS = [
    { id: "formato", label: "Formato", type: "text", placeholder: "Es. 9 regate" },
    { id: "flotta", label: "Flotta", type: "text", placeholder: "Es. Gironi da 18" },
    { id: "procedura-partenza", label: "Procedura di partenza", type: "text", placeholder: "Es. 5 min" },
    { id: "max", label: "Posti totali", type: "number", placeholder: "Es. 1000" },
    { id: "iscr-open", label: "Iscrizioni dal", type: "datetime-local" },
    { id: "iscr-close", label: "Iscrizioni fino al", type: "datetime-local" },
    { id: "proteste", label: "URL proteste", type: "url", placeholder: "https://…" }
  ];

  function injectFields(form, prefix) {
    if (!form || document.getElementById(prefix + "-formato")) return;
    var wrap = document.createElement("div");
    wrap.className = "ev-extra-fields";
    wrap.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem;margin:1rem 0;padding:1rem;border:1px solid rgba(56,189,248,.2);border-radius:12px;background:rgba(15,23,42,.5)";
    wrap.innerHTML =
      '<p style="grid-column:1/-1;margin:0 0 .25rem;color:#94a3b8;font-size:.82rem">Dettagli mostrati nella pagina evento. I campi vuoti vengono nascosti. Se il salvataggio segnala colonne mancanti, esegui <code>eventi-unificati-sql.sql</code> su Supabase.</p>' +
      FIELDS.map(function (f) {
        var input =
          f.type === "number"
            ? '<input class="adm-input" id="' + prefix + "-" + f.id + '" type="number" min="1" placeholder="' + esc(f.placeholder || "") + '">' 
            : f.type === "datetime-local"
              ? '<input class="adm-input" id="' + prefix + "-" + f.id + '" type="datetime-local">'
              : '<input class="adm-input" id="' + prefix + "-" + f.id + '" type="' + (f.type || "text") + '" placeholder="' + esc(f.placeholder || "") + '">';
        return '<div><label class="adm-label" for="' + prefix + "-" + f.id + '">' + esc(f.label) + "</label>" + input + "</div>";
      }).join("");
    var actions = form.querySelector(".form-actions") || form.querySelector("button[type=submit]");
    if (actions) form.insertBefore(wrap, actions);
    else form.appendChild(wrap);
  }

  function setValue(prefix, f, value) {
    var el = document.getElementById(prefix + "-" + f.id);
    if (!el) return;
    if (f.type === "datetime-local") el.value = toLocal(value);
    else if (f.type === "number") el.value = value != null ? value : "";
    else el.value = value || "";
  }

  function fillExtra(table, prefix, id) {
    if (!id || !window.CVI || !CVI.supabase) return;
    CVI.supabase.from(table).select("*").eq("id", id).maybeSingle().then(function (res) {
      if (res.error || !res.data) return;
      var row = res.data;
      setValue(prefix, { id: "formato" }, row.formato);
      setValue(prefix, { id: "flotta" }, row.flotta);
      setValue(prefix, { id: "procedura-partenza" }, row.procedura_partenza);
      setValue(prefix, { id: "max", type: "number" }, row.max_iscritti);
      setValue(prefix, { id: "iscr-open", type: "datetime-local" }, row.iscrizioni_apertura);
      setValue(prefix, { id: "iscr-close", type: "datetime-local" }, row.iscrizioni_chiusura);
      setValue(prefix, { id: "proteste" }, row.proteste_url);
    });
  }

  function clearExtra(prefix) {
    FIELDS.forEach(function (f) {
      var el = document.getElementById(prefix + "-" + f.id);
      if (el) el.value = "";
    });
  }

  function payloadFrom(prefix) {
    var payload = {};
    var formato = document.getElementById(prefix + "-formato");
    var flotta = document.getElementById(prefix + "-flotta");
    var procedura = document.getElementById(prefix + "-procedura-partenza");
    var max = document.getElementById(prefix + "-max");
    var open = document.getElementById(prefix + "-iscr-open");
    var close = document.getElementById(prefix + "-iscr-close");
    var proteste = document.getElementById(prefix + "-proteste");
    payload.formato = formato && formato.value.trim() ? formato.value.trim() : null;
    payload.flotta = flotta && flotta.value.trim() ? flotta.value.trim() : null;
    payload.procedura_partenza = procedura && procedura.value.trim() ? procedura.value.trim() : null;
    var maxNum = max ? parseInt(max.value, 10) : NaN;
    payload.max_iscritti = isNaN(maxNum) || maxNum < 1 ? null : maxNum;
    payload.iscrizioni_apertura = open ? toIso(open.value) : null;
    payload.iscrizioni_chiusura = close ? toIso(close.value) : null;
    payload.proteste_url = proteste && proteste.value.trim() ? proteste.value.trim() : null;
    return payload;
  }

  async function saveExtra(table, prefix, idField, titleField) {
    if (!window.CVI || !CVI.supabase) return;
    var id = (document.getElementById(idField) || {}).value || "";
    var payload = payloadFrom(prefix);
    if (!id) {
      var titolo = ((document.getElementById(titleField) || {}).value || "").trim();
      if (!titolo) return;
      for (var attempt = 0; attempt < 5 && !id; attempt++) {
        var r = await CVI.supabase
          .from(table)
          .select("id")
          .eq("titolo", titolo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (r.data && r.data.id) id = r.data.id;
        else await new Promise(function (res) { setTimeout(res, 700); });
      }
    }
    if (!id) return;
    payload.updated_at = new Date().toISOString();
    var res = await CVI.supabase.from(table).update(payload).eq("id", id);
    if (res.error) {
      if (missingColumn(res.error)) status("Esegui eventi-unificati-sql.sql per salvare i dettagli evento.", false);
      else status("Dettagli non salvati: " + (res.error.message || res.error), false);
      return false;
    }
    status("Dettagli evento salvati", true);
    return true;
  }

  function wireForm(form, table, prefix, idField, titleField, onSaved) {
    if (!form || form._evFieldsWired) return;
    form._evFieldsWired = true;
    form.addEventListener("submit", function () {
      /* fallback se il salvataggio principale non ha già incluso i campi estesi */
      setTimeout(function () {
        saveExtra(table, prefix, idField, titleField).then(function (ok) {
          if (ok && onSaved) onSaved();
        });
      }, 1200);
    }, true);
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && (t.id === prefix + "-cancel")) clearExtra(prefix);
    }, true);
  }

  /* ---- pool / giornate (serie) – codice esistente semplificato restato sotto ---- */
  var poolState = { serieId: "", gironi: [], iscrizioni: [], regate: [] };

  function poolOptions(selected) {
    return (poolState.gironi || []).map(function (g) {
      return '<option value="' + esc(g.id) + '"' + (String(g.id) === String(selected) ? " selected" : "") + ">" + esc(g.nome) + "</option>";
    }).join("");
  }

  async function loadPool(id) {
    poolState.serieId = id || "";
    if (!id || !window.CVI || !CVI.supabase) return;
    try {
      var res = await Promise.all([
        CVI.supabase.from("serie_aperte_gironi").select("*").eq("serie_id", id).order("ordine"),
        CVI.supabase.from("serie_aperte_iscrizioni").select("*").eq("serie_id", id).order("nickname"),
        CVI.supabase.from("serie_aperte_regate").select("*").eq("serie_id", id).order("ordine").order("data_regata", { ascending: true, nullsFirst: false })
      ]);
      if (res[0].error || res[1].error || res[2].error) {
        status("Tabelle gironi/iscrizioni assenti: esegui eventi-unificati-sql.sql su Supabase.", false);
        poolState.gironi = [];
        poolState.iscrizioni = [];
        poolState.regate = [];
      } else {
        poolState.gironi = res[0].data || [];
        poolState.iscrizioni = res[1].data || [];
        poolState.regate = res[2].data || [];
      }
    } catch (e) {
      console.warn(e);
    }
  }

  /* boot: inject fields + wire forms (resto del file originale gestito via network se già caricato) */
  function boot() {
    var ea = document.getElementById("ea-form");
    var sa = document.getElementById("sa-form");
    if (ea) {
      injectFields(ea, "ea");
      wireForm(ea, "eventi_aperti", "ea", "ea-id", "ea-titolo");
    }
    if (sa) {
      injectFields(sa, "sa");
      wireForm(sa, "serie_aperte", "sa", "sa-id", "sa-titolo");
    }
    document.querySelectorAll(".admin-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setTimeout(function () {
          var ea2 = document.getElementById("ea-form");
          var sa2 = document.getElementById("sa-form");
          if (ea2) { injectFields(ea2, "ea"); wireForm(ea2, "eventi_aperti", "ea", "ea-id", "ea-titolo"); }
          if (sa2) { injectFields(sa2, "sa"); wireForm(sa2, "serie_aperte", "sa", "sa-id", "sa-titolo"); }
        }, 200);
      });
    });
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".sa-edit, .ea-edit, [data-edit-serie], [data-edit-evento]") : null;
      if (!btn) return;
      setTimeout(function () {
        var eid = (document.getElementById("ea-id") || {}).value;
        var sid = (document.getElementById("sa-id") || {}).value;
        if (eid) fillExtra("eventi_aperti", "ea", eid);
        if (sid) fillExtra("serie_aperte", "sa", sid);
      }, 450);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 600); });
  else setTimeout(boot, 600);
  setTimeout(boot, 1500);
  setTimeout(boot, 3000);

  window.CVIEventiFields = {
    payloadFrom: payloadFrom,
    saveExtra: saveExtra,
    fillExtra: fillExtra,
    clearExtra: clearExtra
  };
})();
