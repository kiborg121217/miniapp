import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // VK Bridge не выносим в отдельный vendor chunk: он нужен в самом раннем
            // entry-коде, чтобы VKWebAppInit ушёл до загрузки React/Firebase.
            if (id.includes("@vkontakte/vk-bridge")) return undefined;
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("react") || id.includes("react-dom")) return "vendor-react";
            return "vendor";
          }
        },
      },
    },
  },
});
