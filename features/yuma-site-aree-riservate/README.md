# yuma-site — due aree riservate (Area Membri + Area YUMA)

Modifica pronta da applicare a [klaus681/yuma-site](https://github.com/klaus681/yuma-site).
Include già lo slot per la futura **Area Download**.

> Il bot che ha fatto il lavoro non ha permessi di push sul repo `yuma-site`
> (403), quindi la consegna è sotto forma di patch git applicabile.

## Cosa cambia

| Area | Sezione HTML | Chi la vede | Contenuto |
|---|---|---|---|
| **Area Membri** | `#area-membri` (esistente) | utenti loggati approvati: `socio`, `yuma`, `admin` | ruolo personale, prossimi passi, **blocco Download (placeholder)**, elenco membri |
| **Area YUMA** | `#area-yuma` (nuova) | **solo** `role = 'yuma'` (+ `admin`), con `status = 'approved'` | badge YUMA, card **Download equipaggio** e **Strumenti del team** (placeholder), equipaggio YUMA attivo |

File toccati:

| File | Diff |
|---|---|
| `index.html` | +24 −2 · nuova sezione `#area-yuma`, 4 link `.nav-area-yuma` (nav desktop, barra auth, menu mobile ×2), `data-i18n` sui link area |
| `app.js` | +123 −14 · `isYuma`, `ADMIN_EMAIL`, `clearArea()`, blocco in `updateAuthUI()`, `renderAreaYuma()`, download card in `renderAreaMembri()` |
| `i18n.js` | +72 · 17 chiavi nuove × 4 lingue + ri-render dell'area YUMA al cambio lingua |
| `supabase/100-aree-riservate.sql` | nuovo · `is_approved_member()`, `is_yuma()`, template RLS per l'area download |
| `supabase/README.md` | ordine di esecuzione delle migrazioni + documentazione delle due aree |
| `tests/aree-riservate.test.js` | nuovo · 29 controlli jsdom |
| `.gitignore` | nuovo |

## 1. Applica la patch

```bash
git clone https://github.com/klaus681/yuma-site.git
cd yuma-site
git checkout -b feat/aree-riservate-socio-yuma
git am /percorso/0001-feat-aree-due-aree-riservate-Area-Membri-approvati-e.patch
# in alternativa, se preferisci non creare il commit:
# git apply /percorso/0001-*.patch
```

Patch verificata: si applica pulita su `main` (`6b4b248`) e i test passano.

## 2. Esegui l'SQL su Supabase

Nel progetto `eefszkqpfwwxoljauobs` → SQL Editor, in quest'ordine:

1. `supabase/99-fix-policies.sql` — **se non l'hai ancora eseguito** (da audit precedente)
2. `supabase/100-aree-riservate.sql` — helper `is_approved_member()` / `is_yuma()`

Il template della tabella `downloads` e delle policy Storage è **commentato** dentro
`100-aree-riservate.sql`: va scommentato quando costruiremo l'area download.

## 3. Verifica

```bash
npm i --no-save jsdom
node tests/aree-riservate.test.js
```

Copre: ospite, socio approvato, membro YUMA approvato, YUMA `pending`, socio `pending`,
admin, logout e traduzioni. Esito atteso: `TUTTI I CONTROLLI PASSATI`.

## 4. Prova manuale

1. Login come utente `role = 'socio'` → compare "Area Membri", **non** "Area YUMA".
2. Login come utente `role = 'yuma'` → compaiono entrambe.
3. Logout → entrambe spariscono e il loro contenuto viene svuotato dal DOM.
4. Cambio lingua (bandierine) → le due aree si ri-renderizzano nella lingua scelta.

Per promuovere un utente: pannello Admin → tab Utenti → selettore ruolo `YUMA` / `Socio`.

## Sicurezza

La visibilità delle aree è lato client: **non è una protezione**. I contenuti della
futura area download dovranno essere protetti dalle policy RLS basate su
`is_approved_member()` (area membri) e `is_yuma()` (area equipaggio), come da
template in `supabase/100-aree-riservate.sql`.

## Contenuto della cartella

| File | Cosa |
|---|---|
| `0001-feat-aree-...patch` | il commit completo, pronto per `git am` |
| `100-aree-riservate.sql` | copia comoda del nuovo file SQL, eseguibile subito |
| `aree-riservate.test.js` | copia comoda del test (da mettere in `tests/`) |
