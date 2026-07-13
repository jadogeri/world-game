import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Resolves upward to the monorepo root directory where your master .env lives
  const rootEnvPath = path.resolve(import.meta.dirname, "../..");
  
  // 💡 FIXED: Third argument MUST be [""] inside an array to fetch variables without a 'VITE_' prefix
  const env = loadEnv(mode, rootEnvPath, [""]);

  // Tracks your updated variable names (CLIENT_PORT & SERVER_PORT) Safely
  const frontendPort = env.CLIENT_PORT ? parseInt(env.CLIENT_PORT, 10) : 4000;
  const apiPort = env.SERVER_PORT ? parseInt(env.SERVER_PORT, 10) : 3000;

  // Final validation check to prevent NaN parsing crashes
  if (Number.isNaN(frontendPort)) {
    throw new Error(`Invalid CLIENT_PORT value parsed from environment config.`);
  }

  const basePath = env.BASE_PATH || "/";

  return {
    base: basePath,
    plugins: [
      tailwindcss(),
      react(),

    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
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
      // Proxies frontend requests smoothly over to NestJS
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

/*
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
*/