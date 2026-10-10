/* CVI – Assegna team ai soci (solo admin) sulla pagina Membri */
(function () {
  let isAdmin = false;

  async function checkAdmin() {
    if (!window.CVI || !CVI.supabase) return false;
    const { data: { session } } = await CVI.supabase.auth.getSession();
    if (!session) return false;
    const { data: prof } = await CVI.supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
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
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function init() {
    isAdmin = await checkAdmin();
    if (!isAdmin) return;

    const teamNamesCache = await loadTeamNames();
    const container = document.getElementById('members-container');
    if (!container) return;

    const { data: profiles, error } = await CVI.supabase.from('profiles').select('*');
    if (error || !profiles) return;

    profiles.sort(function (a, b) {
      const na = (a.nickname || a.nome || '').toLowerCase();
      const nb = (b.nickname || b.nome || '').toLowerCase();
      return na.localeCompare(nb, 'it');
    });

    let html = '<div class="admin-hint" style="margin-bottom:1rem;padding:0.65rem 0.9rem;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:8px;font-size:0.85rem;color:#94a3b8">Modalità admin: puoi assegnare o togliere il team a ogni socio.</div>';
    html += '<table class="rank-table members-admin-table"><thead><tr><th>Skipper</th><th>Nome</th><th>Team</th><th>Assegna team</th></tr></thead><tbody>';
    profiles.forEach(function (p) {
      const nick = (p.nickname || '—').trim();
      const nome = [p.nome, p.cognome].filter(Boolean).join(' ').trim() || '—';
      const team = (p.team || '').trim();
      const opts = '<option value="">— Nessun team —</option>' +
        teamNamesCache.map(function (n) {
          const sel = (team.toLowerCase() === n.toLowerCase()) ? ' selected' : '';
          return '<option value="' + n.replace(/"/g, '&quot;') + '"' + sel + '>' + n + '</option>';
        }).join('');
      html += '<tr data-user-id="' + p.id + '">' +
        '<td><strong>' + esc(nick) + '</strong></td>' +
        '<td>' + esc(nome) + '</td>' +
        '<td>' + (team ? '<span class="team">' + esc(team) + '</span>' : '—') + '</td>' +
        '<td><select class="membri-team-select" data-uid="' + p.id + '" style="background:#0b0f19;color:#fff;border:1px solid rgba(56,189,248,0.35);border-radius:6px;padding:0.3rem 0.5rem;font-size:0.8rem;font-family:inherit;max-width:160px">' + opts + '</select></td>' +
        '</tr>';
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
    console.log('[CVI] membri-admin: gestione team attiva, soci:', profiles.length);
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
