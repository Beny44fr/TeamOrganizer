/* Cache minimal : l'application reste utilisable sans réseau, au gymnase par exemple. */
const CACHE = 'equipe-v3';
/* Tous les fichiers de l'application : sans eux, la première visite hors ligne
   échouerait. À compléter à chaque nouveau module. */
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/styles.css',
  './js/core/icons.js',
  './js/core/state.js',
  './js/core/utils.js',
  './js/domain/agenda.js',
  './js/domain/message.js',
  './js/domain/model.js',
  './js/domain/roulements.js',
  './js/domain/trajets.js',
  './js/main.js',
  './js/screens/effectif.js',
  './js/screens/equite.js',
  './js/screens/layout.js',
  './js/screens/match-form.js',
  './js/screens/matchs.js',
  './js/screens/onboarding.js',
  './js/screens/planification.js',
  './js/screens/recap.js',
  './js/screens/reglages.js',
  './js/ui/components.js',
  './js/ui/files.js',
  './js/ui/forms.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Réseau d'abord pour avoir la dernière version, cache en secours hors ligne. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // laisse passer la bibliothèque Excel
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
