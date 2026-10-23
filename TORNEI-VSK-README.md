# Tornei – regate VSK e classifiche

Estende i **Tornei** con lo stesso sistema delle Serie Aperte: import dei log
`Result_*.csv` di Virtual Skipper, classifica Low/High Point con scarti, tempi e
distacchi. **Resta separato** dalla classifica delle gare ufficiali
(`torneo_gare` → `risultati_gara`), che continua a funzionare come prima.

## 1. Supabase

Esegui nel SQL Editor, dopo `tornei-sql.sql`:

```
tornei-vsk-sql.sql
```

Aggiunge:

- su `tornei`: `vsk_sistema_punteggio`, `vsk_scarti`, `vsk_scarti_auto`, `vsk_mostra_home`
- `torneo_regate` (regate VSK del torneo, con `sorgente_file`)
- `torneo_risultati` (nickname, nickname raw, account VSK, stato, posizione, tempo_ms)
- RLS: lettura pubblica solo per tornei pubblicati, scrittura ad admin/scorer
- È idempotente: puoi rieseguirlo.

## 2. File

| File | Ruolo |
| --- | --- |
| `tornei-vsk-sql.sql` | migrazione tabelle/colonne |
| `tornei-vsk-admin.js` | pannello admin “⚡ Regate VSK & classifica torneo” |
| `tornei-page.js` | blocco “Classifica regate VSK” in `tornei.html` |
| `tornei-vsk-home.js` | podio del torneo in Home |
| `2-serie-aperte-lib.js` | calcoli condivisi (parser VSK, punteggi, scarti) |

Cache-busting: `admin.js?v=22` → `tornei-vsk-admin.js?v=1`,
`tornei.html` → `tornei-page.js?v=9` + lib v2, `index.html` → `tornei-vsk-home.js?v=1`.

## 3. Uso in admin

Admin → tab **Tornei** → card in fondo **⚡ Regate VSK & classifica torneo**:

1. Seleziona il torneo
2. Imposta sistema (Low/High Point), scarti (numero o automatici 1/4),
   eventualmente **Podio in Home** → *Salva impostazioni*
3. **⬆ Importa log VSK**: trascina uno o più `Result_YYYY_MM_DD_HH_MM_SS.csv`
   (una regata per file, dedupe per nome file)
4. Controlla la classifica: colonne R1…Rn, scarti barrati, Totali/Netti
5. Export **CSV**, **Excel (.xlsx)**, **Copia HTML**
6. Ogni regata ha *Modifica risultati* (editor con tempo) ed *Elimina*

## 4. Pubblico

- `tornei.html?id=<id>`: oltre alla classifica ufficiale, compare
  **Classifica regate VSK** con tabella per regata e dettaglio con tempi e distacchi
- Home: card torneo con podio (top 3) se `vsk_mostra_home` è attivo e ci sono
  risultati. Una sola card torneo in Home: attivandone una, le altre vengono
  disattivate automaticamente.

## 5. Regole di calcolo

Identiche alle Serie Aperte:

- Low Point: 1° = 1 pt, DNF/DNS/DSQ/RET = partenti + 1
- High Point: 1° = N pt, DNF/DNS/DSQ/RET = 0
- chi non partecipa = DNS implicito
- scarti fissi oppure `floor(regate / 4)`, sempre almeno una prova valida
- spareggi: netti → totali → più 1° posti, poi 2°… → piazzamento nell'ultima regata
