interface SolicitudInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Estado de instalación y conectividad; estar online no garantiza acceso al servidor. */
export function iniciarEstadoPwa(boton: HTMLButtonElement, conectividad: HTMLElement, estado: HTMLElement): void {
  let solicitud: SolicitudInstalacion | null = null;
  const instalada = () => window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);

  const actualizarRed = () => {
    conectividad.textContent = navigator.onLine
      ? "Dispositivo conectado · algunos recursos podrían no estar disponibles"
      : "Sin conexión · modelos guardados disponibles";
    conectividad.classList.toggle("sin-conexion", !navigator.onLine);
  };
  actualizarRed();
  window.addEventListener("online", actualizarRed);
  window.addEventListener("offline", actualizarRed);

  boton.hidden = instalada();
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    solicitud = evento as SolicitudInstalacion;
    boton.hidden = false;
    boton.textContent = "Instalar Atlas 3D";
    estado.textContent = "Esta aplicación se puede instalar en tu dispositivo.";
  });
  window.addEventListener("appinstalled", () => {
    solicitud = null;
    boton.hidden = true;
    estado.textContent = "Atlas 3D instalado.";
  });
  boton.addEventListener("click", async () => {
    if (!solicitud) {
      estado.textContent = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "En Safari, toca Compartir y luego Añadir a pantalla de inicio."
        : "Si tu navegador permite instalar aplicaciones, busca Instalar o Añadir a inicio en su menú.";
      return;
    }
    const pendiente = solicitud;
    solicitud = null;
    boton.disabled = true;
    try {
      await pendiente.prompt();
      const { outcome } = await pendiente.userChoice;
      estado.textContent = outcome === "accepted" ? "Instalación aceptada." : "Instalación cancelada; puedes intentarlo desde el menú del navegador.";
    } catch {
      estado.textContent = "No se pudo abrir la instalación; prueba desde el menú del navegador.";
    } finally {
      boton.disabled = false;
      boton.textContent = "Cómo instalar";
    }
  });
}
