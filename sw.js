const CACHE_NAME = 'block-puzzle-v7';
const SCOPE = '/block-puzzle/';
const ASSETS = [
    SCOPE,
    `${SCOPE}index.html`,
    `${SCOPE}css/style.css`,
    `${SCOPE}assets/bg-opt.jpg`,
    `${SCOPE}js/storage-manager.js`,
    `${SCOPE}js/leaderboard-manager.js`,
    `${SCOPE}js/i18n.js`,
    `${SCOPE}js/sound-engine.js`,
    `${SCOPE}js/app.js`,
    `${SCOPE}manifest.json`,
    `${SCOPE}icon-192.svg`,
    `${SCOPE}icon-512.svg`,
    ...['ko', 'en', 'zh', 'hi', 'ru', 'ja', 'es', 'pt', 'id', 'tr', 'de', 'fr']
        .map(lang => `${SCOPE}js/locales/${lang}.json`)
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(names.filter(name => name.startsWith('block-puzzle-') && name !== CACHE_NAME).map(name => caches.delete(name))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                return response;
            })
            .catch(async () => (await caches.match(event.request)) || caches.match(`${SCOPE}index.html`))
    );
});
