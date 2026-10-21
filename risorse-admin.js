/* CVI Admin – Download e Risorse (pannello unico) */
(function () {
"use strict";

var CAT = {
  software: "Software", skin: "Skin", mappe: "Mappe", regolamenti: "Regolamenti",
  guide: "Guide", polar: "Polar", setup: "Setup", faq: "FAQ", altro: "Altro"
};
var TIPI = { file: "File", scheda: "Scheda", video: "Video", link: "Link" };
var BUCKET = "risorse";
var cache = [];
var tableOk = false;
var loading = false;

function $(id) { return document.getElementById(id); }

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notify(msg, type) {
  if (typeof window.status === "function") { window.status(msg, type); return; }
  var el = $("admin-status");
  if (!el) return;
  el.textContent = msg || "";
  el.className = "admin-status" + (type ? " " + type : "");
  clearTimeout(notify._t);
  if (msg) notify._t = setTimeout(function () {
    el.textContent = "";
    el.className = "admin-status";
  }, 4500);
}

function isMissing(err) {
  return /does not exist|schema cache|relation .* does not exist|42P01/i.test((err && err.message) || "");
}

function panelHTML() {
  var cats = Object.keys(CAT).map(function (k) {
    return '<option value="' + k + '">' + CAT[k] + "</option>";
  }).join("");

  return '<div class="admin-card">' +
    '<h3 style="margin:0 0 .5rem;color:#7dd3fc">Nuova risorsa</h3>' +
    '<p style="color:#94a3b8;font-size:.85rem;margin:0 0 .9rem;line-height:1.5">Un unico pannello per file, schede, video e link. I file caricati vanno nel bucket privato <code>risorse</code> e sono scaricabili solo dai soci tramite link temporaneo.</p>' +
    '<input type="hidden" id="rsa-id">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:.7rem">' +
      '<div><label class="adm-label" for="rsa-tipo">Tipo *</label><select class="adm-select" id="rsa-tipo" style="width:100%">' +
        '<option value="file">📦 File da scaricare</option><option value="scheda">📘 Scheda / guida</option><option value="video">▶️ Video</option><option value="link">🔗 Link</option>' +
      "</select></div>" +
      '<div><label class="adm-label" for="rsa-cat">Categoria *</label><select class="adm-select" id="rsa-cat" style="width:100%">' + cats + "</select></div>" +
      '<div><label class="adm-label" for="rsa-vis">Visibilità *</label><select class="adm-select" id="rsa-vis" style="width:100%">' +
        '<option value="soci">🔒 Soci (dopo il login)</option><option value="pubblico">🌍 Pubblico</option>' +
      "</select></div>" +
      '<div><label class="adm-label" for="rsa-ordine">Ordine</label><input type="number" class="adm-input" id="rsa-ordine" value="0" style="width:100%"></div>' +
      '<div style="grid-column:1/-1"><label class="adm-label" for="rsa-titolo">Titolo *</label><input class="adm-input" id="rsa-titolo" maxlength="200" style="width:100%"></div>' +
      '<div style="grid-column:1/-1"><label class="adm-label" for="rsa-sommario">Sommario</label><input class="adm-input" id="rsa-sommario" maxlength="300" style="width:100%"></div>' +
      '<div style="grid-column:1/-1" id="rsa-row-corpo"><label class="adm-label" for="rsa-corpo">Contenuto (schede / guide)</label><textarea class="adm-input" id="rsa-corpo" rows="6" style="width:100%"></textarea></div>' +
      '<div style="grid-column:1/-1" id="rsa-row-url"><label class="adm-label" for="rsa-url" id="rsa-url-label">URL</label><input class="adm-input" id="rsa-url" style="width:100%" placeholder="https://..."></div>' +
      '<div style="grid-column:1/-1;display:none" id="rsa-row-video"><label class="adm-label" for="rsa-video">URL video (YouTube / Vimeo)</label><input class="adm-input" id="rsa-video" style="width:100%" placeholder="https://www.youtube.com/watch?v=..."></div>' +
      '<div style="grid-column:1/-1" id="rsa-row-file"><label class="adm-label" for="rsa-file">Carica file (max 50 MB, opzionale se usi un URL)</label><input type="file" id="rsa-file"><p id="rsa-upload-status" style="margin:.35rem 0 0;font-size:.8rem;color:#94a3b8">Il file viene salvato nello spazio privato «risorse».</p></div>' +
      '<div><label class="adm-label" for="rsa-meta">Dettagli (es. ZIP · 48 MB)</label><input class="adm-input" id="rsa-meta" maxlength="120" style="width:100%"></div>' +
      '<div><label class="adm-label" for="rsa-tags">Tag (separati da virgola)</label><input class="adm-input" id="rsa-tags" style="width:100%" placeholder="vs5, patch"></div>' +
      '<div style="grid-column:1/-1"><label style="display:flex;align-items:center;gap:.4rem;color:#e2e8f0;font-size:.88rem"><input type="checkbox" id="rsa-pub" checked> Pubblicata</label></div>' +
    "</div>" +
    '<div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">' +
      '<button type="button" class="btn-primary" id="rsa-save">Salva</button>' +
      '<button type="button" class="btn-ghost" id="rsa-reset" style="display:none">Annulla modifica</button>' +
    "</div></div>" +
    '<div class="admin-card" style="margin-top:1rem">' +
      '<h3 style="margin:0 0 .7rem;color:#a78bfa">Risorse esistenti</h3>' +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">' +
        '<input type="search" class="adm-input" id="rsa-search" placeholder="Cerca titolo o tag…" style="flex:1;min-width:180px">' +
        '<select class="adm-select" id="rsa-filter-tipo"><option value="">Tutti i tipi</option><option value="file">File</option><option value="scheda">Schede</option><option value="video">Video</option><option value="link">Link</option></select>' +
        '<select class="adm-select" id="rsa-filter-vis"><option value="">Tutte</option><option value="pubblico">Pubbliche</option><option value="soci">Soci</option></select>' +
      "</div>" +
      '<div id="rsa-list"><p class="loading-text">Apri questa scheda per caricare.</p></div>' +
      '<div id="rsa-sql-hint" style="display:none;color:#fbbf24;font-size:.85rem;margin-top:.6rem">Tabella non trovata: esegui <code>risorse-sql.sql</code> su Supabase. Fino ad allora restano attivi i pannelli Download e Biblioteca.</div>' +
    "</div>";
}
function goTab(id) {
  var t = document.querySelector('.admin-tab[data-tab="' + id + '"]');
  if (t) { t.click(); return; }
  setTimeout(function () {
    var t2 = document.querySelector('.admin-tab[data-tab="' + id + '"]');
    if (t2) t2.click();
  }, 600);
}

function showMissingTable(box) {
  if (!box) return;
  box.innerHTML =
    '<div style="border:1px solid rgba(251,191,36,.35);background:rgba(251,191,36,.07);border-radius:10px;padding:.85rem 1rem;color:#fde68a;font-size:.88rem;line-height:1.55">' +
      "<strong>Tabella <code>public.risorse</code> non trovata.</strong><br>" +
      "Esegui <code>risorse-sql.sql</code> nel SQL Editor di Supabase: crea la tabella, migra i contenuti esistenti e abilita questo pannello." +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.7rem">' +
        '<button type="button" class="btn-sm" data-goto="download">Apri Download (contenuti attuali)</button>' +
        '<button type="button" class="btn-sm" data-goto="biblioteca">Apri Biblioteca (contenuti attuali)</button>' +
      "</div>" +
    "</div>";
  box.querySelectorAll("[data-goto]").forEach(function (b) {
    b.onclick = function () { goTab(b.getAttribute("data-goto")); };
  });
}

function activate() {
  document.querySelectorAll(".admin-tab").forEach(function (t) { t.classList.remove("active"); });
  document.querySelectorAll(".admin-panel").forEach(function (p) { p.classList.remove("active"); });
  var tab = document.querySelector('.admin-tab[data-tab="risorse"]');
  if (tab) tab.classList.add("active");
  var panel = $("panel-risorse");
  if (panel) panel.classList.add("active");
  loadList();
}

function hideLegacy() {
  if (!tableOk) return;
  ["download", "biblioteca"].forEach(function (id) {
    var t = document.querySelector('.admin-tab[data-tab="' + id + '"]');
    if (t) t.style.display = "none";
    var p = $("panel-" + id);
    if (p) { p.classList.remove("active"); p.style.display = "none"; }
  });
}

function ensureUI() {
  var tabs = document.querySelector(".admin-tabs");
  var app = $("admin-app");
  if (!tabs || !app) return false;

  if (!tabs.querySelector('[data-tab="risorse"]')) {
    var tab = document.createElement("button");
    tab.type = "button";
    tab.className = "admin-tab";
    tab.setAttribute("data-tab", "risorse");
    tab.textContent = "Download e Risorse";
    var gal = tabs.querySelector('[data-tab="galleria"]');
    if (gal && gal.nextSibling) tabs.insertBefore(tab, gal.nextSibling);
    else tabs.appendChild(tab);
    tab.onclick = activate;
    tab.addEventListener("click", function () { if (tableOk) loadList(); });
  }

  var panel = $("panel-risorse");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "panel-risorse";
    panel.className = "admin-panel";
    app.appendChild(panel);
  }
  if (!$("rsa-titolo")) panel.innerHTML = panelHTML();
  return true;
}

function syncFields() {
  var tipo = $("rsa-tipo").value;
  $("rsa-row-corpo").style.display = tipo === "scheda" ? "block" : "none";
  $("rsa-row-video").style.display = tipo === "video" ? "block" : "none";
  $("rsa-row-file").style.display = tipo === "file" ? "block" : "none";
  $("rsa-row-url").style.display = (tipo === "scheda" || tipo === "video") ? "none" : "block";
  $("rsa-url-label").textContent = tipo === "link" ? "URL del link" : "URL file esterno (opzionale)";
}

function setUploadStatus(msg, color) {
  var el = $("rsa-upload-status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = color || "#94a3b8";
}

function resetForm() {
  $("rsa-id").value = "";
  $("rsa-titolo").value = "";
  $("rsa-tipo").value = "file";
  $("rsa-cat").value = "altro";
  $("rsa-vis").value = "soci";
  $("rsa-sommario").value = "";
  $("rsa-corpo").value = "";
  $("rsa-url").value = "";
  $("rsa-video").value = "";
  $("rsa-meta").value = "";
  $("rsa-tags").value = "";
  $("rsa-ordine").value = "0";
  $("rsa-pub").checked = true;
  var f = $("rsa-file");
  if (f) f.value = "";
  setUploadStatus("Il file viene salvato nello spazio privato «risorse».", "#94a3b8");
  $("rsa-reset").style.display = "none";
  $("rsa-save").textContent = "Salva";
  syncFields();
}

function fillForm(item) {
  $("rsa-id").value = item.id || "";
  $("rsa-titolo").value = item.titolo || "";
  $("rsa-tipo").value = item.tipo || "file";
  $("rsa-cat").value = item.categoria || "altro";
  $("rsa-vis").value = item.visibilita || "soci";
  $("rsa-sommario").value = item.sommario || "";
  $("rsa-corpo").value = item.corpo || "";
  $("rsa-url").value = item.url || "";
  $("rsa-video").value = item.url_video || "";
  $("rsa-meta").value = item.meta || "";
  $("rsa-tags").value = item.tags || "";
  $("rsa-ordine").value = item.ordine != null ? item.ordine : 0;
  $("rsa-pub").checked = !!item.pubblicato;
  $("rsa-file").value = "";
  setUploadStatus(
    item.private_path ? "File attuale: " + item.private_path + " (caricane uno nuovo per sostituirlo)." : "Il file viene salvato nello spazio privato «risorse».",
    "#94a3b8"
  );
  $("rsa-reset").style.display = "inline-block";
  $("rsa-save").textContent = "Aggiorna";
  syncFields();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function uploadFile(file) {
  var safe = String(file.name || "file").replace(/[^\w.\-]+/g, "_").slice(-80);
  var path = "risorse/" + Date.now() + "-" + safe;
  var up = await CVI.supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  if (up.error) throw up.error;
  return { bucket: BUCKET, private_path: path };
}

async function saveItem() {
  if (!tableOk) {
    alert("Esegui risorse-sql.sql su Supabase per attivare il pannello Download e Risorse.");
    return;
  }

  var id = ($("rsa-id").value || "").trim();
  var titolo = ($("rsa-titolo").value || "").trim();
  var tipo = $("rsa-tipo").value;
  var categoria = $("rsa-cat").value;
  var visibilita = $("rsa-vis").value;
  var sommario = ($("rsa-sommario").value || "").trim();
  var corpo = ($("rsa-corpo").value || "").trim();
  var url = ($("rsa-url").value || "").trim();
  var video = ($("rsa-video").value || "").trim();
  var meta = ($("rsa-meta").value || "").trim();
  var tags = ($("rsa-tags").value || "").trim();
  var ordine = parseInt($("rsa-ordine").value, 10);
  if (isNaN(ordine)) ordine = 0;

  if (!titolo) { alert("Titolo obbligatorio."); return; }
  if (tipo === "link" && !url) { alert("Per un link inserisci l'URL."); return; }
  if (tipo === "video" && !video) { alert("Per un video inserisci l'URL YouTube/Vimeo."); return; }

  var payload = {
    titolo: titolo,
    tipo: tipo,
    categoria: categoria,
    visibilita: visibilita,
    sommario: sommario || null,
    corpo: tipo === "scheda" ? (corpo || null) : null,
    meta: meta || null,
    url: (tipo === "scheda" || tipo === "video") ? null : (url || null),
    url_video: tipo === "video" ? (video || null) : null,
    tags: tags || null,
    ordine: ordine,
    pubblicato: !!$("rsa-pub").checked
  };

  if (tipo !== "file") {
    payload.bucket = null;
    payload.private_path = null;
  }

  var fileEl = $("rsa-file");
  var file = fileEl && fileEl.files ? fileEl.files[0] : null;
  var btn = $("rsa-save");

  if (file) {
    if (file.size > 52428800) { alert("Il file supera il limite di 50 MB."); return; }
    btn.disabled = true;
    setUploadStatus("Caricamento in corso…", "#7dd3fc");
    try {
      var up = await uploadFile(file);
      payload.bucket = up.bucket;
      payload.private_path = up.private_path;
      setUploadStatus("File caricato.", "#34d399");
    } catch (e) {
      setUploadStatus("Errore upload: " + (e.message || e), "#f87171");
      alert("Errore upload: " + (e.message || e));
      btn.disabled = false;
      return;
    }
  }

  try {
    var res;
    if (id) {
      res = await CVI.supabase.from("risorse").update(payload).eq("id", id);
    } else {
      res = await CVI.supabase.from("risorse").insert(payload).select("id").single();
    }
    if (res.error) throw res.error;
    notify(id ? "Risorsa aggiornata" : "Risorsa creata", "ok");
    resetForm();
    loadList();
  } catch (e) {
    alert("Errore: " + (e.message || e));
  } finally {
    btn.disabled = false;
  }
}

async function delItem(id) {
  if (!confirm("Eliminare questa risorsa?")) return;
  try {
    var r = await CVI.supabase.from("risorse").delete().eq("id", id);
    if (r.error) throw r.error;
    notify("Risorsa eliminata", "ok");
    loadList();
  } catch (e) {
    alert("Errore: " + (e.message || e));
  }
}

function renderList() {
  var box = $("rsa-list");
  if (!box) return;
  var q = ($("rsa-search").value || "").trim().toLowerCase();
  var tipo = $("rsa-filter-tipo").value;
  var vis = $("rsa-filter-vis").value;

  var rows = cache.filter(function (r) {
    if (tipo && r.tipo !== tipo) return false;
    if (vis && r.visibilita !== vis) return false;
    if (q) {
      var hay = [r.titolo, r.sommario, r.tags, r.categoria].join(" ").toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });

  if (!rows.length) {
    box.innerHTML = '<p class="empty-text">Nessuna risorsa trovata.</p>';
    return;
  }

  box.innerHTML = rows.map(function (r) {
    return '<div class="admin-card" style="margin-bottom:.65rem">' +
      '<div class="admin-card-head"><div>' +
        "<strong>" + esc(r.titolo) + "</strong>" +
        '<div class="meta">' + esc(TIPI[r.tipo] || r.tipo) + " · " + esc(CAT[r.categoria] || r.categoria) +
          " · " + (r.visibilita === "pubblico" ? "Pubblico" : "Soci") +
          " · " + (r.pubblicato ? "pubblicata" : "bozza") +
          " · ord " + (r.ordine != null ? r.ordine : 0) +
          (r.private_path ? " · 📎 file" : "") +
        "</div>" +
        (r.sommario ? '<p class="card-desc">' + esc(r.sommario) + "</p>" : "") +
      "</div>" +
      '<div style="display:flex;gap:.35rem;flex-wrap:wrap">' +
        '<button type="button" class="btn-sm rsa-edit" data-id="' + esc(r.id) + '">Modifica</button>' +
        '<button type="button" class="btn-danger-sm rsa-del" data-id="' + esc(r.id) + '">Elimina</button>' +
      "</div></div></div>";
  }).join("");

  box.querySelectorAll(".rsa-edit").forEach(function (b) {
    b.onclick = function () {
      var item = cache.find(function (x) { return String(x.id) === b.getAttribute("data-id"); });
      if (item) fillForm(item);
    };
  });
  box.querySelectorAll(".rsa-del").forEach(function (b) {
    b.onclick = function () { delItem(b.getAttribute("data-id")); };
  });
}

async function loadList() {
  if (!tableOk) return;
  if (loading) return;
  loading = true;
  var box = $("rsa-list");
  if (box) box.innerHTML = '<p class="loading-text">Caricamento…</p>';
  try {
    var r = await CVI.supabase.from("risorse")
      .select("*")
      .order("ordine", { ascending: true })
      .order("created_at", { ascending: false });
    if (r.error) throw r.error;
    cache = r.data || [];
    renderList();
  } catch (e) {
    if (isMissing(e)) {
      tableOk = false;
      var h = $("rsa-sql-hint");
      if (h) h.style.display = "block";
      showMissingTable(box);
    } else if (box) {
      box.innerHTML = '<p class="empty-text" style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  } finally {
    loading = false;
  }
}

async function initTable() {
  for (var i = 0; i < 12; i++) {
    try {
      var r = await CVI.supabase.from("risorse").select("id").limit(1);
      if (!r.error) { tableOk = true; break; }
      if (isMissing(r.error)) { tableOk = false; break; }
    } catch (e) {
      if (isMissing(e)) { tableOk = false; break; }
    }
    await new Promise(function (res) { setTimeout(res, 500); });
  }

  var hint = $("rsa-sql-hint");
  if (hint) hint.style.display = tableOk ? "none" : "block";
  var save = $("rsa-save");
  if (save) save.disabled = !tableOk;

  if (tableOk) {
    hideLegacy();
    loadList();
  } else {
    showMissingTable($("rsa-list"));
  }
}

function wireAdmin() {
  $("rsa-tipo").onchange = syncFields;
  $("rsa-save").onclick = saveItem;
  $("rsa-reset").onclick = resetForm;
  $("rsa-search").oninput = renderList;
  $("rsa-filter-tipo").onchange = renderList;
  $("rsa-filter-vis").onchange = renderList;
  resetForm();
}

function boot(attempt) {
  attempt = attempt || 0;
  if (!window.CVI || !CVI.supabase) {
    if (attempt < 40) setTimeout(function () { boot(attempt + 1); }, 250);
    return;
  }
  if (!ensureUI()) {
    if (attempt < 40) setTimeout(function () { boot(attempt + 1); }, 250);
    return;
  }
  wireAdmin();
  initTable();

  var n = 0;
  var t = setInterval(function () {
    if (tableOk) hideLegacy();
    if (++n > 30) clearInterval(t);
  }, 500);

  var tabs = document.querySelector(".admin-tabs");
  if (tabs && window.MutationObserver) {
    new MutationObserver(function () { if (tableOk) hideLegacy(); })
      .observe(tabs, { childList: true });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () { boot(0); });
} else {
  boot(0);
}

})();

