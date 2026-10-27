/* CVI – patch admin Eventi
   - Tab già rinominate in admin.html
   - Locandina nativa su eventi aperti (eventi-aperti-admin.js)
   - Locandina runtime su serie aperte (fill + save + file)
   Richiede eventi-locandina-sql.sql su Supabase. */
(function () {
  "use strict";

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

  /* ---- Serie aperte: inject fields if missing + patch save/fill ---- */
  function ensureSeriePosterField() {
    if (document.getElementById("sa-poster")) return;
    var after = document.getElementById("sa-desc");
    if (!after) return;
    var wrap = after.closest("div");
    if (!wrap || !wrap.parentNode) return;
    var div = document.createElement("div");
    div.innerHTML =
      '<label class="adm-label" for="sa-poster">Locandina (URL o file)</label>' +
      '<input type="url" class="adm-input" id="sa-poster" placeholder="https://… oppure carica un file qui sotto" style="width:100%">' +
      '<input type="file" id="sa-poster-file" accept="image/*" style="margin-top:.4rem;font-size:.8rem;color:#94a3b8">' +
      '<p style="margin:.3rem 0 0;font-size:.75rem;color:#64748b">Banner in lista Eventi e Home.</p>' +
      '<div id="sa-poster-preview" style="margin-top:.5rem;display:none"><img alt="Anteprima locandina" style="max-height:120px;border-radius:8px;border:1px solid rgba(148,163,184,.2)"></div>';
    wrap.parentNode.insertBefore(div, wrap.nextSibling);
  }

  function patchSerieSave() {
    var form = document.getElementById("sa-form");
    if (!form || form._posterPatched) return;
    form._posterPatched = true;
    form.addEventListener(
      "submit",
      function () {
        var id = (document.getElementById("sa-id") || {}).value;
        var posterEl = document.getElementById("sa-poster");
        if (!posterEl || !window.CVI || !CVI.supabase) return;
        var poster = (posterEl.value || "").trim() || null;
        setTimeout(async function () {
          try {
            if (!id) {
              var titolo = (document.getElementById("sa-titolo") || {}).value;
              if (!titolo) return;
              var r = await CVI.supabase
                .from("serie_aperte")
                .select("id")
                .eq("titolo", titolo.trim())
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (r.data && r.data.id) id = r.data.id;
            }
            if (!id) return;
            await CVI.supabase.from("serie_aperte").update({ poster: poster }).eq("id", id);
          } catch (err) {
            console.warn("[CVI serie poster]", err);
          }
        }, 1400);
      },
      true
    );
  }

  /* When user clicks Modifica on a serie card, try to load poster into the field */
  function patchSerieEditClicks() {
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest && e.target.closest("[data-id]");
        if (!btn) return;
        var cls = btn.className || "";
        if (cls.indexOf("sa-edit") < 0 && cls.indexOf("serie-edit") < 0) return;
        var sid = btn.getAttribute("data-id");
        if (!sid || !window.CVI || !CVI.supabase) return;
        setTimeout(async function () {
          try {
            var r = await CVI.supabase
              .from("serie_aperte")
              .select("poster")
              .eq("id", sid)
              .maybeSingle();
            var el = document.getElementById("sa-poster");
            if (el && r.data) {
              el.value = r.data.poster || "";
              setPreview("sa-poster-preview", r.data.poster || "");
            }
          } catch (err) {
            /* colonna poster assente finché non si esegue SQL */
          }
        }, 200);
      },
      true
    );
  }

  function run() {
    wireFileToUrl("ea-poster-file", "ea-poster", "ea-poster-preview");
    ensureSeriePosterField();
    wireFileToUrl("sa-poster-file", "sa-poster", "sa-poster-preview");
    patchSerieSave();
    patchSerieEditClicks();
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
