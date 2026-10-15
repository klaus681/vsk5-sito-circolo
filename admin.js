/* CVI admin loader */
(async function(){
  try {
    var parts = await Promise.all([
      fetch("admin-a.js?v=7").then(function(r){ if(!r.ok) throw new Error("admin-a "+r.status); return r.text(); }),
      fetch("admin-b.js?v=7").then(function(r){ if(!r.ok) throw new Error("admin-b "+r.status); return r.text(); })
    ]);
    var s = document.createElement("script");
    s.textContent = parts[0] + "\n;" + parts[1];
    document.head.appendChild(s);

    var st = await fetch("settings-admin.js?v=5").then(function(r){ return r.ok ? r.text() : ""; });
    if (st) {
      var ss = document.createElement("script");
      ss.textContent = st;
      document.head.appendChild(ss);
    }

    var pa = await fetch("proteste-admin.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (pa) {
      var ps = document.createElement("script");
      ps.textContent = pa;
      document.head.appendChild(ps);
    }

    var ea = await fetch("eventi-aperti-admin.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (ea) {
      var es = document.createElement("script");
      es.textContent = ea;
      document.head.appendChild(es);
    }

    var dc = await fetch("discord-notify.js?v=3").then(function(r){ return r.ok ? r.text() : ""; });
    if (dc) {
      var ds = document.createElement("script");
      ds.textContent = dc;
      document.head.appendChild(ds);
    }

    // Discord wrap for avvisi / gare if present in admin-a/b
    setTimeout(function(){
      if (typeof pubAvviso === "function" && !pubAvviso._discordWrapped) {
        var orig = pubAvviso;
        window.pubAvviso = async function(){
          var t = document.getElementById("avviso-titolo");
          var x = document.getElementById("avviso-testo");
          var titolo = t ? t.value.trim() : "";
          var testo = x ? x.value.trim() : "";
          var r = await orig.apply(this, arguments);
          if (window.CVIDiscord && titolo && testo) {
            try { await CVIDiscord.notifyAvviso(titolo, testo); } catch(e){}
          }
          return r;
        };
        window.pubAvviso._discordWrapped = true;
      }
      if (typeof saveGara === "function" && !saveGara._discordWrapped) {
        var origG = saveGara;
        window.saveGara = async function(){
          var idEl = document.getElementById("admin-gara-id") || document.getElementById("gara-id");
          var isNew = !idEl || !String(idEl.value||"").trim();
          var titoloEl = document.getElementById("admin-titolo") || document.getElementById("gara-titolo");
          var dataEl = document.getElementById("admin-data") || document.getElementById("gara-data");
          var descEl = document.getElementById("admin-descrizione") || document.getElementById("gara-desc");
          var numEl = document.getElementById("admin-num-regate") || document.getElementById("gara-num");
          var payload = {
            titolo: titoloEl ? titoloEl.value.trim() : "",
            descrizione: descEl ? descEl.value.trim() : "",
            data_gara: dataEl && dataEl.value ? new Date(dataEl.value).toISOString() : null,
            num_regate: numEl ? numEl.value : 1
          };
          var r = await origG.apply(this, arguments);
          if (isNew && window.CVIDiscord && payload.titolo) {
            try { await CVIDiscord.notifyGara(payload); } catch(e){}
          }
          return r;
        };
        window.saveGara._discordWrapped = true;
      }
    }, 1500);
  } catch (e) {
    console.error("[CVI admin]", e);
    var el = document.getElementById("admin-status");
    if (el) { el.textContent = "Errore caricamento admin: " + (e.message||e); el.className = "admin-status err"; }
  }
})();
