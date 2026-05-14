# אפיון סוכן AI — Agent Spec Builder

Multi-step Hebrew RTL form for collecting AI agent specifications from non-technical users.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (state management)
- **React Hook Form** (ready for step-level validation)
- **Lucide React** (icons)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # RTL + Hebrew font
│   ├── page.tsx
│   ├── globals.css
│   └── api/submit/route.ts # Form submission endpoint
├── types/index.ts           # All TypeScript interfaces
├── store/formStore.ts       # Zustand store (single source of truth)
├── lib/utils.ts             # cn(), formatBytes(), STEP_CONFIGS
└── components/
    ├── layout/
    │   ├── AppLayout.tsx    # Root layout with RTL flex (sidebar right)
    │   └── Sidebar.tsx      # Fixed right stepper navigation
    ├── steps/               # Step1–Step5 page components
    ├── use-case/
    │   └── UseCaseCard.tsx  # Collapsible use case with 3 sections
    ├── flow/
    │   ├── FlowSteps.tsx    # Timeline container
    │   └── FlowStepItem.tsx # Individual step with calc toggle + file upload
    ├── shared/
    │   ├── FileUpload.tsx   # Drag-and-drop + image preview
    │   └── TagInput.tsx     # Tag chips with autocomplete
    └── ui/                  # Custom shadcn-style primitives
```

## Production Checklist

### Database (PostgreSQL)
Wire up the API route at `src/app/api/submit/route.ts` to persist:
- `submissions` → `use_cases` → `flow_steps` → `files`
- `data_sources`, `concepts`, `success_metrics`

### Azure Blob Storage
In `FileUpload.tsx`, files are currently stored as Object URLs (client-only).
For production, add an upload endpoint that streams files to Azure Blob Storage
and returns the CDN URL to store in the database.

### Environment Variables
```env
DATABASE_URL=postgresql://...
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=agent-specs
```
