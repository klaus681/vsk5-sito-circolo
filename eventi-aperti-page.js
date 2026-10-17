/* CVI – pagina pubblica Eventi aperti (card + podio) */
(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso);
    }
  }

  function medalClass(pos) {
    if (pos === 1) return "gold";
    if (pos === 2) return "silver";
    if (pos === 3) return "bronze";
    return "";
  }

  async function load() {
    var box = document.getElementById("eventi-aperti-container");
    if (!box || !window.CVI || !CVI.supabase) return;

    box.innerHTML = '<p class="ea-loading">Caricamento…</p>';

    try {
      var res = await CVI.supabase
        .from("eventi_aperti")
        .select("*")
        .eq("pubblicato", true)
        .order("data_evento", { ascending: false, nullsFirst: false });

      if (res.error) throw res.error;
      var eventi = res.data || [];

      if (!eventi.length) {
        box.innerHTML =
          '<p class="ea-empty-msg">Nessun evento aperto pubblicato al momento.</p>';
        return;
      }

      var ids = eventi.map(function (e) {
        return e.id;
      });
      var ris = await CVI.supabase
        .from("eventi_aperti_risultati")
        .select("*")
        .in("evento_id", ids)
        .order("posizione");

      var byEv = {};
      (ris.data || []).forEach(function (r) {
        var k = String(r.evento_id);
        if (!byEv[k]) byEv[k] = [];
        byEv[k].push(r);
      });

      var cards = eventi
        .map(function (e) {
          var rows = byEv[String(e.id)] || [];
          var top = rows.slice(0, 3);

          var podium = "";
          if (top.length) {
            podium =
              '<div class="ea-page-podium">' +
              top
                .map(function (r) {
                  var cls = medalClass(Number(r.posizione) || 0);
                  return (
                    '<div class="ea-page-podium-item ' +
                    cls +
                    '">' +
                    '<div class="ea-page-medal">' +
                    esc(r.posizione) +
                    "°</div>" +
                    '<div class="ea-page-nick">' +
                    esc(r.nickname) +
                    "</div>" +
                    (r.team
                      ? '<div class="ea-page-team">' + esc(r.team) + "</div>"
                      : "") +
                    "</div>"
                  );
                })
                .join("") +
              "</div>";
          }

          var table = "";
          if (rows.length) {
            table =
              '<div class="ea-table-wrap"><table class="ea-results-table"><thead><tr><th>#</th><th>Skipper</th><th>Team</th><th>Note</th></tr></thead><tbody>' +
              rows
                .map(function (r) {
                  var cls = medalClass(Number(r.posizione) || 0);
                  return (
                    "<tr class=\"" +
                    cls +
                    "\">" +
                    "<td><strong>" +
                    esc(r.posizione) +
                    "</strong></td>" +
                    "<td>" +
                    esc(r.nickname) +
                    "</td>" +
                    "<td>" +
                    esc(r.team || "—") +
                    "</td>" +
                    "<td>" +
                    esc(r.note || "—") +
                    "</td></tr>"
                  );
                })
                .join("") +
              "</tbody></table></div>";
          } else {
            table =
              '<p class="ea-no-rank">Classifica non ancora inserita.</p>';
          }

          return (
            '<article class="ea-event-card">' +
            '<div class="ea-event-head">' +
            "<div>" +
            '<h2 class="ea-event-title">' +
            esc(e.titolo) +
            "</h2>" +
            (e.data_evento
              ? '<div class="ea-event-date">📅 ' +
                esc(fmt(e.data_evento)) +
                "</div>"
              : "") +
            "</div>" +
            "</div>" +
            (e.descrizione
              ? '<p class="ea-event-desc">' + esc(e.descrizione) + "</p>"
              : "") +
            podium +
            table +
            "</article>"
          );
        })
        .join("");

      var styles =
        "<style>" +
        ".ea-loading,.ea-empty-msg{color:#94a3b8;text-align:center;padding:2rem 1rem}" +
        ".ea-event-card{position:relative;overflow:hidden;background:linear-gradient(165deg,#152033 0%,#111827 55%,#0f1524 100%);border:1px solid rgba(56,189,248,.2);border-radius:16px;padding:1.4rem 1.5rem;margin-bottom:1.35rem;box-shadow:0 6px 20px rgba(0,0,0,.22);transition:border-color .25s ease}" +
        ".ea-event-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--accent-color,#38bdf8),#0ea5e9);pointer-events:none;z-index:1}" +
        ".ea-event-card:hover{border-color:var(--accent-color,#38bdf8)}" +
        ".ea-event-title{margin:0 0 .3rem;color:#7dd3fc;font-size:1.25rem;font-weight:700}" +
        ".ea-event-date{color:#94a3b8;font-size:.88rem}" +
        ".ea-event-desc{color:#cbd5e1;margin:.75rem 0 1rem;line-height:1.55;font-size:.95rem}" +
        ".ea-page-podium{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:1rem 0 1.15rem}" +
        ".ea-page-podium-item{text-align:center;background:rgba(15,23,42,.65);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:1rem .6rem}" +
        ".ea-page-podium-item.gold{border-color:rgba(251,191,36,.45);background:linear-gradient(180deg,rgba(251,191,36,.12),transparent)}" +
        ".ea-page-podium-item.silver{border-color:rgba(148,163,184,.4);background:linear-gradient(180deg,rgba(148,163,184,.1),transparent)}" +
        ".ea-page-podium-item.bronze{border-color:rgba(217,119,6,.4);background:linear-gradient(180deg,rgba(217,119,6,.1),transparent)}" +
        ".ea-page-medal{font-size:1.35rem;font-weight:800;margin-bottom:.35rem;color:#7dd3fc}" +
        ".ea-page-podium-item.gold .ea-page-medal{color:#fbbf24}" +
        ".ea-page-podium-item.silver .ea-page-medal{color:#cbd5e1}" +
        ".ea-page-podium-item.bronze .ea-page-medal{color:#f59e0b}" +
        ".ea-page-nick{color:#fff;font-weight:700;font-size:1rem}" +
        ".ea-page-team{color:#94a3b8;font-size:.82rem;margin-top:.2rem}" +
        ".ea-table-wrap{overflow-x:auto;margin-top:.5rem}" +
        ".ea-results-table{width:100%;border-collapse:collapse;font-size:.9rem}" +
        ".ea-results-table th{text-align:left;padding:.55rem .7rem;color:#94a3b8;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid rgba(255,255,255,.08)}" +
        ".ea-results-table td{padding:.6rem .7rem;border-bottom:1px solid rgba(255,255,255,.04);color:#e2e8f0}" +
        ".ea-results-table tr.gold td:first-child{color:#fbbf24}" +
        ".ea-results-table tr.silver td:first-child{color:#cbd5e1}" +
        ".ea-results-table tr.bronze td:first-child{color:#f59e0b}" +
        ".ea-no-rank{color:#64748b;margin:.75rem 0 0;font-size:.9rem}" +
        "@media(max-width:600px){.ea-page-podium{grid-template-columns:1fr}.ea-event-card{padding:1.15rem}}" +
        "</style>";

      if (!document.getElementById("ea-page-styles")) {
        var st = document.createElement("div");
        st.id = "ea-page-styles";
        st.innerHTML = styles;
        document.head.appendChild(st.firstChild || st);
      }

      box.innerHTML = cards;
    } catch (e) {
      box.innerHTML =
        '<p style="color:#f87171;text-align:center;padding:1.5rem">' +
        esc(e.message || e) +
        "</p>";
    }
  }

  if (typeof CVI !== "undefined" && CVI.init) CVI.init("eventi-aperti.html");
  load();
})();
