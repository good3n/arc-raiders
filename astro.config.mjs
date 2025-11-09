import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import path from "path";

export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        "@": path.resolve("./src"),
        "@components": path.resolve("./src/components"),
        "@layouts": path.resolve("./src/layouts"),
        "@assets": path.resolve("./src/assets"),
        "@styles": path.resolve("./src/styles"),
      },
    },
    build: {
      rollupOptions: {
        input: ["src/data/**/*"],
      },
    },
    assetsInclude: ["**/*.json"],
  },
});
