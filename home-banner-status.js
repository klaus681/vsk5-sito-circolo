/* CVI – badge Home Eventi: APERTO/PROSSIMO/PASSATO in base alle date */
(function () {
  "use strict";

  function parseBannerDates(text) {
    if (!text) return null;
    var months = {
      gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5,
      lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11
    };
    var re = /(\d{1,2})\s*(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)(?:\w*)?(?:\s+(\d{4}))?/gi;
    var matches = [];
    var m;
    var year = new Date().getFullYear();
    while ((m = re.exec(text))) {
      var d = parseInt(m[1], 10);
      var mo = months[m[2].toLowerCase().slice(0, 3)];
      var y = m[3] ? parseInt(m[3], 10) : year;
      if (mo != null && !isNaN(d)) matches.push(new Date(y, mo, d, 23, 59, 59, 999));
    }
    if (!matches.length) return null;
    return matches[matches.length - 1];
  }

  function styleFor(status) {
    if (status === "passato")
      return { label: "PASSATO", bg: "rgba(148,163,184,0.2)", color: "#94a3b8", border: "rgba(148,163,184,0.35)" };
    if (status === "prossimo")
      return { label: "PROSSIMO", bg: "rgba(56,189,248,0.2)", color: "#7dd3fc", border: "rgba(56,189,248,0.35)" };
    return { label: "APERTO", bg: "rgba(34,197,94,0.2)", color: "#4ade80", border: "rgba(34,197,94,0.35)" };
  }

  function fix() {
    var root = document.getElementById("home-extra-banners") || document.body;
    if (!root) return;
    root.querySelectorAll("span").forEach(function (sp) {
      var t = (sp.textContent || "").trim().toUpperCase();
      if (t !== "APERTO" && t !== "PASSATO" && t !== "PROSSIMO") return;
      var card = sp.parentElement;
      for (var i = 0; i < 8 && card; i++) {
        if (card.innerText && /\d{1,2}\s*(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)/i.test(card.innerText)) break;
        card = card.parentElement;
      }
      if (!card) return;
      var end = parseBannerDates(card.innerText);
      if (!end) return;
      var now = Date.now();
      var status = "aperto";
      var months = { gen:0,feb:1,mar:2,apr:3,mag:4,giu:5,lug:6,ago:7,set:8,ott:9,nov:10,dic:11 };
      var re = /(\d{1,2})\s*(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)/i;
      var mm = card.innerText.match(re);
      if (mm) {
        var y = (card.innerText.match(/\b(20\d{2})\b/) || [])[1];
        y = y ? parseInt(y, 10) : new Date().getFullYear();
        var first = new Date(y, months[mm[2].toLowerCase().slice(0,3)], parseInt(mm[1],10), 0, 0, 0, 0);
        if (now < first.getTime()) status = "prossimo";
        else if (now > end.getTime()) status = "passato";
        else status = "aperto";
      } else if (now > end.getTime()) {
        status = "passato";
      }
      var st = styleFor(status);
      sp.textContent = st.label;
      sp.style.background = st.bg;
      sp.style.color = st.color;
      sp.style.border = "1px solid " + st.border;
    });
  }

  setTimeout(fix, 600);
  setTimeout(fix, 1500);
  setTimeout(fix, 3000);
  if (document.body) {
    var obs = new MutationObserver(function () { setTimeout(fix, 100); });
    obs.observe(document.body, { childList: true, subtree: true });
  }
})();
