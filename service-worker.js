/* Tablero DM - Offline cache + auto update (network-first for blocks + navigation) */
const CACHE_NAME = "tablero-dm-756d1eade3";
const CORE_ASSETS = [
  "./ICONOS/COLOR/ICO-A.svg",
  "./ICONOS/COLOR/ICO-AC.svg",
  "./ICONOS/COLOR/ICO-M.svg",
  "./ICONOS/COLOR/ICO-NT.svg",
  "./ICONOS/COLOR/Ico-RES.svg",
  "./ICONOS/COLOR/Ico-RFS.svg",
  "./Tablero DM_files/Territorio1.png",
  "./Tablero DM_files/Territorio2.png",
  "./Tablero-DM.png",
  "./blocks/acomodadores.html",
  "./blocks/anuncios.html",
  "./blocks/no-tocar.html",
  "./blocks/reunion-entre-semana.html",
  "./blocks/reunion-fin-semana.html",
  "./blocks/territorio.html",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

function isHTML(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function isBlocksRequest(req) {
  try {
    const url = new URL(req.url);
    return url.pathname.includes("/blocks/");
  } catch (e) {
    return false;
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    // Only cache OK responses
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  if (fresh && fresh.status === 200) {
    cache.put(req, fresh.clone());
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navigation: try network first to get updates, fallback to cache for offline
  if (isHTML(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Blocks: network-first so you get updates when online
  if (isBlocksRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else: cache-first for speed + offline
  event.respondWith(cacheFirst(req));
});

// Allow page to request an update check
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "CHECK_UPDATE") {
    self.registration.update();
  }
});
