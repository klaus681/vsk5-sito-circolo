/* CVI – notifiche Discord via webhook */
(function () {
  "use strict";

  var SITE = "https://www.circolovelicoitalia.it";
  var CACHE = null;
  var CACHE_AT = 0;

  async function getWebhook() {
    if (!window.CVI || !CVI.supabase) return "";
    if (CACHE && Date.now() - CACHE_AT < 60000) return CACHE;
    try {
      var res = await CVI.supabase
        .from("site_settings")
        .select("value")
        .eq("key", "discord_webhook")
        .maybeSingle();
      if (res.error) return "";
      CACHE = (res.data && res.data.value) ? String(res.data.value).trim() : "";
      CACHE_AT = Date.now();
      return CACHE;
    } catch (e) {
      return "";
    }
  }

  function isValidWebhook(url) {
    return url && /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(url);
  }

  async function sendEmbed(opts) {
    var webhook = await getWebhook();
    if (!isValidWebhook(webhook)) return false;
    var embed = {
      title: String(opts.title || "").slice(0, 256),
      description: String(opts.description || "").slice(0, 2000),
      color: opts.color != null ? opts.color : 0x38bdf8,
      url: opts.url || SITE,
      timestamp: new Date().toISOString(),
      footer: { text: "Circolo Velico Italia · Virtual Skipper" }
    };
    if (opts.fields && opts.fields.length) embed.fields = opts.fields;
    try {
      var r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "CVI Virtual",
          embeds: [embed]
        })
      });
      return r.ok || r.status === 204;
    } catch (e) {
      console.warn("[CVI Discord]", e);
      return false;
    }
  }

  window.CVIDiscord = {
    clearCache: function () { CACHE = null; CACHE_AT = 0; },
    sendEmbed: sendEmbed,
    notifyAvviso: function (titolo, testo) {
      return sendEmbed({
        title: "📌 Nuovo avviso: " + (titolo || ""),
        description: testo || "",
        color: 0x38bdf8,
        url: SITE + "/index.html"
      });
    },
    notifyGara: function (gara) {
      gara = gara || {};
      var dataFmt = "";
      if (gara.data_gara) {
        try {
          dataFmt = new Date(gara.data_gara).toLocaleString("it-IT", {
            dateStyle: "full",
            timeStyle: "short"
          });
        } catch (e) {
          dataFmt = String(gara.data_gara);
        }
      }
      var fields = [];
      if (dataFmt) fields.push({ name: "📅 Data", value: dataFmt, inline: true });
      if (gara.num_regate) fields.push({ name: "Regate", value: String(gara.num_regate), inline: true });
      return sendEmbed({
        title: "🏁 Nuova gara: " + (gara.titolo || "Gara"),
        description: gara.descrizione || "Iscrizioni aperte sul sito.",
        color: 0x34d399,
        url: SITE + "/gare.html",
        fields: fields
      });
    }
  };

  function wireHomeAvviso() {
    var btn = document.getElementById("btn-salva-avviso");
    if (!btn || btn._cviDiscord) return;
    btn._cviDiscord = true;
    btn.addEventListener("click", function () {
      var t = document.getElementById("avviso-titolo");
      var x = document.getElementById("avviso-testo");
      btn._pendingTitolo = t ? t.value.trim() : "";
      btn._pendingTesto = x ? x.value.trim() : "";
      setTimeout(async function () {
        var form = document.getElementById("form-avviso");
        if (form && !form.classList.contains("open") && btn._pendingTitolo && btn._pendingTesto) {
          try {
            await window.CVIDiscord.notifyAvviso(btn._pendingTitolo, btn._pendingTesto);
          } catch (e) { console.warn(e); }
          btn._pendingTitolo = "";
          btn._pendingTesto = "";
        }
      }, 1200);
    }, true);
  }

  function wireGareForm() {
    var btn = document.getElementById("admin-save-btn") || document.getElementById("gara-save-btn");
    if (!btn || btn._cviDiscord) return;
    btn._cviDiscord = true;
    btn.addEventListener("click", function () {
      var idEl = document.getElementById("admin-gara-id") || document.getElementById("gara-id");
      var isNew = !idEl || !String(idEl.value || "").trim();
      if (!isNew) return;
      var titoloEl = document.getElementById("admin-titolo") || document.getElementById("gara-titolo");
      var dataEl = document.getElementById("admin-data") || document.getElementById("gara-data");
      var descEl = document.getElementById("admin-descrizione") || document.getElementById("gara-desc");
      var numEl = document.getElementById("admin-num-regate") || document.getElementById("gara-num");
      var payload = {
        titolo: titoloEl ? titoloEl.value.trim() : "",
        descrizione: descEl ? descEl.value.trim() : "",
        data_gara: dataEl && dataEl.value ? new Date(dataEl.value).toISOString() : null,
        num_regate: numEl ? numEl.value : 1
      };
      setTimeout(async function () {
        if (!payload.titolo) return;
        try { await window.CVIDiscord.notifyGara(payload); } catch (e) { console.warn(e); }
      }, 1500);
    }, true);
  }

  function tryWireAll() {
    wireHomeAvviso();
    wireGareForm();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(tryWireAll, 1000);
      setTimeout(tryWireAll, 3000);
    });
  } else {
    setTimeout(tryWireAll, 1000);
    setTimeout(tryWireAll, 3000);
  }
})();
