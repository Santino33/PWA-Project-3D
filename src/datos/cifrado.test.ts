import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { cifrarTexto, descifrarTexto, type SobreCifrado } from "./cifrado";

describe("prueba aislada del mecanismo criptográfico", () => {
  it("deriva con sal persistida y recupera el texto después de reabrir IndexedDB", async () => {
    const original = "Contenido privado de prueba 🔒";
    const cifrado = await cifrarTexto("capas", original, "contraseña de prueba");
    const apertura = indexedDB.open("prueba-cripto", 1);
    apertura.onupgradeneeded = () => apertura.result.createObjectStore("prueba");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      apertura.onsuccess = () => resolve(apertura.result);
      apertura.onerror = () => reject(apertura.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("prueba", "readwrite");
      tx.objectStore("prueba").put(cifrado, "texto");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();

    const reapertura = indexedDB.open("prueba-cripto");
    const otra = await new Promise<IDBDatabase>((resolve, reject) => {
      reapertura.onsuccess = () => resolve(reapertura.result);
      reapertura.onerror = () => reject(reapertura.error);
    });
    const guardado = await new Promise<SobreCifrado>((resolve, reject) => {
      const solicitud = otra.transaction("prueba").objectStore("prueba").get("texto");
      solicitud.onsuccess = () => resolve(solicitud.result as SobreCifrado);
      solicitud.onerror = () => reject(solicitud.error);
    });
    otra.close();
    expect(await descifrarTexto("capas", guardado, "contraseña de prueba")).toBe(original);
    await expect(descifrarTexto("capas", guardado, "incorrecta")).rejects.toThrow("Contraseña incorrecta");
    await expect(descifrarTexto("mvc", guardado, "contraseña de prueba")).rejects.toThrow("Contraseña incorrecta");
    const alterado = { ...guardado, ciphertext: guardado.ciphertext.slice(0) };
    new Uint8Array(alterado.ciphertext)[0] ^= 1;
    await expect(descifrarTexto("capas", alterado, "contraseña de prueba")).rejects.toThrow("datos cifrados dañados");
    expect((await cifrarTexto("capas", original, "contraseña de prueba")).iv).not.toEqual(guardado.iv);
  });
});
