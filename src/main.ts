/* ============================================================================
   Punto de entrada. No contiene lógica propia: busca los tres elementos del
   HTML, arma el Controlador y lo arranca.
   ========================================================================== */

import "./estilos.css";
import { ControladorVisor } from "./controlador/ControladorVisor";
import { registrarServiceWorker } from "./pwa/registrarServiceWorker";
import { iniciarEstadoPwa } from "./vista/estadoPwa";

/** Busca un elemento obligatorio y falla con un mensaje claro si no está. */
function requerir<T extends Element>(selector: string): T {
  const elemento = document.querySelector<T>(selector);
  if (elemento === null) {
    throw new Error(`No se encontró "${selector}" en index.html`);
  }
  return elemento;
}

const listaEl = requerir<HTMLElement>("#lista-catalogo");
const filtroEl = requerir<HTMLButtonElement>("#filtro-favoritos");
const lienzoEl = requerir<HTMLCanvasElement>("#lienzo-3d");
const descripcionEl = requerir<HTMLElement>("#descripcion-patron");
const estadoEl = requerir<HTMLElement>("#estado-visor");
const estadoCatalogoEl = requerir<HTMLElement>("#estado-catalogo");
const notasEl = requerir<HTMLElement>("#panel-notas");

const controlador = new ControladorVisor(listaEl, filtroEl, lienzoEl, descripcionEl, estadoEl, estadoCatalogoEl, notasEl);
controlador.iniciar();

const estadoPwa = requerir<HTMLElement>("#estado-pwa");
iniciarEstadoPwa(requerir<HTMLButtonElement>("#instalar-app"), requerir<HTMLElement>("#estado-conexion"), estadoPwa);
registrarServiceWorker((mensaje) => { estadoPwa.textContent = mensaje; });
