/* CVI Admin – Campi estesi Eventi + gironi/iscrizioni/giornate (base, ex CDN @64f6844).
   Caricato da eventi-admin-fields.js (loader locale con fallback CDN). */
/* CVI Admin – Campi estesi Eventi + gestione gironi, iscrizioni e giornate.
   Si aggancia ai form esistenti (ea-form, sa-form) senza modificarli.
   Richiede eventi-unificati-sql.sql su Supabase. */
(function () {
  "use strict";

  if (window.__CVI_EV_ADMIN_FIELDS__) return;
  window.__CVI_EV_ADMIN_FIELDS__ = true;

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function status(msg, ok) {
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status " + (ok ? "ok" : "err");
    clearTimeout(status._t);
    if (msg) status._t = setTimeout(function () {
      el.textContent = "";
      el.className = "admin-status";
    }, 5000);
  }

  function toLocal(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) { return String(n).padStart(2, "0"); }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function toIso(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function missingColumn(err) {
    return /column .* does not exist|schema cache|Could not find the .* column/i.test((err && err.message) || "");
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

  function fieldsHtml(prefix) {
    return FIELDS.map(function (f) {
      return (
        '<div><label class="adm-label" for="' + prefix + "-" + f.id + '">' + esc(f.label) + "</label>" +
        '<input class="adm-input" id="' + prefix + "-" + f.id + '" type="' + f.type + '"' +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") +
        (f.type === "number" ? ' min="1"' : "") +
        ' style="width:100%"></div>'
      );
    }).join("");
  }

  function injectFields(form, prefix) {
    if (!form || document.getElementById(prefix + "-formato")) return;
    var wrap = document.createElement("div");
    wrap.style.cssText = "grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin-top:.35rem";
    wrap.innerHTML =
      '<p style="grid-column:1/-1;margin:0;color:#64748b;font-size:.78rem">' +
      "Dettagli mostrati nella pagina evento. I campi vuoti vengono nascosti. " +
      "Se il salvataggio segnala colonne mancanti, esegui <strong>eventi-unificati-sql.sql</strong> su Supabase.</p>" +
      fieldsHtml(prefix);
    var actions = form.querySelector(".form-actions");
    if (actions) form.insertBefore(wrap, actions);
    else form.appendChild(wrap);
  }

  function fieldIds(prefix) {
    return FIELDS.map(function (f) { return prefix + "-" + f.id; });
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
      setTimeout(function () {
        saveExtra(table, prefix, idField, titleField).then(function (ok) {
          if (ok && onSaved) onSaved();
        });
      }, 2400);
    }, true);
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && (t.id === prefix + "-cancel")) clearExtra(prefix);
    }, true);
  }


  var poolState = { serieId: "", gironi: [], iscrizioni: [], regate: [] };

  function admStatus(msg) {
    var el = document.getElementById("ev-adm-status");
    if (el) {
      el.textContent = msg || "";
      el.style.color = msg ? "#fbbf24" : "#64748b";
    }
  }

  function injectPoolsCard() {
    if (document.getElementById("ev-pools-card")) return true;
    var panel = document.getElementById("panel-serie-aperte");
    if (!panel) return false;
    var card = document.createElement("div");
    card.id = "ev-pools-card";
    card.className = "admin-card";
    card.style.cssText = "display:none;margin-top:1.25rem";
    card.innerHTML =
      '<h3 style="margin:0 0 .35rem;color:#7dd3fc">Gironi, iscrizioni e giornate</h3>' +
      '<p style="color:#94a3b8;font-size:.82rem;margin:0 0 .75rem">Aggiungi i gironi (pool), assegna gli iscritti e imposta la giornata di ogni regata. ' +
      "Senza i gironi la pagina evento mostra solo programma e classifica generale.</p>" +
      '<div id="ev-adm-status" style="font-size:.8rem;min-height:1.1rem;margin-bottom:.5rem;color:#64748b"></div>' +
      '<div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:.75rem">' +
      '<input id="ev-pool-nome" class="adm-input" placeholder="Nome girone (es. POOL A)" style="max-width:240px">' +
      '<button type="button" id="ev-pool-add" class="btn-sm">+ Girone</button></div>' +
      '<div id="ev-pool-list" style="margin-bottom:1rem"></div>' +
      '<h4 style="margin:.25rem 0 .5rem;color:#cbd5e1;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em">Iscrizioni</h4>' +
      '<div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:.65rem">' +
      '<input id="ev-iscr-nick" class="adm-input" placeholder="Nickname" style="max-width:200px">' +
      '<select id="ev-iscr-pool" class="adm-input" style="max-width:200px"></select>' +
      '<button type="button" id="ev-iscr-add" class="btn-sm">+ Iscritto</button></div>' +
      '<div id="ev-iscr-list" style="margin-bottom:1rem"></div>' +
      '<h4 style="margin:.25rem 0 .5rem;color:#cbd5e1;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em">Giornate e gironi delle regate</h4>' +
      '<div id="ev-reg-list"></div>';
    paneAppend(panel, card);
    wirePools(card);
    return true;
  }

  function paneAppend(panel, card) {
    var anchor = document.getElementById("sa-regate-panel");
    if (anchor && anchor.parentNode === panel) panel.insertBefore(card, anchor);
    else panel.appendChild(card);
  }

  function poolOptions(selected) {
    return '<option value="">— nessun girone —</option>' + poolState.gironi.map(function (g) {
      return '<option value="' + esc(g.id) + '"' + (String(g.id) === String(selected) ? " selected" : "") + ">" + esc(g.nome) + "</option>";
    }).join("");
  }


  async function loadSerieAdminData(id) {
    if (!window.CVI || !CVI.supabase) return;
    admStatus("Caricamento gironi e regate…");
    try {
      var res = await Promise.all([
        CVI.supabase.from("serie_aperte_gironi").select("*").eq("serie_id", id).order("ordine"),
        CVI.supabase.from("serie_aperte_iscrizioni").select("*").eq("serie_id", id).order("nickname"),
        CVI.supabase.from("serie_aperte_regate").select("*").eq("serie_id", id).order("ordine").order("data_regata", { ascending: true, nullsFirst: false })
      ]);
      if (res[0].error || res[1].error) {
        admStatus("Tabelle gironi/iscrizioni assenti: esegui eventi-unificati-sql.sql su Supabase.");
        poolState.gironi = [];
        poolState.iscrizioni = [];
      } else {
        poolState.gironi = res[0].data || [];
        poolState.iscrizioni = res[1].data || [];
      }
      poolState.regate = res[2].error ? [] : res[2].data || [];
      renderPools();
      renderIscrizioni();
      renderRegate();
      if (!res[0].error && !res[1].error) admStatus("");
    } catch (err) {
      admStatus("Errore: " + (err.message || err));
    }
  }

  function renderPools() {
    var box = document.getElementById("ev-pool-list");
    var sel = document.getElementById("ev-iscr-pool");
    if (sel) sel.innerHTML = poolOptions("");
    if (!box) return;
    if (!poolState.gironi.length) {
      box.innerHTML = '<p style="color:#64748b;font-size:.85rem;margin:.25rem 0">Nessun girone. Creane uno qui sopra.</p>';
      return;
    }
    box.innerHTML = poolState.gironi.map(function (g) {
      var members = poolState.iscrizioni.filter(function (i) { return String(i.girone_id) === String(g.id); }).length;
      var races = poolState.regate.filter(function (r) { return String(r.girone_id) === String(g.id); }).length;
      return (
        '<div style="display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;margin-bottom:.4rem">' +
        '<input class="adm-input ev-pool-name" data-id="' + esc(g.id) + '" value="' + esc(g.nome) + '" style="max-width:220px">' +
        '<button type="button" class="btn-sm ev-pool-save" data-id="' + esc(g.id) + '">Salva</button>' +
        '<button type="button" class="btn-danger-sm ev-pool-del" data-id="' + esc(g.id) + '">Elimina</button>' +
        '<span style="color:#64748b;font-size:.78rem">' + members + " iscritti · " + races + " regate</span>" +
        "</div>"
      );
    }).join("");
  }

  function renderIscrizioni() {
    var box = document.getElementById("ev-iscr-list");
    if (!box) return;
    if (!poolState.iscrizioni.length) {
      box.innerHTML = '<p style="color:#64748b;font-size:.85rem;margin:.25rem 0">Nessun iscritto.</p>';
      return;
    }
    box.innerHTML = poolState.iscrizioni.map(function (i) {
      return (
        '<div style="display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;margin-bottom:.35rem">' +
        '<strong style="color:#e2e8f0;font-size:.86rem;min-width:140px">' + esc(i.nickname) + "</strong>" +
        '<select class="adm-input ev-iscr-move" data-id="' + esc(i.id) + '" style="max-width:200px">' + poolOptions(i.girone_id) + "</select>" +
        '<button type="button" class="btn-danger-sm ev-iscr-del" data-id="' + esc(i.id) + '">×</button>' +
        "</div>"
      );
    }).join("");
  }

  function renderRegate() {
    var box = document.getElementById("ev-reg-list");
    if (!box) return;
    if (!poolState.regate.length) {
      box.innerHTML = '<p style="color:#64748b;font-size:.85rem;margin:.25rem 0">Nessuna regata. Aggiungile dal pannello Regate &amp; Risultati.</p>';
      return;
    }
    box.innerHTML = poolState.regate.map(function (r, idx) {
      var when = r.data_regata ? new Date(r.data_regata).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "data da definire";
      return (
        '<div style="display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;margin-bottom:.4rem">' +
        '<span style="color:#e2e8f0;font-size:.86rem;min-width:170px">' + esc(r.titolo || "Regata " + (idx + 1)) +
        ' <span style="color:#64748b;font-size:.76rem">' + esc(when) + "</span></span>" +
        '<label style="color:#94a3b8;font-size:.78rem">Giornata <input type="number" min="1" class="adm-input ev-reg-giornata" data-id="' + esc(r.id) + '" value="' + (r.giornata != null ? esc(r.giornata) : "") + '" style="width:5rem"></label>' +
        '<select class="adm-input ev-reg-girone" data-id="' + esc(r.id) + '" style="max-width:180px">' + poolOptions(r.girone_id) + "</select>" +
        '<button type="button" class="btn-sm ev-reg-save" data-id="' + esc(r.id) + '">Salva</button>' +
        "</div>"
      );
    }).join("");
  }


  function wirePools(card) {
    if (card._evPoolsWired) return;
    card._evPoolsWired = true;

    card.addEventListener("click", async function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var serieId = poolState.serieId;
      if (!serieId) return;
      var sb = CVI.supabase;

      try {
        if (btn.id === "ev-pool-add") {
          var nomeEl = document.getElementById("ev-pool-nome");
          var nome = nomeEl ? nomeEl.value.trim() : "";
          if (!nome) return admStatus("Inserisci il nome del girone.");
          var r1 = await sb.from("serie_aperte_gironi").insert({ serie_id: serieId, nome: nome, ordine: poolState.gironi.length });
          if (r1.error) throw r1.error;
          if (nomeEl) nomeEl.value = "";
          await loadSerieAdminData(serieId);
          status("Girone aggiunto", true);
          return;
        }

        if (btn.classList.contains("ev-pool-save")) {
          var gid = btn.getAttribute("data-id");
          var input = card.querySelector('.ev-pool-name[data-id="' + gid + '"]');
          var nuovo = input ? input.value.trim() : "";
          if (!nuovo) return admStatus("Il nome del girone non può essere vuoto.");
          var r2 = await sb.from("serie_aperte_gironi").update({ nome: nuovo }).eq("id", gid);
          if (r2.error) throw r2.error;
          await loadSerieAdminData(serieId);
          status("Girone aggiornato", true);
          return;
        }

        if (btn.classList.contains("ev-pool-del")) {
          if (!confirm("Eliminare questo girone? Iscritti e regate resteranno senza girone.")) return;
          var r3 = await sb.from("serie_aperte_gironi").delete().eq("id", btn.getAttribute("data-id"));
          if (r3.error) throw r3.error;
          await loadSerieAdminData(serieId);
          status("Girone eliminato", true);
          return;
        }

        if (btn.id === "ev-iscr-add") {
          var nickEl = document.getElementById("ev-iscr-nick");
          var poolEl = document.getElementById("ev-iscr-pool");
          var nick = nickEl ? nickEl.value.trim() : "";
          if (!nick) return admStatus("Inserisci il nickname.");
          var r4 = await sb.from("serie_aperte_iscrizioni").insert({
            serie_id: serieId,
            girone_id: poolEl && poolEl.value ? poolEl.value : null,
            nickname: nick
          });
          if (r4.error) throw r4.error;
          if (nickEl) nickEl.value = "";
          await loadSerieAdminData(serieId);
          status("Iscritto aggiunto", true);
          return;
        }

        if (btn.classList.contains("ev-iscr-del")) {
          var r5 = await sb.from("serie_aperte_iscrizioni").delete().eq("id", btn.getAttribute("data-id"));
          if (r5.error) throw r5.error;
          await loadSerieAdminData(serieId);
          status("Iscritto rimosso", true);
          return;
        }

        if (btn.classList.contains("ev-reg-save")) {
          var rid = btn.getAttribute("data-id");
          var gEl = card.querySelector('.ev-reg-giornata[data-id="' + rid + '"]');
          var pEl = card.querySelector('.ev-reg-girone[data-id="' + rid + '"]');
          var gnum = gEl ? parseInt(gEl.value, 10) : NaN;
          var r6 = await sb.from("serie_aperte_regate").update({
            giornata: isNaN(gnum) || gnum < 1 ? null : gnum,
            girone_id: pEl && pEl.value ? pEl.value : null
          }).eq("id", rid);
          if (r6.error) {
            if (missingColumn(r6.error)) {
              admStatus("Colonne giornata/girone assenti: esegui eventi-unificati-sql.sql.");
              return;
            }
            throw r6.error;
          }
          await loadSerieAdminData(serieId);
          status("Regata aggiornata", true);
          return;
        }
      } catch (err) {
        admStatus(err.message || String(err));
      }
    });

    card.addEventListener("change", async function (e) {
      if (!e.target.classList.contains("ev-iscr-move")) return;
      var serieId = poolState.serieId;
      if (!serieId) return;
      try {
        var r = await CVI.supabase.from("serie_aperte_iscrizioni")
          .update({ girone_id: e.target.value || null })
          .eq("id", e.target.getAttribute("data-id"));
        if (r.error) throw r.error;
        await loadSerieAdminData(serieId);
        status("Iscritto spostato", true);
      } catch (err) {
        admStatus(err.message || String(err));
      }
    });
  }

  function syncSerie(force) {
    var idEl = document.getElementById("sa-id");
    var id = idEl ? String(idEl.value || "").trim() : "";
    var card = document.getElementById("ev-pools-card");
    if (!card) return;
    if (!force && id === poolState.serieId) return;
    poolState.serieId = id;
    if (!id) {
      card.style.display = "none";
      poolState.gironi = [];
      poolState.iscrizioni = [];
      poolState.regate = [];
      renderPools();
      renderIscrizioni();
      renderRegate();
      return;
    }
    card.style.display = "block";
    loadSerieAdminData(id);
  }


  function ensureUnifiedHeading(panel, title, note, separated) {
    if (!panel || panel.querySelector(".ev-admin-unified-head")) return;
    var box = document.createElement("div");
    box.className = "ev-admin-unified-head";
    box.style.cssText =
      "margin:0 0 1rem" +
      (separated ? ";margin-top:1.75rem;padding-top:1.75rem;border-top:1px solid rgba(255,255,255,.08)" : "");
    box.innerHTML =
      '<h2 style="margin:0 0 .25rem;color:#7dd3fc;font-size:1.15rem">' + esc(title) + "</h2>" +
      '<p style="margin:0;color:#94a3b8;font-size:.85rem;line-height:1.5">' + esc(note) + "</p>";
    panel.insertBefore(box, panel.firstChild);
  }

  function mergeEventiTabs() {
    var eaTab = document.querySelector('.admin-tab[data-tab="eventi-aperti"]');
    var saTab = document.querySelector('.admin-tab[data-tab="serie-aperte"]');
    if (!eaTab || !saTab) return;
    if (eaTab.textContent !== "Eventi") eaTab.textContent = "Eventi";
    saTab.style.display = "none";
    saTab.setAttribute("aria-hidden", "true");

    var eaPanel = document.getElementById("panel-eventi-aperti");
    var saPanel = document.getElementById("panel-serie-aperte");
    if (!eaPanel || !saPanel) return;

    /* Se una delle due vecchie tab era già aperta, mostra subito entrambe le sezioni. */
    if (saTab.classList.contains("active")) {
      saTab.classList.remove("active");
      eaTab.classList.add("active");
      eaPanel.classList.add("active");
      saPanel.classList.add("active");
    } else if (eaTab.classList.contains("active")) {
      eaPanel.classList.add("active");
      saPanel.classList.add("active");
    }

    ensureUnifiedHeading(
      saPanel,
      "Campionati e serie",
      "Crea la serie, gestisci regate e risultati, poi assegna gironi, iscritti e giornate.",
      false
    );
    ensureUnifiedHeading(
      eaPanel,
      "Eventi singoli",
      "Eventi con classifica propria, senza gironi.",
      true
    );

    /* Le due sezioni vivono nello stesso tab: campionati prima, eventi singoli dopo. */
    if (saPanel.nextElementSibling !== eaPanel) {
      eaPanel.parentNode.insertBefore(saPanel, eaPanel);
    }
  }

  function showUnifiedEventi(tab) {
    document.querySelectorAll(".admin-tab").forEach(function (t) {
      t.classList.remove("active");
    });
    document.querySelectorAll(".admin-panel").forEach(function (p) {
      p.classList.remove("active");
    });
    tab.classList.add("active");
    ["panel-serie-aperte", "panel-eventi-aperti"].forEach(function (id) {
      var p = document.getElementById(id);
      if (p) p.classList.add("active");
    });
    if (typeof window.loadSerieAperteAdmin === "function") {
      try { window.loadSerieAperteAdmin(); } catch (e) {}
    }
    if (typeof window.loadEventiApertiAdmin === "function") {
      try { window.loadEventiApertiAdmin(); } catch (e) {}
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var tab = t.closest('.admin-tab[data-tab="eventi-aperti"]');
    if (!tab) return;
    var saTab = document.querySelector('.admin-tab[data-tab="serie-aperte"]');
    if (!saTab || saTab.style.display !== "none") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showUnifiedEventi(tab);
  }, true);

  function boot() {
    var ea = document.getElementById("ea-form");
    var sa = document.getElementById("sa-form");
    mergeEventiTabs();

    if (ea) {
      injectFields(ea, "ea");
      wireForm(ea, "eventi_aperti", "ea", "ea-id", "ea-titolo");
    }
    if (sa) {
      injectFields(sa, "sa");
      wireForm(sa, "serie_aperte", "sa", "sa-id", "sa-titolo", function () {
        setTimeout(function () { syncSerie(true); }, 150);
      });
      injectPoolsCard();
    }

    if (!ea || !sa) {
      boot._tries = (boot._tries || 0) + 1;
      if (boot._tries < 120) setTimeout(boot, 700);
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var eaEdit = t.closest(".ea-edit");
    if (eaEdit) {
      var eid = eaEdit.getAttribute("data-id");
      setTimeout(function () { fillExtra("eventi_aperti", "ea", eid); }, 450);
      return;
    }
    var saEdit = t.closest(".sa-edit");
    if (saEdit) {
      var sid = saEdit.getAttribute("data-id");
      setTimeout(function () {
        fillExtra("serie_aperte", "sa", sid);
        syncSerie(true);
      }, 450);
      return;
    }
    if (t.id === "sa-cancel" || t.closest("#sa-cancel")) {
      setTimeout(function () { syncSerie(true); }, 120);
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 500);
      setTimeout(boot, 1500);
      setTimeout(boot, 3000);
      setInterval(function () { mergeEventiTabs(); syncSerie(); }, 1200);
    });
  } else {
    setTimeout(boot, 500);
    setTimeout(boot, 1500);
    setTimeout(boot, 3000);
    setInterval(function () { mergeEventiTabs(); syncSerie(); }, 1200);
  }
})();

