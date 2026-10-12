const STAGIONE = '2026';

let isLoggedIn = false;
let isAdminHome = false;

const extra = {
  it: {
    home_community: "Circolo Velico Italia",
    home_title: "Regate vere,<br><em>mari virtuali.</em>",
    home_subtitle: "Squadre, regate settimanali e una classifica che conta. Il punto d'incontro degli skipper italiani di Virtual Skipper."
  },
  en: {
    home_community: "Circolo Velico Italia",
    home_title: "Real races,<br><em>virtual seas.</em>",
    home_subtitle: "Teams, weekly races and a ranking that counts. The meeting point for Italian Virtual Skipper skippers."
  },
  fr: {
    home_community: "Circolo Velico Italia",
    home_title: "Vraies courses,<br><em>mers virtuelles.</em>",
    home_subtitle: "Équipes, courses hebdomadaires et classement. Le point de rendez-vous des skippers italiens."
  },
  es: {
    home_community: "Circolo Velico Italia",
    home_title: "Regatas reales,<br><em>mares virtuales.</em>",
    home_subtitle: "Equipos, regatas semanales y una clasificación que cuenta. El punto de encuentro de los patrones."
  }
};

function statoGara(gara) {
  if (!gara || !gara.data_gara) return { key: 'none', label: '', tipo: 'Prossima gara' };
  const start = new Date(gara.data_gara).getTime();
  if (isNaN(start)) return { key: 'none', label: '', tipo: 'Prossima gara' };
  const now = Date.now();
  let chiusuraOre = gara.chiusura_ore != null ? parseInt(gara.chiusura_ore, 10) : 2;
  if (isNaN(chiusuraOre) || chiusuraOre < 0) chiusuraOre = 2;
  const nr = Math.min(3, Math.max(1, parseInt(gara.num_regate, 10) || 1));
  const durataMs = Math.max(2, nr * 1.5) * 60 * 60 * 1000;
  if (now >= start + durataMs) return { key: 'conclusa', label: 'Conclusa', tipo: 'Ultima gara' };
  if (now >= start) return { key: 'corso', label: 'In corso', tipo: 'Gara in corso' };
  if (now >= start - chiusuraOre * 60 * 60 * 1000) return { key: 'chiuse', label: 'Iscrizioni chiuse', tipo: 'Prossima gara' };
  return { key: 'aperte', label: 'Iscrizioni aperte', tipo: 'Prossima gara' };
}

async function caricaProssimaGara() {
  try {
    const now = new Date().toISOString();
    let { data, error } = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate').gte('data_gara', now).order('data_gara', { ascending: true }).limit(1);
    if (error) { console.warn('gare future:', error.message); data = null; }
    if (!data || !data.length) {
      const past = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate').order('data_gara', { ascending: false }).limit(1);
      if (past.error || !past.data || !past.data.length) {
        document.getElementById('regata-titolo').textContent = 'Nessuna gara in programma';
        document.getElementById('regata-data').textContent = '📅 --';
        document.getElementById('regata-descrizione').textContent = 'Controlla più tardi per nuovi eventi.';
        const bs = document.getElementById('regata-badge-stato');
        const bt = document.getElementById('regata-badge-tipo');
        if (bs) { bs.style.display = 'none'; bs.textContent = ''; }
        if (bt) bt.textContent = 'Calendario';
        return;
      }
      fillRegata(past.data[0]);
      return;
    }
    fillRegata(data[0]);
  } catch (err) {
    console.error(err);
    const el = document.getElementById('regata-titolo');
    if (el) el.textContent = 'Impossibile caricare le gare';
  }
}

function fillRegata(gara) {
  document.getElementById('regata-titolo').textContent = gara.titolo || 'Gara senza titolo';
  const dataFmt = gara.data_gara ? new Date(gara.data_gara).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' }) : 'Data da definirsi';
  document.getElementById('regata-data').textContent = `📅 ${dataFmt}`;
  document.getElementById('regata-descrizione').textContent = gara.descrizione || '';
  const st = statoGara(gara);
  const badgeTipo = document.getElementById('regata-badge-tipo');
  const badgeStato = document.getElementById('regata-badge-stato');
  if (badgeTipo) badgeTipo.textContent = st.tipo;
  if (badgeStato) {
    if (st.label) {
      badgeStato.textContent = st.label;
      badgeStato.style.display = '';
      badgeStato.className = 'badge-stato is-' + st.key;
    } else {
      badgeStato.style.display = 'none';
      badgeStato.textContent = '';
    }
  }
}

async function caricaClassificaHome() {
  const list = document.getElementById('home-ranking');
  if (!list) return;
  try {
    const [classRes, profRes] = await Promise.all([
      CVI.supabase
        .from('classifiche')
        .select('user_id, punti_totali, gare_disputate, posizione')
        .eq('stagione', STAGIONE)
        .order('posizione', { ascending: true })
        .limit(5),
      CVI.supabase.from('profiles').select('id, nickname, team, nome, cognome')
    ]);

    if (classRes.error) {
      console.warn('classifiche:', classRes.error.message);
      list.innerHTML = '<li><div class="rank-info"><strong>Nessun risultato ancora</strong><span>Inserisci i risultati dalla pagina Classifiche</span></div></li>';
      return;
    }

    const rows = classRes.data || [];
    if (!rows.length) {
      list.innerHTML = '<li><div class="rank-info"><strong>Nessun risultato ancora</strong><span>Inserisci i risultati dalla pagina Classifiche</span></div></li>';
      return;
    }

    const profiles = {};
    (profRes.data || []).forEach(p => { if (p.id) profiles[String(p.id)] = p; });

    list.innerHTML = rows.map((r, i) => {
      const p = profiles[String(r.user_id)] || {};
      const nome = [p.nome, p.cognome].filter(Boolean).join(' ').trim();
      const nick = (p.nickname || '').trim() || nome || 'Skipper';
      const team = (p.team || '').trim();
      const pos = r.posizione != null ? r.posizione : (i + 1);
      return `<li>
        <span class="rank-pos">${pos}</span>
        <div class="rank-info"><strong>${nick}</strong>${nome ? `<span>${nome}</span>` : ''}</div>
        ${team ? `<span class="team-badge">${team}</span>` : ''}
        <span class="rank-points">${r.punti_totali ?? '—'}</span>
      </li>`;
    }).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<li><div class="rank-info"><strong>Errore caricamento</strong></div></li>';
  }
}

async function caricaStats() {
  try {
    const [profRes, teamsRes, gareRes] = await Promise.all([
      CVI.supabase.from('profiles').select('id'),
      CVI.supabase.from('teams').select('id'),
      CVI.supabase.from('gare').select('id, data_gara')
    ]);
    if (profRes.error) console.warn('profiles:', profRes.error.message);
    if (teamsRes.error) console.warn('teams:', teamsRes.error.message);
    if (gareRes.error) console.warn('gare:', gareRes.error.message);

    const elSoci = document.getElementById('stat-soci');
    const elSq = document.getElementById('stat-squadre');
    const elReg = document.getElementById('stat-regate');
    if (elSoci) elSoci.textContent = (profRes.data || []).length;
    if (elSq) elSq.textContent = (teamsRes.data || []).length;
    if (elReg) {
      const gare2026 = (gareRes.data || []).filter(g => g.data_gara && String(g.data_gara).startsWith(STAGIONE));
      elReg.textContent = gare2026.length;
    }
  } catch (e) { console.warn('stats', e); }
}

async function checkSessionAndRole() {
  try {
    const { data: { session } } = await CVI.supabase.auth.getSession();
    if (!session) return { loggedIn: false, isAdmin: false };
    const { data: prof } = await CVI.supabase.from('profiles').select('is_admin, role').eq('id', session.user.id).maybeSingle();
    const role = (window.CVI && CVI.resolveRole) ? CVI.resolveRole(prof) : (prof && prof.role) || 'socio';
    const isAdmin = (window.CVI && CVI.canAccessAdmin) ? CVI.canAccessAdmin(role) : !!(prof && (prof.is_admin || role === 'admin' || role === 'scorer'));
    return { loggedIn: true, isAdmin: !!isAdmin };
  } catch (e) {
    return { loggedIn: false, isAdmin: false };
  }
}

async function caricaBacheca() {
  const box = document.getElementById('bacheca');
  const lista = document.getElementById('lista-avvisi');
  if (!box || !lista) return;

  // Solo utenti loggati vedono la bacheca
  if (!isLoggedIn) {
    box.style.display = 'none';
    return;
  }
  box.style.display = '';

  try {
    const { data, error } = await CVI.supabase
      .from('avvisi')
      .select('id, titolo, testo, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    const rows = data || [];
    if (!rows.length) {
      lista.innerHTML = '<p class="avviso-empty">Nessun avviso al momento.</p>';
      return;
    }
    lista.innerHTML = rows.map(a => {
      const dataFmt = a.created_at
        ? new Date(a.created_at).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })
        : '';
      const delBtn = isAdminHome
        ? `<button type="button" class="btn-avviso-del" data-id="${a.id}">Elimina</button>`
        : '';
      return `<div class="avviso-item">
        <div class="avviso-meta">
          <span class="avviso-titolo">${(a.titolo || '').replace(/</g,'<')}</span>
          <div class="avviso-actions">
            <span class="avviso-data">${dataFmt}</span>
            ${delBtn}
          </div>
        </div>
        <div class="avviso-testo">${(a.testo || '').replace(/</g,'<')}</div>
      </div>`;
    }).join('');

    lista.querySelectorAll('.btn-avviso-del').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Eliminare questo avviso?')) return;
        const { error } = await CVI.supabase.from('avvisi').delete().eq('id', btn.dataset.id);
        if (error) alert(error.message);
        else caricaBacheca();
      };
    });
  } catch (e) {
    console.warn(e);
    lista.innerHTML = '<p class="avviso-empty">Impossibile caricare gli avvisi.</p>';
  }
}

function setupBachecaAdmin() {
  if (!isAdminHome) return;
  const btn = document.getElementById('btn-nuovo-avviso');
  if (btn) {
    btn.style.display = 'inline-block';
    btn.onclick = () => document.getElementById('form-avviso').classList.toggle('open');
  }
  const annulla = document.getElementById('btn-annulla-avviso');
  if (annulla) {
    annulla.onclick = () => document.getElementById('form-avviso').classList.remove('open');
  }
  const salva = document.getElementById('btn-salva-avviso');
  if (salva) {
    salva.onclick = async () => {
      const titolo = (document.getElementById('avviso-titolo').value || '').trim();
      const testo = (document.getElementById('avviso-testo').value || '').trim();
      if (!titolo || !testo) { alert('Titolo e messaggio obbligatori'); return; }
      const { error } = await CVI.supabase.from('avvisi').insert({ titolo, testo });
      if (error) alert(error.message);
      else {
        document.getElementById('avviso-titolo').value = '';
        document.getElementById('avviso-testo').value = '';
        document.getElementById('form-avviso').classList.remove('open');
        caricaBacheca();
      }
    };
  }
}

(async function () {
  if (window.CVI && CVI.init) CVI.init('index.html', extra);
  if (!window.CVI || !CVI.supabase) {
    console.warn('Supabase non disponibile');
    return;
  }

  const auth = await checkSessionAndRole();
  isLoggedIn = auth.loggedIn;
  isAdminHome = auth.isAdmin;

  setupBachecaAdmin();

  await Promise.all([
    caricaProssimaGara(),
    caricaClassificaHome(),
    caricaStats(),
    caricaBacheca()
  ]);
})();
