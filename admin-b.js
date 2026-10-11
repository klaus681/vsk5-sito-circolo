async function loadRis(){
  if(!gare.length)await loadGare();else fillGaraSel();
  var ris=await CVI.supabase.from("risultati_gara").select("*");
  var prof=await CVI.supabase.from("profiles").select("id,nickname,team,nome,cognome,is_admin,role");
  var isc=await CVI.supabase.from("iscrizioni_gare").select("*");
  risultati=ris.data||[];profiles=prof.data||profiles;iscrizioni=isc.data||[];
  document.getElementById("ris-form-wrap").innerHTML='<p class="empty-text">Seleziona una gara.</p>';
}

function loadFormRis(garaId){
  var wrap=document.getElementById("ris-form-wrap");
  var gara=gare.find(function(g){return String(g.id)===String(garaId);});
  if(!gara){wrap.innerHTML='<p class="empty-text">Gara non trovata</p>';return;}
  var nr=Math.min(3,Math.max(1,parseInt(gara.num_regate,10)||1));
  var uids=iscrizioni.filter(function(i){return String(i.gara_id)===String(garaId);}).map(function(i){return String(i.user_id);});
  risultati.filter(function(r){return String(r.gara_id)===String(garaId);}).forEach(function(r){if(uids.indexOf(String(r.user_id))<0)uids.push(String(r.user_id));});
  var users=uids.map(function(id){return profiles.find(function(p){return String(p.id)===id;});}).filter(Boolean);
  if(!users.length)users=profiles.slice();
  users.sort(function(a,b){return profileLabel(a).localeCompare(profileLabel(b),"it");});
  var existing={};risultati.filter(function(r){return String(r.gara_id)===String(garaId);}).forEach(function(r){existing[String(r.user_id)+"#"+String(r.regata_num||1)]=r;});
  var n=users.length,h='<div class="ris-meta"><strong>'+esc(gara.titolo)+'</strong> · '+n+' skipper</div>';
  for(var i=1;i<=nr;i++){
    h+='<form class="form-resultati" data-regata="'+i+'"><h4>Regata '+i+'</h4><table class="admin-table compact"><thead><tr><th>Skipper</th><th>Pos.</th><th>Stato</th></tr></thead><tbody>';
    users.forEach(function(u){var prev=existing[String(u.id)+"#"+i];var pos=prev&&prev.posizione!=null?prev.posizione:"";var st=(prev&&prev.stato)||"ok";h+='<tr class="result-row" data-user-id="'+esc(u.id)+'"><td>'+esc(profileLabel(u))+'</td><td><input type="number" min="1" class="input-pos adm-input-sm" value="'+esc(pos)+'"></td><td><select class="input-stato adm-select"><option value="ok"'+(st==="ok"?" selected":"")+'>OK</option><option value="dnf"'+(st==="dnf"?" selected":"")+'>DNF</option><option value="dsq"'+(st==="dsq"?" selected":"")+'>DSQ</option><option value="dns"'+(st==="dns"?" selected":"")+'>DNS</option><option value="dnc"'+(st==="dnc"?" selected":"")+'>DNC</option></select></td></tr>';});
    h+='</tbody></table></form>';
  }
  h+='<div class="form-actions"><button type="button" class="btn-primary" id="btn-save-risultati">Salva</button><button type="button" class="btn-ghost" id="btn-clear-risultati">Elimina risultati</button></div>';
  wrap.innerHTML=h;
  document.getElementById("btn-save-risultati").onclick=async function(){
    var payload=[];document.querySelectorAll(".form-resultati").forEach(function(form){var rn=parseInt(form.getAttribute("data-regata"),10)||1;form.querySelectorAll(".result-row").forEach(function(row){var uid=row.getAttribute("data-user-id"),posVal=row.querySelector(".input-pos").value.trim(),stato=row.querySelector(".input-stato").value;var punti=null;if(stato!=="ok")punti=n+1;else{var pos=parseInt(posVal,10);if(pos>=1)punti=pos;}if(stato==="ok"&&!posVal)return;payload.push({gara_id:garaId,user_id:uid,regata_num:rn,posizione:stato==="ok"?parseInt(posVal,10):null,punti:punti,stato:stato});});});
    if(!payload.length)return alert("Inserisci almeno una posizione");
    var btn=document.getElementById("btn-save-risultati");btn.disabled=true;
    try{await CVI.supabase.from("risultati_gara").delete().eq("gara_id",garaId);await CVI.supabase.from("risultati_gara").insert(payload);var r=await CVI.supabase.from("risultati_gara").select("*");risultati=r.data||[];status("Salvati ("+payload.length+")","ok");loadFormRis(garaId);}catch(e){alert(e.message||e);}finally{btn.disabled=false;}
  };
  document.getElementById("btn-clear-risultati").onclick=async function(){if(!confirm("Eliminare tutti i risultati?"))return;await CVI.supabase.from("risultati_gara").delete().eq("gara_id",garaId);risultati=risultati.filter(function(r){return String(r.gara_id)!==String(garaId);});status("Eliminati","ok");loadFormRis(garaId);};
}

async function loadAvvisi(){
  var box=document.getElementById("avvisi-list");box.innerHTML='<p class="loading-text">…</p>';
  try{var res=await CVI.supabase.from("avvisi").select("*").order("created_at",{ascending:false}).limit(50);if(res.error)throw res.error;avvisi=res.data||[];
  box.innerHTML=avvisi.length?avvisi.map(function(a){return'<div class="admin-card'+(a.attivo===false?" is-past":"")+'"><div class="admin-card-head"><div><strong>'+esc(a.titolo)+'</strong><div class="meta">'+esc(fmt(a.created_at))+'</div></div><button type="button" class="btn-danger-sm avviso-del" data-id="'+esc(a.id)+'">Elimina</button></div><p class="card-desc">'+esc(a.testo)+'</p></div>';}).join(""):'<p class="empty-text">Nessun avviso.</p>';
  box.querySelectorAll(".avviso-del").forEach(function(b){b.onclick=async function(){if(!confirm("Eliminare?"))return;var r=await CVI.supabase.from("avvisi").delete().eq("id",b.getAttribute("data-id"));if(r.error)await CVI.supabase.from("avvisi").update({attivo:false}).eq("id",b.getAttribute("data-id"));loadAvvisi();};});
  }catch(e){box.innerHTML='<p style="color:#f87171">'+esc(e.message)+'</p>';}
}

async function pubAvviso(e){e.preventDefault();var titolo=document.getElementById("avviso-titolo").value.trim(),testo=document.getElementById("avviso-testo").value.trim();if(!titolo||!testo)return alert("Compila tutto");await CVI.supabase.from("avvisi").insert({titolo:titolo,testo:testo,attivo:true,created_by:user&&user.id});document.getElementById("avviso-titolo").value="";document.getElementById("avviso-testo").value="";status("Pubblicato","ok");loadAvvisi();}

async function loadGal(){
  var box=document.getElementById("gallery-admin-list");box.innerHTML='<p class="loading-text">…</p>';
  try{var res=await CVI.supabase.from("gallery").select("*").order("created_at",{ascending:false});if(res.error)throw res.error;gallery=res.data||[];
  box.innerHTML=gallery.length?'<div class="gal-grid">'+gallery.map(function(i){return'<div class="gal-card"><img src="'+esc(i.image_url)+'" alt=""><div class="gal-meta"><strong>'+esc(i.title||"Foto")+'</strong><button type="button" class="btn-danger-sm gal-del" data-id="'+esc(i.id)+'">Elimina</button></div></div>';}).join("")+'</div>':'<p class="empty-text">Nessuna foto.</p>';
  box.querySelectorAll(".gal-del").forEach(function(b){b.onclick=async function(){if(!confirm("Eliminare?"))return;await CVI.supabase.from("gallery").delete().eq("id",b.getAttribute("data-id"));loadGal();};});
  }catch(e){box.innerHTML='<p style="color:#f87171">'+esc(e.message)+'</p>';}
}

async function upGal(e){
  e.preventDefault();var file=document.getElementById("gal-file").files[0],title=document.getElementById("gal-title").value.trim(),caption=document.getElementById("gal-caption").value.trim();
  if(!file)return alert("Seleziona immagine");var btn=document.getElementById("gal-save-btn");btn.disabled=true;
  try{var path="admin/"+Date.now()+".jpg";var up=await CVI.supabase.storage.from("gallery").upload(path,file,{contentType:file.type||"image/jpeg",upsert:false});if(up.error)throw up.error;var pub=CVI.supabase.storage.from("gallery").getPublicUrl(path);await CVI.supabase.from("gallery").insert({title:title||"Foto",caption:caption||null,image_url:pub.data.publicUrl});document.getElementById("gal-file").value="";document.getElementById("gal-title").value="";document.getElementById("gal-caption").value="";status("Caricata","ok");loadGal();}catch(err){alert(err.message||err);}finally{btn.disabled=false;}
}

async function prepExport(){
  var info=document.getElementById("export-info");
  try{var ris=await CVI.supabase.from("risultati_gara").select("*");var prof=await CVI.supabase.from("profiles").select("id,nickname,team,nome,cognome");var g=await CVI.supabase.from("gare").select("id,titolo,data_gara,num_regate");
  risultati=ris.data||[];profiles=prof.data||[];gare=g.data||[];
  var years={};risultati.forEach(function(r){var gg=gare.find(function(x){return String(x.id)===String(r.gara_id);});var y=gg&&gg.data_gara?new Date(gg.data_gara).getFullYear():new Date().getFullYear();years[y]=true;});
  var ys=Object.keys(years).sort().reverse();if(!ys.length)ys=[String(new Date().getFullYear())];
  document.getElementById("export-anno").innerHTML=ys.map(function(y){return'<option value="'+y+'">'+y+'</option>';}).join("");
  if(info)info.textContent=risultati.length+" risultati · "+profiles.length+" soci · "+gare.length+" gare";
  }catch(e){if(info)info.textContent=e.message||e;}
}

function calcAnno(anno){
  var prove={};risultati.forEach(function(r){var g=gare.find(function(x){return String(x.id)===String(r.gara_id);});var y=g&&g.data_gara?String(new Date(g.data_gara).getFullYear()):"";if(y!==String(anno))return;var key=String(r.gara_id)+"#"+String(r.regata_num||1);(prove[key]=prove[key]||[]).push(r);});
  var uids={};profiles.forEach(function(p){uids[String(p.id)]=true;});Object.keys(prove).forEach(function(k){prove[k].forEach(function(r){uids[String(r.user_id)]=true;});});
  var totals={},gc={};Object.keys(uids).forEach(function(u){totals[u]=0;gc[u]=0;});
  Object.keys(prove).forEach(function(key){var list=prove[key],n=0,seen={},pp={};list.forEach(function(r){var u=String(r.user_id);if(!seen[u]){seen[u]=1;n++;}var pt=Number(r.punti)||0;if(pp[u]==null||pt<pp[u])pp[u]=pt;});Object.keys(uids).forEach(function(u){if(pp[u]!=null){totals[u]+=pp[u];gc[u]++;}else totals[u]+=n+1;});});
  var ranked=Object.keys(uids).map(function(uid){var p=profiles.find(function(x){return String(x.id)===uid;})||{};return{posizione:0,nickname:p.nickname||"",nome:[p.nome,p.cognome].filter(Boolean).join(" "),team:p.team||"",punti_totali:totals[uid],gare_disputate:gc[uid],stagione:String(anno)};});
  ranked.sort(function(a,b){return a.punti_totali!==b.punti_totali?a.punti_totali-b.punti_totali:(a.nickname||"").localeCompare(b.nickname||"","it");});
  ranked.forEach(function(r,i){r.posizione=i+1;});return ranked;
}

function dlCSV(){var anno=document.getElementById("export-anno").value||new Date().getFullYear();var rows=calcAnno(anno);var lines=["Posizione;Nickname;Nome;Team;Punti;Gare;Stagione"].concat(rows.map(function(r){return[r.posizione,'"'+String(r.nickname).replace(/"/g,'""')+'"','"'+String(r.nome).replace(/"/g,'""')+'"','"'+String(r.team).replace(/"/g,'""')+'"',r.punti_totali,r.gare_disputate,r.stagione].join(";");}));var blob=new Blob(["\uFEFF"+lines.join("\n")],{type:"text/csv;charset=utf-8;"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="classifica-cvi-"+anno+".csv";a.click();status("CSV scaricato","ok");}
function dlPDF(){var anno=document.getElementById("export-anno").value||new Date().getFullYear();var rows=calcAnno(anno);var w=window.open("","_blank");if(!w)return alert("Permetti popup");w.document.write("<!DOCTYPE html><html><head><meta charset=UTF-8><title>Classifica "+anno+'</title><style>body{font-family:system-ui;padding:2rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.4rem}</style></head><body><h1>CVI Classifica '+anno+"</h1><table><thead><tr><th>#</th><th>Nickname</th><th>Nome</th><th>Team</th><th>Punti</th><th>Gare</th></tr></thead><tbody>"+rows.map(function(r){return"<tr><td>"+r.posizione+"</td><td>"+esc(r.nickname)+"</td><td>"+esc(r.nome)+"</td><td>"+esc(r.team)+"</td><td>"+r.punti_totali+"</td><td>"+r.gare_disputate+"</td></tr>";}).join("")+"</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>");w.document.close();status("PDF pronto","ok");}

async function boot(){
  var ok=await loadSession();if(!ok)return;
  document.getElementById("gara-form").onsubmit=saveGara;
  document.getElementById("gara-cancel-btn").onclick=resetGara;
  document.getElementById("avviso-form").onsubmit=pubAvviso;
  document.getElementById("gallery-form").onsubmit=upGal;
  document.getElementById("btn-export-csv").onclick=dlCSV;
  document.getElementById("btn-export-pdf").onclick=dlPDF;
  var search=document.getElementById("soci-search");if(search)search.oninput=function(){loadSoci();};
  var risSel=document.getElementById("ris-gara-select");if(risSel)risSel.onchange=function(){if(risSel.value)loadFormRis(risSel.value);};
  initTabs();
  var hint=document.getElementById("sql-hint");if(hint)hint.style.display="block";
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){if(window.CVI&&CVI.init)CVI.init("admin.html");boot();});
else{if(window.CVI&&CVI.init)CVI.init("admin.html");boot();}
})();
