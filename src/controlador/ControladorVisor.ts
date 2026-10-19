/* ============================================================================
   CAPA DE CONTROLADOR — Conecta el Modelo con la Vista.

   Es el ÚNICO archivo del proyecto que importa a la vez algo de dominio/ y
   algo de vista/. Si alguna vez ves un archivo de vista/ importando algo de
   controlador/, la arquitectura se está rompiendo.

   Su trabajo: pedirle los datos al modelo, traducirlos a la forma que la vista
   entiende, y reaccionar a lo que el usuario hace.
   ========================================================================== */

import type { PatronArquitectura } from "../dominio/PatronArquitectura";
import { ArbolCatalogo } from "../dominio/ArbolCatalogo";
import { crearCatalogo } from "../datos/patrones";
import { alternarFavorito, marcarModeloVisto, obtenerEstados, obtenerFavoritos } from "../datos/estadoModelos";
import { existeNota, guardarNota, leerNota } from "../datos/notas";
import type { EstadoModelo } from "../dominio/EstadoModelo";

import { Escena3D } from "../vista/escena3d";
import { ListaCatalogo } from "../vista/listaCatalogo";
import { PanelNotas } from "../vista/panelNotas";
import type { ItemCatalogo } from "../vista/listaCatalogo";
import { construirPatron } from "../vista/constructores";

export class ControladorVisor {
  private catalogo: ArbolCatalogo;
  private lista: ListaCatalogo;
  private escena: Escena3D | null = null;
  private lienzoEl: HTMLCanvasElement;
  private estadoEl: HTMLElement;
  private descripcionEl: HTMLElement;
  private seleccionActual = 0;
  private vistosLocales = new Set<string>();
  private favoritosLocales = new Set<string>();
  private estadoCatalogoEl: HTMLElement;
  private notas: PanelNotas;

  constructor(listaEl: HTMLElement, filtroEl: HTMLButtonElement, lienzoEl: HTMLCanvasElement, descripcionEl: HTMLElement, estadoEl: HTMLElement, estadoCatalogoEl: HTMLElement, notasEl: HTMLElement) {
    this.catalogo = crearCatalogo();
    this.lienzoEl = lienzoEl;
    this.estadoEl = estadoEl;
    this.estadoCatalogoEl = estadoCatalogoEl;
    this.descripcionEl = descripcionEl;

    // La vista recibe una función que llamar; no sabe qué hay al otro lado.
    this.lista = new ListaCatalogo(listaEl, filtroEl, (id) => this.seleccionar(id), (id) => { void this.cambiarFavorito(id); });
    this.notas = new PanelNotas(notasEl, existeNota, leerNota, guardarNota);
  }

  iniciar(): void {
    // enOrden() devuelve el catálogo YA alfabetizado: es el recorrido in-order
    // del árbol binario, no un sort().
    const patrones = this.catalogo.enOrden();

    this.lista.establecerItems(patrones.map(this.aItem));
    void this.hidratarEstados();
    this.estado("Cargando visor 3D…");
    try {
      this.escena = new Escena3D(this.lienzoEl, (mensaje) => this.estado(mensaje));
      this.escena.iniciar();
    } catch (error) {
      console.error("No se pudo iniciar WebGL", error);
      this.estado("El visor 3D no está disponible en este dispositivo.", true);
    }

    if (patrones.length > 0) this.seleccionar(patrones[0].id, false);
    else this.estado("No hay modelos disponibles.", true);

    // Comprobación rápida de que la inserción balanceada funcionó:
    // 8 patrones bien insertados dan altura 4, no 8.
    console.info(
      `Catálogo: ${this.catalogo.tamano} patrones · altura del árbol: ${this.catalogo.altura()}`,
    );
  }

  /** Traduce del Modelo a la forma mínima que la Vista entiende. */
  private aItem(patron: PatronArquitectura): ItemCatalogo {
    return { id: patron.id, nombre: patron.nombre, categoria: patron.categoria };
  }

  private seleccionar(id: string, desplazar = true): void {
    const patron = this.catalogo.buscarPorId(id);
    if (patron === null) {
      this.estado("El modelo solicitado no existe.", true);
      return;
    }

    this.lista.marcarSeleccionado(id);
    this.pintarDescripcion(patron);
    void this.notas.mostrarModelo(id, patron.nombre);
    if (desplazar && window.matchMedia("(max-width: 760px)").matches) {
      this.lienzoEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!this.escena) return;

    const seleccion = ++this.seleccionActual;
    this.estado(`Cargando ${patron.nombre}…`);
    try {
      this.escena.mostrar(construirPatron(patron.id));
      this.vistosLocales.add(id);
      void marcarModeloVisto(id).then((guardado) => {
        this.lista.actualizarEstado(id, { ultimaVista: guardado.ultimaVista });
      }).catch(() => this.avisoCatalogo("No se pudo guardar la última visualización."));
      requestAnimationFrame(() => {
        if (seleccion === this.seleccionActual && this.escena?.disponible) this.estado("");
      });
    } catch (error) {
      console.error(`No se pudo mostrar ${patron.id}`, error);
      this.estado(`No se pudo mostrar ${patron.nombre}. Prueba con otro modelo.`, true);
    }
  }

  private async hidratarEstados(): Promise<void> {
    try {
      const [estados, favoritos] = await Promise.all([obtenerEstados(), obtenerFavoritos()]);
      const idsFavoritos = new Set(favoritos.map(({ modeloId }) => modeloId));
      for (const item of estados) {
        this.lista.actualizarEstado(item.modeloId, {
          ...(!this.favoritosLocales.has(item.modeloId) ? { favorito: idsFavoritos.has(item.modeloId) } : {}),
          ...(!this.vistosLocales.has(item.modeloId) ? { ultimaVista: item.ultimaVista } : {}),
        });
      }
    } catch {
      this.avisoCatalogo("No se pudo leer el estado guardado. Puedes seguir explorando los modelos.");
    }
  }

  private async cambiarFavorito(id: string): Promise<void> {
    this.favoritosLocales.add(id);
    this.lista.marcarPendiente(id, true);
    this.avisoCatalogo("Guardando favorito…");
    try {
      const estado: EstadoModelo = await alternarFavorito(id);
      this.lista.actualizarEstado(id, { favorito: estado.favorito === 1 });
      this.avisoCatalogo(estado.favorito ? "Guardado en favoritos." : "Eliminado de favoritos.");
    } catch {
      this.avisoCatalogo("No se pudo guardar el favorito. Vuelve a intentarlo.");
    } finally {
      this.lista.marcarPendiente(id, false);
    }
  }

  private avisoCatalogo(mensaje: string): void {
    this.estadoCatalogoEl.textContent = mensaje;
  }

  private estado(mensaje: string, error = false): void {
    this.estadoEl.textContent = mensaje;
    this.estadoEl.hidden = mensaje === "";
    this.estadoEl.classList.toggle("es-error", error);
  }

  private pintarDescripcion(patron: PatronArquitectura): void {
    this.descripcionEl.replaceChildren();

    const titulo = document.createElement("h2");
    titulo.textContent = patron.nombre;

    const etiqueta = document.createElement("span");
    etiqueta.className = `item-categoria cat-${patron.categoria}`;
    etiqueta.textContent = patron.categoria;

    const texto = document.createElement("p");
    texto.textContent = patron.descripcion;

    this.descripcionEl.append(titulo, etiqueta, texto);
  }
}
