import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Tauri sniffs TAURI_ENV_* env vars; this matches the default scaffold so
// `pnpm tauri dev` and `pnpm dev` use the same Vite config.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:17456",
        changeOrigin: true,
      },
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
