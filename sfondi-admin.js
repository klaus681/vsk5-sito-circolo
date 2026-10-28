/* CVI Admin - Sfondi Home (hero + card + torneo + allenamento + eventi) */
(function () {
  "use strict";

  var KEYS = [
    { key: "home_bg_hero", label: "Sfondo Hero (banner principale)", hint: "Immagine grande dietro titolo e slogan" },
    { key: "home_bg_next_race", label: "Sfondo card Prossima gara", hint: "Card accanto alle statistiche" },
    { key: "home_bg_torneo", label: "Sfondo banner Torneo", hint: "Banner torneo pubblicato in home" },
    { key: "home_bg_allenamento", label: "Sfondo banner Allenamento", hint: "Banner prossimo allenamento in home" },
    { key: "home_bg_eventi", label: "Sfondo banner Eventi", hint: "Banner serie/eventi aperti in home" }
  ];

  var DEFAULTS = {
    home_bg_hero:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1400&q=70",
    home_bg_next_race:
      "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1000&q=70",
    home_bg_torneo: "",
    home_bg_allenamento:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=70",
    home_bg_eventi:
      "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1000&q=70"
  };

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, String.fromCharCode(38, 97, 109, 112, 59))
      .replace(/</g, String.fromCharCode(38, 108, 116, 59))
      .replace(/>/g, String.fromCharCode(38, 103, 116, 59))
      .replace(/"/g, String.fromCharCode(38, 113, 117, 111, 116, 59));
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
    if (msg)
      notify._t = setTimeout(function () {
        el.textContent = "";
        el.className = "admin-status";
      }, 4000);
  }

  function panelHTML() {
    var blocks = KEYS.map(function (k) {
      return (
        '<div class="admin-card" style="margin-bottom:1rem" data-bg-key="' +
        esc(k.key) +
        '">' +
        "<h4 style=\"margin:0 0 0.35rem;color:#7dd3fc\">" +
        esc(k.label) +
        "</h4>" +
        '<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 0.75rem">' +
        esc(k.hint) +
        "</p>" +
        '<div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-start">' +
        '<div style="flex:1;min-width:220px">' +
        '<label class="adm-label" for="sf-' +
        esc(k.key) +
        '-url">URL immagine</label>' +
        '<input class="adm-input sf-url" id="sf-' +
        esc(k.key) +
        '-url" data-key="' +
        esc(k.key) +
        '" style="width:100%" placeholder="https://...">' +
        '<label class="adm-label" style="margin-top:0.65rem">Oppure carica dal PC</label>' +
        '<input type="file" class="sf-file" data-key="' +
        esc(k.key) +
        '" accept="image/jpeg,image/png,image/webp,image/gif">' +
        '<p class="sf-status" data-key="' +
        esc(k.key) +
        '" style="margin:0.35rem 0 0;font-size:0.8rem;color:#94a3b8"></p>' +
        "</div>" +
        '<div style="width:160px">' +
        '<div class="sf-preview" data-key="' +
        esc(k.key) +
        '" style="width:160px;height:90px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:#0b0f19 center/cover no-repeat"></div>' +
        '<button type="button" class="btn-ghost sf-reset" data-key="' +
        esc(k.key) +
        '" style="margin-top:0.4rem;font-size:0.8rem">Ripristina default</button>' +
        "</div></div></div>"
      );
    }).join("");

    return (
      '<div class="admin-card">' +
      '<h3 style="margin:0 0 0.5rem;color:#7dd3fc">Sfondi Home</h3>' +
      '<p style="color:#94a3b8;font-size:0.88rem;margin:0 0 1rem">Cambia solo le immagini di sfondo. Testi, layout e bottoni restano invariati. Puoi incollare un URL oppure caricare un file (max 5 MB) su Supabase Storage.</p>' +
      blocks +
      '<div class="form-actions">' +
      '<button type="button" class="btn-primary" id="sf-save-btn">Salva sfondi</button>' +
      "</div>" +
      '<p id="sf-sql-hint" class="sql-hint" style="display:none;margin-top:0.75rem">Se l\'upload fallisce, crea il bucket pubblico (vedi sfondi-sql.sql).</p>' +
      "</div>"
    );
  }

  function ensureUI() {
    var tabs = document.querySelector(".admin-tabs");
    if (!tabs) return false;
    var tab = tabs.querySelector('[data-tab="sfondi"]');
    if (!tab) {
      tab = document.createElement("button");
      tab.type = "button";
      tab.className = "admin-tab";
      tab.setAttribute("data-tab", "sfondi");
      tab.textContent = "Sfondi";
      var set =
        tabs.querySelector('[data-tab="settings"]') ||
        tabs.querySelector('[data-tab="impostazioni"]');
      if (set) tabs.insertBefore(tab, set.nextSibling);
      else tabs.appendChild(tab);
    }
    var panel = document.getElementById("panel-sfondi");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "panel-sfondi";
      panel.className = "admin-panel";
      var app = document.getElementById("admin-app");
      if (!app) return false;
      app.appendChild(panel);
    }
    if (!document.getElementById("sf-save-btn")) panel.innerHTML = panelHTML();
    return true;
  }

  function setPreview(key, url) {
    var box = document.querySelector('.sf-preview[data-key="' + key + '"]');
    if (!box) return;
    if (url) {
      box.style.backgroundImage = 'url("' + String(url).replace(/"/g, "") + '")';
    } else {
      box.style.backgroundImage = "none";
    }
  }

  function setStatus(key, msg, color) {
    var el = document.querySelector('.sf-status[data-key="' + key + '"]');
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = color || "#94a3b8";
  }

  async function loadSfondi() {
    if (!ensureUI()) return;
    if (!window.CVI || !CVI.supabase) return;
    try {
      var keys = KEYS.map(function (k) {
        return k.key;
      });
      var res = await CVI.supabase.from("site_settings").select("key,value").in("key", keys);
      if (res.error) throw res.error;
      var map = {};
      (res.data || []).forEach(function (r) {
        map[r.key] = r.value;
      });
      KEYS.forEach(function (k) {
        var url = map[k.key] || "";
        var input = document.getElementById("sf-" + k.key + "-url");
        if (input) input.value = url;
        setPreview(k.key, url || DEFAULTS[k.key] || "");
        setStatus(k.key, url ? "Personalizzato" : "Default del sito", "#94a3b8");
      });
    } catch (e) {
      var hint = document.getElementById("sf-sql-hint");
      if (hint) {
        hint.style.display = "block";
        hint.textContent = "Errore: " + (e.message || e);
      }
    }
  }

  async function uploadFile(key, file) {
    if (!file) return;
    if (!window.CVI || !CVI.supabase) {
      setStatus(key, "Supabase non disponibile", "#f87171");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus(key, "File troppo grande (max 5 MB)", "#f87171");
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type || "")) {
      setStatus(key, "Formato non supportato (usa JPG, PNG, WebP o GIF)", "#f87171");
      return;
    }
    setStatus(key, "Caricamento «" + file.name + "»…", "#94a3b8");
    try {
      var sess = await CVI.supabase.auth.getSession();
      var session = sess.data && sess.data.session;
      if (!session) {
        setStatus(key, "Devi essere loggato come admin", "#f87171");
        return;
      }
      var ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      var path = "sfondi/" + key + "/" + Date.now() + "." + ext;
      var buckets = ["site-assets", "gallery", "downloads"];
      var used = null;
      var lastErr = null;
      for (var i = 0; i < buckets.length; i++) {
        var up = await CVI.supabase.storage
          .from(buckets[i])
          .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
        if (!up.error) {
          used = buckets[i];
          break;
        }
        lastErr = up.error;
      }
      if (!used) throw lastErr || new Error("Upload non riuscito");
      var pub = CVI.supabase.storage.from(used).getPublicUrl(path);
      var url = pub.data && pub.data.publicUrl;
      if (!url) throw new Error("URL pubblico non disponibile");
      var input = document.getElementById("sf-" + key + "-url");
      if (input) input.value = url;
      setPreview(key, url);
      setStatus(key, "Caricato su «" + used + "». Premi Salva sfondi.", "#34d399");
    } catch (err) {
      setStatus(key, "Errore upload: " + (err.message || err), "#f87171");
      var hint = document.getElementById("sf-sql-hint");
      if (hint) hint.style.display = "block";
    }
  }

  async function saveSfondi() {
    var btn = document.getElementById("sf-save-btn");
    if (btn) btn.disabled = true;
    try {
      for (var i = 0; i < KEYS.length; i++) {
        var k = KEYS[i].key;
        var input = document.getElementById("sf-" + k + "-url");
        var val = input ? input.value.trim() : "";
        var r = await CVI.supabase.from("site_settings").upsert(
          { key: k, value: val, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
        if (r.error) throw r.error;
        setPreview(k, val || DEFAULTS[k] || "");
        setStatus(k, val ? "Salvato" : "Default (vuoto)", "#34d399");
      }
      notify("Sfondi salvati", "ok");
    } catch (err) {
      notify(err.message || err, "err");
      alert("Errore salvataggio: " + (err.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wire() {
    if (!ensureUI()) return;
    KEYS.forEach(function (k) {
      var file = document.querySelector('.sf-file[data-key="' + k.key + '"]');
      if (file && !file._wired) {
        file._wired = true;
        file.onchange = function () {
          var f = file.files && file.files[0];
          if (f) uploadFile(k.key, f);
        };
      }
      var url = document.getElementById("sf-" + k.key + "-url");
      if (url && !url._wired) {
        url._wired = true;
        url.addEventListener("input", function () {
          setPreview(k.key, url.value.trim() || DEFAULTS[k.key] || "");
        });
      }
      var reset = document.querySelector('.sf-reset[data-key="' + k.key + '"]');
      if (reset && !reset._wired) {
        reset._wired = true;
        reset.onclick = function () {
          var input = document.getElementById("sf-" + k.key + "-url");
          if (input) input.value = "";
          setPreview(k.key, DEFAULTS[k.key] || "");
          setStatus(k.key, "Ripristinato (salva per applicare)", "#94a3b8");
        };
      }
    });
    var save = document.getElementById("sf-save-btn");
    if (save && !save._wired) {
      save._wired = true;
      save.onclick = saveSfondi;
    }
    document.querySelectorAll('.admin-tab[data-tab="sfondi"]').forEach(function (tab) {
      if (tab._sfWired) return;
      tab._sfWired = true;
      tab.addEventListener(
        "click",
        function () {
          setTimeout(loadSfondi, 50);
        },
        true
      );
    });
  }

  function boot() {
    wire();
    setTimeout(wire, 600);
    setTimeout(wire, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
