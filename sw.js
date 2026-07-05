// Bump the version on every deploy so clients pick up new assets.
const CACHE = 'calories-v40';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // let GitHub API calls pass through

  if (e.request.mode === 'navigate') {
    // network-first for the page itself, so updates land when online.
    // Only trust OK responses: if the host serves an error page (e.g. Pages
    // unpublished), keep running from the cached copy instead of caching it.
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (!r.ok) return caches.match('./index.html').then(m => m || r);
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
