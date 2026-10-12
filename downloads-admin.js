/* CVI Admin – gestione download */
(function(){
"use strict";
var TIPO_LABEL={pdf:"PDF",zip:"ZIP",exe:"EXE",link:"Link",file:"File"};
var downloadsCache=[];

function resetDlForm(){
  var el;
  if(!(el=document.getElementById("dl-id")))return;
  el.value="";
  document.getElementById("dl-titolo").value="";
  document.getElementById("dl-desc").value="";
  document.getElementById("dl-url").value="";
  document.getElementById("dl-tipo").value="pdf";
  document.getElementById("dl-ordine").value="0";
  document.getElementById("dl-attivo").checked=true;
  document.getElementById("dl-form-title").textContent="Nuovo download";
  document.getElementById("dl-save-btn").textContent="Salva";
  document.getElementById("dl-cancel-btn").style.display="none";
}

window.loadDownloads=async function loadDownloads(){
  var box=document.getElementById("dl-list");
  var hint=document.getElementById("dl-sql-hint");
  if(!box)return;
  box.innerHTML='<p class="loading-text">Caricamento…</p>';
  try{
    var res=await CVI.supabase.from("downloads").select("*").order("ordine",{ascending:true}).order("created_at",{ascending:false});
    if(res.error)throw res.error;
    downloadsCache=res.data||[];
    if(hint)hint.style.display="none";
    if(!downloadsCache.length){
      box.innerHTML='<p class="empty-text">Nessun file. Aggiungi il primo download qui sopra.</p>';
      return;
    }
    function esc(s){if(s==null)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
    box.innerHTML=downloadsCache.map(function(d){
      var tipo=TIPO_LABEL[d.tipo]||(d.tipo||"File");
      var off=d.attivo===false;
      return'<div class="admin-card'+(off?' is-past':'')+'"><div class="admin-card-head"><div><strong>'+esc(d.titolo)+'</strong><div class="meta">'+esc(tipo)+(off?' · <span style="color:#f87171">disattivo</span>':'')+' · ordine '+esc(d.ordine!=null?d.ordine:0)+'</div></div><div class="admin-card-actions"><button type="button" class="btn-sm dl-edit" data-id="'+esc(d.id)+'">Modifica</button><button type="button" class="btn-danger-sm dl-del" data-id="'+esc(d.id)+'">Elimina</button></div></div>'+(d.descrizione?'<p class="card-desc">'+esc(d.descrizione)+'</p>':'')+'<div class="meta" style="margin-top:.4rem;word-break:break-all"><a href="'+esc(d.url)+'" target="_blank" rel="noopener" style="color:#7dd3fc">'+esc(d.url)+'</a></div></div>';
    }).join("");
    box.querySelectorAll(".dl-edit").forEach(function(b){
      b.onclick=function(){
        var d=downloadsCache.find(function(x){return String(x.id)===b.getAttribute("data-id");});
        if(!d)return;
        document.getElementById("dl-id").value=d.id;
        document.getElementById("dl-titolo").value=d.titolo||"";
        document.getElementById("dl-desc").value=d.descrizione||"";
        document.getElementById("dl-url").value=d.url||"";
        document.getElementById("dl-tipo").value=d.tipo||"file";
        document.getElementById("dl-ordine").value=String(d.ordine!=null?d.ordine:0);
        document.getElementById("dl-attivo").checked=d.attivo!==false;
        document.getElementById("dl-form-title").textContent="Modifica download";
        document.getElementById("dl-save-btn").textContent="Aggiorna";
        document.getElementById("dl-cancel-btn").style.display="inline-block";
      };
    });
    box.querySelectorAll(".dl-del").forEach(function(b){
      b.onclick=async function(){
        if(!confirm("Eliminare questo download?"))return;
        var r=await CVI.supabase.from("downloads").delete().eq("id",b.getAttribute("data-id"));
        if(r.error){if(typeof status==="function")status(r.error.message,"err");return;}
        if(typeof status==="function")status("Eliminato","ok");
        loadDownloads();
      };
    });
  }catch(e){
    function esc(s){if(s==null)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
    box.innerHTML='<p class="empty-text" style="color:#f87171">Errore: '+esc(e.message||e)+'</p>';
    if(hint)hint.style.display="block";
  }
};

async function saveDownload(e){
  e.preventDefault();
  var id=document.getElementById("dl-id").value.trim();
  var titolo=document.getElementById("dl-titolo").value.trim();
  var desc=document.getElementById("dl-desc").value.trim();
  var url=document.getElementById("dl-url").value.trim();
  var tipo=document.getElementById("dl-tipo").value||"file";
  var ordine=parseInt(document.getElementById("dl-ordine").value,10);if(isNaN(ordine))ordine=0;
  var attivo=document.getElementById("dl-attivo").checked;
  if(!titolo||!url)return alert("Titolo e URL obbligatori");
  var payload={titolo:titolo,descrizione:desc||null,url:url,tipo:tipo,ordine:ordine,attivo:attivo};
  var btn=document.getElementById("dl-save-btn");
  btn.disabled=true;
  try{
    var r;
    if(id)r=await CVI.supabase.from("downloads").update(payload).eq("id",id);
    else r=await CVI.supabase.from("downloads").insert(payload);
    if(r.error)throw r.error;
    if(typeof status==="function")status(id?"Aggiornato":"Creato","ok");
    resetDlForm();
    loadDownloads();
  }catch(err){
    if(typeof status==="function")status(err.message||String(err),"err");
    var hint=document.getElementById("dl-sql-hint");
    if(hint)hint.style.display="block";
  }finally{btn.disabled=false;}
}

function wireDownloadUI(){
  var form=document.getElementById("dl-form");
  if(form&&!form._wired){form._wired=true;form.onsubmit=saveDownload;}
  var cancel=document.getElementById("dl-cancel-btn");
  if(cancel&&!cancel._wired){cancel._wired=true;cancel.onclick=resetDlForm;}
  document.querySelectorAll('.admin-tab[data-tab="download"]').forEach(function(tab){
    if(tab._dlWired)return;
    tab._dlWired=true;
    tab.addEventListener("click",function(){
      setTimeout(function(){loadDownloads();},50);
    });
  });
}

function tryWire(){
  if(!document.getElementById("dl-form"))return;
  wireDownloadUI();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(tryWire,800);});
else setTimeout(tryWire,800);
setTimeout(tryWire,2000);
setTimeout(tryWire,4000);
})();
