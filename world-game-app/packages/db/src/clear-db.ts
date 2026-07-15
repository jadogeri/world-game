import { db } from "@repo/db";
import * as schema from "@repo/db"; // Point to your exported tables file
import { reset } from "drizzle-seed";

async function clearDatabase() {
  console.log("🗑️ Clearing all data from Turso...");
  await reset(db as any, schema);
  console.log("✅ Database cleared!");
}

clearDatabase();