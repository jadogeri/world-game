import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "drizzle-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

let url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// 🛠️ DEV PATH SAFETY: Resolve local relative files to the root directory
if (url?.startsWith('file:.')) {
  const relativePath = url.replace('file:', ''); // Extracts "./world-game.db"
  url = `file:${path.resolve(__dirname, "../../", relativePath)}`; // Points to workspace root
}

const isLocal = url?.startsWith('file:');

export default defineConfig({
  out: './src/migrations',
  schema: './src/schema/',
  dialect: isLocal ? 'sqlite' : 'turso',
  dbCredentials: isLocal
    ? { url: url! }
    : { url: url!, authToken },
});
