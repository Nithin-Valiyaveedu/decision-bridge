# Collaborative Insight

AI-powered decision intelligence for engineering organisations. Connects expert knowledge to decision makers through semantic search, language translation, and automated knowledge capture.

---

## Prerequisites

- [Bun](https://bun.sh) v1.0+ — used as package manager and dev server runner
- Node.js 18+ (Bun uses its own runtime but Vite/Nitro need Node for builds)
- A **Lovable API key** — used to call `google/gemini-3-flash-preview` via the Lovable AI Gateway

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Nithin-Valiyaveedu/web-unfold-react.git
cd web-unfold-react
bun install
```

### 2. Environment variable

Create a `.env` file in the project root:

```bash
LOVABLE_API_KEY=your_lovable_api_key_here
```

The key is used server-side only (never exposed to the browser). It authenticates requests to the Lovable AI Gateway which proxies to Gemini.

### 3. Run development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
bun run build
```

---

## Project structure

```
src/
├── routes/
│   ├── __root.tsx              # App shell, font loading
│   ├── auth.tsx                # Role selector (Admin / Expert / PM)
│   └── _authenticated/
│       ├── route.tsx           # Auth guard + nav header
│       ├── admin.tsx
│       ├── expert.tsx
│       └── pm.tsx
├── lib/
│   ├── decisionbridge-views.tsx     # All UI components (Admin, Expert, PM views)
│   ├── decisionbridge-data.ts       # Hardcoded categories, experts, Language Bridge content
│   ├── knowledge-store.ts           # localStorage knowledge base (db_knowledge_v1)
│   ├── ticket-store.ts              # localStorage expert tickets (db_tickets_v1)
│   ├── project-store.ts             # localStorage projects (db_projects_v1)
│   ├── local-auth.ts                # Role stored in localStorage (demo_role)
│   ├── ai-gateway.server.ts         # Lovable AI Gateway provider factory
│   ├── classify-question.functions.ts   # Gemini: semantic question → category + KB match
│   ├── extract-knowledge.functions.ts   # Gemini: transcript/notes → knowledge entry
│   └── translate-decision.functions.ts  # Gemini: technical findings → business language
└── styles.css                  # Full design system (scoped under .db-root)
```

---

## How it works

### Storage

All data is stored in `localStorage` — no backend database. Three stores sync across browser tabs using `CustomEvent`:

| Key | Contents |
|---|---|
| `db_projects_v1` | Admin-created projects |
| `db_knowledge_v1` | Expert knowledge entries |
| `db_tickets_v1` | Expert tickets from PM questions |
| `demo_role` | Current role (admin / expert / pm) |

### AI calls

All three Gemini calls are **server functions** (`createServerFn`) — they run server-side so the API key is never exposed to the browser:

| Function | What it does |
|---|---|
| `classifyQuestion` | Reads PM's question + all KB entries, returns the right decision category and semantically relevant KB entry IDs |
| `extractKnowledge` | Reads a meeting transcript or notes image, returns a structured knowledge draft |
| `translateDecision` | Reads technical findings, returns business-language cards (impact, timeline, financial signal, recommendation) |

### Three roles

| Role | What they do |
|---|---|
| **Admin** | Create projects, assign decision areas and team members |
| **Expert** | Capture knowledge from transcripts, answer tickets, use Connected Sources |
| **PM** | Ask decision questions, get Language Bridge + readiness score + AI translation |

---

## Demo flow

See [`demo.md`](./demo.md) for the full 5-minute demo script with pre-loaded transcripts, expert answers, and judge Q&A.

---

## Connected sources (auto-capture)

The Expert **Connected sources** tab demonstrates no-upload knowledge capture. In a production setup, any tool that can send a POST request can push content to the intake pipeline:

```
Jira webhook → POST /api/intake → Gemini extracts → knowledge base
Slack integration → same pipeline
Zoom transcript → same pipeline
```

For the demo, the Jira and Slack cards have "Simulate incoming →" buttons that run the full live extraction pipeline using pre-loaded sample content.
