/* CVI Admin – Gestione Siti amici & link utili */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function setStatus(msg, ok) {
    var st = document.getElementById("admin-status");
    if (!st) return;
    st.textContent = msg || "";
    st.className = "admin-status" + (ok === true ? " ok" : ok === false ? " err" : "");
  }

  /* Il gate admin (admin-a.js) ha già verificato admin/scorer.
     Qui controlliamo solo che ci sia una sessione attiva. */
  async function ensureSession() {
    if (!window.CVI || !CVI.supabase) return false;
    try {
      var res = await CVI.supabase.auth.getSession();
      return !!(res.data && res.data.session && res.data.session.user);
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
    document.getElementById("sam-id").value = s.id || "";
    document.getElementById("sam-nome").value = s.nome || "";
    document.getElementById("sam-url").value = s.url || "";
    document.getElementById("sam-desc").value = s.descrizione || "";
    document.getElementById("sam-emoji").value = s.emoji || "⚓";
    document.getElementById("sam-ordine").value =
      s.ordine != null ? s.ordine : 0;
    document.getElementById("sam-attivo").checked = s.attivo !== false;
    document.getElementById("sam-form-title").textContent = s.id
      ? "Modifica link"
      : "Nuovo link";
    document.getElementById("sam-cancel").style.display = s.id
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
    if (!(await ensureSession())) {
      alert("Sessione scaduta: effettua di nuovo il login.");
      return;
    }
    var id = document.getElementById("sam-id").value.trim();
    var nome = document.getElementById("sam-nome").value.trim();
    var url = document.getElementById("sam-url").value.trim();
    if (!nome) return alert("Nome obbligatorio");
    if (!url || !/^https?:\/\//i.test(url))
      return alert("URL obbligatorio e deve iniziare con http:// o https://");

    var payload = {
      nome: nome,
      url: url,
      descrizione: document.getElementById("sam-desc").value.trim() || null,
      emoji: document.getElementById("sam-emoji").value.trim() || "⚓",
      ordine: parseInt(document.getElementById("sam-ordine").value, 10) || 0,
      attivo: document.getElementById("sam-attivo").checked,
      updated_at: new Date().toISOString()
    };

    var btn = document.getElementById("sam-save");
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
    var form = document.getElementById("sam-form");
    if (form && !form._saWired) {
      form._saWired = true;
      form.onsubmit = saveSito;
    }

    var cancel = document.getElementById("sam-cancel");
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
