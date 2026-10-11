import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": backendTarget,
      "/media": backendTarget,
    },
  },
  preview: {
    proxy: {
      "/api": backendTarget,
      "/media": backendTarget,
    },
  },
  build: {
    rollupOptions: {
      input: {
        app: "index.html",
        demo: "demo.html",
      },
    },
  },
});
