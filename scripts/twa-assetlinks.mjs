#!/usr/bin/env node
/**
 * CVI Virtual – genera .well-known/assetlinks.json per la Trusted Web Activity.
 *
 * Legge l'impronta SHA-256 dal keystore con keytool e scrive il file in
 * .well-known/assetlinks.json (radice del sito).
 *
 * Uso (dalla radice del repo):
 *   node scripts/twa-assetlinks.mjs <keystore> <alias> [package]
 *
 * Esempio Windows:
 *   node scripts/twa-assetlinks.mjs C:\dev\cvi-android\android.keystore android
 *
 * Se keytool non è nel PATH, imposta JAVA_HOME (Android Studio include un JBR
 * con keytool: <Android Studio>\jbr\bin\keytool.exe).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PACKAGE = "it.circolovelicoitalia.app";

const [keystore, alias, pkg = DEFAULT_PACKAGE] = process.argv.slice(2);

if (!keystore || !alias) {
  console.error(
    "Uso: node scripts/twa-assetlinks.mjs <keystore> <alias> [package]\n" +
      "Es.: node scripts/twa-assetlinks.mjs ../cvi-android/android.keystore android"
  );
  process.exit(1);
}

function keytoolPath() {
  if (!process.env.JAVA_HOME) return "keytool";
  const bin = process.platform === "win32" ? "keytool.exe" : "keytool";
  return resolve(process.env.JAVA_HOME, "bin", bin);
}

let output;
try {
  output = execFileSync(
    keytoolPath(),
    ["-list", "-v", "-keystore", keystore, "-alias", alias],
    { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }
  );
} catch (error) {
  const details = error.stdout || error.stderr || error.message;
  console.error("keytool non è riuscito a leggere il keystore:\n" + details);
  console.error(
    "\nSuggerimenti: verifica percorso/alias/password, oppure imposta JAVA_HOME " +
      "al JDK usato per firmare (Android Studio: <Studio>/jbr)."
  );
  process.exit(1);
}

const fingerprints = [];
for (const line of output.split(/\r?\n/)) {
  const index = line.indexOf("SHA256:");
  if (index === -1) continue;
  const value = line.slice(index + "SHA256:".length).trim().toUpperCase();
  if (/^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(value)) {
    fingerprints.push("SHA256:" + value);
  }
}

if (!fingerprints.length) {
  console.error(
    "Nessuna impronta SHA256 trovata nell'output di keytool. " +
      "Controlla alias e keystore."
  );
  process.exit(1);
}

const unique = [...new Set(fingerprints)];
const data = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: pkg,
      sha256_cert_fingerprints: unique,
    },
  },
];

const target = resolve(".well-known/assetlinks.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log("Scritto " + target);
console.log("Package: " + pkg);
unique.forEach((fp) => console.log("Fingerprint: " + fp));
console.log(
  "\nProssimo passo: verifica che https://circolovelicoitalia.it/.well-known/assetlinks.json " +
    "risponda 200 e contenga questa impronta."
);
