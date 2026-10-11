/* CVI admin.js – loads gzip payload from admin-data.txt */
(async function () {
  try {
    var res = await fetch("admin-data.txt?v=1");
    if (!res.ok) throw new Error("HTTP " + res.status);
    var b64 = (await res.text()).trim();
    var bin = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
    var ds = new DecompressionStream("gzip");
    var stream = new Response(bin).body.pipeThrough(ds);
    var text = await new Response(stream).text();
    var s = document.createElement("script");
    s.textContent = text;
    document.head.appendChild(s);
  } catch (e) {
    console.error("[CVI admin] load failed", e);
    var el = document.getElementById("admin-status");
    if (el) { el.textContent = "Errore caricamento admin: " + e; el.className = "admin-status err"; }
  }
})();
