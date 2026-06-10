import { ProjectMetadata } from "./types";

export const SAMPLE_PROJECTS: Record<string, ProjectMetadata> = {
  paymentSaaS: {
    projectName: "HorizonPay",
    license: "MIT",
    purpose: "A secure, resilient developer-first SaaS platform for automating microtransactions, issuing OAuth2 developer keys, and processing global customer checkout sessions.",
    features: [
      "Enterprise standard OAuth2 authentication with scope restrictions",
      "Robust rate-limiting with dedicated headers and backoff mechanics",
      "Dynamic webhook triggers for live multi-channel dispatch updates",
      "Real-time transactional audit logging and fraud monitoring",
      "Secure key rotation schemes with automated alerting protocols"
    ],
    techStack: {
      backend: ["Node.js", "Express", "TypeScript", "Redis"],
      frontend: ["React 19", "Vite", "Tailwind CSS", "Motion"],
      other: ["PostgreSQL", "OAuth 2.0", "Shields.io"]
    },
    folderStructure: `├── dist/                  # Compiled assets
├── server.ts              # Custom full-stack entry point
├── src/
│   ├── App.tsx            # Main application root
│   ├── types.ts           # Type and schema rules
│   ├── components/        # Shared components
│   └── lib/               # Client helpers
├── package.json           # App dependencies
└── tsconfig.json          # TS config rules`,
    howToRun: [
      "Clone the repository: `git clone https://github.com/author/horizonpay.git`",
      "Install necessary dependencies: `npm install`",
      "Establish local configuration variables in `.env` based on `.env.example` file",
      "Start the development cluster locally: `npm run dev`",
      "Verify production bundling pipelines: `npm run build`"
    ],
    author: {
      name: "Meet Potdar",
      role: "Lead Platform Engineer",
      linkedin: "meet-potdar",
      portfolio: "meetpotdar.dev"
    },
    securityDetails: "All requests must be encrypted and authenticate via robust JSON Web Tokens in the standard Bearer header. Tokens have a hard expiry of 60 minutes. Keys should be rotated dynamically using our KMS helper utility or secure AWS Secrets Manager webhooks.",
    rateLimits: "Standard API rate limits are applied per authenticated tenant: maximum 100 requests per sliding 60-second window. High-throughput partners can apply for tier escalations of 1000 requests/minute. Exceeded requests get blocked with 429 status codes.",
    oauthScopes: [
      { name: "read:transactions", description: "Retrieve transaction ledgers, active sessions, and fraud scores" },
      { name: "write:transactions", description: "Initiate checkout sessions, trigger webhooks, and issue refunds" },
      { name: "read:profile", description: "Access general integration metadata and security configurations" }
    ],
    endpoints: [
      {
        id: "auth-token",
        method: "POST",
        path: "/api/v1/oauth/token",
        description: "Exchanges valid developer client credentials (client_id, client_secret) for a scoped OAuth2 JWT bearer token.",
        authRequired: false,
        scopes: [],
        headers: [
          { key: "Content-Type", value: "application/json", description: "Must be standard JSON body" }
        ],
        requestBody: JSON.stringify({
          client_id: "hp_client_83hf7a01",
          client_secret: "hp_sec_8f910a3f7f89d91a90c",
          grant_type: "client_credentials"
        }, null, 2),
        responseBody: JSON.stringify({
          access_token: "hp_jwt_ey...a81",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "read:transactions write:webhooks"
        }, null, 2),
        errorResponse: JSON.stringify({
          error: "invalid_client",
          error_description: "Client authentication failed. Invalid client_secret provided."
        }, null, 2),
        scenarios: [
          {
            id: "scen-auth-success",
            name: "Default Client Credentials (200 OK)",
            expectedStatus: 200,
            mockResponse: JSON.stringify({
              access_token: "hp_jwt_ey...a81",
              token_type: "Bearer",
              expires_in: 3600,
              scope: "read:transactions write:webhooks"
            }, null, 2),
            isAuthValid: true,
            simulateRateLimit: false
          },
          {
            id: "scen-auth-badsec",
            name: "Invalid Client Secret (400 Bad Request)",
            expectedStatus: 400,
            mockResponse: JSON.stringify({
              error: "invalid_client",
              error_description: "Client authentication failed. Invalid client_secret provided."
            }, null, 2),
            reqBodyToTrigger: JSON.stringify({
              client_id: "hp_client_83hf7a01",
              client_secret: "hp_sec_wrong_key",
              grant_type: "client_credentials"
            }, null, 2),
            isAuthValid: true,
            simulateRateLimit: false
          }
        ]
      },
      {
        id: "create-charge",
        method: "POST",
        path: "/api/v1/charges",
        description: "Initiates a secure transactional checkout session with currency details, routing rules, and user telemetry.",
        authRequired: true,
        scopes: ["write:transactions"],
        headers: [
          { key: "Authorization", value: "Bearer <token>", description: "OAuth2 active developer token" },
          { key: "Content-Type", value: "application/json", description: "Standard Content JSON payload" }
        ],
        requestBody: JSON.stringify({
          amount: 4900,
          currency: "usd",
          customer_email: "jane.doe@example.com",
          metadata: {
            order_id: "order_99a82f",
            tier: "pro_annual"
          }
        }, null, 2),
        responseBody: JSON.stringify({
          id: "chg_7f81a104",
          object: "charge",
          amount: 4900,
          currency: "usd",
          status: "succeeded",
          receipt_url: "https://horizonpay.com/receipt/chg_7f81a104",
          created_at: Math.floor(Date.now() / 1000)
        }, null, 2),
        errorResponse: JSON.stringify({
          error: "insufficient_funds",
          message: "The customer card does not have sufficient balance to complete this transaction."
        }, null, 2),
        scenarios: [
          {
            id: "scen-charge-success",
            name: "Checkout Success (200 OK)",
            expectedStatus: 200,
            mockResponse: JSON.stringify({
              id: "chg_7f81a104",
              object: "charge",
              amount: 4900,
              currency: "usd",
              status: "succeeded",
              receipt_url: "https://horizonpay.com/receipt/chg_7f81a104",
              created_at: Math.floor(Date.now() / 1000)
            }, null, 2),
            isAuthValid: true,
            simulateRateLimit: false
          },
          {
            id: "scen-charge-nofunds",
            name: "Insufficient Card Funds (402 Payment Required)",
            expectedStatus: 402,
            mockResponse: JSON.stringify({
              error: "insufficient_funds",
              message: "The customer card does not have sufficient balance to complete this transaction."
            }, null, 2),
            reqBodyToTrigger: JSON.stringify({
              amount: 999900,
              currency: "usd",
              customer_email: "broke.buyer@example.com"
            }, null, 2),
            isAuthValid: true,
            simulateRateLimit: false
          },
          {
            id: "scen-charge-unauth",
            name: "Missing Authorization Gate (401 Unauthorized)",
            expectedStatus: 401,
            mockResponse: JSON.stringify({
              error: "unauthorized",
              message: "Missing or invalid OAuth2.0 authentication credentials."
            }, null, 2),
            isAuthValid: false,
            simulateRateLimit: false
          },
          {
            id: "scen-charge-ratelimit",
            name: "Burst Traffic Block (429 Rate Limited)",
            expectedStatus: 429,
            mockResponse: JSON.stringify({
              error: "too_many_requests",
              message: "API rate limit value has been exceeded. Sliding window lockout active."
            }, null, 2),
            isAuthValid: true,
            simulateRateLimit: true
          }
        ]
      },
      {
        id: "get-charge",
        method: "GET",
        path: "/api/v1/charges/:id",
        description: "Retrieves complete ledger information, status logs, and dynamic webhooks for a specific charged transaction id.",
        authRequired: true,
        scopes: ["read:transactions"],
        headers: [
          { key: "Authorization", value: "Bearer <token>", description: "OAuth2 active developer token" }
        ],
        responseBody: JSON.stringify({
          id: "chg_7f81a104",
          object: "charge",
          amount: 4900,
          currency: "usd",
          status: "succeeded",
          customer: "jane.doe@example.com",
          risk_evaluation: {
            score: 12,
            recommendation: "approve"
          }
        }, null, 2),
        scenarios: [
          {
            id: "scen-getcharge-success",
            name: "Valid Query (200 OK)",
            expectedStatus: 200,
            mockResponse: JSON.stringify({
              id: "chg_7f81a104",
              object: "charge",
              amount: 4900,
              currency: "usd",
              status: "succeeded",
              customer: "jane.doe@example.com",
              risk_evaluation: {
                score: 12,
                recommendation: "approve"
              }
            }, null, 2),
            isAuthValid: true,
            simulateRateLimit: false
          },
          {
            id: "scen-getcharge-unauth",
            name: "Bad Access Key (401 Unauthorized)",
            expectedStatus: 401,
            mockResponse: JSON.stringify({
              error: "unauthorized",
              message: "Missing or invalid OAuth2.0 authentication credentials."
            }, null, 2),
            isAuthValid: false,
            simulateRateLimit: false
          }
        ]
      }
    ]
  },
  taskAPI: {
    projectName: "SyncTask Cloud",
    license: "MIT",
    purpose: "An enterprise-grade cloud synchronization API powering distributed workforces, task management workflows, and automated event triggers.",
    features: [
      "Offline sync reconciliation with deterministic clock ordering",
      "Dynamic websocket notifications for concurrent board items",
      "Custom tags, metadata matrices, and multi-file asset attachments",
      "Granular user workspace controls with roles and scoped access lists"
    ],
    techStack: {
      backend: ["Node.js", "Express", "PostgreSQL", "Socket.io"],
      frontend: ["React 19", "Tailwind CSS", "Zustand"],
      other: ["JWT", "Docker", "S3 Storage"]
    },
    folderStructure: `├── Makefile               # Task automation pipeline
├── src/
│   ├── index.ts           # Server start point
│   ├── db/                # Schema definitions
│   └── routers/           # Express API handlers
└── README.md`,
    howToRun: [
      "Execute `npm install` inside primary workspace root",
      "Launch Postgres instance via local parameters",
      "Initialize default schemas: `npm run migrate`",
      "Boot live synchronization server: `npm run dev`"
    ],
    author: {
      name: "Sophia Sterling",
      role: "Lead API Architect",
      linkedin: "sophia-api",
      portfolio: "sophiasterling.dev"
    },
    securityDetails: "Tokens utilize standard dynamic RSA/SHA256 headers. Secrets must be handled via environment files and are rotated bi-weekly using custom build runners.",
    rateLimits: "Average tenant has 50 requests allowed per sliding window. Spikes are deferred using leaky bucket timers.",
    oauthScopes: [
      { name: "read:tasks", description: "Query active task lists and synchronize offline local state clocks" },
      { name: "write:tasks", description: "Create, edit, complete, and archive board tasks and assignees" },
      { name: "admin:sync", description: "Perform system-wide sync reconciliation and database cleanup ops" }
    ],
    endpoints: [
      {
        id: "sync-tasks",
        method: "GET",
        path: "/api/v2/tasks",
        description: "Pulls updated task streams matching cursor intervals for dynamic client synchronization.",
        authRequired: true,
        scopes: ["read:tasks"],
        headers: [
          { key: "Authorization", value: "Bearer <token>", description: "JWT Access authorization token" }
        ],
        responseBody: JSON.stringify({
          tasks: [
            { id: "task_01", title: "Refactor core login form", status: "completed", updated_at: "2026-06-10" },
            { id: "task_02", title: "Build responsive PDF summaries", status: "in_progress", updated_at: "2026-06-10" }
          ],
          cursor: "1718029a8f"
        }, null, 2)
      }
    ]
  }
};
