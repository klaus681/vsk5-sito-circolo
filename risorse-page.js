/* CVI – Download e Risorse: pagina unica per file, schede, video e link */
(function () {
"use strict";

var CAT_LABEL = {
  software: "Software", skin: "Skin", mappe: "Mappe", regolamenti: "Regolamenti",
  guide: "Guide", polar: "Polar", setup: "Setup", faq: "FAQ", altro: "Altro"
};
var TIPO_LABEL = { file: "File", scheda: "Scheda", video: "Video", link: "Link" };
var TIPO_ICON = { file: "📦", scheda: "📘", video: "▶️", link: "🔗" };

var state = { tipo: "tutti", cat: "tutte", q: "", sort: "ordine" };
var items = [];
var isLoggedIn = false;
var legacyMode = false;
var legacyEmpty = false;

function $(id) { return document.getElementById(id); }

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function waitCVI() {
  return new Promise(function (resolve) {
    var n = 0;
    (function tick() {
      if (window.CVI && CVI.supabase) return resolve(true);
      if (++n > 100) return resolve(false);
      setTimeout(tick, 50);
    })();
  });
}

async function getSession() {
  try {
    var res = await CVI.supabase.auth.getSession();
    return (res.data && res.data.session) || null;
  } catch (e) {
    return null;
  }
}

function isMissing(err) {
  return /does not exist|schema cache|relation .* does not exist|42P01/i.test((err && err.message) || "");
}

function fileExt(r) {
  var s = String(r.private_path || r.url || "").split("?")[0].split("#")[0];
  var m = s.match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toUpperCase() : "";
}

function defaultMeta(r) {
  if (r.tipo === "file") return fileExt(r) || "File";
  if (r.tipo === "scheda") return "Lettura";
  if (r.tipo === "video") return "Video";
  return "Link";
}

function normalize(r) {
  r = r || {};
  r.id = String(r.id || "");
  r.tipo = String(r.tipo || "file").toLowerCase();
  r.categoria = String(r.categoria || "altro").toLowerCase();
  if (!CAT_LABEL[r.categoria]) r.categoria = "altro";
  r.visibilita = String(r.visibilita || "soci").toLowerCase() === "pubblico" ? "pubblico" : "soci";
  if (Array.isArray(r.tags)) r.tags = r.tags.filter(Boolean);
  else r.tags = String(r.tags || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
  if (!r.meta) r.meta = defaultMeta(r);
  return r;
}

function mapDownload(d) {
  var t = String(d.tipo || "").toLowerCase();
  return normalize({
    id: d.id,
    titolo: d.titolo,
    tipo: t === "link" ? "link" : "file",
    categoria: "altro",
    sommario: d.descrizione || "",
    corpo: "",
    meta: t ? t.toUpperCase() : "File",
    url: d.url || "",
    bucket: d.bucket || "",
    private_path: d.private_path || "",
    visibilita: "soci",
    pubblicato: true,
    ordine: d.ordine || 0,
    tags: [],
    _legacy: true
  });
}

function mapBiblioteca(b) {
  var cat = String(b.categoria || "").toLowerCase();
  if (cat === "video") cat = "guide";
  if (!CAT_LABEL[cat]) cat = "altro";
  var tipo = b.url_video ? "video" : (b.corpo ? "scheda" : "link");
  return normalize({
    id: b.id,
    titolo: b.titolo,
    tipo: tipo,
    categoria: cat,
    sommario: b.sommario || "",
    corpo: b.corpo || "",
    meta: tipo === "video" ? "Video" : (tipo === "scheda" ? "Lettura" : "Link"),
    url: b.url_file || b.url_esterno || "",
    url_video: b.url_video || "",
    visibilita: "soci",
    pubblicato: true,
    ordine: b.ordine || 0,
    tags: b.tags || "",
    _legacy: true
  });
}

async function loadLegacy() {
  legacyMode = true;
  legacyEmpty = false;
  items = [];
  if (!isLoggedIn) return;

  var out = [];
  try {
    var base = "id,titolo,descrizione,url,tipo,ordine,attivo";
    var d = await CVI.supabase.from("downloads")
      .select(base + ",bucket,private_path")
      .eq("attivo", true)
      .order("ordine", { ascending: true });
    if (d.error) {
      d = await CVI.supabase.from("downloads")
        .select(base)
        .eq("attivo", true)
        .order("ordine", { ascending: true });
    }
    if (!d.error) out = out.concat((d.data || []).map(mapDownload));
  } catch (e) { console.warn("downloads legacy:", e && e.message); }

  try {
    var b = await CVI.supabase.from("biblioteca")
      .select("*")
      .eq("pubblicato", true)
      .order("ordine", { ascending: true });
    if (!b.error) out = out.concat((b.data || []).map(mapBiblioteca));
  } catch (e) { console.warn("biblioteca legacy:", e && e.message); }

  legacyEmpty = out.length === 0;
  items = out;
}

async function load() {
  var grid = $("rs-grid");
  grid.innerHTML = '<p class="rs-loading">Caricamento risorse…</p>';

  try {
    var r = await CVI.supabase.from("risorse")
      .select("*")
      .eq("pubblicato", true)
      .order("ordine", { ascending: true })
      .order("created_at", { ascending: false });
    if (r.error) throw r.error;
    legacyMode = false;
    items = (r.data || []).map(normalize);
  } catch (e) {
    if (isMissing(e)) {
      await loadLegacy();
    } else {
      grid.innerHTML = '<p class="rs-loading" style="color:#f87171">Impossibile caricare le risorse: ' + esc(e.message || e) + "</p>";
      return;
    }
  }

  render();
}
function ytId(url) {
  if (!url) return null;
  var m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function filtered() {
  var rows = items.filter(function (r) {
    if (state.tipo !== "tutti" && r.tipo !== state.tipo) return false;
    if (state.cat !== "tutte" && r.categoria !== state.cat) return false;
    if (state.q) {
      var hay = [r.titolo, r.sommario, r.corpo, (r.tags || []).join(" "), CAT_LABEL[r.categoria]]
        .join(" ").toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  });

  if (state.sort === "az") {
    rows = rows.slice().sort(function (a, b) { return String(a.titolo).localeCompare(String(b.titolo), "it"); });
  } else if (state.sort === "recenti") {
    rows = rows.slice().sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
  } else {
    rows = rows.slice().sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); });
  }
  return rows;
}

function badgesHTML(r) {
  return '<span class="rs-badge t-' + esc(r.tipo) + '">' + TIPO_ICON[r.tipo] + " " + TIPO_LABEL[r.tipo] + "</span>" +
    '<span class="rs-badge cat">' + esc(CAT_LABEL[r.categoria] || r.categoria) + "</span>" +
    '<span class="rs-badge vis-' + esc(r.visibilita) + '">' + (r.visibilita === "pubblico" ? "Pubblico" : "Soci") + "</span>";
}

function actionHTML(r, locked) {
  if (locked) return '<button type="button" class="rs-btn locked" disabled>🔒 Solo soci</button>';

  if (r.tipo === "file") {
    var hasFile = !!(r.url || (r.bucket && r.private_path));
    return hasFile
      ? '<button type="button" class="rs-btn primary" data-dl="' + esc(r.id) + '">⬇ Scarica</button>'
      : '<button type="button" class="rs-btn locked" disabled>File non disponibile</button>';
  }
  if (r.tipo === "video") {
    return '<button type="button" class="rs-btn video" data-open="' + esc(r.id) + '">▶ Guarda</button>';
  }
  if (r.tipo === "link") {
    return r.url
      ? '<a class="rs-btn primary" href="' + esc(r.url) + '" target="_blank" rel="noopener">Apri link ↗</a>'
      : '<button type="button" class="rs-btn locked" disabled>Link non disponibile</button>';
  }
  return '<button type="button" class="rs-btn primary" data-open="' + esc(r.id) + '">Leggi</button>';
}

function cardHTML(r) {
  var locked = !isLoggedIn && r.visibilita === "soci";
  return '<article class="rs-card">' +
    '<div class="rs-badges">' + badgesHTML(r) + (locked ? '<span class="rs-badge" style="background:rgba(248,113,113,.12);color:#f87171">🔒 Bloccata</span>' : "") + "</div>" +
    "<h3>" + esc(r.titolo) + "</h3>" +
    (r.sommario ? '<p class="rs-sum">' + esc(r.sommario) + "</p>" : "") +
    '<div class="rs-meta"><span>' + esc(r.meta || defaultMeta(r)) + "</span></div>" +
    '<div class="rs-foot">' + actionHTML(r, locked) +
      '<button type="button" class="rs-btn ghost" data-open="' + esc(r.id) + '">Dettagli</button>' +
    "</div></article>";
}

function emptyMessage(rows) {
  if (!items.length) {
    if (!isLoggedIn) return "Nessuna risorsa pubblica al momento. <a href=\"accedi.html?redirect=risorse.html\">Accedi</a> per vedere i materiali riservati ai soci.";
    if (legacyEmpty) return "Nessun materiale disponibile al momento.";
    return "Nessuna risorsa pubblicata.";
  }
  if (!rows.length) return "Nessuna risorsa corrisponde ai filtri selezionati. <button type=\"button\" class=\"rs-btn ghost\" data-reset=\"1\">Azzera filtri</button>";
  return "";
}

function render() {
  var rows = filtered();
  var grid = $("rs-grid");
  var empty = $("rs-empty");

  grid.innerHTML = rows.map(cardHTML).join("");
  $("rs-count").textContent = String(rows.length);

  var msg = emptyMessage(rows);
  empty.innerHTML = msg;
  empty.classList.toggle("show", !!msg);

  grid.querySelectorAll("[data-open]").forEach(function (b) {
    b.onclick = function () { openModal(b.getAttribute("data-open")); };
  });
  grid.querySelectorAll("[data-dl]").forEach(function (b) {
    b.onclick = function () { download(b.getAttribute("data-dl")); };
  });
  grid.querySelectorAll("[data-reset]").forEach(function (b) {
    b.onclick = resetFilters;
  });
}

function byId(id) {
  return items.find(function (r) { return String(r.id) === String(id); });
}

function openModal(id) {
  var r = byId(id);
  if (!r) return;
  var locked = !isLoggedIn && r.visibilita === "soci";

  $("rs-modal-badges").innerHTML = badgesHTML(r);
  $("rs-modal-title").textContent = r.titolo || "";
  $("rs-modal-sum").textContent = r.sommario || "";
  $("rs-modal-body").textContent = locked
    ? "Contenuto riservato ai soci. Effettua l'accesso per consultarlo o scaricarlo."
    : (r.corpo || r.sommario || "");

  $("rs-modal-tags").innerHTML = (r.tags || []).map(function (t) {
    return '<span class="rs-tag">#' + esc(t) + "</span>";
  }).join("");

  var vid = $("rs-modal-video");
  var yid = (!locked && r.tipo === "video") ? ytId(r.url_video || r.url) : null;
  if (yid) {
    vid.style.display = "block";
    vid.innerHTML = '<iframe src="https://www.youtube.com/embed/' + yid +
      '" title="' + esc(r.titolo) + '" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
  } else {
    vid.style.display = "none";
    vid.innerHTML = "";
  }

  var acts = $("rs-modal-actions");
  var html = "";
  if (locked) {
    html = '<a class="rs-btn primary" href="accedi.html?redirect=risorse.html">Accedi per continuare</a>';
  } else if (r.tipo === "file") {
    html = '<button type="button" class="rs-btn primary" data-dl-modal="' + esc(r.id) + '">⬇ Scarica</button>';
  } else if (r.tipo === "link" && r.url) {
    html = '<a class="rs-btn primary" href="' + esc(r.url) + '" target="_blank" rel="noopener">Apri link ↗</a>';
  } else if (r.tipo === "video" && (r.url_video || r.url)) {
    html = '<a class="rs-btn video" href="' + esc(r.url_video || r.url) + '" target="_blank" rel="noopener">Apri il video ↗</a>';
  }
  html += '<button type="button" class="rs-btn ghost" data-close="1">Chiudi</button>';
  acts.innerHTML = html;
  acts.querySelectorAll("[data-close]").forEach(function (b) { b.onclick = closeModal; });
  var dl = acts.querySelector("[data-dl-modal]");
  if (dl) dl.onclick = function () { download(r.id); };

  $("rs-modal").classList.add("open");
  document.body.style.overflow = "hidden";
  try { history.replaceState(null, "", location.pathname + location.search + "#" + encodeURIComponent(r.id)); } catch (e) {}
}

function closeModal() {
  $("rs-modal").classList.remove("open");
  document.body.style.overflow = "";
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}

async function download(id) {
  var r = byId(id);
  if (!r) return;
  var needsAuth = !!r.private_path || r.visibilita === "soci";
  if (needsAuth && !isLoggedIn) {
    window.location.href = "accedi.html?redirect=risorse.html";
    return;
  }
  try {
    if (r.bucket && r.private_path && CVI.supabase.storage) {
      var res = await CVI.supabase.storage.from(r.bucket).createSignedUrl(r.private_path, 90);
      if (res.error) throw res.error;
      if (res.data && res.data.signedUrl) {
        window.open(res.data.signedUrl, "_blank", "noopener");
        return;
      }
    }
    if (r.url) {
      window.open(r.url, "_blank", "noopener");
      return;
    }
    alert("File non disponibile. Contatta un amministratore.");
  } catch (e) {
    var msg = (e && e.message) || String(e);
    if (/row-level|permission|not authorized|denied|403/i.test(msg)) {
      alert("Contenuto riservato ai soci approvati. Il tuo account potrebbe essere in attesa di approvazione.");
    } else {
      alert("Errore durante il download: " + msg);
    }
  }
}

function resetFilters() {
  state.tipo = "tutti";
  state.cat = "tutte";
  state.q = "";
  state.sort = "ordine";
  $("rs-q").value = "";
  $("rs-sort").value = "ordine";
  document.querySelectorAll("#rs-filter-tipo .rs-chip").forEach(function (c) {
    c.classList.toggle("active", c.getAttribute("data-tipo") === "tutti");
  });
  document.querySelectorAll("#rs-filter-cat .rs-chip").forEach(function (c) {
    c.classList.toggle("active", c.getAttribute("data-cat") === "tutte");
  });
  render();
}

function wire() {
  $("rs-q").addEventListener("input", function (e) {
    state.q = e.target.value.trim();
    render();
  });
  $("rs-sort").addEventListener("change", function (e) {
    state.sort = e.target.value;
    render();
  });
  document.querySelectorAll("#rs-filter-tipo .rs-chip").forEach(function (chip) {
    chip.onclick = function () {
      state.tipo = chip.getAttribute("data-tipo");
      document.querySelectorAll("#rs-filter-tipo .rs-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      render();
    };
  });
  document.querySelectorAll("#rs-filter-cat .rs-chip").forEach(function (chip) {
    chip.onclick = function () {
      state.cat = chip.getAttribute("data-cat");
      document.querySelectorAll("#rs-filter-cat .rs-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      render();
    };
  });

  $("rs-modal-close").onclick = closeModal;
  $("rs-modal").addEventListener("click", function (e) {
    if (e.target === $("rs-modal")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });
}

async function boot() {
  if (!(await waitCVI())) {
    $("rs-grid").innerHTML = '<p class="rs-loading" style="color:#f87171">Impossibile inizializzare il collegamento ai dati.</p>';
    return;
  }
  var session = await getSession();
  isLoggedIn = !!session;
  $("rs-guest").style.display = isLoggedIn ? "none" : "block";

  wire();
  await load();

  if (legacyMode) console.info("Download e Risorse: modalità compatibilità (esegui risorse-sql.sql per migrare).");

  if (location.hash) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (byId(id)) openModal(id);
  }
}

boot();

})();

