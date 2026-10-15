---
name: 'Download visibility: show list to anonymous and require auth to download'
about: 'Make download list visible to anonymous users but require authentication to obtain files; refactor common.js to avoid synchronous XHR and ensure nav links fallback.'
labels:
  - enhancement
  - security
  - docs
---

Ho modificato la pagina dei download e lo script common.js su branch fix/download-public-view:

Cosa include questa PR:
- download.html: la lista dei download è visibile anche agli utenti anonimi; il pulsante di download effettivo è abilitato solo per utenti autenticati. Supporto per private_path + signed URL (Supabase Storage) se configurato.
- common.js: rimosso l'uso di XMLHttpRequest sincrono; ora usa fetch() asincrono e aggiunge un fallback che inserisce i link di navigazione (Proteste, Eventi aperti) se la patch remota non è raggiungibile.
- I file rimangono gestiti dall'admin come prima; la tabella downloads è ancora la fonte di verità.

Cosa fare prima del merge:
1. Verificare che i record nella tabella `downloads` abbiano `attivo = true` per i file che vuoi esporre.
2. Se hai file sensibili, spostali su un bucket privato in Supabase Storage e imposta `private_path` e `bucket` per quei record. Configura RLS/policy come descritto in questa PR.
3. Testare il flusso anonimo (si vede la lista) e autenticato (si possono scaricare i file).

I comandi che ho eseguito sono nel branch `fix/download-public-view`.

Note di sicurezza:
- Se i record contengono URL pubblici con token incorporati, chiunque potrà scaricare i file anche se la UI mostra il bottone solo agli autenticati. Sposta i file sensibili su storage privato o rimuovi token permanenti.

