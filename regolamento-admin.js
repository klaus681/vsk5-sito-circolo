/* CVI Admin – Indice del Regolamento (tabella regolamento_regole) */
(function(){
"use strict";

/* Elenco predefinito (regole integrate, testi IT) usato dal pulsante "Importa regole attuali".
   La chiave (rule1..rule11) fa sì che la pagina Regolamento continui a usare le traduzioni i18n. */
var BUILTIN = [
  { chiave:"rule1", titolo:"Fair Play e Condotta in Mare", contenuto:"Il rispetto delle regole di regata ISAF virtuali è il pilastro del nostro circolo. Qualsiasi scorrettezza grave o comportamento antisportivo durante le prove ufficiali comporterà sanzioni o squalifiche dalla classifica generale." },
  { chiave:"rule2", titolo:"Classi di Imbarcazioni", contenuto:"Le competizioni si svolgono principalmente sulla classe America's Cup Class (ACC/V5) o su altre classi concordate dal comitato di regata prima dell'inizio della stagione." },
  { chiave:"rule3", titolo:"Iscrizioni alle Regate", contenuto:"<strong>Come iscriversi:</strong> dalla pagina <em>Calendario Gare</em>, premendo «Iscriviti» sulla gara desiderata (è necessario l'accesso). Puoi annullare la tua iscrizione con «Annulla iscrizione».<ul><li><strong>Chiusura iscrizioni:</strong> si chiudono <strong>2 ore prima</strong> dell'orario di partenza; oltre tale termine non è più possibile iscriversi o disiscriversi.</li><li><strong>Eventi aperti:</strong> gli eventi di tipo «aperto» <strong>non</strong> prevedono iscrizione né classifica.</li><li><strong>Chi può iscriversi:</strong> i soci registrati al circolo.</li></ul>" },
  { chiave:"rule4", titolo:"Tipi di Evento", contenuto:"Gli eventi in calendario sono di tre tipi:<ul><li><strong>Ufficiale:</strong> gara del circolo con iscrizione e classifica.</li><li><strong>Speciale:</strong> evento speciale con iscrizione e classifica.</li><li><strong>Aperto:</strong> evento dimostrativo o amichevole, <strong>senza</strong> iscrizione e <strong>senza</strong> classifica.</li></ul>Il tipo di evento è indicato su ogni scheda gara in <em>Calendario Gare</em>." },
  { chiave:"rule5", titolo:"Formato delle Regate", contenuto:"Ogni evento può comprendere da <strong>1 a 3 regate</strong>: il numero di prove è indicato sulla scheda della gara. La classifica dell'evento tiene conto dei risultati di tutte le prove disputate." },
  { chiave:"rule6", titolo:"Punteggi e Classifiche", contenuto:"<strong>Sistema Low Point.</strong> Nelle singole prove vince chi totalizza meno punti (1° = 1 pt, 2° = 2 pt, …).<ul><li><strong>Singole regate / eventi:</strong> punti in base all'ordine di arrivo; eventuali scarti sono definiti a inizio stagione.</li><li><strong>Classifica generale (per anno):</strong> ogni regata conta per <em>tutti</em> i soci; chi non partecipa riceve punti di penalità pari al <strong>numero di partecipanti alla regata + 1</strong> (peggio dell'ultimo). La classifica è la somma di tutti i punti dell'anno e vi compaiono tutti i membri del circolo.</li></ul>" },
  { chiave:"rule7", titolo:"Stati dei Risultati", contenuto:"<strong>OK:</strong> arrivo regolare; i punti sono assegnati in base alla posizione ottenuta.<ul><li><strong>DNF</strong> — non arrivato (Did Not Finish).</li><li><strong>DNS</strong> — non partito (Did Not Start).</li><li><strong>DSQ</strong> — squalificato (Disqualified).</li><li><strong>RET</strong> — ritirato (Retired).</li></ul>Ai risultati non regolari non vengono assegnati punti di posizione; si applicano le penalità previste dalla regola dei punteggi." },
  { chiave:"rule8", titolo:"Proteste e Reclami", contenuto:"Per contestare una condotta in regata è disponibile la pagina <em>Proteste</em>.<br><br>La protesta deve indicare: la <strong>gara</strong>, il <strong>concorrente protestato</strong>, l'eventuale <strong>regola contestata</strong>, il <strong>momento</strong> dell'episodio, una <strong>descrizione dei fatti</strong> e, se possibile, <strong>testimoni</strong> e <strong>allegati</strong> (immagini o PDF).<br><br>Le proteste sono esaminate dalla Direzione di Regata. Gli esiti possibili sono: <strong>in esame</strong>, <strong>accolta</strong>, <strong>respinta</strong> o <strong>ritirata</strong> dal protestante." },
  { chiave:"rule9", titolo:"Squadre e Team", contenuto:"Le squadre del circolo sono gestite dalla Direzione. Ogni team ha un <strong>capitano</strong>, una descrizione, un <strong>logo</strong> e un <strong>colore</strong> identificativo, ed è mostrato pubblicamente nella pagina <em>Team</em> con l'elenco dei membri. L'appartenenza a una squadra non incide sui punteggi individuali in classifica." },
  { chiave:"rule10", titolo:"Sanzioni e Penalità", contenuto:"In caso di violazioni del presente regolamento o di comportamento antisportivo, la Direzione di Regata può applicare:<ul><li>un <strong>richiamo</strong> o un'ammonizione;</li><li>una <strong>penalità</strong> in punti o la squalifica dalla singola prova;</li><li>la <strong>squalifica dalla classifica</strong> generale o dall'evento, nei casi più gravi o in caso di recidiva.</li></ul>Le sanzioni possono riguardare anche la condotta nei canali ufficiali del circolo (es. Discord)." },
  { chiave:"rule11", titolo:"Albo d'Oro", contenuto:"L'<em>Albo d'Oro</em> raccoglie i vincitori di ogni evento del circolo. I vincitori vengono registrati automaticamente al termine dell'inserimento dei risultati di una gara." }
];

var rows = []; // stato locale

function esc(s){
  if(s==null)return"";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function el(id){ return document.getElementById(id); }
function notify(msg,type){
  if(typeof status==="function"){ status(msg,type); return; }
  var e=el("admin-status"); if(!e)return;
  e.textContent=msg||""; e.className="admin-status"+(type?" "+type:"");
  clearTimeout(notify._t);
  if(msg)notify._t=setTimeout(function(){e.textContent="";e.className="admin-status";},4000);
}
function isBuiltin(r){ return !!(r && r.chiave && /^rule\d+$/.test(r.chiave)); }

async function load(){
  var box = el("reg-list");
  if(!box) return;
  if(!window.CVI || !CVI.supabase){ box.innerHTML='<p class="loading-text">Supabase non disponibile.</p>'; return; }
  box.innerHTML='<p class="loading-text">Caricamento…</p>';
  var hint = el("reg-sql-hint");
  try{
    var res = await CVI.supabase.from("regolamento_regole").select("*").order("ordine", { ascending:true });
    if(res.error) throw res.error;
    rows = res.data || [];
    if(hint) hint.style.display="none";
    render();
  }catch(e){
    box.innerHTML='';
    if(hint){ hint.style.display="block"; hint.textContent="Errore: "+(e.message||e)+" — verifica la tabella regolamento_regole (esegui regolamento-sql.sql su Supabase)."; }
  }
}


function render(){
  var box = el("reg-list");
  if(!box) return;
  if(!rows.length){
    box.innerHTML = '<p class="loading-text">Nessuna voce configurata: la pagina <a href="regolamento.html" target="_blank" style="color:#7dd3fc">Regolamento</a> mostra l\'elenco statico predefinito. Usa “Importa regole attuali” per gestirlo da qui.</p>';
    return;
  }
  var h = '';
  rows.forEach(function(r,i){
    var b = isBuiltin(r);
    h += '<div class="admin-card" data-idx="'+i+'" style="margin-bottom:0.6rem">'
      +  '<div class="admin-card-head">'
      +    '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">'
      +      '<span class="role-badge">'+(i+1)+'</span>'
      +      '<strong>'+(esc(r.titolo)||'(senza titolo)')+'</strong>'
      +      (b ? ' <span class="meta">integrata</span>' : ' <span class="meta">nuova</span>')
      +    '</div>'
      +    '<div style="display:flex;gap:0.35rem;flex-wrap:wrap">'
      +      '<button type="button" class="btn-ghost reg-up" data-idx="'+i+'" title="Sposta su">↑</button>'
      +      '<button type="button" class="btn-ghost reg-down" data-idx="'+i+'" title="Sposta giù">↓</button>'
      +      '<button type="button" class="btn-avviso-del reg-del" data-idx="'+i+'">Elimina</button>'
      +    '</div>'
      +  '</div>'
      +  '<label style="display:flex;align-items:center;gap:0.45rem;margin-top:0.5rem;font-size:0.85rem;color:#94a3b8">'
      +    '<input type="checkbox" class="reg-vis" data-idx="'+i+'"'+(r.visibile===false?"":" checked")+'> Visibile nell\'indice'
      +  '</label>'
      +  '<details style="margin-top:0.5rem">'
      +    '<summary style="cursor:pointer;color:#7dd3fc;font-size:0.85rem;font-weight:600">Modifica titolo e contenuto</summary>'
      +    '<label class="adm-label" style="margin-top:0.5rem">Titolo</label>'
      +    '<input class="adm-input reg-tit" data-idx="'+i+'" style="width:100%" value="'+esc(r.titolo)+'">'
      +    '<label class="adm-label" style="margin-top:0.5rem">Contenuto (HTML consentito)</label>'
      +    '<textarea class="adm-input reg-con" data-idx="'+i+'" rows="5" style="width:100%">'+esc(r.contenuto||"")+'</textarea>'
      +    (b ? '<p class="meta" style="margin-top:0.4rem">Regola integrata: le traduzioni (EN/FR/ES) restano quelle di default; le modifiche valgono solo per l\'italiano.</p>' : '')
      +  '</details>'
      + '</div>';
  });
  box.innerHTML = h;
  wireRows();
}


function syncFromDom(){
  document.querySelectorAll('#reg-list .admin-card').forEach(function(card){
    var i = parseInt(card.getAttribute('data-idx'),10);
    if(!rows[i]) return;
    var t = card.querySelector('.reg-tit');
    var c = card.querySelector('.reg-con');
    var v = card.querySelector('.reg-vis');
    if(t) rows[i].titolo = t.value;
    if(c) rows[i].contenuto = c.value;
    if(v) rows[i].visibile = v.checked;
  });
}

function move(from, to){
  if(to<0 || to>=rows.length) return;
  syncFromDom();
  var tmp = rows[from];
  rows[from] = rows[to];
  rows[to] = tmp;
  render();
}

function wireRows(){
  document.querySelectorAll('#reg-list .reg-up').forEach(function(b){
    b.onclick = function(){ var i=parseInt(b.getAttribute('data-idx'),10); move(i, i-1); };
  });
  document.querySelectorAll('#reg-list .reg-down').forEach(function(b){
    b.onclick = function(){ var i=parseInt(b.getAttribute('data-idx'),10); move(i, i+1); };
  });
  document.querySelectorAll('#reg-list .reg-del').forEach(function(b){
    b.onclick = function(){
      var i = parseInt(b.getAttribute('data-idx'),10);
      syncFromDom();
      rows.splice(i,1);
      render();
    };
  });
}

function addRow(){
  syncFromDom();
  rows.push({ id:"tmp-"+Date.now(), chiave:null, titolo:"", contenuto:"", visibile:true });
  render();
}

function seed(){
  if(rows.length){ notify("Ci sono già voci: eliminale o usa “Ripristina predefinito”","err"); return; }
  rows = BUILTIN.map(function(b,i){
    return { id:"tmp-seed-"+i, chiave:b.chiave, titolo:b.titolo, contenuto:b.contenuto, visibile:true };
  });
  render();
  notify("Regole importate: premi “Salva” per applicare","ok");
}


async function save(){
  syncFromDom();
  var btn = el("reg-save-btn"); if(btn) btn.disabled = true;
  try{
    for(var k=0;k<rows.length;k++){
      var r = rows[k];
      var payload = { ordine:k, chiave:r.chiave||null, titolo:r.titolo||"", contenuto:r.contenuto||"", visibile:r.visibile!==false, updated_at:new Date().toISOString() };
      var res;
      if(r.id && String(r.id).indexOf("tmp-")!==0){
        res = await CVI.supabase.from("regolamento_regole").update(payload).eq("id", r.id);
      }else{
        res = await CVI.supabase.from("regolamento_regole").insert(payload);
      }
      if(res.error) throw res.error;
    }
    notify("Regolamento salvato","ok");
    await load();
  }catch(e){ notify(e.message||e,"err"); }
  finally{ if(btn) btn.disabled = false; }
}

async function resetAll(){
  if(!confirm("Eliminare tutte le voci? La pagina Regolamento tornerà all'elenco statico predefinito.")) return;
  var btn = el("reg-reset-btn"); if(btn) btn.disabled = true;
  try{
    var res = await CVI.supabase.from("regolamento_regole").delete().neq("id","00000000-0000-0000-0000-000000000000");
    if(res.error) throw res.error;
    rows = [];
    render();
    notify("Ripristinato elenco predefinito","ok");
  }catch(e){ notify(e.message||e,"err"); }
  finally{ if(btn) btn.disabled = false; }
}

function wireTab(){
  var tab = document.querySelector('.admin-tab[data-tab="regolamento"]');
  if(tab && !tab._regWired){ tab._regWired = true; tab.addEventListener("click", function(){ setTimeout(load, 200); }); }
  var add = el("reg-add-btn"); if(add && !add._wired){ add._wired = true; add.onclick = addRow; }
  var sv = el("reg-save-btn"); if(sv && !sv._wired){ sv._wired = true; sv.onclick = save; }
  var sd = el("reg-seed-btn"); if(sd && !sd._wired){ sd._wired = true; sd.onclick = seed; }
  var rs = el("reg-reset-btn"); if(rs && !rs._wired){ rs._wired = true; rs.onclick = resetAll; }
}

function init(){ wireTab(); }

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(init,900); setTimeout(init,2000); });
}else{
  setTimeout(init,900);
  setTimeout(init,2000);
}
})();

