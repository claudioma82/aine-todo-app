---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
inputDocuments: ['prd.md', 'architecture.md']
workflowType: 'epics-and-stories'
project_name: 'todo-app'
user_name: 'Claudio'
date: '2026-03-12'
---

# todo-app - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for todo-app, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The user can create a new todo item by providing a text description
FR2: The user can view the complete list of all their todo items
FR3: The user can mark a todo item as complete
FR4: The user can mark a completed todo item as incomplete
FR5: The user can delete a todo item
FR6: The system persists all todo items durably across browser sessions
FR7: Each todo item has a unique identifier
FR8: Each todo item has a text description
FR9: Each todo item has a completion status (complete / incomplete)
FR10: Each todo item records the date and time it was created
FR11: The application displays an empty state when no todos exist
FR12: The application displays a loading state while data is being fetched
FR13: The application displays an error state when a backend operation fails
FR14: The user receives immediate visual feedback when performing any CRUD operation (no full page reload required)
FR15: The user can retry a failed operation without losing their input
FR16: Completed todo items are visually distinguishable from active items
FR17: The application layout adapts correctly to desktop viewports (≥1024px)
FR18: The application layout adapts correctly to tablet viewports (768px–1023px)
FR19: The application layout adapts correctly to mobile viewports (<768px)
FR20: All core actions are operable via keyboard
FR21: The system exposes an API endpoint to create a todo item
FR22: The system exposes an API endpoint to retrieve all todo items
FR23: The system exposes an API endpoint to update a todo item's completion status
FR24: The system exposes an API endpoint to delete a todo item
FR25: The API returns consistent, well-defined error responses for all failure conditions
FR26: The data model does not structurally prevent future addition of user authentication or multi-user support

### NonFunctional Requirements

NFR1 (Performance): API response time for all CRUD operations: ≤200ms under normal conditions
NFR2 (Performance): Initial page load time: ≤2 seconds on a standard broadband connection
NFR3 (Performance): UI interactions (add, complete, delete) must produce immediate visual feedback with no perceptible delay
NFR4 (Security): All data transmitted between frontend and backend must use HTTPS
NFR5 (Security): The API must validate and sanitise all input to prevent injection attacks
NFR6 (Security): The application must not expose internal server error details to the client; errors must be mapped to safe user-facing messages
NFR7 (Accessibility): WCAG 2.1 AA compliance for all interactive elements
NFR8 (Accessibility): All core actions (create, complete, delete) must be keyboard-accessible
NFR9 (Accessibility): Colour contrast ratios must meet WCAG AA minimums for both active and completed todo states
NFR10 (Accessibility): Form inputs must have associated labels; error messages must be programmatically associated with their inputs
NFR11 (Reliability): The application must not lose user data under normal operation
NFR12 (Reliability): Failed write operations (create, update, delete) must not result in partial or corrupted state
NFR13 (Reliability): The application must degrade gracefully when the backend is unavailable — no blank screens, no uncaught exceptions

### Additional Requirements

- ARCH1: Monorepo initialisation — pnpm workspaces setup with `frontend/` and `backend/` packages and a shared `tsconfig.base.json`
- ARCH2 (Starter): Project scaffold uses manual pnpm workspaces (no single CLI generator); frontend via `pnpm create vite@latest frontend -- --template react-ts`; this is the first implementation story
- ARCH3: Frontend is a Vite + React + TypeScript SPA deployed as static assets served by Nginx (multi-stage Docker build)
- ARCH4: Backend is Fastify v5 + TypeScript with `@fastify/cors` and `@fastify/helmet` plugins registered at startup
- ARCH5: Database is SQLite via `better-sqlite3`; ORM is Drizzle ORM; migrations generated and applied via Drizzle Kit; migrations auto-run on server startup
- ARCH6: Deployment is Docker Compose with a named `db-data` volume mounting SQLite file at `/app/data/todos.db` inside the backend container only
- ARCH7: All API error responses use `{ "error": { "code": "...", "message": "..." } }` format; HTTP status conventions: 400, 404, 422, 500
- ARCH8: Input validation uses Fastify built-in JSON Schema (`@fastify/ajv`) defined on route options; route handlers assume valid input
- ARCH9: Frontend component structure is defined: `AddTodoForm`, `TodoList`, `TodoItem`, `EmptyState`, `LoadingState`, `ErrorState`; `useTodos` hook encapsulates all API state; `api/todos.ts` holds raw fetch functions
- ARCH10: Testing framework is Vitest; test files are co-located with source files using `.test.ts` / `.test.tsx` suffix
- ARCH11: `isComplete` field is boolean in TypeScript/JSON; stored as integer (0/1) in SQLite; mapping done in route handler
- ARCH12: Nginx proxies `/api/*` requests to `backend:3000`; frontend Vite dev server proxies `/api/*` to `localhost:3000` via `vite.config.ts`

### FR Coverage Map

FR1: Epic 2 — Core Todo CRUD (create todo)
FR2: Epic 2 — Core Todo CRUD (view all todos)
FR3: Epic 2 — Core Todo CRUD (mark complete)
FR4: Epic 2 — Core Todo CRUD (mark incomplete)
FR5: Epic 2 — Core Todo CRUD (delete todo)
FR6: Epic 2 — Core Todo CRUD (persist across sessions)
FR7: Epic 2 — Core Todo CRUD (unique identifier)
FR8: Epic 2 — Core Todo CRUD (text description)
FR9: Epic 2 — Core Todo CRUD (completion status)
FR10: Epic 2 — Core Todo CRUD (createdAt timestamp)
FR11: Epic 3 — Reliability & Error Handling (empty state)
FR12: Epic 3 — Reliability & Error Handling (loading state)
FR13: Epic 3 — Reliability & Error Handling (error state)
FR14: Epic 2 — Core Todo CRUD (immediate visual feedback, no reload)
FR15: Epic 3 — Reliability & Error Handling (retry without losing input)
FR16: Epic 2 — Core Todo CRUD (visual distinction for completed items)
FR17: Epic 4 — Responsive & Accessible (desktop viewport)
FR18: Epic 4 — Responsive & Accessible (tablet viewport)
FR19: Epic 4 — Responsive & Accessible (mobile viewport)
FR20: Epic 4 — Responsive & Accessible (keyboard operability)
FR21: Epic 2 — Core Todo CRUD (POST /api/todos)
FR22: Epic 2 — Core Todo CRUD (GET /api/todos)
FR23: Epic 2 — Core Todo CRUD (PATCH /api/todos/:id)
FR24: Epic 2 — Core Todo CRUD (DELETE /api/todos/:id)
FR25: Epic 2 — Core Todo CRUD (consistent error responses)
FR26: Epic 2 — Core Todo CRUD (data model does not block future auth)

## Epic List

### Epic 1: Project Foundation & Development Environment
Establish the complete containerised monorepo with end-to-end connectivity between the React SPA frontend, Fastify REST API backend, and SQLite database — proving the entire stack works before any business feature is built.
**FRs covered:** None directly (foundational infrastructure)
**ARCH covered:** ARCH1, ARCH2, ARCH3, ARCH4, ARCH5, ARCH6
**NFRs:** NFR4

### Epic 2: Core Todo CRUD
Users can create, view, toggle completion, and delete todos, with data persisting durably across browser sessions via the REST API and SQLite database. Includes immediate visual feedback on all operations.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR14, FR16, FR21, FR22, FR23, FR24, FR25, FR26
**NFRs:** NFR1, NFR2, NFR3, NFR5

### Epic 3: Reliability & Error Handling
The app handles all failure conditions gracefully — network errors, backend unavailability, and edge cases — so users are never left with a blank screen, a crashed UI, or lost input.
**FRs covered:** FR11, FR12, FR13, FR15
**NFRs:** NFR6, NFR11, NFR12, NFR13

### Epic 4: Responsive & Accessible Experience
The app is fully usable on desktop, tablet, and mobile viewports and meets WCAG 2.1 AA accessibility standards with complete keyboard operability.
**FRs covered:** FR17, FR18, FR19, FR20
**NFRs:** NFR7, NFR8, NFR9, NFR10

## Epic 1: Project Foundation & Development Environment

Establish the complete containerised monorepo with end-to-end connectivity between the React SPA frontend, Fastify REST API backend, and SQLite database — proving the entire stack works before any business feature is built.

### Story 1.1: Monorepo Scaffold and Root Configuration

As a developer,
I want a pnpm workspace monorepo with `frontend/` and `backend/` packages and shared TypeScript configuration,
So that both packages share tooling conventions and can be started from a single root command.

**Acceptance Criteria:**

**Given** a fresh directory,
**When** `pnpm install` is run from the root,
**Then** both `frontend/` and `backend/` node_modules are installed correctly

**Given** the monorepo root,
**When** `pnpm dev` is run,
**Then** both the Vite dev server and the Fastify dev server start concurrently via `concurrently`

**Given** `tsconfig.base.json` exists at the root,
**When** each package's `tsconfig.json` extends it,
**Then** TypeScript strict mode is enforced across both packages

**Given** the root `package.json`,
**When** `pnpm build` is run,
**Then** both packages compile without TypeScript errors

**Given** the root `.gitignore`,
**When** checked,
**Then** `node_modules/`, `dist/`, and `.env` files are excluded

### Story 1.2: Backend Server Foundation

As a developer,
I want a running Fastify server with security plugins and environment configuration,
So that the API layer is ready to register routes with correct security headers and CORS policy.

**Acceptance Criteria:**

**Given** the backend package,
**When** `pnpm dev` is run,
**Then** the Fastify server starts on `PORT` from environment (default `3000`) and logs a startup message

**Given** a `GET /api/health` request,
**When** the server is running,
**Then** it returns `{ "status": "ok" }` with HTTP 200

**Given** a request from `CORS_ORIGIN`,
**When** `@fastify/cors` is configured,
**Then** the response includes the correct `Access-Control-Allow-Origin` header

**Given** any request,
**When** `@fastify/helmet` is registered,
**Then** HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, etc.) are present in all responses

**Given** an unhandled server error,
**When** it propagates to Fastify's global `setErrorHandler`,
**Then** the response is `{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }` with HTTP 500 and no stack trace exposed

**Given** `backend/.env.example`,
**When** checked,
**Then** it contains `PORT`, `DATABASE_PATH`, and `CORS_ORIGIN` with example values

### Story 1.3: Database Foundation

As a developer,
I want Drizzle ORM and SQLite configured with the todos table schema and automatic migration on startup,
So that the backend has a working persistence layer ready for API route implementation.

**Acceptance Criteria:**

**Given** `backend/src/db/schema.ts`,
**When** reviewed,
**Then** it defines a `todos` table with columns: `id` (text, primary key, UUID), `text` (text, not null), `is_complete` (integer, not null, default `0`), `created_at` (text, not null, ISO timestamp)

**Given** `backend/src/db/client.ts`,
**When** the Drizzle client is imported,
**Then** it reads `DATABASE_PATH` from the environment and creates a `better-sqlite3` connection

**Given** `server.ts` startup,
**When** the server starts,
**Then** Drizzle Kit migrations run automatically before routes are registered

**Given** `backend/drizzle.config.ts`,
**When** Drizzle Kit runs,
**Then** it reads schema from `src/db/schema.ts` and outputs migration files to `src/db/migrations/`

**Given** a fresh database after migration,
**When** the `todos` table is queried,
**Then** it returns an empty array `[]` (not `null`)

**Given** `DATABASE_PATH` pointing to `/app/data/todos.db` in Docker,
**When** the `/app/data/` directory does not yet exist,
**Then** the server creates it automatically before connecting

### Story 1.4: Frontend Scaffold and Backend Connectivity

As a developer,
I want a Vite React TypeScript frontend that can communicate with the backend API in development,
So that the full client-server data flow is verified before any UI features are built.

**Acceptance Criteria:**

**Given** the frontend scaffolded via `pnpm create vite@latest frontend -- --template react-ts`,
**When** `pnpm dev` is run,
**Then** the Vite dev server starts on port `5173`

**Given** `frontend/vite.config.ts` including a proxy configuration for `/api/*`,
**When** the browser makes a request to `/api/*`,
**Then** it is forwarded to `http://localhost:3000`

**Given** the app running at `localhost:5173`,
**When** `App.tsx` calls `GET /api/health` on mount,
**Then** a visible "Connected" indicator is rendered in the browser

**Given** `frontend/src/types/todo.ts`,
**When** reviewed,
**Then** it exports a `Todo` interface with: `id: string`, `text: string`, `isComplete: boolean`, `createdAt: string`

**Given** `frontend/.env.example`,
**When** checked,
**Then** it contains `VITE_API_URL=http://localhost:3000`

### Story 1.5: Docker Compose Deployment

As a developer,
I want the full application to run via a single `docker compose up --build` command,
So that the app can be deployed to any Docker-capable environment reproducibly.

**Acceptance Criteria:**

**Given** `backend/Dockerfile`,
**When** built,
**Then** it uses a multi-stage build: install + compile stage (`node:lts`) and runtime stage (`node:lts-alpine`) executing `node dist/server.js`

**Given** `frontend/Dockerfile`,
**When** built,
**Then** it uses a multi-stage build: Vite build stage (`node:lts`) and serve stage (`nginx:alpine`)

**Given** `frontend/nginx.conf`,
**When** reviewed,
**Then** it serves static assets from `/usr/share/nginx/html` and proxies all `/api/*` requests to `http://backend:3000`

**Given** `docker-compose.yml`,
**When** reviewed,
**Then** it defines: `frontend` service (port `80`), `backend` service (port `3000`), and a `db-data` named volume mounted at `/app/data` in the backend container only

**Given** `docker compose up --build`,
**When** run,
**Then** the frontend is accessible at `http://localhost` and `GET http://localhost/api/health` returns `{ "status": "ok" }`

**Given** `docker compose down` (without `-v`) followed by `docker compose up`,
**When** run,
**Then** the `db-data` volume persists and the database file is intact

## Epic 2: Core Todo CRUD

Users can create, view, toggle completion, and delete todos, with data persisting durably across browser sessions via the REST API and SQLite database. Includes immediate visual feedback on all operations.

### Story 2.1: List Todos API Endpoint

As a developer,
I want a `GET /api/todos` endpoint that returns all todos from the database,
So that the frontend can retrieve and display the current todo list.

**Acceptance Criteria:**

**Given** the todos table is empty,
**When** `GET /api/todos` is called,
**Then** the response is `[]` with HTTP 200

**Given** todos exist in the database,
**When** `GET /api/todos` is called,
**Then** the response is an array of todo objects each with `id`, `text`, `isComplete` (boolean), and `createdAt` (ISO string), with HTTP 200

**Given** a database error during the query,
**When** `GET /api/todos` is called,
**Then** the response is `{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }` with HTTP 500

**Given** the `is_complete` column stored as integer (0/1) in SQLite,
**When** the response is serialised,
**Then** `isComplete` is a boolean (`false`/`true`), not a number

**Given** normal load conditions,
**When** `GET /api/todos` is called,
**Then** the response time is ≤200ms

### Story 2.2: Create Todo API Endpoint

As a developer,
I want a `POST /api/todos` endpoint that creates a new todo item,
So that the frontend can persist new todos to the database.

**Acceptance Criteria:**

**Given** a valid request body `{ "text": "Buy milk" }`,
**When** `POST /api/todos` is called,
**Then** a new todo is inserted with a UUID `id`, the provided `text`, `isComplete: false`, and `createdAt` set to the current UTC ISO timestamp, and the created todo is returned with HTTP 201

**Given** a request body with missing `text` field,
**When** `POST /api/todos` is called,
**Then** the response is `{ "error": { "code": "VALIDATION_ERROR", "message": "text is required" } }` with HTTP 422

**Given** a request body with an empty string `{ "text": "" }` or whitespace-only text,
**When** `POST /api/todos` is called,
**Then** the response is `{ "error": { "code": "VALIDATION_ERROR", "message": "text must not be empty" } }` with HTTP 422

**Given** a valid create request,
**When** the todo is inserted,
**Then** the `id` is a valid UUID v4 string

**Given** normal load conditions,
**When** `POST /api/todos` is called,
**Then** the response time is ≤200ms

### Story 2.3: Toggle Todo Completion API Endpoint

As a developer,
I want a `PATCH /api/todos/:id` endpoint that updates a todo's completion status,
So that the frontend can toggle todos between complete and incomplete.

**Acceptance Criteria:**

**Given** a valid request body `{ "isComplete": true }` and an existing todo `id`,
**When** `PATCH /api/todos/:id` is called,
**Then** the todo's `is_complete` column is updated and the full updated todo object is returned with HTTP 200

**Given** a non-existent `id`,
**When** `PATCH /api/todos/:id` is called,
**Then** the response is `{ "error": { "code": "TODO_NOT_FOUND", "message": "The requested todo does not exist" } }` with HTTP 404

**Given** a request body with a missing or non-boolean `isComplete` field,
**When** `PATCH /api/todos/:id` is called,
**Then** the response is `{ "error": { "code": "VALIDATION_ERROR", "message": "isComplete must be a boolean" } }` with HTTP 422

**Given** a valid patch request,
**When** the response is serialised,
**Then** `isComplete` is a boolean and `createdAt` is unchanged

**Given** normal load conditions,
**When** `PATCH /api/todos/:id` is called,
**Then** the response time is ≤200ms

### Story 2.4: Delete Todo API Endpoint

As a developer,
I want a `DELETE /api/todos/:id` endpoint that removes a todo from the database,
So that the frontend can permanently delete todos.

**Acceptance Criteria:**

**Given** an existing todo `id`,
**When** `DELETE /api/todos/:id` is called,
**Then** the todo is removed from the database and the response is HTTP 204 with no body

**Given** a non-existent `id`,
**When** `DELETE /api/todos/:id` is called,
**Then** the response is `{ "error": { "code": "TODO_NOT_FOUND", "message": "The requested todo does not exist" } }` with HTTP 404

**Given** normal load conditions,
**When** `DELETE /api/todos/:id` is called,
**Then** the response time is ≤200ms

### Story 2.5: Todo List Display

As a user,
I want to see my full list of todos when I open the app,
So that I can review all my tasks at a glance.

**Acceptance Criteria:**

**Given** the app loads in the browser,
**When** the initial `GET /api/todos` fetch completes,
**Then** all todos are displayed in the list in the order returned by the API

**Given** todos exist,
**When** they are rendered,
**Then** each todo shows its `text` and a visual indicator of its completion state (strikethrough and muted colour for completed items)

**Given** the initial page load,
**When** measured on a standard broadband connection,
**Then** the page is fully interactive within ≤2 seconds

**Given** the `useTodos` hook,
**When** the component mounts,
**Then** `isLoading` is `true` until the fetch resolves, then `false`

### Story 2.6: Create Todo UI

As a user,
I want to type a task description and submit it to add a new todo,
So that I can capture new tasks quickly without a page reload.

**Acceptance Criteria:**

**Given** the `AddTodoForm` component,
**When** the user types text and presses Enter or clicks the submit button,
**Then** `POST /api/todos` is called and the new todo appears in the list immediately without a full page reload

**Given** a successful create,
**When** the response returns,
**Then** the input field is cleared and `isCreating` returns to `false`

**Given** the input field is empty,
**When** the user attempts to submit,
**Then** submission is prevented client-side and no API call is made

**Given** the `AddTodoForm` component,
**When** rendered,
**Then** the input has an associated `<label>` element

### Story 2.7: Toggle Todo Completion UI

As a user,
I want to click a checkbox to mark a todo as complete or incomplete,
So that I can track my progress through tasks.

**Acceptance Criteria:**

**Given** an active todo,
**When** the user clicks its checkbox,
**Then** `PATCH /api/todos/:id` is called with `{ "isComplete": true }` and the todo's visual state updates immediately

**Given** a completed todo,
**When** the user clicks its checkbox,
**Then** `PATCH /api/todos/:id` is called with `{ "isComplete": false }` and the strikethrough styling is removed

**Given** a toggle in progress,
**When** `isUpdating` equals the todo's `id`,
**Then** that specific checkbox is disabled to prevent double-submission

**Given** completed todos,
**When** rendered,
**Then** they are visually distinguishable from active todos with strikethrough text and muted colour

### Story 2.8: Delete Todo UI

As a user,
I want to click a delete button to permanently remove a todo,
So that I can keep my list tidy.

**Acceptance Criteria:**

**Given** a todo in the list,
**When** the user clicks its delete button,
**Then** `DELETE /api/todos/:id` is called and the todo is removed from the list immediately without a full page reload

**Given** a delete in progress,
**When** `isDeleting` equals the todo's `id`,
**Then** that specific delete button is disabled to prevent double-submission

**Given** the delete button,
**When** rendered,
**Then** it has an accessible label (e.g. `aria-label="Delete todo"`)

## Epic 3: Reliability & Error Handling

The app handles all failure conditions gracefully — network errors, backend unavailability, and edge cases — so users are never left with a blank screen, a crashed UI, or lost input.

### Story 3.1: Loading State

As a user,
I want to see a loading indicator while the app fetches my todos,
So that I know the app is working and haven't been left with a blank screen.

**Acceptance Criteria:**

**Given** the app mounts and `GET /api/todos` is in flight,
**When** `isLoading` is `true` in the `useTodos` hook,
**Then** the `LoadingState` component is rendered instead of the todo list

**Given** the fetch completes successfully,
**When** `isLoading` becomes `false`,
**Then** the `LoadingState` component is unmounted and the todo list is rendered

**Given** the `LoadingState` component,
**When** rendered,
**Then** it communicates visually that content is loading (e.g. spinner or skeleton) and does not render a blank screen

### Story 3.2: Empty State

As a user,
I want to see a helpful message when I have no todos,
So that I know the app loaded correctly and understand how to get started.

**Acceptance Criteria:**

**Given** `GET /api/todos` returns `[]`,
**When** the list is rendered,
**Then** the `EmptyState` component is displayed instead of an empty list container

**Given** the `EmptyState` component,
**When** rendered,
**Then** it displays a message indicating no todos exist and prompts the user to create one

**Given** a user creates their first todo,
**When** the todo is successfully saved,
**Then** `EmptyState` is replaced by the todo list containing the new item

### Story 3.3: Error State and Retry

As a user,
I want to see a clear error message when the app fails, with the option to retry,
So that I understand what went wrong and can recover without losing my work.

**Acceptance Criteria:**

**Given** `GET /api/todos` fails (network error or 5xx response),
**When** the fetch rejects,
**Then** `error` is set in `useTodos` and the `ErrorState` component is rendered with a human-readable message — no internal server details exposed

**Given** the `ErrorState` component,
**When** rendered,
**Then** it displays a retry button that re-triggers the `GET /api/todos` fetch

**Given** a failed `POST /api/todos` request,
**When** the create fails,
**Then** `error` is set in `useTodos`, `isCreating` is `false`, and the `inputText` in `AddTodoForm` is preserved (input not cleared)

**Given** a failed `PATCH /api/todos/:id` request,
**When** the toggle fails,
**Then** `error` is set, `isUpdating` returns to `null`, and the todo's visual state reverts to its pre-toggle value — no partial state corruption

**Given** a failed `DELETE /api/todos/:id` request,
**When** the delete fails,
**Then** `error` is set, `isDeleting` returns to `null`, and the todo remains in the list — no partial state corruption

**Given** the backend is completely unavailable,
**When** any operation is attempted,
**Then** the app degrades gracefully — no blank screen, no uncaught JavaScript exceptions

## Epic 4: Responsive & Accessible Experience

The app is fully usable on desktop, tablet, and mobile viewports and meets WCAG 2.1 AA accessibility standards with complete keyboard operability.

### Story 4.1: Responsive Layout

As a user,
I want the app layout to adapt cleanly to any screen size,
So that I can manage my todos on desktop, tablet, or mobile without horizontal scrolling or broken layouts.

**Acceptance Criteria:**

**Given** a desktop viewport (≥1024px),
**When** the app is rendered,
**Then** the layout uses available horizontal space effectively with no horizontal scrollbar

**Given** a tablet viewport (768px–1023px),
**When** the app is rendered,
**Then** the layout adapts correctly — todo list and form remain fully usable with no truncation

**Given** a mobile viewport (<768px),
**When** the app is rendered,
**Then** the layout is single-column, touch targets are a minimum of 44×44px, and there is no horizontal scrolling

**Given** all supported viewports,
**When** the `AddTodoForm`, `TodoList`, `TodoItem`, `EmptyState`, `LoadingState`, and `ErrorState` components are rendered,
**Then** no component overflows its container or causes a horizontal scrollbar

**Given** a mobile viewport with a todo list,
**When** the todo text is very long,
**Then** the text wraps gracefully and does not overflow its container

### Story 4.2: Keyboard Accessibility

As a user who navigates by keyboard,
I want to perform all core todo actions without using a mouse,
So that the app is fully operable via keyboard alone.

**Acceptance Criteria:**

**Given** the app is loaded,
**When** the user presses Tab,
**Then** focus moves through interactive elements (input, submit button, checkboxes, delete buttons) in a logical order

**Given** the `AddTodoForm` input is focused,
**When** the user types text and presses Enter,
**Then** the todo is submitted — identical behaviour to clicking the submit button

**Given** a todo's checkbox,
**When** focused and Space is pressed,
**Then** the completion status toggles — identical behaviour to clicking

**Given** a todo's delete button,
**When** focused and Enter or Space is pressed,
**Then** the todo is deleted — identical behaviour to clicking

**Given** the `ErrorState` retry button,
**When** focused and Enter or Space is pressed,
**Then** the retry action is triggered

**Given** any interactive element,
**When** it receives keyboard focus,
**Then** a visible focus ring is displayed (not removed via `outline: none` without a replacement)

### Story 4.3: WCAG 2.1 AA Compliance

As a user with accessibility needs,
I want the app to meet WCAG 2.1 AA standards,
So that I can use it with assistive technologies such as screen readers.

**Acceptance Criteria:**

**Given** all text content,
**When** evaluated against WCAG AA contrast ratios,
**Then** normal text has a contrast ratio of at least 4.5:1 and large text at least 3:1

**Given** active and completed todo items,
**When** both are rendered,
**Then** the visual distinction between them (strikethrough, muted colour) meets the 4.5:1 contrast requirement for the text in each state

**Given** the `AddTodoForm` input,
**When** rendered,
**Then** it has an associated `<label>` element programmatically linked via `htmlFor`/`id`

**Given** an error message displayed after a failed operation,
**When** rendered,
**Then** it is programmatically associated with its trigger (e.g. `aria-live="polite"` or `aria-describedby`) so screen readers announce it

**Given** the todo list,
**When** rendered,
**Then** it uses a semantic `<ul>` with `<li>` items so screen readers convey list structure

**Given** icon-only buttons (e.g. delete),
**When** rendered,
**Then** they have a non-empty accessible name via `aria-label`
