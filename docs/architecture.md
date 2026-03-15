# Raven Platform Architecture

## High-Level System Architecture

```mermaid
graph TB
    subgraph Clients["Clients"]
        Browser["Browser<br/>(Next.js App)"]
        SDKs["Developer SDKs<br/>& Applications"]
        CustomDomain["Custom Domain<br/>Requests"]
    end

    subgraph API["Hono API Server (apps/api)"]
        direction TB
        MW["Global Middleware<br/>CORS · Logger · Request ID<br/>Request Timing · Security Headers"]

        subgraph PublicRoutes["Public Routes (no auth)"]
            Health["/health"]
            AuthRoutes["/api/auth<br/>(better-auth)"]
            BillingWH["/webhooks/billing"]
            ModelsCatalog["/v1/models"]
        end

        subgraph UserRoutes["User Routes (session auth)"]
            UserMod["/v1/user<br/>Profile · Orgs"]
        end

        subgraph AdminRoutes["Admin Routes (session + admin)"]
            AdminMod["/v1/admin<br/>Platform Admin"]
        end

        subgraph TenantRoutes["Tenant Routes (session + tenant)"]
            Providers["/v1/providers"]
            Keys["/v1/keys"]
            Prompts["/v1/prompts"]
            Budgets["/v1/budgets"]
            Cache["/v1/cache"]
            Guardrails["/v1/guardrails"]
            Analytics["/v1/analytics"]
            Teams["/v1/teams"]
            Settings["/v1/settings"]
            Domains["/v1/domains"]
            Billing["/v1/billing"]
            AuditLogs["/v1/audit-logs"]
            Webhooks["/v1/webhooks"]
            RoutingRules["/v1/routing-rules"]
        end

        subgraph ProxyEngine["LLM Proxy Engine (/v1/proxy)"]
            ProxyAuth["Virtual Key Auth"]
            BudgetCheck["Budget Check"]
            PlanGate["Plan Gate"]
            RateLimiter["Rate Limiter"]
            GuardrailCheck["Guardrails<br/>Content Analyzer"]
            PromptResolver["Prompt Resolver"]
            Router["Smart Router<br/>Routing Rules"]
            ProviderResolver["Provider Resolver"]
            Upstream["Upstream Request"]
            Fallback["Fallback Handler"]
            ResponseAnalyzer["Response Analyzer"]
            TokenUsage["Token Usage<br/>Tracker"]
            LatencyTracker["Latency Tracker"]
            ReqLogger["Request Logger"]
        end
    end

    subgraph DataStores["Data Stores"]
        PG["PostgreSQL 17<br/>(Drizzle ORM)"]
        RD["Redis 7<br/>(Cache · Pub/Sub · Rate Limits)"]
    end

    subgraph ExternalServices["External Services"]
        LLMs["LLM Providers<br/>OpenAI · Anthropic · Google<br/>via OpenRouter"]
        ResendAPI["Resend<br/>(Transactional Email)"]
        BillingProvider["Billing Provider<br/>(Stripe)"]
    end

    Browser -->|"HTTP/REST"| MW
    SDKs -->|"OpenAI-compatible API"| ProxyEngine
    CustomDomain -->|"Domain Resolution"| ProxyEngine

    MW --> PublicRoutes
    MW --> UserRoutes
    MW --> AdminRoutes
    MW --> TenantRoutes
    MW --> ProxyEngine

    ProxyAuth --> BudgetCheck --> PlanGate --> RateLimiter
    RateLimiter --> GuardrailCheck --> PromptResolver --> Router
    Router --> ProviderResolver --> Upstream
    Upstream --> Fallback
    Upstream --> ResponseAnalyzer --> TokenUsage --> LatencyTracker --> ReqLogger

    TenantRoutes --> PG
    ProxyEngine --> PG
    UserRoutes --> PG
    AdminRoutes --> PG
    AuthRoutes --> PG

    ProxyEngine --> RD
    Cache --> RD

    Upstream --> LLMs
    API -.->|"Welcome emails<br/>Notifications"| ResendAPI
    BillingWH -.->|"Subscription events"| BillingProvider

    style Clients fill:#e1f5fe,stroke:#0288d1
    style API fill:#fff3e0,stroke:#f57c00
    style DataStores fill:#e8f5e9,stroke:#388e3c
    style ExternalServices fill:#fce4ec,stroke:#c62828
    style ProxyEngine fill:#fff8e1,stroke:#f9a825
    style PublicRoutes fill:#f3e5f5,stroke:#7b1fa2
    style TenantRoutes fill:#e8eaf6,stroke:#3f51b5
```

## Monorepo Package Dependency Graph

```mermaid
graph TD
    subgraph Apps["Applications"]
        WebApp["@raven/web<br/>Next.js 16 · React 19<br/>TailwindCSS 4 · Zustand<br/>TanStack Query · Recharts"]
        APIApp["@raven/api<br/>Hono · Node.js<br/>ioredis · Zod"]
    end

    subgraph Packages["Shared Packages"]
        Auth["@raven/auth<br/>better-auth"]
        DB["@raven/db<br/>Drizzle ORM · postgres.js"]
        Config["@raven/config<br/>Zod env validation"]
        Email["@raven/email<br/>Resend · React Email"]
        Types["@raven/types<br/>Shared TypeScript types"]
        UI["@raven/ui<br/>Base UI · CVA<br/>Motion · Tailwind Merge"]
    end

    WebApp --> Auth
    WebApp --> Types
    WebApp --> UI

    APIApp --> Auth
    APIApp --> Config
    APIApp --> DB
    APIApp --> Email
    APIApp --> Types

    Auth --> Config
    Auth --> DB

    style Apps fill:#e3f2fd,stroke:#1565c0
    style Packages fill:#f1f8e9,stroke:#558b2f
```

## Database Schema (Entity Relationships)

```mermaid
erDiagram
    users ||--o{ members : "belongs to orgs"
    users ||--o{ invitations : "invited to"
    users ||--o{ sessions : "has sessions"
    users ||--o{ accounts : "auth accounts"

    organizations ||--o{ members : "has members"
    organizations ||--o{ teams : "has teams"
    organizations ||--o{ keys : "has API keys"
    organizations ||--o{ providers : "configures providers"
    organizations ||--o{ prompts : "manages prompts"
    organizations ||--o{ budgets : "sets budgets"
    organizations ||--o{ guardrail_rules : "defines guardrails"
    organizations ||--o{ routing_rules : "defines routing"
    organizations ||--o{ webhooks : "has webhooks"
    organizations ||--o{ custom_domains : "has domains"
    organizations ||--o{ subscriptions : "has subscription"
    organizations ||--o{ request_logs : "logs requests"
    organizations ||--o{ audit_logs : "tracks changes"
    organizations ||--o{ invitations : "has invitations"

    teams ||--o{ members : "has members"
    keys ||--o{ request_logs : "generates logs"
    providers ||--o{ models : "offers models"

    synced_providers ||--o{ models : "synced models"

    users {
        text id PK
        text name
        text email
        boolean platformAdmin
    }
    organizations {
        text id PK
        text name
        text slug
        jsonb settings
    }
    members {
        text id PK
        text orgId FK
        text userId FK
        text teamId FK
        text role
    }
    keys {
        text id PK
        text orgId FK
        text name
        text hashedKey
        text budgetId FK
    }
    providers {
        text id PK
        text orgId FK
        text type
        text apiKey
        boolean isDefault
    }
    models {
        text id PK
        text providerId FK
        text modelId
        bigint inputPrice
        bigint outputPrice
    }
    request_logs {
        text id PK
        text orgId FK
        text keyId FK
        text model
        integer tokens
        bigint cost
    }
    prompts {
        text id PK
        text orgId FK
        text name
        text content
        integer version
    }
    budgets {
        text id PK
        text orgId FK
        text name
        bigint limitAmount
        text period
    }
    routing_rules {
        text id PK
        text orgId FK
        text pattern
        jsonb config
    }
    guardrail_rules {
        text id PK
        text orgId FK
        text type
        jsonb config
    }
```

## LLM Proxy Request Flow

```mermaid
sequenceDiagram
    participant Client as Client / SDK
    participant Proxy as Proxy Engine
    participant Auth as Virtual Key Auth
    participant Budget as Budget Check
    participant Plan as Plan Gate
    participant RL as Rate Limiter
    participant Guard as Guardrails
    participant Prompt as Prompt Resolver
    participant Route as Smart Router
    participant Resolve as Provider Resolver
    participant LLM as LLM Provider
    participant Log as Logger / Analytics

    Client->>Proxy: POST /v1/proxy/chat/completions
    Proxy->>Auth: Validate virtual API key
    Auth-->>Proxy: org context + key metadata

    Proxy->>Budget: Check spending limits
    Budget-->>Proxy: Within budget ✓

    Proxy->>Plan: Check subscription plan
    Plan-->>Proxy: Plan allows request ✓

    Proxy->>RL: Check rate limits (Redis)
    RL-->>Proxy: Under limit ✓

    Proxy->>Guard: Run input guardrails
    Guard-->>Proxy: Content safe ✓

    Proxy->>Prompt: Resolve prompt templates
    Prompt-->>Proxy: Expanded messages

    Proxy->>Route: Apply routing rules
    Route-->>Proxy: Selected provider + model

    Proxy->>Resolve: Resolve provider credentials
    Resolve-->>Proxy: Provider config + API key

    Proxy->>LLM: Forward request to upstream
    LLM-->>Proxy: LLM response (or stream)

    Proxy->>Guard: Run output guardrails
    Guard-->>Proxy: Response safe ✓

    Proxy->>Log: Track tokens, cost, latency
    Proxy-->>Client: Return response

    Note over Proxy,LLM: On failure → Fallback handler<br/>retries with alternate providers
```

## Infrastructure & Deployment

```mermaid
graph LR
    subgraph Development["Development Environment"]
        PNPM["pnpm 10<br/>Workspace Manager"]
        Biome["Biome<br/>Lint + Format"]
        Drizzle["Drizzle Kit<br/>Migrations"]
        TSX["tsx<br/>Dev Runner"]
        Vitest["Vitest<br/>Testing"]
    end

    subgraph Runtime["Runtime Services"]
        NextJS["Next.js 16<br/>:3000"]
        Hono["Hono API<br/>(Node.js)"]
        PG["PostgreSQL 17<br/>:5432"]
        Redis["Redis 7<br/>:6379"]
    end

    subgraph Background["Background Processes"]
        ModelSync["Model Sync<br/>(every 5 min)<br/>OpenRouter"]
        FlushUsage["Flush Last-Used<br/>(every 60s)"]
        EventBus["Event Bus<br/>(Redis Pub/Sub)"]
        WebhookDispatch["Webhook<br/>Dispatcher"]
        EmailDispatch["Email<br/>Dispatcher"]
    end

    PNPM --> NextJS
    PNPM --> Hono
    Drizzle --> PG

    Hono --> PG
    Hono --> Redis
    NextJS -->|"REST API calls"| Hono

    Hono --> ModelSync
    Hono --> FlushUsage
    Hono --> EventBus
    Hono --> WebhookDispatch
    Hono --> EmailDispatch
    EventBus --> Redis

    style Development fill:#e8eaf6,stroke:#3f51b5
    style Runtime fill:#e8f5e9,stroke:#2e7d32
    style Background fill:#fff3e0,stroke:#ef6c00
```
