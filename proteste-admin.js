/* CVI Admin – sezione Proteste */
(function () {
  "use strict";
  function esc(s){if(s==null)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function fmt(iso){if(!iso)return"—";try{return new Date(iso).toLocaleString("it-IT",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(e){return String(iso);}}
  var STATUS_OPTS=[{v:"pending",l:"In attesa"},{v:"in_esame",l:"In esame"},{v:"accolta",l:"Accolta"},{v:"respinta",l:"Respinta"},{v:"ritirata",l:"Ritirata"}];
  function statusColor(st){if(st==="accolta")return"#34d399";if(st==="respinta")return"#f87171";if(st==="in_esame")return"#7dd3fc";if(st==="ritirata")return"#94a3b8";return"#fbbf24";}
  async function loadProtesteAdmin(){
    var box=document.getElementById("proteste-admin-list");
    if(!box||!window.CVI||!CVI.supabase)return;
    box.innerHTML='<p class="loading-text">Caricamento proteste…</p>';
    try{
      var res=await CVI.supabase.from("proteste").select("*").order("created_at",{ascending:false}).limit(150);
      if(res.error)throw res.error;
      var rows=res.data||[];
      var filter=(document.getElementById("proteste-filter")||{}).value||"all";
      if(filter!=="all")rows=rows.filter(function(r){return(r.status||"pending")===filter;});
      if(!rows.length){box.innerHTML='<p class="empty-text">Nessuna protesta.</p>';return;}
      box.innerHTML=rows.map(function(p){
        var st=p.status||"pending";
        var opts=STATUS_OPTS.map(function(o){return'<option value="'+o.v+'"'+(st===o.v?" selected":"")+'>'+o.l+'</option>';}).join("");
        return'<div class="admin-card" data-protest-id="'+esc(p.id)+'"><div class="admin-card-head"><div><strong style="color:#fff">'+esc(p.gara_titolo||"Gara")+'</strong><div class="meta">'+esc(fmt(p.created_at))+' · <strong>'+esc(p.protestante_nick||"?")+'</strong> vs <strong>'+esc(p.protestato_nick||"?")+'</strong>'+(p.regola?" · "+esc(p.regola):"")+(p.momento?" · "+esc(p.momento):"")+'</div></div><span style="color:'+statusColor(st)+';font-weight:700;font-size:0.8rem;text-transform:uppercase">'+esc(st.replace("_"," "))+'</span></div>'+(p.descrizione?'<p class="card-desc" style="white-space:pre-wrap">'+esc(p.descrizione)+'</p>':'')+(p.testimoni?'<div class="meta">Testimoni: '+esc(p.testimoni)+'</div>':'')+(function(){var u=p.allegati_url;if(!u)return'';var img=/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u);if(img)return'<div style="margin-top:.55rem"><a href="'+esc(u)+'" target="_blank" rel="noopener"><img src="'+esc(u)+'" alt="Allegato" style="max-width:280px;max-height:160px;border-radius:8px;border:1px solid rgba(255,255,255,.08)"></a> <a href="'+esc(u)+'" target="_blank" rel="noopener" style="color:#7dd3fc;font-size:.85rem">Apri</a></div>';return'<div class="meta" style="margin-top:.4rem"><a href="'+esc(u)+'" target="_blank" rel="noopener" style="color:#7dd3fc">📎 Allegato</a></div>';})()+'<div style="margin-top:0.85rem;display:grid;gap:0.55rem"><div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center"><label class="adm-label" style="margin:0">Stato</label><select class="adm-select pr-status" data-id="'+esc(p.id)+'">'+opts+'</select></div><div><label class="adm-label">Nota comitato</label><textarea class="adm-input pr-note" data-id="'+esc(p.id)+'" rows="2" style="width:100%">'+esc(p.admin_note||"")+'</textarea></div><div class="form-actions"><button type="button" class="btn-primary pr-save" data-id="'+esc(p.id)+'">Salva decisione</button></div></div></div>';
      }).join("");
      box.querySelectorAll(".pr-save").forEach(function(btn){
        btn.onclick=async function(){
          var id=btn.getAttribute("data-id");
          var card=box.querySelector('[data-protest-id="'+id+'"]');
          if(!card)return;
          var stSel=card.querySelector(".pr-status");
          var noteEl=card.querySelector(".pr-note");
          var status=stSel?stSel.value:"pending";
          var note=noteEl?noteEl.value.trim():"";
          btn.disabled=true;
          var payload={status:status,admin_note:note||null,updated_at:new Date().toISOString()};
          if(status==="accolta"||status==="respinta")payload.resolved_at=new Date().toISOString();
          var r=await CVI.supabase.from("proteste").update(payload).eq("id",id);
          btn.disabled=false;
          if(r.error){alert(r.error.message);return;}
          var el=document.getElementById("admin-status");
          if(el){el.textContent="Protesta aggiornata";el.className="admin-status ok";}
          loadProtesteAdmin();
        };
      });
    }catch(e){
      box.innerHTML='<p style="color:#f87171">'+esc(e.message||e)+'</p><p class="sql-hint" style="display:block;margin-top:0.75rem">Esegui proteste-sql.sql su Supabase se la tabella manca.</p>';
    }
  }
  window.loadProtesteAdmin=loadProtesteAdmin;
  function wireTab(){
    var tab=document.querySelector('.admin-tab[data-tab="proteste"]');
    if(!tab)return;
    tab.onclick=function(){
      document.querySelectorAll(".admin-tab").forEach(function(t){t.classList.remove("active");});
      document.querySelectorAll(".admin-panel").forEach(function(p){p.classList.remove("active");});
      tab.classList.add("active");
      var panel=document.getElementById("panel-proteste");
      if(panel)panel.classList.add("active");
      loadProtesteAdmin();
    };
    var filt=document.getElementById("proteste-filter");
    if(filt&&!filt._wired){filt._wired=true;filt.onchange=function(){loadProtesteAdmin();};}
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){setTimeout(wireTab,800);setTimeout(wireTab,2000);});}
  else{setTimeout(wireTab,800);setTimeout(wireTab,2000);}
})();
