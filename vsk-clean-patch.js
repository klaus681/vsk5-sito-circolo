/* CVI – patch cleanNick (rimuove caratteri non validi e codici $) */
(function(){
  function betterClean(raw){
    if(raw==null)return"";
    var s=String(raw);
    try{if(s.normalize)s=s.normalize("NFKC");}catch(e){}
    s=s.replace(/\u00a0/g," ");
    s=s.replace(/\$[0-9a-fA-F]{3}/gi,"");
    s=s.replace(/\$[isngzwomtlh$]/gi,"");
    s=s.replace(/\$[0-9a-fA-F]/gi,"");
    s=s.replace(/\$./g,"");
    s=s.replace(/\uFFFD/g,"");
    s=s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g,"");
    s=s.replace(/[\u0300-\u036F]/g,"");
    return s.replace(/\s+/g," ").trim();
  }
  function apply(){
    var L=window.CVISerieAperte;
    if(!L){setTimeout(apply,300);return;}
    L.cleanNick=betterClean;
  }
  apply();
  setTimeout(apply,1000);
  setTimeout(apply,3000);
})();
