/* CVI – Gestione soci: team + espulsione (solo admin) */
(function () {
  let isAdmin = false;
  let currentUserId = null;

  async function checkAdmin() {
    if (!window.CVI || !CVI.supabase) return false;
    const { data: { session } } = await CVI.supabase.auth.getSession();
    if (!session) return false;
    currentUserId = session.user.id;
    const { data: prof } = await CVI.supabase.from('profiles').select('is_admin').eq('id', currentUserId).maybeSingle();
    return !!(prof && prof.is_admin === true);
  }

  async function loadTeamNames() {
    const { data } = await CVI.supabase.from('teams').select('*');
    const names = (data || []).map(t => (t.nome_team || t.nome || '').trim()).filter(Boolean);
    names.sort((a, b) => a.localeCompare(b, 'it'));
    return names;
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
  }

  async function expelMember(uid, nick) {
    if (!uid) return;
    if (currentUserId && String(uid) === String(currentUserId)) {
      alert('Non puoi espellere te stesso.');
      return;
    }
    const label = nick || 'questo socio';
    if (!confirm('Espellere «' + label + '» dal circolo?\n\nVerrà rimosso dall\'elenco soci. I risultati di gara già inseriti restano in archivio.')) return;
    if (!confirm('Confermi definitivamente l\'espulsione di «' + label + '»?')) return;

    // 1) scollega da iscrizioni future (best effort)
    try { await CVI.supabase.from('iscrizioni_gare').delete().eq('user_id', uid); } catch (e) {}

    // 2) elimina profilo (oppure soft-delete)
    let { error } = await CVI.supabase.from('profiles').delete().eq('id', uid);

    if (error) {
      // fallback: marca come espulso / non attivo
      const soft = await CVI.supabase.from('profiles').update({
        team: null,
        nickname: (nick ? nick + ' (espulso)' : 'espulso'),
        is_admin: false
      }).eq('id', uid);
      // prova anche campi comuni di soft-delete
      await CVI.supabase.from('profiles').update({ attivo: false }).eq('id', uid);
      await CVI.supabase.from('profiles').update({ expelled: true }).eq('id', uid);

      if (soft.error && error) {
        alert('Errore espulsione: ' + (error.message || soft.error.message) +
          '\n\nIn Supabase le policy RLS devono permettere all\'admin di DELETE su profiles.');
        return;
      }
      alert('Socio segnato come espulso (eliminazione completa non consentita dalle policy).');
    } else {
      alert('«' + label + '» è stato espulso dal circolo.');
    }

    // ricarica elenco
    init();
  }

  async function init() {
    isAdmin = await checkAdmin();
    if (!isAdmin) return;

    const teamNamesCache = await loadTeamNames();
    const container = document.getElementById('members-container');
    if (!container) return;

    const { data: profiles, error } = await CVI.supabase.from('profiles').select('*');
    if (error || !profiles) return;

    // nascondi eventuali già marcati expelled se il campo esiste
    const list = profiles.filter(function (p) {
      if (p.expelled === true) return false;
      if (p.attivo === false) return false;
      return true;
    });

    list.sort(function (a, b) {
      const na = (a.nickname || a.nome || '').toLowerCase();
      const nb = (b.nickname || b.nome || '').toLowerCase();
      return na.localeCompare(nb, 'it');
    });

    let html = '<div class="admin-hint" style="margin-bottom:1rem;padding:0.65rem 0.9rem;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:8px;font-size:0.85rem;color:#94a3b8">Modalità admin: assegna team o <strong style="color:#f87171">espelli</strong> un socio dal circolo.</div>';
    html += '<table class="rank-table members-admin-table"><thead><tr><th>Skipper</th><th>Nome</th><th>Team</th><th>Assegna team</th><th>Azioni</th></tr></thead><tbody>';
    list.forEach(function (p) {
      const nick = (p.nickname || '—').trim();
      const nome = [p.nome, p.cognome].filter(Boolean).join(' ').trim() || '—';
      const team = (p.team || '').trim();
      const isSelf = currentUserId && String(p.id) === String(currentUserId);
      const opts = '<option value="">— Nessun team —</option>' +
        teamNamesCache.map(function (n) {
          const sel = (team.toLowerCase() === n.toLowerCase()) ? ' selected' : '';
          return '<option value="' + n.replace(/"/g, '"') + '"' + sel + '>' + n + '</option>';
        }).join('');
      html += '<tr data-user-id="' + p.id + '">' +
        '<td><strong>' + esc(nick) + '</strong>' + (p.is_admin ? ' <span style="font-size:0.7rem;color:#38bdf8">admin</span>' : '') + '</td>' +
        '<td>' + esc(nome) + '</td>' +
        '<td>' + (team ? '<span class="team">' + esc(team) + '</span>' : '—') + '</td>' +
        '<td><select class="membri-team-select" data-uid="' + p.id + '" style="background:#0b0f19;color:#fff;border:1px solid rgba(56,189,248,0.35);border-radius:6px;padding:0.3rem 0.5rem;font-size:0.8rem;font-family:inherit;max-width:160px">' + opts + '</select></td>' +
        '<td>' +
          (isSelf
            ? '<span style="font-size:0.78rem;color:#64748b">—</span>'
            : '<button type="button" class="membri-expel-btn" data-uid="' + p.id + '" data-nick="' + esc(nick) + '" style="background:transparent;color:#f87171;border:1px solid rgba(248,113,113,0.45);padding:0.3rem 0.6rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit">Espelli</button>') +
        '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('.membri-team-select').forEach(function (sel) {
      sel.addEventListener('change', async function () {
        const uid = sel.getAttribute('data-uid');
        const val = sel.value || null;
        sel.disabled = true;
        let { error } = await CVI.supabase.from('profiles').update({ team: val }).eq('id', uid);
        if (error) {
          const r2 = await CVI.supabase.from('profiles').update({ team: val || '' }).eq('id', uid);
          error = r2.error;
        }
        sel.disabled = false;
        if (error) {
          alert('Errore: ' + error.message);
          return;
        }
        const tr = sel.closest('tr');
        if (tr) {
          const teamCell = tr.children[2];
          if (teamCell) teamCell.innerHTML = val ? '<span class="team">' + esc(val) + '</span>' : '—';
        }
      });
    });

    container.querySelectorAll('.membri-expel-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        expelMember(btn.getAttribute('data-uid'), btn.getAttribute('data-nick'));
      });
    });

    console.log('[CVI] membri-admin: team + espulsione attivi, soci:', list.length);
  }

  var tries = 0;
  var wait = setInterval(function () {
    tries++;
    if (window.CVI && CVI.supabase) {
      clearInterval(wait);
      setTimeout(init, 600);
    } else if (tries > 40) clearInterval(wait);
  }, 100);
})();
