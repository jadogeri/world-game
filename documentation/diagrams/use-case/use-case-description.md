# Use Case Descriptions

> Detailed structured descriptions for each use case identified in the Use Case Diagram.

---

## UC1 — Start New Game

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC1 |
| **Use Case Name** | Start New Game |
| **Actor(s)** | Player |
| **Description** | The player enters their name and selects a difficulty level, then begins a new game session. |
| **Preconditions** | Player is on the Start page (`/`). API Server is reachable. |
| **Postconditions** | Player is navigated to the Game page (`/play`). The first question is fetched from the API. |
| **Main Flow** | 1. Player navigates to `/`. <br>2. Player types their name into the name field. <br>3. Player selects a difficulty (Easy / Medium / Hard). <br>4. Player clicks "Start Game". <br>5. Frontend navigates to `/play`. <br>6. System invokes UC2 (View Question). |
| **Alternate Flows** | **A1 — Missing Name:** If name field is empty, the Start button is disabled; system displays a validation prompt. |
| **Exception Flows** | **E1 — API Unreachable:** If the question fetch fails, an error toast is shown and the player remains on the start page. |
| **Business Rules** | Name must be non-empty. Difficulty must be one of: easy, medium, hard. |

---

## UC2 — View Question

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC2 |
| **Use Case Name** | View Question |
| **Actor(s)** | Player, System |
| **Description** | The system fetches a new question from the API and displays it to the player along with four answer options and the money ladder. |
| **Preconditions** | A game is in progress. The previous question was answered correctly (or this is the first question). |
| **Postconditions** | The player can see the question prompt, four answer options, the current money ladder position, and available lifelines. |
| **Main Flow** | 1. Frontend calls `GET /api/game/question?difficulty=X&level=N`. <br>2. API generates a question from the countries dataset. <br>3. API creates an encrypted answer token (UC11). <br>4. API returns `{ prompt, options[4], token, type, flagImage }`. <br>5. Frontend displays the question and 4 answer buttons. <br>6. For flag-type questions, a flag image is displayed. |
| **Alternate Flows** | **A1 — Flag Question:** If `type === "flag"`, a country flag image is shown above the prompt. |
| **Exception Flows** | **E1 — API Error:** HTTP error response causes an error state with a retry option. |
| **Business Rules** | Questions are generated fresh per request; they are never stored server-side. Difficulty and level determine question complexity. |

---

## UC3 — Select Answer

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC3 |
| **Use Case Name** | Select Answer |
| **Actor(s)** | Player |
| **Description** | The player selects one of the four displayed answer options. The system verifies the selection against the encrypted answer token and reports correct or incorrect. |
| **Preconditions** | A question is displayed. The answer token is valid and not expired. |
| **Postconditions** | The correct answer is highlighted. If correct, the player advances to the next question; if wrong, the game ends. |
| **Main Flow** | 1. Player clicks one of the four answer buttons. <br>2. Frontend calls `POST /api/game/verify { token, selectedIndex }`. <br>3. API decrypts the token (UC12). <br>4. API compares `selectedIndex` to `correctIndex`. <br>5a. Correct: API returns `{ correct: true, winnings }`. Frontend advances ladder and fetches next question. <br>5b. Wrong: API returns `{ correct: false, correctIndex, winnings }`. Frontend shows the correct answer and ends the game. <br>6. System invokes UC8 (Submit Score) on game end. |
| **Alternate Flows** | **A1 — Final Question (level 15):** If correct on level 15, player wins the jackpot; game ends with a win state. |
| **Exception Flows** | **E1 — Expired Token:** Token older than 5 minutes returns 400; player is prompted to restart. <br>**E2 — Tampered Token:** Altered token returns 400 Bad Request. |
| **Business Rules** | Token TTL is 5 minutes. Each token is single-use by design (stateless; replaying the same token with a different index always produces the same result). |

---

## UC4 — Use 50/50 Lifeline

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC4 |
| **Use Case Name** | Use 50/50 Lifeline |
| **Actor(s)** | Player |
| **Description** | The player activates the 50/50 lifeline. The system removes exactly two incorrect answer options, leaving the correct answer and one decoy. |
| **Preconditions** | The 50/50 lifeline has not been used in this game session. A valid question token is available. |
| **Postconditions** | Two wrong answers are hidden. The 50/50 button is disabled for the remainder of the game. |
| **Main Flow** | 1. Player clicks the "50/50" lifeline button. <br>2. Frontend calls `POST /api/game/fifty-fifty { token }`. <br>3. API verifies the token (UC12). <br>4. API selects 2 wrong indices (excluding `correctIndex`) using a seeded PRNG. <br>5. API returns `{ removeIndices: [i, j] }`. <br>6. Frontend hides the two indicated answer buttons. |
| **Exception Flows** | **E1 — Invalid Token:** 400 returned; lifeline considered not consumed. |
| **Business Rules** | Each lifeline can be used at most once per game. The correct answer is never removed. Removed indices are deterministic per token (same token always removes the same two). |

---

## UC5 — Use Ask the Audience Lifeline

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC5 |
| **Use Case Name** | Use Ask the Audience Lifeline |
| **Actor(s)** | Player |
| **Description** | The player asks the audience for help. The system returns four percentage values (summing to 100) weighted toward the correct answer, displayed as a bar chart. |
| **Preconditions** | The Ask the Audience lifeline has not been used. A valid question token is available. |
| **Postconditions** | A bar chart of audience votes is shown. The lifeline button is disabled for the remainder of the game. |
| **Main Flow** | 1. Player clicks the "Ask the Audience" lifeline button. <br>2. Frontend calls `POST /api/game/ask-audience { token }`. <br>3. API verifies the token (UC12). <br>4. API computes audience percentages using a seeded PRNG derived from the token (correct answer receives the highest share). <br>5. API returns `{ percentages: [a, b, c, d] }` (sum = 100). <br>6. Frontend renders a bar chart. |
| **Exception Flows** | **E1 — Invalid Token:** 400 returned; lifeline considered not consumed. |
| **Business Rules** | Percentages are deterministic per token — calling the endpoint twice with the same token returns identical values. The correct answer always receives the plurality of votes. |

---

## UC6 — Use Ask the Expert Lifeline

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC6 |
| **Use Case Name** | Use Ask the Expert Lifeline |
| **Actor(s)** | Player |
| **Description** | The player asks an expert for the answer. The system reveals the index of the correct answer directly. |
| **Preconditions** | The Ask the Expert lifeline has not been used. A valid question token is available. |
| **Postconditions** | The correct answer option is highlighted/indicated. The lifeline button is disabled for the remainder of the game. |
| **Main Flow** | 1. Player clicks the "Ask the Expert" lifeline button. <br>2. Frontend calls `POST /api/game/ask-expert { token }`. <br>3. API verifies the token (UC12). <br>4. API returns `{ correctIndex }`. <br>5. Frontend highlights the correct answer option. |
| **Exception Flows** | **E1 — Invalid Token:** 400 returned; lifeline not consumed. |
| **Business Rules** | The expert always gives the correct answer (100% accuracy). Lifeline is single-use per game. |

---

## UC7 — Walk Away

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC7 |
| **Use Case Name** | Walk Away |
| **Actor(s)** | Player |
| **Description** | The player voluntarily ends the game before answering the current question, banking their winnings at the last safe haven amount. |
| **Preconditions** | A game is in progress. At least one question has been answered correctly. |
| **Postconditions** | Game ends. Player retains their safe haven winnings. UC8 (Submit Score) is invoked. |
| **Main Flow** | 1. Player clicks "Walk Away". <br>2. Frontend shows a confirmation prompt. <br>3. Player confirms. <br>4. Frontend calculates the safe haven winnings. <br>5. System invokes UC8 (Submit Score) with `won: false`. <br>6. Frontend displays final result screen. |
| **Alternate Flows** | **A1 — Player Cancels:** If the player dismisses the confirmation, the game continues. |
| **Business Rules** | Safe haven amounts are fixed at $1,000 (Q5) and $32,000 (Q10). If no safe haven reached, winnings are $0. |

---

## UC8 — Submit Score

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC8 |
| **Use Case Name** | Submit Score |
| **Actor(s)** | Player, System |
| **Description** | At the end of a game (correct, wrong, or walk-away), the player's result is submitted to the leaderboard. |
| **Preconditions** | Game has ended (any outcome). |
| **Postconditions** | Score is persisted to the Turso database. Player is shown a "View Leaderboard" option. |
| **Main Flow** | 1. Frontend calls `POST /api/scores { playerName, winnings, difficulty, questionsAnswered, correctAnswers, won }`. <br>2. API validates the request body with Zod. <br>3. API inserts the record into the `scores` table via Drizzle ORM. <br>4. API returns 201 with the created score object. <br>5. Frontend displays final winnings and a leaderboard link. |
| **Exception Flows** | **E1 — Validation Error:** Missing/invalid fields return 400; score is not saved. <br>**E2 — DB Error:** 500 returned; player is shown an error with a retry option. |
| **Business Rules** | All game outcomes are submitted (win, loss, walk-away). `won` flag is `true` only if the player answered all 15 questions correctly. |

---

## UC9 — View Leaderboard

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC9 |
| **Use Case Name** | View Leaderboard |
| **Actor(s)** | Player |
| **Description** | The player navigates to the leaderboard page and views the top scores sorted by winnings. |
| **Preconditions** | The player is on the `/leaderboard` route. |
| **Postconditions** | A paginated table of scores is displayed, ordered by winnings descending. |
| **Main Flow** | 1. Player navigates to `/leaderboard`. <br>2. Frontend calls `GET /api/scores?limit=10`. <br>3. API queries `scores` table ordered by `winnings DESC`, limited to N rows. <br>4. API returns `Score[]`. <br>5. Frontend renders the scores table with rank, name, winnings, difficulty, and date. |
| **Exception Flows** | **E1 — API Unreachable:** An error state is shown with a retry button. |

---

## UC10 — Paginate Leaderboard

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC10 |
| **Use Case Name** | Paginate Leaderboard |
| **Actor(s)** | Player |
| **Description** | The player adjusts the page size or navigates through pages of the leaderboard. |
| **Preconditions** | UC9 is active (leaderboard is displayed). |
| **Postconditions** | The displayed set of scores changes to reflect the selected page/size. |
| **Main Flow** | 1. Player selects a page size (10 / 25 / 50 / 100) from the dropdown. <br>2. Frontend re-fetches with the updated limit. <br>3. Player clicks First / Prev / Next / Last navigation controls. <br>4. Frontend paginates the client-side result set. |

---

## UC11 — Generate Answer Token

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC11 |
| **Use Case Name** | Generate Answer Token |
| **Actor(s)** | System (API Server) |
| **Description** | The API generates an encrypted, tamper-proof token encoding the correct answer for a question. The token is sent to the client as an opaque string. |
| **Preconditions** | A question has been generated. `SESSION_SECRET` environment variable is set. |
| **Postconditions** | A base64url-encoded AES-256-GCM encrypted token is returned. The correct answer cannot be read from the token without the secret key. |
| **Main Flow** | 1. API calls `createAnswerToken({ correctIndex, correctAnswer, questionId })`. <br>2. Function derives a 256-bit key from `SESSION_SECRET` via scrypt. <br>3. Generates a random 12-byte IV. <br>4. Encrypts payload with AES-256-GCM. <br>5. Encodes `iv + ciphertext + authTag` as base64url. <br>6. Returns token string. |

---

## UC12 — Verify Answer Token

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC12 |
| **Use Case Name** | Verify Answer Token |
| **Actor(s)** | System (API Server) |
| **Description** | The API decrypts and validates a token received from the client, ensuring it has not been tampered with and has not expired. |
| **Preconditions** | A token string is present in the request body. |
| **Postconditions** | Returns the decrypted payload, or `null` if invalid. |
| **Main Flow** | 1. API calls `verifyAnswerToken(token)`. <br>2. Function base64url-decodes the token. <br>3. Splits into IV (12 bytes), ciphertext, and auth tag (16 bytes). <br>4. Decrypts with AES-256-GCM using the derived key. <br>5. GCM auth tag verification detects any tampering. <br>6. Checks `expiresAt` against current time. <br>7. Returns payload or `null`. |
| **Exception Flows** | **E1 — Auth Tag Mismatch:** Tampered ciphertext → `null`. <br>**E2 — Expired:** `expiresAt` passed → `null`. <br>**E3 — Malformed:** Invalid base64/length → `null`. |

---

## UC13 — Enforce Token Expiry

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC13 |
| **Use Case Name** | Enforce Token Expiry |
| **Actor(s)** | System (API Server) |
| **Description** | Tokens have a 5-minute TTL. Any token presented after its expiry window is rejected, preventing replay attacks with old tokens. |
| **Preconditions** | A token has been decrypted successfully (UC12). |
| **Postconditions** | Expired tokens return `null`; valid tokens return their payload. |
| **Business Rules** | TTL = 5 minutes. Server time is authoritative. |
