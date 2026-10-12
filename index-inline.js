/* CVI homepage logic - extracted for maintainability */
const STAGIONE = '2026';

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

  if (now >= start + durataMs) {
    return { key: 'conclusa', label: 'Conclusa', tipo: 'Ultima gara' };
  }
  if (now >= start) {
    return { key: 'corso', label: 'In corso', tipo: 'Gara in corso' };
  }
  if (now >= start - chiusuraOre * 60 * 60 * 1000) {
    return { key: 'chiuse', label: 'Iscrizioni chiuse', tipo: 'Prossima gara' };
  }
  return { key: 'aperte', label: 'Iscrizioni aperte', tipo: 'Prossima gara' };
}

async function caricaProssimaGara() {
  try {
    const now = new Date().toISOString();
    let { data, error } = await CVI.supabase
      .from('gare')
      .select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate')
      .gte('data_gara', now)
      .order('data_gara', { ascending: true })
      .limit(1);

    if (error) {
      console.warn('gare future:', error.message);
      data = null;
    }

    if (!data || !data.length) {
      const past = await CVI.supabase
        .from('gare')
        .select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate')
        .order('data_gara', { ascending: false })
        .limit(1);
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
  const dataFmt = gara.data_gara
    ? new Date(gara.data_gara).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })
    : 'Data da definirsi';
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

// Bootstrap
(async function () {
  if (window.CVI && CVI.init) CVI.init('index.html', extra);
  if (!window.CVI || !CVI.supabase) {
    console.warn('Supabase non disponibile');
    return;
  }
  // simplified bootstrap - full logic lives in original; this ensures basic load
  try {
    await caricaProssimaGara();
  } catch (e) { console.error(e); }
})();
