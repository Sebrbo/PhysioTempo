// service-worker.js — PhysioTempo (clean, no audio cached)
// v15 — 2025-11-19

const CACHE_NAME = "physiotempo-v15";

const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k.startsWith("physiotempo-"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Même origine uniquement
  if (url.origin !== location.origin) return;

  // Ne jamais mettre en cache l'audio
  if (
    req.destination === "audio" ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".wav") ||
    url.pathname.endsWith(".ogg")
  ) {
    return; // réseau direct
  }

  // HTML / navigations : network-first avec fallback cache puis index.html offline
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .catch(() => caches.match(req))
        .then((res) => res || caches.match("./index.html"))
    );
    return;
  }

  // Assets statiques : cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});

// Optionnel : permettre à la page de forcer l'activation immédiate
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
