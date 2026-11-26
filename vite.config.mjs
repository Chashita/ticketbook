import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  root: "frontend",
  base: mode === "pages" ? "./" : "/react/",
  build: { outDir: mode === "pages" ? "../dist-pages" : "../dist", emptyOutDir: true },
  server: {
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/users.json", "**/bookings.json"] },
    proxy: {
      "/api": "http://localhost:5000",
      "/favicon.svg": "http://localhost:5000",
    },
  },
}));
