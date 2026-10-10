/* CVI – Classifica generale Low Point con DNC (per anno, tutti i soci) */
(function () {
  const MIN_WAIT = setInterval(function () {
    if (typeof syncClassifiche !== 'function' || typeof renderClassificaGenerale !== 'function') return;
    clearInterval(MIN_WAIT);

    window.getAnnoFromGara = function (gara) {
      if (gara && gara.data_gara) {
        const y = new Date(gara.data_gara).getFullYear();
        if (!isNaN(y)) return String(y);
      }
      return (typeof STAGIONE !== 'undefined' ? STAGIONE : '2026');
    };
    window.getAnnoFromRisultato = function (r) {
      const gara = (cacheGare || []).find(g => String(g.id) === String(r.gara_id));
      return getAnnoFromGara(gara);
    };

    window.calcolaClassificaAnno = function (anno) {
      const gareAnno = {};
      (cacheRisultati || []).forEach(r => {
        if (getAnnoFromRisultato(r) !== anno) return;
        const gid = String(r.gara_id);
        if (!gareAnno[gid]) gareAnno[gid] = [];
        gareAnno[gid].push(r);
      });
      const garaIds = Object.keys(gareAnno);
      if (!garaIds.length) return [];
      let allUids = Object.keys(cacheProfiles || {});
      if (!allUids.length) {
        const s = new Set();
        (cacheRisultati || []).forEach(r => s.add(String(r.user_id)));
        allUids = [...s];
      }
      const totals = {}, raced = {};
      allUids.forEach(uid => { totals[uid] = 0; raced[uid] = 0; });
      garaIds.forEach(gid => {
        const risultati = gareAnno[gid];
        const partecipanti = new Set(risultati.map(r => String(r.user_id)));
        const dncScore = partecipanti.size + 1;
        const puntiGara = {};
        risultati.forEach(r => {
          const uid = String(r.user_id);
          puntiGara[uid] = (puntiGara[uid] || 0) + (Number(r.punti) || 0);
        });
        allUids.forEach(uid => {
          if (puntiGara[uid] != null) {
            totals[uid] += puntiGara[uid];
            raced[uid] += 1;
          } else {
            totals[uid] += dncScore;
          }
        });
      });
      const ranked = allUids.map(uid => ({
        user_id: uid,
        stagione: anno,
        punti_totali: totals[uid],
        gare_disputate: raced[uid],
        gare_totali: garaIds.length,
        updated_at: new Date().toISOString()
      }));
      ranked.sort((a, b) => {
        if (a.punti_totali !== b.punti_totali) return a.punti_totali - b.punti_totali;
        return b.gare_disputate - a.gare_disputate;
      });
      ranked.forEach((row, i) => { row.posizione = i + 1; });
      return ranked;
    };

    window.populateAnnoSelect = function () {
      const sel = document.getElementById('select-anno');
      if (!sel) return;
      const anni = [...new Set((cacheClassifiche || []).map(r => String(r.stagione)))].sort((a, b) => b.localeCompare(a));
      if (!anni.length) anni.push(typeof STAGIONE !== 'undefined' ? STAGIONE : '2026');
      const current = sel.value || (typeof STAGIONE !== 'undefined' ? STAGIONE : '2026');
      sel.innerHTML = anni.map(a => '<option value="' + a + '"' + (a === current ? ' selected' : '') + '>' + a + '</option>').join('');
      if (!sel.dataset.bound) {
        sel.dataset.bound = '1';
        sel.addEventListener('change', () => renderClassificaGenerale());
      }
    };

    window.syncClassifiche = async function () {
      const anniSet = new Set();
      (cacheRisultati || []).forEach(r => anniSet.add(getAnnoFromRisultato(r)));
      if (!anniSet.size) anniSet.add(typeof STAGIONE !== 'undefined' ? STAGIONE : '2026');
      const anni = [...anniSet].sort();
      const allRows = [];
      for (const anno of anni) {
        const ranked = calcolaClassificaAnno(anno);
        allRows.push(...ranked);
        await CVI.supabase.from('classifiche').delete().eq('stagione', anno);
      }
      const st = typeof STAGIONE !== 'undefined' ? STAGIONE : '2026';
      if (!anni.includes(st)) {
        await CVI.supabase.from('classifiche').delete().eq('stagione', st);
      }
      if (allRows.length) {
        const toSave = allRows.map(r => ({
          user_id: r.user_id,
          stagione: r.stagione,
          punti_totali: r.punti_totali,
          gare_disputate: r.gare_disputate,
          posizione: r.posizione,
          updated_at: r.updated_at
        }));
        const { error: insErr } = await CVI.supabase.from('classifiche').insert(toSave);
        if (insErr) throw insErr;
      }
      cacheClassifiche = allRows;
      populateAnnoSelect();
    };

    window.renderClassificaGenerale = function () {
      const box = document.getElementById('classifica-generale');
      if (!box) return;
      const sel = document.getElementById('select-anno');
      const anno = (sel && sel.value) ? sel.value : (typeof STAGIONE !== 'undefined' ? STAGIONE : '2026');
      let rows = (cacheClassifiche || []).filter(r => String(r.stagione) === String(anno));
      if (!rows.length) rows = calcolaClassificaAnno(anno);
      if (!rows.length) {
        box.innerHTML = '<p class="empty-hint">Nessun risultato per il ' + anno + '.</p>';
        return;
      }
      rows.sort((a, b) => (a.posizione || 999) - (b.posizione || 999));
      let html = '<table class="rank-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Disputate</th><th class="pts">Punti</th></tr></thead><tbody>';
      rows.forEach((r, i) => {
        const p = profiloLabel(r.user_id);
        const pos = r.posizione != null ? r.posizione : i + 1;
        const disp = (r.gare_disputate != null ? r.gare_disputate : 0) + (r.gare_totali != null ? ' / ' + r.gare_totali : '');
        html += '<tr><td class="pos">' + pos + '</td><td><div class="nick">' + esc(p.nick) + '</div>' + (p.nome ? '<div class="name">' + esc(p.nome) + '</div>' : '') + '</td><td>' + (p.team ? '<span class="team">' + esc(p.team) + '</span>' : '—') + '</td><td>' + disp + '</td><td class="pts">' + r.punti_totali + '</td></tr>';
      });
      html += '</tbody></table>';
      box.innerHTML = html;
    };

    function ensureAnnoSelect() {
      const tab = document.getElementById('tab-generale');
      if (!tab || document.getElementById('select-anno')) return;
      const banner = tab.querySelector('.info-banner');
      const wrap = document.createElement('div');
      wrap.className = 'gara-select-row';
      wrap.style.marginBottom = '1rem';
      wrap.innerHTML = '<label for="select-anno" style="font-size:0.85rem;color:var(--text-muted);font-weight:600;margin-right:0.5rem">Anno</label><select id="select-anno" style="max-width:140px"><option value="2026">2026</option></select>';
      if (banner && banner.nextSibling) tab.insertBefore(wrap, banner.nextSibling);
      else if (banner) banner.after(wrap);
      else tab.prepend(wrap);
      if (banner) {
        banner.innerHTML = '<strong>Classifica generale – Low Point con DNC</strong> — Ogni regata conta per tutti i soci. Chi non partecipa prende <strong>penalità = partecipanti + 1</strong>. Divisa per anno.';
      }
    }
    ensureAnnoSelect();
    console.log('[CVI] rank-logic.js: DNC + per anno attivo');
  }, 50);
})();
