/* CVI – "Siti amici & link utili" (pagina siti-amici.html)
   I link sono gestiti dal pannello Admin → Siti amici (tabella public.siti_amici).

   Comportamento:
   - il componente viene mostrato solo nella pagina dedicata (#siti-amici-page);
   - cache locale (localStorage) per un render immediato;
   - se la tabella/il DB non risponde si mostrano i link di fallback;
   - se l'admin svuota la lista (0 link attivi) la sezione non viene mostrata.
*/
(function () {
  "use strict";

  var TABLE = "siti_amici";
  var CACHE_KEY = "cvi_siti_amici_v1";
  var CACHE_TTL = 10 * 60 * 1000; // 10 minuti
  var SECTION_ID = "cvi-link-amici";
  var LANGS = ["en", "fr", "es"];

  var FIELDS_BASE = "nome,url,descrizione,emoji,ordine";
  var FIELDS_I18N =
    FIELDS_BASE + ",nome_en,nome_fr,nome_es,descrizione_en,descrizione_fr,descrizione_es";

  /* ultima lista valida renderizzata: serve anche a ripristinare il banner
     se un altro script dovesse rimuoverlo dal DOM */
  var lastItems = [];

  /* Mostrati solo se la lettura da Supabase fallisce (DB irraggiungibile,
     tabella non ancora creata, ecc.). Se l'admin disattiva tutti i link
     il banner viene nascosto e questo elenco NON viene usato. */
  var FALLBACK = [
    {
      nome: "Federazione Italiana Vela",
      url: "https://www.federvela.it/",
      descrizione: "FIV – la federazione della vela italiana",
      emoji: "🇮🇹",
      ordine: 10
    },
    {
      nome: "World Sailing",
      url: "https://www.sailing.org/",
      descrizione: "La federazione internazionale della vela",
      emoji: "🌍",
      ordine: 20
    },
    {
      nome: "Virtual Skipper",
      url: "https://www.virtualskipper-game.com/",
      descrizione: "Il simulatore di regate su cui corriamo",
      emoji: "⛵",
      ordine: 30
    },
    {
      nome: "Community CVI su Discord",
      url: "https://discord.gg/Z4FUc79hX8",
      descrizione: "Il server ufficiale del circolo",
      emoji: "💬",
      ordine: 40
    }
  ];

  var STYLE =
    ".lb-strip{margin:1.5rem 0 0}" +
    ".lb-strip.is-page{margin:0}" +
    ".lb-strip.is-page .lb-strip-inner{padding:1.1rem 1.2rem}" +
    ".lb-strip-inner{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(56,189,248,.10) 0%,rgba(15,23,42,.55) 45%,var(--card-bg,#111827) 100%);border:1px solid rgba(56,189,248,.26);border-radius:16px;padding:1.15rem 1.35rem 1.3rem;box-shadow:0 10px 30px rgba(0,0,0,.28)}" +
    ".lb-strip-inner::before{content:\"\";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#38bdf8,#22d3ee,#38bdf8);pointer-events:none}" +
    ".lb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem 1rem;flex-wrap:wrap;margin-bottom:.95rem}" +
    ".lb-eyebrow{display:inline-block;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0b0f19;background:linear-gradient(135deg,#38bdf8,#7dd3fc);padding:.2rem .6rem;border-radius:999px;margin-bottom:.4rem}" +
    ".lb-title{margin:0;font-size:1.15rem;font-weight:700;color:#fff;line-height:1.25}" +
    ".lb-sub{margin:0;font-size:.82rem;color:#94a3b8}" +
    ".lb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:.7rem}" +
    ".lb-card{display:flex;gap:.7rem;align-items:flex-start;text-decoration:none;background:rgba(15,23,42,.62);border:1px solid rgba(56,189,248,.2);border-radius:12px;padding:.8rem .9rem;transition:border-color .2s ease,transform .2s ease,box-shadow .2s ease,background .2s ease;min-width:0}" +
    ".lb-card:hover,.lb-card:focus-visible{border-color:rgba(56,189,248,.65);background:rgba(21,32,51,.9);transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.3);outline:none}" +
    ".lb-ico{flex:0 0 auto;width:2.15rem;height:2.15rem;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:1.05rem;line-height:1;background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.28)}" +
    ".lb-txt{display:block;min-width:0}" +
    ".lb-name{display:block;color:#e2e8f0;font-weight:700;font-size:.93rem;line-height:1.25;word-break:break-word}" +
    ".lb-desc{display:block;color:#94a3b8;font-size:.79rem;line-height:1.35;margin-top:.18rem}" +
    ".lb-go{display:inline-block;margin-top:.32rem;color:#7dd3fc;font-size:.76rem;font-weight:700}" +
    ".lb-card:hover .lb-go{color:#bae6fd}" +
    ".lb-skel{height:3.4rem;border-radius:12px;background:linear-gradient(90deg,rgba(148,163,184,.08),rgba(148,163,184,.18),rgba(148,163,184,.08));background-size:200% 100%;animation:lb-shimmer 1.4s linear infinite}" +
    "@keyframes lb-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}" +
    "@media(max-width:520px){.lb-grid{grid-template-columns:1fr}.lb-strip-inner{padding:1rem 1.05rem 1.1rem}}" +
    "@media(prefers-reduced-motion:reduce){.lb-skel{animation:none}.lb-card{transition:none}}";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* Stringa tradotta dal dizionario condiviso (cvi-core.js). */
  function tr(key, fallback) {
    return window.CVI && typeof window.CVI.t === "function"
      ? window.CVI.t(key, fallback)
      : fallback;
  }

  function isHttpUrl(url) {
    return /^https?:\/\/[^\s]+$/i.test(String(url || "").trim());
  }

  /* Valore tradotto del record per la lingua corrente, con fallback
     sull'italiano (i campi extra sono opzionali: se la migrazione SQL
     non è stata eseguita restano undefined e si usa il testo base). */
  function localized(link, field) {
    var lang = (window.CVI && window.CVI.currentLang) || "it";
    if (LANGS.indexOf(lang) !== -1) {
      var v = link[field + "_" + lang];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return link[field] != null ? String(link[field]).trim() : "";
  }

  /* Pulisce e ordina i dati che arrivano da Supabase / cache / fallback. */
  function normalize(rows) {
    var out = [];
    (rows || []).forEach(function (r) {
      if (!r || !r.nome || !isHttpUrl(r.url)) return;
      out.push({
        nome: String(r.nome).trim(),
        url: String(r.url).trim(),
        descrizione: r.descrizione ? String(r.descrizione).trim() : "",
        emoji: r.emoji ? String(r.emoji).trim() : "⚓",
        ordine: Number(r.ordine) || 0,
        nome_en: r.nome_en || "",
        nome_fr: r.nome_fr || "",
        nome_es: r.nome_es || "",
        descrizione_en: r.descrizione_en || "",
        descrizione_fr: r.descrizione_fr || "",
        descrizione_es: r.descrizione_es || ""
      });
    });
    out.sort(function (a, b) {
      return a.ordine - b.ordine || a.nome.localeCompare(b.nome, "it");
    });
    return out;
  }

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.items)) return null;
      if (Date.now() - (Number(obj.ts) || 0) > CACHE_TTL) return null;
      return normalize(obj.items);
    } catch (e) {
      return null;
    }
  }

  function writeCache(items) {
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), items: items })
      );
    } catch (e) {
      /* storage pieno / disabilitato: non è un problema */
    }
  }

  function ensureStyle() {
    if (document.getElementById("lb-home-styles")) return;
    var st = document.createElement("style");
    st.id = "lb-home-styles";
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  function ensureSection() {
    /* Solo nella pagina dedicata: in Home il blocco non esiste più. */
    var host = document.getElementById("siti-amici-page");
    if (!host) return null;

    var section = document.getElementById(SECTION_ID);
    if (section) return section;

    ensureStyle();

    section = document.createElement("section");
    section.id = SECTION_ID;
    section.className = "lb-strip is-page";
    section.setAttribute("aria-labelledby", "siti-amici-page-title");
    section.innerHTML =
      '<div class="lb-strip-inner">' +
      '<div class="lb-body" id="lb-body" aria-live="polite">' +
      '<div class="lb-grid" aria-hidden="true">' +
      '<div class="lb-skel"></div><div class="lb-skel"></div><div class="lb-skel"></div>' +
      "</div></div></div>";

    host.appendChild(section);
    return section;
  }

  function cardHtml(link) {
    var newTab = tr("opens_new_tab", "si apre in una nuova scheda");
    var nome = localized(link, "nome");
    var descrizione = localized(link, "descrizione");
    var label = descrizione
      ? nome + " – " + descrizione + " (" + newTab + ")"
      : nome + " (" + newTab + ")";
    return (
      '<a class="lb-card" href="' +
      esc(link.url) +
      '" target="_blank" rel="noopener noreferrer nofollow" aria-label="' +
      esc(label) +
      '">' +
      '<span class="lb-ico" aria-hidden="true">' +
      esc(link.emoji || "⚓") +
      "</span>" +
      '<span class="lb-txt">' +
      '<span class="lb-name">' +
      esc(nome) +
      "</span>" +
      (descrizione
        ? '<span class="lb-desc">' + esc(descrizione) + "</span>"
        : "") +
      '<span class="lb-go">' + esc(tr("friends_visit", "Visita")) + ' →</span>' +
      "</span></a>"
    );
  }

  function render(items) {
    var body = document.getElementById("lb-body");
    var section = document.getElementById(SECTION_ID);
    if (!body || !section) return;

    items = normalize(items);
    if (!items.length) {
      lastItems = [];
      /* Lista volutamente vuota (tutti i link disattivati): niente banner. */
      if (section.parentNode) section.parentNode.removeChild(section);
      return;
    }

    lastItems = items;
    body.innerHTML =
      '<div class="lb-grid">' + items.map(cardHtml).join("") + "</div>";
  }

  /* Riallinea titolo/sottotitolo/link quando cambia la lingua. */
  function refreshStrings() {
    var section = document.getElementById(SECTION_ID);
    if (!section) return;
    var eyebrow = section.querySelector(".lb-eyebrow");
    var title = section.querySelector(".lb-title");
    var sub = section.querySelector(".lb-sub");
    if (eyebrow) eyebrow.textContent = tr("friends_eyebrow", "Community");
    if (title) title.textContent = tr("friends_title", "Siti amici & link utili");
    if (sub) sub.textContent = tr("friends_sub", "Realtà e risorse che seguiamo");
    if (lastItems.length) render(lastItems);
  }

  var loading = false;
  var lastLoad = 0;

  async function load(force) {
    if (loading) return;
    var now = Date.now();
    if (!force && now - lastLoad < 800) return;
    loading = true;
    lastLoad = now;
    try {
      if (!window.CVI || !window.CVI.supabase) {
        throw new Error("client Supabase non disponibile");
      }
      /* I campi tradotti sono opzionali: se la migrazione SQL non è ancora
         stata eseguita la query fallisce e si riprova con i soli campi base. */
      var res = await window.CVI.supabase
        .from(TABLE)
        .select(FIELDS_I18N)
        .eq("attivo", true)
        .order("ordine", { ascending: true });

      if (res.error) {
        res = await window.CVI.supabase
          .from(TABLE)
          .select(FIELDS_BASE)
          .eq("attivo", true)
          .order("ordine", { ascending: true });
      }

      if (res.error) throw res.error;

      var items = normalize(res.data);
      writeCache(items);
      render(items);
    } catch (e) {
      if (window.console) {
        console.warn(
          "[CVI siti amici] lettura non riuscita:",
          (e && (e.message || e)) || e
        );
      }
      var cached = readCache();
      render(cached && cached.length ? cached : normalize(FALLBACK));
    } finally {
      loading = false;
    }
  }

  function boot() {
    if (!ensureSection()) return;

    /* cambio lingua: aggiorna testi fissi e schede */
    document.addEventListener("cvi:langchange", refreshStrings);

    /* 1) mostra subito la cache, se c'è (nessun flicker) */
    var cached = readCache();
    if (cached && cached.length) render(cached);

    /* 2) poi aggiorna dal database */
    load(true);

    /* 3) riallinea quando si torna sulla scheda o l'admin salva altrove */
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) load();
    });
    window.addEventListener("storage", function (ev) {
      if (ev.key === CACHE_KEY) load(true);
    });
    window.addEventListener("focus", function () {
      load();
    });

    /* 4) se un altro script rimuove il contenitore, lo rimettiamo */
    var host = document.getElementById("siti-amici-page");
    if (host && window.MutationObserver) {
      try {
        new window.MutationObserver(function () {
          if (!lastItems.length) return;
          if (document.getElementById(SECTION_ID)) return;
          var sec = ensureSection();
          if (sec) render(lastItems);
        }).observe(host, { childList: true });
      } catch (e) {
        /* observer non disponibile: nessun problema */
      }
    }
  }

  /* API usata dal pannello admin per forzare l'aggiornamento */
  window.CVISitiAmici = {
    load: function () {
      return load(true);
    },
    render: render,
    cacheKey: CACHE_KEY
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
