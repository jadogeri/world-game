import crypto from "node:crypto";

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes to answer a question
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

interface TokenPayload {
  correctIndex: number;
  correctAnswer: string;
  exp: number;
}

// The token must be opaque to the client: it is handed back verbatim in the
// question response, so if it merely *signed* the plaintext answer, anyone
// could base64-decode it and read the correct answer before answering.
// Encrypting (not just signing) it keeps the payload confidential while
// AES-GCM's authentication tag still guarantees integrity/tamper-detection.
function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set to encrypt answer tokens.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/** Creates an opaque, encrypted token encoding the correct answer for a question. */
export function createAnswerToken(
  correctIndex: number,
  correctAnswer: string,
): string {
  const payload: TokenPayload = {
    correctIndex,
    correctAnswer,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
}

/** Decrypts and verifies an answer token. Returns null if invalid, tampered, or expired. */
export function verifyAnswerToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [ivB64, ciphertextB64, authTagB64] = parts;
  if (!ivB64 || !ciphertextB64 || !authTagB64) return null;

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTagB64, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64url")),
      decipher.final(),
    ]);

    const payload = JSON.parse(decrypted.toString("utf8")) as TokenPayload;
    if (typeof payload.correctIndex !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    // Decryption/auth-tag failure means the token was tampered with, forged,
    // or corrupted.
    return null;
  }
}
