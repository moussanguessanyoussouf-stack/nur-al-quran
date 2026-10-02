// Service worker — fonctionnement hors ligne (NF-04, NF-05).
// Coquille + données + polices pré-cachées ; récitations mises en cache à la demande.

const VERSION = 'nur-quran-v4';
const SHELL = VERSION + '-shell';
const AUDIO = VERSION + '-audio';

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/data.js',
  'js/store.js',
  'js/audio.js',
  'js/reader.js',
  'js/search.js',
  'js/icons.js',
  'js/sha256.js',
  'js/words.js',
  'js/recognizer.js',
  'js/tracker.js',
  'js/tajweed.js',
  'js/hifz.js',
  'data/surahs.json',
  'data/quran.json',
  'fonts/amiri-quran-400.woff2',
  'fonts/amiri-400.woff2',
  'fonts/amiri-700.woff2',
  'fonts/scheherazade-400.woff2',
  'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL && k !== AUDIO).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Récitations (everyayah.com) : cache d'abord, sinon réseau puis mise en cache (AU-05)
  if (url.hostname.includes('everyayah.com')) {
    e.respondWith(
      caches.open(AUDIO).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // Même origine : cache d'abord, repli réseau
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    );
  }
});
