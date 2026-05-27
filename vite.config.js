import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function pwaServiceWorker() {
  return {
    name: "feria-serpa-service-worker",
    generateBundle(_, bundle) {
      const files = Object.values(bundle)
        .map((item) => item.fileName)
        .filter(Boolean)
        .map((fileName) => `/${fileName}`);
      const urls = [
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/assets/logo-feria-serpa.png",
        ...files,
      ];

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const CACHE_VERSION = "feria-serpa-${Date.now()}";
const PRECACHE_URLS = ${JSON.stringify([...new Set(urls)], null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaServiceWorker()],
});
