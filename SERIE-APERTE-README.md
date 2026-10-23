# Serie Aperte – classifiche con import log VSK

Sistema di classifiche per regate aperte (anche a skipper non soci), **separato**
da gare ufficiali, soci e tornei. Importa i log CSV di Virtual Skipper, calcola
Low Point / High Point, scarti fissi o automatici e mostra la classifica in Home.

## 1. Supabase (una volta)

Nel SQL Editor, nell'ordine:

1. `serie-aperte-sql.sql` – tabelle + RLS (se non già eseguite)
2. `serie-aperte-vsk-sql.sql` – colonne per tempi, account, nickname raw,
   sistema punteggio e scarti automatici

Sono entrambi idempotenti (sicuri da rieseguire). Senza il secondo file tutto
funziona ancora, ma **senza tempi/account e con solo Low Point + scarti fissi**.

## 2. File coinvolti

| File | Ruolo |
| --- | --- |
| `2-serie-aperte-lib.js` | libreria condivisa: parser VSK, pulizia nickname, punteggi, classifica (usata da admin, pagina pubblica e Home) |
| `4-serie-aperte-admin.js` | pannello admin: serie, regate, risultati, import VSK, export |
| `3-serie-aperte-page.js` | pagina pubblica `eventi-aperti.html` |
| `5-serie-aperte-home.js` | widget classifica in Home |
| `serie-aperte-ui-boot.js` | crea tab/pannello se mancano |
| `serie-aperte-vsk-sql.sql` | migrazione colonne VSK |

Cache-busting già aggiornato in `index.html`, `eventi-aperti.html`,
`admin.html` e `admin.js`.

## 3. Uso in admin

1. Admin → tab **Serie Aperte**
2. Crea la serie: titolo, date, **sistema punteggio** (Low/High Point),
   **scarti** (numero oppure “automatici: 1 ogni 4 regate”), `Pubblicata`,
   `Mostra in Home`
3. **Regate & Risultati** → apri il blocco **⚡ Importa log VSK**
4. Trascina uno o più file `Result_YYYY_MM_DD_HH_MM_SS.csv`

Per ogni file viene creata una regata (titolo/data ricavati dal nome file) con
tutti i risultati: posizione, tempo in ms, account VSK, nickname originale e
nickname pulito dai codici colore `$`. I file già importati vengono saltati
(colonna `sorgente_file`).

Alternative manuali:

- **Modifica risultati**: tabella con Stato / Pos / Nickname / Team / Tempo / Note
- **Importa CSV** dentro il modale: accetta sia `Stato;Posizione;Nickname;Team;Note`
  sia un log VSK completo
- **Esporta classifica CSV**, **Esporta Excel (.xlsx)** (SheetJS caricato solo al volo, con fallback CSV) e **Copia HTML** per il forum

## 4. Formati CSV accettati

Log VSK (`Result_*.csv`), separatore `;`, `,`, tab o `|`:

```
Rank;Time;Account;Nickname
1;1480567;sailor1;$00f$iMario Rossi
2;1490000;sailor2;$f0fLuigi
```

- l'intestazione è facoltativa (riconosciuta da `rank/pos/time/account/nick`)
- tempo in millisecondi oppure `mm:ss.mmm` / `hh:mm:ss.mmm`
- `$` codici Nadeo rimossi automaticamente (`$fff`, `$0f`, `$i`, `$n`, `$$`, ...)
- tempo `0` o assente → `DNF`

CSV manuale: `Stato;Posizione;Nickname;Team;Note` (FIN, DNF, DNS, DSQ, RET).

## 5. Calcolo classifica

- **Low Point**: 1° = 1 pt, 2° = 2 pt … ; DNF/DNS/DSQ/RET = partenti + 1
- **High Point**: 1° = N pt, ultimo = 1 pt; DNF/DNS/DSQ/RET = 0
- chi non partecipa a una regata = DNS implicito di quella regata
- **scarti**: numero fisso, oppure automatico `floor(regate / 4)`
  (con 4 regate = 1 scarto, 8 regate = 2 scarti); resta sempre valida almeno
  una prova
- spareggi: punti netti → punti totali → più primi posti, poi secondi, …
  → piazzamento nell'ultima regata

## 6. Pubblicazione

- `Pubblicata` = visibile in `eventi-aperti.html` (podio, tabella con colonne
  R1…Rn e scarti barrati, dettaglio regate con tempi e distacchi)
- `Mostra in Home` = widget in `index.html` con podio, posizioni 4–10, numero
  gare, ultima regata e link alla classifica completa
- una sola serie per volta può essere “in Home” (le altre vengono disattivate
  automaticamente al salvataggio)
