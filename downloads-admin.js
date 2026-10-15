/* CVI Admin – gestione download */
(function(){
"use strict";
var TIPO_LABEL={pdf:"PDF",zip:"ZIP",exe:"EXE",link:"Link",file:"File"};
var downloadsCache=[];

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

function resetDlForm(){
  var el=document.getElementById("dl-id");
  if(!el)return;
  el.value="";
  document.getElementById("dl-titolo").value="";
  document.getElementById("dl-desc").value="";
  document.getElementById("dl-url").value="";
  document.getElementById("dl-tipo").value="pdf";
  document.getElementById("dl-ordine").value="0";
  document.getElementById("dl-attivo").checked=true;
  document.getElementById("dl-form-title").textContent="Nuovo download";
  document.getElementById("dl-save-btn").textContent="Salva";
  var cancel=document.getElementById("dl-cancel-btn");
  if(cancel)cancel.style.display="none";
  var fileEl=document.getElementById("dl-file");
  if(fileEl)fileEl.value="";
  var st=document.getElementById("dl-upload-status");
  if(st){st.textContent="Caricando qui il file viene salvato su Supabase Storage e l'URL viene compilato automaticamente (niente link a scadenza).";st.style.color="#94a3b8";}
}

var EXT_TIPO={pdf:"pdf",zip:"zip",exe:"exe"};
var MAX_UPLOAD_MB=50;

async function uploadDownloadFile(file){
  var st=document.getElementById("dl-upload-status");
  function setSt(msg,color){ if(st){st.textContent=msg||""; st.style.color=color||"#94a3b8";} }
  if(!file)return;
  if(!window.CVI||!CVI.supabase){ setSt("Supabase non disponibile.","#f87171"); return; }
  if(file.size>MAX_UPLOAD_MB*1024*1024){ setSt("File troppo grande (max "+MAX_UPLOAD_MB+" MB).","#f87171"); return; }
  setSt("Caricamento «"+file.name+"»…","#94a3b8");
  try{
    var sess=await CVI.supabase.auth.getSession();
    var session=sess.data&&sess.data.session;
    if(!session){ setSt("Devi essere loggato come admin.","#f87171"); return; }
    var ext=(file.name.split(".").pop()||"bin").toLowerCase();
    var safeName=file.name.replace(/[^\w.\-]+/g,"_").slice(-80)||("file."+ext);
    var path="downloads/"+Date.now()+"-"+safeName;
    var contentType=file.type||"application/octet-stream";
    var bucket="downloads";
    var up=await CVI.supabase.storage.from(bucket).upload(path,file,{contentType:contentType,upsert:false});
    if(up.error){
      bucket="gallery";
      up=await CVI.supabase.storage.from(bucket).upload(path,file,{contentType:contentType,upsert:false});
      if(up.error)throw up.error;
    }
    var pub=CVI.supabase.storage.from(bucket).getPublicUrl(path);
    var url=pub.data&&pub.data.publicUrl;
    if(!url)throw new Error("URL pubblico non disponibile");
    var urlEl=document.getElementById("dl-url");
    if(urlEl)urlEl.value=url;
    var tipoSel=document.getElementById("dl-tipo");
    if(tipoSel&&EXT_TIPO[ext])tipoSel.value=EXT_TIPO[ext];
    setSt("File caricato su «"+bucket+"» · URL compilato. Ora premi Salva.","#34d399");
  }catch(err){
    setSt("Errore upload: "+(err.message||err)+" (verifica che il bucket «downloads» o «gallery» sia pubblico e con policy di upload per gli admin).","#f87171");
  }
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
    box.innerHTML='<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 0.75rem">'+downloadsCache.length+' file · clicca <strong style="color:#f87171">Elimina</strong> per rimuovere</p>'+
    downloadsCache.map(function(d){
      var tipo=TIPO_LABEL[d.tipo]||(d.tipo||"File");
      var off=d.attivo===false;
      return '<div class="admin-card'+(off?' is-past':'')+'" style="margin-bottom:0.75rem">'+
        '<div class="admin-card-head">'+
          '<div><strong>'+esc(d.titolo)+'</strong>'+
          '<div class="meta">'+esc(tipo)+(off?' · <span style="color:#f87171">disattivo</span>':'')+' · ordine '+esc(d.ordine!=null?d.ordine:0)+'</div></div>'+
          '<div class="admin-card-actions" style="display:flex;gap:0.4rem;flex-wrap:wrap">'+
            '<button type="button" class="btn-sm dl-edit" data-id="'+esc(d.id)+'">Modifica</button>'+
            '<button type="button" class="btn-danger-sm dl-del" data-id="'+esc(d.id)+'" style="background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.45);padding:0.3rem 0.65rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer">Elimina</button>'+
          '</div>'+
        '</div>'+
        (d.descrizione?'<p class="card-desc">'+esc(d.descrizione)+'</p>':'')+
        '<div class="meta" style="margin-top:.4rem;word-break:break-all"><a href="'+esc(d.url)+'" target="_blank" rel="noopener" style="color:#7dd3fc">'+esc(d.url)+'</a></div>'+
      '</div>';
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
        var cancel=document.getElementById("dl-cancel-btn");
        if(cancel)cancel.style.display="inline-block";
        document.getElementById("dl-form").scrollIntoView({behavior:"smooth",block:"nearest"});
      };
    });

    box.querySelectorAll(".dl-del").forEach(function(b){
      b.onclick=async function(){
        var id=b.getAttribute("data-id");
        var d=downloadsCache.find(function(x){return String(x.id)===id;});
        var nome=d&&d.titolo?d.titolo:"questo file";
        if(!confirm("Eliminare «"+nome+"»?\nQuesta azione non si può annullare."))return;
        b.disabled=true;
        b.textContent="…";
        try{
          var r=await CVI.supabase.from("downloads").delete().eq("id",id);
          if(r.error)throw r.error;
          notify("Eliminato","ok");
          loadDownloads();
        }catch(err){
          b.disabled=false;
          b.textContent="Elimina";
          notify(err.message||String(err),"err");
          alert("Errore eliminazione: "+(err.message||err));
        }
      };
    });
  }catch(e){
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
    notify(id?"Aggiornato":"Creato","ok");
    resetDlForm();
    loadDownloads();
  }catch(err){
    notify(err.message||String(err),"err");
    var hint=document.getElementById("dl-sql-hint");
    if(hint)hint.style.display="block";
  }finally{btn.disabled=false;}
}

function wireDownloadUI(){
  var form=document.getElementById("dl-form");
  if(form&&!form._wired){form._wired=true;form.onsubmit=saveDownload;}
  var cancel=document.getElementById("dl-cancel-btn");
  if(cancel&&!cancel._wired){cancel._wired=true;cancel.onclick=resetDlForm;}
  var fileInput=document.getElementById("dl-file");
  if(fileInput&&!fileInput._wired){
    fileInput._wired=true;
    fileInput.onchange=function(){ var f=this.files&&this.files[0]; if(f)uploadDownloadFile(f); };
  }
  document.querySelectorAll('.admin-tab[data-tab="download"]').forEach(function(tab){
    if(tab._dlWired)return;
    tab._dlWired=true;
    tab.addEventListener("click",function(){
      setTimeout(function(){loadDownloads();},80);
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
