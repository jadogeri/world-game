# Use Case Diagram

> **Tool:** Mermaid — paste into [mermaid.live](https://mermaid.live) or any Mermaid-compatible renderer.

## System Use Case Diagram

```mermaid
graph TB
    subgraph Actors
        P([🧑 Player])
        A([🤖 API Server<br/>System])
    end

    subgraph WorldGame ["&lt;&lt;System&gt;&gt; World Game"]
        direction TB

        subgraph GamePlay ["Game Play"]
            UC1(Start New Game)
            UC2(View Question)
            UC3(Select Answer)
            UC4(Use 50/50 Lifeline)
            UC5(Use Ask the Audience Lifeline)
            UC6(Use Ask the Expert Lifeline)
            UC7(Walk Away)
        end

        subgraph Results ["Results & Leaderboard"]
            UC8(Submit Score)
            UC9(View Leaderboard)
            UC10(Paginate Leaderboard)
        end

        subgraph Security ["&lt;&lt;System&gt;&gt; Security / Integrity"]
            UC11(Generate Answer Token)
            UC12(Verify Answer Token)
            UC13(Enforce Token Expiry)
        end
    end

    %% Player associations
    P --> UC1
    P --> UC2
    P --> UC3
    P --> UC4
    P --> UC5
    P --> UC6
    P --> UC7
    P --> UC8
    P --> UC9
    P --> UC10

    %% System associations
    A --> UC11
    A --> UC12
    A --> UC13

    %% Include / extend relationships
    UC1 -.->|&lt;&lt;include&gt;&gt;| UC2
    UC3 -.->|&lt;&lt;include&gt;&gt;| UC12
    UC4 -.->|&lt;&lt;include&gt;&gt;| UC12
    UC5 -.->|&lt;&lt;include&gt;&gt;| UC12
    UC6 -.->|&lt;&lt;include&gt;&gt;| UC12
    UC2 -.->|&lt;&lt;include&gt;&gt;| UC11
    UC12 -.->|&lt;&lt;include&gt;&gt;| UC13
    UC7 -.->|&lt;&lt;extend&gt;&gt;| UC8
    UC3 -.->|&lt;&lt;extend&gt;&gt;| UC8

    %% Styles
    classDef actor fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef uc fill:#f0fdf4,stroke:#16a34a,color:#14532d
    classDef sys fill:#fef9c3,stroke:#ca8a04,color:#713f12
    class P,A actor
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10 uc
    class UC11,UC12,UC13 sys
```

---

## Actor Descriptions

| Actor | Type | Description |
|-------|------|-------------|
| **Player** | Primary | Human user who plays the game, uses lifelines, and submits their score to the leaderboard |
| **API Server** | System | Express v5 backend; generates questions, verifies answers, enforces lifeline logic, and persists scores |

---

## Use Case Summary

| ID | Use Case | Actor(s) | Priority |
|----|----------|----------|----------|
| UC1 | Start New Game | Player | High |
| UC2 | View Question | Player, System | High |
| UC3 | Select Answer | Player | High |
| UC4 | Use 50/50 Lifeline | Player | Medium |
| UC5 | Use Ask the Audience Lifeline | Player | Medium |
| UC6 | Use Ask the Expert Lifeline | Player | Medium |
| UC7 | Walk Away | Player | Low |
| UC8 | Submit Score | Player, System | High |
| UC9 | View Leaderboard | Player | Medium |
| UC10 | Paginate Leaderboard | Player | Low |
| UC11 | Generate Answer Token | System | High |
| UC12 | Verify Answer Token | System | High |
| UC13 | Enforce Token Expiry | System | High |
