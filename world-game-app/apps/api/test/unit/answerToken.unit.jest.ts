import { createAnswerToken, verifyAnswerToken } from "../../src/lib/answerToken";

process.env.SESSION_SECRET = "test-secret-key-at-least-32-characters-long";

describe("answerToken (unit)", () => {
  it("round-trips the correct index and answer through create/verify", () => {
    const token = createAnswerToken(2, "Paris");
    const payload = verifyAnswerToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.correctIndex).toBe(2);
    expect(payload?.correctAnswer).toBe("Paris");
  });

  it("produces an opaque token that does not leak the answer in plaintext", () => {
    const token = createAnswerToken(1, "Berlin");
    expect(token).not.toContain("Berlin");
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain(
      "Berlin",
    );
  });

  it("rejects a token with a tampered ciphertext segment", () => {
    const token = createAnswerToken(0, "Tokyo");
    const [iv, ciphertext, authTag] = token.split(".");
    const tampered = [iv, `${ciphertext}a`, authTag].join(".");

    expect(verifyAnswerToken(tampered)).toBeNull();
  });

  it("rejects a token with a tampered auth tag", () => {
    const token = createAnswerToken(0, "Cairo");
    const [iv, ciphertext] = token.split(".");
    const forgedTag = Buffer.alloc(16, 1).toString("base64url");
    const tampered = [iv, ciphertext, forgedTag].join(".");

    expect(verifyAnswerToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyAnswerToken("not-a-real-token")).toBeNull();
    expect(verifyAnswerToken("a.b")).toBeNull();
    expect(verifyAnswerToken("")).toBeNull();
  });

  it("rejects an expired token", () => {
    jest.useFakeTimers();
    try {
      const token = createAnswerToken(3, "Rome");
      jest.advanceTimersByTime(6 * 60 * 1000); // past the 5-minute TTL
      expect(verifyAnswerToken(token)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
