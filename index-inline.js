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

function inLiveWindow(gara) {
  if (!gara || !gara.data_gara) return false;
  const start = new Date(gara.data_gara).getTime();
  if (isNaN(start)) return false;
  const nr = Math.min(3, Math.max(1, parseInt(gara.num_regate, 10) || 1));
  const durataMs = Math.max(2, nr * 1.5) * 60 * 60 * 1000;
  const now = Date.now();
  return now >= start - 6 * 60 * 60 * 1000 && now <= start + durataMs + 2 * 60 * 60 * 1000;
}

function pickHomeGara(list) {
  if (!list || !list.length) return null;
  const live = list.filter(inLiveWindow);
  if (live.length) {
    live.sort(function (a, b) { return new Date(a.data_gara) - new Date(b.data_gara); });
    const corso = live.filter(function (g) { return statoGara(g).key === 'corso'; });
    if (corso.length) return corso[0];
    return live[0];
  }
  const now = Date.now();
  const future = list
    .filter(function (g) { return new Date(g.data_gara).getTime() >= now; })
    .sort(function (a, b) { return new Date(a.data_gara) - new Date(b.data_gara); });
  if (future.length) return future[0];
  return list.slice().sort(function (a, b) { return new Date(b.data_gara) - new Date(a.data_gara); })[0] || null;
}

async function caricaProssimaGara() {
  try {
    const { data, error } = await CVI.supabase
      .from('gare')
      .select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate')
      .order('data_gara', { ascending: false })
      .limit(40);
    if (error) { console.warn('gare:', error.message); }
    const gara = pickHomeGara(data || []);
    if (!gara) {
      document.getElementById('regata-titolo').textContent = 'Nessuna gara in programma';
      document.getElementById('regata-data').textContent = '📅 --';
      document.getElementById('regata-descrizione').textContent = 'Controlla più tardi per nuovi eventi.';
      const bs = document.getElementById('regata-badge-stato');
      const bt = document.getElementById('regata-badge-tipo');
      if (bs) { bs.style.display = 'none'; bs.textContent = ''; }
      if (bt) bt.textContent = 'Calendario';
      const liveBtn = document.getElementById('regata-live-btn');
      if (liveBtn) liveBtn.style.display = 'none';
      const card = document.getElementById('next-regata-card');
      if (card) { card.href = 'gare.html'; card.classList.remove('is-live'); }
      return;
    }
    fillRegata(gara);
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
  const live = inLiveWindow(gara);
  const badgeTipo = document.getElementById('regata-badge-tipo');
  const badgeStato = document.getElementById('regata-badge-stato');
  const badgeLive = document.getElementById('regata-badge-live');
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
  if (badgeLive) {
    badgeLive.style.display = (live || st.key === 'corso') ? '' : 'none';
  }
  const liveBtn = document.getElementById('regata-live-btn');
  if (liveBtn) {
    liveBtn.style.display = (live || st.key === 'corso' || st.key === 'chiuse') ? '' : 'none';
  }
  const card = document.getElementById('next-regata-card');
  if (card && gara && gara.id) {
    card.href = (live || st.key === 'corso' || st.key === 'chiuse')
      ? ('live.html?id=' + encodeURIComponent(gara.id))
      : 'gare.html';
    card.classList.toggle('is-live', !!(live || st.key === 'corso'));
  }
}
