/* CVI – pagina pubblica Eventi aperti */
(function () {
  "use strict";
  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }
  function fmt(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("it-IT", {
        weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return String(iso); }
  }
  async function load() {
    var box = document.getElementById("eventi-aperti-container");
    if (!box || !window.CVI || !CVI.supabase) return;
    box.innerHTML = '<p style="color:#94a3b8">Caricamento…</p>';
    try {
      var res = await CVI.supabase.from("eventi_aperti").select("*").eq("pubblicato", true).order("data_evento", { ascending: false, nullsFirst: false });
      if (res.error) throw res.error;
      var eventi = res.data || [];
      if (!eventi.length) {
        box.innerHTML = '<p style="color:#94a3b8">Nessun evento aperto pubblicato al momento.</p>';
        return;
      }
      var ids = eventi.map(function (e) { return e.id; });
      var ris = await CVI.supabase.from("eventi_aperti_risultati").select("*").in("evento_id", ids).order("posizione");
      var byEv = {};
      (ris.data || []).forEach(function (r) {
        var k = String(r.evento_id);
        if (!byEv[k]) byEv[k] = [];
        byEv[k].push(r);
      });
      box.innerHTML = eventi.map(function (e) {
        var rows = byEv[String(e.id)] || [];
        var table = rows.length
          ? '<table class="members-table" style="margin-top:.75rem"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Note</th></tr></thead><tbody>' +
            rows.map(function (r) {
              return "<tr><td><strong>" + esc(r.posizione) + "</strong></td><td>" + esc(r.nickname) +
                "</td><td>" + esc(r.team || "—") + "</td><td>" + esc(r.note || "—") + "</td></tr>";
            }).join("") + "</tbody></table>"
          : '<p style="color:#64748b;margin-top:.5rem">Classifica non ancora inserita.</p>';
        return (
          '<div class="protest-card" style="margin-bottom:1.25rem">' +
          '<h2 style="margin:0 0 .35rem;color:#7dd3fc;font-size:1.2rem">' + esc(e.titolo) + "</h2>" +
          (e.data_evento ? '<div style="color:#94a3b8;font-size:.88rem">' + esc(fmt(e.data_evento)) + "</div>" : "") +
          (e.descrizione ? '<p style="color:#cbd5e1;margin:.65rem 0 0;line-height:1.55">' + esc(e.descrizione) + "</p>" : "") +
          table + "</div>"
        );
      }).join("");
    } catch (e) {
      box.innerHTML = '<p style="color:#f87171">' + esc(e.message || e) + "</p>";
    }
  }
  if (typeof CVI !== "undefined" && CVI.init) CVI.init("eventi-aperti.html");
  load();
})();
