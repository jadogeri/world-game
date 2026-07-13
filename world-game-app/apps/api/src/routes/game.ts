import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import {
  GetQuestionQueryParams,
  GetQuestionResponse,
  VerifyAnswerBody,
  VerifyAnswerResponse,
  UseFiftyFiftyBody,
  UseFiftyFiftyResponse,
  AskAudienceBody,
  AskAudienceResponse,
  AskExpertBody,
  AskExpertResponse,
} from "@repo/api-zod";
import { verifyAnswerToken } from "../lib/answerToken";
import { generateQuestion } from "../lib/questions";

const router: IRouter = Router();

router.get("/game/question", (req, res): void => {
  const parsed = GetQuestionQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const question = generateQuestion(parsed.data.difficulty, parsed.data.level);
  res.json(GetQuestionResponse.parse(question));
});

router.post("/game/verify", (req, res): void => {
  const parsed = VerifyAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const payload = verifyAnswerToken(parsed.data.token);
  if (!payload) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  const result = {
    correct: parsed.data.selectedIndex === payload.correctIndex,
    correctIndex: payload.correctIndex,
    correctAnswer: payload.correctAnswer,
  };
  res.json(VerifyAnswerResponse.parse(result));
});

router.post("/game/fifty-fifty", (req, res): void => {
  const parsed = UseFiftyFiftyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const payload = verifyAnswerToken(parsed.data.token);
  if (!payload) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  const wrongIndices = [0, 1, 2, 3].filter((i) => i !== payload.correctIndex);
  const removeIndices = wrongIndices
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .sort((a, b) => a - b);

  res.json(UseFiftyFiftyResponse.parse({ removeIndices }));
});

router.post("/game/ask-audience", (req, res): void => {
  const parsed = AskAudienceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const payload = verifyAnswerToken(parsed.data.token);
  if (!payload) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  // Simulate a studio audience vote: the correct answer gets the largest
  // share most of the time, the rest is split among the other options.
  //
  // The distribution is derived deterministically from the token itself
  // (via a seeded PRNG) rather than from Math.random(). Otherwise a client
  // could call this endpoint repeatedly against the same still-valid token
  // and average out the "noise" to reliably unmask the correct answer
  // before ever answering — a single fixed result per token closes that
  // probing vector while still looking random across different questions.
  const seed = crypto
    .createHash("sha256")
    .update(parsed.data.token)
    .digest();
  let seedOffset = 0;
  const seededRandom = () => {
    const value = seed.readUInt32BE(seedOffset % (seed.length - 4)) / 0xffffffff;
    seedOffset += 4;
    return value;
  };

  const correctShare = 40 + Math.floor(seededRandom() * 35); // 40-74%
  const remaining = 100 - correctShare;
  const otherIndices = [0, 1, 2, 3].filter((i) => i !== payload.correctIndex);
  const weights = otherIndices.map(() => seededRandom());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const otherShares = weights.map((w) =>
    Math.floor((w / weightSum) * remaining),
  );

  const percentages = [0, 0, 0, 0];
  percentages[payload.correctIndex] = correctShare;
  otherIndices.forEach((idx, i) => {
    percentages[idx] = otherShares[i]!;
  });

  // Rounding can leave the total a few points short of 100; give the
  // remainder to the correct answer so it stays the front-runner.
  const total = percentages.reduce((a, b) => a + b, 0);
  percentages[payload.correctIndex] += 100 - total;

  res.json(AskAudienceResponse.parse({ percentages }));
});

router.post("/game/ask-expert", (req, res): void => {
  const parsed = AskExpertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const payload = verifyAnswerToken(parsed.data.token);
  if (!payload) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  res.json(AskExpertResponse.parse({ correctIndex: payload.correctIndex }));
});

export default router;
