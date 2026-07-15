// packages/db/src/test-db.ts
import 'dotenv/config';
import { db } from './index.js';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

// Match the system enum structure
export const difficultyValues = ["easy", "medium", "hard"] as const;

// 1. Define a temporary runtime inline table schema specifically for this mock test
const mockScoresTable = sqliteTable("mock_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerName: text("player_name").notNull(),
  winnings: integer("winnings").notNull(),
  difficulty: text("difficulty", { enum: difficultyValues }).notNull(),
  questionsAnswered: integer("questions_answered").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  won: integer("won", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Generate Zod schema and inference types to match production design
export const insertMockScoreSchema = createInsertSchema(mockScoresTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMockScore = z.infer<typeof insertMockScoreSchema>;
export type MockScore = typeof mockScoresTable.$inferSelect;

async function test() {
  try {
    console.log('🔨 Creating isolated "mock_scores" table...');
    // Formatted query aligning directly with the SQLite columns and modes
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS "mock_scores" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "player_name" text NOT NULL,
        "winnings" integer NOT NULL,
        "difficulty" text NOT NULL CHECK ("difficulty" IN ('easy', 'medium', 'hard')),
        "questions_answered" integer NOT NULL,
        "correct_answers" integer NOT NULL,
        "won" integer NOT NULL,
        "created_at" integer NOT NULL
      );
    `);
    console.log('✅ Mock table initialized.');

    console.log('🔄 Writing a dummy row into "mock_scores"...');
    
    // Safely structure payload to mock API data validation flow
    const testData: InsertMockScore = {
      playerName: "NOLA Trivia Fanatic",
      winnings: 32000,
      difficulty: "medium",
      questionsAnswered: 10,
      correctAnswers: 10,
      won: false,
    };

    // Ensure insert score schema validates successfully
    const validatedData = insertMockScoreSchema.parse(testData);

    const newScore = await db.insert(mockScoresTable).values(validatedData).returning();
    console.log('🎉 Success! Inserted mock score:', newScore);

    console.log('🔄 Verification: Querying all rows inside "mock_scores"...');
    const allScores = await db.select().from(mockScoresTable);
    console.log(`📋 Rows detected: ${allScores.length}`);
    console.log(allScores);

  } catch (error) {
    console.error('❌ Test script execution failed:', error);
  } finally {
    // 2. The 'finally' block guarantees this drops the table
    console.log('🗑️ Cleaning up: Dropping "mock_scores" table...');
    try {
      await db.run(sql`DROP TABLE IF EXISTS "mock_scores";`);
      console.log('✅ Mock table successfully removed.');
    } catch (dropError) {
      console.error('⚠️ Failed to drop mock table during cleanup:', dropError);
    }
  }
}

// Execute the test script
test();
