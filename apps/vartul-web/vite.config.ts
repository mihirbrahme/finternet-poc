import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:4300", "/beckn": "http://127.0.0.1:4300", "/credentials": "http://127.0.0.1:4300", "/issuers": "http://127.0.0.1:4300" },
  },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 900 },
});
