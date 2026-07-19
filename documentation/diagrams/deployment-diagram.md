# Deployment Diagram

> **Tool:** Mermaid — paste into [mermaid.live](https://mermaid.live) or any Mermaid-compatible renderer.

## 1. Full Deployment Diagram

```mermaid
graph TB
    subgraph INTERNET["🌍 Internet"]
        BROWSER["🖥️  Player Browser\nHTTPS / WebSocket"]
    end

    subgraph VERCEL["☁️  Vercel Platform"]
        subgraph WG_SVC["Apps: web  (web)"]
            VITE["Vite Production Build\nEdge / Serverless\nserves React SPA"]
            WGFILES["Static Assets\nJS bundles, CSS,\nicons, flag images"]
        end
        
        subgraph V_SECRETS["🔐 Vercel Env Variables"]
            V_SEC1["BASE_PATH\n默认 /"]
            V_SEC2["VITE_API_URL\nRender backend URL\n(Dev: http://localhost:4000)"]
            V_SEC3["CLIENT_PORT\n端口配置 (4000)"]
        end
    end

    subgraph RENDER["☁️  Render Cloud Platform"]
        subgraph CONTAINER["🐳 Linux Container  —  pnpm Workspace"]
            subgraph API_SVC["Apps: api  (api)"]
                EXPRESS["Express v5\nNode.js\nbinds :$PORT\nREST API"]
                PINO["pino-http\nstructured JSON logging"]
                ZOD_MW["Zod Middleware\nrequest validation"]
                DOMAIN["Domain Logic\nquestions.ts\nanswerToken.ts\nAES-256-GCM"]
            end

            subgraph LIB["Shared Libraries (packages/)"]
                LIBDB["@repo/db\nDrizzle ORM + LibSQL client"]
                LIBZOD["@repo/api-zod\nZod schemas (generated)"]
                LIBCLIENT["@repo/api-client-react\nReact Query hooks (generated)"]
                LIBSPEC["@repo/api-spec\nopenapi.yaml"]
            end

            subgraph SECRETS["🔐 Render Env Secrets"]
                SECRET1["SESSION_SECRET\nAES-256-GCM key derivation"]
                SECRET2["TURSO_DATABASE_URL\nremote DB endpoint"]
                SECRET3["TURSO_AUTH_TOKEN\nauthentication token"]
                SECRET4["SERVER_PORT\n后端运行端口 (3000)"]
            end
        end
    end

    subgraph TURSO["☁️  Turso Cloud  (Fly.io infrastructure)"]
        TURSO_DB[("LibSQL / SQLite\nscores table\nremote replicated DB")]
    end

    %% Traffic flows
    BROWSER -->|"HTTPS *.vercel.app"| VITE
    BROWSER -->|"HTTPS *://*"| EXPRESS

    VITE --> WGFILES
    EXPRESS --> PINO
    EXPRESS --> ZOD_MW
    EXPRESS --> DOMAIN
    EXPRESS --> LIBDB
    DOMAIN --> SECRET1
    LIBDB --> SECRET2
    LIBDB --> SECRET3
    LIBDB -->|"HTTPS + auth token"| TURSO_DB

    WG_SVC -.->|"读取环境变量"| V_SECRETS
    API_SVC -.->|"读取环境变量"| SECRETS

    WG_SVC -.->|"build-time dep"| LIBZOD
    WG_SVC -.->|"build-time dep"| LIBCLIENT
    API_SVC -.->|"build-time dep"| LIBZOD
    LIBZOD -.->|"generated from"| LIBSPEC
    LIBCLIENT -.->|"generated from"| LIBSPEC

    style INTERNET fill:#f8fafc,stroke:#94a3b8
    style VERCEL fill:#f8fafc,stroke:#000000,stroke-width:2px
    style RENDER fill:#dbeafe,stroke:#3b82f6
    style CONTAINER fill:#eff6ff,stroke:#93c5fd
    style WG_SVC fill:#dcfce7,stroke:#16a34a
    style API_SVC fill:#fef3c7,stroke:#d97706
    style LIB fill:#f3e8ff,stroke:#a855f7
    style SECRETS fill:#fee2e2,stroke:#dc2626
    style V_SECRETS fill:#fee2e2,stroke:#dc2626
    style TURSO fill:#f0fdf4,stroke:#22c55e

```

---

## 2. Production Deployment (Vercel & Render Scalig)

```mermaid
graph TB
    subgraph PROD["🚀 Production Environment"]
        subgraph VERCEL_EDGE["☁️ Vercel Edge Network"]
            V_LB["Vercel Global CDN\nAnycast Edge\nServes Static SPA"]
        end

        subgraph RENDER_PROD["☁️ Render Web Service"]
            R_LB["Render Load Balancer\nTLS Termination"]
            
            subgraph INSTANCES["API Instances (scaled)"]
                I1["Instance 1\napi-server (Node.js)"]
                I2["Instance 2\napi-server (Node.js)"]
                IN["Instance N\n(Horizontal Autoscaling)"]
            end
        end
    end

    subgraph PROD_DB["☁️  Turso Cloud  (shared across all instances)"]
        PROD_TURSO[("LibSQL replica group\nPrimary + read replicas\nscores table")]
    end

    INTERNET["🌍 Player Browser"]

    %% Frontend Traffic
    INTERNET -->|"HTTPS custom domain\nor *.vercel.app"| V_LB
    
    %% API Backend Traffic
    INTERNET -->|"HTTPS custom domain\nor *://*"| R_LB
    R_LB --> I1
    R_LB --> I2
    R_LB --> IN
    
    %% Database Connection
    I1 -->|"HTTPS + auth"| PROD_TURSO
    I2 -->|"HTTPS + auth"| PROD_TURSO
    IN -->|"HTTPS + auth"| PROD_TURSO

    style PROD fill:#f8fafc,stroke:#94a3b8
    style VERCEL_EDGE fill:#fafafa,stroke:#000000,stroke-width:2px
    style RENDER_PROD fill:#dbeafe,stroke:#3b82f6
    style INSTANCES fill:#fef3c7,stroke:#d97706
    style PROD_DB fill:#f0fdf4,stroke:#22c55e
    
```

---

## 3. Development vs. Production Environment Comparison

| Concern | Development (Local Dev) | Production (Vercel + Render Deploy) |
|---------|--------------------------|---------------------------|
| **Frontend** | Vite dev server with HMR | Pre-built static bundle served by Vercel Edge CDN |
| **Backend** | `ts-node` / esbuild-watch | Compiled `dist/index.mjs` running on `Render` |
| **URL** | `localhost:5173 (web)` /</br> `localhost:3001 (api)` | `*.vercel.app (frontend)` /</br> `*.onrender.com (backend)` |
| **Database** | Shared Turso DB (same as prod!) | Same Turso DB |
| **Secrets** | Local .env files (BASE_PATH=/, VITE_API_URL=http://localhost:4000,</br> CLIENT_PORT=4000,  SERVER_PORT=3000) | Vercel & Render Environment Variables |
| **Scaling** | Single local computer | Render Instance Autoscaling & Vercel Global Edge Network |
| **Routing** | Vite local dev proxy (dev) | Separate browser routing paths to respective host domains (prod) |
| **Tests** | Jest, Vitest (unit / integration / e2e) | Not run in prod container |

---

## 4. CI / Test Execution Context

```mermaid
graph LR
    subgraph DEV["Developer Workspace / CI Pipeline"]
        CODE["Code Changes"]
        RUN["pnpm --filter\n@repo/api\ntest"]
    end

    subgraph JEST["Jest Test Runner (in-process)"]
        UNIT["test/unit/\n*.unit.jest.ts\nPure logic, no I/O"]
        INTEGRATION["test/integration/\n*.integration.jest.ts\nSupertest + in-proc Express\nFake DB mock"]
        E2E["test/e2e/\n*.e2e.jest.ts\nReal TCP server\nFake DB mock"]
    end

    FAKEDB[("In-Memory\nFake DB\n(no network)")]
    REAL_TURSO[("Turso Cloud\n⚠ NOT touched\nduring tests")]

    CODE --> RUN
    RUN --> JEST
    INTEGRATION --> FAKEDB
    E2E --> FAKEDB
    FAKEDB -.->|"replaces"| REAL_TURSO

    style FAKEDB fill:#dcfce7,stroke:#16a34a
    style REAL_TURSO fill:#fee2e2,stroke:#dc2626

```
