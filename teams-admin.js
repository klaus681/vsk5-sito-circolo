/* CVI – Gestione team (solo admin) */
(function () {
  let isAdmin = false;
  let currentUserId = null;
  let editingId = null;

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.85rem">
        <strong style="color:#38bdf8;font-size:0.95rem">Gestione team (admin)</strong>
        <button type="button" id="btn-new-team" style="background:#38bdf8;color:#0b0f19;border:none;padding:0.45rem 0.9rem;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer;font-family:inherit">+ Nuovo team</button>
      </div>
      <div id="team-form" style="display:none;margin-top:0.5rem">
        <div style="display:grid;gap:0.65rem;max-width:480px">
          <div>
            <label style="display:block;font-size:0.75rem;color:#94a3b8;margin-bottom:0.25rem;font-weight:600">Nome team *</label>
            <input id="tf-nome" type="text" maxlength="80" placeholder="Es. Red Moon" style="width:100%;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.55rem 0.75rem;font-family:inherit;font-size:0.9rem">
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;color:#94a3b8;margin-bottom:0.25rem;font-weight:600">Capitano</label>
            <input id="tf-capitano" type="text" maxlength="80" placeholder="Nickname o nome" style="width:100%;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.55rem 0.75rem;font-family:inherit;font-size:0.9rem">
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;color:#94a3b8;margin-bottom:0.25rem;font-weight:600">Descrizione</label>
            <textarea id="tf-desc" rows="3" maxlength="500" placeholder="Breve descrizione del team" style="width:100%;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.55rem 0.75rem;font-family:inherit;font-size:0.9rem;resize:vertical"></textarea>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button type="button" id="tf-save" style="background:#38bdf8;color:#0b0f19;border:none;padding:0.55rem 1.1rem;border-radius:8px;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit">Salva</button>
            <button type="button" id="tf-cancel" style="background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.15);padding:0.55rem 1rem;border-radius:8px;font-weight:600;font-size:0.88rem;cursor:pointer;font-family:inherit">Annulla</button>
          </div>
          <p id="tf-status" style="margin:0;font-size:0.85rem;font-weight:500"></p>
        </div>
      </div>
    `;
    const grid = document.getElementById('teams-container');
    if (grid) box.insertBefore(panel, grid);
    else box.appendChild(panel);

    document.getElementById('btn-new-team').onclick = function () {
      editingId = null;
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
  }

  function openEdit(team) {
    editingId = team.id;
    document.getElementById('tf-nome').value = team.nome_team || team.nome || '';
    document.getElementById('tf-capitano').value = team.capitano || team.skipper || '';
    document.getElementById('tf-desc').value = team.descrizione || '';
    document.getElementById('tf-status').textContent = '';
    document.getElementById('team-form').style.display = 'block';
    document.getElementById('admin-teams-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

    const row = {
      nome_team: nome,
      descrizione: descrizione || null,
      capitano: capitano || null
    };

    let error;
    if (editingId) {
      const res = await CVI.supabase.from('teams').update(row).eq('id', editingId);
      error = res.error;
    } else {
      const res = await CVI.supabase.from('teams').insert(row);
      error = res.error;
      if (error && /nome_team|column/i.test(error.message || '')) {
        const row2 = { nome: nome, descrizione: descrizione || null, capitano: capitano || null };
        const res2 = await CVI.supabase.from('teams').insert(row2);
        error = res2.error;
      }
    }

    if (error) {
      status.textContent = 'Errore: ' + error.message;
      status.style.color = '#f87171';
      return;
    }
    status.textContent = editingId ? 'Team aggiornato.' : 'Team creato.';
    status.style.color = '#34d399';
    editingId = null;
    document.getElementById('team-form').style.display = 'none';
    if (typeof loadTeams === 'function') loadTeams();
    else location.reload();
  }

  async function deleteTeam(team) {
    const name = team.nome_team || team.nome || 'questo team';
    if (!confirm('Eliminare il team «' + name + '»? I membri restano iscritti al circolo, ma perderanno l\'associazione al team.')) return;
    const { error } = await CVI.supabase.from('teams').delete().eq('id', team.id);
    if (error) {
      alert('Errore eliminazione: ' + error.message);
      return;
    }
    if (typeof loadTeams === 'function') loadTeams();
    else location.reload();
  }

  function injectCardActions() {
    if (!isAdmin) return;
    const orig = window.renderizzaTeams;
    if (typeof orig !== 'function' || orig._cviAdminWrapped) return;

    window.renderizzaTeams = function (teams, allProfiles) {
      orig(teams, allProfiles);
      const cards = document.querySelectorAll('.team-card');
      cards.forEach(function (card, idx) {
        if (card.querySelector('.team-admin-actions')) return;
        const team = (teams || [])[idx];
        if (!team) return;
        const actions = document.createElement('div');
        actions.className = 'team-admin-actions';
        actions.style.cssText = 'display:flex;gap:0.4rem;margin-top:0.75rem;padding-top:0.65rem;border-top:1px solid rgba(255,255,255,0.06)';
        actions.innerHTML =
          '<button type="button" class="ta-edit" style="background:transparent;color:#38bdf8;border:1px solid rgba(56,189,248,0.4);padding:0.3rem 0.65rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit">Modifica</button>' +
          '<button type="button" class="ta-del" style="background:transparent;color:#f87171;border:1px solid rgba(248,113,113,0.4);padding:0.3rem 0.65rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit">Elimina</button>';
        actions.querySelector('.ta-edit').onclick = function () { openEdit(team); };
        actions.querySelector('.ta-del').onclick = function () { deleteTeam(team); };
        const section = card.querySelector('.team-members-section') || card;
        section.appendChild(actions);
      });
    };
    window.renderizzaTeams._cviAdminWrapped = true;

    if (typeof cachedTeams !== 'undefined' && cachedTeams.length && typeof cachedProfiles !== 'undefined') {
      window.renderizzaTeams(cachedTeams, cachedProfiles);
    }
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
      if (n > 20) clearInterval(t);
    }, 300);
    console.log('[CVI] teams-admin: pannello admin attivo');
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
