# Process Flow Diagram

> **Tool:** Mermaid — paste into [mermaid.live](https://mermaid.live) or any Mermaid-compatible renderer.

## 1. Game Play Process Flow

```mermaid
flowchart TD
    START([▶ Player Opens App]) --> ENTER[Enter Name & Select Difficulty]
    ENTER --> VALIDATE{Name provided?}
    VALIDATE -- No --> ENTER
    VALIDATE -- Yes --> FETCH[Fetch Question from API\nGET /api/game/question]
    FETCH --> APIFAIL{API Error?}
    APIFAIL -- Yes --> ERRQ[Show Error Toast] --> FETCH
    APIFAIL -- No --> DISPLAY[Display Question + 4 Options\n+ Money Ladder + Lifelines]

    DISPLAY --> ACTION{Player Action?}

    ACTION -- 50/50 Lifeline --> FIFTY[POST /api/game/fifty-fifty]
    FIFTY --> HIDEWRONG[Hide 2 Wrong Answers\nDisable 50/50 Button]
    HIDEWRONG --> ACTION

    ACTION -- Ask Audience Lifeline --> AUDIENCE[POST /api/game/ask-audience]
    AUDIENCE --> BARCHART[Show Audience Bar Chart\nDisable Audience Button]
    BARCHART --> ACTION

    ACTION -- Ask Expert Lifeline --> EXPERT[POST /api/game/ask-expert]
    EXPERT --> HIGHLIGHT[Highlight Correct Answer\nDisable Expert Button]
    HIGHLIGHT --> ACTION

    ACTION -- Walk Away --> CONFIRM{Confirm walk-away?}
    CONFIRM -- No --> ACTION
    CONFIRM -- Yes --> WALKSCORE[Calculate Safe-Haven Winnings]
    WALKSCORE --> SUBMIT

    ACTION -- Select Answer --> VERIFY[POST /api/game/verify\nsend token + selectedIndex]
    VERIFY --> TOKENVALID{Token valid?}
    TOKENVALID -- No / Expired --> TOKERR[400 Bad Request\nShow Expiry Error] --> GAMEOVER2

    TOKENVALID -- Yes --> CORRECT{Correct Answer?}
    CORRECT -- No --> SHOWANS[Show Correct Answer\nGame Over]
    SHOWANS --> SUBMIT

    CORRECT -- Yes --> FINAL{Level 15\nCompleted?}
    FINAL -- No --> NEXTQ[Advance Money Ladder\nFetch Next Question]
    NEXTQ --> FETCH

    FINAL -- Yes --> WIN[🏆 Player Wins!\nFull Jackpot]
    WIN --> SUBMIT

    SUBMIT[POST /api/scores\nSubmit Score to DB]
    SUBMIT --> SUBMITFAIL{Submit OK?}
    SUBMITFAIL -- No --> RETRYSUB[Show Error + Retry Option]
    RETRYSUB --> SUBMIT
    SUBMITFAIL -- Yes --> RESULT[Show Result Screen\nFinal Winnings]
    RESULT --> LEADERBOARD[/View Leaderboard?/]
    LEADERBOARD -- Yes --> LBPAGE[Navigate to /leaderboard]
    LEADERBOARD -- No --> PLAYAGAIN[Navigate to / Start Again]

    GAMEOVER2([❌ Game Over]) --> RESULT
```

---

## 2. API Request Processing Flow

```mermaid
flowchart LR
    REQ([Incoming HTTP Request]) --> CORS[CORS Middleware]
    CORS --> LOG[pino-http Logger]
    LOG --> JSON[express.json Body Parser]
    JSON --> ROUTER[API Router /api/...]

    ROUTER --> HEALTH[GET /healthz\nHealth Check]
    ROUTER --> GAME[Game Routes]
    ROUTER --> SCORES[Score Routes]

    GAME --> GQUESTION[GET /game/question\ngenerate + tokenize]
    GAME --> GVERIFY[POST /game/verify\ndecrypt + compare]
    GAME --> GFIFTY[POST /game/fifty-fifty\nseeded wrong-pick]
    GAME --> GAUDIENCE[POST /game/ask-audience\nseeded percentages]
    GAME --> GEXPERT[POST /game/ask-expert\nreveal correctIndex]

    SCORES --> SGET[GET /scores\nDrizzle SELECT]
    SCORES --> SPOST[POST /scores\nDrizzle INSERT]

    SGET --> DBREAD[(Turso DB\nREAD)]
    SPOST --> DBWRITE[(Turso DB\nWRITE)]

    GQUESTION --> ZODVAL{Zod\nValidation}
    GVERIFY --> ZODVAL
    SPOST --> ZODVAL

    ZODVAL -- Invalid --> E400[400 Bad Request\nJSON error]
    ZODVAL -- Valid --> HANDLER[Route Handler Logic]
    HANDLER --> E200[200 / 201 JSON Response]
```

---

## 3. Score Submission & Leaderboard Flow

```mermaid
flowchart TD
    GAMEEND([Game Ends]) --> PREP[Prepare Score Payload\nname, winnings, difficulty\nquestionsAnswered, correctAnswers, won]

    PREP --> POST[POST /api/scores]
    POST --> ZOD{Zod Schema\nValid?}
    ZOD -- No --> ERR400[400 — Validation Error\nMissing required field]
    ZOD -- Yes --> INSERT[Drizzle ORM\nINSERT INTO scores]
    INSERT --> DBOK{DB Success?}
    DBOK -- No --> ERR500[500 — DB Error]
    DBOK -- Yes --> CREATED[201 Created\nReturn Score Object]

    CREATED --> VIEW[Player Views Leaderboard]
    VIEW --> GETSCORES[GET /api/scores?limit=N]
    GETSCORES --> SELECT[Drizzle ORM\nSELECT * FROM scores\nORDER BY winnings DESC\nLIMIT N]
    SELECT --> RETURN[Return Score Array]
    RETURN --> RENDER[Render Paginated Table\nRank, Name, Winnings,\nDifficulty, Date]

    RENDER --> PAGINATE{Player Paginates?}
    PAGINATE -- Change Page Size --> GETSCORES
    PAGINATE -- Navigate Pages --> CLIENTPAG[Client-side page slice]
    CLIENTPAG --> RENDER
    PAGINATE -- Done --> DONE([End])
```

---

## 4. Answer Token Lifecycle Flow

```mermaid
flowchart TD
    INIT([Server Startup]) --> DERIVE[Derive 256-bit key once\nscrypt SESSION_SECRET]
    
    GEN([Generate Question]) --> PAYLOAD[Build Token Payload\ncorrectIndex, correctAnswer\nquestionId, expiresAt=now+5min]
    DERIVE -.-> ENCRYPT
    PAYLOAD --> IV[Generate random 12-byte IV]
    IV --> ENCRYPT[AES-256-GCM Encrypt\nPayload → Ciphertext + AuthTag]
    ENCRYPT --> ENCODE[Base64url encode\nIV + Ciphertext + AuthTag]
    ENCODE --> SEND[Send token to client\nopaque string]

    SEND --> CLIENT[Client stores token]
    CLIENT --> USETOKEN[Client sends token + selectedIndex\nback with request]

    USETOKEN --> DECODE[Base64url decode]
    DECODE --> SPLIT[Split IV / Ciphertext / AuthTag]
    DERIVE -.-> DECRYPT
    SPLIT --> DECRYPT{Decrypt\nAES-256-GCM}

    DECRYPT -- Auth Tag Fail --> NULL1[Return 400 Bad Request]
    DECRYPT -- Decrypt OK --> EXPIRY{expiresAt\n< now?}
    EXPIRY -- Expired --> NULL2[Return 400 Bad Request]
    
    EXPIRY -- Valid --> REPLAY{questionId\nalready used?}
    REPLAY -- Yes --> NULL3[Return 400 Bad Request]
    
    REPLAY -- No --> PAYLOAD2[Extract payload\ncorrectIndex]
    PAYLOAD2 --> COMPARE[Compare client's selectedIndex\nto decrypted correctIndex]
    COMPARE --> RESULT([Return correct/incorrect])
```