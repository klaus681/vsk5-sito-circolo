/* CVI Admin – impostazioni sito (video home, banner hero, stats) */
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
  var existing=await CVI.supabase.from("site_settings").select("key").eq("key",key).maybeSingle();
  if(existing.data){
    return CVI.supabase.from("site_settings").update({value:value,updated_at:new Date().toISOString()}).eq("key",key);
  }
  return CVI.supabase.from("site_settings").insert({key:key,value:value});
}

window.loadSettings=async function loadSettings(){
  var input=document.getElementById("set-youtube");
  var hint=document.getElementById("set-sql-hint");
  try{
    var allKeys=["home_youtube"].concat(ALL_SETTING_KEYS);
    var res=await CVI.supabase.from("site_settings").select("key,value").in("key",allKeys);
    if(res.error)throw res.error;
    if(hint)hint.style.display="none";
    var map={};
    (res.data||[]).forEach(function(r){ if(r&&r.key) map[r.key]=r.value||""; });
    if(input){
      input.value=map.home_youtube||"";
      updatePreview(map.home_youtube||"");
    }
    ALL_SETTING_KEYS.forEach(function(k){
      var el=document.getElementById("set-"+k);
      if(el) el.value=map[k]||"";
    });
  }catch(e){
    if(hint)hint.style.display="block";
    notify(e.message||String(e),"err");
  }
};

function updatePreview(raw){
  var preview=document.getElementById("set-youtube-preview");
  if(!preview)return;
  var id=extractYoutubeId(raw);
  if(!id){
    preview.innerHTML='<p class="empty-text" style="color:#94a3b8;margin:0">Inserisci un URL o ID YouTube per vedere l\'anteprima.</p>';
    return;
  }
  preview.innerHTML='<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;border:1px solid rgba(255,255,255,0.1)">'+ 
    '<iframe src="https://www.youtube.com/embed/'+esc(id)+'" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen title="Anteprima"></iframe></div>'+
    '<p style="color:#94a3b8;font-size:0.8rem;margin:0.5rem 0 0">ID: <code style="color:#7dd3fc">'+esc(id)+'</code></p>';
}

async function saveYoutube(e){
  if(e)e.preventDefault();
  var input=document.getElementById("set-youtube");
  if(!input)return;
  var raw=input.value.trim();
  var id=extractYoutubeId(raw);
  if(raw&&!id){alert("URL o ID YouTube non valido");return;}
  var value=id||"";
  var btn=document.getElementById("set-save-btn");
  if(btn)btn.disabled=true;
  try{
    var r=await upsertSetting("home_youtube",value);
    if(r.error)throw r.error;
    input.value=value?("https://www.youtube.com/watch?v="+value):"";
    updatePreview(value);
    notify(value?"Video aggiornato":"Video rimosso (default)","ok");
  }catch(err){
    notify(err.message||String(err),"err");
    var hint=document.getElementById("set-sql-hint");
    if(hint)hint.style.display="block";
  }finally{if(btn)btn.disabled=false;}
}

async function saveHero(e){
  if(e)e.preventDefault();
  var btn=document.getElementById("set-hero-save-btn");
  if(btn)btn.disabled=true;
  try{
    for(var i=0;i<HERO_KEYS.length;i++){
      var k=HERO_KEYS[i];
      var el=document.getElementById("set-"+k);
      var val=el?el.value.trim():"";
      var r=await upsertSetting(k,val);
      if(r.error)throw r.error;
    }
    notify("Banner home aggiornato","ok");
  }catch(err){
    notify(err.message||String(err),"err");
    var hint=document.getElementById("set-sql-hint");
    if(hint)hint.style.display="block";
  }finally{if(btn)btn.disabled=false;}
}

async function saveStats(e){
  if(e)e.preventDefault();
  var btn=document.getElementById("set-stats-save-btn");
  if(btn)btn.disabled=true;
  try{
    for(var i=0;i<STAT_KEYS.length;i++){
      var k=STAT_KEYS[i];
      var el=document.getElementById("set-"+k);
      var val=el?el.value.trim():"";
      var r=await upsertSetting(k,val);
      if(r.error)throw r.error;
    }
    notify("Statistiche home aggiornate","ok");
  }catch(err){
    notify(err.message||String(err),"err");
    var hint=document.getElementById("set-sql-hint");
    if(hint)hint.style.display="block";
  }finally{if(btn)btn.disabled=false;}
}

function wireSettingsUI(){
  var form=document.getElementById("settings-form");
  if(form&&!form._wired){form._wired=true;form.onsubmit=saveYoutube;}
  var heroForm=document.getElementById("settings-hero-form");
  if(heroForm&&!heroForm._wired){heroForm._wired=true;heroForm.onsubmit=saveHero;}
  var statsForm=document.getElementById("settings-stats-form");
  if(statsForm&&!statsForm._wired){statsForm._wired=true;statsForm.onsubmit=saveStats;}
  var input=document.getElementById("set-youtube");
  if(input&&!input._wired){
    input._wired=true;
    input.addEventListener("input",function(){updatePreview(input.value);});
  }
  document.querySelectorAll('.admin-tab[data-tab="impostazioni"]').forEach(function(tab){
    if(tab._setWired)return;
    tab._setWired=true;
    tab.addEventListener("click",function(){
      setTimeout(function(){loadSettings();},80);
    });
  });
}

function tryWire(){
  if(!document.getElementById("settings-form")&&!document.getElementById("settings-hero-form"))return;
  wireSettingsUI();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(tryWire,800);});
else setTimeout(tryWire,800);
setTimeout(tryWire,2000);
setTimeout(tryWire,4000);
})();
