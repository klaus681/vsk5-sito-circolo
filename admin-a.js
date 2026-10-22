/* CVI Admin Panel */
(function(){
"use strict";
var ROLES=["admin","scorer","caposquadra","socio"];
var RL={admin:"Admin",scorer:"Scorer",caposquadra:"Caposquadra",socio:"Socio"};
var user=null,role="socio",teams=[],profiles=[],gare=[],avvisi=[],gallery=[],risultati=[],iscrizioni=[],cacheIscrittiAdmin={},garaPasswords={},garaPasswordMissing=false;

function esc(s){if(s==null)return"";return String(s).replace(/&/g,"&"+"amp;").replace(/</g,"&"+"lt;").replace(/>/g,"&"+"gt;").replace(/"/g,"&"+"quot;");}
function resolveRole(p){if(!p)return"socio";var r=String(p.role||"").toLowerCase();if(ROLES.indexOf(r)>=0)return r;return p.is_admin===true?"admin":"socio";}
function can(r,f){if(f==="members"||f==="avvisi"||f==="gallery"||f==="roles"||f==="team")return r==="admin";return r==="admin"||r==="scorer";}
function status(m,t){var el=document.getElementById("admin-status");if(!el)return;el.textContent=m||"";el.className="admin-status"+(t?" "+t:"");clearTimeout(status._t);if(m)status._t=setTimeout(function(){el.textContent="";el.className="admin-status";},4000);}
function setGate(mode,detail){var g=document.getElementById("admin-gate"),a=document.getElementById("admin-app");if(!g||!a)return;if(mode==="ok"){g.style.display="none";a.style.display="block";return;}g.style.display="block";a.style.display="none";var t=document.getElementById("gate-title"),x=document.getElementById("gate-text");if(mode==="login"){if(t)t.textContent="Accesso richiesto";if(x)x.textContent="Devi effettuare il login per accedere al pannello.";}else{if(t)t.textContent="Accesso negato";if(x)x.textContent=detail||"Serve ruolo Admin o Scorer.";}}
function profileLabel(p){if(!p)return"?";var n=(p.nickname||"").trim(),nm=[p.nome,p.cognome].filter(Boolean).join(" ");return n&&nm?n+" ("+nm+")":n||nm||String(p.id).slice(0,8);}
function fmt(iso){if(!iso)return"—";try{return new Date(iso).toLocaleString("it-IT",{weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(e){return String(iso);}}
function toLocal(iso){if(!iso)return"";var d=new Date(iso);if(isNaN(d.getTime()))return"";function p(n){return String(n).padStart(2,"0");}return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes());}
function isMissingTable(err){return /does not exist|schema cache|relation .* does not exist|42P01/i.test((err&&err.message)||"");}
function updateGaraPasswordWarning(){var el=document.getElementById("admin-password-warning");if(!el)return;el.style.display=garaPasswordMissing?"block":"none";}
async function saveGaraPassword(garaId,pwd){
  try{
    if(!pwd){
      var del=await CVI.supabase.from("gare_password").delete().eq("gara_id",garaId);
      return del.error?(isMissingTable(del.error)?{ok:false,missing:true}:{ok:false,error:del.error}):{ok:true};
    }
    var up=await CVI.supabase.from("gare_password").upsert({gara_id:garaId,password:pwd},{onConflict:"gara_id"});
    return up.error?(isMissingTable(up.error)?{ok:false,missing:true}:{ok:false,error:up.error}):{ok:true};
  }catch(e){return{ok:false,error:e};}
}

async function loadSession(){
  if(!window.CVI||!CVI.supabase){setGate("login");return false;}
  var res=await CVI.supabase.auth.getSession();
  var session=res.data&&res.data.session;
  if(!session||!session.user){setGate("login");return false;}
  user=session.user;
  var pr=await CVI.supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
  role=resolveRole(pr.data);
  if(!can(role,"admin")){setGate("denied","Ruolo attuale: "+(RL[role]||role));return false;}
  setGate("ok");
  var b=document.getElementById("admin-role-badge");if(b)b.textContent=RL[role]||role;
  var w=document.getElementById("admin-who");if(w)w.textContent=(pr.data&&(pr.data.nickname||pr.data.nome))||user.email||"Admin";
  return true;
}

function initTabs(){
  var tabs=document.querySelectorAll(".admin-tab"),panels=document.querySelectorAll(".admin-panel");
  tabs.forEach(function(tab){
    var id=tab.getAttribute("data-tab");
    if(id==="soci"&&!can(role,"members"))tab.style.display="none";
    if(id==="team"&&!can(role,"team"))tab.style.display="none";
    if((id==="avvisi"||id==="galleria")&&!can(role,"avvisi"))tab.style.display="none";
    if((id==="gare"||id==="risultati"||id==="export")&&!can(role,"admin"))tab.style.display="none";
    tab.onclick=function(){
      tabs.forEach(function(t){t.classList.remove("active");});
      panels.forEach(function(p){p.classList.remove("active");});
      tab.classList.add("active");
      var p=document.getElementById("panel-"+id);if(p)p.classList.add("active");
      if(id==="soci")loadSoci();
      if(id==="team"&&typeof loadTeamsAdmin==="function")loadTeamsAdmin();
      if(id==="gare")loadGare();
      if(id==="risultati")loadRis();
      if(id==="avvisi")loadAvvisi();
      if(id==="galleria")loadGal();
      if(id==="export")prepExport();
    };
  });
  var first=Array.prototype.find.call(tabs,function(t){return t.style.display!=="none";});
  if(first)first.click();
}

async function loadSoci(){
  var box=document.getElementById("soci-table-wrap");
  box.innerHTML='<p class="loading-text">Caricamento…</p>';
  try{
    var tr=await CVI.supabase.from("teams").select("*");
    var pr=await CVI.supabase.from("profiles").select("*");
    teams=tr.data||[];profiles=pr.data||[];
    var names=teams.map(function(t){return(t.nome_team||t.nome||"").trim();}).filter(Boolean).sort(function(a,b){return a.localeCompare(b,"it");});
    var q=((document.getElementById("soci-search")||{}).value||"").toLowerCase();
    var rows=profiles.slice();
    if(q)rows=rows.filter(function(p){return[p.nickname,p.nome,p.cognome,p.team,p.role].join(" ").toLowerCase().indexOf(q)>=0;});
    rows.sort(function(a,b){return profileLabel(a).localeCompare(profileLabel(b),"it");});
    var c=document.getElementById("soci-count");if(c)c.textContent=profiles.length+" soci";
    var h='<table class="admin-table"><thead><tr><th>Nickname</th><th>Nome</th><th>Team</th><th>Ruolo</th><th>Azioni</th></tr></thead><tbody>';
    rows.forEach(function(p){
      var r=resolveRole(p),self=user&&String(p.id)===String(user.id);
      var to=names.map(function(n){return'<option value="'+esc(n)+'"'+((p.team||"").toLowerCase()===n.toLowerCase()?" selected":"")+'>'+esc(n)+'</option>';}).join("");
      var ro=ROLES.map(function(x){return'<option value="'+x+'"'+(r===x?" selected":"")+'>'+RL[x]+'</option>';}).join("");
      h+='<tr><td><strong>'+esc(p.nickname||"—")+'</strong>'+(self?' <span class="tag-you">tu</span>':'')+'</td><td>'+esc([p.nome,p.cognome].filter(Boolean).join(" ")||"—")+'</td><td><select class="adm-select soci-team" data-uid="'+esc(p.id)+'"><option value="">—</option>'+to+'</select></td><td><select class="adm-select soci-role" data-uid="'+esc(p.id)+'"'+(can(role,"roles")?"":" disabled")+'>'+ro+'</select></td><td>'+(self?"—":'<button type="button" class="btn-danger-sm soci-expel" data-uid="'+esc(p.id)+'" data-nick="'+esc(p.nickname||"")+'">Espelli</button>')+'</td></tr>';
    });
    h+='</tbody></table>';box.innerHTML=h;
    box.querySelectorAll(".soci-team").forEach(function(sel){sel.onchange=async function(){sel.disabled=true;var r=await CVI.supabase.from("profiles").update({team:sel.value||null}).eq("id",sel.getAttribute("data-uid"));sel.disabled=false;if(r.error)status(r.error.message,"err");else status("Team aggiornato","ok");};});
    box.querySelectorAll(".soci-role").forEach(function(sel){sel.onchange=async function(){if(!can(role,"roles"))return;sel.disabled=true;var v=sel.value,ia=v==="admin";var r=await CVI.supabase.from("profiles").update({role:v,is_admin:ia}).eq("id",sel.getAttribute("data-uid"));if(r.error){var r2=await CVI.supabase.from("profiles").update({is_admin:ia}).eq("id",sel.getAttribute("data-uid"));r=r2;}sel.disabled=false;if(r.error)status(r.error.message,"err");else status("Ruolo: "+RL[v],"ok");};});
    box.querySelectorAll(".soci-expel").forEach(function(btn){btn.onclick=async function(){var uid=btn.getAttribute("data-uid"),nick=btn.getAttribute("data-nick");if(user&&String(uid)===String(user.id))return alert("Non puoi espellere te stesso.");if(!confirm("Espellere «"+nick+"»?"))return;try{await CVI.supabase.from("iscrizioni_gare").delete().eq("user_id",uid);}catch(e){}var r=await CVI.supabase.from("profiles").delete().eq("id",uid);if(r.error)await CVI.supabase.from("profiles").update({team:null,is_admin:false,nickname:(nick||"")+" (espulso)"}).eq("id",uid);status("Espulso","ok");loadSoci();};});
  }catch(e){box.innerHTML='<p class="empty-text" style="color:#f87171">'+esc(e.message||e)+'</p>';}
}

function injectTipoField(){
  if(document.getElementById("gara-tipo"))return;
  var num=document.getElementById("gara-num");
  if(!num)return;
  var wrap=document.createElement("div");
  wrap.innerHTML='<label class="adm-label" for="gara-tipo">Tipo gara</label>'+
    '<select class="adm-select" id="gara-tipo" style="width:100%;max-width:28rem">'+
    '<option value="ufficiale">Ufficiale (soci) – iscrizione + classifica</option>'+
    '<option value="speciale">Speciale – iscrizione + classifica</option>'+
    '<option value="aperto">Evento aperto – no iscrizione, no classifica</option>'+
    '</select>';
  var parent=num.closest("div")||num.parentNode;
  if(parent&&parent.parentNode)parent.parentNode.insertBefore(wrap, parent.nextSibling);
  else if(parent)parent.appendChild(wrap);
}

function injectMaxField(){
  if(document.getElementById("gara-max"))return;
  var anchor=document.getElementById("gara-tipo");
  var num=document.getElementById("gara-num");
  var ref=anchor?anchor.closest("div"):(num?num.closest("div"):null);
  if(!ref)return;
  var wrap=document.createElement("div");
  wrap.innerHTML='<label class="adm-label" for="gara-max">Numero massimo iscritti (vuoto = illimitato)</label>'+
    '<input type="number" min="1" step="1" class="adm-input" id="gara-max" placeholder="es. 20" style="width:8rem">';
  if(ref.parentNode)ref.parentNode.insertBefore(wrap, ref.nextSibling);
}

function meteoVisibleChecked(){var el=document.getElementById("gara-meteo-visibile");return el?!!el.checked:true}
function renderMeteoAdmin(values){var box=document.getElementById("gara-meteo-fields");if(!box||!window.CVIMeteo)return;var count=Math.min(3,Math.max(1,parseInt((document.getElementById("gara-num")||{}).value,10)||1));CVIMeteo.renderAdmin(box,values,count)}
function readMeteoAdmin(){var box=document.getElementById("gara-meteo-fields");if(!box||!window.CVIMeteo)return null;return CVIMeteo.readAdminFields(box,meteoVisibleChecked())}
function resetGara(){injectTipoField();injectMaxField();document.getElementById("gara-id").value="";document.getElementById("gara-titolo").value="";document.getElementById("gara-data").value="";document.getElementById("gara-desc").value="";document.getElementById("gara-num").value="1";var tipoEl=document.getElementById("gara-tipo");if(tipoEl)tipoEl.value="ufficiale";var ch=document.getElementById("gara-chiusura");if(ch)ch.value="2";var mx=document.getElementById("gara-max");if(mx)mx.value="";var pw=document.getElementById("gara-password");if(pw)pw.value="";var mv=document.getElementById("gara-meteo-visibile");if(mv)mv.checked=true;renderMeteoAdmin(null);document.getElementById("gara-form-title").textContent="Nuova gara";document.getElementById("gara-save-btn").textContent="Salva gara";document.getElementById("gara-cancel-btn").style.display="none";}

async function loadGare(){
  injectTipoField();
  injectMaxField();
  var box=document.getElementById("gare-list");box.innerHTML='<p class="loading-text">…</p>';
  try{
    var res=await CVI.supabase.from("gare").select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore,tipo,max_iscritti,meteo").order("data_gara",{ascending:false});
    if(res.error){
      res=await CVI.supabase.from("gare").select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore,tipo,max_iscritti").order("data_gara",{ascending:false});
    }
    if(res.error){
      res=await CVI.supabase.from("gare").select("id,titolo,descrizione,data_gara,num_regate,chiusura_ore").order("data_gara",{ascending:false});
    }
    if(res.error)throw res.error;gare=res.data||[];
    garaPasswords={};garaPasswordMissing=false;
    try{
      var pwdRes=await CVI.supabase.from("gare_password").select("gara_id,password");
      if(!pwdRes.error){(pwdRes.data||[]).forEach(function(r){var v=String(r.password||"").trim();if(v)garaPasswords[String(r.gara_id)]=v;});}
      else{garaPasswordMissing=isMissingTable(pwdRes.error);if(!garaPasswordMissing)console.warn("gare_password:",pwdRes.error.message);}
    }catch(e){console.warn("gare_password:",e&&e.message);}
    var iscrRes=await CVI.supabase.from("iscrizioni_gare").select("gara_id,user_id");
    var profRes=await CVI.supabase.from("profiles").select("id,nickname,team,nome,cognome");
    iscrizioni=iscrRes.data||[];
    var profs=profRes.data||[];
    var byId={};profs.forEach(function(p){byId[String(p.id)]=p;});
    cacheIscrittiAdmin={};
    iscrizioni.forEach(function(row){
      var gid=String(row.gara_id),uid=String(row.user_id);
      if(!cacheIscrittiAdmin[gid])cacheIscrittiAdmin[gid]=[];
      var p=byId[uid]||{nickname:uid.slice(0,8),team:""};
      if(!cacheIscrittiAdmin[gid].some(function(x){return String(x.id)===uid;}))
        cacheIscrittiAdmin[gid].push({id:uid,nickname:p.nickname||"",team:p.team||"",nome:p.nome||"",cognome:p.cognome||""});
    });
    var now=Date.now();
    box.innerHTML=gare.length?gare.map(function(g){
      var past=g.data_gara&&new Date(g.data_gara)<now;
      var nr=Math.min(3,Math.max(1,parseInt(g.num_regate,10)||1));
      var chOre=g.chiusura_ore!=null?parseInt(g.chiusura_ore,10):2;if(isNaN(chOre)||chOre<0)chOre=2;
      var tipoLab=(function(t){t=(t||"ufficiale").toLowerCase();return t==="aperto"?"Aperto":(t==="speciale"?"Speciale":"Ufficiale");})(g.tipo);
      var list=cacheIscrittiAdmin[String(g.id)]||[];
      var cap=g.max_iscritti!=null?parseInt(g.max_iscritti,10):null;if(cap!=null&&(isNaN(cap)||cap<1))cap=null;
      var nicks=list.slice(0,12).map(function(p){var label=esc(p.nickname||p.nome||'?');if(p.team)label+=' ('+esc(p.team)+')';return label;}).join(', ');
      if(list.length>12)nicks+=" … +"+(list.length-12);
      var iscrBlock='<div style="margin-top:.65rem;padding-top:.55rem;border-top:1px solid rgba(255,255,255,.06)"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:.35rem"><span style="font-size:.8rem;color:#94a3b8;font-weight:600">Iscritti: <strong style="color:#7dd3fc">'+list.length+(cap!=null?(' / '+cap):'')+'</strong>'+(cap!=null&&list.length>=cap?' <span style="display:inline-block;background:rgba(248,113,113,.15);color:#f87171;font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:999px;text-transform:uppercase;letter-spacing:.04em">Al completo</span>':'')+'</span>'+(list.length?'<button type="button" class="btn-sm gara-dl-iscr" data-id="'+esc(g.id)+'">⬇ CSV iscritti</button>':'')+'</div>'+(list.length?'<div style="font-size:.82rem;color:#cbd5e1;line-height:1.45">'+nicks+'</div>':'<div style="font-size:.82rem;color:#64748b">Nessun iscritto</div>')+'</div>';
      return'<div class="admin-card'+(past?" is-past":"")+'"><div class="admin-card-head"><div><strong>'+esc(g.titolo)+'</strong><div class="meta">'+esc(fmt(g.data_gara))+' · '+nr+' regate · '+tipoLab+' · iscr. -'+chOre+'h'+(past?" · conclusa":"")+((window.CVIMeteo&&CVIMeteo.has(g))?" · 🌤 meteo":"")+(garaPasswords[String(g.id)]?" · 🔑 password":"")+'</div></div><div class="admin-card-actions"><button type="button" class="btn-sm gara-edit" data-id="'+esc(g.id)+'">Modifica</button><button type="button" class="btn-danger-sm gara-del" data-id="'+esc(g.id)+'">Elimina</button></div></div>'+(g.descrizione?'<p class="card-desc">'+esc(g.descrizione)+'</p>':'')+iscrBlock+'</div>';
    }).join(""):'<p class="empty-text">Nessuna gara.</p>';
    box.querySelectorAll(".gara-edit").forEach(function(b){b.onclick=function(){injectTipoField();injectMaxField();var g=gare.find(function(x){return String(x.id)===b.getAttribute("data-id");});if(!g)return;document.getElementById("gara-id").value=g.id;document.getElementById("gara-titolo").value=g.titolo||"";document.getElementById("gara-data").value=toLocal(g.data_gara);document.getElementById("gara-desc").value=g.descrizione||"";document.getElementById("gara-num").value=String(Math.min(3,Math.max(1,parseInt(g.num_regate,10)||1)));var tipoEl=document.getElementById("gara-tipo");if(tipoEl)tipoEl.value=(g.tipo||"ufficiale");var chEl=document.getElementById("gara-chiusura");if(chEl){var cv=g.chiusura_ore!=null?parseInt(g.chiusura_ore,10):2;chEl.value=String(isNaN(cv)?2:cv);}var mxEl=document.getElementById("gara-max");if(mxEl)mxEl.value=(g.max_iscritti!=null?String(g.max_iscritti):"");var pwEl=document.getElementById("gara-password");if(pwEl)pwEl.value=garaPasswords[String(g.id)]||"";var mvEl=document.getElementById("gara-meteo-visibile");if(mvEl)mvEl.checked=!(g.meteo&&g.meteo.visibile===false);renderMeteoAdmin(g.meteo);document.getElementById("gara-form-title").textContent="Modifica gara";document.getElementById("gara-save-btn").textContent="Aggiorna";document.getElementById("gara-cancel-btn").style.display="inline-block";};});
    box.querySelectorAll(".gara-del").forEach(function(b){b.onclick=async function(){if(!confirm("Eliminare?"))return;await CVI.supabase.from("gare").delete().eq("id",b.getAttribute("data-id"));status("Eliminata","ok");loadGare();};});
    box.querySelectorAll(".gara-dl-iscr").forEach(function(b){b.onclick=function(){downloadIscrittiAdmin(b.getAttribute("data-id"));};});
    fillGaraSel();
    updateGaraPasswordWarning();
  }catch(e){box.innerHTML='<p style="color:#f87171">'+esc(e.message)+'</p>';}
}

function downloadIscrittiAdmin(garaId){
  var list=cacheIscrittiAdmin[String(garaId)]||[];
  if(!list.length){alert("Nessun iscritto");return;}
  var g=gare.find(function(x){return String(x.id)===String(garaId);});
  var titolo=g&&g.titolo?g.titolo:"gara";
  var lines=["N;Nickname;Nome;Cognome;Team"];
  list.forEach(function(p,i){
    lines.push([i+1,'"'+String(p.nickname||"").replace(/"/g,'""')+'"','"'+String(p.nome||"").replace(/"/g,'""')+'"','"'+String(p.cognome||"").replace(/"/g,'""')+'"','"'+String(p.team||"").replace(/"/g,'""')+'"'].join(";"));
  });
  var safe=String(titolo).replace(/[^\w\-]+/g,"_").slice(0,40);
  var blob=new Blob(["\uFEFF"+lines.join("\n")],{type:"text/csv;charset=utf-8;"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="iscritti-"+safe+".csv";a.click();
  status("CSV iscritti scaricato","ok");
}

async function saveGara(e){
  e.preventDefault();
  injectTipoField();
  var id=document.getElementById("gara-id").value.trim(),titolo=document.getElementById("gara-titolo").value.trim(),dl=document.getElementById("gara-data").value,desc=document.getElementById("gara-desc").value.trim(),nr=Math.min(3,Math.max(1,parseInt(document.getElementById("gara-num").value,10)||1));
  var chEl=document.getElementById("gara-chiusura");var chiusura_ore=chEl?parseInt(chEl.value,10):2;if(isNaN(chiusura_ore)||chiusura_ore<0)chiusura_ore=2;if(chiusura_ore>168)chiusura_ore=168;
  var mxEl=document.getElementById("gara-max");var max_iscritti=(mxEl&&mxEl.value.trim()!=="")?parseInt(mxEl.value,10):null;if(max_iscritti!=null&&(isNaN(max_iscritti)||max_iscritti<1))max_iscritti=null;
  var pwdEl=document.getElementById("gara-password");var password=(pwdEl&&pwdEl.value||"").trim();
  if(!titolo||!dl)return alert("Titolo e data obbligatori");
  var tipoEl=document.getElementById("gara-tipo");var tipo=(tipoEl&&tipoEl.value)||"ufficiale";if(["ufficiale","speciale","aperto"].indexOf(tipo)<0)tipo="ufficiale";
  var meteo=readMeteoAdmin();
  var payload={titolo:titolo,descrizione:desc||null,data_gara:new Date(dl).toISOString(),num_regate:nr,chiusura_ore:chiusura_ore,tipo:tipo,max_iscritti:max_iscritti};
  if(meteo)payload.meteo=meteo;
  var btn=document.getElementById("gara-save-btn");btn.disabled=true;
  try{
    var res=id?await CVI.supabase.from("gare").update(payload).eq("id",id):await CVI.supabase.from("gare").insert(payload).select("id").single();
    if(res&&res.error&&meteo&&/meteo/i.test(res.error.message||"")){
      delete payload.meteo;
      res=id?await CVI.supabase.from("gare").update(payload).eq("id",id):await CVI.supabase.from("gare").insert(payload).select("id").single();
      if(res&&!res.error)alert("Gara salvata senza meteo: esegui gare-meteo-sql.sql su Supabase per attivare il campo.");
    }
    if(res&&res.error)throw res.error;
    var savedId=id||(res.data&&res.data.id),pwdNotice="";
    if(savedId){
      var pr=await saveGaraPassword(String(savedId),password);
      if(pr.ok){if(password)garaPasswords[String(savedId)]=password;else delete garaPasswords[String(savedId)];}
      else{pwdNotice=pr.missing?"Esegui gare-password-sql.sql su Supabase per attivare la password server.":("Password non salvata: "+((pr.error&&pr.error.message)||"errore"));}
    }
    status((id?"Aggiornata":"Creata")+(pwdNotice?" · password non salvata":""),"ok");
    if(pwdNotice)alert(pwdNotice);
    resetGara();loadGare();
  }catch(err){alert(err.message||err);}finally{btn.disabled=false;}
}

function initMeteoAdmin(){
  var num=document.getElementById("gara-num");
  var box=document.getElementById("gara-meteo-fields");
  if(num&&!num._cviMeteoWired){num._cviMeteoWired=true;num.addEventListener("change",function(){renderMeteoAdmin(readMeteoAdmin());});}
  if(box&&!box._cviMeteoInit&&window.CVIMeteo){box._cviMeteoInit=true;CVIMeteo.renderAdmin(box,null,Math.min(3,Math.max(1,parseInt((num||{}).value,10)||1)));}
}
initMeteoAdmin();setTimeout(initMeteoAdmin,800);

function fillGaraSel(){var sel=document.getElementById("ris-gara-select");if(!sel)return;sel.innerHTML='<option value="">— seleziona —</option>'+gare.map(function(g){return'<option value="'+esc(g.id)+'">'+esc(g.titolo)+' · '+esc(fmt(g.data_gara))+'</option>';}).join("");}

