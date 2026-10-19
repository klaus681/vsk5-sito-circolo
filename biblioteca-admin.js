/* CVI Admin – Biblioteca tecnica */
(function () {
  "use strict";

  var CAT = {
    guide: "Guide",
    polar: "Polar",
    setup: "Setup",
    video: "Video",
    faq: "FAQ"
  };

  var cache = [];
  var _loading = false;

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function notify(msg, type) {
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (type ? " " + type : "");
    clearTimeout(notify._t);
    if (msg) {
      notify._t = setTimeout(function () {
        el.textContent = "";
        el.className = "admin-status";
      }, 4000);
    }
  }

  function panelHTML() {
    return (
      '<div class="admin-card">' +
      '<h3 style="margin:0 0 0.5rem;color:#7dd3fc">Nuova scheda biblioteca</h3>' +
      '<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 0.75rem">File su Dropbox: incolla il link. Video: URL YouTube. Solo testo su Supabase.</p>' +
      '<input type="hidden" id="bib-id">' +
      '<div style="display:grid;gap:0.55rem">' +
      '<div><label class="adm-label">Titolo *</label><input class="adm-input" id="bib-titolo" style="width:100%"></div>' +
      '<div><label class="adm-label">Categoria</label>' +
      '<select class="adm-select" id="bib-cat">' +
      '<option value="guide">Guide</option>' +
      '<option value="polar">Polar</option>' +
      '<option value="setup">Setup</option>' +
      '<option value="video">Video</option>' +
      '<option value="faq">FAQ</option>' +
      "</select></div>" +
      '<div><label class="adm-label">Sommario (anteprima)</label><input class="adm-input" id="bib-sum" style="width:100%"></div>' +
      '<div><label class="adm-label">Contenuto</label><textarea class="adm-input" id="bib-corpo" rows="5" style="width:100%"></textarea></div>' +
      '<div><label class="adm-label">URL file Dropbox</label><input class="adm-input" id="bib-file" style="width:100%" placeholder="https://www.dropbox.com/..."></div>' +
      '<div><label class="adm-label">URL video (YouTube)</label><input class="adm-input" id="bib-video" style="width:100%" placeholder="https://www.youtube.com/watch?v=..."></div>' +
      '<div><label class="adm-label">Altro link</label><input class="adm-input" id="bib-ext" style="width:100%"></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center">' +
      '<div><label class="adm-label">Ordine</label><input type="number" class="adm-input" id="bib-ord" value="0" style="width:5rem"></div>' +
      '<label style="display:flex;align-items:center;gap:0.35rem;color:#e2e8f0;font-size:0.88rem;margin-top:1rem">' +
      '<input type="checkbox" id="bib-pub" checked> Pubblicato</label>' +
      "</div>" +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap">' +
      '<button type="button" class="btn-primary" id="bib-save">Salva</button>' +
      '<button type="button" class="btn-ghost" id="bib-reset" style="display:none">Annulla modifica</button>' +
      "</div></div></div>" +
      '<div class="admin-card" style="margin-top:1rem">' +
      '<h3 style="margin:0 0 0.75rem;color:#a78bfa">Schede esistenti</h3>' +
      '<div id="bib-adm-list"><p class="loading-text">Apri questa scheda per caricare.</p></div>' +
      '<div id="bib-adm-sql" style="display:none;color:#fbbf24;font-size:0.85rem;margin-top:0.5rem">Esegui biblioteca-sql.sql su Supabase.</div>' +
      "</div>"
    );
  }

  function ensureUI() {
    var tabs = document.querySelector(".admin-tabs");
    if (!tabs) return false;
    if (!tabs.querySelector('[data-tab="biblioteca"]')) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "admin-tab";
      tab.setAttribute("data-tab", "biblioteca");
      tab.textContent = "Biblioteca";
      var dl = tabs.querySelector('[data-tab="download"]');
      if (dl && dl.nextSibling) tabs.insertBefore(tab, dl.nextSibling);
      else tabs.appendChild(tab);
    }
    var panel = document.getElementById("panel-biblioteca");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "panel-biblioteca";
      panel.className = "admin-panel";
      var app = document.getElementById("admin-app");
      if (!app) return false;
      app.appendChild(panel);
    }
    if (!document.getElementById("bib-titolo")) panel.innerHTML = panelHTML();
    return true;
  }

  function resetForm() {
    document.getElementById("bib-id").value = "";
    document.getElementById("bib-titolo").value = "";
    document.getElementById("bib-cat").value = "guide";
    document.getElementById("bib-sum").value = "";
    document.getElementById("bib-corpo").value = "";
    document.getElementById("bib-file").value = "";
    document.getElementById("bib-video").value = "";
    document.getElementById("bib-ext").value = "";
    document.getElementById("bib-ord").value = "0";
    document.getElementById("bib-pub").checked = true;
    var rb = document.getElementById("bib-reset");
    if (rb) rb.style.display = "none";
    var sb = document.getElementById("bib-save");
    if (sb) sb.textContent = "Salva";
  }

  function fillForm(it) {
    document.getElementById("bib-id").value = it.id;
    document.getElementById("bib-titolo").value = it.titolo || "";
    document.getElementById("bib-cat").value = it.categoria || "guide";
    document.getElementById("bib-sum").value = it.sommario || "";
    document.getElementById("bib-corpo").value = it.corpo || "";
    document.getElementById("bib-file").value = it.url_file || "";
    document.getElementById("bib-video").value = it.url_video || "";
    document.getElementById("bib-ext").value = it.url_esterno || "";
    document.getElementById("bib-ord").value = it.ordine != null ? it.ordine : 0;
    document.getElementById("bib-pub").checked = !!it.pubblicato;
    document.getElementById("bib-reset").style.display = "inline-block";
    document.getElementById("bib-save").textContent = "Aggiorna";
  }

  async function save() {
    var titolo = (document.getElementById("bib-titolo").value || "").trim();
    if (!titolo) {
      alert("Titolo obbligatorio");
      return;
    }
    var id = (document.getElementById("bib-id").value || "").trim();
    var payload = {
      titolo: titolo,
      categoria: document.getElementById("bib-cat").value,
      sommario: (document.getElementById("bib-sum").value || "").trim() || null,
      corpo: (document.getElementById("bib-corpo").value || "").trim() || null,
      url_file: (document.getElementById("bib-file").value || "").trim() || null,
      url_video: (document.getElementById("bib-video").value || "").trim() || null,
      url_esterno: (document.getElementById("bib-ext").value || "").trim() || null,
      ordine: parseInt(document.getElementById("bib-ord").value, 10) || 0,
      pubblicato: document.getElementById("bib-pub").checked,
      updated_at: new Date().toISOString()
    };
    try {
      var r;
      if (id) {
        r = await CVI.supabase.from("biblioteca").update(payload).eq("id", id);
      } else {
        r = await CVI.supabase.from("biblioteca").insert(payload);
      }
      if (r.error) throw r.error;
      notify(id ? "Scheda aggiornata" : "Scheda creata", "ok");
      resetForm();
      loadList();
    } catch (e) {
      alert(e.message || e);
    }
  }

  async function del(id) {
    if (!confirm("Eliminare questa scheda?")) return;
    try {
      var r = await CVI.supabase.from("biblioteca").delete().eq("id", id);
      if (r.error) throw r.error;
      notify("Eliminata", "ok");
      loadList();
    } catch (e) {
      alert(e.message || e);
    }
  }

  async function loadList() {
    if (!ensureUI()) return;
    if (_loading) return;
    _loading = true;
    var box = document.getElementById("bib-adm-list");
    var hint = document.getElementById("bib-adm-sql");
    if (!box) {
      _loading = false;
      return;
    }
    box.innerHTML = '<p class="loading-text">Caricamento…</p>';
    try {
      var r = await CVI.supabase
        .from("biblioteca")
        .select("*")
        .order("ordine", { ascending: true })
        .order("updated_at", { ascending: false });
      if (r.error) throw r.error;
      cache = r.data || [];
      if (hint) hint.style.display = "none";
      if (!cache.length) {
        box.innerHTML = '<p class="empty-text">Nessuna scheda.</p>';
        return;
      }
      box.innerHTML = cache
        .map(function (it) {
          return (
            '<div class="admin-card" style="margin-bottom:0.65rem">' +
            "<div class=\"admin-card-head\"><div>" +
            "<strong>" +
            esc(it.titolo) +
            "</strong>" +
            '<div class="meta">' +
            esc(CAT[it.categoria] || it.categoria) +
            (it.pubblicato ? " · pubblicato" : " · bozza") +
            " · ord " +
            (it.ordine || 0) +
            "</div>" +
            (it.sommario
              ? '<p class="card-desc">' + esc(it.sommario) + "</p>"
              : "") +
            "</div>" +
            '<div style="display:flex;gap:0.35rem">' +
            '<button type="button" class="btn-sm bib-edit" data-id="' +
            esc(it.id) +
            '">Modifica</button>' +
            '<button type="button" class="btn-danger-sm bib-del" data-id="' +
            esc(it.id) +
            '">Elimina</button>' +
            "</div></div></div>"
          );
        })
        .join("");

      box.querySelectorAll(".bib-edit").forEach(function (b) {
        b.onclick = function () {
          var it = cache.find(function (x) {
            return String(x.id) === b.getAttribute("data-id");
          });
          if (it) {
            fillForm(it);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        };
      });
      box.querySelectorAll(".bib-del").forEach(function (b) {
        b.onclick = function () {
          del(b.getAttribute("data-id"));
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p class="empty-text" style="color:#f87171">' + esc(e.message || e) + "</p>";
      if (hint) hint.style.display = "block";
    } finally {
      _loading = false;
    }
  }

  function wire() {
    if (!ensureUI()) return;
    var tab = document.querySelector('.admin-tab[data-tab="biblioteca"]');
    if (tab && !tab._bibWired) {
      tab._bibWired = true;
      tab.addEventListener("click", function () {
        document.querySelectorAll(".admin-tab").forEach(function (t) {
          t.classList.remove("active");
        });
        document.querySelectorAll(".admin-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        tab.classList.add("active");
        var panel = document.getElementById("panel-biblioteca");
        if (panel) panel.classList.add("active");
        loadList();
      });
    }
    var save = document.getElementById("bib-save");
    if (save && !save._wired) {
      save._wired = true;
      save.onclick = save;
    }
    var reset = document.getElementById("bib-reset");
    if (reset && !reset._wired) {
      reset._wired = true;
      reset.onclick = resetForm;
    }
  }

  function boot() {
    wire();
    setTimeout(wire, 800);
    setTimeout(wire, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
