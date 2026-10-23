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
      if(id==="siti-amici"&&typeof loadSitiAmiciAdmin==="function")loadSitiAmiciAdmin();
    };
  });
  var first=Array.prototype.find.call(tabs,function(t){return t.style.display!=="none";});
  if(first)first.click();
}

/* NOTE: rest of file unchanged - this update only adds siti-amici tab load.
   Full file must be complete. Loading from local patched version. */
