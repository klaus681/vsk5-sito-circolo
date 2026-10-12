/* CVI – carica banner hero, video e stats da site_settings */
(async function () {
  function waitCVI(maxMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (Date.now() - t0 > (maxMs || 6000)) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
  }
  await waitCVI(6000);
  if (!window.CVI || !CVI.supabase) return;

  var STAT_KEYS = [
    'home_stat_soci_label', 'home_stat_soci_value',
    'home_stat_squadre_label', 'home_stat_squadre_value',
    'home_stat_regate_label', 'home_stat_regate_value',
    'home_stat_dal_label', 'home_stat_dal_value'
  ];
  var HERO_KEYS = [
    'home_youtube', 'home_community', 'home_title', 'home_subtitle',
    'home_cta1_text', 'home_cta1_href', 'home_cta2_text', 'home_cta2_href'
  ];

  try {
    var keys = HERO_KEYS.concat(STAT_KEYS);
    var res = await CVI.supabase.from('site_settings').select('key, value').in('key', keys);
    if (res.error || !res.data) return;
    var map = {};
    res.data.forEach(function (r) { if (r && r.key) map[r.key] = r.value; });

    if (map.home_youtube) {
      var raw = String(map.home_youtube).trim();
      var id = raw;
      var m = raw.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/) || raw.match(/^([A-Za-z0-9_-]{6,})$/);
      if (m) id = m[1];
      var iframe = document.getElementById('home-youtube');
      if (iframe && id) iframe.src = 'https://www.youtube.com/embed/' + id;
    }

    var elCom = document.getElementById('hero-community');
    var elTitle = document.getElementById('hero-title');
    var elSub = document.getElementById('hero-subtitle');
    var cta1 = document.getElementById('hero-cta1');
    var cta2 = document.getElementById('hero-cta2');
    if (elCom && map.home_community) elCom.textContent = map.home_community;
    if (elTitle && map.home_title) elTitle.innerHTML = map.home_title;
    if (elSub && map.home_subtitle) elSub.textContent = map.home_subtitle;
    if (cta1) {
      if (map.home_cta1_text) cta1.textContent = map.home_cta1_text;
      if (map.home_cta1_href) cta1.setAttribute('href', map.home_cta1_href);
    }
    if (cta2) {
      if (map.home_cta2_text) cta2.textContent = map.home_cta2_text;
      if (map.home_cta2_href) cta2.setAttribute('href', map.home_cta2_href);
    }

    function setLabel(id, val) {
      var el = document.getElementById(id);
      if (el && val) el.textContent = val;
    }
    setLabel('stat-soci-label', map.home_stat_soci_label);
    setLabel('stat-squadre-label', map.home_stat_squadre_label);
    setLabel('stat-regate-label', map.home_stat_regate_label);
    setLabel('stat-fondazione-label', map.home_stat_dal_label);

    function applyValueOverrides() {
      function setNum(id, val) {
        if (val == null || String(val).trim() === '') return;
        var el = document.getElementById(id);
        if (el) el.textContent = String(val).trim();
      }
      setNum('stat-soci', map.home_stat_soci_value);
      setNum('stat-squadre', map.home_stat_squadre_value);
      setNum('stat-regate', map.home_stat_regate_value);
      setNum('stat-fondazione', map.home_stat_dal_value);
    }
    applyValueOverrides();
    setTimeout(applyValueOverrides, 800);
    setTimeout(applyValueOverrides, 2000);
  } catch (e) {
    console.warn('home-hero', e);
  }
})();
