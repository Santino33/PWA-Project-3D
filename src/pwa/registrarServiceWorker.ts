import { Workbox } from "workbox-window";

export function registrarServiceWorker(avisar: (mensaje: string) => void): void {
  if (import.meta.env.DEV) return;
  if (!("serviceWorker" in navigator)) {
    avisar("Este navegador no admite uso sin conexión mediante Service Workers.");
    return;
  }
  window.addEventListener("load", () => {
    const trabajador = new Workbox("/sw.js", { scope: "/" });
    trabajador.addEventListener("installed", (evento) => {
      avisar(evento.isUpdate ? "Actualización lista. Recarga para ver la versión nueva." : "Recursos esenciales disponibles sin conexión.");
    });
    trabajador.addEventListener("controlling", () => avisar("Aplicación disponible sin conexión después de esta visita."));
    void trabajador.register().catch((error: unknown) => {
      console.error("[PWA] No se pudo registrar el Service Worker", error);
      avisar("No se pudo activar el modo sin conexión.");
    });
  });
}
