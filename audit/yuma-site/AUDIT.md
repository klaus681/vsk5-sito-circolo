# Audit tecnico — `klaus681/yuma-site`

**Data:** 31/10/2026 · **Commit analizzato:** `6b4b248` (main) · **Metodo:** lettura statica di `index.html`, `app.js`, `i18n.js`, `supabase/*.sql` + verifiche automatiche su chiavi i18n e ID del DOM.

---

## 1. Cos'è

Sito vetrina one-page statico (nessun build step, deploy da GitHub Pages) per il team **YUMA** (Virtual Skipper), con backend **Supabase** (Auth + Postgres + RLS).

| File | Dimensione | Ruolo |
|---|---|---|
| `index.html` | 104 KB · 302 righe | pagina unica: nav, hero, storia, trofei, roster, "Unisciti", area membri, modale admin |
| `app.js` | 34 KB · 628 righe | client Supabase, auth, CRUD (`site_content`, `members`, `candidature`, `profiles`) |
| `i18n.js` | 23 KB · 479 righe | dizionari IT / EN / ES / FR |
| `supabase/config.js` | — | **codice morto** (mai referenziato) |
| `supabase/schema.sql` · `members.sql` · `registration.sql` · `fix_rls.sql` | — | 4 migrazioni SQL sovrapposte |
| `yuma logo 25 logo png` | 1 MB | binario **senza estensione e non utilizzato** |

Stack: HTML statico + Tailwind Play CDN + `@supabase/supabase-js@2` (UMD) + Google Fonts. Nessun bundler, nessun test, nessuna CI.

---

## 2. Cosa funziona (verificato)

| Verifica | Esito |
|---|---|
| Chiavi i18n usate in HTML (47) presenti in it/en/es/fr | ✅ 0 mancanti |
| Chiavi i18n usate da JS (13: `area_*`, `alert_pending`) presenti in it/en/es/fr | ✅ 0 mancanti; `t()` supporta interpolazione `{name}` |
| ID del DOM referenziati in `app.js` | ✅ tutti presenti (l'unico "mancante", `areaMembriList`, è creato a runtime da `renderAreaMembri()`, riga 584) |
| `escapeHtml()` applicato ai sink `innerHTML` con dati utente (roster, membri admin, candidature, lista utenti) | ✅ applicato |
| Chiavi: solo `anon key` nel frontend, nessuna `service_role` | ✅ |
| RLS abilitata su `site_content`, `candidature`, `profiles`, `members` | ✅ |

---

## 3. Problemi trovati

### P1 — Funzionalità rotte in produzione

**1. `deleteCandidatura()` non può mai funzionare — manca la policy DELETE**
`app.js:519-528` esegue `from('candidature').delete()`, ma **nessuna** delle migrazioni crea una policy `for delete` su `public.candidature` (`schema.sql:104-130` e `fix_rls.sql:78-89` definiscono solo insert/select/update). Con RLS attiva e nessuna policy, il DELETE viene sempre negato: il pulsante "Elimina" nel pannello admin restituisce l'errore che il codice stesso suggerisce ("esegui in Supabase lo SQL per permettere DELETE all'admin"), SQL che non è mai stato scritto.
→ Fix: `supabase/99-fix-policies.sql` sezione 4.

**2. L'elenco dell'Area Membri mostra solo l'utente loggato**
`loadApprovedMembers()` (`app.js:531-541`) fa `select` su **tutti** i profili con `status='approved'`, ma la policy di lettura su `profiles` è `id = auth.uid() or public.is_admin()` (`fix_rls.sql:34-37`, `registration.sql:47-51`). Per un membro normale la RLS restituisce **solo la propria riga**: la card "Membri" (`app.js:589-606`) mostra quindi 1 solo nominativo (se stesso) invece dell'equipaggio.
→ Fix: `supabase/99-fix-policies.sql` sezioni 1-2.

### P2 — Sicurezza

**3. Escalation di privilegi latente sulla policy INSERT di `profiles`**
`registration.sql:59-63`:
```sql
create policy "insert own profile" on public.profiles for insert
  to authenticated with check (id = auth.uid());
```
Nessun vincolo su `role`/`status`. Un utente autenticato può inserire **la propria** riga con `role='admin', status='approved'`, e poiché `is_admin()` legge proprio `profiles.role`, diventerebbe admin.
Oggi è mitigato solo per caso: il trigger `on_auth_user_created` (`registration.sql:32-35`) crea già la riga al signup, quindi l'`upsert` di `app.js:188` degrada a UPDATE, che è negato dalla policy admin-only. Se il trigger non è attivo (setup nuovo, `schema.sql` eseguito senza `registration.sql`, trigger droppato) la falla è aperta.
→ Fix: `supabase/99-fix-policies.sql` sezione 3.

**4. Le 4 migrazioni SQL si sovrascrivono a vicenda (authz non deterministica)**
`is_admin()` e le policy sono ridefinite 3 volte con semantiche **diverse**:
- `schema.sql:48-65` usa `role='admin'` e non conosce `status`;
- `registration.sql:37-45` richiede `role='admin' and status='approved'`;
- `fix_rls.sql:2-20` accetta `role='admin' and status in (null,'approved','pending')` **oppure** l'email hardcoded da `auth.users`.

Vince l'ultimo file eseguito: rieseguire `fix_rls.sql` dopo `registration.sql` riapre i privilegi admin anche ai profili `pending`. Non esiste un ordine documentato (`supabase/README.md` cita solo `schema.sql`).
→ Raccomandato: una sola migrazione consolidata e idempotente, con README che dichiara l'ordine; assorbire `fix_rls.sql`.

**5. Email admin hardcoded in 5 punti**
`app.js:77`, `app.js:79`, `app.js:82`, `fix_rls.sql:18,23-31`, `registration.sql:23-24,65-70`, `schema.sql:59`. Il controllo frontend è solo cosmetico (l'autorizzazione reale è la RLS, ✅), ma le occorrenze SQL sono autorizzazione effettiva: cambiare admin richiede 5 edit coerenti.
→ Raccomandato: tabella `public.admins(email)` o `auth.users.raw_app_meta_data->>'role'`, letta da un unico `is_admin()`.

**6. `candidature` in INSERT aperta a `anon` senza limiti**
`schema.sql:104-108`: `with check (true)`, nessun limite di lunghezza né rate limit → vettore di spam/abuso diretto sulla REST API pubblica (la anon key è nel client per definizione). Permette anche payload enormi in tabella.
→ Fix: `supabase/99-fix-policies.sql` sezione 5 (constraint di lunghezza) + honeypot/captcha lato form.

**7. Messaggi d'errore iniettati senza escape**
`app.js:224` e `app.js:495` (`box.innerHTML = '<p …>' + res.error.message + '</p>'`). Origine = server Supabase, rischio effettivo basso, ma è l'unico sink `innerHTML` senza `escapeHtml`.

**8. `escapeHtml()` non gestisce l'apostrofo**
`app.js:9-11` fa escape di `& < > "` ma non di `'`. Con l'uso attuale (attributi fra doppi apici, `value="…"`) è corretto, ma diventa XSS se riusato in contesti con apici singoli (es. `onclick='…'`).

### P3 — Igiene, performance, SEO

| # | Problema | Dettaglio |
|---|---|---|
| 9 | **1 MB di asset inutile** | `yuma logo 25 logo png` è un blob senza estensione (verosimilmente il `.psd`, rinominato in `c9262c6`), non referenziato da nessuna pagina. Il logo in nav è testo (`index.html:55`). → rimuovere, oppure esportare PNG/WebP e usarlo come `favicon` + `og:image` |
| 10 | **`supabase/config.js` inutilizzato** | nessun file lo importa; duplica URL + anon key già hardcoded in `app.js:1-2` |
| 11 | **Zero social/SEO meta** | assenti `og:*`, `twitter:*`, `rel="icon"`, `link rel="canonical"`, `hreflang` — nonostante 4 lingue e `title`+`description` presenti (righe 6-7) |
| 12 | **Tailwind Play CDN in produzione** | `index.html:8`: runtime JIT ~100 KB+ e FOUC; per un one-pager conviene il CSS precompilato |
| 13 | **`app.js:188` codice morto che fallisce in silenzio** | l'`upsert` su `profiles` dopo `signUp` è negato dalla RLS (UPDATE admin-only); il `display_name` è già inserito dal trigger da `raw_user_meta_data` (`registration.sql:25`), alimentato da `app.js:180`. L'errore non è controllato → rimuovere o gestire |
| 14 | **Nessun README/.gitignore in root** | `supabase/README.md` è il solo doc; la history mostra `index.html`, `app.js`, `i18n.js` cancellati e ri-caricati più volte via web UI (`46a5efe`, `18dfff1`, `36b66f6`, `861fc06`) — 104 KB monolitici, difficili da revisionare |

---

## 4. Priorità suggerita

1. Eseguire `supabase/99-fix-policies.sql` → sblocca 2 funzioni rotte (P1) e chiude l'escalation (P2.3).
2. Consolidare le migrazioni SQL in una sola (P2.4) e centralizzare l'identità admin (P2.5).
3. Constraint/anti-spam su `candidature` (P2.6).
4. Pulizia repo: rimuovere il blob da 1 MB e `config.js`, aggiungere `README` + `og:`/`favicon` (P3).

---

## 5. File consegnati

| File | Cosa |
|---|---|
| `AUDIT.md` | questo report |
| `supabase/99-fix-policies.sql` | patch RLS idempotente: fix P1.1, P1.2, P2.3, P2.6 + indice. Validata con un parser PostgreSQL completo (`sql-parser-cst`, 12 statement). **Non ancora eseguita**: va lanciata nel SQL Editor del progetto Supabase `eefszkqpfwwxoljauobs` |
| `verify/check-i18n.js` | `node verify/check-i18n.js <repo>` → ricalcola la copertura i18n (esito attuale: 60 chiavi, 0 mancanti in it/en/es/fr; exit code 1 se qualcosa manca) |

Nessuna modifica è stata applicata al codice di `yuma-site`: il repo pubblico non ha branch di lavoro, quindi le correzioni JS/HTML proposte sono descritte qui e non ancora scritte.
