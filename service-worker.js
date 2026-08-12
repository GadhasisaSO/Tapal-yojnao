const CACHE_NAME = "gadhasisa-post-v3";
const FILES_TO_CACHE = [
  "./index.html",
  "./genz.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // For the page itself (HTML): always try the network FIRST so updates show
  // immediately. Only fall back to the cached copy if there's no internet.
  const isPage = event.request.mode === "navigate" || event.request.destination === "document";

  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For other files (icons, manifest, and cross-origin assets like Google
  // Fonts): cache-first is fine since they rarely change.
  // Cross-origin requests (fonts.gstatic.com etc.) come back as "opaque"
  // responses with status 0 — caching was previously gated on status===200,
  // which silently excluded every font file from ever being cached. Opaque
  // responses can't be inspected, but they're safe to cache blindly here
  // since this branch only runs for our own known safe GET requests.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const isCacheable =
            event.request.method === "GET" &&
            (response.status === 200 || response.type === "opaque");
          if (isCacheable) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached)
      );
    })
  );
});
