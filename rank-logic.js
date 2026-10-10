/* CVI – Classifica generale Low Point con DNC (per anno, tutti i soci) */
(function () {
  const MIN_WAIT = setInterval(function () {
    if (typeof syncClassifiche !== 'function' || typeof renderClassificaGenerale !== 'function') return;
    if (typeof cacheRisultati === 'undefined') return;
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

    /** Chiave univoca di una prova: evento + numero regata */
    function provaKey(r) {
      const rn = r.regata_num != null ? r.regata_num : (r.num_regata != null ? r.num_regata : 1);
      return String(r.gara_id) + '#' + String(rn);
    }

    /** Low Point con DNC: ogni PROVA conta per TUTTI i soci.
     *  DNC = numero partecipanti a quella prova + 1 */
    window.calcolaClassificaAnno = function (anno) {
      // raggruppa risultati per prova (gara_id + regata_num)
      const prove = {};
      (cacheRisultati || []).forEach(r => {
        if (getAnnoFromRisultato(r) !== String(anno)) return;
        const key = provaKey(r);
        if (!prove[key]) prove[key] = [];
        prove[key].push(r);
      });
      const provaIds = Object.keys(prove);
      if (!provaIds.length) return [];

      // tutti i soci da profiles
      let allUids = Object.keys(cacheProfiles || {});
      if (!allUids.length) {
        const s = new Set();
        (cacheRisultati || []).forEach(r => s.add(String(r.user_id)));
        allUids = [...s];
      }

      const totals = {}, raced = {};
      allUids.forEach(uid => { totals[uid] = 0; raced[uid] = 0; });

      provaIds.forEach(key => {
        const risultati = prove[key];
        const partecipanti = new Set(risultati.map(r => String(r.user_id)));
        const dncScore = partecipanti.size + 1;
        const puntiProva = {};
        risultati.forEach(r => {
          const uid = String(r.user_id);
          // se per errore ci fossero più righe, tieni il migliore (più basso)
          const pt = Number(r.punti) || 0;
          if (puntiProva[uid] == null || pt < puntiProva[uid]) puntiProva[uid] = pt;
        });
        allUids.forEach(uid => {
          if (puntiProva[uid] != null) {
            totals[uid] += puntiProva[uid];
            raced[uid] += 1;
          } else {
            totals[uid] += dncScore;
          }
        });
      });

      const ranked = allUids.map(uid => ({
        user_id: uid,
        stagione: String(anno),
        punti_totali: totals[uid],
        gare_disputate: raced[uid],
        gare_totali: provaIds.length,
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
      const anniSet = new Set();
      (cacheRisultati || []).forEach(r => anniSet.add(getAnnoFromRisultato(r)));
      let anni = [...anniSet].filter(Boolean).sort((a, b) => b.localeCompare(a));
      if (!anni.length) anni = [typeof STAGIONE !== 'undefined' ? STAGIONE : '2026'];
      const current = sel.value || anni[0];
      sel.innerHTML = anni.map(a =>
        '<option value="' + a + '"' + (a === current ? ' selected' : '') + '>' + a + '</option>'
      ).join('');
      if (!sel.dataset.bound) {
        sel.dataset.bound = '1';
        sel.addEventListener('change', function () { renderClassificaGenerale(); });
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
        if (insErr) console.error('[CVI] syncClassifiche insert', insErr);
      }
      cacheClassifiche = allRows;
      populateAnnoSelect();
    };

    window.renderClassificaGenerale = function () {
      const box = document.getElementById('classifica-generale');
      if (!box) return;
      const sel = document.getElementById('select-anno');
      const anno = (sel && sel.value) ? sel.value : (typeof STAGIONE !== 'undefined' ? STAGIONE : '2026');

      const rows = calcolaClassificaAnno(anno);
      if (!rows.length) {
        box.innerHTML = '<p class="empty-hint">Nessun risultato per il ' + anno + '.</p>';
        return;
      }

      let html = '<table class="rank-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Disputate</th><th class="pts">Punti</th></tr></thead><tbody>';
      rows.forEach(function (r, i) {
        const p = profiloLabel(r.user_id);
        const pos = r.posizione != null ? r.posizione : i + 1;
        const disp = (r.gare_disputate != null ? r.gare_disputate : 0) +
          (r.gare_totali != null ? ' / ' + r.gare_totali : '');
        html += '<tr><td class="pos">' + pos +
          '</td><td><div class="nick">' + esc(p.nick) + '</div>' +
          (p.nome ? '<div class="name">' + esc(p.nome) + '</div>' : '') +
          '</td><td>' + (p.team ? '<span class="team">' + esc(p.team) + '</span>' : '—') +
          '</td><td>' + disp +
          '</td><td class="pts">' + r.punti_totali + '</td></tr>';
      });
      html += '</tbody></table>';
      box.innerHTML = html;
    };

    function ensureAnnoSelect() {
      const tab = document.getElementById('tab-generale');
      if (!tab) return;
      if (!document.getElementById('select-anno')) {
        const banner = tab.querySelector('.info-banner');
        const wrap = document.createElement('div');
        wrap.className = 'gara-select-row';
        wrap.style.marginBottom = '1rem';
        wrap.innerHTML = '<label for="select-anno" style="font-size:0.85rem;color:var(--text-muted);font-weight:600;margin-right:0.5rem">Anno</label>' +
          '<select id="select-anno" style="max-width:140px"><option value="2026">2026</option></select>';
        if (banner && banner.nextSibling) tab.insertBefore(wrap, banner.nextSibling);
        else if (banner) banner.after(wrap);
        else tab.prepend(wrap);
      }
      const banner = tab.querySelector('.info-banner');
      if (banner) {
        banner.innerHTML = '<strong>Classifica generale – Low Point con DNC</strong> — Ogni prova conta per tutti i soci. Chi non partecipa prende <strong>penalità = partecipanti + 1</strong>. Divisa per anno.';
      }
    }

    ensureAnnoSelect();
    populateAnnoSelect();

    function tryRefresh() {
      if (!(cacheRisultati && cacheRisultati.length)) return false;
      // aspetta i profili se possibile
      const nProf = Object.keys(cacheProfiles || {}).length;
      renderClassificaGenerale();
      if (typeof CVI !== 'undefined' && CVI.supabase) {
        syncClassifiche().catch(function (e) { console.warn('[CVI] sync', e); });
      }
      console.log('[CVI] classifica DNC renderizzata – prove:', cacheRisultati.length, 'soci:', nProf || 'solo partecipanti');
      return nProf > 0 || true;
    }

    if (!tryRefresh()) {
      var n = 0;
      var t = setInterval(function () {
        n++;
        if (tryRefresh() || n > 40) clearInterval(t);
      }, 250);
    }

    console.log('[CVI] rank-logic.js: DNC per prova attivo');
  }, 50);
})();
