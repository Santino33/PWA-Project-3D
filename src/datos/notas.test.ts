import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { abrirBaseDeDatos } from "./estadoModelos";
import { existeNota, guardarNota, leerNota } from "./notas";

describe("notas por modelo", () => {
  it("guarda solo texto cifrado, recupera por contraseña y no sobrescribe ante fallos", async () => {
    expect(await existeNota("mvc")).toBe(false);
    await guardarNota("mvc", "Mi aprendizaje privado", "clave de prueba");
    expect(await existeNota("mvc")).toBe(true);
    const db = await abrirBaseDeDatos();
    const leerRegistro = () => new Promise<Record<string, unknown>>((resolve, reject) => {
      const solicitud = db.transaction("notas").objectStore("notas").get("mvc");
      solicitud.onsuccess = () => resolve(solicitud.result as Record<string, unknown>);
      solicitud.onerror = () => reject(solicitud.error);
    });
    const antes = await leerRegistro();
    expect(antes).toMatchObject({ modeloId: "mvc", version: 1 });
    expect(JSON.stringify(antes)).not.toContain("aprendizaje privado");
    await expect(guardarNota("mvc", "Sobrescritura", "incorrecta")).rejects.toThrow("Contraseña incorrecta");
    expect(await leerRegistro()).toEqual(antes);
    expect(await leerNota("mvc", "clave de prueba")).toBe("Mi aprendizaje privado");
    await guardarNota("mvc", "Nota editada", "clave de prueba");
    expect(await leerNota("mvc", "clave de prueba")).toBe("Nota editada");
    expect((await leerRegistro()).iv).not.toEqual(antes.iv);
    await expect(leerNota("capas", "clave de prueba")).rejects.toThrow("No existe");
  });
});
