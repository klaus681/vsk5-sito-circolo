/* CVI Admin – sezione Regolamento */
(function () {
  "use strict";

  var DEFAULT_RULES = [
    { num: 1, title: "Fair Play e Condotta in Mare", body: "Il rispetto delle regole di regata ISAF virtuali è il pilastro del nostro circolo. Qualsiasi scorrettezza grave o comportamento antisportivo durante le prove ufficiali comporterà sanzioni o squalifiche dalla classifica generale." },
    { num: 2, title: "Classi di Imbarcazioni", body: "Le competizioni si svolgono principalmente sulla classe America's Cup Class (ACC/V5) o su altre classi concordate dal comitato di regata prima dell'inizio della stagione." },
    { num: 3, title: "Iscrizioni alle Regate", body: "<strong>Come iscriversi:</strong> dalla pagina <em>Calendario Gare</em>, premendo «Iscriviti» sulla gara desiderata (è necessario l'accesso). Puoi annullare la tua iscrizione con «Annulla iscrizione».<ul><li><strong>Chiusura iscrizioni:</strong> si chiudono <strong>2 ore prima</strong> dell'orario di partenza; oltre tale termine non è più possibile iscriversi o disiscriversi.</li><li><strong>Eventi aperti:</strong> gli eventi di tipo «aperto» <strong>non</strong> prevedono iscrizione né classifica.</li><li><strong>Chi può iscriversi:</strong> i soci registrati al circolo.</li></ul>" },
    { num: 4, title: "Tipi di Evento", body: "Gli eventi in calendario sono di tre tipi:<ul><li><strong>Ufficiale:</strong> gara del circolo con iscrizione e classifica.</li><li><strong>Speciale:</strong> evento speciale con iscrizione e classifica.</li><li><strong>Aperto:</strong> evento dimostrativo o amichevole, <strong>senza</strong> iscrizione e <strong>senza</strong> classifica.</li></ul>Il tipo di evento è indicato su ogni scheda gara in <em>Calendario Gare</em>." },
    { num: 5, title: "Formato delle Regate", body: "Ogni evento può comprendere da <strong>1 a 3 regate</strong>: il numero di prove è indicato sulla scheda della gara. La classifica dell'evento tiene conto dei risultati di tutte le prove disputate." },
    { num: 6, title: "Punteggi e Classifiche", body: "<strong>Sistema Low Point.</strong> Nelle singole prove vince chi totalizza meno punti (1° = 1 pt, 2° = 2 pt, …).<ul><li><strong>Singole regate / eventi:</strong> punti in base all'ordine di arrivo; eventuali scarti sono definiti a inizio stagione.</li><li><strong>Classifica generale (per anno):</strong> ogni regata conta per <em>tutti</em> i soci; chi non partecipa riceve punti di penalità pari al <strong>numero di partecipanti alla regata + 1</strong> (peggio dell'ultimo). La classifica è la somma di tutti i punti dell'anno e vi compaiono tutti i membri del circolo.</li></ul>" },
    { num: 7, title: "Stati dei Risultati", body: "<strong>OK:</strong> arrivo regolare; i punti sono assegnati in base alla posizione ottenuta.<ul><li><strong>DNF</strong> — non arrivato (Did Not Finish).</li><li><strong>DNS</strong> — non partito (Did Not Start).</li><li><strong>DSQ</strong> — squalificato (Disqualified).</li><li><strong>RET</strong> — ritirato (Retired).</li><li><strong>DNC</strong> — non iscritto / non presente (Did Not Compete): usato in classifica generale per chi non ha partecipato.</li></ul>" },
    { num: 8, title: "Proteste e Reclami", body: "Le proteste relative a una regata ufficiale possono essere presentate dalla pagina <em>Proteste</em> entro i termini indicati dal comitato. Ogni protesta deve indicare la gara, lo skipper protestato, la regola eventualmente violata e una descrizione dei fatti. Il comitato di regata esamina le proteste e comunica l'esito (accolta, respinta, in esame)." },
    { num: 9, title: "Squadre e Team", body: "I soci possono appartenere a una <strong>squadra</strong> (team). Ogni squadra ha un nome, una descrizione, un <strong>logo</strong> e un <strong>colore</strong> identificativo, ed è mostrata pubblicamente nella pagina <em>Team</em> con l'elenco dei membri. L'appartenenza a una squadra non incide sui punteggi individuali in classifica." },
    { num: 10, title: "Sanzioni e Penalità", body: "In caso di violazioni del presente regolamento o di comportamento antisportivo, la Direzione di Regata può applicare:<ul><li>un <strong>richiamo</strong> o un'ammonizione;</li><li>una <strong>penalità</strong> in punti o la squalifica dalla singola prova;</li><li>la <strong>squalifica dalla classifica</strong> generale o dall'evento, nei casi più gravi o in caso di recidiva.</li></ul>Le sanzioni possono riguardare anche la condotta nei canali ufficiali del circolo (es. Discord)." },
    { num: 11, title: "Albo d'Oro", body: "L'<em>Albo d'Oro</em> raccoglie i vincitori di ogni evento del circolo. I vincitori vengono registrati automaticamente al termine dell'inserimento dei risultati di una gara." }
  ];

  var _loadedOnce = false;

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }

  function notify(msg, type) {
    if (typeof status === "function") {
      status(msg, type);
      return;
    }
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (type ? " " + type : "");
    clearTimeout(notify._t);
    if (msg) notify._t = setTimeout(function () {
      el.textContent = "";
      el.className = "admin-status";
    }, 4000);
  }

  function panelHTML() {
    return (
      '<div class="admin-card">' +
      '<h3 style="margin:0 0 0.5rem;color:#7dd3fc">Regolamento ufficiale</h3>' +
      '<p style="color:#94a3b8;font-size:0.88rem;margin:0 0 1rem">Modifica titoli e testi delle sezioni. Supporta HTML semplice (strong, em, ul, li). Dopo il salvataggio la pagina pubblica legge i contenuti aggiornati.</p>' +
      '<div class="form-grid" style="margin-bottom:1rem">' +
      '<div><label class="adm-label" for="reg-version">Versione</label><input class="adm-input" id="reg-version" style="width:100%;max-width:20rem" placeholder="Versione 1.0"></div>' +
      '<div><label class="adm-label" for="reg-updated">Ultimo aggiornamento</label><input class="adm-input" id="reg-updated" style="width:100%;max-width:20rem" placeholder="ottobre 2026"></div>' +
      '</div>' +
      '<div id="reg-rules-list"></div>' +
      '<div class="form-actions" style="margin-top:1rem;flex-wrap:wrap">' +
      '<button type="button" class="btn-primary" id="reg-save-btn">Salva regolamento</button>' +
      '<button type="button" class="btn-sm" id="reg-add-btn">+ Aggiungi sezione</button>' +
      '<button type="button" class="btn-ghost" id="reg-reset-btn">Ripristina default</button>' +
      '<a href="regolamento.html" target="_blank" rel="noopener" class="btn-ghost" style="text-decoration:none;display:inline-flex;align-items:center">Apri pagina pubblica →</a>' +
      '</div>' +
      '<p id="reg-hint" style="margin:0.75rem 0 0;font-size:0.82rem;color:#94a3b8;display:none"></p>' +
      '</div>'
    );
  }

  function ensureUI() {
    var tabs = document.querySelector(".admin-tabs");
    if (!tabs) return false;

    var tab = tabs.querySelector('[data-tab="regolamento"]');
    if (!tab) {
      tab = document.createElement("button");
      tab.type = "button";
      tab.className = "admin-tab";
      tab.setAttribute("data-tab", "regolamento");
      tab.textContent = "Regolamento";
      var exportTab = tabs.querySelector('[data-tab="export"]');
      if (exportTab) tabs.insertBefore(tab, exportTab);
      else tabs.appendChild(tab);
    }

    var panel = document.getElementById("panel-regolamento");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "panel-regolamento";
      panel.className = "admin-panel";
      var exportPanel = document.getElementById("panel-export");
      if (exportPanel && exportPanel.parentNode) {
        exportPanel.parentNode.insertBefore(panel, exportPanel);
      } else {
        var app = document.getElementById("admin-app");
        if (app) app.appendChild(panel);
        else return false;
      }
    }

    if (!document.getElementById("reg-rules-list")) {
      panel.innerHTML = panelHTML();
    }

    return true;
  }

  function renderRules(rules) {
    var box = document.getElementById("reg-rules-list");
    if (!box) return;
    if (!rules || !rules.length) {
      box.innerHTML = '<p class="empty-text">Nessuna sezione. Aggiungine una.</p>';
      return;
    }
    box.innerHTML = rules
      .map(function (r, i) {
        return (
          '<div class="admin-card reg-rule-card" data-idx="' +
          i +
          '" style="margin-bottom:0.75rem">' +
          '<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap">' +
          '<span style="background:rgba(56,189,248,0.15);color:#7dd3fc;font-weight:800;font-size:0.8rem;padding:0.2rem 0.55rem;border-radius:6px;min-width:1.6rem;text-align:center">' +
          esc(String(r.num != null ? r.num : i + 1)) +
          "</span>" +
          '<input class="adm-input reg-title" style="flex:1;min-width:12rem" value="' +
          esc(r.title || "") +
          '" placeholder="Titolo sezione">' +
          '<button type="button" class="btn-danger-sm reg-del" data-idx="' +
          i +
          '">Elimina</button>' +
          "</div>" +
          '<label class="adm-label">Testo (HTML consentito)</label>' +
          '<textarea class="adm-input reg-body" rows="4" style="width:100%;font-family:ui-monospace,monospace;font-size:0.85rem">' +
          esc(r.body || "") +
          "</textarea>" +
          "</div>"
        );
      })
      .join("");

    box.querySelectorAll(".reg-del").forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute("data-idx"), 10);
        var data = collectFromUI();
        if (!data.rules[idx]) return;
        if (!confirm('Eliminare la sezione «' + (data.rules[idx].title || idx + 1) + '»?')) return;
        data.rules.splice(idx, 1);
        renumber(data.rules);
        renderRules(data.rules);
      };
    });
  }

  function renumber(rules) {
    rules.forEach(function (r, i) {
      r.num = i + 1;
    });
  }

  function collectFromUI() {
    var version = (document.getElementById("reg-version") || {}).value || "";
    var updated = (document.getElementById("reg-updated") || {}).value || "";
    var cards = document.querySelectorAll(".reg-rule-card");
    var rules = [];
    cards.forEach(function (card, i) {
      var titleEl = card.querySelector(".reg-title");
      var bodyEl = card.querySelector(".reg-body");
      rules.push({
        num: i + 1,
        title: titleEl ? titleEl.value.trim() : "",
        body: bodyEl ? bodyEl.value.trim() : ""
      });
    });
    return { version: version.trim(), updated: updated.trim(), rules: rules };
  }

  async function loadRegolamento(force) {
    if (!ensureUI()) return;
    if (_loadedOnce && !force && document.getElementById("reg-rules-list") && document.querySelector(".reg-rule-card")) {
      wireButtons();
      return;
    }

    var hint = document.getElementById("reg-hint");
    try {
      if (!window.CVI || !CVI.supabase) throw new Error("Supabase non disponibile");
      var res = await CVI.supabase
        .from("site_settings")
        .select("key,value")
        .eq("key", "regolamento_json")
        .maybeSingle();
      if (res.error) throw res.error;

      var data = null;
      if (res.data && res.data.value) {
        try {
          data = typeof res.data.value === "string" ? JSON.parse(res.data.value) : res.data.value;
        } catch (e) {
          data = null;
        }
      }

      if (!data || !Array.isArray(data.rules) || !data.rules.length) {
        data = {
          version: "Versione 1.0",
          updated: "Ultimo aggiornamento: ottobre 2026",
          rules: DEFAULT_RULES.slice()
        };
        if (hint) {
          hint.style.display = "block";
          hint.style.color = "#94a3b8";
          hint.textContent =
            "Nessun regolamento salvato su database: mostro i valori di default. Salva per pubblicarli.";
        }
      } else if (hint) {
        hint.style.display = "block";
        hint.style.color = "#94a3b8";
        hint.textContent = "Contenuti caricati da site_settings (regolamento_json).";
      }

      var vEl = document.getElementById("reg-version");
      var uEl = document.getElementById("reg-updated");
      if (vEl) vEl.value = data.version || "";
      if (uEl) uEl.value = data.updated || "";
      renderRules(data.rules);
      wireButtons();
      _loadedOnce = true;
    } catch (e) {
      if (hint) {
        hint.style.display = "block";
        hint.style.color = "#f87171";
        hint.textContent =
          "Errore caricamento: " +
          (e.message || e) +
          " — verifica tabella site_settings.";
      }
      var vEl2 = document.getElementById("reg-version");
      var uEl2 = document.getElementById("reg-updated");
      if (vEl2) vEl2.value = "Versione 1.0";
      if (uEl2) uEl2.value = "Ultimo aggiornamento: ottobre 2026";
      renderRules(DEFAULT_RULES.slice());
      wireButtons();
      _loadedOnce = true;
    }
  }

  async function saveRegolamento() {
    var data = collectFromUI();
    if (!data.rules.length) {
      alert("Aggiungi almeno una sezione.");
      return;
    }
    for (var i = 0; i < data.rules.length; i++) {
      if (!data.rules[i].title) {
        alert("La sezione " + (i + 1) + " non ha un titolo.");
        return;
      }
    }
    var btn = document.getElementById("reg-save-btn");
    if (btn) btn.disabled = true;
    try {
      if (!window.CVI || !CVI.supabase) throw new Error("Supabase non disponibile");
      var payload = JSON.stringify(data);
      var r = await CVI.supabase.from("site_settings").upsert(
        {
          key: "regolamento_json",
          value: payload,
          updated_at: new Date().toISOString()
        },
        { onConflict: "key" }
      );
      if (r.error) throw r.error;
      notify("Regolamento salvato", "ok");
      var hint = document.getElementById("reg-hint");
      if (hint) {
        hint.style.display = "block";
        hint.style.color = "#34d399";
        hint.textContent = "Salvato. La pagina pubblica mostrerà questi contenuti al prossimo caricamento.";
      }
    } catch (e) {
      notify(e.message || e, "err");
      alert(
        "Errore salvataggio: " +
          (e.message || e) +
          "\n\nAssicurati che esista la tabella site_settings con colonna key (unique) e value (text)."
      );
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function addRule() {
    var data = collectFromUI();
    data.rules.push({
      num: data.rules.length + 1,
      title: "Nuova sezione",
      body: ""
    });
    renderRules(data.rules);
  }

  function resetDefault() {
    if (!confirm("Ripristinare i testi di default? (non salva finché non premi Salva)")) return;
    var vEl = document.getElementById("reg-version");
    var uEl = document.getElementById("reg-updated");
    if (vEl) vEl.value = "Versione 1.0";
    if (uEl) uEl.value = "Ultimo aggiornamento: ottobre 2026";
    renderRules(DEFAULT_RULES.slice());
    notify("Default caricati (non ancora salvati)", "ok");
  }

  function wireButtons() {
    var saveBtn = document.getElementById("reg-save-btn");
    if (saveBtn && !saveBtn._wired) {
      saveBtn._wired = true;
      saveBtn.onclick = saveRegolamento;
    }
    var addBtn = document.getElementById("reg-add-btn");
    if (addBtn && !addBtn._wired) {
      addBtn._wired = true;
      addBtn.onclick = addRule;
    }
    var resetBtn = document.getElementById("reg-reset-btn");
    if (resetBtn && !resetBtn._wired) {
      resetBtn._wired = true;
      resetBtn.onclick = resetDefault;
    }
  }

  function isRegPanelActive() {
    var panel = document.getElementById("panel-regolamento");
    var tab = document.querySelector('.admin-tab[data-tab="regolamento"]');
    return (
      (panel && panel.classList.contains("active")) ||
      (tab && tab.classList.contains("active"))
    );
  }

  function tryLoadIfActive() {
    if (isRegPanelActive()) {
      loadRegolamento(false);
    }
  }

  function wireTab() {
    if (!ensureUI()) return;

    var tab = document.querySelector('.admin-tab[data-tab="regolamento"]');
    if (tab && !tab._regListener) {
      tab._regListener = true;
      tab.addEventListener(
        "click",
        function () {
          setTimeout(function () {
            loadRegolamento(false);
          }, 50);
        },
        true
      );
    }

    tryLoadIfActive();
  }

  window.loadRegolamentoAdmin = function () {
    loadRegolamento(true);
  };

  function boot() {
    wireTab();
    setTimeout(wireTab, 400);
    setTimeout(wireTab, 1000);
    setTimeout(wireTab, 2000);
    setTimeout(wireTab, 4000);

    var n = 0;
    var iv = setInterval(function () {
      n++;
      tryLoadIfActive();
      if (n > 60) clearInterval(iv);
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
