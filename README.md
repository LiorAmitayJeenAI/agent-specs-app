# Agent Specs App

A Hebrew RTL web app for collecting structured AI agent requirements from clients and reviewing them on an internal admin dashboard.

Project managers create specification projects and share a client link. Clients complete a guided multi-step form; submissions are stored in PostgreSQL, attachments go to Azure Blob Storage, and the final spec can be exported as a Word document.

## Features

### Client form (`/client`)

- Hebrew, right-to-left wizard for agent specification intake.
- Client, author, department, position, and agent details.
- Use cases with Q&A pairs and current-process flow steps.
- Data sources, business glossary, and success metrics.
- File uploads (screenshots and documents) via Azure Blob Storage.
- Summary step with submit and Word export.

### Admin dashboard (`/`)

- Central list of all specification projects with search and filters.
- Create a new spec and generate a shareable client URL (`/client?projectId=...`).
- Open and edit a project at `/admin/project/[id]/view`.
- Project lifecycle statuses: sent to client, client draft, PM review, completed.

### Backend

- PostgreSQL persistence through Prisma.
- REST API routes for submit, file upload/proxy, and admin project management.

## Tech Stack

- Next.js 15 (App Router, standalone output for Docker).
- React 18 and TypeScript.
- Tailwind CSS.
- Zustand (form wizard and admin session state).
- Prisma 7 and PostgreSQL (`@prisma/adapter-pg`).
- Azure Blob Storage for uploaded files.
- `docx` for Word document generation.
- Lucide React for icons.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (local via Docker Compose or an existing instance)

### Install and run

```bash
npm install
```

Create a `.env` file (see [Environment Variables](#environment-variables)).

Start PostgreSQL locally (optional):

```bash
docker compose up -d
```

Example `DATABASE_URL` when using the bundled Postgres service (host port **5433**):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agent_spec_form"
```

Apply migrations and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Run the development server:

```bash
npm run dev
```

| URL | Purpose |
| --- | --- |
| [http://localhost:3000](http://localhost:3000) | Admin dashboard |
| [http://localhost:3000/client?projectId=&lt;uuid&gt;](http://localhost:3000/client) | Client specification form (use a real project UUID from the dashboard) |

## Environment Variables

```env
# Required for persistence
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Required for file uploads
AZURE_STORAGE_ACCOUNT_NAME="your-storage-account"
AZURE_STORAGE_ACCOUNT_KEY="your-storage-account-key"
AZURE_STORAGE_CONTAINER_NAME="your-container-name"
AZURE_STORAGE_FOLDER_NAME="optional-folder-prefix"

# Optional — default for `src/lib/admin-auth.ts` (not yet enforced on API routes)
ADMIN_PASSWORD="your-admin-password"

# Optional — LLM draft polish on Summary step (Azure OpenAI)
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_OPENAI_API_KEY="your-api-key"
AZURE_OPENAI_DEPLOYMENT="gpt-4o"
AZURE_OPENAI_API_VERSION="2024-08-01-preview"
LLM_DRAFT_MODE="formal"
```

Uses the same `AZURE_OPENAI_*` variables for **draw.io diagram generation** on completed specs (Summary step).

### Draw.io diagrams (completed specs)

When a project status is **הושלם**, admins can generate process or architecture diagrams on the Summary step. Diagrams are stored in Azure Blob and previewed via diagrams.net viewer. Clients see read-only preview + download.

| Endpoint | Description |
| --- | --- |
| `GET /api/projects/[id]/diagrams` | List saved diagrams (completed projects only) |
| `POST /api/admin/projects/[id]/generate-diagram` | Body `{ "type": "flow" \| "architecture" }` |

Keep `.env` private; it is listed in `.gitignore`.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Docker

Build and run the Next.js app as a standalone image (see `Dockerfile`). Provide `DATABASE_URL` and Azure variables at runtime.

Local database only:

```bash
docker compose up -d
```

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── submit/              # Persist client form submission
│   │   ├── file-upload/         # Upload to Azure Blob Storage
│   │   ├── file-proxy/          # Proxy/download stored files
│   │   ├── copy-companion-files/
│   │   └── admin/projects/      # CRUD and partial updates for projects
│   ├── admin/project/[id]/view/ # PM project editor
│   ├── client/                  # Client wizard entry
│   ├── page.tsx                 # Admin dashboard (home)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── admin/                   # New spec dialog, etc.
│   ├── flow/                    # Process flow step UI
│   ├── layout/                  # App shell and sidebar
│   ├── login/                   # Client intake / intro
│   ├── shared/                  # File upload, tag input, tooltips
│   ├── steps/                   # Wizard steps
│   ├── ui/                      # Buttons, inputs, cards, …
│   └── use-case/                # Use case and Q&A editors
├── generated/prisma/            # Generated Prisma client (after generate)
├── lib/
│   ├── azure-storage.ts
│   ├── prisma.ts
│   ├── admin-auth.ts
│   ├── utils.ts
│   └── wordExport.ts
├── store/
│   ├── formStore.ts
│   └── adminStore.ts
└── types/
    └── index.ts

prisma/
├── schema.prisma
└── migrations/
```

## API Routes

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/submit` | Validate and save a completed client form |
| `POST` | `/api/file-upload` | Upload a file to Azure |
| `GET` | `/api/file-proxy` | Stream a stored file |
| `POST` | `/api/copy-companion-files` | Copy companion assets for a project |
| `GET`, `POST` | `/api/admin/projects` | List or create projects |
| `GET`, `PUT`, `DELETE` | `/api/admin/projects/[id]` | Load, update, or delete a project |
| `PUT` | `/api/admin/projects/[id]/concepts` | Update glossary terms |
| `PUT` | `/api/admin/projects/[id]/metrics` | Update success metrics |
| `GET` | `/api/llm/status` | Whether Azure OpenAI is configured for draft polish |
| `POST` | `/api/llm/polish-draft` | Polish Summary draft fields via Azure OpenAI |

## Database

Schema: `prisma/schema.prisma`. Main entities:

- `Client`, `Project` (with `ProjectStatus`)
- `UseCase`, `UseCaseQAPair`, `FlowStep`
- `DataSource`, `GlossaryTerm`, `SuccessMetric`
- `File`, `RequirementDocument`

```bash
npx prisma generate    # Regenerate client after schema changes
npx prisma migrate dev # Apply migrations in development
```

For a deeper walkthrough of components and data flow, see [PROJECT_EXPLANATION.md](./PROJECT_EXPLANATION.md).

## Workflow Overview

```text
PM (dashboard)  →  Create spec  →  Share /client?projectId=…
Client          →  Fill wizard  →  Submit  →  PostgreSQL + Azure files
PM              →  Review/edit at /admin/project/[id]/view  →  Update status
```
