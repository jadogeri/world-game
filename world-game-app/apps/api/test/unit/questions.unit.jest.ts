import { generateQuestion, type Difficulty } from "../../src/lib/questions";
import { verifyAnswerToken } from "../../src/lib/answerToken";

process.env.SESSION_SECRET = "test-secret-key-at-least-32-characters-long";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

describe("generateQuestion (unit)", () => {
  it.each(DIFFICULTIES)(
    "builds a well-formed question for difficulty=%s",
    (difficulty) => {
      const question = generateQuestion(difficulty, 1);

      expect(question.difficulty).toBe(difficulty);
      expect(question.level).toBe(1);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4); // no duplicate options
      expect(question.prompt.length).toBeGreaterThan(0);
    },
  );

  it("encodes the correct answer's index into the token, matching the options array", () => {
    const question = generateQuestion("easy", 1);
    const payload = verifyAnswerToken(question.token);

    expect(payload).not.toBeNull();
    expect(question.options[payload!.correctIndex]).toBe(
      payload!.correctAnswer,
    );
  });

  it("only attaches a flag image for flag-type questions", () => {
    for (let i = 0; i < 25; i++) {
      const question = generateQuestion("easy", 1);
      if (question.type === "flag") {
        expect(question.flagImage).not.toBeNull();
      } else {
        expect(question.flagImage).toBeNull();
      }
    }
  });

  it("generates a fresh id and token on every call", () => {
    const a = generateQuestion("medium", 2);
    const b = generateQuestion("medium", 2);

    expect(a.id).not.toBe(b.id);
    expect(a.token).not.toBe(b.token);
  });
});
