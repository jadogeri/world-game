import request from "supertest";
import app from "../../src/app";
import { verifyAnswerToken } from "../../src/lib/answerToken";

/**
 * Integration tests: exercise the real Express app + routing + zod
 * validation together via in-process HTTP requests. These endpoints don't
 * touch the database, so no fake/mocked db is needed here.
 */
describe("game routes (integration)", () => {
  async function fetchQuestion(difficulty: "easy" | "medium" | "hard" = "easy") {
    const res = await request(app)
      .get("/api/game/question")
      .query({ difficulty, level: 1 });
    expect(res.status).toBe(200);
    return res.body as {
      token: string;
      options: string[];
    };
  }

  it("GET /api/game/question returns a valid question shape", async () => {
    const res = await request(app)
      .get("/api/game/question")
      .query({ difficulty: "easy", level: 1 });

    expect(res.status).toBe(200);
    expect(res.body.options).toHaveLength(4);
    expect(typeof res.body.token).toBe("string");
  });

  it("GET /api/game/question rejects an invalid difficulty", async () => {
    const res = await request(app)
      .get("/api/game/question")
      .query({ difficulty: "impossible", level: 1 });

    expect(res.status).toBe(400);
  });

  it("POST /api/game/verify reports correct and incorrect answers", async () => {
    const { token } = await fetchQuestion();
    const payload = verifyAnswerToken(token)!;

    const correctRes = await request(app)
      .post("/api/game/verify")
      .send({ token, selectedIndex: payload.correctIndex });
    expect(correctRes.status).toBe(200);
    expect(correctRes.body.correct).toBe(true);

    const wrongIndex = (payload.correctIndex + 1) % 4;
    const wrongRes = await request(app)
      .post("/api/game/verify")
      .send({ token, selectedIndex: wrongIndex });
    expect(wrongRes.status).toBe(200);
    expect(wrongRes.body.correct).toBe(false);
  });

  it("POST /api/game/verify rejects an invalid token", async () => {
    const res = await request(app)
      .post("/api/game/verify")
      .send({ token: "bogus", selectedIndex: 0 });
    expect(res.status).toBe(400);
  });

  it("POST /api/game/fifty-fifty removes exactly two wrong options", async () => {
    const { token } = await fetchQuestion();
    const payload = verifyAnswerToken(token)!;

    const res = await request(app).post("/api/game/fifty-fifty").send({ token });

    expect(res.status).toBe(200);
    expect(res.body.removeIndices).toHaveLength(2);
    expect(res.body.removeIndices).not.toContain(payload.correctIndex);
  });

  it("POST /api/game/ask-audience returns four percentages summing to 100, favoring the correct answer", async () => {
    const { token } = await fetchQuestion();
    const payload = verifyAnswerToken(token)!;

    const res = await request(app).post("/api/game/ask-audience").send({ token });

    expect(res.status).toBe(200);
    expect(res.body.percentages).toHaveLength(4);
    expect(res.body.percentages.reduce((a: number, b: number) => a + b, 0)).toBe(100);
    const correctShare = res.body.percentages[payload.correctIndex];
    expect(correctShare).toBe(Math.max(...res.body.percentages));
  });

  it("POST /api/game/ask-audience is deterministic for the same token", async () => {
    const { token } = await fetchQuestion();

    const first = await request(app).post("/api/game/ask-audience").send({ token });
    const second = await request(app).post("/api/game/ask-audience").send({ token });

    expect(second.body.percentages).toEqual(first.body.percentages);
  });

  it("POST /api/game/ask-expert reveals the correct index", async () => {
    const { token } = await fetchQuestion();
    const payload = verifyAnswerToken(token)!;

    const res = await request(app).post("/api/game/ask-expert").send({ token });

    expect(res.status).toBe(200);
    expect(res.body.correctIndex).toBe(payload.correctIndex);
  });
});
