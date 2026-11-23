import { defineConfig } from "vite";

export default defineConfig({
  root: "frontend",
  base: "/react/",
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/users.json", "**/bookings.json"] },
    proxy: {
      "/api": "http://localhost:5000",
      "/favicon.svg": "http://localhost:5000",
    },
  },
});
