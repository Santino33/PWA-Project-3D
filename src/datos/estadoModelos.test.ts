import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { abrirBaseDeDatos, alternarFavorito, marcarModeloVisto, obtenerEstados, obtenerFavoritos, obtenerHistorial, NOMBRE_BD } from "./estadoModelos";

describe("estado persistido de los modelos", () => {
  it("crea índices, actualiza con cursor y persiste alternancias e historial", async () => {
    const db = await abrirBaseDeDatos();
    expect(db.name).toBe(NOMBRE_BD);
    expect([...db.transaction("estadoModelos").objectStore("estadoModelos").indexNames]).toEqual(["porFavorito", "porUltimaVista"]);

    const primero = await marcarModeloVisto("capas");
    const segundo = await marcarModeloVisto("capas");
    expect(segundo.ultimaVista).toBeGreaterThanOrEqual(primero.ultimaVista!);
    expect(await alternarFavorito("capas")).toMatchObject({ favorito: 1, ultimaVista: segundo.ultimaVista });
    expect((await obtenerFavoritos()).map((e) => e.modeloId)).toEqual(["capas"]);
    await Promise.all([alternarFavorito("capas"), alternarFavorito("capas")]);
    expect((await obtenerEstados()).find((e) => e.modeloId === "capas")?.favorito).toBe(1);
    expect((await obtenerHistorial()).map((e) => e.modeloId)).toEqual(["capas"]);

    // Otra conexión simula consultar los datos después de cerrar y volver a abrir la app.
    const otra = await new Promise<IDBDatabase>((resolve, reject) => {
      const solicitud = indexedDB.open(NOMBRE_BD);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => reject(solicitud.error);
    });
    const guardado = await new Promise<unknown>((resolve, reject) => {
      const solicitud = otra.transaction("estadoModelos").objectStore("estadoModelos").get("capas");
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => reject(solicitud.error);
    });
    expect(guardado).toMatchObject({ modeloId: "capas", favorito: 1 });
    otra.close();
  });

  it("rechaza los identificadores ajenos al catálogo", async () => {
    await expect(alternarFavorito("no-existe")).rejects.toThrow("Modelo desconocido");
  });
});
