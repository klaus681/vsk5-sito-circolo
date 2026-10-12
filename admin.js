/* CVI admin loader */
(async function(){
  try {
    var parts = await Promise.all([
      fetch("admin-a.js?v=3").then(function(r){ if(!r.ok) throw new Error("admin-a "+r.status); return r.text(); }),
      fetch("admin-b.js?v=3").then(function(r){ if(!r.ok) throw new Error("admin-b "+r.status); return r.text(); })
    ]);
    var s = document.createElement("script");
    s.textContent = parts[0] + parts[1];
    document.head.appendChild(s);
  } catch(e) {
    console.error("[CVI admin]", e);
    var el = document.getElementById("admin-status") || document.getElementById("admin-gate");
    if (el) el.insertAdjacentHTML("beforeend", "<p style=color:#f87171>Errore: "+e+"</p>");
  }
})();
