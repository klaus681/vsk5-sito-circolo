# yuma-site — sistemazione completa + due aree riservate

Serie di **6 commit** pronta da applicare a [klaus681/yuma-site](https://github.com/klaus681/yuma-site),
verificata su un clone pulito di `main` (`6b4b248`).

> Il bot non ha permessi di push sul repo `yuma-site` (403): la consegna è una serie di
> patch git applicabili.

## Applicare tutto

```bash
git clone https://github.com/klaus681/yuma-site.git
cd yuma-site
git checkout -b feat/aree-riservate-socio-yuma

# opzione A — un solo file
git am /percorso/serie-completa.patch

# opzione B — i 6 commit singoli, in ordine
git am /percorso/0001-*.patch /percorso/0002-*.patch \
       /percorso/0003-*.patch /percorso/0004-*.patch \
       /percorso/0005-*.patch /percorso/0006-*.patch

npm i --no-save jsdom && node tests/aree-riservate.test.js
```

Esito atteso: `TUTTI I CONTROLLI PASSATI`. Poi `git push -u origin feat/aree-riservate-socio-yuma`.

## I 6 commit

**0001 — feat: le due aree riservate**
| Area | Sezione | Chi la vede | Contenuto |
|---|---|---|---|
| **Area Soci** | `#area-soci` | approvati: `socio`, `yuma`, `admin` | ruolo, prossimi passi, blocco Download (placeholder), elenco membri |
| **Area YUMA** | `#area-yuma` (nuova) | **solo** `role='yuma'` (+`admin`), `status='approved'` | badge YUMA, card *Download equipaggio* e *Strumenti del team*, equipaggio YUMA attivo |

Nuova variabile `isYuma` (`loadUserProfile`), blocco in `updateAuthUI`, `renderAreaYuma()`,
link `.nav-area-yuma` (ridotti a un solo ingresso per area dal commit 0005),
17 chiavi i18n × 4 lingue, `clearArea()` che svuota le aree al
logout invece di lasciarle nascoste nel DOM, `ADMIN_EMAIL` centralizzato (erano 3 copie).

**0002 — fix(security)**
- `escapeHtml()` copre anche l'apostrofo (`&#39;`) → sicuro in qualunque contesto di attributo
- i 2 sink `innerHTML` con `res.error.message` ora passano da `escapeHtml`
- rimosso l'`upsert` su `profiles` dopo `signUp`: veniva **sempre** negato dalla RLS e
  l'errore era ignorato (`display_name` lo scrive già il trigger `handle_new_user()`)

**0003 — chore(supabase): `99-fix-policies.sql` canonico**
- entra nel repo e ridefinisce `is_admin()` in forma stretta (`role='admin'` **e**
  `status='approved'`, oppure email admin da `auth.users`)
- chiude l'ambiguità delle 4 migrazioni, dove vinceva l'ultima eseguita
- `schema.sql`, `registration.sql`, `fix_rls.sql` marcati come *file storico (passo N di 6)*

**0004 — chore: pulizia e SEO**
- rimosso `yuma logo 25 logo png`: 1 MB che era in realtà un **PSD** (`8BPS`), mai referenziato
- rimosso `supabase/config.js`: codice morto, duplicava URL e anon key
- `favicon.svg` disegnata a mano (vela + onda, colori del brand)
- `index.html`: `canonical`, `theme-color`, `robots`, 9 tag `og:` + 3 tag `twitter:`
- `README.md` in root
- repo da ~1,3 MB a **240 KB**

**0005 — style(aree): "Area Soci" e "YUMA Only"**
- **"Area Membri" → "Area Soci"**: link, titolo, label "Riservata ai soci", chiavi i18n in
  IT/EN/ES/FR (`Area Soci` / `Members Area` / `Área de Socios` / `Espace Membres`) e
  identificatori interni coerenti (`#area-soci`, `#areaSociContent`, `.nav-area-soci`,
  `renderAreaSoci()`)
- **"Area YUMA" → "YUMA Only"** (link, titolo e fallback HTML), label "Riservato all'equipaggio"
- rimossi i **doppioni**: "Area Membri" compariva due volte (nei link di navigazione *e*
  nella barra utente). Ora ogni area ha **un solo ingresso**: nella barra utente su
  desktop, nel menu mobile su smartphone
- `prettyName()`: se il `display_name` è un'email si mostra solo la parte prima della `@`
  → niente più `klaus68@hotmail.it` in evidenza nel saluto e nei chip
- il pulsante **"Candidati"** si nasconde quando sei loggato
- nuovi controlli nei test (dedupe link, nomi, pulsante) → **35 controlli**

**0006 — feat(admin): tutto quello che sta dentro le due aree è gestito dal pannello**
- pannello admin → nuovo tab **Aree**, visibile solo all'admin (come tutto il pannello),
  con due liste separate: **Area Soci** e **YUMA Only**
- ogni voce è una **scheda**: titolo, testo (anche multi-riga), link facoltativo, ordine e
  flag **visibile**, tutti modificabili inline, con **Salva** / **Elimina**; sotto ogni
  lista il form **"+ Aggiungi in Area Soci"** / **"+ Aggiungi in YUMA Only"**
- nuova tabella `area_items` (`supabase/101-aree-contenuti.sql`): niente più schede scritte
  nel codice — le due aree leggono dal DB filtrando per `area` e ordinando per `sort_order`
- restano automatiche solo le parti personali: la card del ruolo e l'elenco dei soci in
  Area Soci, l'elenco dell'equipaggio in YUMA Only
- 4 schede di partenza (seed) per non avere aree spoglie; **RLS**: i soci leggono
  `area='soci'`, l'equipaggio YUMA legge tutto, scrittura **solo `is_admin()`**,
  le schede non pubblicate non escono dal database
- i18n: rimosse 15 chiavi delle vecchie card statiche, aggiunte `area_empty` / `area_open`
- test → **43 controlli**

Barra risultante da loggato come YUMA/admin:
`Home · La Storia · Trofei · Equipaggio · Unisciti | 🇮🇹🇬🇧🇪🇸🇫🇷 👤 klaus68 · Area Soci · YUMA Only · ⚙️ Admin · Esci`

## Dopo l'applicazione: SQL su Supabase

Progetto `eefszkqpfwwxoljauobs` → SQL Editor, in ordine:

1. `supabase/99-fix-policies.sql` ← **fonte di verità** delle policy e di `is_admin()`
2. `supabase/100-aree-riservate.sql` ← helper `is_approved_member()` / `is_yuma()`
3. `supabase/101-aree-contenuti.sql` ← tabella `area_items` (le schede dentro le due aree) + policy + 4 schede di partenza

I primi due sbloccano due funzioni che oggi sono rotte: **eliminare una candidatura**
(mancava la policy `FOR DELETE`) e **l'elenco soci dell'Area Soci** (la RLS restituiva
solo la propria riga ai non-admin). Il terzo abilita il tab **Aree** del pannello admin.

## Prova manuale

1. Login `role='socio'` → vedi **Area Soci**, **non** YUMA Only
2. Login `role='yuma'` → vedi entrambe (Area Soci + YUMA Only)
3. Logout → spariscono e il contenuto viene svuotato dal DOM
4. Cambio lingua (bandierine) → le due aree si ri-renderizzano nella lingua scelta
5. Pannello Admin → tab Utenti → selettore ruolo per promuovere a `YUMA` / `Socio`
6. Pannello Admin → tab **Aree** → aggiungi una scheda in Area Soci (la vedono i soci) e una in YUMA Only (la vede solo l'equipaggio); modificane una esistente e togli la spunta "visibile" per nasconderla

## Contenuto della cartella

| File | Cosa |
|---|---|
| `serie-completa.patch` | i 6 commit in un unico mbox → `git am` |
| `0001…0006` | i singoli commit |
| `99-fix-policies.sql`, `100-aree-riservate.sql`, `101-aree-contenuti.sql` | copie pronte da incollare nel SQL Editor |
| `aree-riservate.test.js` | copia del test (va in `tests/`) |

## Ancora aperto (consapevole)

- La visibilità delle due aree è **lato client**: non è una protezione. I file della
  futura area download andranno protetti con le policy RLS del template.
- `og:image` assente: serve un PNG 1200×630 esportato dal PSD originale.
- Tailwind resta su Play CDN (nessun build step nel repo); precompilarlo è un
  miglioramento separato.
