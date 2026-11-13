import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const api = env.VITE_DEV_API || "http://127.0.0.1:4000";
  // dev: same-origin proxy -> session cookie + OAuth redirects work exactly like production (Nginx)
  const proxy = Object.fromEntries(
    ["/api", "/sw.js", "/manifest.webmanifest"].map((p) => [p, { target: api, changeOrigin: false, ws: false }]),
  );
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        // components written for Next.js keep their imports; these map to small compat shims
        "next/link": path.resolve(__dirname, "src/shims/next-link.jsx"),
        "next/navigation": path.resolve(__dirname, "src/shims/next-navigation.js"),
        "next/image": path.resolve(__dirname, "src/shims/next-image.jsx"),
        "next/dynamic": path.resolve(__dirname, "src/shims/next-dynamic.jsx"),
        "next/script": path.resolve(__dirname, "src/shims/next-script.jsx"),
      },
    },
    server: { port: 5173, proxy },
    preview: { port: 5173, proxy },
    build: {
      outDir: "dist",
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            icons: ["lucide-react"],
          },
        },
      },
    },
  };
});
