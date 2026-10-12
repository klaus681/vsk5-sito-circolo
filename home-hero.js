/* CVI – carica banner hero e video da site_settings */
(async function () {
  if (!window.CVI || !CVI.supabase) return;
  // Attendi init CVI se necessario
  function waitCVI(maxMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (Date.now() - t0 > (maxMs || 5000)) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
  }
  await waitCVI(6000);
  if (!window.CVI || !CVI.supabase) return;
  try {
    var keys = ['home_youtube','home_community','home_title','home_subtitle','home_cta1_text','home_cta1_href','home_cta2_text','home_cta2_href'];
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
  } catch (e) {
    console.warn('home-hero', e);
  }
})();
