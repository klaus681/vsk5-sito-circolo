/* CVI Admin – Tutor: candidature, approvazione, sessioni */
(function () {
  "use strict";

  var MATERIE = {
    regole: "Regole",
    tecnica: "Tecnica",
    partenza: "Partenze",
    setup: "Setup",
    altro: "Altro"
  };

  var cache = [];
  var profiles = {};
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
      '<h3 style="margin:0 0 0.5rem;color:#7dd3fc">Tutor</h3>' +
      '<p style="color:#94a3b8;font-size:0.88rem;margin:0 0 1rem">Candidature soci, approvazione e sospensione. Materie: Regole, Tecnica, Partenze, Setup, Altro.</p>' +
      '<div id="tu-adm-list"><p class="loading-text">Apri questa scheda per caricare.</p></div>' +
      '<div id="tu-adm-sql" class="sql-hint" style="display:none;margin-top:0.75rem">Esegui tutor-sql.sql su Supabase.</div>' +
      "</div>" +
      '<div class="admin-card" style="margin-top:1rem">' +
      '<h3 style="margin:0 0 0.5rem;color:#a78bfa">Sessioni recenti</h3>' +
      '<div id="tu-adm-sess"><p class="loading-text">—</p></div>' +
      "</div>"
    );
  }

  function ensureUI() {
    var tabs = document.querySelector(".admin-tabs");
    if (!tabs) return false;
    var tab = tabs.querySelector('[data-tab="tutor"]');
    if (!tab) {
      tab = document.createElement("button");
      tab.type = "button";
      tab.className = "admin-tab";
      tab.setAttribute("data-tab", "tutor");
      tab.textContent = "Tutor";
      var al = tabs.querySelector('[data-tab="allenamenti"]');
      if (al && al.nextSibling) tabs.insertBefore(tab, al.nextSibling);
      else tabs.appendChild(tab);
    }
    var panel = document.getElementById("panel-tutor");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "panel-tutor";
      panel.className = "admin-panel";
      var app = document.getElementById("admin-app");
      if (!app) return false;
      app.appendChild(panel);
    }
    if (!document.getElementById("tu-adm-list")) panel.innerHTML = panelHTML();
    return true;
  }

  async function loadProfiles(ids) {
    var uniq = [];
    ids.forEach(function (id) {
      if (id && uniq.indexOf(id) < 0) uniq.push(id);
    });
    if (!uniq.length) return;
    var r = await CVI.supabase.from("profiles").select("id,nickname,team").in("id", uniq);
    (r.data || []).forEach(function (p) {
      profiles[p.id] = p;
    });
  }

  async function setStato(id, stato) {
    try {
      var r = await CVI.supabase
        .from("tutor")
        .update({ stato: stato, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (r.error) throw r.error;
      notify("Stato aggiornato: " + stato, "ok");
      loadList();
    } catch (e) {
      alert(e.message || e);
    }
  }

  async function setDisponibile(id, val) {
    try {
      var r = await CVI.supabase
        .from("tutor")
        .update({ disponibile: !!val, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (r.error) throw r.error;
      notify(val ? "Tutor disponibile" : "Tutor in pausa", "ok");
      loadList();
    } catch (e) {
      alert(e.message || e);
    }
  }

  async function loadList() {
    if (!ensureUI()) return;
    if (_loading) return;
    _loading = true;
    var box = document.getElementById("tu-adm-list");
    var hint = document.getElementById("tu-adm-sql");
    if (!box) {
      _loading = false;
      return;
    }
    box.innerHTML = '<p class="loading-text">Caricamento…</p>';
    try {
      var r = await CVI.supabase.from("tutor").select("*").order("created_at", { ascending: false });
      if (r.error) throw r.error;
      cache = r.data || [];
      if (hint) hint.style.display = "none";
      await loadProfiles(
        cache.map(function (t) {
          return t.user_id;
        })
      );

      if (!cache.length) {
        box.innerHTML = '<p class="empty-text">Nessuna candidatura tutor.</p>';
        return;
      }

      box.innerHTML = cache
        .map(function (t) {
          var p = profiles[t.user_id] || {};
          var nick = p.nickname || String(t.user_id).slice(0, 8);
          var mats = (t.materie || [])
            .map(function (m) {
              return MATERIE[m] || m;
            })
            .join(", ");
          var stColor =
            t.stato === "approvato"
              ? "#34d399"
              : t.stato === "in_attesa"
                ? "#fbbf24"
                : "#f87171";
          return (
            '<div class="admin-card" style="margin-bottom:0.75rem">' +
            '<div class="admin-card-head"><div>' +
            "<strong>" +
            esc(nick) +
            "</strong>" +
            (p.team ? " · " + esc(p.team) : "") +
            '<div class="meta">' +
            '<span style="color:' +
            stColor +
            ';font-weight:700">' +
            esc(t.stato) +
            "</span>" +
            (t.disponibile ? " · disponibile" : " · pausa") +
            (mats ? " · " + esc(mats) : "") +
            "</div>" +
            (t.bio ? '<p class="card-desc">' + esc(t.bio) + "</p>" : "") +
            (t.disponibilita_note
              ? '<p class="card-desc" style="color:#94a3b8">📅 ' +
                esc(t.disponibilita_note) +
                "</p>"
              : "") +
            "</div>" +
            '<div style="display:flex;gap:0.35rem;flex-wrap:wrap">' +
            (t.stato !== "approvato"
              ? '<button type="button" class="btn-sm tu-ok" data-id="' +
                esc(t.id) +
                '">Approva</button>'
              : "") +
            (t.stato === "approvato"
              ? '<button type="button" class="btn-sm tu-pause" data-id="' +
                esc(t.id) +
                '" data-d="' +
                (t.disponibile ? "0" : "1") +
                '">' +
                (t.disponibile ? "Metti in pausa" : "Rendi disponibile") +
                "</button>"
              : "") +
            (t.stato !== "rifiutato"
              ? '<button type="button" class="btn-danger-sm tu-no" data-id="' +
                esc(t.id) +
                '">Rifiuta</button>'
              : "") +
            (t.stato !== "sospeso"
              ? '<button type="button" class="btn-danger-sm tu-sos" data-id="' +
                esc(t.id) +
                '">Sospendi</button>'
              : "") +
            "</div></div></div>"
          );
        })
        .join("");

      box.querySelectorAll(".tu-ok").forEach(function (b) {
        b.onclick = function () {
          setStato(b.getAttribute("data-id"), "approvato");
        };
      });
      box.querySelectorAll(".tu-no").forEach(function (b) {
        b.onclick = function () {
          if (confirm("Rifiutare questa candidatura?")) setStato(b.getAttribute("data-id"), "rifiutato");
        };
      });
      box.querySelectorAll(".tu-sos").forEach(function (b) {
        b.onclick = function () {
          if (confirm("Sospendere questo tutor?")) setStato(b.getAttribute("data-id"), "sospeso");
        };
      });
      box.querySelectorAll(".tu-pause").forEach(function (b) {
        b.onclick = function () {
          setDisponibile(b.getAttribute("data-id"), b.getAttribute("data-d") === "1");
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p class="empty-text" style="color:#f87171">' + esc(e.message || e) + "</p>";
      if (hint) {
        hint.style.display = "block";
        hint.textContent = "Esegui tutor-sql.sql nel SQL Editor di Supabase.";
      }
    } finally {
      _loading = false;
      loadSessioni();
    }
  }

  async function loadSessioni() {
    var box = document.getElementById("tu-adm-sess");
    if (!box) return;
    try {
      var r = await CVI.supabase
        .from("tutor_sessioni")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (r.error) throw r.error;
      var rows = r.data || [];
      if (!rows.length) {
        box.innerHTML = '<p class="empty-text">Nessuna sessione.</p>';
        return;
      }
      await loadProfiles(
        rows.reduce(function (a, s) {
          a.push(s.allievo_id, s.tutor_user_id);
          return a;
        }, [])
      );
      box.innerHTML =
        '<ul style="list-style:none;padding:0;margin:0;font-size:0.88rem">' +
        rows
          .map(function (s) {
            var al = profiles[s.allievo_id] || {};
            var tu = profiles[s.tutor_user_id] || {};
            return (
              "<li style=\"padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.05)\">" +
              "<strong>" +
              esc(s.stato) +
              "</strong> · " +
              esc(MATERIE[s.materia] || s.materia) +
              " · tutor " +
              esc(tu.nickname || "?") +
              " → " +
              esc(al.nickname || "?") +
              "</li>"
            );
          })
          .join("") +
        "</ul>";
    } catch (e) {
      box.innerHTML = '<p style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  }

  function wire() {
    if (!ensureUI()) return;
    var tab = document.querySelector('.admin-tab[data-tab="tutor"]');
    if (tab && !tab._tuWired) {
      tab._tuWired = true;
      tab.addEventListener("click", function () {
        document.querySelectorAll(".admin-tab").forEach(function (t) {
          t.classList.remove("active");
        });
        document.querySelectorAll(".admin-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        tab.classList.add("active");
        var panel = document.getElementById("panel-tutor");
        if (panel) panel.classList.add("active");
        loadList();
      });
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
