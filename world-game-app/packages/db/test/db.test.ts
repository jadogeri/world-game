import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { scoresTable, insertScoreSchema } from '../src/schema/index.js';
import { eq, desc } from 'drizzle-orm';

describe('Database Package Unit & Constraints Tests', () => {
  // Setup an isolated in-memory client for raw speed and testing safety
  const client = createClient({ url: 'file::memory:' });
  const db = drizzle({ client, schema: { scoresTable } });

  // Provision the database table schema manually using raw DDL statements
  beforeEach(async () => {
    await client.execute(`DROP TABLE IF EXISTS scores;`);
    await client.execute(`
      CREATE TABLE scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        winnings INTEGER NOT NULL,
        difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
        questions_answered INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        won INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  });

  afterAll(async () => {
    await client.close();
  });

  test('should insert a valid score row and generate defaults correctly', async () => {
    const validData = {
      playerName: 'Grace Hopper',
      winnings: 1000,
      difficulty: 'easy' as const,
      questionsAnswered: 5,
      correctAnswers: 5,
      won: false,
    };

    // Assert that the runtime Zod schema parsing handles valid objects perfectly
    const parsedData = insertScoreSchema.parse(validData);

    const insertedRows = await db.insert(scoresTable).values(parsedData).returning();
    expect(insertedRows).toHaveLength(1);
    
    const record = insertedRows[0];
    expect(record.id).toBeDefined();
    expect(record.playerName).toBe('Grace Hopper');
    expect(record.won).toBe(false); // Drizzle mode: "boolean" auto-maps SQLite 0/1 back to true/false
    expect(record.createdAt).toBeInstanceOf(Date); // Drizzle mode: "timestamp_ms" parses numeric epoch to Date instance
  });

  test('should fail when inserting an invalid difficulty option via DDL constraint', async () => {
    const invalidDifficultyRecord = {
      playerName: 'Invalid Player',
      winnings: 0,
      difficulty: 'expert' as any, // 'expert' is not inside our allowed enum values
      questionsAnswered: 0,
      correctAnswers: 0,
      won: false,
      createdAt: new Date(),
    };

    // 1. Verify that the client runtime Zod parser blocks this execution before hitting the database
    const validationResult = insertScoreSchema.safeParse(invalidDifficultyRecord);
    expect(validationResult.success).toBe(false);

    // 2. Verify that bypassing Zod triggers a hardware relational DDL constraint check crash in the database layer
    await expect(
      db.insert(scoresTable).values(invalidDifficultyRecord)
    ).rejects.toThrow();
  });

  test('should enforce NOT NULL table column attributes', async () => {
    const missingFieldsRecord = {
      winnings: 500,
      difficulty: 'medium' as const,
    };

    // Assert that our validation schema rejects entries missing mandatory relational values
    const validationResult = insertScoreSchema.safeParse(missingFieldsRecord);
    expect(validationResult.success).toBe(false);

    await expect(
      db.insert(scoresTable).values(missingFieldsRecord as any)
    ).rejects.toThrow();
  });

  test('should reliably rank, order, and query entries from the leaderboard', async () => {
    // Populate dummy table arrays out-of-order
    await db.insert(scoresTable).values([
      { playerName: 'Player A', winnings: 100, difficulty: 'easy', questionsAnswered: 1, correctAnswers: 1, won: false },
      { playerName: 'Player B', winnings: 1000000, difficulty: 'hard', questionsAnswered: 15, correctAnswers: 15, won: true },
      { playerName: 'Player C', winnings: 32000, difficulty: 'medium', questionsAnswered: 10, correctAnswers: 10, won: false },
    ]);

    // Query sorted table results using native Drizzle syntax structure matching your API logic
    const leaderboard = await db
      .select()
      .from(scoresTable)
      .orderBy(desc(scoresTable.winnings));

    expect(leaderboard).toHaveLength(3);
    expect(leaderboard[0].playerName).toBe('Player B'); // Millionaire rank top spot
    expect(leaderboard[1].playerName).toBe('Player C');
    expect(leaderboard[2].playerName).toBe('Player A');
  });
});
