# 🧭 SchemaPilot AI

**SchemaPilot AI** is an enterprise-grade, AI-powered Business Requirements Document (BRD) to Snowflake DDL generator, built and maintained by **Jade Global**. It transforms plain-language BRDs into production-ready Snowflake SQL — including `CREATE TABLE`, `ALTER TABLE`, stored procedures, tasks, streams, and views — in a three-step automated pipeline.

## ✨ Link To App

  https://schemapilotai-production.up.railway.app/
  

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 Intent Extraction | AI reads your BRD and identifies entities, attributes, business rules, and reporting needs |
| 🗺️ Semantic Mapping | Maps BRD entities to new or existing Snowflake tables, detecting reuse opportunities |
| ⚙️ DDL Generation | Generates complete, deployment-ready Snowflake SQL with constraints, comments, and indexes |
| 🔧 Enhancement Mode | Detects ALTER TABLE requirements — never recreates existing tables |
| ⏰ Tasks & Streams | Generates Snowflake Tasks (CRON-scheduled) and Streams (CDC) alongside DDL |
| ❄️ Snowflake Connect | Tests live Snowflake connection using credentials from `.env` or Settings UI |
| 🔐 Secure Auth | Login page with session-based authentication; OpenAI key stored in-memory only |
| 📤 BRD Upload | Drag-and-drop `.txt`/`.md` file upload, or paste BRD text directly |
| ⬇️ Export | Download generated SQL as `.sql` or export pipeline results as JSON |

---

## 🏗️ Architecture

```
schemapilot-ai/
├── backend/
│   └── server.js          # Express API — OpenAI + Snowflake integration
├── public/
│   ├── jade-logo.png
│   └── jade-logo-white.png
├── src/
│   ├── App.jsx            # Root — login gate, routing, API key state
│   ├── index.css          # Full design system (CSS variables, components)
│   ├── components/
│   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   └── UI.jsx         # Shared UI primitives
│   ├── hooks/
│   │   └── usePipeline.js # Three-step AI pipeline orchestration
│   └── pages/
│       ├── LoginPage.jsx   # Authentication screen
│       ├── BrdAnalyzer.jsx # Main BRD → DDL workspace
│       └── index.jsx       # Settings, AuditLog, DDL History, Semantic Layer
├── .env.example
├── package.json
└── vite.config.js
```

**Request flow:**
```
Browser :3000 → Vite proxy /api/* → Express :5000 → OpenAI API
                                                   → Snowflake (via snowflake-sdk)
```

The OpenAI API key is **never** exposed to the browser. It travels from the UI to your local Express backend only, via an `x-openai-key` request header.

---

## 🚀 Quick Start

### 1. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| OpenAI API key | Required for AI pipeline |
| Snowflake account | Optional — for live connection test |

### 2. Install

```bash
git clone https://github.com/your-org/schemapilot-ai.git
cd schemapilot-ai
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
OPENAI_API_KEY=sk-your-openai-key-here

# Optional — for Snowflake live connection test
SNOWFLAKE_ACCOUNT=ORGNAME-ACCOUNTNAME
SNOWFLAKE_USER=YOUR_USERNAME
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=MY_DATABASE
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=SYSADMIN
```

> **Tip:** You can skip the `.env` OpenAI key and enter it directly in the **Settings** page of the app instead.

### 4. Run

```bash
npm run dev
```

Opens at **http://localhost:3000**

| Service | Port |
|---|---|
| React frontend (Vite) | 3000 |
| Express backend | 5000 |

### 5. Login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `jade@2026` |

---

## 🔄 AI Pipeline

The three-step pipeline runs sequentially when you click **⚡ Run AI Pipeline**:

```
Step 1 — Intent Extraction
  POST /api/extract-intent
  → Identifies entities, attributes, BRD type (NEW / ENHANCEMENT),
    procedures, tasks, streams, reporting needs

Step 2 — Semantic Mapping
  POST /api/semantic-mapping
  → Maps entities to new_tables (CREATE) or reused_tables (ALTER)
  → Detects foreign key relationships

Step 3 — DDL Generation
  POST /api/generate-ddl
  → Produces complete Snowflake SQL:
     CREATE/ALTER TABLE, VIEWs, PROCEDUREs, TASKs, STREAMs
```

### BRD Modes

| Mode | Trigger | Output |
|---|---|---|
| **New Build** | BRD describes all-new entities | `CREATE TABLE IF NOT EXISTS` for every entity |
| **Enhancement** | BRD references existing tables | `ALTER TABLE … ADD COLUMN` for existing; `CREATE TABLE` only for genuinely new entities |

---

## 📋 Sample BRDs

Two built-in samples are available from the BRD Analyzer:

- **🆕 New Objects** — Healthcare analytics platform built from scratch. Generates 6 tables, 2 stored procedures, 2 tasks, 1 stream, and 4 views.
- **🔧 Enhancement** — Adds columns to existing `PATIENTS` and `CLAIMS` tables. Creates a new `AI_PREDICTIONS` table, procedure, task, and stream alongside `ALTER TABLE` statements.

---

## ❄️ Snowflake Connection

Snowflake credentials can be configured two ways:

1. **`.env` file** — Settings page auto-loads values on startup. Password stays server-side.
2. **Settings UI** — Fill in the Connection form and click **❄️ Test Connection**.

The **Test Connection** button executes a real connection via `snowflake-sdk` and runs:
```sql
SELECT CURRENT_VERSION(), CURRENT_USER(), CURRENT_DATABASE()
```
Results (version, user, database) are displayed on success.

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/snowflake/config` | Returns `.env` Snowflake config (no password) |
| `POST` | `/api/snowflake/test` | Tests live Snowflake connection |
| `POST` | `/api/extract-intent` | Step 1 — BRD intent extraction |
| `POST` | `/api/semantic-mapping` | Step 2 — Entity-to-schema mapping |
| `POST` | `/api/generate-ddl` | Step 3 — Snowflake DDL generation |

All AI endpoints accept an optional `x-openai-key` header to override the `.env` key.

---

## 🛡️ Security Notes

- The OpenAI API key is **never** stored to disk from the UI — it lives in React state and clears on page refresh.
- The Snowflake password is **never** returned by `/api/snowflake/config` — only a `hasPassword: true` boolean flag.
- Credentials travel only between your browser and your **local** Express server — nothing is sent to any third party beyond the official OpenAI and Snowflake APIs.
- Do not commit your `.env` file. It is listed in `.gitignore` by default.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, plain CSS (no UI library) |
| Backend | Express.js, Node.js |
| AI | OpenAI GPT-4o-mini via `openai` SDK |
| Database | Snowflake via `snowflake-sdk` |
| Dev tooling | concurrently, dotenv |

---

## 🔧 Scripts

```bash
npm run dev       # Start frontend + backend concurrently
npm run client    # Start Vite dev server only (port 3000)
npm run server    # Start Express backend only (port 5000)
npm run build     # Production build
npm run preview   # Preview production build
```

---

## 📁 Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes* | — | OpenAI API key (`sk-…`) |
| `SNOWFLAKE_ACCOUNT` | No | — | Account identifier (e.g. `orgname-accountname`) |
| `SNOWFLAKE_USER` | No | — | Snowflake username |
| `SNOWFLAKE_PASSWORD` | No | — | Snowflake password |
| `SNOWFLAKE_WAREHOUSE` | No | `COMPUTE_WH` | Virtual warehouse |
| `SNOWFLAKE_DATABASE` | No | — | Target database |
| `SNOWFLAKE_SCHEMA` | No | `PUBLIC` | Target schema |
| `SNOWFLAKE_ROLE` | No | `SYSADMIN` | Snowflake role |
| `PORT` | No | `5000` | Express server port |

*Can be provided via Settings UI instead.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please follow the existing code style (no UI library, plain CSS variables, functional React components with hooks).

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🏢 About Jade Global

**SchemaPilot AI** is built by [Jade Global](https://www.jadeglobal.com), a technology services and consulting firm specialising in cloud data platforms, Snowflake implementations, and enterprise AI solutions.

© 2026 Jade Global. All rights reserved.
