import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

// 💡 FIX: Robust directory resolution fallback that guarantees stability in production pipelines
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Resolves upward to the monorepo root directory where your master .env lives
  const rootEnvPath = path.resolve(__dirname, "../..");
  
  // Fetches workspace variables with or without a 'VITE_' prefix seamlessly
  const env = loadEnv(mode, rootEnvPath, [""]);

  // 💡 Safe fallback evaluation: Uses your vars locally, handles missing envs on Vercel gracefully
  const rawPort = env.CLIENT_PORT || process.env.PORT || "4000";
  const frontendPort = parseInt(rawPort, 10);
  const apiPort = env.SERVER_PORT ? parseInt(env.SERVER_PORT, 10) : 3000;

  // Final check ensuring local dev targets don't parse to corrupted NaN states
  if (Number.isNaN(frontendPort)) {
    throw new Error(`Invalid port value parsed from environment configurations.`);
  }

  const basePath = env.BASE_PATH || process.env.BASE_PATH || "/";

  return {
    base: basePath,
    plugins: [
      tailwindcss(),
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "..", "..", "attached_assets"),
      },
      // 💡 FIXED: Explicitly force these packages to never duplicate their context state
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    root: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: frontendPort, 
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
      // Proxies frontend requests smoothly over to your server context during local dev workflows
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: frontendPort,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
