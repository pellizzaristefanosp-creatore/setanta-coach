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
        name: "L'Alveare di Enrica",
        short_name: "Alveare",
        description: "Due minuti al giorno per studiare apicoltura con il Frate Adamo.",
        lang: "it",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fdf6e4",
        theme_color: "#fdf6e4",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png}"] },
    }),
  ],
  test: { include: ["src/**/*.test.ts"] },
});
