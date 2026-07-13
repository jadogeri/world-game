import request from "supertest";
import type { createFakeDb as CreateFakeDb } from "../helpers/fakeDb";

// 💡 THE FIX: Safely declare the global property so TypeScript native typecheck accepts it globally
declare global {
  var __fakeDb: any;
}

// The real db points at the shared remote Turso database used by the live
// game, so we replace it with an in-memory fake before importing the app
// (which transitively imports the scores route -> @repo/db).
//
// jest.mock() factories are hoisted above all imports in this file, so the
// fake db must be built *inside* the factory (via require) rather than
// referencing an outer `const` -- referencing an outer const here would hit
// a temporal-dead-zone error because the mock runs before that const is
// initialized.
jest.mock("@repo/db", () => {
  const { createFakeDb } = require("../helpers/fakeDb") as {
    createFakeDb: typeof CreateFakeDb;
  };
  const fake = createFakeDb([
    {
      id: 1,
      playerName: "Ada",
      winnings: 64000,
      difficulty: "medium",
      questionsAnswered: 9,
      correctAnswers: 9,
      won: false,
      createdAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);
  
  // 💡 THE FIX: Assign directly to global using the updated declaration
  global.__fakeDb = fake;
  return { db: fake.db, scoresTable: {} };
});

jest.mock("drizzle-orm", () => ({
  desc: (col: unknown) => col,
}));

// Imported after the mocks above so the route module picks up the fake db.
import app from "../../src/app";

// 💡 THE FIX: Extract rows cleanly via typed global reference fallback
const { rows } = (global as any).__fakeDb as ReturnType<typeof CreateFakeDb>;

describe("scores routes (integration)", () => {
  it("GET /api/scores returns existing scores", async () => {
    const res = await request(app).get("/api/scores");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].playerName).toBe("Ada");
  });

  it("GET /api/scores respects the limit query param", async () => {
    for (let i = 0; i < 5; i++) {
      rows.push({
        id: 100 + i,
        playerName: `Player${i}`,
        winnings: 1000 * i,
        difficulty: "easy",
        questionsAnswered: 3,
        correctAnswers: 3,
        won: false,
        createdAt: new Date(),
      });
    }

    const res = await request(app).get("/api/scores").query({ limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("POST /api/scores creates a new score and persists it", async () => {
    const res = await request(app).post("/api/scores").send({
      playerName: "Grace",
      winnings: 500000,
      difficulty: "hard",
      questionsAnswered: 12,
      correctAnswers: 12,
      won: false,
    });

    expect(res.status).toBe(201);
    expect(res.body.playerName).toBe("Grace");
    expect(res.body.id).toBeDefined();

    const listRes = await request(app).get("/api/scores").query({ limit: 100 });
    expect(listRes.body.some((s: { playerName: string }) => s.playerName === "Grace")).toBe(
      true,
    );
  });

  it("POST /api/scores rejects an invalid body", async () => {
    const res = await request(app).post("/api/scores").send({ playerName: "NoWinnings" });
    expect(res.status).toBe(400);
  });
});
