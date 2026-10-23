/* CVI Admin – Gestione Siti amici & link utili */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, ok) {
    var st = document.getElementById("admin-status");
    if (!st) return;
    st.textContent = msg || "";
    st.className = "admin-status" + (ok === true ? " ok" : ok === false ? " err" : "");
  }

  function isAdminOrScorer() {
    try {
      var p = window.CVI && CVI.profile;
      if (!p) return false;
      return !!(p.is_admin || ["admin", "scorer"].indexOf(String(p.role || "").toLowerCase()) >= 0);
    } catch (e) {
      return false;
    }
  }

  async function loadSitiAmiciAdmin() {
    var box = document.getElementById("siti-amici-list");
    if (!box || !window.CVI || !CVI.supabase) return;
    box.innerHTML = '<p class="loading-text">Caricamento…</p>';
    try {
      var res = await CVI.supabase
        .from("siti_amici")
        .select("*")
        .order("ordine", { ascending: true });
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) {
        box.innerHTML =
          '<p class="empty-text">Nessun sito. Aggiungine uno con il form sopra.</p>' +
          '<p class="sql-hint" style="display:block;margin-top:.75rem">Se la tabella non esiste, esegui <code>siti-amici-sql.sql</code> su Supabase.</p>';
        return;
      }
      box.innerHTML = rows
        .map(function (s) {
          var flags = [];
          if (s.attivo)
            flags.push(
              '<span style="color:#34d399;font-weight:700;font-size:.75rem">ATTIVO</span>'
            );
          else
            flags.push(
              '<span style="color:#fbbf24;font-weight:700;font-size:.75rem">NASCOSTO</span>'
            );
          return (
            '<div class="admin-card" data-sa-id="' +
            esc(s.id) +
            '"><div class="admin-card-head"><div><strong style="color:#fff">' +
            (s.emoji ? esc(s.emoji) + " " : "") +
            esc(s.nome) +
            '</strong><div class="meta">' +
            esc(s.url) +
            " · ordine " +
            esc(s.ordine) +
            " · " +
            flags.join(" · ") +
            "</div>" +
            (s.descrizione
              ? '<p class="card-desc">' + esc(s.descrizione) + "</p>"
              : "") +
            '</div><div style="display:flex;gap:.35rem;flex-wrap:wrap">' +
            '<button type="button" class="btn-sm sa-edit" data-id="' +
            esc(s.id) +
            '">Modifica</button> ' +
            '<button type="button" class="btn-danger-sm sa-del" data-id="' +
            esc(s.id) +
            '">Elimina</button></div></div></div>'
          );
        })
        .join("");

      box.querySelectorAll(".sa-edit").forEach(function (b) {
        b.onclick = function () {
          var s = rows.find(function (x) {
            return String(x.id) === b.getAttribute("data-id");
          });
          if (s) fillForm(s);
        };
      });
      box.querySelectorAll(".sa-del").forEach(function (b) {
        b.onclick = async function () {
          if (!confirm("Eliminare questo link?")) return;
          try {
            var del = await CVI.supabase
              .from("siti_amici")
              .delete()
              .eq("id", b.getAttribute("data-id"));
            if (del.error) throw del.error;
            setStatus("Link eliminato", true);
            loadSitiAmiciAdmin();
            resetForm();
          } catch (e) {
            alert(e.message || e);
          }
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171">' +
        esc(e.message || e) +
        '</p><p class="sql-hint" style="display:block">Esegui siti-amici-sql.sql su Supabase.</p>';
    }
  }

  function fillForm(s) {
    document.getElementById("sa-id").value = s.id || "";
    document.getElementById("sa-nome").value = s.nome || "";
    document.getElementById("sa-url").value = s.url || "";
    document.getElementById("sa-desc").value = s.descrizione || "";
    document.getElementById("sa-emoji").value = s.emoji || "⚓";
    document.getElementById("sa-ordine").value =
      s.ordine != null ? s.ordine : 0;
    document.getElementById("sa-attivo").checked = s.attivo !== false;
    document.getElementById("sa-form-title").textContent = s.id
      ? "Modifica link"
      : "Nuovo link";
    document.getElementById("sa-cancel").style.display = s.id
      ? "inline-block"
      : "none";
  }

  function resetForm() {
    fillForm({
      id: "",
      nome: "",
      url: "",
      descrizione: "",
      emoji: "⚓",
      ordine: 0,
      attivo: true
    });
  }

  async function saveSito(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!isAdminOrScorer()) {
      alert("Solo admin/scorer possono modificare i siti amici.");
      return;
    }
    var id = document.getElementById("sa-id").value.trim();
    var nome = document.getElementById("sa-nome").value.trim();
    var url = document.getElementById("sa-url").value.trim();
    if (!nome) return alert("Nome obbligatorio");
    if (!url || !/^https?:\/\//i.test(url))
      return alert("URL obbligatorio e deve iniziare con http:// o https://");

    var payload = {
      nome: nome,
      url: url,
      descrizione: document.getElementById("sa-desc").value.trim() || null,
      emoji: document.getElementById("sa-emoji").value.trim() || "⚓",
      ordine: parseInt(document.getElementById("sa-ordine").value, 10) || 0,
      attivo: document.getElementById("sa-attivo").checked,
      updated_at: new Date().toISOString()
    };

    var btn = document.getElementById("sa-save");
    if (btn) btn.disabled = true;
    try {
      if (id) {
        var u = await CVI.supabase
          .from("siti_amici")
          .update(payload)
          .eq("id", id);
        if (u.error) throw u.error;
        setStatus("Link aggiornato", true);
      } else {
        var ins = await CVI.supabase.from("siti_amici").insert(payload);
        if (ins.error) throw ins.error;
        setStatus("Link creato", true);
      }
      resetForm();
      loadSitiAmiciAdmin();
    } catch (err) {
      alert(err.message || err);
      setStatus(String(err.message || err), false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wire() {
    var tab = document.querySelector('.admin-tab[data-tab="siti-amici"]');
    if (tab && !tab._saWired) {
      tab._saWired = true;
      tab.onclick = function () {
        document.querySelectorAll(".admin-tab").forEach(function (t) {
          t.classList.remove("active");
        });
        document.querySelectorAll(".admin-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        tab.classList.add("active");
        var panel = document.getElementById("panel-siti-amici");
        if (panel) panel.classList.add("active");
        loadSitiAmiciAdmin();
      };
    }

    var form = document.getElementById("sa-form");
    if (form && !form._saWired) {
      form._saWired = true;
      form.onsubmit = saveSito;
    }

    var cancel = document.getElementById("sa-cancel");
    if (cancel && !cancel._saWired) {
      cancel._saWired = true;
      cancel.onclick = resetForm;
    }
  }

  window.loadSitiAmiciAdmin = loadSitiAmiciAdmin;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(wire, 600);
    });
  } else {
    setTimeout(wire, 600);
  }
  setTimeout(wire, 1800);
})();
