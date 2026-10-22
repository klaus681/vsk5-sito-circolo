/* CVI admin loader */
(async function(){
  try {
    var parts = await Promise.all([
      fetch("admin-a.js?v=11").then(function(r){ if(!r.ok) throw new Error("admin-a "+r.status); return r.text(); }),
      fetch("admin-b.js?v=4").then(function(r){ if(!r.ok) throw new Error("admin-b "+r.status); return r.text(); })
    ]);
    var s = document.createElement("script");
    s.textContent = parts[0] + parts[1];
    document.head.appendChild(s);

    var dt = await fetch("admin-datetime.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (dt) {
      var sDt = document.createElement("script");
      sDt.textContent = dt;
      document.head.appendChild(sDt);
    }

    var dl = await fetch("downloads-admin.js?v=3").then(function(r){ return r.ok ? r.text() : ""; });
    if (dl) {
      var s2 = document.createElement("script");
      s2.textContent = dl;
      document.head.appendChild(s2);
    }
    var st = await fetch("settings-admin.js?v=8").then(function(r){ return r.ok ? r.text() : ""; });
    if (st) {
      var s3 = document.createElement("script");
      s3.textContent = st;
      document.head.appendChild(s3);
    }
    var tm = await fetch("teams-panel-admin.js?v=8").then(function(r){ return r.ok ? r.text() : ""; });
    if (tm) {
      var s5 = document.createElement("script");
      s5.textContent = tm;
      document.head.appendChild(s5);
    }
    var ea = await fetch("eventi-aperti-admin.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (ea) {
      var s7 = document.createElement("script");
      s7.textContent = ea;
      document.head.appendChild(s7);
    }
    var sa = await fetch("4-serie-aperte-admin.js?v=1").then(function(r){ return r.ok ? r.text() : ""; });
    if (sa) {
      var sSa = document.createElement("script");
      sSa.textContent = sa;
      document.head.appendChild(sSa);
    }
    var pr = await fetch("proteste-admin.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (pr) {
      var s6 = document.createElement("script");
      s6.textContent = pr;
      document.head.appendChild(s6);
    }
    var rg = await fetch("regolamento-admin.js?v=4").then(function(r){ return r.ok ? r.text() : ""; });
    if (rg) {
      var s8 = document.createElement("script");
      s8.textContent = rg;
      document.head.appendChild(s8);
    }
    var tn = await fetch("tornei-admin.js?v=8").then(function(r){ return r.ok ? r.text() : ""; });
    if (tn) {
      var s9 = document.createElement("script");
      s9.textContent = tn;
      document.head.appendChild(s9);
    }
    var al = await fetch("allenamenti-admin.js?v=3").then(function(r){ return r.ok ? r.text() : ""; });
    if (al) {
      var sAl = document.createElement("script");
      sAl.textContent = al;
      document.head.appendChild(sAl);
    }
    var tu = await fetch("tutor-admin.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (tu) {
      var sTu = document.createElement("script");
      sTu.textContent = tu;
      document.head.appendChild(sTu);
    }
    var bib = await fetch("biblioteca-admin.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (bib) {
      var sBib = document.createElement("script");
      sBib.textContent = bib;
      document.head.appendChild(sBib);
    }
    var rsa = await fetch("risorse-admin.js?v=2").then(function(r){ return r.ok ? r.text() : ""; });
    if (rsa) {
      var sRsa = document.createElement("script");
      sRsa.textContent = rsa;
      document.head.appendChild(sRsa);
    }
    var sf = await fetch("sfondi-admin.js?v=1").then(function(r){ return r.ok ? r.text() : ""; });
    if (sf) {
      var s10 = document.createElement("script");
      s10.textContent = sf;
      document.head.appendChild(s10);
    }
    var dc = await fetch("discord-notify.js?v=6").then(function(r){ return r.ok ? r.text() : ""; });
    if (dc) {
      var s4 = document.createElement("script");
      s4.textContent = dc;
      document.head.appendChild(s4);
    }
    setTimeout(function(){
      if (typeof pubAvviso === "function" && !pubAvviso._discordWrapped) {
        var orig = pubAvviso;
        window.pubAvviso = async function(e){
          var titolo = document.getElementById("avviso-titolo") && document.getElementById("avviso-titolo").value.trim();
          var testo = document.getElementById("avviso-testo") && document.getElementById("avviso-testo").value.trim();
          await orig(e);
          if (titolo && testo && window.CVIDiscord) {
            try { await CVIDiscord.notifyAvviso(titolo, testo); } catch (err) { console.warn(err); }
          }
        };
        window.pubAvviso._discordWrapped = true;
      }
      if (typeof saveGara === "function" && !saveGara._discordWrapped) {
        var origG = saveGara;
        window.saveGara = async function(e){
          var idEl = document.getElementById("gara-id");
          var isNew = !idEl || !idEl.value.trim();
          var titolo = document.getElementById("gara-titolo") && document.getElementById("gara-titolo").value.trim();
          var dl = document.getElementById("gara-data") && document.getElementById("gara-data").value;
          var desc = document.getElementById("gara-desc") && document.getElementById("gara-desc").value.trim();
          var nr = document.getElementById("gara-num") && document.getElementById("gara-num").value;
          await origG(e);
          if (isNew && titolo && window.CVIDiscord) {
            try {
              await CVIDiscord.notifyGara({
                titolo: titolo,
                descrizione: desc,
                data_gara: dl ? new Date(dl).toISOString() : null,
                num_regate: nr
              });
            } catch (err) { console.warn(err); }
          }
        };
        window.saveGara._discordWrapped = true;
      }
    }, 1500);
  } catch(e) {
    console.error("[CVI admin]", e);
    var el = document.getElementById("admin-status") || document.getElementById("admin-gate");
    if (el) el.insertAdjacentHTML("beforeend", "<p style=color:#f87171>Errore: "+e+"</p>");
  }
})();
