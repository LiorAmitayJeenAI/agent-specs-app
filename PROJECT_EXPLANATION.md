# Project Explanation

This document explains the project in a clear technical way for a junior developer. It describes what the system does, how the code is organized, how data moves through the app, and which parts are complete or still unfinished.

## 1. What This Project Does In Simple Words

This project is a web application for collecting information needed to define and build an AI agent.

The user fills in a guided, step-by-step form. The form asks for:

- Client and document author details.
- The requested AI agent name and description.
- Business use cases the agent should support.
- The current manual process behind each use case.
- Data sources the agent will need.
- Business terms and definitions.
- Success metrics for evaluating the agent.

At the end, the user can:

- Review the collected information.
- Submit the form to the app's API route.
- Export the information as a Word document.

In simple terms: this is an AI agent requirements collection tool.

## 2. Main Purpose Of The System

The main purpose is to turn vague business needs into a structured AI agent specification.

Instead of asking a client or stakeholder for free-form requirements, the app guides them through a specific process:

1. Define the agent.
2. Describe real user questions.
3. Explain what answers the agent should provide.
4. Document the current workflow.
5. Identify systems and data sources.
6. Define important business vocabulary.
7. Decide how success will be measured.

The final output can be used by a product, engineering, or AI implementation team as a starting point for building the agent.

## 3. Tech Stack Used

The project uses the following technologies:

- `Next.js 15`: The main React framework. It provides the app structure, page routing, and API route support.
- `React 18`: Used to build the UI components.
- `TypeScript`: Adds static typing for safer development.
- `Zustand`: Handles global client-side state for the multi-step form.
- `Tailwind CSS`: Provides utility-first styling.
- `lucide-react`: Provides icons used throughout the UI.
- `docx`: Generates the downloadable Word document on the client.
- `Prisma`: Defines the intended database schema and generates a Prisma client.
- `PostgreSQL`: The intended database provider in the Prisma schema.
- `uuid`: Generates temporary client-side IDs for form entities.
- `clsx` and `tailwind-merge`: Used by the `cn()` helper to combine Tailwind classes safely.
- `react-hook-form`: Installed as a dependency, but currently not used in the source code.

## 4. Folder And File Structure Explanation

The important project structure is:

- `src/app/`: Next.js App Router files.
- `src/app/page.tsx`: The root page of the application.
- `src/app/layout.tsx`: The root HTML layout, metadata, RTL direction, and global CSS import.
- `src/app/api/submit/route.ts`: The API route that receives final form submissions.
- `src/app/globals.css`: Global CSS, Tailwind imports, RTL styles, font setup, and shared visual effects.
- `src/components/`: React components.
- `src/components/layout/`: App shell components such as the main layout and sidebar.
- `src/components/login/`: The first screen that collects client and author information.
- `src/components/steps/`: The main wizard step screens.
- `src/components/use-case/`: Components related to use case editing.
- `src/components/flow/`: Components related to process flow steps inside a use case.
- `src/components/shared/`: Reusable custom components such as file upload and tag input.
- `src/components/ui/`: Small reusable UI primitives like buttons, cards, inputs, labels, badges, and separators.
- `src/store/`: Zustand store.
- `src/store/formStore.ts`: The central state store for the whole form.
- `src/types/`: TypeScript data types.
- `src/types/index.ts`: Shared interfaces for form data, use cases, files, metrics, and final output.
- `src/lib/`: Small helpers and constants.
- `src/lib/utils.ts`: Utility functions and step configuration.
- `src/generated/prisma/`: Generated Prisma client files.
- `prisma/`: Prisma schema and migrations.
- `prisma/schema.prisma`: Database model definitions.
- `prisma/migrations/`: SQL migrations generated from the Prisma schema.
- `prisma.config.ts`: Prisma configuration, including the database URL source.
- `public/`: Public static files.
- `public/README.md`: Notes that an example upload image can be placed in this folder.
- `package.json`: Project dependencies and scripts.
- `tailwind.config.ts`: Tailwind configuration.
- `postcss.config.mjs`: PostCSS configuration for Tailwind and Autoprefixer.
- `tsconfig.json`: TypeScript configuration.
- `next.config.mjs`: Next.js configuration.
- `.env`: Local environment file. It should not be committed if it contains secrets.

Generated folders such as `.next/` and `node_modules/` are not source code. They are created by Next.js and npm.

## 5. What Each Important File Does

### `src/app/page.tsx`

This is the root page. It renders `AppLayout`.

The file is intentionally small because most of the application logic is handled by components under `src/components/`.

### `src/app/layout.tsx`

This is the root layout for the whole Next.js app.

It:

- Imports `globals.css`.
- Sets Hebrew metadata for the browser title and description.
- Sets `<html lang="he" dir="rtl">`, which makes the app Hebrew and right-to-left by default.
- Adds Google Fonts preconnect links.

### `src/app/globals.css`

This file sets up global styling.

It:

- Imports the Heebo font from Google Fonts.
- Imports Tailwind layers: `base`, `components`, and `utilities`.
- Sets the entire page to RTL.
- Sets the default background and text color.
- Defines scrollbar styling.
- Defines some shared animation and card hover styles.

### `src/components/layout/AppLayout.tsx`

This is the main application shell.

It reads `currentStep` and `isLoginComplete` from the Zustand store.

If login/intake is not complete, it renders `LoginPage`.

If login/intake is complete, it renders:

- `Sidebar`
- The currently selected step component

The step mapping is:

- Step 1: `StepAgentDetails`
- Step 2: `Step1UseCases`
- Step 3: `Step2DataSources`
- Step 4: `Step3Concepts`
- Step 5: `Step4Metrics`
- Step 6: `Step5Summary`

### `src/components/layout/Sidebar.tsx`

The sidebar shows the wizard steps and the user's progress.

It reads:

- `currentStep`
- `maxAccessibleStep`
- `goToStep`

from the Zustand store.

It prevents the user from jumping to future steps that have not been unlocked yet. If the user clicks a locked step, it briefly shows a message.

### `src/components/login/LoginPage.tsx`

This is the first screen before the wizard starts.

It collects:

- Client/company name.
- Document author name.

It validates that both fields are non-empty. When the form is valid and submitted, it calls `completeLogin()` in the Zustand store.

### `src/components/steps/StepAgentDetails.tsx`

This step collects the AI agent's basic details:

- Requested agent name.
- Short agent description.

The user cannot continue until both fields are filled.

### `src/components/steps/Step1UseCases.tsx`

This step manages the list of use cases.

It:

- Shows a tip banner.
- Shows an empty state when no use cases exist.
- Lets the user add use cases.
- Renders each use case with `UseCaseCard`.
- Prevents continuing until at least one use case exists.

### `src/components/use-case/UseCaseCard.tsx`

This is one of the most important UI components.

Each `UseCaseCard` represents a single business use case.

It lets the user edit:

- Use case name.
- User question.
- Expected answer.
- Who performs the process today.
- Systems involved.
- Additional notes.
- Current process flow.

It also supports collapsing and deleting the use case.

When the user changes the user question, the component also updates a short `title` field based on the question text.

### `src/components/flow/FlowSteps.tsx`

This component renders the list of flow steps inside a use case.

It:

- Finds the relevant use case by ID.
- Displays all flow steps for that use case.
- Lets the user add a new flow step.
- Handles drag-and-drop reordering.
- Calls `reorderFlowSteps()` in the Zustand store.

### `src/components/flow/FlowStepItem.tsx`

This component represents one step in a business process.

It lets the user edit:

- Step description.
- Whether the step includes a calculation.
- Calculation details.
- Screenshot or file attachments.

It also supports:

- Dragging the step to reorder it.
- Deleting the step.
- Uploading files through `FileUpload`.

### `src/components/steps/Step2DataSources.tsx`

This step collects data sources the agent will need.

Each data source has:

- Name.
- Type.
- Description.
- Access method.

The source type list includes options like SQL database, Excel/CSV, external API, ERP, CRM, documents, Jira, and other.

There is specific validation for the `Other` type: if the user chooses `Other`, the description must be filled.

### `src/components/steps/Step3Concepts.tsx`

This step collects glossary terms or business concepts.

Each concept has:

- Term.
- Definition.
- Examples.

This helps the future AI agent understand organization-specific vocabulary.

### `src/components/steps/Step4Metrics.tsx`

This step collects success metrics.

Each metric has:

- Metric name.
- Target.
- Measurement method in the TypeScript type, although the current UI does not expose a visible input for it.
- Priority: `high`, `medium`, or `low`.

The UI displays priority using badges.

### `src/components/steps/Step5Summary.tsx`

This is the final step.

It:

- Reads all collected data from the Zustand store.
- Shows a summary of document details, use cases, data sources, concepts, and metrics.
- Shows counts for use cases, flow steps, and attached files.
- Lets the user submit the data to `/api/submit`.
- Lets the user export a Word document using the `docx` library.

The Word export is generated entirely in the browser.

### `src/app/api/submit/route.ts`

This is the only backend API route currently implemented.

It accepts `POST` requests.

It:

- Reads the JSON body as `FormOutput`.
- Validates required client and agent fields.
- Validates that at least one use case exists.
- Logs the full submitted payload to the server console.
- Returns a success response with a summary.

Important: this route does not currently save data to the database.

### `src/store/formStore.ts`

This file contains the Zustand store and is the central state management file.

It stores all wizard data, including:

- Login/intake state.
- Current step.
- Maximum accessible step.
- Agent details.
- Use cases.
- Flow steps.
- Data sources.
- Concepts.
- Success metrics.

It also contains all mutation functions for adding, updating, removing, and reordering data.

### `src/types/index.ts`

This file defines the TypeScript interfaces used by the frontend state and API payload.

Important types include:

- `FileAttachment`
- `FlowStep`
- `UseCase`
- `DataSource`
- `Concept`
- `SuccessMetric`
- `ProjectIntake`
- `AgentDetails`
- `FormOutput`

These types describe the data shape that moves through the app.

### `src/lib/utils.ts`

This file contains utility functions and constants:

- `cn()`: Combines CSS class names using `clsx` and `tailwind-merge`.
- `formatBytes()`: Converts a file size in bytes into a readable string.
- `readFileAsDataURL()`: Reads a file into a base64 data URL, used for image previews.
- `STEP_CONFIGS`: Defines the wizard step titles and subtitles.

### `src/components/shared/FileUpload.tsx`

This component handles file selection and drag-and-drop uploads.

It:

- Accepts images and common document formats.
- Limits file size to 10 MB by default.
- Detects whether a file is an image, document, or other file.
- Creates a browser object URL with `URL.createObjectURL()`.
- Creates base64 previews for images.
- Calls `onAdd()` with a `FileAttachment`.
- Calls `onRemove()` when a file is removed.

Important: uploaded files are not sent to permanent storage yet.

### `src/components/shared/TagInput.tsx`

This component lets the user enter multiple string tags.

It is used for systems involved in a use case.

It supports:

- Adding tags with Enter.
- Removing tags.
- Backspace removal when the input is empty.
- Suggestions filtered by user input.

### `src/components/ui/*`

These are small reusable UI components:

- `button.tsx`: Button component with variants and sizes.
- `card.tsx`: Card, card header, card content, card footer, and related layout pieces.
- `input.tsx`: Styled input component.
- `textarea.tsx`: Styled textarea component.
- `label.tsx`: Styled label with optional required indicator.
- `badge.tsx`: Badge component with status variants.
- `separator.tsx`: Simple horizontal separator.
- `switch.tsx`: Custom switch component with RTL-aware thumb positioning.

These are local UI primitives, similar in style to shadcn/ui components.

### `prisma/schema.prisma`

This file defines the intended database schema.

It uses PostgreSQL and defines models for:

- `Client`
- `Project`
- `UseCase`
- `UseCaseQuestion`
- `Flow`
- `FlowStep`
- `File`
- `DataSource`
- `GlossaryTerm`
- `KPI`

The generated Prisma client output is configured to go into `src/generated/prisma`.

### `prisma.config.ts`

This file configures Prisma.

It:

- Loads environment variables using `dotenv/config`.
- Points Prisma to `prisma/schema.prisma`.
- Points migrations to `prisma/migrations`.
- Reads the database URL from `process.env["DATABASE_URL"]`.

### `tailwind.config.ts`

This file configures Tailwind.

It:

- Tells Tailwind which files to scan for class names.
- Extends the font family with the Heebo font variable.
- Adds sidebar colors.
- Adds `slide-in` and `fade-in` animations.

### `postcss.config.mjs`

This file configures PostCSS plugins:

- `tailwindcss`
- `autoprefixer`

### `tsconfig.json`

This file configures TypeScript.

Important settings:

- `strict: true` enables strict type checking.
- `noEmit: true` means TypeScript checks types but does not output compiled files.
- `moduleResolution: "bundler"` matches modern Next.js behavior.
- `@/*` maps to `./src/*`, allowing imports like `@/store/formStore`.

### `next.config.mjs`

This is the Next.js config file. It currently contains an empty `experimental` config object and no custom behavior.

## 6. Main Flow Of The Application

The main user flow is:

1. User opens the app.
2. `src/app/page.tsx` renders `AppLayout`.
3. `AppLayout` checks `isLoginComplete` from Zustand.
4. If login is not complete, the user sees `LoginPage`.
5. User fills client name and document author name.
6. `LoginPage` calls `completeLogin()`.
7. `AppLayout` now shows the main wizard layout.
8. User fills agent details in `StepAgentDetails`.
9. User adds one or more use cases in `Step1UseCases`.
10. For each use case, user can add a current process flow with multiple flow steps.
11. User can upload screenshots or files for each flow step.
12. User adds data sources in `Step2DataSources`.
13. User adds concepts in `Step3Concepts`.
14. User adds success metrics in `Step4Metrics`.
15. User reviews everything in `Step5Summary`.
16. User can export a Word document.
17. User can submit the data to `/api/submit`.
18. The API validates and logs the data, then returns a success response.
19. The UI shows a submission success message.

## 7. Frontend Structure

The frontend is organized as a component-based wizard.

The structure is:

- App shell: `AppLayout`
- Navigation: `Sidebar`
- Intake gate: `LoginPage`
- Step screens: files in `src/components/steps/`
- Nested use case editor: `UseCaseCard`
- Nested flow editor: `FlowSteps` and `FlowStepItem`
- Shared inputs: `FileUpload` and `TagInput`
- UI primitives: files in `src/components/ui/`

Most components are client components. They use `"use client"` because they read and write Zustand state, handle events, manage local UI state, or use browser APIs like file inputs and object URLs.

The app is Hebrew-first and RTL-first. This is configured globally in `layout.tsx` and `globals.css`.

## 8. Backend/API Structure

The backend is minimal.

There is one API route:

- `POST /api/submit`

Implemented in:

- `src/app/api/submit/route.ts`

This route currently acts as a validation and logging endpoint.

It checks:

- `projectIntake.clientName`
- `projectIntake.documentAuthorName`
- `agentDetails.requestedAgentName`
- `agentDetails.shortAgentDescription`
- At least one use case

Then it logs the full JSON payload and returns a success response.

There are TODO comments for future backend work:

- Save the submission to PostgreSQL.
- Upload files to Azure Blob Storage.
- Replace temporary browser file URLs with real storage URLs.

## 9. State Management With Zustand

The app uses Zustand for state management.

The store is defined in:

- `src/store/formStore.ts`

The main exported hook is:

- `useFormStore`

Components call this hook to read data and call actions.

For example:

- `LoginPage` reads `projectIntake` and calls `updateProjectIntake()` and `completeLogin()`.
- `StepAgentDetails` reads `agentDetails` and calls `updateAgentDetails()`.
- `Step1UseCases` reads `useCases` and calls `addUseCase()`.
- `UseCaseCard` calls `updateUseCase()`, `removeUseCase()`, and `toggleUseCaseCollapse()`.
- `FlowSteps` calls `addFlowStep()` and `reorderFlowSteps()`.
- `FlowStepItem` calls `updateFlowStep()`, `removeFlowStep()`, `addFileToStep()`, and `removeFileFromStep()`.
- `Step5Summary` calls `getOutput()`.

The store uses immutable updates. For example, when updating a use case, it maps over the existing `useCases` array and replaces only the matching item.

Important store fields:

- `isLoginComplete`: Controls whether the user sees login or the wizard.
- `currentStep`: Current wizard step.
- `maxAccessibleStep`: Furthest step the user is allowed to visit.
- `projectIntake`: Client and author details.
- `agentDetails`: Agent name and description.
- `useCases`: All use cases and nested flow steps.
- `dataSources`: Data sources.
- `concepts`: Glossary terms.
- `successMetrics`: Success metrics.

Important store actions:

- `completeLogin()`
- `updateProjectIntake()`
- `updateAgentDetails()`
- `goToStep()`
- `nextStep()`
- `prevStep()`
- `addUseCase()`
- `updateUseCase()`
- `removeUseCase()`
- `addFlowStep()`
- `updateFlowStep()`
- `removeFlowStep()`
- `reorderFlowSteps()`
- `addFileToStep()`
- `removeFileFromStep()`
- `addDataSource()`
- `updateDataSource()`
- `removeDataSource()`
- `addConcept()`
- `updateConcept()`
- `removeConcept()`
- `addSuccessMetric()`
- `updateSuccessMetric()`
- `removeSuccessMetric()`
- `getOutput()`

Important limitation: Zustand is used in memory only. There is no persistence middleware, so refreshing the page clears the form.

## 10. Forms And Validation

The app uses controlled inputs connected directly to Zustand state.

Although `react-hook-form` is installed, the current code does not use it.

Validation is mostly simple UI validation:

- `LoginPage`: client name and document author name are required.
- `StepAgentDetails`: agent name and description are required.
- `Step1UseCases`: at least one use case is required before continuing.
- `Step2DataSources`: if source type is `Other`, description is required.
- `FileUpload`: file size must be under the configured limit, 10 MB by default.
- `POST /api/submit`: validates required intake and agent fields and checks that there is at least one use case.

Some labels show a required star, but not every required label has strict blocking validation in the UI. For example, concept fields are visually marked as required, but the user can still continue without filling them.

## 11. Database Models, ORM, Prisma, And Schema

The project includes Prisma and a PostgreSQL schema.

The schema is defined in:

- `prisma/schema.prisma`

The Prisma generator outputs generated code to:

- `src/generated/prisma`

The database models are:

### `Client`

Represents a client/company.

Fields:

- `client_id`
- `client_name`
- `created_at`

A client can have many projects.

### `Project`

Represents an AI agent specification project.

Fields:

- `project_id`
- `client_id`
- `project_name`
- `created_at`

A project belongs to a client and can have many use cases, glossary terms, and KPIs.

### `UseCase`

Represents a business use case.

Fields:

- `use_case_id`
- `project_id`
- `use_case_name`
- `description`
- `performed_by`
- `current_systems`
- `notes`
- `created_at`

A use case belongs to a project and can have questions, flows, data sources, and KPIs.

### `UseCaseQuestion`

Represents a user question and expected answer for a use case.

Fields:

- `question_id`
- `use_case_id`
- `user_question`
- `expected_answer`

### `Flow`

Represents a process flow for a use case.

Fields:

- `flow_id`
- `use_case_id`
- `flow_name`
- `description`

A flow has many flow steps.

### `FlowStep`

Represents one step in a process flow.

Fields:

- `step_id`
- `flow_id`
- `step_number`
- `step_description`
- `has_calculation`
- `calculation_details`
- `notes`

### `File`

Represents an uploaded file.

Fields:

- `file_id`
- `related_entity_type`
- `related_entity_id`
- `file_name`
- `file_type`
- `blob_url`
- `uploaded_at`

This model is polymorphic because it stores the related entity type and ID instead of having a direct Prisma relation.

### `DataSource`

Represents a data source used by a use case.

Fields:

- `data_source_id`
- `use_case_id`
- `source_name`
- `location_access`
- `access_method`
- `data_format`
- `fields_description`
- `example_data`
- `relevant_data`
- `notes`

### `GlossaryTerm`

Represents a business term.

Fields:

- `term_id`
- `project_id`
- `term`
- `definition`

### `KPI`

Represents a success metric.

Fields:

- `kpi_id`
- `project_id`
- `use_case_id`
- `kpi_name`
- `kpi_description`
- `success_direction`

Important note: the Prisma schema is not currently wired into the runtime submit flow. No application code currently creates records through Prisma.

Also, the frontend `FormOutput` shape and Prisma relational schema are not identical. A future database integration will need a mapping layer that converts the client-side form data into the normalized Prisma models.

## 12. Environment Variables And Configuration

The important environment variable is:

- `DATABASE_URL`

It is used by `prisma.config.ts`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

The project has a `.env` file, but this documentation intentionally does not include its values because environment files often contain secrets.

Configuration files:

- `next.config.mjs`: Next.js configuration.
- `tailwind.config.ts`: Tailwind scan paths, font, colors, and animations.
- `postcss.config.mjs`: Tailwind and Autoprefixer setup.
- `tsconfig.json`: TypeScript strict mode and path aliases.
- `prisma.config.ts`: Prisma schema, migrations path, and database URL source.

## 13. Important Functions And Components

### `useFormStore`

The main Zustand hook. It is the central way components access and update global form state.

### `newUseCase()`

Factory function inside `formStore.ts`. It creates a blank use case with a UUID.

### `newFlowStep(order)`

Factory function inside `formStore.ts`. It creates a blank flow step with an order number.

### `newDataSource()`

Factory function inside `formStore.ts`. It creates a blank data source.

### `newConcept()`

Factory function inside `formStore.ts`. It creates a blank glossary concept.

### `newMetric()`

Factory function inside `formStore.ts`. It creates a blank success metric with default priority `medium`.

### `nextStep()`

Moves the wizard forward and updates `maxAccessibleStep`.

This is what unlocks future steps.

### `goToStep(step)`

Moves to a specific step, but only up to `maxAccessibleStep`.

This prevents users from skipping ahead too far.

### `reorderFlowSteps(useCaseId, fromIndex, toIndex)`

Moves a flow step inside a use case and then recalculates each step's `order`.

### `getOutput()`

Builds the final `FormOutput` object from the current store data and adds `submittedAt`.

This output is used by:

- The submit API request.
- The Word export.
- The summary screen.

### `cn()`

Utility function that combines Tailwind class names. It uses `clsx` and `tailwind-merge`.

### `readFileAsDataURL(file)`

Reads a browser `File` object into a base64 data URL. Used for image previews.

### `handleSubmit()` in `Step5Summary`

Sends the final `FormOutput` to `/api/submit` using `fetch`.

### `handleExportWord()` in `Step5Summary`

Builds a Word document using the `docx` library, converts it to a blob, creates a temporary object URL, and downloads it.

### `processFile()` in `FileUpload`

Validates file size, detects file type, creates previews, and creates a `FileAttachment` object.

## 14. How Data Moves Inside The System

The data flow is:

1. User types into an input.
2. The input's `onChange` handler calls a Zustand action.
3. The Zustand action updates the global store.
4. Components that read the changed store data re-render.
5. The sidebar and summary screens reflect the updated state.
6. On the final step, `getOutput()` creates a full `FormOutput`.
7. `Step5Summary` sends that object to `/api/submit`.
8. The API route validates and logs the object.
9. The API route returns a JSON success response.
10. The frontend shows a success message.

For Word export:

1. `Step5Summary` reads data from Zustand.
2. It creates `docx` paragraphs from the current data.
3. `Packer.toBlob()` converts the document to a browser blob.
4. The browser downloads the blob as a `.docx` file.

For file uploads:

1. User selects or drops a file.
2. `FileUpload` validates the file.
3. It creates a local object URL.
4. If the file is an image, it creates a base64 preview.
5. It calls `addFileToStep()`.
6. The file metadata is stored under the matching flow step in Zustand.

Important: the actual file binary is not uploaded to the backend today.

## 15. How To Run The Project Locally

From the project root:

```bash
npm install
npm run dev
```

Then open the local URL printed by Next.js, usually:

```bash
http://localhost:3000
```

Other available scripts:

```bash
npm run build
npm run start
npm run lint
```

For Prisma-related work, make sure `.env` contains `DATABASE_URL`.

Common Prisma commands you may need:

```bash
npx prisma generate
npx prisma migrate dev
```

Only run migrations when you have a real database configured and you understand the schema changes.

## 16. Known Issues, Assumptions, And Unfinished Parts

### Data is not persisted after refresh

Zustand state is currently in memory only. If the user refreshes the browser, the form data is lost.

Possible future improvement: use Zustand persistence with `localStorage`, or save draft submissions to the backend.

### Submit does not save to the database

The API route validates and logs data, but it does not insert records into PostgreSQL.

Possible future improvement: add a service or repository layer that maps `FormOutput` into Prisma models.

### Prisma schema and frontend model are not identical

The frontend stores data in a convenient form shape. Prisma expects a normalized relational model.

For example, frontend `dataSources` are top-level in `FormOutput`, while Prisma `DataSource` belongs to a `UseCase`.

This needs careful mapping before persistence is implemented.

### File uploads are temporary

`FileUpload` uses browser object URLs, which only exist during the browser session.

The API route comments mention Azure Blob Storage, but this is not implemented yet.

Possible future improvement: upload files to storage and replace local URLs with permanent URLs.

### Word export lists file names only

The Word export includes attached file names, but it does not embed the files themselves.

### `react-hook-form` is installed but unused

The forms are currently controlled manually with Zustand. This is fine, but the unused dependency may confuse future developers.

The team should either remove it or intentionally adopt it for form handling.

### Some visual required labels are not strict validations

Some fields display a required star, but the step may still allow continuing.

Possible future improvement: define a consistent validation strategy for every step.

### Error handling is basic

If `/api/submit` returns a non-OK response, `Step5Summary` does not show a detailed error message to the user.

Possible future improvement: display API validation errors in the UI.

### Authentication is not implemented

The `LoginPage` is not real authentication. It only collects intake details and toggles `isLoginComplete`.

### No tests are currently visible

There are no obvious unit, integration, or end-to-end tests in the current source structure.

Possible future improvement: add tests for the store, validation rules, API route, and main wizard flow.

## Mental Model For New Developers

Think of the app as three layers:

1. UI components: render forms and buttons.
2. Zustand store: holds all current form data and actions.
3. API route: receives the final output.

Most development work will involve one of these tasks:

- Add a field to a TypeScript type in `src/types/index.ts`.
- Add the field to the default object in `src/store/formStore.ts`.
- Add an input in the relevant step component.
- Include the field in `Step5Summary` and Word export.
- If persistence is implemented, map the field into Prisma models.

That sequence is the safest way to keep the data model, UI, summary, export, and backend aligned.
