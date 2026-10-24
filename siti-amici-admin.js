/* CVI Admin – Gestione "Siti amici & link utili" (tabella public.siti_amici)
   Pannello: Admin → Siti amici.  Il banner in Home legge la stessa tabella.

   Note:
   - il file è autonomo: non dipende dalle patch di admin-a.js;
   - espone window.loadSitiAmiciAdmin() (chiamata anche dal tab);
   - dopo ogni modifica aggiorna la cache usata dal banner in Home.
*/
(function () {
  "use strict";

  var TABLE = "siti_amici";
  var CACHE_KEY = "cvi_siti_amici_v1";

  function sb() {
    return window.CVI && window.CVI.supabase ? window.CVI.supabase : null;
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function setStatus(msg, ok) {
    var st = document.getElementById("admin-status");
    if (!st) return;
    st.textContent = msg || "";
    st.className = "admin-status" + (ok === true ? " ok" : ok === false ? " err" : "");
    clearTimeout(setStatus._t);
    if (msg) {
      setStatus._t = setTimeout(function () {
        st.textContent = "";
        st.className = "admin-status";
      }, 5000);
    }
  }

  function isMissingTable(err) {
    var m = String((err && (err.message || err)) || "");
    return /does not exist|schema cache|relation .* does not exist|42P01|permission denied/i.test(m);
  }

  function hintHtml(err) {
    if (!isMissingTable(err)) return "";
    return (
      '<p class="sql-hint" style="display:block;margin-top:.75rem">' +
      "La tabella <code>siti_amici</code> non è raggiungibile. " +
      "Esegui <code>siti-amici-sql.sql</code> nell'SQL Editor di Supabase e ricarica.</p>"
    );
  }

  /* Il gate di admin-a.js ha già verificato il ruolo: qui controlliamo
     solo che la sessione sia ancora valida (serve per INSERT/UPDATE/DELETE). */
  async function ensureSession() {
    var client = sb();
    if (!client) return false;
    try {
      var res = await client.auth.getSession();
      return !!(res && res.data && res.data.session && res.data.session.user);
    } catch (e) {
      return false;
    }
  }

  function normalize(rows) {
    var out = [];
    (rows || []).forEach(function (r) {
      if (!r) return;
      out.push({
        id: r.id,
        nome: r.nome || "",
        url: r.url || "",
        descrizione: r.descrizione || "",
        emoji: r.emoji || "⚓",
        ordine: Number(r.ordine) || 0,
        attivo: r.attivo !== false
      });
    });
    out.sort(function (a, b) {
      return a.ordine - b.ordine || String(a.nome).localeCompare(String(b.nome), "it");
    });
    return out;
  }

  /* Riallinea la cache locale letta dal banner in Home (stessa chiave). */
  function refreshHomeCache(rows) {
    try {
      var items = normalize(rows)
        .filter(function (r) {
          return r.attivo && r.nome && /^https?:\/\//i.test(r.url);
        })
        .map(function (r) {
          return {
            nome: r.nome,
            url: r.url,
            descrizione: r.descrizione,
            emoji: r.emoji,
            ordine: r.ordine
          };
        });
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), items: items })
      );
    } catch (e) {
      /* storage non disponibile: il banner ricaricherà da Supabase */
    }
    if (window.CVISitiAmici && typeof window.CVISitiAmici.load === "function") {
      try {
        window.CVISitiAmici.load();
      } catch (e) {
        /* ignore */
      }
    }
  }

  var current = [];
  var loadingPromise = null;

  function renderList() {
    var box = document.getElementById("siti-amici-list");
    if (!box) return;

    if (!current.length) {
      box.innerHTML =
        '<p class="empty-text">Nessun link presente. Aggiungine uno con il form qui sopra.</p>' +
        '<p style="color:#94a3b8;font-size:.85rem;text-align:center;margin:.25rem 0 0">' +
        "I link attivi compaiono in Home nel banner “Siti amici &amp; link utili”.</p>";
      return;
    }

    var attivi = current.filter(function (s) {
      return s.attivo;
    }).length;

    var html =
      '<p style="color:#94a3b8;font-size:.85rem;margin:0 0 .75rem">' +
      attivi +
      " link visibili in Home su " +
      current.length +
      " totali · l’ordine è quello mostrato in Home.</p>";

    html += current
      .map(function (s, idx) {
        return (
          '<div class="admin-card" data-sa-id="' +
          esc(s.id) +
          '">' +
          '<div class="admin-card-head">' +
          "<div>" +
          '<strong style="color:#fff">' +
          (s.emoji ? esc(s.emoji) + " " : "") +
          esc(s.nome) +
          "</strong>" +
          '<div class="meta">' +
          '<a href="' +
          esc(s.url) +
          '" target="_blank" rel="noopener noreferrer nofollow" style="color:#7dd3fc;text-decoration:none">' +
          esc(s.url) +
          "</a> · ordine " +
          s.ordine +
          " · " +
          (s.attivo
            ? '<span style="color:#34d399;font-weight:700;font-size:.75rem">VISIBILE IN HOME</span>'
            : '<span style="color:#fbbf24;font-weight:700;font-size:.75rem">NASCOSTO</span>') +
          "</div>" +
          (s.descrizione
            ? '<p class="card-desc">' + esc(s.descrizione) + "</p>"
            : "") +
          "</div>" +
          '<div style="display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end">' +
          '<button type="button" class="btn-sm sa-move" data-id="' +
          esc(s.id) +
          '" data-dir="-1"' +
          (idx === 0 ? " disabled" : "") +
          ' aria-label="Sposta su">&uarr;</button>' +
          '<button type="button" class="btn-sm sa-move" data-id="' +
          esc(s.id) +
          '" data-dir="1"' +
          (idx === current.length - 1 ? " disabled" : "") +
          ' aria-label="Sposta giù">&darr;</button>' +
          '<button type="button" class="btn-sm sa-toggle" data-id="' +
          esc(s.id) +
          '">' +
          (s.attivo ? "Nascondi" : "Mostra") +
          "</button>" +
          '<button type="button" class="btn-sm sa-edit" data-id="' +
          esc(s.id) +
          '">Modifica</button>' +
          '<button type="button" class="btn-danger-sm sa-del" data-id="' +
          esc(s.id) +
          '">Elimina</button>' +
          "</div></div></div>"
        );
      })
      .join("");

    box.innerHTML = html;

    box.querySelectorAll(".sa-edit").forEach(function (b) {
      b.onclick = function () {
        var s = findRow(b.getAttribute("data-id"));
        if (s) fillForm(s);
      };
    });

    box.querySelectorAll(".sa-del").forEach(function (b) {
      b.onclick = function () {
        removeSito(b.getAttribute("data-id"), b);
      };
    });

    box.querySelectorAll(".sa-toggle").forEach(function (b) {
      b.onclick = function () {
        toggleSito(b.getAttribute("data-id"), b);
      };
    });

    box.querySelectorAll(".sa-move").forEach(function (b) {
      b.onclick = function () {
        moveSito(b.getAttribute("data-id"), parseInt(b.getAttribute("data-dir"), 10) || 0, b);
      };
    });
  }

  function findRow(id) {
    for (var i = 0; i < current.length; i++) {
      if (String(current[i].id) === String(id)) return current[i];
    }
    return null;
  }

  function loadSitiAmiciAdmin(force) {
    var box = document.getElementById("siti-amici-list");
    if (!box) return Promise.resolve();
    if (loadingPromise && !force) return loadingPromise;

    loadingPromise = (async function () {
      box.innerHTML = '<p class="loading-text">Caricamento…</p>';
      var client = sb();
      if (!client) {
        box.innerHTML =
          '<p class="empty-text" style="color:#f87171">Client Supabase non disponibile: ricarica la pagina.</p>';
        return;
      }
      try {
        var res = await client
          .from(TABLE)
          .select("*")
          .order("ordine", { ascending: true });
        if (res.error) throw res.error;
        current = normalize(res.data);
        renderList();
        refreshHomeCache(current);
      } catch (err) {
        if (window.console) console.warn("[CVI siti amici admin]", err);
        box.innerHTML =
          '<p class="empty-text" style="color:#f87171">Errore: ' +
          esc((err && (err.message || err)) || "lettura non riuscita") +
          "</p>" +
          hintHtml(err);
      }
    })();

    loadingPromise.finally(function () {
      loadingPromise = null;
    });

    return loadingPromise;
  }

  function fillForm(s) {
    s = s || {};
    var map = {
      "sam-id": s.id || "",
      "sam-nome": s.nome || "",
      "sam-url": s.url || "",
      "sam-desc": s.descrizione || "",
      "sam-emoji": s.emoji || "⚓",
      "sam-ordine": s.ordine != null ? s.ordine : 0
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = map[id];
    });
    var attivo = document.getElementById("sam-attivo");
    if (attivo) attivo.checked = s.attivo !== false;

    var title = document.getElementById("sam-form-title");
    if (title) title.textContent = s.id ? "Modifica link" : "Nuovo link";
    var cancel = document.getElementById("sam-cancel");
    if (cancel) cancel.style.display = s.id ? "inline-block" : "none";
    var save = document.getElementById("sam-save");
    if (save) save.textContent = s.id ? "Salva modifiche" : "Aggiungi link";

    if (s.id) {
      var form = document.getElementById("sam-form");
      if (form && form.scrollIntoView) {
        try {
          form.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
          form.scrollIntoView();
        }
      }
    }
  }

  function resetForm() {
    fillForm({ id: "", nome: "", url: "", descrizione: "", emoji: "⚓", ordine: 0, attivo: true });
  }

  async function saveSito(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();

    var client = sb();
    if (!client) {
      alert("Client Supabase non disponibile: ricarica la pagina.");
      return;
    }

    var id = val("sam-id");
    var nome = val("sam-nome");
    var url = val("sam-url");

    if (!nome) {
      alert("Il nome è obbligatorio.");
      var nomeEl = document.getElementById("sam-nome");
      if (nomeEl) nomeEl.focus();
      return;
    }
    if (!/^https?:\/\/[^\s]+$/i.test(url)) {
      alert("L’URL è obbligatorio e deve iniziare con http:// oppure https://");
      var urlEl = document.getElementById("sam-url");
      if (urlEl) urlEl.focus();
      return;
    }

    if (!(await ensureSession())) {
      alert("Sessione scaduta: effettua di nuovo il login come admin.");
      return;
    }

    var payload = {
      nome: nome,
      url: url,
      descrizione: val("sam-desc") || null,
      emoji: val("sam-emoji") || "⚓",
      ordine: parseInt(val("sam-ordine"), 10) || 0,
      attivo: !!(document.getElementById("sam-attivo") || {}).checked,
      updated_at: new Date().toISOString()
    };

    var btn = document.getElementById("sam-save");
    var oldLabel = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Salvataggio…";
    }

    try {
      if (id) {
        var up = await client
          .from(TABLE)
          .update(payload)
          .eq("id", id)
          .select("id");
        if (up.error) throw up.error;
        if (!up.data || !up.data.length) {
          throw new Error("Modifica non applicata: verifica i permessi (RLS) della tabella siti_amici.");
        }
        setStatus("Link aggiornato", true);
      } else {
        var ins = await client.from(TABLE).insert(payload).select("id");
        if (ins.error) throw ins.error;
        setStatus("Link creato: ora è visibile in Home", true);
      }
      resetForm();
      await loadSitiAmiciAdmin(true);
    } catch (err) {
      var msg = (err && (err.message || err)) || "Errore sconosciuto";
      alert(msg);
      setStatus(String(msg), false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldLabel;
      }
    }
  }

  async function removeSito(id, btn) {
    var row = findRow(id);
    if (!row) return;
    if (!confirm('Eliminare il link "' + row.nome + '"?\nL’operazione non può essere annullata.')) return;

    if (!(await ensureSession())) {
      alert("Sessione scaduta: effettua di nuovo il login come admin.");
      return;
    }

    if (btn) btn.disabled = true;
    try {
      var res = await sb().from(TABLE).delete().eq("id", id).select("id");
      if (res.error) throw res.error;
      if (!res.data || !res.data.length) {
        throw new Error("Nessuna riga eliminata: verifica i permessi (RLS) della tabella siti_amici.");
      }
      setStatus("Link eliminato", true);
      await loadSitiAmiciAdmin(true);
    } catch (err) {
      alert((err && (err.message || err)) || "Eliminazione non riuscita");
      setStatus(String((err && (err.message || err)) || err), false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function toggleSito(id, btn) {
    var row = findRow(id);
    if (!row) return;

    if (!(await ensureSession())) {
      alert("Sessione scaduta: effettua di nuovo il login come admin.");
      return;
    }

    var nuovo = !row.attivo;
    if (btn) btn.disabled = true;
    try {
      var res = await sb()
        .from(TABLE)
        .update({ attivo: nuovo, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (res.error) throw res.error;
      if (!res.data || !res.data.length) {
        throw new Error("Modifica non applicata: verifica i permessi (RLS).");
      }
      setStatus(nuovo ? "Link ora visibile in Home" : "Link nascosto dalla Home", true);
      await loadSitiAmiciAdmin(true);
    } catch (err) {
      alert((err && (err.message || err)) || "Operazione non riuscita");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function moveSito(id, dir, btn) {
    if (!dir) return;
    var idx = -1;
    for (var i = 0; i < current.length; i++) {
      if (String(current[i].id) === String(id)) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    var target = idx + dir;
    if (target < 0 || target >= current.length) return;

    if (!(await ensureSession())) {
      alert("Sessione scaduta: effettua di nuovo il login come admin.");
      return;
    }

    var ordered = current.slice();
    var moved = ordered.splice(idx, 1)[0];
    ordered.splice(target, 0, moved);

    var wrap = btn ? btn.parentNode : null;
    if (wrap) {
      Array.prototype.forEach.call(wrap.querySelectorAll("button"), function (b) {
        b.disabled = true;
      });
    }

    try {
      var client = sb();
      var results = await Promise.all(
        ordered.map(function (r, pos) {
          return client
            .from(TABLE)
            .update({ ordine: (pos + 1) * 10, updated_at: new Date().toISOString() })
            .eq("id", r.id);
        })
      );
      var failed = results.filter(function (r) {
        return r && r.error;
      })[0];
      if (failed) throw failed.error;
      setStatus("Ordine aggiornato", true);
      await loadSitiAmiciAdmin(true);
    } catch (err) {
      alert((err && (err.message || err)) || "Riordino non riuscito");
    } finally {
      if (wrap) {
        Array.prototype.forEach.call(wrap.querySelectorAll("button"), function (b) {
          b.disabled = false;
        });
      }
    }
  }

  function wire() {
    var form = document.getElementById("sam-form");
    if (form && !form._samWired) {
      form._samWired = true;
      form.addEventListener("submit", saveSito);
    }

    var cancel = document.getElementById("sam-cancel");
    if (cancel && !cancel._samWired) {
      cancel._samWired = true;
      cancel.addEventListener("click", function (ev) {
        ev.preventDefault();
        resetForm();
      });
    }

    var refresh = document.getElementById("sam-refresh");
    if (refresh && !refresh._samWired) {
      refresh._samWired = true;
      refresh.addEventListener("click", function () {
        loadSitiAmiciAdmin(true);
      });
    }
  }

  /* Il tab è gestito da admin-a.js (caricato via CDN): ci agganciamo
     con un listener delegato, così il caricamento avviene comunque. */
  function hookTab() {
    if (document._samTabHook) return;
    document._samTabHook = true;
    document.addEventListener("click", function (ev) {
      var el = ev.target;
      while (el && el !== document) {
        if (
          el.classList &&
          el.classList.contains("admin-tab") &&
          el.getAttribute("data-tab") === "siti-amici"
        ) {
          loadSitiAmiciAdmin();
          return;
        }
        el = el.parentNode;
      }
    });
  }

  window.loadSitiAmiciAdmin = loadSitiAmiciAdmin;

  function boot() {
    wire();
    hookTab();
    var panel = document.getElementById("panel-siti-amici");
    if (panel && panel.classList.contains("active")) loadSitiAmiciAdmin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  /* il pannello admin viene mostrato solo dopo il gate: riprova un paio di volte */
  setTimeout(wire, 900);
  setTimeout(wire, 2000);
})();

