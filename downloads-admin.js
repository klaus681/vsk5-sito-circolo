/* CVI Admin - gestione download */
(function(){
"use strict";
var TIPO_LABEL={pdf:"PDF",zip:"ZIP",exe:"EXE",link:"Link",file:"File"};
var downloadsCache=[];

var DL_URL_HINT="Incolla un link esterno: i link Dropbox vengono convertiti automaticamente in download diretto. In alternativa carica un file su Supabase qui sotto.";
var DL_UPLOAD_HINT="Il file viene salvato su Supabase Storage e compila automaticamente l'URL qui sopra (link permanente, senza scadenza).";

function esc(s){
  if(s==null)return"";
  return String(s)
    .replace(/&/g, String.fromCharCode(38,97,109,112,59))
    .replace(/</g, String.fromCharCode(38,108,116,59))
    .replace(/>/g, String.fromCharCode(38,103,116,59))
    .replace(/"/g, String.fromCharCode(38,113,117,111,116,59));
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

function ensureDlFormFields(){
  var form=document.getElementById("dl-form");
  if(!form)return false;

  // URL hint
  if(!document.getElementById("dl-url-hint")){
    var urlEl=document.getElementById("dl-url");
    var urlWrap=urlEl&&urlEl.parentNode;
    if(urlWrap){
      var p=document.createElement("p");
      p.id="dl-url-hint";
      p.style.cssText="margin:.35rem 0 0;font-size:.8rem;color:#94a3b8";
      p.textContent=DL_URL_HINT;
      urlWrap.appendChild(p);
    }
  }

  // Tipo
  if(!document.getElementById("dl-tipo")){
    var wrap=document.createElement("div");
    wrap.innerHTML=
      '<label class="adm-label" for="dl-tipo">Tipo</label>'+
      '<select class="adm-select" id="dl-tipo" style="width:100%;max-width:14rem">'+
      '<option value="pdf">PDF</option>'+
      '<option value="zip">ZIP</option>'+
      '<option value="exe">EXE</option>'+
      '<option value="link">Link</option>'+
      '<option value="file">File</option>'+
      '</select>';
    var actions=form.querySelector(".form-actions");
    if(actions)form.insertBefore(wrap, actions);
    else form.appendChild(wrap);
  }

  // Ordine
  if(!document.getElementById("dl-ordine")){
    var wrap2=document.createElement("div");
    wrap2.innerHTML=
      '<label class="adm-label" for="dl-ordine">Ordine (piu basso = prima)</label>'+
      '<input type="number" class="adm-input" id="dl-ordine" value="0" style="width:6rem">';
    var actions2=form.querySelector(".form-actions");
    if(actions2)form.insertBefore(wrap2, actions2);
    else form.appendChild(wrap2);
  }

  // Attivo
  if(!document.getElementById("dl-attivo")){
    var wrap3=document.createElement("div");
    wrap3.innerHTML=
      '<label style="color:#e2e8f0;font-size:0.88rem;display:flex;align-items:center;gap:0.4rem">'+
      '<input type="checkbox" id="dl-attivo" checked> Attivo (visibile nella pagina Download)</label>';
    var actions3=form.querySelector(".form-actions");
    if(actions3)form.insertBefore(wrap3, actions3);
    else form.appendChild(wrap3);
  }

  // Upload file (opzionale)
  if(!document.getElementById("dl-file")){
    var wrap4=document.createElement("div");
    wrap4.innerHTML=
      '<label class="adm-label" for="dl-file">Oppure carica un file (max 50 MB)</label>'+
      '<input type="file" id="dl-file" accept=".pdf,.zip,.exe,.rar,.7z,.msi,application/pdf,application/zip">'+
      '<p id="dl-upload-status" style="margin:.35rem 0 0;font-size:.8rem;color:#94a3b8">'+DL_UPLOAD_HINT+'</p>';
    var actions4=form.querySelector(".form-actions");
    if(actions4)form.insertBefore(wrap4, actions4);
    else form.appendChild(wrap4);
  }

  return true;
}

function resetDlForm(){
  var el=document.getElementById("dl-id");
  if(!el)return;
  el.value="";
  var t=document.getElementById("dl-titolo"); if(t)t.value="";
  var d=document.getElementById("dl-desc"); if(d)d.value="";
  var u=document.getElementById("dl-url"); if(u)u.value="";
  var tipo=document.getElementById("dl-tipo"); if(tipo)tipo.value="pdf";
  var ord=document.getElementById("dl-ordine"); if(ord)ord.value="0";
  var att=document.getElementById("dl-attivo"); if(att)att.checked=true;
  var ft=document.getElementById("dl-form-title"); if(ft)ft.textContent="Nuovo download";
  var sb=document.getElementById("dl-save-btn"); if(sb)sb.textContent="Salva";
  var cancel=document.getElementById("dl-cancel-btn");
  if(cancel)cancel.style.display="none";
  var fileEl=document.getElementById("dl-file");
  if(fileEl)fileEl.value="";
  var st=document.getElementById("dl-upload-status");
  if(st){st.textContent=DL_UPLOAD_HINT;st.style.color="#94a3b8";}
  var uh=document.getElementById("dl-url-hint");
  if(uh){uh.textContent=DL_URL_HINT;uh.style.color="#94a3b8";}
}

var EXT_TIPO={pdf:"pdf",zip:"zip",exe:"exe"};
var MAX_UPLOAD_MB=50;

function detectTipoFromUrl(u){
  var m=String(u||"").split("?")[0].split("#")[0].match(/\.([a-z0-9]{2,5})$/i);
  var ext=m?m[1].toLowerCase():"";
  if(ext==="pdf")return "pdf";
  if(ext==="zip"||ext==="rar"||ext==="7z")return "zip";
  if(ext==="exe"||ext==="msi")return "exe";
  return "";
}

function normalizeDownloadUrl(raw){
  var u=String(raw||"").trim();
  if(!u)return {url:"",tipo:"",note:"",warn:false};
  var note="",warn=false;
  if(!/^https?:\/\//i.test(u))u="https://"+u;
  var host="";
  try{host=new URL(u).hostname.toLowerCase();}catch(e){host="";}
  if(/(^|\.)dropbox\.com$/.test(host)){
    if(/[?&]dl=0(&|$)/.test(u)){u=u.replace(/([?&])dl=0(&|$)/,"$1dl=1$2");note="Link Dropbox convertito in download diretto (dl=1).";}
    else if(/[?&]raw=1(&|$)/.test(u)){note="Link Dropbox gia impostato su raw=1.";}
    else if(!/[?&](dl|raw)=/.test(u)){u+=(u.indexOf("?")>=0?"&":"?")+"dl=1";note="Aggiunto dl=1 al link Dropbox (download diretto).";}
    if(/\/scl\/transfer\//.test(u)){note="Attenzione: sembra un link Dropbox Transfer, che scade dopo pochi giorni. Usa un link condiviso normale.";warn=true;}
  }else if(/(^|\.)discord(app)?\.com$/.test(host)){
    note="Attenzione: i link Discord scadono in circa 24 ore. Meglio caricare il file su Supabase (Opzione B).";warn=true;
  }
  var gd=u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if(gd){u="https://drive.google.com/uc?export=download&id="+gd[1];note="Link Google Drive convertito in download diretto.";warn=false;}
  return {url:u,tipo:detectTipoFromUrl(u),note:note,warn:warn};
}

async function uploadDownloadFile(file){
  var st=document.getElementById("dl-upload-status");
  function setSt(msg,color){ if(st){st.textContent=msg||""; st.style.color=color||"#94a3b8";} }
  if(!file)return;
  if(!window.CVI||!CVI.supabase){ setSt("Supabase non disponibile.","#f87171"); return; }
  if(file.size>MAX_UPLOAD_MB*1024*1024){ setSt("File troppo grande (max "+MAX_UPLOAD_MB+" MB).","#f87171"); return; }
  setSt("Caricamento «"+file.name+"»...","#94a3b8");
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
    var uh=document.getElementById("dl-url-hint");
    if(uh){uh.textContent="URL compilato dal file caricato su Supabase Storage («"+bucket+"»).";uh.style.color="#34d399";}
    setSt("File caricato su «"+bucket+"» · URL compilato. Ora premi Salva.","#34d399");
  }catch(err){
    setSt("Errore upload: "+(err.message||err)+" (verifica bucket downloads o gallery pubblico e policy admin).","#f87171");
  }
}

window.loadDownloads=async function loadDownloads(){
  ensureDlFormFields();
  var box=document.getElementById("dl-list");
  var hint=document.getElementById("dl-sql-hint");
  if(!box)return;
  box.innerHTML='<p class="loading-text">Caricamento...</p>';
  try{
    var res=await CVI.supabase.from("downloads").select("*").order("ordine",{ascending:true}).order("created_at",{ascending:false});
    if(res.error)throw res.error;
    downloadsCache=res.data||[];
    if(hint)hint.style.display="none";
    if(!downloadsCache.length){
      box.innerHTML='<p class="empty-text">Nessun file. Aggiungi il primo download qui sopra.</p>';
      return;
    }
    box.innerHTML='<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 0.75rem">'+downloadsCache.length+' file · clicca Elimina per rimuovere</p>'+
    downloadsCache.map(function(d){
      var tipo=TIPO_LABEL[d.tipo]||(d.tipo||"File");
      var off=d.attivo===false;
      var host="";try{host=new URL(d.url).hostname.replace(/^www\./,"");}catch(e){}
      var isSb=/supabase\.co$/i.test(host);
      var srcBadge='<span style="display:inline-block;font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:999px;margin-right:.4rem;'+(isSb?'background:rgba(52,211,153,.15);color:#34d399':'background:rgba(56,189,248,.15);color:#7dd3fc')+'">'+(isSb?'Supabase Storage':'Link esterno'+(host?' · '+esc(host):''))+'</span>';
      return '<div class="admin-card'+(off?' is-past':'')+'" style="margin-bottom:0.75rem">'+
        '<div class="admin-card-head">'+
          '<div><strong>'+esc(d.titolo)+'</strong>'+
          '<div class="meta">'+esc(tipo)+(off?' · <span style="color:#f87171">disattivo</span>':'')+' · ordine '+esc(d.ordine!=null?d.ordine:0)+'</div></div>'+
          '<div class="admin-card-actions" style="display:flex;gap:0.4rem;flex-wrap:wrap">'+
            '<button type="button" class="btn-sm dl-edit" data-id="'+esc(d.id)+'">Modifica</button>'+
            '<button type="button" class="btn-danger-sm dl-del" data-id="'+esc(d.id)+'">Elimina</button>'+
          '</div>'+
        '</div>'+
        (d.descrizione?'<p class="card-desc">'+esc(d.descrizione)+'</p>':'')+
        '<div class="meta" style="margin-top:.4rem;word-break:break-all">'+srcBadge+'<a href="'+esc(d.url)+'" target="_blank" rel="noopener" style="color:#7dd3fc">'+esc(d.url)+'</a></div>'+
      '</div>';
    }).join("");

    box.querySelectorAll(".dl-edit").forEach(function(b){
      b.onclick=function(){
        ensureDlFormFields();
        var d=downloadsCache.find(function(x){return String(x.id)===b.getAttribute("data-id");});
        if(!d)return;
        document.getElementById("dl-id").value=d.id;
        document.getElementById("dl-titolo").value=d.titolo||"";
        document.getElementById("dl-desc").value=d.descrizione||"";
        document.getElementById("dl-url").value=d.url||"";
        (function(){var h="";try{h=new URL(d.url).hostname.replace(/^www\./,"");}catch(e){}
          var isSb=/supabase\.co$/i.test(h);
          var uh=document.getElementById("dl-url-hint");
          if(uh){uh.textContent=isSb?"File ospitato su Supabase Storage.":("Link esterno: "+(h||"?"));uh.style.color="#94a3b8";}
        })();
        var tipoEl=document.getElementById("dl-tipo"); if(tipoEl)tipoEl.value=d.tipo||"file";
        var ordEl=document.getElementById("dl-ordine"); if(ordEl)ordEl.value=String(d.ordine!=null?d.ordine:0);
        var attEl=document.getElementById("dl-attivo"); if(attEl)attEl.checked=d.attivo!==false;
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
        if(!confirm("Eliminare «"+nome+"»?"))return;
        b.disabled=true;
        b.textContent="...";
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
  if(e)e.preventDefault();
  ensureDlFormFields();
  var idEl=document.getElementById("dl-id");
  var id=idEl?idEl.value.trim():"";
  var titoloEl=document.getElementById("dl-titolo");
  var titolo=titoloEl?titoloEl.value.trim():"";
  var descEl=document.getElementById("dl-desc");
  var desc=descEl?descEl.value.trim():"";
  var urlEl=document.getElementById("dl-url");
  var rawUrl=urlEl?urlEl.value:"";
  var norm=normalizeDownloadUrl(rawUrl);
  var url=norm.url;
  if(urlEl&&norm.url&&norm.url!==rawUrl)urlEl.value=norm.url;
  var tipoEl=document.getElementById("dl-tipo");
  var tipo=(tipoEl&&tipoEl.value)||norm.tipo||"file";
  var ordEl=document.getElementById("dl-ordine");
  var ordine=ordEl?parseInt(ordEl.value,10):0; if(isNaN(ordine))ordine=0;
  var attEl=document.getElementById("dl-attivo");
  var attivo=attEl?!!attEl.checked:true;

  if(!titolo||!url){
    alert("Titolo e URL obbligatori");
    return;
  }

  var payload={titolo:titolo,descrizione:desc||null,url:url,tipo:tipo,ordine:ordine,attivo:attivo};
  var btn=document.getElementById("dl-save-btn");
  if(btn)btn.disabled=true;
  try{
    if(!window.CVI||!CVI.supabase)throw new Error("Supabase non disponibile");
    var r;
    if(id)r=await CVI.supabase.from("downloads").update(payload).eq("id",id);
    else r=await CVI.supabase.from("downloads").insert(payload);
    if(r.error)throw r.error;
    notify(id?"Aggiornato":"Creato","ok");
    if(norm.note){
      var uh=document.getElementById("dl-url-hint");
      if(uh){uh.textContent=norm.note;uh.style.color=norm.warn?"#fbbf24":"#34d399";}
    }
    resetDlForm();
    loadDownloads();
  }catch(err){
    notify(err.message||String(err),"err");
    var hint=document.getElementById("dl-sql-hint");
    if(hint){
      hint.style.display="block";
      hint.textContent="Errore salvataggio: "+(err.message||err)+" - verifica tabella downloads e policy RLS (esegui downloads-sql.sql su Supabase).";
    }
    alert("Errore salvataggio download: "+(err.message||err));
  }finally{
    if(btn)btn.disabled=false;
  }
}

function wireDownloadUI(){
  if(!ensureDlFormFields())return;
  var form=document.getElementById("dl-form");
  if(form&&!form._wired){form._wired=true;form.onsubmit=saveDownload;}
  var cancel=document.getElementById("dl-cancel-btn");
  if(cancel&&!cancel._wired){cancel._wired=true;cancel.onclick=resetDlForm;}
  var fileInput=document.getElementById("dl-file");
  if(fileInput&&!fileInput._wired){
    fileInput._wired=true;
    fileInput.onchange=function(){ var f=this.files&&this.files[0]; if(f)uploadDownloadFile(f); };
  }
  var urlInput=document.getElementById("dl-url");
  if(urlInput&&!urlInput._wired){
    urlInput._wired=true;
    var applyUrl=function(){
      var r=normalizeDownloadUrl(urlInput.value);
      if(r.url&&r.url!==urlInput.value)urlInput.value=r.url;
      if(r.tipo){var ts=document.getElementById("dl-tipo");if(ts)ts.value=r.tipo;}
      var uh=document.getElementById("dl-url-hint");
      if(uh){uh.textContent=r.note||DL_URL_HINT;uh.style.color=r.warn?"#fbbf24":"#94a3b8";}
    };
    urlInput.addEventListener("blur",applyUrl);
    urlInput.addEventListener("paste",function(){ setTimeout(applyUrl,0); });
  }
  document.querySelectorAll('.admin-tab[data-tab="download"]').forEach(function(tab){
    if(tab._dlWired)return;
    tab._dlWired=true;
    tab.addEventListener("click",function(){
      setTimeout(function(){
        ensureDlFormFields();
        loadDownloads();
      },80);
    }, true);
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
