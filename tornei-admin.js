/* CVI Admin - Tornei */
(function(){
"use strict";
var STATI={bozza:"Bozza",aperto:"Aperto",in_corso:"In corso",chiuso:"Chiuso"};
var torneiCache=[],gareCache=[],linksCache={};
var _tnLoading=false;
function esc(s){if(s==null)return"";return String(s).replace(/&/g,String.fromCharCode(38,97,109,112,59)).replace(/</g,String.fromCharCode(38,108,116,59)).replace(/>/g,String.fromCharCode(38,103,116,59)).replace(/"/g,String.fromCharCode(38,113,117,111,116,59));}
function notify(msg,type){if(typeof status==="function"){status(msg,type);return;}var el=document.getElementById("admin-status");if(!el)return;el.textContent=msg||"";el.className="admin-status"+(type?" "+type:"");clearTimeout(notify._t);if(msg)notify._t=setTimeout(function(){el.textContent="";el.className="admin-status";},4000);}
function panelHTML(){
return '<div class="admin-card"><h3 id="tn-form-title" style="margin:0 0 0.5rem;color:#7dd3fc">Nuovo torneo</h3>'+
'<p style="color:#94a3b8;font-size:0.88rem;margin:0 0 1rem">Crea un torneo, collega le gare e genera una classifica dedicata. Non modifica la classifica generale.</p>'+
'<form id="tn-form" class="form-grid"><input type="hidden" id="tn-id">'+
'<div><label class="adm-label" for="tn-titolo">Titolo *</label><input class="adm-input" id="tn-titolo" required style="width:100%" placeholder="Es. Campionato Primavera 2026"></div>'+
'<div><label class="adm-label" for="tn-desc">Descrizione</label><textarea class="adm-input" id="tn-desc" rows="2" style="width:100%"></textarea></div>'+
'<div style="display:flex;gap:1rem;flex-wrap:wrap">'+
'<div><label class="adm-label" for="tn-inizio">Data inizio</label><input type="date" class="adm-input" id="tn-inizio"></div>'+
'<div><label class="adm-label" for="tn-fine">Data fine</label><input type="date" class="adm-input" id="tn-fine"></div>'+
'<div><label class="adm-label" for="tn-scarti">Scarti</label><input type="number" min="0" max="20" class="adm-input" id="tn-scarti" value="0" style="width:5rem"></div>'+
'<div><label class="adm-label" for="tn-gare-prev">Gare previste</label><input type="number" min="0" max="50" class="adm-input" id="tn-gare-prev" value="0" style="width:5rem"></div>'+
'<div><label class="adm-label" for="tn-max">Max partecipanti</label><input type="number" min="0" max="500" class="adm-input" id="tn-max" value="" style="width:6rem" placeholder="illimitati"></div>'+
'</div>'+
'<div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:center">'+
'<div><label class="adm-label" for="tn-stato">Stato</label><select class="adm-select" id="tn-stato"><option value="bozza">Bozza</option><option value="aperto">Aperto</option><option value="in_corso">In corso</option><option value="chiuso">Chiuso</option></select></div>'+
'<label style="color:#e2e8f0;font-size:0.88rem;margin-top:1.2rem"><input type="checkbox" id="tn-pub"> Pubblicato</label></div>'+
'<div class="form-actions"><button type="submit" class="btn-primary" id="tn-save-btn">Salva torneo</button><button type="button" class="btn-ghost" id="tn-cancel-btn" style="display:none">Annulla</button></div></form></div>'+
'<div id="tn-gare-panel" class="admin-card" style="display:none"><h3 style="margin:0 0 0.5rem;color:#7dd3fc">Gare: <span id="tn-gare-name" style="color:#fff"></span></h3>'+
'<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 0.75rem">Seleziona le gare ufficiali del torneo.</p><div id="tn-gare-checks" style="max-height:280px;overflow:auto;margin-bottom:0.75rem"></div>'+
'<div class="form-actions"><button type="button" class="btn-primary" id="tn-gare-save">Salva gare</button><button type="button" class="btn-ghost" id="tn-gare-close">Chiudi</button>'+
'<a id="tn-public-link" href="tornei.html" target="_blank" rel="noopener" class="btn-ghost" style="text-decoration:none">Pagina pubblica</a></div><p id="tn-gare-status" style="margin:0.5rem 0 0;font-size:0.85rem"></p></div>'+
'<div id="tn-sql-hint" class="sql-hint" style="display:none">Esegui tornei-sql.sql su Supabase.</div>'+
'<div id="tn-list"><p class="loading-text">Apri questa scheda per caricare i tornei.</p></div>';
}
function ensureUI(){
  var tabs=document.querySelector(".admin-tabs"); if(!tabs) return false;
  var tab=tabs.querySelector('[data-tab="tornei"]');
  if(!tab){ tab=document.createElement("button"); tab.type="button"; tab.className="admin-tab"; tab.setAttribute("data-tab","tornei"); tab.textContent="Tornei";
    var reg=tabs.querySelector('[data-tab="regolamento"]'); var exp=tabs.querySelector('[data-tab="export"]');
    if(reg) tabs.insertBefore(tab,reg); else if(exp) tabs.insertBefore(tab,exp); else tabs.appendChild(tab);
  }
  var panel=document.getElementById("panel-tornei");
  if(!panel){ panel=document.createElement("div"); panel.id="panel-tornei"; panel.className="admin-panel";
    var before=document.getElementById("panel-regolamento")||document.getElementById("panel-export");
    var app=document.getElementById("admin-app");
    if(before&&before.parentNode) before.parentNode.insertBefore(panel,before); else if(app) app.appendChild(panel); else return false;
  }
  if(!document.getElementById("tn-form")) panel.innerHTML=panelHTML();
  return true;
}
function resetForm(){
  var id=document.getElementById("tn-id"); if(!id) return;
  id.value=""; document.getElementById("tn-titolo").value=""; document.getElementById("tn-desc").value="";
  document.getElementById("tn-inizio").value=""; document.getElementById("tn-fine").value="";
  document.getElementById("tn-scarti").value="0";
  var gp=document.getElementById("tn-gare-prev"); if(gp) gp.value="0";
  var mx=document.getElementById("tn-max"); if(mx) mx.value="";
  document.getElementById("tn-stato").value="bozza"; document.getElementById("tn-pub").checked=false;
  document.getElementById("tn-form-title").textContent="Nuovo torneo"; document.getElementById("tn-save-btn").textContent="Salva torneo";
  var c=document.getElementById("tn-cancel-btn"); if(c) c.style.display="none";
  var p=document.getElementById("tn-gare-panel"); if(p) p.style.display="none";
}
async function loadGareList(){
  try{ var r=await CVI.supabase.from("gare").select("id,titolo,data_gara,tipo").order("data_gara",{ascending:false});
    if(r.error) throw r.error;
    gareCache=(r.data||[]).filter(function(g){ return ((g.tipo||"").toLowerCase()!=="aperto"); });
  }catch(e){ gareCache=[]; }
}
async function loadLinks(torneoId){
  var r=await CVI.supabase.from("torneo_gare").select("*").eq("torneo_id",torneoId);
  if(r.error) throw r.error; linksCache[torneoId]=r.data||[]; return linksCache[torneoId];
}
async function loadTornei(){
  if(!ensureUI()) return;
  if(_tnLoading) return;
  _tnLoading=true;
  var box=document.getElementById("tn-list"), hint=document.getElementById("tn-sql-hint");
  if(!box){ _tnLoading=false; return; }
  box.innerHTML='<p class="loading-text">Caricamento...</p>';
  try{
    if(!window.CVI||!CVI.supabase) throw new Error("Supabase non disponibile");
    await loadGareList();
    var r=await CVI.supabase.from("tornei").select("*").order("created_at",{ascending:false});
    if(r.error) throw r.error; torneiCache=r.data||[]; if(hint) hint.style.display="none";
    if(!torneiCache.length){ box.innerHTML='<p class="empty-text">Nessun torneo. Creane uno con il form sopra.</p>'; return; }
    var allLinks=await CVI.supabase.from("torneo_gare").select("torneo_id,gara_id");
    var countMap={}; (allLinks.data||[]).forEach(function(l){ countMap[l.torneo_id]=(countMap[l.torneo_id]||0)+1; });
    box.innerHTML=torneiCache.map(function(t){
      var n=countMap[t.id]||0, st=STATI[t.stato]||t.stato, dates=[];
      if(t.data_inizio) dates.push(t.data_inizio); if(t.data_fine) dates.push(t.data_fine);
      return '<div class="admin-card" style="margin-bottom:0.75rem"><div class="admin-card-head"><div><strong>'+esc(t.titolo)+'</strong>'+
        '<div class="meta">'+esc(st)+(t.pubblicato?" · pubblicato":" · non pubblicato")+" · scarti "+esc(String(t.scarti!=null?t.scarti:0))+
        " · "+n+"/"+(t.gare_previste!=null?t.gare_previste:0)+" gare"+
        (t.max_partecipanti?" · max "+esc(String(t.max_partecipanti)):"")+
        (dates.length?" · "+esc(dates.join(" / ")):"")+'</div></div>'+
        '<div style="display:flex;gap:0.4rem;flex-wrap:wrap">'+
        '<button type="button" class="btn-sm tn-edit" data-id="'+esc(t.id)+'">Modifica</button>'+
        '<button type="button" class="btn-sm tn-gare" data-id="'+esc(t.id)+'">Gare</button>'+
        '<a class="btn-sm" href="tornei.html?id='+encodeURIComponent(t.id)+'" target="_blank" rel="noopener" style="text-decoration:none">Classifica</a>'+
        '<button type="button" class="btn-danger-sm tn-del" data-id="'+esc(t.id)+'">Elimina</button></div></div>'+
        (t.descrizione?'<p class="card-desc">'+esc(t.descrizione)+'</p>':'')+'</div>';
    }).join("");
    box.querySelectorAll(".tn-edit").forEach(function(b){ b.onclick=function(){
      var t=torneiCache.find(function(x){return String(x.id)===b.getAttribute("data-id");}); if(!t) return;
      document.getElementById("tn-id").value=t.id; document.getElementById("tn-titolo").value=t.titolo||"";
      document.getElementById("tn-desc").value=t.descrizione||""; document.getElementById("tn-inizio").value=t.data_inizio||"";
      document.getElementById("tn-fine").value=t.data_fine||""; document.getElementById("tn-scarti").value=String(t.scarti!=null?t.scarti:0);
      var gpe=document.getElementById("tn-gare-prev"); if(gpe) gpe.value=String(t.gare_previste!=null?t.gare_previste:0);
      var mxe=document.getElementById("tn-max"); if(mxe) mxe.value=(t.max_partecipanti!=null&&t.max_partecipanti>0)?String(t.max_partecipanti):"";
      document.getElementById("tn-stato").value=t.stato||"bozza"; document.getElementById("tn-pub").checked=!!t.pubblicato;
      document.getElementById("tn-form-title").textContent="Modifica torneo"; document.getElementById("tn-save-btn").textContent="Aggiorna";
      var c=document.getElementById("tn-cancel-btn"); if(c) c.style.display="inline-block";
      document.getElementById("tn-form").scrollIntoView({behavior:"smooth",block:"nearest"});
    };});
    box.querySelectorAll(".tn-gare").forEach(function(b){ b.onclick=function(){ openGarePanel(b.getAttribute("data-id")); };});
    box.querySelectorAll(".tn-del").forEach(function(b){ b.onclick=async function(){
      var id=b.getAttribute("data-id"); var t=torneiCache.find(function(x){return String(x.id)===id;});
      if(!confirm("Eliminare il torneo «"+(t&&t.titolo?t.titolo:"")+"»?")) return;
      try{ var del=await CVI.supabase.from("tornei").delete().eq("id",id); if(del.error) throw del.error; notify("Torneo eliminato","ok"); loadTornei(); }
      catch(err){ alert("Errore: "+(err.message||err)); }
    };});
  }catch(e){
    box.innerHTML='<p class="empty-text" style="color:#f87171">Errore: '+esc(e.message||e)+"</p>";
    if(hint){ hint.style.display="block"; hint.textContent="Esegui tornei-sql.sql nel SQL Editor di Supabase."; }
  } finally { _tnLoading=false; }
}
async function openGarePanel(torneoId){
  var t=torneiCache.find(function(x){return String(x.id)===String(torneoId);}); if(!t) return;
  var panel=document.getElementById("tn-gare-panel"); if(!panel) return;
  panel.style.display="block"; document.getElementById("tn-gare-name").textContent=t.titolo||"";
  panel.setAttribute("data-torneo-id",torneoId);
  var link=document.getElementById("tn-public-link"); if(link) link.href="tornei.html?id="+encodeURIComponent(torneoId);
  var box=document.getElementById("tn-gare-checks"); box.innerHTML='<p class="loading-text">Caricamento gare...</p>';
  try{
    if(!gareCache.length) await loadGareList();
    var links=await loadLinks(torneoId); var selected={}; links.forEach(function(l){ selected[l.gara_id]=true; });
    if(!gareCache.length){ box.innerHTML='<p class="empty-text">Nessuna gara ufficiale trovata.</p>'; return; }
    box.innerHTML=gareCache.map(function(g){
      var d=g.data_gara?String(g.data_gara).slice(0,10):"";
      var chk=selected[g.id]?" checked":"";
      return '<label style="display:flex;gap:0.5rem;padding:0.35rem 0;color:#e2e8f0;font-size:0.9rem">'
        +'<input type="checkbox" class="tn-gara-cb" value="'+esc(g.id)+'"'+chk+'>'
        +'<span><strong>'+esc(g.titolo||"Gara")+"</strong>"
        +(d?' <span style="color:#94a3b8"> - '+esc(d)+"</span>":"")
        +"</span></label>";
    }).join("");
  }catch(e){ box.innerHTML='<p style="color:#f87171">'+esc(e.message||e)+"</p>"; }
  panel.scrollIntoView({behavior:"smooth",block:"nearest"});
}
async function saveGareLinks(){
  var panel=document.getElementById("tn-gare-panel"); var torneoId=panel&&panel.getAttribute("data-torneo-id"); if(!torneoId) return;
  var st=document.getElementById("tn-gare-status"); var ids=[]; document.querySelectorAll(".tn-gara-cb:checked").forEach(function(cb){ ids.push(cb.value); });
  try{
    var del=await CVI.supabase.from("torneo_gare").delete().eq("torneo_id",torneoId); if(del.error) throw del.error;
    if(ids.length){ var rows=ids.map(function(gid,i){ return {torneo_id:torneoId,gara_id:gid,ordine:i}; });
      var ins=await CVI.supabase.from("torneo_gare").insert(rows); if(ins.error) throw ins.error; }
    if(st){ st.style.color="#34d399"; st.textContent="Salvate "+ids.length+" gare."; }
    notify("Gare collegate","ok"); loadTornei();
  }catch(e){ if(st){ st.style.color="#f87171"; st.textContent=e.message||e; } alert("Errore: "+(e.message||e)); }
}
async function saveTorneo(e){
  if(e) e.preventDefault();
  var id=(document.getElementById("tn-id")||{}).value||"";
  var titolo=((document.getElementById("tn-titolo")||{}).value||"").trim(); if(!titolo) return alert("Titolo obbligatorio");
  var desc=((document.getElementById("tn-desc")||{}).value||"").trim();
  var inizio=(document.getElementById("tn-inizio")||{}).value||null;
  var fine=(document.getElementById("tn-fine")||{}).value||null;
  var scarti=parseInt((document.getElementById("tn-scarti")||{}).value,10); if(isNaN(scarti)||scarti<0) scarti=0;
  var garePrev=parseInt((document.getElementById("tn-gare-prev")||{}).value,10); if(isNaN(garePrev)||garePrev<0) garePrev=0;
  var maxRaw=((document.getElementById("tn-max")||{}).value||"").trim();
  var maxPart=maxRaw===""?null:parseInt(maxRaw,10); if(maxPart!==null&&(isNaN(maxPart)||maxPart<=0)) maxPart=null;
  var stato=(document.getElementById("tn-stato")||{}).value||"bozza";
  var pub=!!(document.getElementById("tn-pub")||{}).checked;
  var payload={titolo:titolo,descrizione:desc||null,data_inizio:inizio||null,data_fine:fine||null,scarti:scarti,gare_previste:garePrev,max_partecipanti:maxPart,stato:stato,pubblicato:pub,updated_at:new Date().toISOString()};
  var btn=document.getElementById("tn-save-btn"); if(btn) btn.disabled=true;
  try{
    var r; if(id) r=await CVI.supabase.from("tornei").update(payload).eq("id",id); else r=await CVI.supabase.from("tornei").insert(payload);
    if(r.error) throw r.error; notify(id?"Torneo aggiornato":"Torneo creato","ok"); resetForm(); loadTornei();
  }catch(err){
    notify(err.message||err,"err");
    var hint=document.getElementById("tn-sql-hint");
    if(hint){ hint.style.display="block"; hint.textContent="Errore: "+(err.message||err)+" — esegui tornei-sql.sql su Supabase."; }
    alert("Errore salvataggio: "+(err.message||err));
  }finally{ if(btn) btn.disabled=false; }
}
function wire(){
  if(!ensureUI()) return;
  var form=document.getElementById("tn-form"); if(form&&!form._wired){ form._wired=true; form.onsubmit=saveTorneo; }
  var cancel=document.getElementById("tn-cancel-btn"); if(cancel&&!cancel._wired){ cancel._wired=true; cancel.onclick=resetForm; }
  var gs=document.getElementById("tn-gare-save"); if(gs&&!gs._wired){ gs._wired=true; gs.onclick=saveGareLinks; }
  var gc=document.getElementById("tn-gare-close"); if(gc&&!gc._wired){ gc._wired=true; gc.onclick=function(){ var p=document.getElementById("tn-gare-panel"); if(p) p.style.display="none"; }; }
  document.querySelectorAll('.admin-tab[data-tab="tornei"]').forEach(function(tab){
    if(tab._tnWired) return; tab._tnWired=true;
    tab.addEventListener("click",function(){ setTimeout(loadTornei,50); },true);
  });
}
function isActive(){ var p=document.getElementById("panel-tornei"); var t=document.querySelector('.admin-tab[data-tab="tornei"]'); return (p&&p.classList.contains("active"))||(t&&t.classList.contains("active")); }
function boot(){
  wire();
  setTimeout(wire, 600);
  setTimeout(wire, 2000);
  var tries = 0;
  function tryOnce(){
    tries++;
    if (isActive()) { loadTornei(); return; }
    if (tries < 3) setTimeout(tryOnce, 800);
  }
  setTimeout(tryOnce, 400);
}
window.loadTorneiAdmin=loadTornei;
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
