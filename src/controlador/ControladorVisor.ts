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

import { Escena3D } from "../vista/escena3d";
import { ListaCatalogo } from "../vista/listaCatalogo";
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

  constructor(listaEl: HTMLElement, lienzoEl: HTMLCanvasElement, descripcionEl: HTMLElement, estadoEl: HTMLElement) {
    this.catalogo = crearCatalogo();
    this.lienzoEl = lienzoEl;
    this.estadoEl = estadoEl;
    this.descripcionEl = descripcionEl;

    // La vista recibe una función que llamar; no sabe qué hay al otro lado.
    this.lista = new ListaCatalogo(listaEl, (id) => this.seleccionar(id));
  }

  iniciar(): void {
    // enOrden() devuelve el catálogo YA alfabetizado: es el recorrido in-order
    // del árbol binario, no un sort().
    const patrones = this.catalogo.enOrden();

    this.lista.pintar(patrones.map(this.aItem));
    this.estado("Cargando visor 3D…");
    try {
      this.escena = new Escena3D(this.lienzoEl, (mensaje) => this.estado(mensaje));
      this.escena.iniciar();
    } catch (error) {
      console.error("No se pudo iniciar WebGL", error);
      this.estado("El visor 3D no está disponible en este dispositivo.", true);
    }

    if (patrones.length > 0) this.seleccionar(patrones[0].id);
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

  private seleccionar(id: string): void {
    const patron = this.catalogo.buscarPorId(id);
    if (patron === null) {
      this.estado("El modelo solicitado no existe.", true);
      return;
    }

    this.lista.marcarSeleccionado(id);
    this.pintarDescripcion(patron);
    if (!this.escena) return;

    const seleccion = ++this.seleccionActual;
    this.estado(`Cargando ${patron.nombre}…`);
    try {
      this.escena.mostrar(construirPatron(patron.id));
      requestAnimationFrame(() => {
        if (seleccion === this.seleccionActual && this.escena?.disponible) this.estado("");
      });
    } catch (error) {
      console.error(`No se pudo mostrar ${patron.id}`, error);
      this.estado(`No se pudo mostrar ${patron.nombre}. Prueba con otro modelo.`, true);
    }
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
