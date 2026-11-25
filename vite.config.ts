/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Setanta Coach",
        short_name: "Setanta",
        description: "Due minuti al giorno per Allenamento della Forza 2.",
        lang: "it",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#d9d5cb",
        theme_color: "#d9d5cb",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png}"], globIgnores: ["push-sw.js"], importScripts: ["push-sw.js"] },
    }),
  ],
  test: { include: ["src/**/*.test.ts"] },
});
