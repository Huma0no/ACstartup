const CACHE_NAME = "field-ops-v1";
const ASSETS = [
  "./index.html",
  "./styles/app.css",
  "./manifest.json",
  "./sw.js",
  "./src/app.js",
  "./src/data.js",
  "./src/storage.js",
  "./src/jobs.js",
  "./src/workspace.js",
  "./src/reports.js",
  "./src/settings.js",
  "./src/utils.js",
  "./src/diagrams.js",
  "./src/lv.js",
  "./src/ai.js",
  "./src/importer.js",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./images/lv/acc-aprilair.png",
  "./images/lv/acc-dapc.png",
  "./images/lv/acc-dehum.png",
  "./images/lv/acc-ebypass.png",
  "./images/lv/acc-fin180p.png",
  "./images/lv/acc-floatswitch.png",
  "./images/lv/acc-freshair.png",
  "./images/lv/acc-harmony.png",
  "./images/lv/acc-hz322.png",
  "./images/lv/acc-rds.png",
  "./images/lv/acc-ut3000.png",
  "./images/lv/airhandler.png",
  "./images/lv/cond-1-2stage.png",
  "./images/lv/cond-daikin.png",
  "./images/lv/cond-heatpump.png",
  "./images/lv/daikin-comm.png",
  "./images/lv/furnace-1-2stage.png",
  "./images/lv/furnace-heatpump.png",
  "./images/lv/tstat-1-2stage.png",
  "./images/lv/tstat-daikin.png",
  "./images/lv/tstat-heatpump.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(ASSETS);
      } catch (e) {
        for (const url of ASSETS) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`Failed to cache: ${url}`, err);
          }
        }
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

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
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      )
    )
  );
  self.clients.claim();
});
