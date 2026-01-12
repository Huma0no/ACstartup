const CACHE_NAME = "report-generator-v1";
const urlsToCache = [
  "./", // ← Cambiado
  "./index.html", // ← Cambiado
  "./styles.css", // ← Cambiado
  "./script.js", // ← Cambiado
  "./weightInData.js",
  "./weightinData.html",
  "./icons/icon-192x192.png", // ← Cambiado
  "./icons/icon-512x512.png", // ← Cambiado
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "./manifest.json", // ← Cambiado
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache opened");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en caché, devolverlo. Si no, buscar en red.
      return (
        response ||
        fetch(event.request).then((networkResponse) => {
          // Cacheo dinámico: Si es una imagen y la descarga fue exitosa, guardarla en caché
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});
