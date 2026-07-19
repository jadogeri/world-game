# Sequence Diagram

> **Tool:** Mermaid — paste into [mermaid.live](https://mermaid.live) or any Mermaid-compatible renderer.

## 1. Full Game Play Sequence

```mermaid
sequenceDiagram
    actor Player
    participant FE as Frontend<br/>(React / Vite)
    participant API as API Server<br/>(Express v5)
    participant DB as Database<br/>(Turso / LibSQL)

    Player->>FE: Enter name & select difficulty
    FE->>FE: Navigate to /play

    loop Each question (up to 15)
        FE->>API: GET /api/game/question?difficulty=X&level=N
        API->>API: generateQuestion(difficulty, level)
        API->>API: createAnswerToken(correctIndex, correctAnswer)
        API-->>FE: { id, prompt, options[4], token, type, flagImage }

        FE->>Player: Display question + money ladder

        alt Player uses 50/50 Lifeline
            Player->>FE: Click "50/50"
            FE->>API: POST /api/game/fifty-fifty { token }
            API->>API: verifyAnswerToken(token)
            API->>API: Pick 2 wrong indices (seeded PRNG)
            API-->>FE: { removeIndices: [i, j] }
            FE->>Player: Hide two wrong answers
        end

        alt Player uses Ask the Audience Lifeline
            Player->>FE: Click "Ask the Audience"
            FE->>API: POST /api/game/ask-audience { token }
            API->>API: verifyAnswerToken(token)
            API->>API: Compute percentages (seeded PRNG, correct answer weighted high)
            API-->>FE: { percentages: [a, b, c, d] }
            FE->>Player: Show audience bar chart
        end

        alt Player uses Ask the Expert Lifeline
            Player->>FE: Click "Ask the Expert"
            FE->>API: POST /api/game/ask-expert { token }
            API->>API: verifyAnswerToken(token)
            API-->>FE: { correctIndex }
            FE->>Player: Display expert recommendation
        end

        Player->>FE: Select answer (index 0–3)
        FE->>API: POST /api/game/verify { token, selectedIndex }
        API->>API: verifyAnswerToken(token)
        API->>API: Compare selectedIndex to correctIndex

        alt Correct answer
            API-->>FE: { correct: true, correctIndex, winnings }
            FE->>Player: Show correct feedback, advance ladder
        else Wrong answer
            API-->>FE: { correct: false, correctIndex, winnings }
            FE->>Player: Show correct answer, end game
        end
    end

    Note over FE,API: Game ends (wrong answer, walked away, or all 15 answered)

    FE->>API: POST /api/scores { playerName, winnings, difficulty,<br/>questionsAnswered, correctAnswers, won }
    API->>DB: INSERT INTO scores (...)
    DB-->>API: { id, playerName, winnings, ... }
    API-->>FE: 201 Created — score object
    FE->>Player: Show final result + "View Leaderboard" button
```

---

## 2. Leaderboard Sequence

```mermaid
sequenceDiagram
    actor Player
    participant FE as Frontend<br/>(React / Vite)
    participant API as API Server<br/>(Express v5)
    participant DB as Database<br/>(Turso / LibSQL)

    Player->>FE: Navigate to /leaderboard
    FE->>API: GET /api/scores?limit=10
    API->>DB: SELECT * FROM scores ORDER BY winnings DESC LIMIT 10
    DB-->>API: rows[]
    API-->>FE: Score[]
    FE->>Player: Render paginated leaderboard table

    alt Player changes page size
        Player->>FE: Select 25 / 50 / 100 rows
        FE->>API: GET /api/scores?limit=N
        API->>DB: SELECT * FROM scores ORDER BY winnings DESC LIMIT N
        DB-->>API: rows[]
        API-->>FE: Score[]
        FE->>Player: Re-render leaderboard
    end
```

---

## 3. Answer Token Security Sequence

```mermaid
sequenceDiagram
    participant API as API Server
    participant TOKEN as answerToken.ts<br/>(AES-256-GCM)
    participant CLIENT as Browser / Client

    API->>TOKEN: createAnswerToken({ correctIndex, correctAnswer, questionId })
    TOKEN->>TOKEN: Derive key from SESSION_SECRET (scrypt)
    TOKEN->>TOKEN: Generate random IV (12 bytes)
    TOKEN->>TOKEN: Encrypt payload (AES-256-GCM)
    TOKEN->>TOKEN: Append auth tag (16 bytes)
    TOKEN-->>API: base64url token string
    API-->>CLIENT: token (opaque; answer not readable)

    CLIENT->>API: POST /api/game/verify { token, selectedIndex }
    API->>TOKEN: verifyAnswerToken(token)
    TOKEN->>TOKEN: Decode base64url → IV + ciphertext + tag
    TOKEN->>TOKEN: Decrypt with SESSION_SECRET-derived key
    TOKEN->>TOKEN: Verify auth tag (tamper detection)
    TOKEN->>TOKEN: Check expiresAt (5-minute TTL)

    alt Token valid
        TOKEN-->>API: { correctIndex, correctAnswer, questionId }
        API->>API: Compare selectedIndex to correctIndex
        API-->>CLIENT: { correct: true/false }
    else Token invalid / tampered / expired
        TOKEN-->>API: null
        API-->>CLIENT: 400 Bad Request
    end
```
