const CACHE_NAME = "service-call-v17";
const ASSETS = [
  "./",
  "./index.html",
  "./styles/app.css",
  "./manifest.json",
  // Entry points
  "./dropdowns.js",
  "./src/app.js",
  "./src/ai.js",
  // src/ modules
  "./src/jobs.js",
  "./src/reports.js",
  "./src/data.js",
  "./src/storage.js",
  // Root-level modules
  "./pricing.js",
  "./state.js",
  "./validation.js",
  "./ui.js",
  "./components.js",
  "./imagemanager.js",
  "./quickcalc.js",
  "./weightinlogic.js",
  "./fileutils.js",
  // Data files (referenced by src/data.js)
  "./constants.js",
  "./utils.js",
  "./weightInData.js",
  "./equipmentData.js",
  "./tstatData.js",
  "./howtodata.js",
  // AI files (referenced by src/ai.js)
  "./claudeAssist.js",
  "./aiProviders.js",
  "./troubleshootingEngine.js",
  "./troubleshootingPanel.js",
  "./lv.js",
  "./wikimanager.js",
  // Icons
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Intentamos cachear todo el grupo
      try {
        await cache.addAll(ASSETS);
      } catch (e) {
        console.warn(
          "Falló cache.addAll, intentando cachear archivos individualmente:",
          e
        );
        // Fallback: Si falla el grupo, intentamos uno por uno para identificar el error
        // y permitir que el SW se instale con lo que sí funcione.
        for (const url of ASSETS) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`No se pudo cachear: ${url}`, err);
          }
        }
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first para archivos propios de la app (mismo origen)
  // → siempre carga la versión más reciente; cache solo como fallback offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first para recursos externos (CDN libraries)
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
