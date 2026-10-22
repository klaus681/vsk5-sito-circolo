/* CVI – Serie Aperte UI bootstrap (crea tab/pannello se mancano) */
(function () {
  "use strict";

  var PANEL_HTML =
    '<div class="admin-card">' +
    '<h3 id="sa-form-title" style="margin:0 0 0.75rem;color:#7dd3fc">Nuova serie aperta</h3>' +
    '<p style="color:#94a3b8;font-size:0.88rem;margin:0 0 0.75rem">Classifiche Low Point per skipper non soci (FIN, DNF, DNS, DSQ, RET). Separate dalla classifica ufficiale.</p>' +
    '<form id="sa-form" class="form-grid">' +
    '<input type="hidden" id="sa-id">' +
    '<div><label class="adm-label" for="sa-titolo">Titolo serie *</label><input class="adm-input" id="sa-titolo" required style="width:100%" placeholder="Es. Serie Settimanale Ottobre 2026"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">' +
    '<div><label class="adm-label" for="sa-inizio">Data inizio</label><input type="date" class="adm-input" id="sa-inizio" style="width:100%"></div>' +
    '<div><label class="adm-label" for="sa-fine">Data fine</label><input type="date" class="adm-input" id="sa-fine" style="width:100%"></div>' +
    "</div>" +
    '<div><label class="adm-label" for="sa-scarti">Scarti</label><input type="number" min="0" max="10" class="adm-input" id="sa-scarti" value="0" style="width:6rem"></div>' +
    '<div><label class="adm-label" for="sa-desc">Descrizione</label><textarea class="adm-input" id="sa-desc" rows="2" style="width:100%"></textarea></div>' +
    '<div style="display:flex;gap:1rem;flex-wrap:wrap">' +
    '<label style="color:#e2e8f0;font-size:0.88rem"><input type="checkbox" id="sa-pub"> Pubblicata</label>' +
    '<label style="color:#e2e8f0;font-size:0.88rem"><input type="checkbox" id="sa-home"> Mostra in Home</label>' +
    "</div>" +
    '<div class="form-actions">' +
    '<button type="submit" class="btn-primary" id="sa-save">Salva serie</button>' +
    '<button type="button" class="btn-ghost" id="sa-cancel" style="display:none">Annulla</button>' +
    "</div></form></div>" +
    '<div id="serie-aperte-list" style="margin-top:1rem"><p class="loading-text">Apri questa scheda per caricare.</p></div>' +
    '<div id="sa-regate-panel" class="admin-card" style="display:none;margin-top:1.25rem">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.85rem">' +
    '<h3 id="sa-regate-title" style="margin:0;color:#7dd3fc">Regate & Risultati</h3>' +
    '<button type="button" class="btn-ghost" id="sa-close-regate">Chiudi</button></div>' +
    '<div id="sa-classifica-preview" style="margin-bottom:1rem"></div>' +
    '<div id="sa-regate-list"><p class="loading-text">…</p></div>' +
    '<form id="sa-new-reg-form" class="form-grid" style="margin-top:1rem;border-top:1px solid rgba(255,255,255,0.08);padding-top:1rem">' +
    '<h4 style="margin:0;color:#e2e8f0;font-size:0.95rem">Aggiungi regata</h4>' +
    '<div><label class="adm-label" for="sa-new-reg-titolo">Titolo regata *</label><input class="adm-input" id="sa-new-reg-titolo" required style="width:100%" placeholder="Es. Regata 1"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">' +
    '<div><label class="adm-label" for="sa-new-reg-data">Data</label><input type="datetime-local" class="adm-input" id="sa-new-reg-data" style="width:100%"></div>' +
    '<div><label class="adm-label" for="sa-new-reg-ordine">Ordine</label><input type="number" class="adm-input" id="sa-new-reg-ordine" style="width:100%" placeholder="1"></div>' +
    '</div><div class="form-actions"><button type="submit" class="btn-primary">Aggiungi regata</button></div></form></div>' +
    '<div id="sa-ris-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;overflow:auto;padding:1.5rem">' +
    '<div class="admin-card" style="max-width:900px;margin:1rem auto">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.85rem">' +
    '<h3 id="sa-ris-reg-title" style="margin:0;color:#7dd3fc">Risultati</h3>' +
    '<button type="button" class="btn-ghost" id="sa-close-ris">Chiudi</button></div>' +
    '<input type="hidden" id="sa-ris-reg-id">' +
    '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.65rem;align-items:center">' +
    '<input type="file" id="sa-csv-file" accept=".csv,text/csv,text/plain" style="display:none">' +
    '<button type="button" class="btn-sm" id="sa-import-csv">⬆ Importa CSV</button>' +
    '<button type="button" class="btn-sm" id="sa-csv-template">Modello CSV</button>' +
    '<button type="button" class="btn-sm" id="sa-add-ris-row">+ Riga</button></div>' +
    '<p id="sa-csv-hint" style="margin:0 0 0.5rem;font-size:0.78rem;color:#94a3b8">CSV: <strong>Stato;Posizione;Nickname;Team;Note</strong></p>' +
    '<details style="margin:0 0 0.6rem"><summary style="cursor:pointer;font-size:0.8rem;color:#7dd3fc;font-weight:600">Incolla testo CSV</summary>' +
    '<textarea id="sa-csv-text" class="adm-input" rows="5" style="width:100%;margin-top:0.5rem;font-family:ui-monospace,monospace;font-size:0.82rem" placeholder="Stato;Posizione;Nickname;Team;Note"></textarea>' +
    '<button type="button" class="btn-sm" id="sa-import-csv-text" style="margin-top:0.4rem">Compila dalle righe</button></details>' +
    '<table class="admin-table"><thead><tr><th>Stato</th><th>Pos</th><th>Nickname</th><th>Team</th><th>Note</th><th></th></tr></thead>' +
    '<tbody id="sa-ris-body"></tbody></table>' +
    '<div class="form-actions" style="margin-top:0.85rem">' +
    '<button type="button" class="btn-primary" id="sa-save-ris">Salva risultati</button>' +
    '<button type="button" class="btn-ghost" id="sa-close-ris-2">Annulla</button></div></div></div>';

  function ensureUI() {
    var tabs = document.querySelector(".admin-tabs");
    if (!tabs) return false;
    var tab = tabs.querySelector('[data-tab="serie-aperte"]');
    if (!tab) {
      tab = document.createElement("button");
      tab.type = "button";
      tab.className = "admin-tab";
      tab.setAttribute("data-tab", "serie-aperte");
      tab.textContent = "Serie Aperte";
      var ea = tabs.querySelector('[data-tab="eventi-aperti"]');
      if (ea && ea.nextSibling) tabs.insertBefore(tab, ea.nextSibling);
      else if (ea) tabs.appendChild(tab);
      else {
        var gal = tabs.querySelector('[data-tab="galleria"]');
        if (gal) tabs.insertBefore(tab, gal);
        else tabs.appendChild(tab);
      }
    }
    var panel = document.getElementById("panel-serie-aperte");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "panel-serie-aperte";
      panel.className = "admin-panel";
      var before =
        document.getElementById("panel-soci") ||
        document.getElementById("panel-galleria") ||
        document.getElementById("panel-export");
      var app = document.getElementById("admin-app");
      if (before && before.parentNode) before.parentNode.insertBefore(panel, before);
      else if (app) app.appendChild(panel);
      else return false;
    }
    if (!document.getElementById("sa-form")) {
      panel.innerHTML = PANEL_HTML;
    }
    return true;
  }

  function run() {
    if (!ensureUI()) {
      setTimeout(run, 300);
      return;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(run, 200);
      setTimeout(run, 800);
      setTimeout(run, 2000);
    });
  } else {
    setTimeout(run, 200);
    setTimeout(run, 800);
    setTimeout(run, 2000);
  }
})();
