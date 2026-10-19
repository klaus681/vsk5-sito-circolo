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

Le pagine principali sono `index.html`, `gare.html`, `classifiche.html`, `calendario.html`, `team.html`, `membri.html`, `profilo.html`, `admin.html`, `download.html` e le sezioni tornei/allenamenti/biblioteca/tutor.

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

Gli script di riferimento sono nella root: `profiles-rls-audit-sql.sql`, `security-rls-hardening-sql.sql`, `allenamenti-sql.sql`, `proteste-sql.sql`, `tornei-sql.sql`, `downloads-sql.sql`, `member-messages-sql.sql`, `biblioteca-sql.sql`, `tutor-sql.sql`. Eseguili in un progetto di test prima della produzione e conserva l'ordine di applicazione.

### Migrazione RLS (Sprint 2)

Esegui `security-rls-hardening-sql.sql` nel SQL Editor di Supabase dopo un backup. La migrazione:

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

## Prossimi passi consigliati

- Spostare i webhook Discord in una Edge Function (punto 2 Sprint 2).
- Notifiche email e promemoria gara.
- PWA + push notification.
- Refactor di `common.js` in locale (oggi carica una versione remota via `document.write`).
