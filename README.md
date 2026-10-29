# Circolo Velico Italia – Sito ufficiale

Sito statico del Circolo Velico Italia Virtual (Virtual Skipper 5), pubblicato su GitHub Pages con dominio custom `circolovelicoitalia.it`.

## Stack

- HTML, CSS e JavaScript vanilla, senza build step.
- Backend: Supabase (auth, database PostgreSQL, storage).
- Hosting: GitHub Pages (`main` → produzione).
- Notifiche community: webhook Discord.

## Struttura

```
*.html                 pagine pubbliche e area riservata
*.js                   logica per pagina e moduli condivisi
*.css                  stile globale, mobile e componenti
fonts/ + fonts.css     font self-hosted (Plus Jakarta Sans, Playfair Display)
                       licenze OFL incluse in fonts/OFL-*.txt
*.sql                  script SQL / policy RLS da applicare su Supabase
                       (partire da security-rls-hardening-sql.sql)
manifest.webmanifest   configurazione PWA (icone, shortcut, installazione)
sw.js                  service worker: cache asset, offline.html, no cache API
pwa.js / a11y.js       prompt installazione/aggiornamento e focus trap modali
offline.html           fallback per le pagine non ancora salvate in cache
icon-*.png             icone PWA 192/512/maskable generate dal logo
sitemap.xml, robots.txt
```

Le pagine principali sono `index.html`, `gare.html`, `classifiche.html`, `calendario.html`, `team.html`, `membri.html`, `profilo.html`, `admin.html`, `risorse.html` (Download e Risorse) e le sezioni tornei/allenamenti/biblioteca/tutor.

## Sviluppo locale

Il sito non richiede installazione di dipendenze. Avvia un server statico dalla root:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

Non aprire le pagine con `file://`: Supabase e i path assoluti richiedono HTTP.

## Configurazione Supabase

La URL e la anon key sono lette da `common.js` (client Supabase condiviso). La anon key è pubblica per design: **la sicurezza dipende interamente dalle policy RLS**.

Prima di andare in produzione verifica:

1. RLS attiva su tutte le tabelle (`profiles`, `gare`, `iscrizioni_gare`, `risultati_gara`, `teams`, `tornei`, `allenamenti`, `proteste`, `gallery`, `downloads`, `site_settings`, `member_messages`, ...).
2. Un utente `authenticated` può modificare solo il proprio profilo e **non** i campi `role` / `is_admin`.
3. Solo `admin` / `scorer` possono scrivere su gare, risultati, contenuti e impostazioni.
4. `site_settings` non espone segreti (webhook Discord) al client.
5. I bucket storage hanno policy di lettura/scrittura coerenti con i ruoli.

Gli script di riferimento sono nella root: `profiles-rls-audit-sql.sql`, `security-rls-hardening-sql.sql`, `membership-audit-sql.sql`, `membership-gating-sql.sql`, `ban-list-sql.sql`, `ban-account-fix-sql.sql`, `eventi-aperti-sql.sql`, `eventi-risultati-vsk-sql.sql`, `gare-password-sql.sql`, `allenamenti-sql.sql`, `proteste-sql.sql`, `tornei-sql.sql`, `tornei-password-sql.sql`, `downloads-sql.sql`, `member-messages-sql.sql`, `biblioteca-sql.sql`, `tutor-sql.sql`. Eseguili in un progetto di test prima della produzione e conserva l'ordine di applicazione.

La password server delle gare (`gare-password-sql.sql`) è volutamente in una tabella separata (`gare_password`) e non in `gare`: `gare` è leggibile anche in anonimo, quindi la password è restituita solo agli utenti autenticati tramite RLS. Lo script va eseguito una volta nel SQL Editor di Supabase: finché la tabella non esiste il campo password non viene salvato e il pannello admin mostra un avviso.

Lo stesso criterio vale per i tornei (`tornei-password-sql.sql`, tabella `torneo_password`): `tornei` è leggibile in anonimo, quindi la password del server è mostrata nel banner home e nella pagina del torneo solo ai soci loggati.

### Approvazione soci e audit log

`membership-audit-sql.sql` introduce:
- `public.profiles.stato` (`pending` / `attivo` / `sospeso`): i profili esistenti diventano `attivo`, i nuovi account nascono `pending`.
- helper `public.is_club_member()`: le password di gare e tornei sono leggibili **solo dai soci approvati**.
- guard trigger: un socio non può auto-approvarsi né cambiarsi ruolo.
- `public.audit_log` con trigger su gare, risultati, tornei, torneo_gare, risorse e profili (visibile solo agli admin).

Dopo l'esecuzione approva o rifiuta i nuovi soci da **Admin → Membri** (pulsanti sulle card).

`membership-gating-sql.sql` estende il blocco ai contenuti riservati: un account `pending`/`sospeso` vede solo le risorse pubbliche (non quelle `visibilita='soci'`), non scarica i file del bucket `risorse` riservati, non accede a download/biblioteca/tutor e non può iscriversi a gare, tornei e allenamenti né inviare proteste. Anche l'elenco soci è nascosto finché non viene approvato.

### Ban permanente degli account

- `ban-list-sql.sql` crea `public.ban_list` (email bannate) e la funzione `public.is_email_banned(text)`, usata da login e registrazione.
- `ban-account-fix-sql.sql` è lo **script unico e autosufficiente** da eseguire dopo le migrazioni base (`security-rls-hardening-sql.sql`, `membership-audit-sql.sql`): crea/aggiorna anche `ban_list` se manca, aggiunge `bannato` ai valori ammessi da `profiles.stato` (senza questo passaggio l'update del profilo fallisce e il Ban admin non viene salvato), blocca lato server le registrazioni e la creazione di profili con email in `ban_list` (trigger su `auth.users` e `profiles`) e aggiunge l'helper `public.is_user_banned(uuid)`. È idempotente: si può rieseguire senza rischi e non serve eseguire `ban-list-sql.sql` prima.

Da **Admin → Membri** il pulsante **Ban** imposta `stato = 'bannato'`, azzera team/ruolo, elimina le iscrizioni e inserisce l'email in `ban_list`; **Togli ban** riporta lo stato ad `attivo` e rimuove l'email dalla lista. Un account bannato non può accedere (login e `membership-banner.js` chiudono la sessione), non rientra nell'elenco soci, non compare nelle classifiche pubbliche e non può registrarsi di nuovo con la stessa email.

### Eventi con regate VSK

Gli **Eventi** (`eventi_aperti`) possono avere una classifica unica (`Posizione;Nickname;Team;Note`) **oppure** più regate importate dai log di Virtual Skipper, con la stessa logica di Serie Aperte e Tornei:

- `eventi-risultati-vsk-sql.sql` (dopo `eventi-aperti-sql.sql`) rimuove il vincolo `unique (evento_id, posizione)` — con più regate la stessa posizione si ripete —, garantisce le colonne VSK (`regata_id`, `nickname_raw`, `account_vsk`, `tempo_ms`, `stato`, `sorgente_file`) e crea l'indice `unique (evento_id, sorgente_file)` che impedisce di importare due volte lo stesso file.
- In **Admin → Eventi** apri un evento in *Modifica* e usa **⚡ Importa log VSK**: ogni `Result_*.csv` diventa una regata (titolo/data dal nome file), i tempi e gli stati vengono salvati e i file già importati vengono saltati. Nello stesso box si impostano **Low/High Point** e gli **scarti**.
- La pagina pubblica `evento.html` mostra la classifica a punti (con scarti) e, per ogni regata, una tabella richiudibile con **tempo e distacco** dal vincitore; il widget in Home usa la stessa classifica.
- Tutti gli import (Gare, Serie, Tornei, Eventi) usano lo stesso parser (`2-serie-aperte-lib.js` → `parseVskCsv` + `decodeBuffer`): stesso risultato a parità di log, nickname ripuliti dai codici Nadeo, stati `FIN/DNF/DNS/DSQ/RET` riconosciuti da una colonna *Stato* quando presente.

Il comparto **Download e Risorse** (`risorse.html`) unifica le vecchie pagine Download e Biblioteca. I dati sono in `public.risorse`; la migrazione da `downloads` e `biblioteca` è inclusa in `risorse-sql.sql` (idempotente, le vecchie tabelle restano intatte come fallback). Fino all'esecuzione dello script la pagina funziona in modalità compatibilità leggendo le vecchie tabelle per gli utenti loggati.

### Migrazione RLS (Sprint 2)

Esegui `security-rls-hardening-sql.sql` nel SQL Editor di Supabase dopo un backup. La migrazione è divisa in **6 blocchi con commit separati**: se un blocco fallisce, i precedenti restano applicati. L'ordine è: helper → vista pubblica → profili → site_settings → revoche → trigger di registrazione. L'ultimo blocco (`auth.users`) è opzionale e isolato: se fallisce, la sicurezza di profili e impostazioni resta attiva.

- chiude l'accesso anonimo a `profiles` (prima email, `role` e `is_admin` erano leggibili con la sola anon key);
- crea `profiles_public`, vista con le sole colonne sicure, usata dalle pagine pubbliche;
- impedisce l'escalation a `admin` tramite trigger;
- crea il profilo automaticamente alla registrazione (`handle_new_user`);
- nasconde i webhook/segreti di `site_settings`, lasciando leggibili le chiavi pubbliche;
- revoca l'accesso anon alle tabelle riservate.

Dopo la migrazione verifica con `security-rls-test-sql.sql` (sostituisci gli UUID di test). I webhook restano leggibili solo dagli admin: le notifiche Discord continuano a funzionare dal pannello admin, ma non sono più esposte agli altri utenti. Per spostarle completamente lato server serve una Edge Function (punto 2 dello Sprint 2).

Le pagine pubbliche leggono i profili da `profiles_public`. Se aggiungi una query pubblica su `profiles`, usa la vista e non la tabella.

**Ordine di deploy:** applica prima `security-rls-hardening-sql.sql` su Supabase e solo dopo pubblica le pagine aggiornate. Se il codice viene deployato prima della vista, le pagine pubbliche non riescono a leggere i profili.

## Ruoli

- `socio`: accesso area membri, profilo, iscrizioni, messaggi.
- `caposquadra`: gestione del proprio team.
- `scorer`: inserimento risultati/gare.
- `admin`: accesso completo al pannello `admin.html`.

Il pannello admin è protetto lato client **e** deve essere protetto lato database tramite RLS. Il solo controllo JavaScript non è una misura di sicurezza.

## Deploy

Il deploy avviene automaticamente da GitHub Pages sul branch `main`. Per modifiche:

```bash
git checkout -b nome-modifica
git add .
git commit -m "descrizione modifica"
git push -u origin nome-modifica
```

Apri una pull request, verifica le pagine principali e poi fai merge su `main`. Dopo il deploy tieni conto della cache GitHub Pages (circa 10 minuti).

## Convenzioni

- Non inserire segreti (service role key, webhook URL) nel codice client.
- Usa `esc()`/`textContent` per i dati provenienti dal database prima di assegnarli a `innerHTML`.
- Mantieni `defer` o script a fine body; evita `document.write`.
- Aggiorna `sitemap.xml` quando aggiungi una pagina pubblica.
- Aggiungi `noindex` alle pagine riservate (profilo, messaggi, admin, biblioteca, tutor).
- Per i font usare `fonts.css`; non reintrodurre Google Fonts via CDN.
- Il core condiviso è self-hosted in `cvi-core.js` (caricato da `common.js`) e il calendario in `calendario.js`: non reintrodurre dipendenze da CDN GitHub/jsDelivr.


## Link amici (pagina dedicata)

- Tabella Supabase: `public.siti_amici` — creata/aggiornata da `siti-amici-sql.sql` (RLS inclusa: lettura pubblica dei soli link attivi, scrittura per admin/scorer).
- Admin → tab **Link amici**: crea/modifica/elimina i link, li attiva o nasconde e ne cambia l'ordine (frecce ↑/↓). Il pannello è in `siti-amici-admin.js`.
- Pagina dedicata: `siti-amici.html`, raggiungibile dal menu **Community ▾** (Galleria, Discord, Siti amici). Il blocco **non** viene mostrato in Home.
- `siti-amici.js` popola solo il contenitore `#siti-amici-page`; su tutte le altre pagine non fa nulla. Usa una cache locale e un elenco di fallback se Supabase non risponde.
- Multilingua: i campi `nome_en`/`nome_fr`/`nome_es` e `descrizione_en`/`descrizione_fr`/`descrizione_es` (opzionali) si compilano dal tab **Link amici** → “Traduzioni”. Se sono vuoti, nelle altre lingue si usa il testo italiano. Le colonne vengono create dallo script `siti-amici-sql.sql`.

Se il tab non mostra nulla: esegui `siti-amici-sql.sql` nel SQL Editor di Supabase e ricarica la pagina.


- Notifiche email e promemoria gara.
- Push notification (la base PWA è già attiva: manifest, service worker, offline).
- Header di sicurezza completi (CSP, HSTS): GitHub Pages non li consente, valutare Cloudflare Pages mantenendo lo stesso repo. La meta `referrer` è già impostata su tutte le pagine.

## PWA e modalità offline

- `manifest.webmanifest` + `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`: il sito è installabile come app (Android/Chrome, iOS tramite “Aggiungi alla Home”). Il manifest include le shortcut verso Gare, Classifiche e Live.
- `sw.js` precarica shell, CSS, font principali, icone e core condiviso; per le navigazioni usa **network-first** con fallback alla cache e poi a `offline.html`. Gli asset statici usano **stale-while-revalidate**. Le richieste verso Supabase/CDN esterni non vengono mai intercettate, quindi i dati restano sempre freschi; `admin.html`, `profilo.html` e `messaggi.html` non vengono messi in cache.
- `pwa.js` mostra il prompt di installazione (solo su pagine pubbliche e con possibilità di chiuderlo per 14 giorni), l’avviso di nuova versione con pulsante **Aggiorna** e lo stato online/offline. Su iOS mostra le istruzioni per “Aggiungi alla Home”.
- `a11y.js` gestisce focus trap, `inert` sullo sfondo e ripristino del focus per tutti i `[role="dialog"]` (calendario, meteo, messaggi, risorse) e aggiunge `role="status"`/`aria-live` ai contenitori di messaggi asincroni.
- Dopo una modifica a un asset precaricato, incrementa `VERSION` in `sw.js` (e i `?v=` degli asset modificati): il vecchio service worker viene sostituito e l’utente vede il banner di aggiornamento.
- Per provare offline in locale usa `http://localhost:8080` (i service worker richiedono un contesto sicuro; `file://` non funziona).

## Live in tempo reale

`live.js` si iscrive a **Supabase Realtime** (`postgres_changes`) per `gare`, `iscrizioni_gare` e `risultati_gara`, filtrando sulla gara corrente. All’arrivo di una modifica ricarica iscritti e classifica in circa 400 ms, senza aspettare il polling. Il polling periodico resta come fallback (60 secondi quando il realtime è attivo) e il realtime rispetta le policy RLS.

Per abilitarlo esegui una volta `realtime-live-sql.sql` nel SQL Editor di Supabase: aggiunge le tre tabelle alla publication `supabase_realtime` e imposta `REPLICA IDENTITY FULL` per ricevere correttamente anche UPDATE/DELETE. Se lo script non viene eseguito il sito continua a funzionare con il solo polling.

## App Android (TWA)

Il sito può essere distribuito come **app Android reale** tramite Trusted Web Activity: nessuna riscrittura, l'app apre il sito a schermo intero usando Chrome. Il progetto Android si genera con **Bubblewrap** e si compila in **Android Studio**; in questo repo restano solo i file pubblici necessari.

- `.nojekyll` — disattiva Jekyll su GitHub Pages: senza questo file la cartella `.well-known` non viene pubblicata.
- `.well-known/assetlinks.json` — Digital Asset Links: package `it.circolovelicoitalia.app` + impronta SHA-256 della chiave di firma. Modello in `.well-known/assetlinks.json.example`.
- `scripts/twa-assetlinks.mjs` — genera `.well-known/assetlinks.json` leggendo l'impronta dalla keystore con `keytool`.
- Procedura completa (Bubblewrap, Android Studio, targetSdk 36, Play Store, troubleshooting): **[ANDROID-TWA.md](ANDROID-TWA.md)**.



## Notifiche Discord (Edge Function)

Il client (`discord-notify.js`) prova prima la function `notify-discord` e, solo se non è disponibile, usa il fallback diretto (che funziona unicamente per gli admin, perché la RLS nasconde i webhook agli altri ruoli). La function:

- autentica il chiamante e verifica che sia un socio `attivo`;
- legge il webhook da `site_settings` con la service role (il segreto non viene mai inviato al browser);
- accetta solo chiavi `discord_webhook*` e limita la dimensione dell'embed.

Deploy (dalla root del repo, con Supabase CLI autenticata):

```bash
supabase functions deploy notify-discord
```

Le variabili `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` sono iniettate automaticamente da Supabase. Se la function non viene deployata il sito continua a funzionare con il fallback.
