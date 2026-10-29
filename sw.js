/* CVI Virtual – Service Worker
   Strategia:
   - navigazioni: network-first con timeout, fallback alla copia cache o offline.html
   - asset statici same-origin: stale-while-revalidate
   - API Supabase e CDN esterni: mai intercettati (dati sempre freschi)
   - pagine riservate (admin, profilo, messaggi): solo rete, nessuna cache
   Per pubblicare una modifica agli asset cambia VERSION. */
'use strict';

const VERSION = 'v5';
const SHELL_CACHE = 'cvi-shell-' + VERSION;
const RUNTIME_CACHE = 'cvi-runtime-' + VERSION;
const OFFLINE_URL = 'offline.html';
const NETWORK_TIMEOUT_MS = 5000;
const PRIVATE_PAGES = /\/(admin|profilo|messaggi)\.html$/;

const PRECACHE = [
  './',
  'index.html',
  OFFLINE_URL,
  'manifest.webmanifest',
  'style.css?v=2',
  'fonts.css',
  'mobile.css',
  'fix-nav.css?v=3',
  'forms.css?v=2',
  'gare-meteo.css?v=2',
  'hero-home.css',
  'logo-64.png',
  'logo-256.webp',
  'favicon-32.png',
  'apple-touch-180.png',
  'icon-192.png?v=2',
  'icon-512.png?v=2',
  'icon-maskable-512.png?v=2',
  'pwa.js?v=1',
  'a11y.js?v=1',
  /* core condiviso e moduli della home: la home resta leggibile offline */
  'common.js?v=16',
  'cvi-core.js?v=8',
  'nav-i18n.js?v=2',
  'privacy-link.js?v=2',
  'messaggi-nav.js?v=1',
  'tornei-nav.js?v=1',
  'tutor-nav.js?v=2',
  'profilo-nazionalita.js?v=2',
  'cvi-flags.js?v=2',
  'cvi-flags-ui.js?v=3',
  'regolamento-dynamic.js?v=1',
  'membership-banner.js?v=4',
  '2-serie-aperte-lib.js?v=3',
  'eventi-common.js?v=3',
  'eventi.js?v=4',
  'evento.js?v=1',
  'eventi-home.js?v=1',
  'tornei-vsk-home.js?v=2',
  'home-hero.js?v=3',
  'gare-meteo.js?v=2',
  'index-inline.js?v=16',
  'tornei-home.js?v=6',
  'allenamenti-home.js?v=4',
  'home-sfondi.js?v=2',
  /* sottoinsiemi font più usati */
  'fonts/plus-jakarta-sans-normal-300-800-latin.woff2',
  'fonts/playfair-display-normal-600-latin.woff2'
];

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(PRECACHE.map(async function (url) {
      try {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (response && response.ok) await cache.put(url, response);
      } catch (e) {
        /* un singolo asset mancante non deve bloccare l'installazione */
      }
    }));
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (key) {
      return key.indexOf('cvi-') === 0 && key !== SHELL_CACHE && key !== RUNTIME_CACHE;
    }).map(function (key) { return caches.delete(key); }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, NETWORK_TIMEOUT_MS);
  return fetch(request, { signal: controller.signal }).finally(function () {
    clearTimeout(timer);
  });
}

async function offlineResponse() {
  const cached = await caches.match(OFFLINE_URL);
  if (cached) return cached;
  return new Response(
    '<!doctype html><html lang="it"><meta charset="utf-8"><title>Offline</title>' +
    '<body style="background:#0b0f19;color:#e2e8f0;font-family:system-ui;padding:2rem;text-align:center">' +
    '<h1>Sei offline</h1><p>Controlla la connessione e riprova.</p>' +
    '<p><a style="color:#38bdf8" href="index.html">Torna alla home</a></p></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function networkFirst(request) {
  try {
    const response = await fetchWithTimeout(request);
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(request, copy); }).catch(function () {});
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return offlineResponse();
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(RUNTIME_CACHE);
  /* ignoreSearch: le pagine chiedono gli stessi file con ?v=N diversi */
  const cached = await cache.match(request, { ignoreSearch: true }) ||
    await caches.match(request, { ignoreSearch: true });
  const network = fetch(request).then(function (response) {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(function () { return null; });
  if (cached) {
    if (event && event.waitUntil) event.waitUntil(network);
    return cached;
  }
  const fresh = await network;
  return fresh || Response.error();
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (request.mode === 'navigate') {
    if (PRIVATE_PAGES.test(url.pathname)) {
      event.respondWith(fetch(request).catch(function () { return offlineResponse(); }));
    } else {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  if (/\.(?:css|js|mjs|woff2?|png|jpe?g|webp|svg|ico|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
