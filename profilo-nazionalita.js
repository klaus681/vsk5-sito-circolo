/* CVI – Nazionalità opzionale sul profilo (bandiera emoji) */
(function () {
  "use strict";
  if (!/profilo\.html/i.test(location.pathname + location.href)) return;

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

  function ensureCss() {
    if (document.getElementById("cvi-flag-css")) return;
    var s = document.createElement("style");
    s.id = "cvi-flag-css";
    s.textContent =
      ".flag-badge{display:inline-flex;align-items:center;gap:.35rem;margin-top:.45rem;padding:.2rem .65rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;font-size:.85rem;color:#e2e8f0}" +
      ".flag-badge .flag-emoji{font-size:1.15rem;line-height:1}";
    document.head.appendChild(s);
  }

  function flagHtml(code) {
    if (!code) return "";
    var x = NAZIONI[String(code).toUpperCase()];
    if (!x) return "";
    return '<span class="flag-badge"><span class="flag-emoji">' + x.f + "</span> " + x.n + "</span>";
  }

  function ensureSelect() {
    if (document.getElementById("edit-nazionalita")) return;
    var cog = document.getElementById("edit-cognome");
    if (!cog) return;
    var wrap = document.createElement("div");
    var opts = '<option value="">— Non indicata —</option>';
    Object.keys(NAZIONI).forEach(function (code) {
      var x = NAZIONI[code];
      opts += '<option value="' + code + '">' + x.f + " " + x.n + "</option>";
    });
    wrap.innerHTML =
      '<label for="edit-nazionalita">Nazionalità (opzionale)</label>' +
      '<select id="edit-nazionalita" style="width:100%;background:#0b0f19;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:.55rem .75rem;font-family:inherit;font-size:.92rem">' +
      opts +
      "</select>";
    var parent = cog.parentNode;
    if (parent && parent.parentNode) parent.parentNode.insertBefore(wrap, parent.nextSibling);
    else if (parent) parent.appendChild(wrap);
  }

  function ensureFlagWrap() {
    if (document.getElementById("prof-flag-wrap")) return;
    var team = document.getElementById("prof-team-wrap");
    if (!team) return;
    var d = document.createElement("div");
    d.id = "prof-flag-wrap";
    team.parentNode.insertBefore(d, team.nextSibling);
  }

  function showFlag(code) {
    ensureFlagWrap();
    var fw = document.getElementById("prof-flag-wrap");
    if (fw) fw.innerHTML = flagHtml(code);
  }

  function fillSelect(code) {
    ensureSelect();
    var sel = document.getElementById("edit-nazionalita");
    if (sel) sel.value = (code || "").toUpperCase();
  }

  async function refreshFromProfile() {
    if (!window.CVI || !CVI.supabase) return;
    try {
      var sess = await CVI.supabase.auth.getSession();
      var user = sess.data && sess.data.session && sess.data.session.user;
      if (!user) return;
      var res = await CVI.supabase.from("profiles").select("nazionalita").eq("id", user.id).maybeSingle();
      if (res.error) return;
      var code = res.data && res.data.nazionalita;
      showFlag(code);
      fillSelect(code);
    } catch (e) {}
  }

  function wireSave() {
    var form = document.getElementById("edit-form");
    if (!form || form._nazWired) return;
    form._nazWired = true;
    form.addEventListener(
      "submit",
      async function (e) {
        setTimeout(async function () {
          try {
            ensureSelect();
            var sel = document.getElementById("edit-nazionalita");
            var naz = (sel && sel.value) || null;
            if (naz) naz = naz.toUpperCase();
            if (!window.CVI || !CVI.supabase) return;
            var sess = await CVI.supabase.auth.getSession();
            var user = sess.data && sess.data.session && sess.data.session.user;
            if (!user) return;
            var r = await CVI.supabase
              .from("profiles")
              .update({ nazionalita: naz || null })
              .eq("id", user.id);
            if (r.error) {
              console.warn("[CVI nazionalità]", r.error.message);
              return;
            }
            showFlag(naz);
          } catch (err) {
            console.warn("[CVI nazionalità]", err);
          }
        }, 600);
      },
      true
    );
  }

  function boot() {
    ensureCss();
    ensureSelect();
    ensureFlagWrap();
    wireSave();
    refreshFromProfile();
    setTimeout(refreshFromProfile, 800);
    setTimeout(refreshFromProfile, 2000);
    setTimeout(function () {
      ensureSelect();
      wireSave();
    }, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
