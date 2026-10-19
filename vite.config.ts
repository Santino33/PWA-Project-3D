import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [VitePWA({
    strategies: "injectManifest",
    srcDir: "src/pwa",
    filename: "sw.ts",
    manifest: false, // Se conserva public/manifest.json como única fuente del manifiesto.
    injectRegister: null, // La app registra /sw.js mediante workbox-window.
    devOptions: { enabled: false },
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,json}", "iconos/icon-192.png", "iconos/icon-512.png"],
      maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    },
  })],
});
