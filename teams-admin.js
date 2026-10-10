/* CVI – Gestione completa team e membri (solo admin) */
(function () {
  let isAdmin = false;
  let currentUserId = null;
  let editingId = null;
  let managingTeam = null; // team object for member panel

  function profileLabel(p) {
    if (!p) return '?';
    const nick = (p.nickname || '').trim();
    const nome = [p.nome, p.cognome].filter(Boolean).join(' ').trim();
    if (nick && nome) return nick + ' (' + nome + ')';
    return nick || nome || (p.email || String(p.id).slice(0, 8));
  }

  function teamNameOf(team) {
    return (team && (team.nome_team || team.nome) || '').trim();
  }

  async function checkAdmin() {
    if (!window.CVI || !CVI.supabase) return false;
    const { data: { session } } = await CVI.supabase.auth.getSession();
    if (!session) return false;
    currentUserId = session.user.id;
    const { data: prof } = await CVI.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', currentUserId)
      .maybeSingle();
    return !!(prof && prof.is_admin === true);
  }

  function ensureAdminUI() {
    if (document.getElementById('admin-teams-panel')) return;
    const box = document.querySelector('.content-box');
    if (!box) return;

    const panel = document.createElement('div');
    panel.id = 'admin-teams-panel';
    panel.style.cssText = 'margin:1.25rem 0 1.75rem;padding:1.15rem 1.25rem;background:#1a2332;border:1px solid rgba(56,189,248,0.25);border-radius:12px;';
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.85rem">' +
        '<strong style="color:#38bdf8;font-size:0.95rem">Gestione team & membri (admin)</strong>' +
        '<button type="button" id="btn-new-team" style="background:#38bdf8;color:#0b0f19;border:none;padding:0.45rem 0.9rem;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer;font-family:inherit">+ Nuovo team</button>' +
      '</div>' +
      '<div id="team-form" style="display:none;margin-top:0.5rem">' +
        '<div style="display:grid;gap:0.65rem;max-width:520px">' +
          '<div><label style="display:block;font-size:0.75rem;color:#94a3b8;margin-bottom:0.25rem;font-weight:600">Nome team *</label>' +
          '<input id="tf-nome" type="text" maxlength="80" placeholder="Es. Red Moon" style="width:100%;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.55rem 0.75rem;font-family:inherit;font-size:0.9rem"></div>' +
          '<div><label style="display:block;font-size:0.75rem;color:#94a3b8;margin-bottom:0.25rem;font-weight:600">Capitano</label>' +
          '<input id="tf-capitano" type="text" maxlength="80" placeholder="Nickname o nome" style="width:100%;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.55rem 0.75rem;font-family:inherit;font-size:0.9rem"></div>' +
          '<div><label style="display:block;font-size:0.75rem;color:#94a3b8;margin-bottom:0.25rem;font-weight:600">Descrizione</label>' +
          '<textarea id="tf-desc" rows="3" maxlength="500" placeholder="Breve descrizione del team" style="width:100%;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.55rem 0.75rem;font-family:inherit;font-size:0.9rem;resize:vertical"></textarea></div>' +
          '<div style="display:flex;gap:0.5rem;flex-wrap:wrap">' +
            '<button type="button" id="tf-save" style="background:#38bdf8;color:#0b0f19;border:none;padding:0.55rem 1.1rem;border-radius:8px;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit">Salva team</button>' +
            '<button type="button" id="tf-cancel" style="background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.15);padding:0.55rem 1rem;border-radius:8px;font-weight:600;font-size:0.88rem;cursor:pointer;font-family:inherit">Annulla</button>' +
          '</div>' +
          '<p id="tf-status" style="margin:0;font-size:0.85rem;font-weight:500"></p>' +
        '</div>' +
      '</div>' +
      '<div id="members-panel" style="display:none;margin-top:1.25rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.08)">' +
        '<div style="font-weight:700;color:#fff;margin-bottom:0.65rem;font-size:0.92rem">Membri di: <span id="mp-team-name" style="color:#38bdf8"></span></div>' +
        '<div id="mp-list" style="margin-bottom:0.85rem"></div>' +
        '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center">' +
          '<select id="mp-add-select" style="flex:1;min-width:180px;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.5rem 0.7rem;font-family:inherit;font-size:0.88rem"></select>' +
          '<button type="button" id="mp-add-btn" style="background:#38bdf8;color:#0b0f19;border:none;padding:0.5rem 0.9rem;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer;font-family:inherit">Aggiungi</button>' +
          '<button type="button" id="mp-close" style="background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.15);padding:0.5rem 0.85rem;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;font-family:inherit">Chiudi</button>' +
        '</div>' +
        '<p id="mp-status" style="margin:0.5rem 0 0;font-size:0.85rem;font-weight:500"></p>' +
      '</div>';

    const grid = document.getElementById('teams-container');
    if (grid) box.insertBefore(panel, grid);
    else box.appendChild(panel);

    document.getElementById('btn-new-team').onclick = function () {
      editingId = null;
      managingTeam = null;
      document.getElementById('members-panel').style.display = 'none';
      document.getElementById('tf-nome').value = '';
      document.getElementById('tf-capitano').value = '';
      document.getElementById('tf-desc').value = '';
      document.getElementById('tf-status').textContent = '';
      document.getElementById('team-form').style.display = 'block';
      document.getElementById('tf-nome').focus();
    };
    document.getElementById('tf-cancel').onclick = function () {
      document.getElementById('team-form').style.display = 'none';
      editingId = null;
    };
    document.getElementById('tf-save').onclick = saveTeam;
    document.getElementById('mp-add-btn').onclick = addMember;
    document.getElementById('mp-close').onclick = function () {
      document.getElementById('members-panel').style.display = 'none';
      managingTeam = null;
    };
  }

  function openEdit(team) {
    editingId = team.id;
    document.getElementById('tf-nome').value = teamNameOf(team);
    document.getElementById('tf-capitano').value = team.capitano || team.skipper || '';
    document.getElementById('tf-desc').value = team.descrizione || '';
    document.getElementById('tf-status').textContent = '';
    document.getElementById('team-form').style.display = 'block';
    document.getElementById('admin-teams-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function openMembers(team) {
    managingTeam = team;
    document.getElementById('mp-team-name').textContent = teamNameOf(team);
    document.getElementById('members-panel').style.display = 'block';
    document.getElementById('mp-status').textContent = '';
    renderMembersPanel();
    document.getElementById('admin-teams-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderMembersPanel() {
    if (!managingTeam) return;
    const tName = teamNameOf(managingTeam).toLowerCase();
    const profiles = (typeof cachedProfiles !== 'undefined' ? cachedProfiles : []) || [];
    const members = profiles.filter(function (p) {
      return p.team && String(p.team).trim().toLowerCase() === tName;
    });
    const others = profiles.filter(function (p) {
      return !p.team || String(p.team).trim().toLowerCase() !== tName;
    });

    const list = document.getElementById('mp-list');
    if (!members.length) {
      list.innerHTML = '<p style="color:#94a3b8;font-size:0.88rem;margin:0">Nessun membro in questo team.</p>';
    } else {
      list.innerHTML = '<ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.4rem">' +
        members.map(function (m) {
          return '<li style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;background:#0b0f19;padding:0.45rem 0.65rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">' +
            '<span style="color:#fff;font-size:0.88rem;font-weight:600">' + esc(profileLabel(m)) + '</span>' +
            '<button type="button" data-uid="' + esc(m.id) + '" class="mp-remove" style="background:transparent;color:#f87171;border:1px solid rgba(248,113,113,0.4);padding:0.25rem 0.55rem;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit">Rimuovi</button>' +
          '</li>';
        }).join('') + '</ul>';
      list.querySelectorAll('.mp-remove').forEach(function (btn) {
        btn.onclick = function () { removeMember(btn.getAttribute('data-uid')); };
      });
    }

    const sel = document.getElementById('mp-add-select');
    sel.innerHTML = '<option value="">— Seleziona socio da aggiungere —</option>' +
      others.map(function (p) {
        const cur = p.team ? ' (ora: ' + p.team + ')' : '';
        return '<option value="' + esc(p.id) + '">' + esc(profileLabel(p)) + esc(cur) + '</option>';
      }).join('');
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
  }

  async function addMember() {
    if (!managingTeam) return;
    const sel = document.getElementById('mp-add-select');
    const uid = sel.value;
    const status = document.getElementById('mp-status');
    if (!uid) {
      status.textContent = 'Seleziona un socio.';
      status.style.color = '#f87171';
      return;
    }
    const tName = teamNameOf(managingTeam);
    status.textContent = 'Aggiunta…';
    status.style.color = '#94a3b8';
    const { error } = await CVI.supabase.from('profiles').update({ team: tName }).eq('id', uid);
    if (error) {
      status.textContent = 'Errore: ' + error.message;
      status.style.color = '#f87171';
      return;
    }
    // update local cache
    if (typeof cachedProfiles !== 'undefined') {
      cachedProfiles.forEach(function (p) {
        if (String(p.id) === String(uid)) p.team = tName;
      });
    }
    status.textContent = 'Membro aggiunto.';
    status.style.color = '#34d399';
    renderMembersPanel();
    if (typeof loadTeams === 'function') loadTeams();
  }

  async function removeMember(uid) {
    if (!uid) return;
    if (!confirm('Rimuovere questo socio dal team?')) return;
    const status = document.getElementById('mp-status');
    status.textContent = 'Rimozione…';
    status.style.color = '#94a3b8';
    const { error } = await CVI.supabase.from('profiles').update({ team: null }).eq('id', uid);
    if (error) {
      // try empty string if null not allowed
      const res2 = await CVI.supabase.from('profiles').update({ team: '' }).eq('id', uid);
      if (res2.error) {
        status.textContent = 'Errore: ' + (res2.error.message || error.message);
        status.style.color = '#f87171';
        return;
      }
    }
    if (typeof cachedProfiles !== 'undefined') {
      cachedProfiles.forEach(function (p) {
        if (String(p.id) === String(uid)) p.team = '';
      });
    }
    status.textContent = 'Membro rimosso dal team.';
    status.style.color = '#34d399';
    renderMembersPanel();
    if (typeof loadTeams === 'function') loadTeams();
  }

  async function saveTeam() {
    const status = document.getElementById('tf-status');
    const nome = document.getElementById('tf-nome').value.trim();
    const capitano = document.getElementById('tf-capitano').value.trim();
    const descrizione = document.getElementById('tf-desc').value.trim();
    if (!nome) {
      status.textContent = 'Il nome del team è obbligatorio.';
      status.style.color = '#f87171';
      return;
    }
    status.textContent = 'Salvataggio…';
    status.style.color = '#94a3b8';

    const oldName = editingId && managingTeam ? teamNameOf(managingTeam) : null;
    // find old name from cache if editing
    let previousName = null;
    if (editingId && typeof cachedTeams !== 'undefined') {
      const t = cachedTeams.find(function (x) { return String(x.id) === String(editingId); });
      if (t) previousName = teamNameOf(t);
    }

    const row = { nome_team: nome, descrizione: descrizione || null, capitano: capitano || null };
    let error;
    if (editingId) {
      const res = await CVI.supabase.from('teams').update(row).eq('id', editingId);
      error = res.error;
      if (error && /nome_team|column/i.test(error.message || '')) {
        const res2 = await CVI.supabase.from('teams').update({ nome: nome, descrizione: descrizione || null, capitano: capitano || null }).eq('id', editingId);
        error = res2.error;
      }
    } else {
      const res = await CVI.supabase.from('teams').insert(row);
      error = res.error;
      if (error && /nome_team|column/i.test(error.message || '')) {
        const res2 = await CVI.supabase.from('teams').insert({ nome: nome, descrizione: descrizione || null, capitano: capitano || null });
        error = res2.error;
      }
    }

    if (error) {
      status.textContent = 'Errore: ' + error.message;
      status.style.color = '#f87171';
      return;
    }

    // se rinominato, aggiorna profiles.team dei membri
    if (previousName && previousName.toLowerCase() !== nome.toLowerCase()) {
      await CVI.supabase.from('profiles').update({ team: nome }).ilike('team', previousName);
    }

    status.textContent = editingId ? 'Team aggiornato.' : 'Team creato.';
    status.style.color = '#34d399';
    editingId = null;
    document.getElementById('team-form').style.display = 'none';
    if (typeof loadTeams === 'function') loadTeams();
    else location.reload();
  }

  async function deleteTeam(team) {
    const name = teamNameOf(team);
    if (!confirm('Eliminare il team «' + name + '»?\nI membri verranno scollegati dal team (restano soci del circolo).')) return;

    // scollega membri
    await CVI.supabase.from('profiles').update({ team: null }).ilike('team', name);
    await CVI.supabase.from('profiles').update({ team: '' }).ilike('team', name);

    const { error } = await CVI.supabase.from('teams').delete().eq('id', team.id);
    if (error) {
      alert('Errore eliminazione: ' + error.message);
      return;
    }
    if (managingTeam && String(managingTeam.id) === String(team.id)) {
      document.getElementById('members-panel').style.display = 'none';
      managingTeam = null;
    }
    if (typeof loadTeams === 'function') loadTeams();
    else location.reload();
  }

  function injectCardActions() {
    if (!isAdmin) return;
    const orig = window.renderizzaTeams;
    if (typeof orig !== 'function') return;
    if (orig._cviAdminWrapped) {
      // already wrapped – still ensure buttons after late renders
      attachButtons(typeof cachedTeams !== 'undefined' ? cachedTeams : []);
      return;
    }

    window.renderizzaTeams = function (teams, allProfiles) {
      orig(teams, allProfiles);
      attachButtons(teams || []);
    };
    window.renderizzaTeams._cviAdminWrapped = true;

    if (typeof cachedTeams !== 'undefined' && cachedTeams.length) {
      window.renderizzaTeams(cachedTeams, typeof cachedProfiles !== 'undefined' ? cachedProfiles : []);
    }
  }

  function attachButtons(teams) {
    const cards = document.querySelectorAll('.team-card');
    cards.forEach(function (card, idx) {
      if (card.querySelector('.team-admin-actions')) return;
      const team = (teams || [])[idx];
      if (!team) return;
      const actions = document.createElement('div');
      actions.className = 'team-admin-actions';
      actions.style.cssText = 'display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.75rem;padding-top:0.65rem;border-top:1px solid rgba(255,255,255,0.06)';
      actions.innerHTML =
        '<button type="button" class="ta-members" style="background:transparent;color:#34d399;border:1px solid rgba(52,211,153,0.4);padding:0.3rem 0.65rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit">Membri</button>' +
        '<button type="button" class="ta-edit" style="background:transparent;color:#38bdf8;border:1px solid rgba(56,189,248,0.4);padding:0.3rem 0.65rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit">Modifica</button>' +
        '<button type="button" class="ta-del" style="background:transparent;color:#f87171;border:1px solid rgba(248,113,113,0.4);padding:0.3rem 0.65rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit">Elimina</button>';
      actions.querySelector('.ta-members').onclick = function () { openMembers(team); };
      actions.querySelector('.ta-edit').onclick = function () { openEdit(team); };
      actions.querySelector('.ta-del').onclick = function () { deleteTeam(team); };
      const section = card.querySelector('.team-members-section') || card;
      section.appendChild(actions);
    });
  }

  async function init() {
    isAdmin = await checkAdmin();
    if (!isAdmin) return;
    ensureAdminUI();
    injectCardActions();
    var n = 0;
    var t = setInterval(function () {
      n++;
      injectCardActions();
      if (n > 25) clearInterval(t);
    }, 300);
    console.log('[CVI] teams-admin: gestione completa attiva');
  }

  var tries = 0;
  var wait = setInterval(function () {
    tries++;
    if (window.CVI && CVI.supabase) {
      clearInterval(wait);
      init();
    } else if (tries > 40) clearInterval(wait);
  }, 100);
})();
