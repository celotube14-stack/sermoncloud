const CACHE_NAME = 'sermoncloud-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Interceção de Requisições (Ignora chamadas para APIs externas como bible-api.com)
self.addEventListener('fetch', (event) => {
    // Se a requisição for para a API da Bíblia ou Firebase, deixa passar direto pela rede
    if (event.request.url.includes('bible-api.com') || event.request.url.includes('firebase')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
