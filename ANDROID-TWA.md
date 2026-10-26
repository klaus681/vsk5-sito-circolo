# App Android (TWA) – CVI Virtual

Guida operativa per creare l'app Android che apre `https://circolovelicoitalia.it`
a schermo intero, senza barra degli indirizzi, tramite **Trusted Web Activity (TWA)**.

Strumenti: **Bubblewrap** (CLI ufficiale del team Chrome) per generare il progetto +
**Android Studio** per compilarlo/firmarlo. Il sito NON va modificato: la TWA carica
il sito reale e si aggiorna da sola quando aggiornate le pagine.

> Perché non il WebAPK di Chrome: quello è generato da Google con il `targetSdk`
> deciso da Chrome, da cui l'avviso "sviluppata per una versione precedente di
> Android". Con la TWA il `targetSdk` lo decidiamo noi e l'APK è firmato da noi.

---

## 0. Scelte già fissate

| Campo | Valore |
| --- | --- |
| Dominio | `circolovelicoitalia.it` |
| Web Manifest | `https://circolovelicoitalia.it/manifest.webmanifest` |
| `start_url` | `/?source=pwa` (letto dal manifest) |
| Package / applicationId | `it.circolovelicoitalia.app` |
| Nome app | `Circolo Velico Italia – Virtual Skipper` |
| Nome sul launcher | `CVI Virtual` |
| Colori | tema e splash `#0b0f19` |
| Icona | `https://circolovelicoitalia.it/icon-512.png` |
| Versioni iniziali | `versionCode 1`, `versionName 1.0.0` |
| `minSdk` | 21 (default Bubblewrap) |
| `targetSdk` | **36** (obbligatorio su Play dal 31/08/2026) |

> Il `package` è irreversibile: se un giorno pubblicate su Play Store non potete
> più cambiarlo. Se preferite un altro nome, decidete ora (es. `it.cvi.virtual`).

---

## 1. Prerequisiti

- **Windows** (i comandi sotto sono PowerShell) o macOS/Linux.
- **Node.js 18 o superiore**: <https://nodejs.org> (LTS). Verifica: `node -v`.
- **Android Studio** ultima versione stabile (include SDK e JDK).
- Un **telefono Android con Chrome aggiornato** e, se possibile, il debug USB attivo.
- Tenere il progetto Android **fuori dal repo del sito**, in una cartella **senza spazi**:
  `C:\dev\cvi-android`.

---

## 2. Installare Bubblewrap

```powershell
npm i -g @bubblewrap/cli
bubblewrap --version
```

Se `bubblewrap` non viene riconosciuto, `%APPDATA%\npm` non è nel `PATH`: chiudi e
riapri PowerShell oppure usa `npx @bubblewrap/cli ...` al posto di `bubblewrap ...`.

Non usare `sudo`/PowerShell da amministratore: npm non va eseguito elevato.

---

## 3. Generare il progetto Android

```powershell
mkdir C:\dev\cvi-android
cd C:\dev\cvi-android
bubblewrap init --manifest https://circolovelicoitalia.it/manifest.webmanifest
```

Al primo avvio Bubblewrap propone di scaricare **JDK 17** e gli **Android command
line tools**: rispondi **Yes** e scegli una cartella senza spazi (es.
`C:\bubblewrap`). Usa il JDK 17 scaricato da Bubblewrap, non quello di Android
Studio (le versioni superiori non sono compatibili con i suoi command line tools).

### Risposte da dare al wizard

| Domanda | Risposta |
| --- | --- |
| Domain | `circolovelicoitalia.it` |
| URL path | `/` |
| Application name | `Circolo Velico Italia – Virtual Skipper` |
| Short name / launcher | `CVI Virtual` |
| Application ID | `it.circolovelicoitalia.app` |
| Display mode | `standalone` |
| Status bar color | `#0b0f19` |
| Splash screen color | `#0b0f19` |
| App version code | `1` |
| App version name | `1.0.0` |
| Generate signing key now | **Yes** |
| Keystore location | `./android.keystore` (dentro `C:\dev\cvi-android`) |
| Key alias | `android` |
| Password keystore / chiave | una password robusta, **salvata** |
| Fallback strategy | `customtabs` (default) |
| Notifications / Protocol handlers / File handlers | No |

Alla fine nella cartella trovi il progetto Gradle (`app/`, `build.gradle`,
`twa-manifest.json`, `android.keystore`) già pronto.

> ⚠️ **Backup immediato**: copia `android.keystore` e le due password in un posto
> sicuro (password manager). Se perdi la chiave non puoi più aggiornare l'app
> pubblicata, a meno di usare Play App Signing.

---

## 4. Prima build (APK per provare)

```powershell
cd C:\dev\cvi-android
bubblewrap build
```

Output nella cartella del progetto:

- `app-release-signed.apk` → per installare e testare sul telefono;
- `app-release-bundle.aab` → solo per Google Play;
- `assetlinks.json` (se presente, contiene l'impronta generata da Bubblewrap).

Al primo build accetta l'installazione delle build-tools Android richieste.

---

## 5. Aprire il progetto in Android Studio (facoltativo ma consigliato)

1. Android Studio → **File → Open** → seleziona `C:\dev\cvi-android` (la cartella
   con `settings.gradle`, non `app/`).
2. Attendi il **Gradle sync**. Se propone un aggiornamento di AGP/Gradle,
   accettalo (serve per compilare con API 36).
3. **Build → Generate Signed App Bundle / APK**:
   - module `app`;
   - keystore: `C:\dev\cvi-android\android.keystore`, alias `android`, password;
   - varianti `release`;
   - output: APK (per il telefono) o AAB (per Play).

In alternativa puoi continuare a usare solo `bubblewrap build` dalla riga di comando:
il risultato è identico.

---

## 6. Forzare targetSdk 36 (richiesto da Play dal 31/08/2026)

In `app/build.gradle` (o `app/build.gradle.kts`) del progetto generato:

```gradle
android {
    compileSdk 36
    defaultConfig {
        targetSdk 36
        minSdk 21
    }
}
```

Serve **AGP 8.9+ / Gradle 8.11+** (Android Studio aggiornato). Se vedi errori,
lascia che Android Studio faccia l'upgrade del progetto o aumenta la versione del
plugin Android Gradle. Per una semplice installazione via APK il target 36 non è
obbligatorio, ma conviene allinearlo subito.

---

## 7. Impronta SHA-256 della chiave

Serve l'impronta **della chiave con cui firmate l'APK** (la stessa che installerete
sul telefono).

```powershell
keytool -list -v -keystore C:\dev\cvi-android\android.keystore -alias android
```

Se `keytool` non è nel PATH, usa quello del JDK 17 di Bubblewrap o di Android Studio:

```powershell
& "C:\bubblewrap\jdk-17\bin\keytool.exe" -list -v -keystore C:\dev\cvi-android\android.keystore -alias android
# oppure
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore C:\dev\cvi-android\android.keystore -alias android
```

Nell'output cerca la riga:

```
SHA256: 3A:1F:...:9C
```

> Nel file `assetlinks.json` l'impronta va scritta **senza** il prefisso `SHA256:` (es. `"1A:E3:...:7E"`): Google rifiuta il file con il prefisso. Il formato con `SHA256:` serve solo come output di `keytool` e nei comandi di verifica.


### Generare il file automaticamente

Dalla **radice di questo repo**:

```powershell
node scripts/twa-assetlinks.mjs C:\dev\cvi-android\android.keystore android
```

Lo script legge l'impronta con `keytool` e scrive `.well-known/assetlinks.json`
con il package `it.circolovelicoitalia.app`. Se vuoi un package diverso, passalo
come terzo argomento.

---

## 8. Pubblicare `assetlinks.json` sul sito

Il file deve rispondere esattamente a:

```
https://circolovelicoitalia.it/.well-known/assetlinks.json
```

Punti importanti per **GitHub Pages**:

- il file `.nojekyll` nella radice del repo è **obbligatorio**: Jekyll (usato da
  GitHub Pages) ignora le cartelle che iniziano con un punto, quindi senza
  `.nojekyll` la cartella `.well-known` non verrebbe pubblicata (404).
- contenuto servito come JSON, nessun redirect, nessuna autenticazione.
- una sola "impronta sbagliata" rovina la verifica: controllate che package e
  SHA-256 siano identici a quelli dell'APK installato.

Commit e push (su `main`, quando il file è pronto):

```powershell
git add .nojekyll .well-known/assetlinks.json
git commit -m "android: aggiunge Digital Asset Links per la TWA"
git push origin main
```

Verifica dopo il deploy:

```powershell
curl https://circolovelicoitalia.it/.well-known/assetlinks.json
```

Controllo ufficiale Google (deve elencare il package e l'impronta):

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://circolovelicoitalia.it&relation=delegate_permission/common.handle_all_urls
```

---

## 9. Installare e verificare sul telefono

**Con cavo USB (debug attivo):**

```powershell
adb install -r C:\dev\cvi-android\app-release-signed.apk
```

**Senza cavo:** copia l'APK sul telefono (Drive/USB), aprilo dal file manager e
consenti "Installa da origini sconosciute" per quel file manager. Play Protect
può mostrare un avviso generico per le app fuori dal Play Store: è normale,
prosegui con "Installa comunque".

Cosa verificare:

1. l'icona "CVI Virtual" appare nel drawer (non solo in Home);
2. aprendola **non c'è la barra degli indirizzi** (verifica Digital Asset Links ok);
3. long-press sull'icona → scorciatoie **Gare / Classifiche / Live**;
4. login, calendario, classifiche e Live funzionano come nel browser;
5. modalità aereo → compare la pagina offline del service worker.

Per capire quale browser sta gestendo la TWA:

```powershell
adb logcat -v brief | findstr TWAProviderPicker
```

Atteso: `Found TWA provider, finishing search: com.google.android.apps.chrome`.

---

## 10. Google Play Store (opzionale)

Requisiti attuali (ottobre 2026):

- account sviluppatore Google Play: **25 $ una tantum**;
- caricare l'**AAB** (`app-release-bundle.aab`), non l'APK;
- **targetSdk 36** (Android 16) per nuove app e aggiornamenti **dal 31/08/2026**;
- **Play App Signing** attivo: Google rifirma l'app con una sua chiave → in
  `assetlinks.json` vanno messe **due** impronte:
  1. quella della vostra keystore (`android.keystore`);
  2. quella di *Play Console → App integrity → App signing key certificate → SHA-256*;
- scheda Play: nome, icona 512, screenshot, descrizione, categorie, **privacy
  policy** (`https://circolovelicoitalia.it/privacy.html`), Data safety, content
  rating;
- se l'app richiede login, dichiarare le credenziali di test in *App access*;
- account personali nuovi: **12 tester per 14 giorni** prima della pubblicazione
  pubblica; review Google 1–7 giorni.

Aggiornamenti: il sito si aggiorna da solo; si carica un nuovo AAB solo quando
cambiano nome, icona, colori o targetSdk (incrementando `versionCode`).

---

## 11. Troubleshooting

| Sintomo | Causa / rimedio |
| --- | --- |
| Barra degli indirizzi visibile | `assetlinks.json` non raggiungibile o errato: controlla 404/redirect, `.nojekyll`, package e SHA-256. Dopo la correzione **disinstalla e reinstalla** l'app (Chrome ri-verifica all'installazione). |
| `assetlinks.json` 404 | Manca `.nojekyll` (Jekyll ignora `.well-known`) o il deploy non è finito. |
| "App non installata" | Spazio insufficiente, APK corrotto, oppure esiste già un'app con lo stesso `package` firmata con un'altra chiave: disinstalla la vecchia versione. |
| Schermata bianca / errore caricamento | Il sito non è raggiungibile dal telefono, oppure manca Chrome aggiornato. |
| Si apre nel browser con barra | Fallback `customtabs`: verifica Digital Asset Links oppure dispositivo senza un browser compatibile TWA (es. Huawei senza Google). |
| Icona/splash vecchi | Disinstalla e reinstalla dopo aver rigenerato l'APK. |
| Build fallisce per SDK | Rilancia `bubblewrap build` (installa le build-tools) o apri in Android Studio e accetta l'upgrade AGP per API 36. |

---

## 12. Checklist operativa

- [ ] Node.js 18+ installato (`node -v`)
- [ ] `npm i -g @bubblewrap/cli` e `bubblewrap --version`
- [ ] `bubblewrap init --manifest https://circolovelicoitalia.it/manifest.webmanifest`
- [ ] Risposte del wizard come da tabella (§3)
- [ ] Backup di `android.keystore` + password
- [ ] `bubblewrap build` → `app-release-signed.apk`
- [ ] (Play) `targetSdk 36` in `app/build.gradle` e build da Android Studio
- [ ] Impronta SHA-256 con `keytool` o `node scripts/twa-assetlinks.mjs ...`
- [ ] `.well-known/assetlinks.json` + `.nojekyll` pubblicati e verificati 200
- [ ] APK installato sul telefono, nessuna barra degli indirizzi
- [ ] Scorciatoie, login, Live e pagina offline verificati

---

## Note sul repo

- `.nojekyll` – disattiva Jekyll su GitHub Pages (necessario per `.well-known`).
- `.well-known/assetlinks.json.example` – modello del file Digital Asset Links.
- `scripts/twa-assetlinks.mjs` – genera `.well-known/assetlinks.json` dalla keystore.
- Il progetto Android **non** va committato in questo repo (tenerlo in
  `C:\dev\cvi-android`); qui restano solo i file che devono essere pubblicati.

