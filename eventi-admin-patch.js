/* CVI – patch admin Eventi
   - Rinomina tab Eventi
   - Inietta campi locandina (URL + file + anteprima) se assenti
   - Patch save/fill per serie e supporto file
   Richiede eventi-locandina-sql.sql su Supabase. */
(function () {
  "use strict";

  function renameTabs() {
    var t1 = document.querySelector('.admin-tab[data-tab="eventi-aperti"]');
    var t2 = document.querySelector('.admin-tab[data-tab="serie-aperte"]');
    if (t1) t1.textContent = "Eventi · singoli";
    if (t2) t2.textContent = "Eventi · serie";
  }

  function setPreview(previewId, url) {
    var prev = document.getElementById(previewId);
    if (!prev) return;
    var img = prev.querySelector("img");
    if (!img) return;
    if (url && (String(url).indexOf("http") === 0 || String(url).indexOf("data:") === 0)) {
      prev.style.display = "block";
      img.src = url;
    } else {
      prev.style.display = "none";
      img.removeAttribute("src");
    }
  }

  function injectPosterBlock(afterId, fieldId, fileId, previewId, label) {
    if (document.getElementById(fieldId)) return;
    var after = document.getElementById(afterId);
    if (!after) return;
    var wrap = after.closest("div");
    if (!wrap || !wrap.parentNode) return;
    var div = document.createElement("div");
    div.innerHTML =
      '<label class="adm-label" for="' + fieldId + '">' + label + '</label>' +
      '<input type="url" class="adm-input" id="' + fieldId + '" placeholder="https://… oppure carica un file qui sotto" style="width:100%">' +
      '<input type="file" id="' + fileId + '" accept="image/*" style="margin-top:.4rem;font-size:.8rem;color:#94a3b8">' +
      '<p style="margin:.3rem 0 0;font-size:.75rem;color:#64748b">Banner in lista Eventi e Home. Preferisci URL pubblico; file max ~900 KB.</p>' +
      '<div id="' + previewId + '" style="margin-top:.5rem;display:none"><img alt="Anteprima" style="max-height:120px;border-radius:8px;border:1px solid rgba(148,163,184,.2)"></div>';
    wrap.parentNode.insertBefore(div, wrap.nextSibling);
  }

  function wireFileToUrl(fileId, urlId, previewId) {
    var fileEl = document.getElementById(fileId);
    var urlEl = document.getElementById(urlId);
    if (fileEl && !fileEl._posterWired) {
      fileEl._posterWired = true;
      fileEl.onchange = function () {
        var f = this.files && this.files[0];
        if (!f) return;
        if (f.size > 900 * 1024) {
          alert("File troppo grande (max ~900 KB). Usa un URL esterno o comprimi l'immagine.");
          this.value = "";
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          if (urlEl) urlEl.value = reader.result;
          setPreview(previewId, reader.result);
        };
        reader.readAsDataURL(f);
      };
    }
    if (urlEl && !urlEl._posterWired) {
      urlEl._posterWired = true;
      urlEl.addEventListener("input", function () {
        setPreview(previewId, (this.value || "").trim());
      });
    }
  }

  function patchFormSave(formId, idField, titleField, table, posterField) {
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
        }, 1400);
      },
      true
    );
  }

  function patchEditClicks(btnClassPart, table, posterField, previewId) {
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest && e.target.closest("[data-id]");
        if (!btn) return;
        var cls = btn.className || "";
        if (cls.indexOf(btnClassPart) < 0) return;
        var sid = btn.getAttribute("data-id");
        if (!sid || !window.CVI || !CVI.supabase) return;
        setTimeout(async function () {
          try {
            var r = await CVI.supabase.from(table).select("poster").eq("id", sid).maybeSingle();
            var el = document.getElementById(posterField);
            if (el && r.data) {
              el.value = r.data.poster || "";
              setPreview(previewId, r.data.poster || "");
            }
          } catch (err) {}
        }, 250);
      },
      true
    );
  }

  function run() {
    renameTabs();
    injectPosterBlock("ea-desc", "ea-poster", "ea-poster-file", "ea-poster-preview", "Locandina (URL o file)");
    injectPosterBlock("sa-desc", "sa-poster", "sa-poster-file", "sa-poster-preview", "Locandina (URL o file)");
    wireFileToUrl("ea-poster-file", "ea-poster", "ea-poster-preview");
    wireFileToUrl("sa-poster-file", "sa-poster", "sa-poster-preview");
    // eventi-aperti-admin.js v3 già include poster nel payload; la patch è fallback
    patchFormSave("ea-form", "ea-id", "ea-titolo", "eventi_aperti", "ea-poster");
    patchFormSave("sa-form", "sa-id", "sa-titolo", "serie_aperte", "sa-poster");
    patchEditClicks("ea-edit", "eventi_aperti", "ea-poster", "ea-poster-preview");
    patchEditClicks("sa-edit", "serie_aperte", "sa-poster", "sa-poster-preview");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(run, 700);
      setTimeout(run, 1800);
    });
  } else {
    setTimeout(run, 700);
    setTimeout(run, 1800);
  }
})();
