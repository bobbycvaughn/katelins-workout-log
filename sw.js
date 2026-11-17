const cacheName = 'katelins-workout-log-v1';
const assets = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './daemon-sickness.otf', './fire.jpg', './smoke.jpg', './timer-thorns.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' }))).then(() => self.skipWaiting())));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('katelins-workout-log-') && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const match = assets.some(path => new URL(path, self.registration.scope).href === url.origin + url.pathname);
  if (event.request.method !== 'GET' || !match) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    try {
      const response = await fetch(event.request, { cache: 'no-cache' });
      if (response.ok) return response;
      return await cache.match(event.request, { ignoreSearch: true }) || response;
    } catch (error) {
      const saved = await cache.match(event.request, { ignoreSearch: true });
      if (saved) return saved;
      throw error;
    }
  }));
});
