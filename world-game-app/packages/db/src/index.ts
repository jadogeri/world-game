import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.js";
import * as dotenv from "dotenv";
import path from "path";

// Pull the global environment file from the root
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") }); 

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL must be set.");
}

let url = process.env.TURSO_DATABASE_URL;

// 🛠️ DEV PATH SAFETY: Make sure runtime execution also resolves the exact same root path
if (url.startsWith('file:.')) {
  const relativePath = url.replace('file:', ''); // Extracts "./world-game.db"
  url = `file:${path.resolve(import.meta.dirname, "../../../", relativePath)}`; 
}

export const client = createClient({
  url: url, // 👈 Dynamically uses the resolved absolute path or your production remote URL
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle({ client, schema });

export * from "./schema/index.js";
