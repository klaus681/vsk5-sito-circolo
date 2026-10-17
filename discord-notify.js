/* CVI – notifiche Discord via webhook */
(function () {
  "use strict";
  var SITE = "https://www.circolovelicoitalia.it";
  var CACHE = {};
  var CACHE_AT = {};

  async function getWebhook(key) {
    key = key || "discord_webhook";
    if (!window.CVI || !CVI.supabase) return "";
    if (CACHE[key] && Date.now() - (CACHE_AT[key] || 0) < 60000) return CACHE[key];
    try {
      var res = await CVI.supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (res.error) return "";
      CACHE[key] = res.data && res.data.value ? String(res.data.value).trim() : "";
      CACHE_AT[key] = Date.now();
      return CACHE[key];
    } catch (e) {
      return "";
    }
  }

  function isValidWebhook(url) {
    return (
      url &&
      /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(url)
    );
  }

  async function resolveWebhook(webhookKey) {
    var keys = Array.isArray(webhookKey) ? webhookKey.slice() : [webhookKey || "discord_webhook"];
    if (keys.indexOf("discord_webhook") < 0) keys.push("discord_webhook");
    for (var i = 0; i < keys.length; i++) {
      var w = await getWebhook(keys[i]);
      if (isValidWebhook(w)) return w;
    }
    return "";
  }

  async function sendEmbed(opts, webhookKey) {
    var webhook = await resolveWebhook(webhookKey);
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
        body: JSON.stringify({ username: "CVI Virtual", embeds: [embed] })
      });
      return r.ok || r.status === 204;
    } catch (e) {
      console.warn("[CVI Discord]", e);
      return false;
    }
  }

  window.CVIDiscord = {
    clearCache: function () {
      CACHE = {};
      CACHE_AT = {};
    },
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
      if (gara.num_regate)
        fields.push({
          name: "Regate",
          value: String(gara.num_regate),
          inline: true
        });
      return sendEmbed(
        {
          title: "🏁 Nuova gara: " + (gara.titolo || "Gara"),
          description: gara.descrizione || "Iscrizioni aperte sul sito.",
          color: 0x34d399,
          url: SITE + "/gare.html",
          fields: fields
        },
        "discord_webhook_gare"
      );
    },
    notifyProtesta: function (p) {
      p = p || {};
      var fields = [];
      if (p.protestante)
        fields.push({
          name: "Protestante",
          value: String(p.protestante).slice(0, 100),
          inline: true
        });
      if (p.protestato)
        fields.push({
          name: "Protestato",
          value: String(p.protestato).slice(0, 100),
          inline: true
        });
      if (p.gara)
        fields.push({
          name: "Gara",
          value: String(p.gara).slice(0, 150),
          inline: false
        });
      if (p.regola)
        fields.push({
          name: "Regola",
          value: String(p.regola).slice(0, 80),
          inline: true
        });
      var desc = String(p.descrizione || "").slice(0, 800);
      return sendEmbed(
        {
          title: "⚖️ Nuova protesta di regata",
          description: desc || "Nuova protesta presentata sul sito.",
          color: 0xfbbf24,
          url: SITE + "/proteste.html",
          fields: fields
        },
        "discord_webhook_proteste"
      );
    },
    notifyTorneo: function (t) {
      t = t || {};
      var fields = [];
      var statoLbl =
        { bozza: "Bozza", aperto: "Aperto", in_corso: "In corso", chiuso: "Chiuso" }[
          t.stato
        ] || t.stato || "";
      if (statoLbl) fields.push({ name: "Stato", value: String(statoLbl), inline: true });
      var date = [];
      if (t.data_inizio) date.push(t.data_inizio);
      if (t.data_fine) date.push(t.data_fine);
      if (date.length)
        fields.push({ name: "📅 Periodo", value: date.join(" → ").slice(0, 100), inline: true });
      if (t.gare_previste)
        fields.push({ name: "Gare previste", value: String(t.gare_previste), inline: true });
      if (t.max_partecipanti)
        fields.push({ name: "Max partecipanti", value: String(t.max_partecipanti), inline: true });
      return sendEmbed(
        {
          title: "🏆 Nuovo torneo: " + (t.titolo || "Torneo"),
          description: String(t.descrizione || "Torneo pubblicato sul sito.").slice(0, 900),
          color: 0xa78bfa,
          url: t.id ? SITE + "/tornei.html?id=" + encodeURIComponent(t.id) : SITE + "/tornei.html",
          fields: fields
        },
        "discord_webhook_tornei"
      );
    },
    notifyTorneoIscrizione: function (t, iscritto) {
      t = t || {};
      var fields = [];
      if (iscritto)
        fields.push({ name: "Iscritto", value: String(iscritto).slice(0, 100), inline: true });
      if (t.max_partecipanti)
        fields.push({ name: "Max partecipanti", value: String(t.max_partecipanti), inline: true });
      return sendEmbed(
        {
          title: "📝 Nuova iscrizione al torneo: " + (t.titolo || "Torneo"),
          description: iscritto
            ? iscritto + " si è iscritto al torneo."
            : "Nuova iscrizione al torneo.",
          color: 0x34d399,
          url: t.id ? SITE + "/tornei.html?id=" + encodeURIComponent(t.id) : SITE + "/tornei.html",
          fields: fields
        },
        ["discord_webhook_iscrizioni", "discord_webhook_tornei", "discord_webhook"]
      );
    },
    notifyIscrizioneGara: function (g, iscritto) {
      g = g || {};
      var fields = [];
      if (iscritto)
        fields.push({ name: "Iscritto", value: String(iscritto).slice(0, 100), inline: true });
      if (g.max_iscritti)
        fields.push({ name: "Max iscritti", value: String(g.max_iscritti), inline: true });
      return sendEmbed(
        {
          title: "🙋 Nuova iscrizione alla gara: " + (g.titolo || "Gara"),
          description: iscritto
            ? iscritto + " si è iscritto alla gara."
            : "Nuova iscrizione alla gara.",
          color: 0x38bdf8,
          url: SITE + "/gare.html",
          fields: fields
        },
        ["discord_webhook_iscrizioni", "discord_webhook_gare", "discord_webhook"]
      );
    }
  };

  function wireHomeAvviso() {
    var btn = document.getElementById("btn-salva-avviso");
    if (!btn || btn._cviDiscord) return;
    btn._cviDiscord = true;
    btn.addEventListener(
      "click",
      function () {
        var t = document.getElementById("avviso-titolo");
        var x = document.getElementById("avviso-testo");
        btn._pendingTitolo = t ? t.value.trim() : "";
        btn._pendingTesto = x ? x.value.trim() : "";
        setTimeout(async function () {
          var form = document.getElementById("form-avviso");
          if (
            form &&
            !form.classList.contains("open") &&
            btn._pendingTitolo &&
            btn._pendingTesto
          ) {
            try {
              await window.CVIDiscord.notifyAvviso(
                btn._pendingTitolo,
                btn._pendingTesto
              );
            } catch (e) {
              console.warn(e);
            }
            btn._pendingTitolo = "";
            btn._pendingTesto = "";
          }
        }, 1200);
      },
      true
    );
  }

  function wireGareForm() {
    var btn =
      document.getElementById("admin-save-btn") ||
      document.getElementById("gara-save-btn");
    if (!btn || btn._cviDiscord) return;
    btn._cviDiscord = true;
    btn.addEventListener(
      "click",
      function () {
        var idEl =
          document.getElementById("admin-gara-id") ||
          document.getElementById("gara-id");
        var isNew = !idEl || !String(idEl.value || "").trim();
        if (!isNew) return;
        var titoloEl =
          document.getElementById("admin-titolo") ||
          document.getElementById("gara-titolo");
        var dataEl =
          document.getElementById("admin-data") ||
          document.getElementById("gara-data");
        var descEl =
          document.getElementById("admin-descrizione") ||
          document.getElementById("gara-desc");
        var numEl =
          document.getElementById("admin-num-regate") ||
          document.getElementById("gara-num");
        var payload = {
          titolo: titoloEl ? titoloEl.value.trim() : "",
          descrizione: descEl ? descEl.value.trim() : "",
          data_gara:
            dataEl && dataEl.value
              ? new Date(dataEl.value).toISOString()
              : null,
          num_regate: numEl ? numEl.value : 1
        };
        setTimeout(async function () {
          if (!payload.titolo) return;
          try {
            await window.CVIDiscord.notifyGara(payload);
          } catch (e) {
            console.warn(e);
          }
        }, 1500);
      },
      true
    );
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
