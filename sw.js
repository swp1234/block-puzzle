/**
 * Service Worker - Offline Support & Caching
 */

const CACHE_NAME = 'block-puzzle-v2';
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/i18n.js',
    'js/sound-engine.js',
    'manifest.json',
    'icon-192.svg',
    'icon-512.svg',
    'js/locales/ko.json',
    'js/locales/en.json',
    'js/locales/zh.json',
    'js/locales/hi.json',
    'js/locales/ru.json',
    'js/locales/ja.json',
    'js/locales/es.json',
    'js/locales/pt.json',
    'js/locales/id.json',
    'js/locales/tr.json',
    'js/locales/de.json',
    'js/locales/fr.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Skip external requests (ads, analytics, etc.)
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then((cached) => cached || caches.match('./index.html'));
            })
    );
});
