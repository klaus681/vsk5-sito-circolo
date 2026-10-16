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

  CVI.flagEmoji = function (code) {
    if (!code) return "";
    var x = NAZIONI[String(code).toUpperCase()];
    return x ? x.f : "";
  };

  CVI.flagLabel = function (code) {
    if (!code) return "";
    var x = NAZIONI[String(code).toUpperCase()];
    return x ? x.f + " " + x.n : "";
  };

  CVI.flagPrefix = function (code) {
    var e = CVI.flagEmoji(code);
    return e ? e + "\u00a0" : "";
  };
})();
