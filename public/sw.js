const CACHE = "habeet-shell-v1";
const SHELL = [
  "/",
  "/icon.svg",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("habeet-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_ASSETS" || !Array.isArray(event.data.assets))
    return;
  const assets = event.data.assets
    .filter((value) => {
      try {
        const url = new URL(value);
        return (
          url.origin === self.location.origin &&
          url.pathname.startsWith("/_next/static/")
        );
      } catch {
        return false;
      }
    })
    .slice(0, 100);
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(assets.map((url) => cache.add(url)))),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache sessions, Supabase requests, or any account data.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === "/") {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put("/", copy)),
            );
          }
          return response;
        })
        .catch(() =>
          caches.match("/").then((cached) => cached || Response.error()),
        ),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    SHELL.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches.open(CACHE).then((cache) => cache.put(request, copy)),
              );
            }
            return response;
          }),
      ),
    );
  }
});
