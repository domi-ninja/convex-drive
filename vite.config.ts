import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      // Ensure tslib is bundled rather than treated as external
      external: (id) => {
        // Don't externalize tslib
        if (id === 'tslib') return false;
        // Keep other externals as they were
        return false;
      },
    },
  },
});
