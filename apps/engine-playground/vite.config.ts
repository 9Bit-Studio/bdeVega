import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  // Keep the playground faithful to the production Next.js player: both read
  // the same reviewed/generated asset pack from apps/web/public.
  publicDir: fileURLToPath(new URL("../web/public", import.meta.url)),
  resolve: {
    alias: {
      "@vega/engine": fileURLToPath(new URL("../../packages/engine/src/index.ts", import.meta.url)),
      "@vega/genres": fileURLToPath(new URL("../../packages/genres/src/index.ts", import.meta.url)),
      "@vega/spec": fileURLToPath(new URL("../../packages/spec/src/index.ts", import.meta.url)),
    },
  },
});
