/* Frag Avenue service worker.
 *
 * Cache strategy — safe by construction:
 *   /_next/static/* and /icons/*  → cache-first  (immutable static assets)
 *   /api/* and auth pages          → passthrough  (never cached)
 *   navigation (GET HTML)          → network-first, offline fallback ONLY on failure
 *                                    successful navigation responses are NOT cached
 *                                    (they may contain user-specific rendering)
 *   non-GET                        → passthrough
 *
 * This design has no code path that writes an authenticated response to the
 * cache, so a cache hit for one user can never leak to another.
 *
 * Bump `VERSION` to force an upgrade — old caches are dropped on `activate`.
 */

const VERSION = "v3";
const STATIC_CACHE = `frag-static-${VERSION}`;
const RUNTIME_CACHE = `frag-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API and auth screens: passthrough, never cached.
  if (path.startsWith("/api/") || path === "/sign-in" || path === "/sign-up") return;

  // Immutable static assets: cache-first.
  if (path.startsWith("/_next/static/") || path.startsWith("/icons/")) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }

  // Everything else: network-first, no cache write, offline-page fallback for
  // navigation requests only.
  event.respondWith(networkOnlyWithOfflineFallback(req));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_err) {
    return Response.error();
  }
}

async function networkOnlyWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch (_err) {
    if (request.mode === "navigate") {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    return Response.error();
  }
}
