// 💡 THE FIX: Inject the session secret at the top so token signing doesn't crash the route
process.env.SESSION_SECRET = "test-secret-key-at-least-32-characters-long";

import type { Server } from "node:http";
import request from "supertest";
import { createFakeDb } from "../helpers/fakeDb";

// End-to-end: boots the real Express app on a real (ephemeral) TCP port and
// drives a full play-through over actual HTTP, the same way the frontend
// would. The db is faked (see scores.integration.jest.ts for why) so the
// run doesn't write into the shared remote leaderboard database.
const { db } = createFakeDb();

// 💡 THE FIX: Export the extra tables your routes reference to prevent 500 errors
jest.mock("@repo/db", () => ({
  db,
  scoresTable: {},
  questionsTable: {},
  gameTable: {},
}));

jest.mock("drizzle-orm", () => ({
  desc: (col: unknown) => col,
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const { default: app } = await import("../../src/app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("full game flow (e2e)", () => {
  it("plays a full round: fetch question, use lifelines, answer, then submit and read back the score", async () => {
    const questionRes = await request(baseUrl)
      .get("/api/game/question")
      .query({ difficulty: "easy", level: 1 });
    expect(questionRes.status).toBe(200);
    const { token, options } = questionRes.body as {
      token: string;
      options: string[];
    };
    expect(options).toHaveLength(4);

    const fiftyFiftyRes = await request(baseUrl)
      .post("/api/game/fifty-fifty")
      .send({ token });
    expect(fiftyFiftyRes.status).toBe(200);
    expect(fiftyFiftyRes.body.removeIndices).toHaveLength(2);

    const audienceRes = await request(baseUrl)
      .post("/api/game/ask-audience")
      .send({ token });
    expect(audienceRes.status).toBe(200);

    const expertRes = await request(baseUrl)
      .post("/api/game/ask-expert")
      .send({ token });
    expect(expertRes.status).toBe(200);
    const { correctIndex } = expertRes.body as { correctIndex: number };

    const verifyRes = await request(baseUrl)
      .post("/api/game/verify")
      .send({ token, selectedIndex: correctIndex });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.correct).toBe(true);

    const submitRes = await request(baseUrl).post("/api/scores").send({
      playerName: "E2E Player",
      winnings: 1000,
      difficulty: "easy",
      questionsAnswered: 1,
      correctAnswers: 1,
      won: false,
    });
    expect(submitRes.status).toBe(201);

    const leaderboardRes = await request(baseUrl)
      .get("/api/scores")
      .query({ limit: 10 });
    expect(leaderboardRes.status).toBe(200);
    expect(
      leaderboardRes.body.some(
        (s: { playerName: string }) => s.playerName === "E2E Player",
      ),
    ).toBe(true);
  });

  it("rejects an expired/invalid token across the whole request cycle", async () => {
    const res = await request(baseUrl)
      .post("/api/game/verify")
      .send({ token: "not-a-valid-token", selectedIndex: 0 });

    expect(res.status).toBe(400);
  });

  it("GET /api/health responds so the deployment health check works end-to-end", async () => {
    const res = await request(baseUrl).get("/api/health");
    expect(res.status).toBe(200);
  });
});
