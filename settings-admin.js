/* CVI Admin – impostazioni sito (video home, ecc.) */
(function(){
"use strict";

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

window.loadSettings=async function loadSettings(){
  var input=document.getElementById("set-youtube");
  var preview=document.getElementById("set-youtube-preview");
  var hint=document.getElementById("set-sql-hint");
  if(!input)return;
  try{
    var res=await CVI.supabase.from("site_settings").select("key,value").eq("key","home_youtube").maybeSingle();
    if(res.error)throw res.error;
    if(hint)hint.style.display="none";
    var val=(res.data&&res.data.value)||"";
    input.value=val;
    updatePreview(val);
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

async function saveSettings(e){
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
    var existing=await CVI.supabase.from("site_settings").select("key").eq("key","home_youtube").maybeSingle();
    var r;
    if(existing.data){
      r=await CVI.supabase.from("site_settings").update({value:value,updated_at:new Date().toISOString()}).eq("key","home_youtube");
    }else{
      r=await CVI.supabase.from("site_settings").insert({key:"home_youtube",value:value});
    }
    if(r.error)throw r.error;
    input.value=value?("https://www.youtube.com/watch?v="+value):"";
    updatePreview(value);
    notify(value?"Video aggiornato":"Video rimosso (verrà usato il default)","ok");
  }catch(err){
    notify(err.message||String(err),"err");
    var hint=document.getElementById("set-sql-hint");
    if(hint)hint.style.display="block";
  }finally{if(btn)btn.disabled=false;}
}

function wireSettingsUI(){
  var form=document.getElementById("settings-form");
  if(form&&!form._wired){form._wired=true;form.onsubmit=saveSettings;}
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
  if(!document.getElementById("settings-form"))return;
  wireSettingsUI();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(tryWire,800);});
else setTimeout(tryWire,800);
setTimeout(tryWire,2000);
setTimeout(tryWire,4000);
})();
