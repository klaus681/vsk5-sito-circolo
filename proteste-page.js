(function () {
  var currentUser = null,
    currentProfile = null;
  var MAX_FILE_BYTES = 8 * 1024 * 1024;
  var ALLOWED_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf"
  };

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var STATUS = {
    pending: "In attesa",
    in_esame: "In esame",
    accolta: "Accolta",
    respinta: "Respinta",
    ritirata: "Ritirata"
  };

  async function ensureAuth() {
    if (!CVI.supabase) return false;
    var s = await CVI.supabase.auth.getSession();
    if (!s.data || !s.data.session || !s.data.session.user) {
      document.getElementById("auth-gate").style.display = "block";
      document.getElementById("protest-app").style.display = "none";
      return false;
    }
    currentUser = s.data.session.user;
    var pr = await CVI.supabase
      .from("profiles")
      .select("id,nickname,nome,cognome")
      .eq("id", currentUser.id)
      .maybeSingle();
    currentProfile = pr.data || {};
    var nick = currentProfile.nickname || currentUser.email || "Socio";
    document.getElementById("pr-protestante").value =
      nick +
      (currentProfile.nome
        ? " (" +
          [currentProfile.nome, currentProfile.cognome].filter(Boolean).join(" ") +
          ")"
        : "");
    document.getElementById("auth-gate").style.display = "none";
    document.getElementById("protest-app").style.display = "block";
    return true;
  }

  async function loadGare() {
    var sel = document.getElementById("pr-gara");
    try {
      var res = await CVI.supabase
        .from("gare")
        .select("id,titolo,data_gara")
        .order("data_gara", { ascending: false })
        .limit(80);
      if (res.error) throw res.error;
      sel.innerHTML =
        '<option value="">— Seleziona gara —</option>' +
        (res.data || [])
          .map(function (g) {
            var d = "";
            try {
              d = new Date(g.data_gara).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });
            } catch (e) {}
            return (
              '<option value="' +
              esc(g.id) +
              '" data-titolo="' +
              esc(g.titolo || "") +
              '">' +
              esc(g.titolo || "Gara") +
              (d ? " · " + d : "") +
              "</option>"
            );
          })
          .join("");
    } catch (e) {
      sel.innerHTML = '<option value="">Errore caricamento gare</option>';
    }
  }

  function allegatoHtml(url) {
    if (!url) return "";
    var isImg = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
    if (isImg) {
      return (
        '<div style="margin-top:.65rem"><a href="' +
        esc(url) +
        '" target="_blank" rel="noopener"><img src="' +
        esc(url) +
        '" alt="Allegato" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid rgba(255,255,255,.08)"></a></div>'
      );
    }
    return (
      '<div class="protest-meta" style="margin-top:.5rem"><a href="' +
      esc(url) +
      '" target="_blank" rel="noopener" style="color:#7dd3fc">📎 Apri allegato</a></div>'
    );
  }

  async function loadMyProtests() {
    var box = document.getElementById("my-protests");
    box.innerHTML = '<p style="color:#94a3b8">Caricamento…</p>';
    try {
      var res = await CVI.supabase
        .from("proteste")
        .select("*")
        .eq("protestante_id", currentUser.id)
        .order("created_at", { ascending: false });
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) {
        box.innerHTML =
          '<p style="color:#94a3b8">Non hai ancora presentato proteste.</p>';
        return;
      }
      box.innerHTML = rows
        .map(function (p) {
          var st = p.status || "pending";
          var dateStr = "";
          try {
            dateStr = new Date(p.created_at).toLocaleString("it-IT", {
              dateStyle: "medium",
              timeStyle: "short"
            });
          } catch (e) {}
          return (
            '<div class="protest-card" style="margin-bottom:.75rem;padding:1rem 1.1rem"><div style="display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap"><div><strong style="color:#fff">' +
            esc(p.gara_titolo || "Gara") +
            '</strong><div class="protest-meta">vs <strong>' +
            esc(p.protestato_nick || "—") +
            "</strong>" +
            (p.regola ? " · " + esc(p.regola) : "") +
            (dateStr ? " · " + dateStr : "") +
            '</div></div><span class="status-pill st-' +
            st +
            '">' +
            esc(STATUS[st] || st) +
            '</span></div><div class="protest-body">' +
            esc(p.descrizione || "") +
            "</div>" +
            allegatoHtml(p.allegati_url) +
            (p.admin_note
              ? '<div class="protest-meta" style="margin-top:.5rem"><strong>Nota comitato:</strong> ' +
                esc(p.admin_note) +
                "</div>"
              : "") +
            (st === "pending"
              ? '<div style="margin-top:.75rem"><button type="button" class="btn-outline btn-ritira" data-id="' +
                esc(p.id) +
                '">Ritira</button></div>'
              : "") +
            "</div>"
          );
        })
        .join("");
      box.querySelectorAll(".btn-ritira").forEach(function (btn) {
        btn.onclick = async function () {
          if (!confirm("Ritirare questa protesta?")) return;
          btn.disabled = true;
          var r = await CVI.supabase
            .from("proteste")
            .update({
              status: "ritirata",
              updated_at: new Date().toISOString()
            })
            .eq("id", btn.getAttribute("data-id"))
            .eq("protestante_id", currentUser.id)
            .eq("status", "pending");
          if (r.error) alert(r.error.message);
          loadMyProtests();
        };
      });
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  }

  async function uploadAllegato(file) {
    if (!file) return null;
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("File troppo grande (max 8 MB)");
    }
    var ext = ALLOWED_EXT[file.type];
    if (!ext) {
      var m = String(file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
      var ne = m ? m[1] : "";
      if (ne === "jpeg") ne = "jpg";
      if (["jpg", "png", "webp", "gif", "pdf"].indexOf(ne) < 0) {
        throw new Error("Formato non supportato. Usa JPG, PNG, WEBP, GIF o PDF.");
      }
      ext = ne;
    }
    var path =
      currentUser.id +
      "/" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      "." +
      ext;
    var up = await CVI.supabase.storage.from("proteste").upload(path, file, {
      contentType: file.type || (ext === "pdf" ? "application/pdf" : "image/" + ext),
      upsert: false
    });
    if (up.error) {
      var msg = up.error.message || String(up.error);
      if (/bucket|not found|policy|row-level/i.test(msg)) {
        throw new Error(
          "Upload non disponibile: crea il bucket «proteste» su Supabase (vedi proteste-sql.sql)."
        );
      }
      throw up.error;
    }
    var pub = CVI.supabase.storage.from("proteste").getPublicUrl(path);
    return (pub.data && pub.data.publicUrl) || null;
  }

  document.getElementById("protest-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var statusEl = document.getElementById("form-status"),
      btn = document.getElementById("pr-submit");
    var sel = document.getElementById("pr-gara"),
      opt = sel.options[sel.selectedIndex];
    var garaId = sel.value,
      garaTitolo = opt
        ? opt.getAttribute("data-titolo") || opt.textContent
        : "";
    var protestato = document.getElementById("pr-protestato").value.trim();
    var regola = document.getElementById("pr-regola").value.trim();
    var momento = document.getElementById("pr-momento").value.trim();
    var descrizione = document.getElementById("pr-desc").value.trim();
    var testimoni = document.getElementById("pr-testimoni").value.trim();
    var allegatiUrl = document.getElementById("pr-allegati").value.trim();
    var fileInput = document.getElementById("pr-file");
    var file = fileInput && fileInput.files && fileInput.files[0];

    if (!garaId || !protestato || !descrizione) {
      statusEl.textContent = "Compila i campi obbligatori.";
      statusEl.style.color = "#f87171";
      return;
    }

    btn.disabled = true;
    statusEl.textContent = file ? "Caricamento allegato…" : "Invio in corso…";
    statusEl.style.color = "#94a3b8";

    try {
      if (file) {
        var uploaded = await uploadAllegato(file);
        if (uploaded) allegatiUrl = uploaded;
      }

      var payload = {
        protestante_id: currentUser.id,
        protestante_nick:
          currentProfile.nickname || currentUser.email || null,
        gara_id: garaId,
        gara_titolo: garaTitolo,
        protestato_nick: protestato,
        regola: regola || null,
        descrizione: descrizione,
        momento: momento || null,
        testimoni: testimoni || null,
        allegati_url: allegatiUrl || null,
        status: "pending"
      };

      statusEl.textContent = "Invio protesta…";
      var r = await CVI.supabase
        .from("proteste")
        .insert(payload)
        .select()
        .maybeSingle();
      if (r.error) throw r.error;

      statusEl.textContent = "Protesta inviata correttamente.";
      statusEl.style.color = "#34d399";
      document.getElementById("protest-form").reset();
      document.getElementById("pr-protestante").value =
        (currentProfile.nickname || currentUser.email || "Socio") +
        (currentProfile.nome
          ? " (" +
            [currentProfile.nome, currentProfile.cognome]
              .filter(Boolean)
              .join(" ") +
            ")"
          : "");
      if (window.CVIDiscord && CVIDiscord.notifyProtesta) {
        try {
          await CVIDiscord.notifyProtesta({
            protestante: payload.protestante_nick,
            protestato: protestato,
            gara: garaTitolo,
            regola: regola,
            descrizione: descrizione
          });
        } catch (err) {}
      }
      loadMyProtests();
    } catch (err) {
      statusEl.textContent = err.message || String(err);
      statusEl.style.color = "#f87171";
    } finally {
      btn.disabled = false;
    }
  });

  (async function () {
    if (typeof CVI !== "undefined" && CVI.init) CVI.init("proteste.html");
    if (!(await ensureAuth())) return;
    await loadGare();
    await loadMyProtests();
  })();
})();
