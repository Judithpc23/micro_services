import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Opcional: proxy para evitar CORS
    // proxy: { "/api": { target: "http://localhost:4000", changeOrigin: true } }
  },
});

