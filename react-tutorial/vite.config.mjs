import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3006,
    proxy: {
      // Lokal ishlab chiqishda API va WebSocket'ni backend'ga yo'naltirish
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      // Katta vendor'lar alohida bo'limlarga (chunks) ajratiladi
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) {
            return "react";
          }
          if (id.includes("@tanstack")) return "query";
          if (id.includes("socket.io-client")) return "socket";
          if (id.includes("lucide-react")) return "icons";
          return undefined;
        },
      },
    },
  },
});