/* CVI – bandiere nazionalità (condiviso) */
(function () {
  "use strict";
  window.CVI = window.CVI || {};

  var NAZIONI = {
    IT: { f: "🇮🇹", n: "Italia" },
    FR: { f: "🇫🇷", n: "Francia" },
    ES: { f: "🇪🇸", n: "Spagna" },
    DE: { f: "🇩🇪", n: "Germania" },
    GB: { f: "🇬🇧", n: "Regno Unito" },
    PT: { f: "🇵🇹", n: "Portogallo" },
    CH: { f: "🇨🇭", n: "Svizzera" },
    AT: { f: "🇦🇹", n: "Austria" },
    BE: { f: "🇧🇪", n: "Belgio" },
    NL: { f: "🇳🇱", n: "Paesi Bassi" },
    PL: { f: "🇵🇱", n: "Polonia" },
    CZ: { f: "🇨🇿", n: "Cechia" },
    SK: { f: "🇸🇰", n: "Slovacchia" },
    HU: { f: "🇭🇺", n: "Ungheria" },
    RO: { f: "🇷🇴", n: "Romania" },
    HR: { f: "🇭🇷", n: "Croazia" },
    SI: { f: "🇸🇮", n: "Slovenia" },
    GR: { f: "🇬🇷", n: "Grecia" },
    SE: { f: "🇸🇪", n: "Svezia" },
    NO: { f: "🇳🇴", n: "Norvegia" },
    DK: { f: "🇩🇰", n: "Danimarca" },
    FI: { f: "🇫🇮", n: "Finlandia" },
    IE: { f: "🇮🇪", n: "Irlanda" },
    US: { f: "🇺🇸", n: "Stati Uniti" },
    CA: { f: "🇨🇦", n: "Canada" },
    BR: { f: "🇧🇷", n: "Brasile" },
    AR: { f: "🇦🇷", n: "Argentina" },
    AU: { f: "🇦🇺", n: "Australia" },
    NZ: { f: "🇳🇿", n: "Nuova Zelanda" },
    JP: { f: "🇯🇵", n: "Giappone" }
  };

  CVI.NAZIONI = NAZIONI;

  var FLAG_BASE = "flags/";

  function escAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureFlagCss() {
    if (!document.head || document.getElementById("cvi-flag-img-css")) return;
    var s = document.createElement("style");
    s.id = "cvi-flag-img-css";
    s.textContent =
      ".cvi-flag-img{display:inline-block;width:1.45em;height:1em;object-fit:cover;border-radius:2px;vertical-align:-0.14em;margin-right:.4em;box-shadow:0 0 0 1px rgba(255,255,255,.16);flex:0 0 auto}" +
      ".flag-badge .cvi-flag-img{width:1.5em;height:1.05em;margin-right:0}";
    document.head.appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureFlagCss);
  else ensureFlagCss();

  /* Emoji mantenuta solo per compatibilità: il sito usa CVI.flagImg. */
  CVI.flagEmoji = function (code) {
    if (!code) return "";
    var x = NAZIONI[String(code).toUpperCase()];
    return x ? x.f : "";
  };

  /* URL immagine bandiera (PNG universale, niente emoji). */
  CVI.flagUrl = function (code) {
    if (!code) return "";
    var key = String(code).toUpperCase();
    if (!NAZIONI[key]) return "";
    return FLAG_BASE + key.toLowerCase() + ".png";
  };

  /* Tag <img> pronto da inserire nell'HTML. */
  CVI.flagImg = function (code, extraClass) {
    var key = code ? String(code).toUpperCase() : "";
    var x = NAZIONI[key];
    if (!x) return "";
    return '<img class="cvi-flag-img' + (extraClass ? " " + extraClass : "") +
      '" src="' + CVI.flagUrl(key) + '" alt="' + escAttr(x.n) +
      '" width="20" height="15" loading="lazy">';
  };

  CVI.flagLabel = function (code) {
    if (!code) return "";
    var x = NAZIONI[String(code).toUpperCase()];
    return x ? x.f + " " + x.n : "";
  };

  CVI.flagPrefix = function (code) {
    var img = CVI.flagImg(code);
    return img ? img + "\u00a0" : "";
  };
})();
