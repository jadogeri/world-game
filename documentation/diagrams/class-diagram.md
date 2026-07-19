# Class Diagram

> **Tool:** Mermaid — paste into [mermaid.live](https://mermaid.live) or any Mermaid-compatible renderer.

## Full System Class Diagram

```mermaid
classDiagram
    direction TB

    %% ─────────────── Domain / Value Objects ───────────────

    class Question {
        +String id
        +String prompt
        +String[] options
        +Difficulty difficulty
        +Number level
        +QuestionType type
        +String|null flagImage
        +String token
    }

    class AnswerToken {
        -String questionId
        -Number correctIndex
        -String correctAnswer
        -Number expiresAt
        +createAnswerToken(payload) String
        +verifyAnswerToken(token) TokenPayload|null
    }

    class Score {
        +Number id
        +String playerName
        +Number winnings
        +Difficulty difficulty
        +Number questionsAnswered
        +Number correctAnswers
        +Boolean won
        +Date createdAt
    }

    class Country {
        +String name
        +String capital
        +String region
        +Number population
        +Number area
        +String flagUrl
        +String currency
    }

    class TokenPayload {
        +String questionId
        +Number correctIndex
        +String correctAnswer
        +Number expiresAt
    }

    %% ─────────────── Enumerations ───────────────

    class Difficulty {
        <<enumeration>>
        easy
        medium
        hard
    }

    class QuestionType {
        <<enumeration>>
        capital
        region
        population
        flag
    }

    %% ─────────────── API Server Layer ───────────────

    class ExpressApp {
        -Router router
        +use(middleware) void
        +listen(port) Server
    }

    class GameRouter {
        <<router>>
        +getQuestion(req, res) void
        +verifyAnswer(req, res) void
        +fiftyFifty(req, res) void
        +askAudience(req, res) void
        +askExpert(req, res) void
    }

    class ScoresRouter {
        <<router>>
        +listScores(req, res) void
        +createScore(req, res) void
    }

    class HealthRouter {
        <<router>>
        +healthCheck(req, res) void
    }

    %% ─────────────── Library Modules ───────────────

    class QuestionsLib {
        <<module>>
        -Country[] countries
        +generateQuestion(difficulty, level) Question
        -shuffleOptions(options) String[]
        -pickDistractors(correct, pool) String[]
    }

    class AnswerTokenLib {
        <<module>>
        -Buffer KEY
        +createAnswerToken(payload) String
        +verifyAnswerToken(token) TokenPayload|null
        -deriveKey(secret) Buffer
    }

    class DatabaseClient {
        <<module>>
        +db DrizzleClient
        +scoresTable Table
    }

    %% ─────────────── Frontend Layer ───────────────

    class RouterShell {
        <<component>>
        +Route / StartPage
        +Route /play GamePage
        +Route /leaderboard LeaderboardPage
    }

    class StartPage {
        <<component>>
        -String playerName
        -Difficulty difficulty
        +handleStartGame() void
    }

    class GamePage {
        <<component>>
        -Question currentQuestion
        -Number level
        -Number winnings
        -Boolean[] lifelines
        -GameState state
        +fetchQuestion() void
        +submitAnswer(index) void
        +useFiftyFifty() void
        +useAskAudience() void
        +useAskExpert() void
        +walkAway() void
    }

    class LeaderboardPage {
        <<component>>
        -Score[] scores
        -Number limit
        -Number page
        +fetchScores() void
        +handlePageChange(page) void
        +handleLimitChange(limit) void
    }

    class MoneyLadder {
        <<component>>
        -Number currentLevel
        -Number[] safehavens
        +render() JSX
    }

    %% ─────────────── API Client Hooks (generated) ───────────────

    class ApiClientHooks {
        <<generated>>
        +useGetQuestion(params) QueryResult
        +usePostVerify(mutation) MutationResult
        +usePostFiftyFifty(mutation) MutationResult
        +usePostAskAudience(mutation) MutationResult
        +usePostAskExpert(mutation) MutationResult
        +useGetScores(params) QueryResult
        +usePostScores(mutation) MutationResult
    }

    %% ─────────────── Zod Schemas ───────────────

    class ZodSchemas {
        <<validation>>
        +QuestionSchema
        +ScoreSchema
        +DifficultySchema
        +VerifyRequestSchema
        +FiftyFiftyRequestSchema
        +AudienceRequestSchema
        +ExpertRequestSchema
        +ScoreCreateSchema
    }

    %% ─────────────── Relationships ───────────────

    ExpressApp "1" --> "1..*" GameRouter : mounts
    ExpressApp "1" --> "1" ScoresRouter : mounts
    ExpressApp "1" --> "1" HealthRouter : mounts

    GameRouter ..> QuestionsLib : uses
    GameRouter ..> AnswerTokenLib : uses
    GameRouter ..> ZodSchemas : validates with

    ScoresRouter ..> DatabaseClient : queries
    ScoresRouter ..> ZodSchemas : validates with

    QuestionsLib "1" --> "*" Country : reads from
    QuestionsLib ..> Question : creates
    QuestionsLib ..> AnswerTokenLib : delegates token creation

    AnswerTokenLib ..> TokenPayload : encrypts/decrypts
    AnswerTokenLib ..> AnswerToken : implements

    Question "1" --> "1" AnswerToken : carries
    Question --> Difficulty : uses
    Question --> QuestionType : has
    Score --> Difficulty : uses
    TokenPayload --> AnswerToken : payload of

    RouterShell --> StartPage : routes to
    RouterShell --> GamePage : routes to
    RouterShell --> LeaderboardPage : routes to

    GamePage --> MoneyLadder : renders
    GamePage ..> ApiClientHooks : uses
    LeaderboardPage ..> ApiClientHooks : uses

    ApiClientHooks ..> ZodSchemas : typed by
```

---

## Notes

- **Domain objects** (`Question`, `Score`, `AnswerToken`, `Country`) are plain TypeScript types/interfaces, not class instances — represented as classes here for UML clarity.
- **`AnswerTokenLib`** is the only stateful module; it holds the derived AES-256-GCM key in memory (derived once from `SESSION_SECRET` at startup).
- **`ApiClientHooks`** are code-generated from the OpenAPI spec (`packages/api-spec/openapi.yaml`) and should not be edited manually.
- **`ZodSchemas`** are also generated from the OpenAPI spec via `@repo/api-zod` and are shared between the frontend and backend.
