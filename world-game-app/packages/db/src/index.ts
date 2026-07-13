import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.js";
import * as dotenv from "dotenv";
import path from "path";

// 💡 FIXED: Tell the DB package exactly how to look up out of its own folder and find the root .env
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") }); 

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL must be set.");
}

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL!, // 👈 This will now grab the variable successfully!
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle({ client, schema });

export * from "./schema/index.js";



/*import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.js";

console.log("TURSO_DATABASE_URL:", process.env.TURSO_DATABASE_URL);
console.log("TURSO_AUTH_TOKEN:", process.env.TURSO_AUTH_TOKEN);
if (!process.env.TURSO_DATABASE_URL) {
  throw new Error(
    "TURSO_DATABASE_URL must be set. Did you forget to provision the Turso database?",
  );
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "TURSO_AUTH_TOKEN must be set. Did you forget to provision the Turso database?",
  );
}

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export * from "./schema";


*/