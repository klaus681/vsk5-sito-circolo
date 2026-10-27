/* CVI – patch admin Eventi: tab labels + campo locandina (runtime)
   Caricato dopo gli script admin. Non richiede modifica di admin.html.
   Richiede eventi-locandina-sql.sql eseguito su Supabase. */
(function () {
  "use strict";

  function renameTabs() {
    var t1 = document.querySelector('.admin-tab[data-tab="eventi-aperti"]');
    var t2 = document.querySelector('.admin-tab[data-tab="serie-aperte"]');
    if (t1) t1.textContent = "Eventi \u00b7 singoli";
    if (t2) t2.textContent = "Eventi \u00b7 serie";
  }

  function injectPosterField(afterId, fieldId, label) {
    if (document.getElementById(fieldId)) return;
    var after = document.getElementById(afterId);
    if (!after) return;
    var wrap = after.closest("div");
    if (!wrap || !wrap.parentNode) return;
    var div = document.createElement("div");
    div.innerHTML =
      '<label class="adm-label" for="' +
      fieldId +
      '">' +
      label +
      '</label><input type="url" class="adm-input" id="' +
      fieldId +
      '" placeholder="https://\u2026 oppure lascia vuoto" style="width:100%">' +
      '<p style="margin:.3rem 0 0;font-size:.75rem;color:#64748b">Banner in lista Eventi e Home. Esegui eventi-locandina-sql.sql su Supabase.</p>';
    wrap.parentNode.insertBefore(div, wrap.nextSibling);
  }

  function patchSave(formId, idField, titleField, table, posterField) {
    var form = document.getElementById(formId);
    if (!form || form._posterPatched) return;
    form._posterPatched = true;
    form.addEventListener(
      "submit",
      function () {
        var id = (document.getElementById(idField) || {}).value;
        var posterEl = document.getElementById(posterField);
        if (!posterEl || !window.CVI || !CVI.supabase) return;
        var poster = (posterEl.value || "").trim() || null;
        setTimeout(async function () {
          try {
            if (!id) {
              var titolo = (document.getElementById(titleField) || {}).value;
              if (!titolo) return;
              var r = await CVI.supabase
                .from(table)
                .select("id")
                .eq("titolo", titolo.trim())
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (r.data && r.data.id) id = r.data.id;
            }
            if (!id) return;
            await CVI.supabase.from(table).update({ poster: poster }).eq("id", id);
          } catch (err) {
            console.warn("[CVI eventi poster]", err);
          }
        }, 1200);
      },
      true
    );
  }

  function run() {
    renameTabs();
    injectPosterField("ea-desc", "ea-poster", "Locandina (URL immagine)");
    injectPosterField("sa-desc", "sa-poster", "Locandina (URL immagine)");
    patchSave("ea-form", "ea-id", "ea-titolo", "eventi_aperti", "ea-poster");
    patchSave("sa-form", "sa-id", "sa-titolo", "serie_aperte", "sa-poster");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(run, 900);
      setTimeout(run, 2000);
    });
  } else {
    setTimeout(run, 900);
    setTimeout(run, 2000);
  }
})();
