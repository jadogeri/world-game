// packages/db/drizzle.config.ts
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const isLocal = url?.startsWith('file:');

export default defineConfig({
  out: './src/migrations',
  schema: './src/schema/',
  dialect: isLocal ? 'sqlite' : 'turso',
  dbCredentials: isLocal
    ? { url: url! }
    : { url: url!, authToken },
});



/*import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL, ensure the database is provisioned");
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
*/