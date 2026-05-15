import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // MapLibre alone is ~800 kB raw; legitimate for a map app. Bump the warn
    // threshold so the build is warning-free without code-splitting MapLibre
    // (it's needed on the initial route, so dynamic import wouldn't help).
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          maplibre: ["maplibre-gl"],
          recharts: ["recharts"],
        },
      },
    },
  },
});
