import { Workbox } from "workbox-window";

export function registrarServiceWorker(): void {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    const trabajador = new Workbox("/sw.js", { scope: "/" });
    trabajador.addEventListener("installed", (evento) => {
      console.info(evento.isUpdate ? "[PWA] Actualización disponible" : "[PWA] Recursos esenciales almacenados");
    });
    trabajador.addEventListener("controlling", () => console.info("[PWA] Service Worker activo"));
    void trabajador.register().catch((error: unknown) => console.error("[PWA] No se pudo registrar el Service Worker", error));
  });
}
