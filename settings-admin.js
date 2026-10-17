/* CVI Admin – impostazioni sito (video, banner, stats, discord) */
(function(){
"use strict";

var HERO_KEYS=["home_community","home_title","home_subtitle","home_cta1_text","home_cta1_href","home_cta2_text","home_cta2_href"];
var STAT_KEYS=["home_stat_soci_label","home_stat_soci_value","home_stat_squadre_label","home_stat_squadre_value","home_stat_regate_label","home_stat_regate_value","home_stat_dal_label","home_stat_dal_value"];
var ALL_SETTING_KEYS=HERO_KEYS.concat(STAT_KEYS);

function esc(s){
  if(s==null)return"";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function notify(msg, type){
  if(typeof status==="function"){ status(msg, type); return; }
  var el=document.getElementById("admin-status");
  if(!el)return;
  el.textContent=msg||"";
  el.className="admin-status"+(type?" "+type:"");
  clearTimeout(notify._t);
  if(msg)notify._t=setTimeout(function(){el.textContent="";el.className="admin-status";},4000);
}

function extractYoutubeId(raw){
  raw=String(raw||"").trim();
  if(!raw)return"";
  var m=raw.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/)||raw.match(/^([A-Za-z0-9_-]{6,})$/);
  return m?m[1]:"";
}

async function upsertSetting(key, value){
  return CVI.supabase.from("site_settings").upsert(
    { key: key, value: value, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

async function loadSettings(){
  var input=document.getElementById("set-youtube");
  var hint=document.getElementById("set-sql-hint");
  try{
    var allKeys=["home_youtube","discord_webhook","discord_webhook_proteste","discord_webhook_tornei"].concat(ALL_SETTING_KEYS);
    var res=await CVI.supabase.from("site_settings").select("key,value").in("key", allKeys);
    if(res.error)throw res.error;
    var map={};
    (res.data||[]).forEach(function(r){ map[r.key]=r.value; });
    if(input) input.value=map.home_youtube||"";
    updatePreview(map.home_youtube||"");
    var dw=document.getElementById("set-discord-webhook");
    if(dw) dw.value=map.discord_webhook||"";
    ensureProtestWebhookField();
    var dwp=document.getElementById("set-discord-webhook-proteste");
    if(dwp) dwp.value=map.discord_webhook_proteste||"";
    var dwt=document.getElementById("set-discord-webhook-tornei");
    if(dwt) dwt.value=map.discord_webhook_tornei||"";
    ALL_SETTING_KEYS.forEach(function(k){
      var el=document.getElementById("set-"+k);
      if(el) el.value=map[k]||"";
    });
  }catch(e){
    if(hint){ hint.style.display="block"; hint.textContent="Errore impostazioni: "+(e.message||e); }
  }
}

function updatePreview(raw){
  var preview=document.getElementById("set-youtube-preview");
  if(!preview)return;
  var id=extractYoutubeId(raw);
  if(!id){ preview.innerHTML=""; return; }
  preview.innerHTML='<div class="video-container" style="max-width:420px"><iframe src="https://www.youtube.com/embed/'+esc(id)+'" title="Anteprima" allowfullscreen loading="lazy"></iframe></div>';
}

async function saveYoutube(e){
  if(e)e.preventDefault();
  var input=document.getElementById("set-youtube");
  if(!input)return;
  var val=input.value.trim();
  var id=extractYoutubeId(val);
  if(val && !id){ alert("URL YouTube non valido"); return; }
  var btn=document.getElementById("set-save-btn");
  if(btn)btn.disabled=true;
  try{
    var r=await upsertSetting("home_youtube", id?("https://www.youtube.com/watch?v="+id):"");
    if(r.error)throw r.error;
    notify("Video salvato","ok");
    updatePreview(id);
  }catch(err){
    notify(err.message||err,"err");
    var hint=document.getElementById("set-sql-hint");
    if(hint){ hint.style.display="block"; }
  }finally{ if(btn)btn.disabled=false; }
}

async function saveHero(e){
  if(e)e.preventDefault();
  var btn=document.getElementById("set-hero-save-btn");
  if(btn)btn.disabled=true;
  try{
    for(var i=0;i<HERO_KEYS.length;i++){
      var k=HERO_KEYS[i];
      var el=document.getElementById("set-"+k);
      var r=await upsertSetting(k, el?el.value.trim():"");
      if(r.error)throw r.error;
    }
    notify("Hero salvato","ok");
  }catch(err){
    notify(err.message||err,"err");
    var hint=document.getElementById("set-sql-hint");
    if(hint)hint.style.display="block";
  }finally{ if(btn)btn.disabled=false; }
}

async function saveStats(e){
  if(e)e.preventDefault();
  var btn=document.getElementById("set-stats-save-btn");
  if(btn)btn.disabled=true;
  try{
    for(var i=0;i<STAT_KEYS.length;i++){
      var k=STAT_KEYS[i];
      var el=document.getElementById("set-"+k);
      var r=await upsertSetting(k, el?el.value.trim():"");
      if(r.error)throw r.error;
    }
    notify("Statistiche salvate","ok");
  }catch(err){
    notify(err.message||err,"err");
    var hint=document.getElementById("set-sql-hint");
    if(hint)hint.style.display="block";
  }finally{ if(btn)btn.disabled=false; }
}

function ensureProtestWebhookField(){
  var form=document.getElementById("settings-discord-form");
  if(!form) return;
  if(!document.getElementById("set-discord-webhook-proteste")){
    var wrap=document.createElement("div");
    wrap.style.marginTop="0.75rem";
    wrap.innerHTML=
      '<label class="adm-label" for="set-discord-webhook-proteste">Webhook Proteste (#proteste)</label>'+
      '<input class="adm-input" id="set-discord-webhook-proteste" style="width:100%" autocomplete="off" placeholder="https://discord.com/api/webhooks/...">'+
      '<p style="margin:.35rem 0 0;font-size:.8rem;color:#94a3b8">Solo per le proteste. Se vuoto, usa il webhook generale.</p>';
    var first=form.querySelector("div");
    if(first&&first.nextSibling) form.insertBefore(wrap, first.nextSibling);
    else form.insertBefore(wrap, form.firstChild);
  }
  if(!document.getElementById("set-discord-webhook-tornei")){
    var wrapT=document.createElement("div");
    wrapT.style.marginTop="0.75rem";
    wrapT.innerHTML=
      '<label class="adm-label" for="set-discord-webhook-tornei">Webhook Tornei (#tornei)</label>'+
      '<input class="adm-input" id="set-discord-webhook-tornei" style="width:100%" autocomplete="off" placeholder="https://discord.com/api/webhooks/...">'+
      '<p style="margin:.35rem 0 0;font-size:.8rem;color:#94a3b8">Solo per i tornei. Se vuoto, usa il webhook generale.</p>';
    var wp=document.getElementById("set-discord-webhook-proteste");
    if(wp&&wp.parentElement&&wp.parentElement.nextSibling) form.insertBefore(wrapT, wp.parentElement.nextSibling);
    else form.appendChild(wrapT);
  }
  var label0=form.querySelector('label[for="set-discord-webhook"]');
  if(label0) label0.textContent="Webhook generale (avvisi / gare)";
}

async function saveDiscord(e){
  if(e)e.preventDefault();
  ensureProtestWebhookField();
  var input=document.getElementById("set-discord-webhook");
  if(!input)return;
  var val=input.value.trim();
  var inputP=document.getElementById("set-discord-webhook-proteste");
  var valP=inputP?inputP.value.trim():"";
  var inputT=document.getElementById("set-discord-webhook-tornei");
  var valT=inputT?inputT.value.trim():"";
  function validWh(u){return !u || /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(u);}
  if(!validWh(val)||!validWh(valP)||!validWh(valT)){
    alert("URL webhook Discord non valido. Deve iniziare con https://discord.com/api/webhooks/...");
    return;
  }
  var btn=document.getElementById("set-discord-save-btn");
  if(btn)btn.disabled=true;
  try{
    var r=await upsertSetting("discord_webhook",val);
    if(r.error)throw r.error;
    var r2=await upsertSetting("discord_webhook_proteste",valP);
    if(r2.error)throw r2.error;
    var r3=await upsertSetting("discord_webhook_tornei",valT);
    if(r3.error)throw r3.error;
    if(window.CVIDiscord) CVIDiscord.clearCache();
    notify((val||valP||valT)?"Webhook Discord salvati":"Webhook rimossi","ok");
  }catch(err){
    notify(err.message||err,"err");
  }finally{ if(btn)btn.disabled=false; }
}

async function testDiscord(e){
  if(e)e.preventDefault();
  if(!window.CVIDiscord){alert("Modulo Discord non caricato");return;}
  var btn=document.getElementById("set-discord-test-btn");
  if(btn)btn.disabled=true;
  try{
    var input=document.getElementById("set-discord-webhook");
    if(input&&input.value.trim()){
      await upsertSetting("discord_webhook",input.value.trim());
      CVIDiscord.clearCache();
    }
    var ok=await CVIDiscord.sendEmbed({
      title:"✅ Test CVI Virtual",
      description:"Il webhook Discord è configurato correttamente.",
      color:0x34d399
    });
    notify(ok?"Messaggio di test inviato su Discord":"Invio fallito — controlla l'URL del webhook","ok");
  }catch(err){
    notify(err.message||err,"err");
  }finally{ if(btn)btn.disabled=false; }
}

function wireSettings(){
  var form=document.getElementById("settings-form");
  if(form&&!form._wired){form._wired=true;form.onsubmit=saveYoutube;}
  var heroForm=document.getElementById("settings-hero-form");
  if(heroForm&&!heroForm._wired){heroForm._wired=true;heroForm.onsubmit=saveHero;}
  var statsForm=document.getElementById("settings-stats-form");
  if(statsForm&&!statsForm._wired){statsForm._wired=true;statsForm.onsubmit=saveStats;}
  var discForm=document.getElementById("settings-discord-form");
  if(discForm&&!discForm._wired){discForm._wired=true;discForm.onsubmit=saveDiscord;}
  var testBtn=document.getElementById("set-discord-test-btn");
  if(testBtn&&!testBtn._wired){testBtn._wired=true;testBtn.onclick=testDiscord;}
  var input=document.getElementById("set-youtube");
  if(input&&!input._wired){input._wired=true;input.addEventListener("input",function(){updatePreview(input.value);});}
  var tab=document.querySelector('.admin-tab[data-tab="settings"], .admin-tab[data-tab="impostazioni"]');
  if(tab&&!tab._settingsWired){
    tab._settingsWired=true;
    tab.addEventListener("click",function(){ setTimeout(loadSettings, 200); });
  }
  loadSettings();
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",function(){ setTimeout(wireSettings,800); setTimeout(wireSettings,2000); });
}else{
  setTimeout(wireSettings,800);
  setTimeout(wireSettings,2000);
}
})();
