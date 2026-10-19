/* CVI – Biblioteca tecnica (solo soci, link Dropbox/video) */
(function () {
  "use strict";

  var CAT = {
    guide: "Guide",
    polar: "Polar",
    setup: "Setup",
    video: "Video",
    faq: "FAQ"
  };

  var items = [];
  var filter = "all";
  var currentUserId = null;

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function waitCVI() {
    return new Promise(function (resolve) {
      var n = 0;
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (++n > 100) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
  }

  async function getUserId() {
    try {
      var res = await CVI.supabase.auth.getSession();
      var s = res.data && res.data.session;
      return s && s.user ? s.user.id : null;
    } catch (e) {
      return null;
    }
  }

  function ytId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function renderList() {
    var list = document.getElementById("bib-list");
    if (!list) return;
    var rows = items.filter(function (it) {
      return filter === "all" || it.categoria === filter;
    });
    if (!rows.length) {
      list.innerHTML =
        '<p class="bib-empty">Nessun contenuto' +
        (filter !== "all" ? " in questa categoria" : "") +
        ".</p>";
      return;
    }
    list.innerHTML = rows
      .map(function (it) {
        return (
          '<article class="bib-card" data-id="' +
          esc(it.id) +
          '">' +
          '<div class="bib-meta"><span class="bib-badge">' +
          esc(CAT[it.categoria] || it.categoria) +
          "</span></div>" +
          "<h3>" +
          esc(it.titolo) +
          "</h3>" +
          (it.sommario ? '<p class="bib-sum">' + esc(it.sommario) + "</p>" : "") +
          "</article>"
        );
      })
      .join("");

    list.querySelectorAll(".bib-card").forEach(function (card) {
      card.onclick = function () {
        openDetail(card.getAttribute("data-id"));
      };
    });
  }

  function openDetail(id) {
    var it = items.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!it) return;

    document.getElementById("bib-list-view").style.display = "none";
    var det = document.getElementById("bib-detail");
    det.classList.add("open");
    det.style.display = "block";

    document.getElementById("bib-d-meta").innerHTML =
      '<span class="bib-badge">' + esc(CAT[it.categoria] || it.categoria) + "</span>";
    document.getElementById("bib-d-title").textContent = it.titolo || "";
    document.getElementById("bib-d-body").textContent = it.corpo || it.sommario || "";

    var links = document.getElementById("bib-d-links");
    var html = "";
    if (it.url_file) {
      html +=
        '<a class="btn-file" href="' +
        esc(it.url_file) +
        '" target="_blank" rel="noopener">Scarica file (Dropbox)</a>';
    }
    if (it.url_esterno) {
      html +=
        '<a class="btn-ext" href="' +
        esc(it.url_esterno) +
        '" target="_blank" rel="noopener">Link esterno</a>';
    }
    if (it.url_video && !ytId(it.url_video)) {
      html +=
        '<a class="btn-vid" href="' +
        esc(it.url_video) +
        '" target="_blank" rel="noopener">Apri video</a>';
    }
    links.innerHTML = html;

    var vid = document.getElementById("bib-d-video");
    var yid = ytId(it.url_video);
    if (yid) {
      vid.style.display = "block";
      vid.innerHTML =
        '<iframe src="https://www.youtube.com/embed/' +
        yid +
        '" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
    } else {
      vid.style.display = "none";
      vid.innerHTML = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeDetail() {
    document.getElementById("bib-detail").classList.remove("open");
    document.getElementById("bib-detail").style.display = "none";
    document.getElementById("bib-list-view").style.display = "block";
  }

  async function load() {
    var list = document.getElementById("bib-list");
    try {
      var r = await CVI.supabase
        .from("biblioteca")
        .select("*")
        .eq("pubblicato", true)
        .order("ordine", { ascending: true })
        .order("updated_at", { ascending: false });
      if (r.error) throw r.error;
      items = r.data || [];
      renderList();
    } catch (e) {
      var msg = e.message || e;
      if (/relation|42P01/i.test(String(msg))) {
        list.innerHTML =
          '<p class="bib-empty" style="color:#f87171">Tabelle non create. Esegui <code>biblioteca-sql.sql</code> su Supabase.</p>';
      } else {
        list.innerHTML =
          '<p class="bib-empty" style="color:#f87171">' + esc(msg) + "</p>";
      }
    }
  }

  function wire() {
    document.querySelectorAll(".bib-tab").forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll(".bib-tab").forEach(function (t) {
          t.classList.remove("active");
        });
        tab.classList.add("active");
        filter = tab.getAttribute("data-cat") || "all";
        renderList();
      };
    });
    var back = document.getElementById("bib-back");
    if (back) back.onclick = closeDetail;
  }

  async function boot() {
    var ok = await waitCVI();
    if (!ok) return;
    currentUserId = await getUserId();
    var gate = document.getElementById("bib-auth-gate");
    var app = document.getElementById("bib-app");
    if (!currentUserId) {
      if (gate) gate.style.display = "block";
      if (app) app.style.display = "none";
      return;
    }
    if (gate) gate.style.display = "none";
    if (app) app.style.display = "block";
    wire();
    load();
  }

  boot();
})();
