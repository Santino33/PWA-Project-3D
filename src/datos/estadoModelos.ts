import { PATRONES } from "./patrones";
import type { EstadoModelo } from "../dominio/EstadoModelo";

export const NOMBRE_BD = "atlas3d";
const VERSION_BD = 1;
const MODELOS = "estadoModelos";
const IDS_VALIDOS = new Set(PATRONES.map(({ id }) => id));
let conexion: Promise<IDBDatabase> | null = null;

function comprobarId(modeloId: string): void {
  if (!IDS_VALIDOS.has(modeloId)) throw new Error(`Modelo desconocido: ${modeloId}`);
}

/** Una sola apertura compartida; las migraciones se hacen exclusivamente en onupgradeneeded. */
export function abrirBaseDeDatos(): Promise<IDBDatabase> {
  if (conexion) return conexion;
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB no está disponible"));

  conexion = new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, VERSION_BD);
    let bloqueada = false;
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(MODELOS)) {
        const almacen = db.createObjectStore(MODELOS, { keyPath: "modeloId" });
        almacen.createIndex("porFavorito", "favorito");
        almacen.createIndex("porUltimaVista", "ultimaVista");
      }
      if (!db.objectStoreNames.contains("notas")) db.createObjectStore("notas", { keyPath: "modeloId" });
    };
    solicitud.onblocked = () => {
      bloqueada = true;
      reject(new Error("Otra pestaña bloquea la actualización de la base de datos. Ciérrala y recarga."));
    };
    solicitud.onerror = () => reject(solicitud.error ?? new Error("No se pudo abrir IndexedDB"));
    solicitud.onsuccess = () => {
      const db = solicitud.result;
      if (bloqueada) { db.close(); return; }
      db.onversionchange = () => {
        db.close();
        conexion = null;
        if (typeof window !== "undefined") window.dispatchEvent(new Event("atlas3d:versionchange"));
      };
      resolve(db);
    };
  }).catch((error: unknown) => {
    conexion = null;
    throw error;
  });
  return conexion;
}

/** Resolver al completar la transacción, no al recibir una sola solicitud. */
function transaccion<T>(db: IDBDatabase, modo: IDBTransactionMode, operar: (almacen: IDBObjectStore, entregar: (valor: T) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(MODELOS, modo);
    let valor: T;
    tx.oncomplete = () => resolve(valor);
    tx.onabort = () => reject(tx.error ?? new Error("Se canceló la transacción"));
    try {
      operar(tx.objectStore(MODELOS), (resultado) => { valor = resultado; });
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

/** Recorre la clave primaria y actualiza el registro existente con IDBCursor.update(). */
export async function marcarModeloVisto(modeloId: string): Promise<EstadoModelo> {
  comprobarId(modeloId);
  const db = await abrirBaseDeDatos();
  return transaccion(db, "readwrite", (almacen, entregar) => {
    const cursor = almacen.openCursor(IDBKeyRange.only(modeloId));
    cursor.onsuccess = () => {
      const existente = cursor.result;
      const nuevo: EstadoModelo = existente
        ? { ...(existente.value as EstadoModelo), ultimaVista: Date.now() }
        : { modeloId, favorito: 0, ultimaVista: Date.now() };
      if (existente) existente.update(nuevo);
      else almacen.add(nuevo);
      entregar(nuevo);
    };
  });
}

/** La lectura y el cambio pertenecen a la misma transacción: dos clics no pisan el mismo valor. */
export async function alternarFavorito(modeloId: string): Promise<EstadoModelo> {
  comprobarId(modeloId);
  const db = await abrirBaseDeDatos();
  return transaccion(db, "readwrite", (almacen, entregar) => {
    const solicitud = almacen.get(modeloId);
    solicitud.onsuccess = () => {
      const anterior = solicitud.result as EstadoModelo | undefined;
      const nuevo: EstadoModelo = {
        ...(anterior ?? { modeloId }),
        favorito: anterior?.favorito === 1 ? 0 : 1,
      };
      almacen.put(nuevo);
      entregar(nuevo);
    };
  });
}

export async function obtenerFavoritos(): Promise<EstadoModelo[]> {
  const db = await abrirBaseDeDatos();
  return transaccion(db, "readonly", (almacen, entregar) => {
    const solicitud = almacen.index("porFavorito").getAll(1);
    solicitud.onsuccess = () => entregar(solicitud.result as EstadoModelo[]);
  });
}

/** Permite hidratar tarjetas e historial sin leer ni descifrar notas. */
export async function obtenerEstados(): Promise<EstadoModelo[]> {
  const db = await abrirBaseDeDatos();
  return transaccion(db, "readonly", (almacen, entregar) => {
    const solicitud = almacen.getAll();
    solicitud.onsuccess = () => entregar(solicitud.result as EstadoModelo[]);
  });
}

export async function obtenerHistorial(): Promise<EstadoModelo[]> {
  const db = await abrirBaseDeDatos();
  return transaccion(db, "readonly", (almacen, entregar) => {
    const resultado: EstadoModelo[] = [];
    const solicitud = almacen.index("porUltimaVista").openCursor(null, "prev");
    solicitud.onsuccess = () => {
      const cursor = solicitud.result;
      if (cursor) { resultado.push(cursor.value as EstadoModelo); cursor.continue(); }
      else entregar(resultado);
    };
  });
}
