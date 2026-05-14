# Agent Specs App

A Hebrew RTL web app for collecting structured AI agent requirements from clients and stakeholders.

The app guides users through a multi-step form, captures use cases and business context, supports file uploads, and generates an AI agent specification that can be submitted or exported as a Word document.

## Features

- Hebrew, right-to-left user interface.
- Guided multi-step AI agent requirements form.
- Client, project, author, and requested agent details.
- Use case collection with current workflow steps.
- Data source, business concept, and success metric sections.
- File upload support through Azure Blob Storage.
- Final summary screen with Word document export.
- PostgreSQL persistence through Prisma.

## Tech Stack

- Next.js 15 with App Router.
- React 18 and TypeScript.
- Tailwind CSS for styling.
- Zustand for form state management.
- Prisma and PostgreSQL for persistence.
- Azure Blob Storage for uploaded files.
- `docx` for Word document generation.
- Lucide React for icons.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local `.env` file using the variables in the Environment Variables section below.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The app reads these variables from `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

AZURE_STORAGE_ACCOUNT_NAME="your-storage-account"
AZURE_STORAGE_ACCOUNT_KEY="your-storage-account-key"
AZURE_STORAGE_CONTAINER_NAME="your-container-name"
AZURE_STORAGE_FOLDER_NAME="optional-folder-name"
```

Keep `.env` private. It is already ignored by Git through `.gitignore`.

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Runs the production build.

```bash
npm run lint
```

Runs the configured Next.js lint command.

## Project Structure

```text
src/
├── app/
│   ├── api/                 # API routes for submit, upload, proxy, and file copy
│   ├── globals.css          # Global styles and RTL visual setup
│   ├── layout.tsx           # Root layout and metadata
│   └── page.tsx             # Main app entry point
├── components/
│   ├── flow/                # Current-process flow step components
│   ├── layout/              # App shell and sidebar
│   ├── login/               # Initial client/project details screen
│   ├── shared/              # Reusable form helpers
│   ├── steps/               # Wizard step screens
│   ├── ui/                  # Small UI primitives
│   └── use-case/            # Use case editor components
├── lib/
│   ├── azure-storage.ts     # Azure Blob Storage helpers
│   ├── prisma.ts            # Prisma client setup
│   ├── utils.ts             # Shared utility helpers
│   └── wordExport.ts        # Word document export logic
├── store/
│   └── formStore.ts         # Zustand store for the form wizard
└── types/
    └── index.ts             # Shared TypeScript types
```

## Database

The Prisma schema is located in `prisma/schema.prisma`.

It defines the main project entities:

- Clients.
- Projects.
- Use cases.
- Flow steps.
- Files.
- Data sources.
- Glossary terms.
- Success metrics.
- Requirement documents.

After configuring `DATABASE_URL`, generate the Prisma client when needed:

```bash
npx prisma generate
```

## Git Notes

The project is safe to push to GitHub as long as secrets stay in `.env`.

Before pushing, you can verify that `.env` is ignored:

```bash
git check-ignore -v .env
```
