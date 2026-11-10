const CACHE_NAME = 'zdaracek-v2';
const assetsToCache = [
  './index.html',
  './manifest.json'
];

// Instalace a uložení základních souborů
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// Aktivace a čištění staré paměti
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Strategie načítání: Pro HTML zkusit síť (kvůli aktualitám), jinak cache. Pro audio/pdf cache-first.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // Vrátí z paměti (funguje offline i pro audio/pdf)
        }
        return fetch(event.request).then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        }).catch(() => {
          // Zde můžeš ošetřit případ, kdy soubor není v cache a není internet
        });
      })
    );
  }
});