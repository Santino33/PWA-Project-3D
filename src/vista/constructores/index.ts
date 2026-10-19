/* ============================================================================
   CAPA DE VISTA — Registro de constructores 3D.

   Traduce el id de un patrón al objeto 3D que lo representa. Fíjate en que el
   registro está tipado por `string`, no por PatronArquitectura: la vista no
   importa nada de dominio/, solo recibe un identificador.
   ========================================================================== */

import * as THREE from "three";

import { construirArbolBinario } from "./arbolBinario";
import { construirCapas } from "./capas";
import { construirClienteCacheServidor } from "./clienteCacheServidor";
import { construirClienteServidor } from "./clienteServidor";
import { construirMicroservicios } from "./microservicios";
import { construirMvc } from "./mvc";
import { construirPublicadorSuscriptor } from "./publicadorSuscriptor";
import { construirRepositorio } from "./repositorio";

type ConstructorPatron = () => THREE.Group;

const REGISTRO: Record<string, ConstructorPatron> = {
  "arbol-binario": construirArbolBinario,
  capas: construirCapas,
  "cliente-cache-servidor": construirClienteCacheServidor,
  "cliente-servidor": construirClienteServidor,
  microservicios: construirMicroservicios,
  mvc: construirMvc,
  "publicador-suscriptor": construirPublicadorSuscriptor,
  repositorio: construirRepositorio,
};

/** Un id del catálogo sin constructor es un error, no un modelo ficticio. */
export function construirPatron(id: string): THREE.Group {
  const constructor = REGISTRO[id];
  if (!constructor) throw new Error(`No hay constructor 3D para "${id}"`);
  return constructor();
}
