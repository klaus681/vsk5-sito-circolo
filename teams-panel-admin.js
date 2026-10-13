/* CVI Admin - gestione team + team_id */
(function () {
  "use strict";

  var teamsCache = [];
  var profilesCache = [];
  var editingId = null;
  var managingTeam = null;
  var hasTeamIdCol = null;

  function esc(s) {
    if (s == null) return "";
    var t = String(s);
    var a = String.fromCharCode(38);
    return t.split(a).join(a + "amp;").split("<").join(a + "lt;").split(">").join(a + "gt;").split('"').join(a + "quot;");
  }

  function notify(msg, type) {
    if (typeof status === "function") { status(msg, type); return; }
    var el = document.getElementById("admin-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "admin-status" + (type ? " " + type : "");
    clearTimeout(notify._t);
    if (msg) notify._t = setTimeout(function () { el.textContent = ""; el.className = "admin-status"; }, 4000);
  }

  function profileLabel(p) {
    if (!p) return "?";
    var nick = (p.nickname || "").trim();
    var nome = [p.nome, p.cognome].filter(Boolean).join(" ").trim();
    if (nick && nome) return nick + " (" + nome + ")";
    return nick || nome || (p.email || String(p.id).slice(0, 8));
  }

  function teamNameOf(t) {
    return ((t && (t.nome_team || t.nome)) || "").trim();
  }

  function detectTeamIdCol(profiles) {
    if (hasTeamIdCol !== null) return hasTeamIdCol;
    if (!profiles || !profiles.length) return false;
    hasTeamIdCol = Object.prototype.hasOwnProperty.call(profiles[0], "team_id");
    return hasTeamIdCol;
  }

  function membersOfTeam(team) {
    if (!team) return [];
    var tid = String(team.id);
    var name = teamNameOf(team).toLowerCase();
    var useId = detectTeamIdCol(profilesCache);
    return profilesCache.filter(function (p) {
      if (useId && p.team_id != null && String(p.team_id) !== "") {
        return String(p.team_id) === tid;
      }
      return p.team && String(p.team).trim().toLowerCase() === name;
    });
  }

  function resetTeamForm() {
    editingId = null;
    var idEl = document.getElementById("tm-id");
    if (!idEl) return;
    idEl.value = "";
    document.getElementById("tm-nome").value = "";
    document.getElementById("tm-capitano").value = "";
    document.getElementById("tm-desc").value = "";
    document.getElementById("tm-form-title").textContent = "Nuovo team";
    document.getElementById("tm-save-btn").textContent = "Salva team";
    var cancel = document.getElementById("tm-cancel-btn");
    if (cancel) cancel.style.display = "none";
    document.getElementById("tm-members-panel").style.display = "none";
    managingTeam = null;
  }

  function detectTeamCols(sample) {
    var cols = { name: "nome_team", hasNome: false, hasNomeTeam: false };
    if (!sample) return cols;
    cols.hasNomeTeam = Object.prototype.hasOwnProperty.call(sample, "nome_team");
    cols.hasNome = Object.prototype.hasOwnProperty.call(sample, "nome");
    if (cols.hasNomeTeam) cols.name = "nome_team";
    else if (cols.hasNome) cols.name = "nome";
    return cols;
  }

  async function upsertTeam(row, isUpdate, id) {
    var sample = (teamsCache && teamsCache[0]) || null;
    if (isUpdate && id) {
      var cur = teamsCache.find(function (x) { return String(x.id) === String(id); });
      if (cur) sample = cur;
    }
    var cols = detectTeamCols(sample);
    var payload = {};
    if (cols.hasNomeTeam) payload.nome_team = row.nome;
    if (cols.hasNome) payload.nome = row.nome;
    if (!cols.hasNomeTeam && !cols.hasNome) {
      payload.nome_team = row.nome;
      payload.nome = row.nome;
    }
    payload.descrizione = row.descrizione;
    payload.capitano = row.capitano;

    var r;
    if (isUpdate) {
      r = await CVI.supabase.from("teams").update(payload).eq("id", id).select("*");
      if (r.error) {
        var p2 = {};
        p2[cols.name] = row.nome;
        p2.descrizione = row.descrizione;
        p2.capitano = row.capitano;
        r = await CVI.supabase.from("teams").update(p2).eq("id", id).select("*");
      }
      if (!r.error && (!r.data || !r.data.length)) {
        return { error: { message: "Update non applicato (0 righe). Controlla policy RLS UPDATE su tabella teams per ruolo admin." } };
      }
    } else {
      r = await CVI.supabase.from("teams").insert(payload).select("*");
      if (r.error) {
        var p3 = {};
        p3[cols.name] = row.nome;
        p3.descrizione = row.descrizione;
        p3.capitano = row.capitano;
        r = await CVI.supabase.from("teams").insert(p3).select("*");
      }
    }
    return r;
  }

  async function syncMemberTeamText(teamId, newName) {
    var useId = detectTeamIdCol(profilesCache);
    if (useId) {
      var r = await CVI.supabase.from("profiles").update({ team: newName }).eq("team_id", teamId);
      if (r.error) return { ok: false, error: r.error };
      return { ok: true };
    }
    return { ok: true };
  }

  async function reassignMembersByName(oldName, newName) {
    if (!oldName || !newName) return { ok: true, count: 0 };
    if (String(oldName).trim().toLowerCase() === String(newName).trim().toLowerCase()) return { ok: true, count: 0 };
    var pr = await CVI.supabase.from("profiles").select("id,team");
    if (pr.error) return { ok: false, error: pr.error };
    var oldLower = String(oldName).trim().toLowerCase();
    var ids = (pr.data || []).filter(function (p) {
      return p.team && String(p.team).trim().toLowerCase() === oldLower;
    }).map(function (p) { return p.id; });
    if (!ids.length) return { ok: true, count: 0 };
    var r = await CVI.supabase.from("profiles").update({ team: newName }).in("id", ids);
    if (r.error) return { ok: false, error: r.error };
    return { ok: true, count: ids.length };
  }

  async function setMemberTeam(uid, team) {
    var payload = {};
    if (team) {
      payload.team = teamNameOf(team);
      if (detectTeamIdCol(profilesCache)) payload.team_id = team.id;
    } else {
      payload.team = null;
      if (detectTeamIdCol(profilesCache)) payload.team_id = null;
    }
    var r = await CVI.supabase.from("profiles").update(payload).eq("id", uid);
    if (r.error && payload.team_id !== undefined) {
      hasTeamIdCol = false;
      delete payload.team_id;
      r = await CVI.supabase.from("profiles").update(payload).eq("id", uid);
    }
    if (r.error && payload.team === null) {
      r = await CVI.supabase.from("profiles").update({ team: "" }).eq("id", uid);
    }
    return r;
  }

  window.loadTeamsAdmin = async function loadTeamsAdmin() {
    var box = document.getElementById("tm-list");
    var hint = document.getElementById("tm-sql-hint");
    if (!box) return;
    box.innerHTML = '<p class="loading-text">Caricamento…</p>';
    try {
      var tr = await CVI.supabase.from("teams").select("*");
      if (tr.error) throw tr.error;
      teamsCache = tr.data || [];

      var pr = await CVI.supabase.from("profiles").select("id,nickname,nome,cognome,team,team_id,email");
      if (pr.error && /team_id|column/i.test(pr.error.message || "")) {
        hasTeamIdCol = false;
        pr = await CVI.supabase.from("profiles").select("id,nickname,nome,cognome,team,email");
      }
      if (pr.error) throw pr.error;
      profilesCache = pr.data || [];
      detectTeamIdCol(profilesCache);

      if (!teamsCache.length) {
        box.innerHTML = '<p class="empty-text">Nessun team. Creane uno con il form qui sopra.</p>';
        return;
      }

      teamsCache.sort(function (a, b) {
        return teamNameOf(a).localeCompare(teamNameOf(b), "it");
      });

      var modeHint = hasTeamIdCol
        ? '<p style="color:#34d399;font-size:0.8rem;margin:0 0 0.75rem">Modalita stabile: membri collegati con team_id (rinomina senza perdere iscritti).</p>'
        : '<p style="color:#fbbf24;font-size:0.8rem;margin:0 0 0.75rem">Modalita legacy: legame per nome. Esegui lo SQL sotto per attivare team_id.</p>';

      box.innerHTML = modeHint +
        '<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 0.75rem">' + teamsCache.length + ' team</p>' +
        teamsCache.map(function (t) {
          var name = teamNameOf(t);
          var members = membersOfTeam(t);
          var cap = t.capitano || t.skipper || "";
          var memberNicks = members.slice(0, 8).map(function (m) { return esc(profileLabel(m)); }).join(", ");
          if (members.length > 8) memberNicks += " … +" + (members.length - 8);
          return '<div class="admin-card" style="margin-bottom:0.75rem">' +
            '<div class="admin-card-head"><div><strong>' + esc(name) + '</strong>' +
            '<div class="meta">' + (cap ? "Capitano: " + esc(cap) + " · " : "") + members.length + ' membri</div></div>' +
            '<div class="admin-card-actions" style="display:flex;gap:0.4rem;flex-wrap:wrap">' +
            '<button type="button" class="btn-sm tm-members" data-id="' + esc(t.id) + '">Membri</button>' +
            '<button type="button" class="btn-sm tm-edit" data-id="' + esc(t.id) + '">Modifica</button>' +
            '<button type="button" class="btn-danger-sm tm-del" data-id="' + esc(t.id) + '">Elimina</button>' +
            '</div></div>' +
            (t.descrizione ? '<p class="card-desc">' + esc(t.descrizione) + '</p>' : '') +
            (members.length
              ? '<div class="meta" style="margin-top:.35rem;font-size:.82rem;color:#cbd5e1">' + memberNicks + '</div>'
              : '<div class="meta" style="margin-top:.35rem;color:#64748b">Nessun membro</div>') +
            '</div>';
        }).join("");

      box.querySelectorAll(".tm-edit").forEach(function (b) {
        b.onclick = function () {
          var t = teamsCache.find(function (x) { return String(x.id) === b.getAttribute("data-id"); });
          if (!t) return;
          editingId = t.id;
          document.getElementById("tm-id").value = t.id;
          document.getElementById("tm-nome").value = teamNameOf(t);
          document.getElementById("tm-capitano").value = t.capitano || t.skipper || "";
          document.getElementById("tm-desc").value = t.descrizione || "";
          document.getElementById("tm-form-title").textContent = "Modifica team";
          document.getElementById("tm-save-btn").textContent = "Aggiorna";
          var cancel = document.getElementById("tm-cancel-btn");
          if (cancel) cancel.style.display = "inline-block";
          document.getElementById("tm-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
        };
      });

      box.querySelectorAll(".tm-members").forEach(function (b) {
        b.onclick = function () {
          var t = teamsCache.find(function (x) { return String(x.id) === b.getAttribute("data-id"); });
          if (!t) return;
          openMembersPanel(t);
        };
      });

      box.querySelectorAll(".tm-del").forEach(function (b) {
        b.onclick = async function () {
          var t = teamsCache.find(function (x) { return String(x.id) === b.getAttribute("data-id"); });
          if (!t) return;
          var name = teamNameOf(t);
          if (!confirm("Eliminare il team «" + name + "»?\nI membri verranno scollegati (restano soci del circolo).")) return;
          b.disabled = true;
          try {
            var members = membersOfTeam(t);
            for (var i = 0; i < members.length; i++) await setMemberTeam(members[i].id, null);
            await CVI.supabase.from("profiles").update({ team: null }).ilike("team", name);
            var r = await CVI.supabase.from("teams").delete().eq("id", t.id);
            if (r.error) throw r.error;
            notify("Team eliminato", "ok");
            if (managingTeam && String(managingTeam.id) === String(t.id)) {
              document.getElementById("tm-members-panel").style.display = "none";
              managingTeam = null;
            }
            loadTeamsAdmin();
          } catch (err) {
            b.disabled = false;
            notify(err.message || String(err), "err");
            alert("Errore eliminazione: " + (err.message || err));
          }
        };
      });

      if (!hasTeamIdCol && hint) {
        hint.style.display = "block";
        hint.innerHTML =
          "<strong>Consigliato:</strong> collega i soci con <code>team_id</code> (rinomine stabili). Esegui in Supabase → SQL Editor:<br>" +
          "<pre style=\"margin:.5rem 0;padding:.6rem;background:#0b0f19;border-radius:8px;overflow:auto;font-size:.75rem;color:#cbd5e1\">" +
          "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;\n" +
          "CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);\n\n" +
          "UPDATE profiles p SET team_id = t.id\nFROM teams t\n" +
          "WHERE p.team_id IS NULL AND p.team IS NOT NULL\n" +
          "  AND lower(trim(p.team)) = lower(trim(coalesce(t.nome_team, t.nome)));" +
          "</pre>Poi ricarica questa pagina.";
      } else if (hint && hasTeamIdCol) {
        hint.style.display = "none";
      }
    } catch (e) {
      box.innerHTML = '<p class="empty-text" style="color:#f87171">Errore: ' + esc(e.message || e) + '</p>';
      if (hint) hint.style.display = "block";
    }
  };

  function openMembersPanel(team) {
    managingTeam = team;
    var panel = document.getElementById("tm-members-panel");
    panel.style.display = "block";
    document.getElementById("tm-mp-name").textContent = teamNameOf(team);
    document.getElementById("tm-mp-status").textContent = "";
    renderMembersPanel();
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderMembersPanel() {
    if (!managingTeam) return;
    var members = membersOfTeam(managingTeam);
    var memberIds = {};
    members.forEach(function (m) { memberIds[String(m.id)] = true; });
    var others = profilesCache.filter(function (p) { return !memberIds[String(p.id)]; });

    var list = document.getElementById("tm-mp-list");
    if (!members.length) {
      list.innerHTML = '<p style="color:#94a3b8;font-size:0.88rem;margin:0">Nessun membro in questo team.</p>';
    } else {
      list.innerHTML = '<ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.4rem">' +
        members.map(function (m) {
          return '<li style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;background:#0b0f19;padding:0.45rem 0.65rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">' +
            '<span style="color:#fff;font-size:0.88rem;font-weight:600">' + esc(profileLabel(m)) + '</span>' +
            '<button type="button" data-uid="' + esc(m.id) + '" class="tm-mp-remove" style="background:transparent;color:#f87171;border:1px solid rgba(248,113,113,0.4);padding:0.25rem 0.55rem;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit">Rimuovi</button></li>';
        }).join("") + '</ul>';
      list.querySelectorAll(".tm-mp-remove").forEach(function (btn) {
        btn.onclick = function () { removeMember(btn.getAttribute("data-uid")); };
      });
    }

    var sel = document.getElementById("tm-mp-add-select");
    sel.innerHTML = '<option value="">— Seleziona socio da aggiungere —</option>' +
      others.map(function (p) {
        var cur = "";
        if (p.team) cur = " (ora: " + p.team + ")";
        else if (p.team_id) {
          var ot = teamsCache.find(function (x) { return String(x.id) === String(p.team_id); });
          if (ot) cur = " (ora: " + teamNameOf(ot) + ")";
        }
        return '<option value="' + esc(p.id) + '">' + esc(profileLabel(p)) + esc(cur) + '</option>';
      }).join("");
  }

  async function addMember() {
    if (!managingTeam) return;
    var sel = document.getElementById("tm-mp-add-select");
    var uid = sel.value;
    var st = document.getElementById("tm-mp-status");
    if (!uid) { st.textContent = "Seleziona un socio."; st.style.color = "#f87171"; return; }
    st.textContent = "Aggiunta…"; st.style.color = "#94a3b8";
    var r = await setMemberTeam(uid, managingTeam);
    if (r.error) { st.textContent = "Errore: " + r.error.message; st.style.color = "#f87171"; return; }
    profilesCache.forEach(function (p) {
      if (String(p.id) === String(uid)) {
        p.team = teamNameOf(managingTeam);
        if (hasTeamIdCol) p.team_id = managingTeam.id;
      }
    });
    st.textContent = "Membro aggiunto."; st.style.color = "#34d399";
    renderMembersPanel();
    loadTeamsAdmin();
  }

  async function removeMember(uid) {
    if (!uid) return;
    if (!confirm("Rimuovere questo socio dal team?")) return;
    var st = document.getElementById("tm-mp-status");
    st.textContent = "Rimozione…"; st.style.color = "#94a3b8";
    var r = await setMemberTeam(uid, null);
    if (r.error) { st.textContent = "Errore: " + r.error.message; st.style.color = "#f87171"; return; }
    profilesCache.forEach(function (p) {
      if (String(p.id) === String(uid)) {
        p.team = "";
        if (hasTeamIdCol) p.team_id = null;
      }
    });
    st.textContent = "Membro rimosso."; st.style.color = "#34d399";
    renderMembersPanel();
    loadTeamsAdmin();
  }

  async function saveTeam(e) {
    e.preventDefault();
    var nome = document.getElementById("tm-nome").value.trim();
    var capitano = document.getElementById("tm-capitano").value.trim();
    var descrizione = document.getElementById("tm-desc").value.trim();
    var id = document.getElementById("tm-id").value.trim();
    if (!nome) return alert("Il nome del team è obbligatorio");

    var previousName = null;
    if (id) {
      var old = teamsCache.find(function (x) { return String(x.id) === String(id); });
      if (old) previousName = teamNameOf(old);
    }

    var btn = document.getElementById("tm-save-btn");
    btn.disabled = true;
    try {
      var r = await upsertTeam({
        nome: nome,
        descrizione: descrizione || null,
        capitano: capitano || null
      }, !!id, id);
      if (r.error) throw r.error;

      if (id && previousName && previousName.toLowerCase() !== nome.toLowerCase()) {
        var useId = detectTeamIdCol(profilesCache);
        if (useId) {
          var sy = await syncMemberTeamText(id, nome);
          notify(sy.ok ? "Team rinominato (membri restano collegati via team_id)" : "Team rinominato · testo membri non aggiornato", sy.ok ? "ok" : "err");
        } else {
          var re = await reassignMembersByName(previousName, nome);
          if (!re.ok) {
            alert("Team salvato, ma i membri non sono stati riassegnati: " + ((re.error && re.error.message) || ""));
            notify("Team salvato · membri non aggiornati", "err");
          } else {
            notify("Team aggiornato" + (re.count ? " · " + re.count + " membri riassegnati" : ""), "ok");
          }
        }
      } else {
        notify(id ? "Team aggiornato" : "Team creato", "ok");
      }
      resetTeamForm();
      loadTeamsAdmin();
    } catch (err) {
      notify(err.message || String(err), "err");
      var hint = document.getElementById("tm-sql-hint");
      if (hint) hint.style.display = "block";
      alert("Errore: " + (err.message || err));
    } finally {
      btn.disabled = false;
    }
  }

  function wireTeamUI() {
    var form = document.getElementById("tm-form");
    if (!form) return;
    if (!form._wired) { form._wired = true; form.onsubmit = saveTeam; }
    var cancel = document.getElementById("tm-cancel-btn");
    if (cancel && !cancel._wired) { cancel._wired = true; cancel.onclick = resetTeamForm; }
    var addBtn = document.getElementById("tm-mp-add-btn");
    if (addBtn && !addBtn._wired) { addBtn._wired = true; addBtn.onclick = addMember; }
    var closeBtn = document.getElementById("tm-mp-close");
    if (closeBtn && !closeBtn._wired) {
      closeBtn._wired = true;
      closeBtn.onclick = function () {
        document.getElementById("tm-members-panel").style.display = "none";
        managingTeam = null;
      };
    }
    document.querySelectorAll('.admin-tab[data-tab="team"]').forEach(function (tab) {
      if (tab._tmWired) return;
      tab._tmWired = true;
      tab.addEventListener("click", function () {
        setTimeout(function () { loadTeamsAdmin(); }, 80);
      });
    });
  }

  function tryWire() {
    if (!document.getElementById("tm-form")) return;
    wireTeamUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(tryWire, 800); });
  } else {
    setTimeout(tryWire, 800);
  }
  setTimeout(tryWire, 2000);
  setTimeout(tryWire, 4000);
})();
