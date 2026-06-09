import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/trpc": "http://localhost:3001",
      "/api/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
        credentials: true,
      },
    },
  },
});
