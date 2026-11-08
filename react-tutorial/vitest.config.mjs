import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // Faqat web'ning o'z testlari — backend/ (node --test bilan) va boshqa
    // papkalar vitest tomonidan yiqitilmasligi uchun.
    include: ["src/**/*.{test,spec}.{js,jsx,mjs}"],
    exclude: ["**/node_modules/**", "backend/**", "dist/**"],
    environmentOptions: {
      jsdom: {
        url: "http://localhost",
      },
    },
  },
});