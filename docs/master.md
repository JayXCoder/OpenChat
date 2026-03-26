# OpenChat Master Document

### Mermaid Diagram (System Overview)

```mermaid
flowchart LR
  U[Browser UI]
  FE[Next.js Frontend Components]
  BFF[Next.js API Routes BFF]
  BE[FastAPI Backend]
  PR[Provider Router and Adapters]
  DB[(PostgreSQL)]
  P1[Ollama]
  P2[OpenAI-Compatible]
  P3[Gemini]

  U --> FE
  FE --> BFF
  BFF --> BE
  BE --> DB
  BE --> PR
  PR --> P1
  PR --> P2
  PR --> P3
  P1 --> PR
  P2 --> PR
  P3 --> PR
  PR --> BE
  BE --> BFF
  BFF --> FE
  FE --> U
```

---

## 3. DETAILED ARCHITECTURE (FRONTEND + BACKEND)

### Mermaid Diagram (Backend Flow)

```mermaid
flowchart LR
  A[User Request]
  B[FastAPI Route]
  C[ChatService]
  D[Provider Router]
  E[Provider Adapter]
  F[(PostgreSQL)]
  G[StreamingResponse]

  A --> B
  B --> C
  C --> F
  C --> D
  D --> E
  E --> C
  C --> G
  G --> A
  C --> F
```

### Mermaid Diagram (Frontend Streaming Loop)

```mermaid
flowchart LR
  UI[UI Components]
  ST[Zustand Store]
  API[Next.js BFF API]
  BE[FastAPI Backend]
  STR[Streaming Chunks]

  UI --> ST
  ST --> API
  API --> BE
  BE --> STR
  STR --> ST
  ST --> UI
```

---
