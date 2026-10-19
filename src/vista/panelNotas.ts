/** UI de notas: recibe operaciones, sin conocer WebCrypto ni IndexedDB. */
export class PanelNotas {
  private modeloId = "";
  private nombre = "";
  private version = 0;
  private guardada = false;
  private titulo: HTMLElement;
  private mensaje: HTMLElement;
  private password: HTMLInputElement;
  private texto: HTMLTextAreaElement;
  private desbloquear: HTMLButtonElement;
  private guardar: HTMLButtonElement;
  private cerrar: HTMLButtonElement;

  constructor(
    contenedor: HTMLElement,
    privateExiste: (id: string) => Promise<boolean>,
    privateLeer: (id: string, password: string) => Promise<string>,
    privateGuardar: (id: string, texto: string, password: string) => Promise<void>,
  ) {
    const buscar = <T extends HTMLElement>(selector: string): T => {
      const nodo = contenedor.querySelector<T>(selector);
      if (!nodo) throw new Error(`Falta el control de notas ${selector}`);
      return nodo;
    };
    this.titulo = buscar("#titulo-nota");
    this.mensaje = buscar("#estado-nota");
    this.password = buscar("#password-nota");
    this.texto = buscar("#texto-nota");
    this.desbloquear = buscar("#desbloquear-nota");
    this.guardar = buscar("#guardar-nota");
    this.cerrar = buscar("#cerrar-nota");

    this.desbloquear.addEventListener("click", async () => {
      const id = this.modeloId;
      const version = this.version;
      this.esperar(true, "Descifrando nota…");
      try {
        const texto = await privateLeer(id, this.password.value);
        if (version !== this.version) return;
        this.texto.value = texto;
        this.texto.hidden = false;
        this.guardar.hidden = false;
        this.desbloquear.hidden = true;
        this.mensaje.textContent = "Nota desbloqueada. Escribe la contraseña otra vez al guardar.";
      } catch (error) {
        if (version === this.version) this.mensaje.textContent = this.mensajeError(error);
      } finally {
        if (version === this.version) { this.password.value = ""; this.esperar(false); }
      }
    });

    this.guardar.addEventListener("click", async () => {
      const id = this.modeloId;
      const version = this.version;
      this.esperar(true, "Cifrando y guardando nota…");
      try {
        await privateGuardar(id, this.texto.value, this.password.value);
        if (version !== this.version) return;
        this.guardada = true;
        this.mensaje.textContent = "Nota cifrada y guardada. Se conservará tras recargar.";
      } catch (error) {
        if (version === this.version) this.mensaje.textContent = this.mensajeError(error);
      } finally {
        if (version === this.version) { this.password.value = ""; this.esperar(false); }
      }
    });
    this.cerrar.addEventListener("click", () => { void this.mostrarModelo(this.modeloId, this.nombre); });
    this.existe = privateExiste;
  }

  private existe: (id: string) => Promise<boolean>;

  async mostrarModelo(id: string, nombre: string): Promise<void> {
    this.version++;
    const version = this.version;
    this.modeloId = id;
    this.nombre = nombre;
    this.titulo.textContent = `Nota privada: ${nombre}`;
    this.texto.value = "";
    this.password.value = "";
    this.texto.hidden = true;
    this.desbloquear.hidden = true;
    this.guardar.hidden = true;
    this.cerrar.disabled = false;
    this.esperar(true, "Consultando nota guardada…");
    try {
      this.guardada = await this.existe(id);
      if (version !== this.version) return;
      this.desbloquear.hidden = !this.guardada;
      this.texto.hidden = this.guardada;
      this.guardar.hidden = this.guardada;
      this.mensaje.textContent = this.guardada ? "Introduce tu contraseña para abrir la nota." : "Nueva nota: escribe el texto y una contraseña para guardarla.";
    } catch {
      if (version === this.version) this.mensaje.textContent = "No se puede acceder a las notas en este navegador.";
    } finally {
      if (version === this.version) this.esperar(false);
    }
  }

  private esperar(ocupado: boolean, mensaje?: string): void {
    if (mensaje) this.mensaje.textContent = mensaje;
    this.desbloquear.disabled = ocupado;
    this.guardar.disabled = ocupado;
    this.texto.disabled = ocupado;
    this.password.disabled = ocupado;
    this.cerrar.disabled = ocupado;
  }

  private mensajeError(error: unknown): string {
    return error instanceof Error ? error.message : "No se pudo procesar la nota.";
  }
}
