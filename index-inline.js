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

function ensureAudienceBadgeStyles() {
  if (document.getElementById('cvi-audience-badge-css')) return;
  var s = document.createElement('style');
  s.id = 'cvi-audience-badge-css';
  s.textContent = [
    '.badge-stato.is-audience.is-soci{background:rgba(56,189,248,.15);color:#7dd3fc}',
    '.badge-stato.is-audience.is-speciale{background:rgba(168,85,247,.15);color:#c084fc}',
    '.badge-stato.is-audience.is-aperto{background:rgba(52,211,153,.15);color:#34d399}'
  ].join('');
  document.head.appendChild(s);
}

function ensureIscrittiBadgeStyles() {
  if (document.getElementById('cvi-iscritti-badge-css')) return;
  var s = document.createElement('style');
  s.id = 'cvi-iscritti-badge-css';
  s.textContent = [
    '.badge-stato.is-iscritti{background:rgba(56,189,248,.15);color:#7dd3fc}',
    '.badge-stato.is-full{background:rgba(248,113,113,.18);color:#f87171}'
  ].join('');
  document.head.appendChild(s);
}

function audienceBadge(gara) {
  var t = ((gara && gara.tipo) || 'ufficiale').toLowerCase();
  if (t === 'aperto') return { key: 'aperto', label: 'Evento aperto' };
  if (t === 'speciale') return { key: 'speciale', label: 'Evento speciale · soci' };
  return { key: 'soci', label: 'Riservata ai soci' };
}

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
  var isAperto = ((gara.tipo || 'ufficiale').toLowerCase() === 'aperto');
  if (isAperto) {
    if (now >= start - chiusuraOre * 60 * 60 * 1000) return { key: 'chiuse', label: 'In arrivo', tipo: 'Prossima gara' };
    return { key: 'aperte', label: 'Senza iscrizione', tipo: 'Prossima gara' };
  }
  if (now >= start - chiusuraOre * 60 * 60 * 1000) return { key: 'chiuse', label: 'Iscrizioni chiuse', tipo: 'Prossima gara' };
  return { key: 'aperte', label: 'Iscrizioni aperte', tipo: 'Prossima gara' };
}

var _cviCountdownTimer = null;
var _cviCountdownGara = null;

function ensureCountdownStyles() {
  if (document.getElementById('cvi-countdown-css')) return;
  var s = document.createElement('style');
  s.id = 'cvi-countdown-css';
  s.textContent = [
    '#regata-countdown{display:flex;align-items:center;gap:.45rem;margin:.35rem 0 .15rem;font-size:.95rem;font-weight:700;color:#7dd3fc;letter-spacing:.02em}',
    '#regata-countdown .cd-icon{font-size:1.05rem}',
    '#regata-countdown .cd-label{color:#94a3b8;font-weight:600;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em}',
    '#regata-countdown .cd-time{font-variant-numeric:tabular-nums;color:#e2e8f0}',
    '#regata-countdown.is-live{color:#f87171}',
    '#regata-countdown.is-live .cd-time{color:#f87171}',
    '#regata-countdown.is-done{color:#94a3b8;font-weight:600}'
  ].join('');
  document.head.appendChild(s);
}

function formatCountdown(ms) {
  if (ms <= 0) return null;
  var totalSec = Math.floor(ms / 1000);
  var d = Math.floor(totalSec / 86400);
  var h = Math.floor((totalSec % 86400) / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  var parts = [];
  if (d > 0) parts.push(d + 'g');
  parts.push(String(h).padStart(2, '0') + 'h');
  parts.push(String(m).padStart(2, '0') + 'm');
  parts.push(String(s).padStart(2, '0') + 's');
  return parts.join(' ');
}

function ensureCountdownEl() {
  var el = document.getElementById('regata-countdown');
  if (el) return el;
  var dataEl = document.getElementById('regata-data');
  if (!dataEl || !dataEl.parentNode) return null;
  el = document.createElement('div');
  el.id = 'regata-countdown';
  el.setAttribute('aria-live', 'polite');
  if (dataEl.nextSibling) dataEl.parentNode.insertBefore(el, dataEl.nextSibling);
  else dataEl.parentNode.appendChild(el);
  return el;
}

function tickCountdown() {
  var el = document.getElementById('regata-countdown');
  var gara = _cviCountdownGara;
  if (!el || !gara || !gara.data_gara) {
    if (el) el.style.display = 'none';
    return;
  }
  var start = new Date(gara.data_gara).getTime();
  if (isNaN(start)) { el.style.display = 'none'; return; }
  var now = Date.now();
  var nr = Math.min(3, Math.max(1, parseInt(gara.num_regate, 10) || 1));
  var durataMs = Math.max(2, nr * 1.5) * 60 * 60 * 1000;
  var end = start + durataMs;

  ensureCountdownStyles();
  el.style.display = '';

  if (now >= end) {
    el.className = 'is-done';
    el.innerHTML = '<span class="cd-icon">✓</span><span class="cd-time">Gara conclusa</span>';
    if (_cviCountdownTimer) { clearInterval(_cviCountdownTimer); _cviCountdownTimer = null; }
    return;
  }
  if (now >= start) {
    el.className = 'is-live';
    el.innerHTML = '<span class="cd-icon">🔴</span><span class="cd-label">Stato</span><span class="cd-time">In corso</span>';
    return;
  }
  var left = formatCountdown(start - now);
  el.className = '';
  el.innerHTML = '<span class="cd-icon">⏱️</span><span class="cd-label">Parte tra</span><span class="cd-time">' + left + '</span>';
}

function startCountdown(gara) {
  _cviCountdownGara = gara;
  if (_cviCountdownTimer) { clearInterval(_cviCountdownTimer); _cviCountdownTimer = null; }
  ensureCountdownEl();
  tickCountdown();
  _cviCountdownTimer = setInterval(tickCountdown, 1000);
}

async function caricaProssimaGara() {
  try {
    if (!CVI.supabase) {
      document.getElementById('regata-titolo').textContent = 'Nessuna gara in programma';
      return;
    }
    const now = new Date().toISOString();
    let { data, error } = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate, tipo, max_iscritti, meteo').gte('data_gara', now).order('data_gara', { ascending: true }).limit(1);
    if (error) {
      console.warn('gare future:', error.message);
      var fb = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate, tipo').gte('data_gara', now).order('data_gara', { ascending: true }).limit(1);
      data = fb.data; error = fb.error;
      if (error) {
        var fb2 = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate').gte('data_gara', now).order('data_gara', { ascending: true }).limit(1);
        data = fb2.data; error = fb2.error;
      }
      if (error) { console.warn('gare future fallback:', error.message); data = null; }
    }
    if (!data || !data.length) {
      const past = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate, tipo, max_iscritti, meteo').order('data_gara', { ascending: false }).limit(1);
      var pastData = past.data;
      if (past.error || !pastData || !pastData.length) {
        var past1 = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate, tipo').order('data_gara', { ascending: false }).limit(1);
        pastData = past1.data;
      }
      if (!pastData || !pastData.length) {
        var past2 = await CVI.supabase.from('gare').select('id, titolo, descrizione, data_gara, chiusura_ore, num_regate').order('data_gara', { ascending: false }).limit(1);
        pastData = past2.data;
      }
      if (!pastData || !pastData.length) {
        document.getElementById('regata-titolo').textContent = 'Nessuna gara in programma';
        document.getElementById('regata-data').textContent = '📅 --';
        document.getElementById('regata-descrizione').textContent = 'Controlla più tardi per nuovi eventi.';
        const bs = document.getElementById('regata-badge-stato');
        const badgeLive = document.getElementById('regata-badge-live');
        const liveBtnEl = document.getElementById('regata-live-btn');
        const bt = document.getElementById('regata-badge-tipo');
        const ba = document.getElementById('regata-badge-audience');
        if (bs) { bs.style.display = 'none'; bs.textContent = ''; }
        if (badgeLive) badgeLive.style.display = 'none';
        if (liveBtnEl) liveBtnEl.style.display = 'none';
        if (bt) bt.textContent = 'Calendario';
        if (ba) ba.style.display = 'none';
        var bi=document.getElementById('regata-badge-iscritti');if(bi){bi.style.display='none';bi.textContent='';}
        var cd=document.getElementById('regata-countdown');if(cd)cd.style.display='none';
        var mb=document.getElementById('regata-meteo-btn');if(mb){mb.style.display='none';if(mb.parentNode&&mb.parentNode.classList)mb.parentNode.classList.remove('has-meteo');}
        if(_cviCountdownTimer){clearInterval(_cviCountdownTimer);_cviCountdownTimer=null;}
        return;
      }
      await fillRegataConIscritti(pastData[0]);
      return;
    }
    await fillRegataConIscritti(data[0]);
  } catch (err) {
    console.error(err);
    const el = document.getElementById('regata-titolo');
    if (el) el.textContent = 'Impossibile caricare le gare';
  }
}

async function fillRegataConIscritti(gara) {
  if (gara && gara.id && ((gara.tipo || 'ufficiale').toLowerCase() !== 'aperto')) {
    try {
      var res = await CVI.supabase.from('iscrizioni_gare').select('user_id', { count: 'exact', head: true }).eq('gara_id', gara.id);
      if (!res.error && typeof res.count === 'number') gara._iscritti = res.count;
      else if (res.error) console.warn('iscritti count:', res.error.message);
    } catch (e) {
      console.warn('iscritti count:', e && e.message);
    }
  }
  fillRegata(gara);
}

async function caricaPasswordBanner(gara) {
  var el = document.getElementById('regata-password');
  if (!el) return;
  el.style.display = 'none';
  el.textContent = '';
  if (!isLoggedIn || !gara || !gara.id || !CVI.supabase) return;
  try {
    var res = await CVI.supabase.from('gare_password').select('password').eq('gara_id', gara.id).maybeSingle();
    if (res.error) {
      if (!/does not exist|schema cache|relation/i.test(res.error.message || '')) console.warn('gare_password:', res.error.message);
      return;
    }
    var pwd = res.data && res.data.password ? String(res.data.password).trim() : '';
    if (!pwd) return;
    el.textContent = '🔑 Password server: ';
    var code = document.createElement('code');
    code.textContent = pwd;
    el.appendChild(code);
    el.style.display = 'inline-flex';
  } catch (e) {
    console.warn('gare_password:', e && e.message);
  }
}

function fillRegata(gara) {
  const titoloEl = document.getElementById('regata-titolo');
  const dataEl = document.getElementById('regata-data');
  const descEl = document.getElementById('regata-descrizione');
  if (titoloEl) titoloEl.textContent = gara.titolo || 'Gara senza titolo';
  const dataFmt = gara.data_gara ? new Date(gara.data_gara).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' }) : 'Data da definirsi';
  if (dataEl) dataEl.textContent = `📅 ${dataFmt}`;
  if (descEl) descEl.textContent = gara.descrizione || '';

  const st = statoGara(gara);
  const badgeTipo = document.getElementById('regata-badge-tipo');
  const badgeStato = document.getElementById('regata-badge-stato');
  const badgeLive = document.getElementById('regata-badge-live');
  const liveBtnEl = document.getElementById('regata-live-btn');

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

  ensureAudienceBadgeStyles();
  var aud = audienceBadge(gara);
  var badgeAud = document.getElementById('regata-badge-audience');
  if (!badgeAud) {
    var wrap = document.getElementById('regata-badges');
    if (wrap) {
      badgeAud = document.createElement('span');
      badgeAud.id = 'regata-badge-audience';
      badgeAud.className = 'badge-stato';
      wrap.appendChild(badgeAud);
    }
  }
  if (badgeAud) {
    badgeAud.textContent = aud.label;
    badgeAud.style.display = '';
    badgeAud.className = 'badge-stato is-audience is-' + aud.key;
  }

  // Badge iscritti / capienza (dalla prossima gara)
  ensureIscrittiBadgeStyles();
  var badgeIscr = document.getElementById('regata-badge-iscritti');
  if (!badgeIscr) {
    var wrapI = document.getElementById('regata-badges');
    if (wrapI) {
      badgeIscr = document.createElement('span');
      badgeIscr.id = 'regata-badge-iscritti';
      badgeIscr.className = 'badge-stato';
      wrapI.appendChild(badgeIscr);
    }
  }
  if (badgeIscr) {
    var tipoLow = ((gara.tipo) || 'ufficiale').toLowerCase();
    var cnt = (typeof gara._iscritti === 'number') ? gara._iscritti : null;
    var capNum = (gara.max_iscritti != null) ? parseInt(gara.max_iscritti, 10) : NaN;
    var cap = (!isNaN(capNum) && capNum >= 1) ? capNum : null;
    if (tipoLow === 'aperto' || cnt == null) {
      badgeIscr.style.display = 'none';
      badgeIscr.textContent = '';
      badgeIscr.title = '';
    } else if (cap != null && cnt >= cap) {
      badgeIscr.textContent = 'Al completo';
      badgeIscr.title = 'Iscritti ' + cnt + ' / ' + cap;
      badgeIscr.className = 'badge-stato is-full';
      badgeIscr.style.display = '';
    } else {
      badgeIscr.textContent = (cap != null) ? ('Iscritti ' + cnt + ' / ' + cap) : ('Iscritti ' + cnt);
      badgeIscr.title = '';
      badgeIscr.className = 'badge-stato is-iscritti';
      badgeIscr.style.display = '';
    }
  }

  // Pulsante Meteo (solo se l'admin ha inserito le condizioni)
  var meteoBtn = document.getElementById('regata-meteo-btn');
  if (meteoBtn) {
    var hasMeteo = !!(window.CVIMeteo && CVIMeteo.has(gara));
    meteoBtn.style.display = hasMeteo ? 'inline-flex' : 'none';
    var meteoWrap = meteoBtn.parentNode;
    if (meteoWrap && meteoWrap.classList) meteoWrap.classList.toggle('has-meteo', hasMeteo);
    meteoBtn.onclick = function (ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      if (window.CVIMeteo) CVIMeteo.open(gara);
    };
  }

  // Countdown automatico dalla data_gara
  startCountdown(gara);

  var card = document.getElementById('next-regata-card');
  if (card && gara && gara.id) {
    var st2 = statoGara(gara);
    var startT = new Date(gara.data_gara).getTime();
    var nr2 = Math.min(3, Math.max(1, parseInt(gara.num_regate, 10) || 1));
    var durataMs2 = Math.max(2, nr2 * 1.5) * 60 * 60 * 1000;
    var now2 = Date.now();
    var inLive = !isNaN(startT) && now2 >= startT - 6 * 60 * 60 * 1000 && now2 <= startT + durataMs2 + 2 * 60 * 60 * 1000;
    card.href = (inLive || st2.key === 'corso' || st2.key === 'chiuse') ? ('live.html?id=' + encodeURIComponent(gara.id)) : 'gare.html';
    if (badgeLive) badgeLive.style.display = (inLive || st2.key === 'corso') ? '' : 'none';
    if (liveBtnEl) liveBtnEl.style.display = (inLive || st2.key === 'corso' || st2.key === 'chiuse') ? '' : 'none';
    card.classList.toggle('is-live', !!(inLive || st2.key === 'corso'));
  }

  caricaPasswordBanner(gara);
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
      CVI.supabase.from('profiles_public').select('id, nickname, team, nome, cognome')
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
      CVI.supabase.from('profiles_public').select('id'),
      CVI.supabase.from('teams').select('id'),
      CVI.supabase.from('gare').select('id, data_gara')
    ]);
    if (profRes.error) console.warn('profiles:', profRes.error.message);
    if (teamsRes.error) console.warn('teams:', teamsRes.error.message);
    if (gareRes.error) console.warn('gare:', gareRes.error.message);

    const elSoci = document.getElementById('stat-soci');
    const elSq = document.getElementById('stat-squadre');
    const elReg = document.getElementById('stat-regate');
    const elFond = document.getElementById('stat-fondazione');
    if (elSoci) elSoci.textContent = (profRes.data || []).length;
    if (elSq) elSq.textContent = (teamsRes.data || []).length;
    if (elReg) {
      const gare2026 = (gareRes.data || []).filter(g => g.data_gara && String(g.data_gara).startsWith(STAGIONE));
      elReg.textContent = gare2026.length;
    }
    if (elFond) elFond.textContent = '2003';
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
