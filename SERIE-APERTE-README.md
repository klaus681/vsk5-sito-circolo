# Serie Aperte – attivazione

## 1. Supabase
Esegui nel SQL Editor il file `serie-aperte-sql.sql`.

## 2. File già pronti sul repo
- `serie-aperte-sql.sql`
- `serie-aperte-lib.js`
- `serie-aperte-home.js`
- `admin.js` (carica automaticamente `serie-aperte-admin.js`)
- `index.html` (widget Home)
- `eventi-aperti.html` (pagina pubblica)

## 3. File da completare (sostituisci i placeholder)

### serie-aperte-page.js
Sostituisci l'intero contenuto con la versione completa (in chat / artifacts).

### serie-aperte-admin.js
Sostituisci l'intero contenuto con la versione completa (in chat / artifacts).

## 4. admin.html – due modifiche

### Tab (dopo Eventi aperti)
```html
<button type="button" class="admin-tab" data-tab="serie-aperte">Serie Aperte</button>
```

### Pannello
Incolla il blocco HTML del pannello (vedi messaggio) **prima** di:
```html
<div id="panel-soci" class="admin-panel">
```

## 5. Uso
1. Admin → **Serie Aperte**
2. Crea serie (scarti, pubblica, mostra Home)
3. **Regate & Risultati** → aggiungi regate
4. Per ogni regata: risultati (FIN/DNF/DNS/DSQ/RET) o CSV
5. Classifica automatica Low Point

CSV: `Stato;Posizione;Nickname;Team;Note`
