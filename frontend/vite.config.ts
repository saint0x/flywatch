import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // WebSocket endpoints - must come before REST to match first
      "/logs/ws": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
      "/metrics/ws": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
      // REST endpoints
      "/health": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/healthz": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/ready": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/metrics": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/logs": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/chat": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/usage": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
})
