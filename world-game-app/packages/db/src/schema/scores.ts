import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const difficultyValues = ["easy", "medium", "hard"] as const;

export const scoresTable = sqliteTable("scores", {
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

export const insertScoreSchema = createInsertSchema(scoresTable).omit({
  id: true,
  createdAt: true,
});
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scoresTable.$inferSelect;
