// App-shell service worker for Sales Log.
//
// This only caches the app's own static files (this page, its icons, the
// manifest) so the app opens instantly and still opens with no signal.
// Bump CACHE_NAME whenever index.html changes, so returning phones pick up
// the new version instead of a stale cached copy.
const CACHE_NAME = "sales-log-shell-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests for the app shell itself. Every
  // sync call the app makes goes to the Google Apps Script Web App, which
  // is always a different origin — this leaves those completely alone so
  // Sales/Costs/Dashboard data is always fetched live, never cached.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Cache-first for an instant, offline-capable load; refresh the cache
      // from the network in the background so the next open picks up
      // whatever changed, without making this open wait on the network.
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
