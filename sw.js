const CACHE_NAME = 'zdaracek-v2';
const assetsToCache = [
  './index.html',
  './manifest.json'
];

// === 1. FIREBASE PRO PUSH NOTIFIKACE ===
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAnmWp8zCp8wLOgSAwN_mb_uLpFvASBiCQ",
    authDomain: "zdaracek-app.firebaseapp.com",
    projectId: "zdaracek-app",
    storageBucket: "zdaracek-app.firebasestorage.app",
    messagingSenderId: "369201752333",
    appId: "1:369201752333:web:8b77821b485d9e2a59a844"
});

const messaging = firebase.messaging();

// Zobrazení notifikace ve stavovém řádku, když je aplikace zavřená
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Nová aktualita Žďáráček';
    const options = {
        body: payload.notification?.body || 'Podívej se, co je ve sboru nového!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: '/' }
    };

    self.registration.showNotification(title, options);
});

// Kliknutí na notifikaci otevře aplikaci
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('/');
        })
    );
});


// === 2. INSTALACE A CACHOVÁNÍ (VÁŠ PŮVODNÍ KÓD) ===
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
