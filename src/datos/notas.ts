import { abrirBaseDeDatos } from "./estadoModelos";
import { cifrarTexto, descifrarTexto, type SobreCifrado } from "./cifrado";
import { PATRONES } from "./patrones";

interface RegistroNota extends SobreCifrado { modeloId: string }
const idsValidos = new Set(PATRONES.map((patron) => patron.id));

function validar(modeloId: string): void {
  if (!idsValidos.has(modeloId)) throw new Error("Modelo desconocido");
}

async function registro(modeloId: string): Promise<RegistroNota | undefined> {
  validar(modeloId);
  const db = await abrirBaseDeDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notas", "readonly");
    const solicitud = tx.objectStore("notas").get(modeloId);
    tx.oncomplete = () => resolve(solicitud.result as RegistroNota | undefined);
    tx.onabort = () => reject(tx.error ?? new Error("No se pudo leer la nota"));
  });
}

export async function existeNota(modeloId: string): Promise<boolean> {
  return (await registro(modeloId)) !== undefined;
}

export async function leerNota(modeloId: string, password: string): Promise<string> {
  const nota = await registro(modeloId);
  if (!nota) throw new Error("No existe una nota para este modelo");
  return descifrarTexto(modeloId, nota, password);
}

/** Confirma la contraseña anterior antes de sustituir un registro existente. */
export async function guardarNota(modeloId: string, texto: string, password: string): Promise<void> {
  const anterior = await registro(modeloId);
  if (anterior) await descifrarTexto(modeloId, anterior, password);
  const cifrado = await cifrarTexto(modeloId, texto, password);
  const db = await abrirBaseDeDatos();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("notas", "readwrite");
    const almacen = tx.objectStore("notas");
    const actual = almacen.get(modeloId);
    actual.onsuccess = () => {
      const presente = actual.result as RegistroNota | undefined;
      // Detecta escrituras intercaladas de otra pestaña mientras se derivaba la clave.
      if (Boolean(anterior) !== Boolean(presente) ||
        (anterior && presente && !anterior.iv.every((byte, i) => byte === presente.iv[i]))) {
        tx.abort();
        return;
      }
      almacen.put({ modeloId, ...cifrado } satisfies RegistroNota);
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("La nota cambió en otra pestaña; vuelve a abrirla."));
  });
}
