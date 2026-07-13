import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, scoresTable } from "@repo/db";
import {
  ListTopScoresQueryParams,
  ListTopScoresResponse,
  CreateScoreBody,
  CreateScoreResponse,
} from "@repo/api-zod";

const router: IRouter = Router();

router.get("/scores", async (req, res): Promise<void> => {
  const parsed = ListTopScoresQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const limit = parsed.data.limit ?? 10;
  const scores = await db
    .select()
    .from(scoresTable)
    .orderBy(desc(scoresTable.winnings))
    .limit(limit);

  res.json(ListTopScoresResponse.parse(scores));
});

router.post("/scores", async (req, res): Promise<void> => {
  const parsed = CreateScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [score] = await db
    .insert(scoresTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(CreateScoreResponse.parse(score));
});

export default router;
