# Atlas 3D de Arquitectura de Software

PWA en Vite, TypeScript y Three.js. El catálogo público contiene ocho patrones con geometrías generadas en código; se representan en un solo visor WebGL. IndexedDB conserva favoritos, última visualización y notas cifradas por modelo. Las notas usan PBKDF2 (SHA-256, 210 000 iteraciones) y AES-GCM con sal por nota e IV nuevo en cada guardado; la contraseña no se almacena. La pérdida de contraseña impide recuperar esa nota.

## Desarrollo y comprobaciones

```bash
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
npm run preview -- --host 127.0.0.1 --port 4198 --strictPort
```

Las pruebas E2E lanzan una vista previa del **build** en el puerto 4199 y recorren Chromium (escritorio y móvil emulado) y Firefox. La instalación del navegador no se confirma con un evento simulado: la prueba del prompt verifica la interfaz; la instalabilidad real se comprueba manualmente en Chrome compatible, mediante `Application → Manifest` y el botón «Instalar Atlas 3D» cuando se emite `beforeinstallprompt`. Si el navegador no lo ofrece, «Cómo instalar» muestra instrucciones alternativas.

Para ejecutar también WebKit cuando sus librerías nativas estén disponibles: `RUN_WEBKIT=1 npm run test:e2e`. En Fedora 44 de este entorno, Playwright no puede iniciar WebKit por falta de libicu74, libjpeg-turbo8 y gstreamer1.0-libav; esa matriz queda pendiente de un host compatible o macOS/Safari. No se necesitan esas librerías para usar la aplicación en Chromium o Firefox.

Con `preview` en ejecución, Lighthouse móvil (v13.5.0; Chrome 155, localhost) se reproduce con:

```bash
./node_modules/.bin/lighthouse http://127.0.0.1:4198/ --chrome-path=/usr/bin/google-chrome --chrome-flags='--headless=new --no-sandbox --disable-dev-shm-usage' --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=/tmp/opencode/atlas3d-lighthouse.json
```

| Ronda (19-10-2026) | Performance | Accessibility | Best Practices | SEO | Correcciones |
|---|---:|---:|---:|---:|---|
| Línea base de la iteración implementada | 71 | 100 | 100 | 82 | CLS móvil 0,799, JS inicial pesado, faltaba descripción. |
| Tras diferir visor y reservar espacio móvil | 94 | 100 | 100 | 91 | CLS 0, JS inicial ≈27 KB, descripción añadida. |
| Tras robots.txt y mejoras del visor | 93 | 100 | 100 | 100 | `robots.txt` válido, pausa al ocultarse, teclado y movimiento reducido. Variación de Performance entre corridas. |
| Build final: carga 3D al llegar al visor | 100 | 100 | 100 | 100 | El catálogo aparece antes de WebGL; al abrir o alcanzar el visor se carga el mismo renderer. TBT 15 ms y CLS 0 en esta corrida. |

El build final reporta **9 URL y 600,57 KiB de precache** (incluye los módulos de Three.js y los ocho modelos en código). Lighthouse v13 no ofrece una puntuación PWA separada: para verificarla, abrir la app online, esperar al Service Worker, activar «Offline» en DevTools, recargar y recorrer modelos, favoritos y notas. Las pruebas E2E automatizan esta secuencia. La primera visita requiere red; si se añadieran modelos externos no cacheados, habría que indicar expresamente su indisponibilidad offline. Las puntuaciones pueden variar entre corridas y dispositivos.

### Estructura

- `src/datos/patrones.ts`: catálogo descriptivo público; `src/vista/constructores/`: formas 3D.
- `src/controlador/ControladorVisor.ts`: enlaza catálogo, vista, persistencia y selección.
- `src/datos/estadoModelos.ts`: IndexedDB con índices `porFavorito` y `porUltimaVista`; `marcarModeloVisto` usa `IDBCursor.update()`.
- `src/datos/notas.ts` y `src/datos/cifrado.ts`: almacenamiento cifrado y WebCrypto independientes del renderizado.
- `src/pwa/sw.ts`, `vite.config.ts`: Workbox con precache inyectado, navegación `NetworkFirst`, imágenes no esenciales `CacheFirst` y expiración; `src/pwa/registrarServiceWorker.ts`: registro mediante `workbox-window`.

El estado es local al navegador y puede perderse si el usuario borra los datos del sitio. Probar instalación real, capacidad de almacenamiento y fluidez WebGL en dispositivos físicos antes de publicar.
