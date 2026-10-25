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

Gli script di riferimento sono nella root: `profiles-rls-audit-sql.sql`, `security-rls-hardening-sql.sql`, `membership-audit-sql.sql`, `membership-gating-sql.sql`, `gare-password-sql.sql`, `allenamenti-sql.sql`, `proteste-sql.sql`, `tornei-sql.sql`, `tornei-password-sql.sql`, `downloads-sql.sql`, `member-messages-sql.sql`, `biblioteca-sql.sql`, `tutor-sql.sql`. Eseguili in un progetto di test prima della produzione e conserva l'ordine di applicazione.

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


## Link amici (banner in Home)

- Tabella Supabase: `public.siti_amici` — creata/aggiornata da `siti-amici-sql.sql` (RLS inclusa: lettura pubblica dei soli link attivi, scrittura per admin/scorer).
- Admin → tab **Link amici**: crea/modifica/elimina i link, li attiva o nasconde e ne cambia l'ordine (frecce ↑/↓). Il pannello è in `siti-amici-admin.js`.
- Pagina dedicata: `siti-amici.html`, raggiungibile dal menu **Community ▾** (Galleria, Discord, Siti amici) e dal link nel footer. In Home il banner è mostrato sopra la riga “Classifica generale / Ultime regate”.
- Home: `siti-amici.js` mostra il banner "Siti amici & link utili" subito sotto la dashboard. Usa una cache locale, quindi il banner è immediato, e ha un elenco di fallback se Supabase non risponde.
- Multilingua: i campi `nome_en`/`nome_fr`/`nome_es` e `descrizione_en`/`descrizione_fr`/`descrizione_es` (opzionali) si compilano dal tab **Link amici** → “Traduzioni”. Se sono vuoti, nelle altre lingue si usa il testo italiano. Le colonne vengono create dallo script `siti-amici-sql.sql`.

Se il tab non mostra nulla: esegui `siti-amici-sql.sql` nel SQL Editor di Supabase e ricarica la pagina.


- Notifiche email e promemoria gara.
- PWA + push notification.
- Header di sicurezza completi (CSP, HSTS): GitHub Pages non li consente, valutare Cloudflare Pages mantenendo lo stesso repo. La meta `referrer` è già impostata su tutte le pagine.

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
