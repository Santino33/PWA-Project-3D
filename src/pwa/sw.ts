/// <reference lib="webworker" />
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin,
  new NetworkFirst({ cacheName: "atlas3d-navegacion", networkTimeoutSeconds: 3 }),
);

// Son recursos reales pero prescindibles para arrancar. Los iconos de instalación
// esenciales ya están en precache; el resto se almacena cuando se solicita.
registerRoute(
  ({ request, url }) => request.method === "GET" && url.origin === self.location.origin &&
    /^\/(?:favicon\.svg|iconos\/icon-512-maskable\.png)$/.test(url.pathname),
  new CacheFirst({
    cacheName: "atlas3d-imagenes",
    plugins: [new ExpirationPlugin({ maxEntries: 12, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

setCatchHandler(async ({ event }) => {
  if (event instanceof FetchEvent && event.request.mode === "navigate") {
    return (await matchPrecache("/index.html")) ?? Response.error();
  }
  return Response.error();
});

self.addEventListener("install", () => { void self.skipWaiting(); });
self.addEventListener("activate", (evento) => {
  evento.waitUntil((async () => {
    // Retira únicamente los nombres del SW manual anterior, después de activar el nuevo.
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((nombre) => /^atlas3d-v\d+$/.test(nombre)).map((nombre) => caches.delete(nombre)));
    await self.clients.claim();
  })());
});
