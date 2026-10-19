import { expect, test } from "@playwright/test";

test("catálogo, favoritos y notas sobreviven a la recarga sin conexión", async ({ page, context }) => {
  const errores: string[] = [];
  page.on("pageerror", (error) => errores.push(error.message));
  await page.goto("/");
  await expect(page.locator(".item-catalogo")).toHaveCount(8);
  await page.getByRole("button", { name: "Arquitectura en Capas: Ver modelo en 3D" }).click();
  await expect(page.locator("#descripcion-patron h2")).toHaveText("Arquitectura en Capas");
  await page.getByRole("button", { name: "Añadir a favoritos: Arquitectura en Capas" }).click();
  await expect(page.getByRole("button", { name: "Quitar de favoritos: Arquitectura en Capas" })).toBeVisible();
  await page.getByRole("button", { name: "Ver favoritos" }).click();
  await expect(page.locator(".item-catalogo")).toHaveCount(1);
  await page.getByRole("button", { name: "Mostrar todos" }).click();

  await page.locator("#password-nota").fill("contraseña de prueba");
  await page.locator("#texto-nota").fill("Apunte privado sobre capas");
  await page.getByRole("button", { name: "Guardar cifrada" }).click();
  await expect(page.locator("#estado-nota")).toContainText("cifrada y guardada");
  const almacenamiento = await page.evaluate(async () => {
    const solicitud = indexedDB.open("atlas3d");
    const bd = await new Promise<IDBDatabase>((resolve, reject) => {
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => reject(solicitud.error);
    });
    const nota = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const peticion = bd.transaction("notas").objectStore("notas").get("capas");
      peticion.onsuccess = () => resolve(peticion.result as Record<string, unknown>);
      peticion.onerror = () => reject(peticion.error);
    });
    bd.close();
    return { tieneSal: nota.salt instanceof Uint8Array, tieneIV: nota.iv instanceof Uint8Array, campos: Object.keys(nota) };
  });
  expect(almacenamiento).toMatchObject({ tieneSal: true, tieneIV: true });
  expect(almacenamiento.campos).not.toContain("texto");
  await page.getByRole("button", { name: "Cerrar nota" }).click();
  await expect(page.getByRole("button", { name: "Desbloquear" })).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".item-catalogo")).toHaveCount(8);
  await expect(page.locator("#estado-conexion")).toContainText("Sin conexión");
  await expect(page.getByRole("button", { name: "Quitar de favoritos: Arquitectura en Capas" })).toBeVisible();
  await page.getByRole("button", { name: "Arquitectura en Capas: Ver modelo en 3D" }).click();
  await page.locator("#password-nota").fill("incorrecta");
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(page.locator("#estado-nota")).toContainText("Contraseña incorrecta");
  await page.locator("#password-nota").fill("contraseña de prueba");
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(page.locator("#texto-nota")).toHaveValue("Apunte privado sobre capas");
  expect(errores).toEqual([]);
});

test("el botón ofrece instalación cuando se recibe beforeinstallprompt", async ({ page }) => {
  await page.goto("/");
  const manifiesto = await page.evaluate(async () => (await fetch("/manifest.json")).json());
  expect(manifiesto.icons).toHaveLength(3);
  await page.evaluate(() => {
    const evento = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(evento, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(evento);
  });
  await expect(page.getByRole("button", { name: "Instalar Atlas 3D" })).toBeVisible();
  await page.getByRole("button", { name: "Instalar Atlas 3D" }).click();
  await expect(page.locator("#estado-pwa")).toContainText("Instalación aceptada");
});

test("los ocho modelos se abren en el visor compartido", async ({ page, browserName, context }) => {
  await page.goto("/");
  await expect(page.locator(".item-catalogo")).toHaveCount(8);
  for (const tarjeta of await page.locator(".item-catalogo").all()) {
    const nombre = await tarjeta.locator(".item-nombre").textContent();
    await tarjeta.locator(".abrir-modelo").click();
    await expect(page.locator("#descripcion-patron h2")).toHaveText(nombre ?? "");
  }
  const canvas = page.locator("#lienzo-3d");
  await expect(canvas).toHaveCount(1);
  const webglDisponible = await canvas.evaluate((elemento) =>
    Boolean((elemento as HTMLCanvasElement).getContext("webgl2")));
  if (webglDisponible) await expect(page.locator("#estado-visor")).toBeHidden();
  else await expect(page.locator("#estado-visor")).toContainText("no está disponible");
  if (browserName === "chromium") {
    const cdp = await context.newCDPSession(page);
    const respuesta = await cdp.send("Page.getAppManifest");
    expect(respuesta.errors).toEqual([]);
    expect(respuesta.data).toContain("Atlas 3D");
  }
});
