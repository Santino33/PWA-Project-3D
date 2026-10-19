/** Contrato mínimo de presentación: la vista no importa dominio ni IndexedDB. */
export interface ItemCatalogo {
  id: string;
  nombre: string;
  categoria: string;
  favorito?: boolean;
  ultimaVista?: number;
}

const FIGURAS: Record<string, string> = {
  "arbol-binario": "● ◉ ●", capas: "▰ ▰ ▰", "cliente-cache-servidor": "▣ ◈ ▣",
  "cliente-servidor": "▣ ⇄ ▣", microservicios: "◈ ✣ ◈", mvc: "▣ △ ▣",
  "publicador-suscriptor": "◉ ━ ◌", repositorio: "▣ ▤ ▣",
};

export class ListaCatalogo {
  private items: ItemCatalogo[] = [];
  private seleccionado = "";
  private soloFavoritos = false;
  private pendientes = new Set<string>();
  private contenedor: HTMLElement;
  private filtro: HTMLButtonElement;
  private alSeleccionar: (id: string) => void;
  private alFavorito: (id: string) => void;

  constructor(
    contenedor: HTMLElement,
    filtro: HTMLButtonElement,
    alSeleccionar: (id: string) => void,
    alFavorito: (id: string) => void,
  ) {
    this.contenedor = contenedor;
    this.filtro = filtro;
    this.alSeleccionar = alSeleccionar;
    this.alFavorito = alFavorito;
    filtro.addEventListener("click", () => {
      this.soloFavoritos = !this.soloFavoritos;
      this.filtro.setAttribute("aria-pressed", String(this.soloFavoritos));
      this.filtro.textContent = this.soloFavoritos ? "Mostrar todos" : "Ver favoritos";
      this.pintar();
    });
  }

  establecerItems(items: ItemCatalogo[]): void {
    this.items = items;
    this.pintar();
  }

  actualizarEstado(id: string, estado: { favorito?: boolean; ultimaVista?: number }): void {
    const item = this.items.find((actual) => actual.id === id);
    if (!item) return;
    Object.assign(item, estado);
    this.pintar();
  }

  marcarPendiente(id: string, pendiente: boolean): void {
    if (pendiente) this.pendientes.add(id);
    else this.pendientes.delete(id);
    this.pintar();
  }

  marcarSeleccionado(id: string): void {
    this.seleccionado = id;
    this.contenedor.querySelectorAll<HTMLElement>(".item-catalogo").forEach((tarjeta) => {
      tarjeta.classList.toggle("activo", tarjeta.dataset.id === id);
    });
  }

  private pintar(): void {
    this.contenedor.replaceChildren();
    const visibles = this.items.filter((item) => !this.soloFavoritos || item.favorito);
    if (!visibles.length) {
      const vacio = document.createElement("p");
      vacio.className = "catalogo-vacio";
      vacio.textContent = this.soloFavoritos ? "Aún no tienes favoritos." : "No hay modelos disponibles.";
      this.contenedor.append(vacio);
    }

    for (const item of visibles) {
      const tarjeta = document.createElement("article");
      tarjeta.className = `item-catalogo${this.seleccionado === item.id ? " activo" : ""}`;
      tarjeta.dataset.id = item.id;

      const abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "abrir-modelo";
      abrir.setAttribute("aria-label", `${item.nombre}: Ver modelo en 3D`);
      abrir.addEventListener("click", () => this.alSeleccionar(item.id));

      const miniatura = document.createElement("span");
      miniatura.className = `miniatura cat-fondo-${item.categoria}`;
      miniatura.setAttribute("aria-hidden", "true");
      miniatura.textContent = FIGURAS[item.id] ?? "◇";

      const nombre = document.createElement("span");
      nombre.className = "item-nombre";
      nombre.textContent = item.nombre;

      const categoria = document.createElement("span");
      categoria.className = `item-categoria cat-${item.categoria}`;
      categoria.textContent = item.categoria;
      abrir.append(miniatura, nombre, categoria);

      const acciones = document.createElement("div");
      acciones.className = "acciones-modelo";
      const visto = document.createElement("span");
      visto.textContent = item.ultimaVista ? `Visto: ${new Date(item.ultimaVista).toLocaleDateString("es")}` : "Sin visitar";
      const favorito = document.createElement("button");
      favorito.type = "button";
      favorito.className = "boton-favorito";
      favorito.setAttribute("aria-label", `${item.favorito ? "Quitar de" : "Añadir a"} favoritos: ${item.nombre}`);
      favorito.setAttribute("aria-pressed", String(Boolean(item.favorito)));
      favorito.textContent = item.favorito ? "★" : "☆";
      favorito.disabled = this.pendientes.has(item.id);
      favorito.addEventListener("click", () => this.alFavorito(item.id));
      acciones.append(visto, favorito);
      tarjeta.append(abrir, acciones);
      this.contenedor.append(tarjeta);
    }
  }
}
