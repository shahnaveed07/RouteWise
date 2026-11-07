# RouteWise — Project Notebook

**Product name:** RouteWise  
**Tagline:** Smart Travel Planning  
**Project type:** BCA/MCA academic major project / full-stack web application  
**Team:** Naveed Mushtaq, Mohammad Shariq Khawaja, Nayeem  
**Planning window:** 2–3 months  
**Target cash budget:** ₹0, subject to provider limits and terms  
**Document version:** 0.7 (PERN Stack Migration Verified: React `.jsx` + `.css` & Express `.js` + PostgreSQL)  
**Last updated:** 7 November 2026  
**Project status:** Stack Migration & Phase 1 UX Shell VERIFIED; zero `.ts`, `.tsx`, `.mjs`, MongoDB, or Mongoose files  

> This is the living source of truth for the project. AI Studio must update this file after every implementation phase. A planned feature must never be recorded as implemented or verified until the code and test evidence support that status.

---

## 0. Document control and update protocol

### 0.1 Status labels

| Status | Meaning |
|---|---|
| PROPOSED | Suggested design; not yet approved or built |
| CONFIRMED | Decision approved by the project team |
| IN PROGRESS | Implementation has started |
| IMPLEMENTED | Code exists in the project files; tests may still be pending |
| VERIFIED | Acceptance criteria passed and evidence is recorded |
| BLOCKED | Cannot proceed; blocker and owner are documented |
| DEFERRED | Explicitly moved out of the current release |

### 0.2 Update rules for the AI coding agent

1. Read this notebook before making changes and inspect the actual project files before assuming the current state.
2. Work on only the phase explicitly requested by the user. Do not jump to later phases or generate the entire application at once.
3. After each phase, update this notebook in the same workspace: implementation summary, exact file paths, component registry, data flow, decisions, tests, issues and code snippets.
4. For every UI component, record **what it does, where it lives, where it is used, how it is used, and why it exists**.
5. Mark a feature IMPLEMENTED only when the corresponding source files exist. Mark it VERIFIED only after a real test/build/manual check succeeds and the command/result is recorded.
6. Never invent test results, screenshots, commits, file paths, API responses or deployment status.
7. Keep secrets, tokens, passwords, real personal data and production connection strings out of this notebook and code snippets. Use `.env.example` with placeholder values only.
8. Record significant scope or architecture changes in the Decision Register and Change Log.
9. The Markdown file in `docs/ROUTEWISE_PROJECT_NOTEBOOK.md` is the primary editable record. DOCX/PDF/PPT versions are exports for people and final academic submission; refresh exports from this file near milestones and final submission.

### 0.3 Change log

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1 | 29 Oct 2026 | Initial SRS, DRD, ERD, architecture, test and code-slot baseline. | Historical baseline |
| 0.2 | 7 Nov 2026 | Presentation visual style simplified; documentation retained. | Historical presentation update |
| 0.3 | 7 Nov 2026 | Replaced MongoDB/MERN proposal with PostgreSQL/PERN and a relational ERD; introduced Prisma as the proposed ORM; established this Markdown living notebook. | CONFIRMED direction; implementation pending |
| 0.4 | 7 Nov 2026 | Completed Phase 0 workspace inspection; verified AI Studio Cloud SQL (PostgreSQL Developer Edition) eligibility; provisioned PostgreSQL instance `ai-studio-de6d6586` and verified all 8 relational tables. | Historical Phase 0 record |
| 0.5 | 7 Nov 2026 | Conducted initial workspace audit rejecting TypeScript (`.ts`/`.tsx`). | Superseded by v0.6 |
| 0.6 | 7 Nov 2026 | Finalized PERN stack conventions (`.jsx`, `.css`, `.js`, PostgreSQL, Prisma). | Historical baseline |
| 0.7 | 7 Nov 2026 | Executed and verified complete workspace migration from `.ts`/`.tsx` to `client/src/**/*.jsx` + `.css` and `server/**/*.js` + `server/prisma/schema.prisma`. Removed all `.ts`/`.tsx` files and TypeScript packages. Verified with unit tests (`node --test`), `compile_applet`, and `lint_applet`. | VERIFIED |

---

# 1. Project overview

## 1.1 Product summary

RouteWise is a web application intended to help people organize a trip in one workspace. Users can create trips, explore destinations on a map, check destination weather, prepare day-wise itineraries, set a budget, record actual expenses and keep track of shared group costs.

**One-line description:** RouteWise helps travellers plan where to go, when to go and how to manage the cost of the journey.

## 1.2 Problem statement

Travel planning often requires switching between separate tools for maps, weather, notes and spending. The information becomes scattered, day plans are difficult to coordinate and group expenses can be hard to reconcile. RouteWise aims to bring these planning tasks together without becoming a booking or payment platform.

## 1.3 Goals

- Centralize trip details, destinations and travel dates.
- Organize destinations and activities into day-wise itineraries.
- Show selected places on a map and provide weather information where an external service is available.
- Set a planned trip budget and record actual expenses.
- Support basic group-expense sharing and show each participant's share.
- Keep the first release achievable for a three-person student team in 2–3 months.
- Use suitable free tools/services where possible; ₹0 is a target, not a guarantee of permanent free hosting.

## 1.4 Target users and roles

| User type | Responsibilities | Status |
|---|---|---|
| Trip owner | Creates a trip; manages details, itinerary, budget and members. | PROPOSED |
| Trip member | Views a shared trip and participates in expense records/splits according to permissions. | PROPOSED |
| Project maintainer | Maintains source code, database migrations, configuration, tests and releases. | CONFIRMED |

Authentication mode and the exact member-edit permissions remain to be confirmed before implementation of protected account flows.

## 1.5 Scope

### MVP in scope

- Account access (final login flow to be confirmed).
- Trip create, read, update and delete.
- Destination name and optional coordinates.
- Map view for saved locations.
- Weather lookup for a selected destination.
- Itinerary days and ordered activities.
- Trip budget, expense categories and actual expense records.
- Basic participant and expense-split records.
- Responsive desktop and mobile layouts.
- Server-side authorization and validation.

### Out of scope for the first release

- Flight, hotel or transport booking.
- Payment processing, wallets or storing card/bank details.
- Guaranteed real-time traffic or turn-by-turn navigation.
- Offline map downloads.
- AI-generated trip plans or paid partner integrations.
- Real-time collaborative editing/chat.
- Native Android/iOS applications.

**MVP path:** Create trip → add itinerary → set budget → record expense → review totals.

---

# 2. Technology decisions

## 2.1 Confirmed database direction

**Use SQL instead of MongoDB.** Confirmed database: **PostgreSQL** (provisioned via Google Cloud SQL for PostgreSQL Developer Edition with scale-to-zero free tier in this workspace).

Reason: RouteWise has naturally related records—users, trips, trip members, itinerary days, activities, expenses and participant splits. PostgreSQL provides relational constraints, foreign keys, joins and transactions that are useful for maintaining these relationships and keeping financial records consistent.

## 2.2 Final Confirmed Technology Stack (v0.6 — PERN Stack)

### Why the Previous `.ts`/`.tsx` Setup Was Incorrect
The Google AI Studio starter template initialized the workspace with TypeScript (`tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`), and Phase 0 helper files were initially written with `.ts` extensions (`src/db/*.ts`, `src/lib/*.ts`, `src/middleware/auth.ts`). That violated the team's mandatory project rules. The final confirmed stack strictly uses **`.jsx` and `.css` on the frontend** and **standard `.js` ES Modules on the backend**—with **zero `.ts`, `.tsx`, `.mjs`, MongoDB, or Mongoose**.

### Final Confirmed Stack Table

| Layer | Technology | File Extensions & Rules | Status |
|---|---|---|---|
| Frontend | React.js + JSX (Functional Components, React Hooks, React Router) | **`.jsx` ONLY** for all components, pages, layouts, and custom hooks (`client/src/`) | CONFIRMED |
| Styling | Standard CSS | **`.css` ONLY** (`client/src/styles/`) | CONFIRMED |
| Backend | Node.js + Express.js (ES Modules via `"type": "module"`, REST + JSON) | **`.js` ONLY** for controllers, routes, services, middleware, validators, config, and server entry (`server/`) | CONFIRMED |
| Database | PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`) | Relational SQL tables, UUID PKs, FKs, `NUMERIC(12,2)`, `DATE`, `TIME`, `TIMESTAMPTZ`, `UNIQUE` & `CHECK` constraints | CONFIRMED & PROVISIONED |
| Database Access & Migrations | Prisma ORM (`server/prisma/schema.prisma`) + SQL migrations & PostgreSQL transactions | Relational schema management, SQL migrations, parameterized queries, ACID transactions | CONFIRMED |
| Maps | Leaflet + OpenStreetMap | `.jsx` map view with OpenStreetMap attribution | CONFIRMED |
| Weather | Open-Meteo API | REST integration via backend `.js` service adapter | CONFIRMED |
| Routing | openrouteservice API | REST integration via backend `.js` service adapter (respecting free-tier limits) | CONFIRMED |

## 2.3 Non-Negotiable Development Principles

- **Frontend Extensions:** React components, pages, layouts, and custom hooks MUST use `.jsx`. Stylesheets MUST use `.css`.
- **Backend Extensions:** Controllers, routes, services, middleware, validators, configuration, and server entry point MUST use `.js` with ES Modules (`import`/`export` enabled via `"type": "module"` in `package.json`).
- **Strictly Forbidden:** TypeScript, TSX, `.ts`, `.tsx`, `.mjs`, MongoDB, Mongoose, and any NoSQL database architecture.
- **Database Security:** Never connect to PostgreSQL from browser code; keep all database credentials and API keys in server-side environment variables.
- **Monetary & Date Precision:** Use PostgreSQL `NUMERIC(12,2)` for money (no floating-point currency math), `DATE` for travel calendar dates, `TIME` for local activity times, and `TIMESTAMPTZ` for UTC audit timestamps.

---

# 3. SRS — Software Requirements Specification

## 3.1 Purpose

This section defines functional and non-functional requirements for the RouteWise MVP. IDs remain stable so that each requirement can be linked to implementation files and test cases.

## 3.2 Functional requirements

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-01 | Account access | High | A user can access only their own or explicitly shared trips; login method is finalized before auth implementation. | PROPOSED |
| FR-02 | Create trip | High | Valid title, destination and travel dates create one trip record. | PROPOSED |
| FR-03 | Edit trip | High | Owner can update trip details; invalid date range is rejected. | PROPOSED |
| FR-04 | List trips | High | User sees trips they own or are authorized to access. | PROPOSED |
| FR-05 | Delete trip | Medium | Authorized owner can delete a trip after confirmation; dependent records follow documented cascade policy. | PROPOSED |
| FR-06 | Add trip members | Medium | Owner can add permitted members; duplicate membership is rejected by a unique constraint. | PROPOSED |
| FR-07 | Destination coordinates | High | Trip or itinerary location can store latitude/longitude; values are validated and paired. | PROPOSED |
| FR-08 | Map view | High | Saved locations with valid coordinates can be displayed on the map. | PROPOSED |
| FR-09 | Weather lookup | High | User can request weather for a selected location when the chosen provider supports it. | PROPOSED |
| FR-10 | Provider failure handling | High | If a provider times out, fails or reaches quota, show a useful message; saved trip data remains usable. | PROPOSED |
| FR-11 | Create itinerary day | High | A trip can have days within its date range; trip/day uniqueness is maintained. | PROPOSED |
| FR-12 | Manage itinerary activity | High | Authorized user can add, edit, remove and reorder activities for a day. | PROPOSED |
| FR-13 | Set budget | High | Owner can save a non-negative planned budget and trip currency. | PROPOSED |
| FR-14 | Record expense | High | Authorized user can record title, positive amount, category, date and payer. | PROPOSED |
| FR-15 | Calculate totals | High | Total spent and remaining budget are derived consistently from persisted expenses. | PROPOSED |
| FR-16 | Split expense | Medium | An expense can be split among eligible trip participants; split total must equal expense total. | PROPOSED |
| FR-17 | Edit/delete expense | High | Authorized user can update/delete an expense and its splits; totals recalculate correctly. | PROPOSED |
| FR-18 | Currency handling | Medium | MVP uses one currency per trip, with INR as the proposed default; conversion is out of scope. | PROPOSED |
| FR-19 | Empty/loading/error states | High | Lists, forms, maps and weather show clear feedback for each state. | PROPOSED |

## 3.3 Non-functional requirements

| ID | Quality | Requirement / acceptance target | Status |
|---|---|---|---|
| NFR-01 | Usability | Main trip workflow is understandable without training; labels and validation messages are clear. | PROPOSED |
| NFR-02 | Responsive UI | Core screens work at mobile, tablet and desktop widths without clipped actions. | PROPOSED |
| NFR-03 | Performance | Common operations are measured with representative test data; no performance claim without evidence. | PROPOSED |
| NFR-04 | Reliability | API failures must not erase already saved local/database data; external services fail independently. | PROPOSED |
| NFR-05 | Security | Server validates input and checks authorization on every private operation; passwords are never stored in plaintext. | PROPOSED |
| NFR-06 | Data integrity | Foreign keys, uniqueness, check constraints and transactions protect relational consistency. | PROPOSED |
| NFR-07 | Maintainability | Separate pages/components, routes/controllers, services, database access and provider adapters. | PROPOSED |
| NFR-08 | Accessibility | Readable contrast, keyboard focus, labels and semantic controls are used where practical. | PROPOSED |
| NFR-09 | Compatibility | Verify latest Chrome plus at least one additional browser/device size before release. | PROPOSED |
| NFR-10 | Cost | Target ₹0 using lawful free tools/tiers; re-check quotas, terms and limits before deployment. | PROPOSED |

## 3.4 Core acceptance scenario

1. User creates a trip with a valid date range.
2. User adds at least one itinerary day and activity.
3. User sets a planned budget.
4. User records an expense of ₹500.
5. Dashboard/expense view shows the total increased by exactly ₹500 and remaining budget reduced by exactly ₹500.
6. An invalid date range, negative amount or unauthorized trip access is rejected with a safe, understandable response.
7. A weather/map provider outage does not disable trip, itinerary or expense records.

---

# 4. DRD — Design Requirements Document

## 4.1 Design direction

- Clean, conventional, readable interface with a travel-focused layout.
- Use a restrained neutral palette; the academic presentation itself must remain simple and non-vibrant.
- Keep primary actions visible and avoid unnecessary dashboard decoration.
- Distinguish planned budget, actual spending and remaining balance clearly.
- Treat map and weather as supporting panels, not blockers for trip management.
- Use consistent spacing, typography, field labels, button hierarchy and feedback.
- Ask for confirmation before destructive actions.

## 4.2 Proposed navigation and screen inventory

| Screen / route | Main purpose | Core components | Status |
|---|---|---|---|
| `/login` and `/register` | Account access, subject to auth decision | AuthForm, FormField, Alert | PROPOSED |
| `/dashboard` | Overview, upcoming trips and summary | AppShell, PageHeader, TripCard, BudgetSummary, EmptyState | PROPOSED |
| `/trips/new` | Create a trip | TripForm, DateRangeField, FormActions | PROPOSED |
| `/trips/:tripId` | Trip overview | TripHeader, TripOverview, WeatherCard, BudgetSummary | PROPOSED |
| `/trips/:tripId/itinerary` | Day-wise trip plan | ItineraryDayCard, ItineraryItem, ActivityForm, SortControls | PROPOSED |
| `/trips/:tripId/map` | View saved destinations | MapView, MapMarker, PlaceDetailsPanel | PROPOSED |
| `/trips/:tripId/expenses` | Actual spending and splits | ExpenseSummary, ExpenseList, ExpenseForm, SplitBreakdown | PROPOSED |
| `/trips/:tripId/members` | Participants and roles | MemberList, MemberForm, RoleBadge | PROPOSED |
| Settings / profile | Account preferences, if in scope | ProfileForm, CurrencyPreference | TO CONFIRM |

## 4.3 Common UI states and behaviours

- Every form has visible labels, required-field rules, field-level errors and submit feedback.
- Disable repeated submit while a request is in progress.
- Lists must support loading, empty, success and error states.
- Destructive actions require confirmation and clear feedback after completion.
- Map/weather errors must not prevent access to stored trip information.
- Monetary values use the trip currency and consistent decimal formatting.
- On narrow screens, cards and forms stack; map controls remain usable.

## 4.4 Component registry — update during implementation

| Component | Exact `.jsx` path | Responsibility / where used | Props & Data Flow | Why it exists | Status |
|---|---|---|---|---|---|
| `AppShell` | `client/src/layouts/AppShell.jsx` | Shared page frame, sticky navigation bar, active traveller selector, and `<Outlet />`; used in `client/src/App.jsx`. | Consumes `useAuth()` from `AuthContext.jsx`. | Prevents duplicated layout and keeps navigation consistent across all routes. | VERIFIED (`TC-00`) |
| `PageHeader` | `client/src/components/PageHeader.jsx` | Page title, subtitle and primary action slot; imported by `DashboardPage.jsx` and `NewTripPage.jsx`. | Props: `{ title, subtitle, actions }`. | Standardizes page hierarchy and action placement. | VERIFIED (`TC-00`) |
| `EmptyState` | `client/src/components/EmptyState.jsx` | Guides user when a list has no records; imported by `DashboardPage.jsx`. | Props: `{ title, message, action }`. | Prevents blank/unexplained screens. | VERIFIED (`TC-00`) |
| `LoadingState` | `client/src/components/LoadingState.jsx` | Indicates ongoing asynchronous operations (`role="status"`). | Props: `{ message }`. | Gives consistent asynchronous feedback. | IMPLEMENTED |
| `ErrorState` | `client/src/components/ErrorState.jsx` | Explains recoverable failures (`role="alert"`) with retry button. | Props: `{ title, message, onRetry }`. | Avoids silent failures and raw stack traces. | IMPLEMENTED |
| `ConfirmDialog` | `client/src/components/ConfirmDialog.jsx` | Modal dialog (`role="dialog"`, `aria-modal="true"`) confirming destructive actions. | Props: `{ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }`. | Reduces accidental deletion. | IMPLEMENTED |
| `TripCard` | `client/src/components/TripCard.jsx` | Shows a trip summary on dashboard/trip lists. | Planned for Phase 2 Trip CRUD. | Reusable trip preview with consistent navigation. | PROPOSED |
| `TripForm` | `client/src/components/TripForm.jsx` | Creates/edits trip details. | Planned for Phase 2 Trip CRUD. | Shares field validation and submit logic. | PROPOSED |
| `BudgetSummary` | `client/src/components/BudgetSummary.jsx` | Shows planned, spent and remaining amounts. | Planned for Phase 4 Budget & Expenses. | Keeps money calculations and formatting consistent. | PROPOSED |
| `ItineraryDayCard` | `client/src/components/ItineraryDayCard.jsx` | Groups activities for one date. | Planned for Phase 3 Itinerary. | Mirrors the user's day-wise planning model. | PROPOSED |
| `ItineraryItem` | `client/src/components/ItineraryItem.jsx` | Shows one scheduled activity/place. | Planned for Phase 3 Itinerary. | Supports ordering and editing at activity level. | PROPOSED |
| `ActivityForm` | `client/src/components/ActivityForm.jsx` | Adds/edits an itinerary item. | Planned for Phase 3 Itinerary. | Keeps activity validation reusable. | PROPOSED |
| `MapView` | `client/src/components/MapView.jsx` | Displays coordinates and markers using Leaflet + OpenStreetMap. | Planned for Phase 5 Maps & Weather. | Isolates map library/provider-specific UI. | PROPOSED |
| `WeatherCard` | `client/src/components/WeatherCard.jsx` | Displays destination forecast/status via Open-Meteo adapter. | Planned for Phase 5 Maps & Weather. | Separates external weather states from trip screens. | PROPOSED |
| `ExpenseForm` | `client/src/components/ExpenseForm.jsx` | Records title, amount, payer, category and optional splits. | Planned for Phase 4 Budget & Expenses. | Centralizes expense input and validation. | PROPOSED |
| `ExpenseList` | `client/src/components/ExpenseList.jsx` | Displays trip expenses. | Planned for Phase 4 Budget & Expenses. | Reusable list with edit/delete affordances. | PROPOSED |
| `SplitBreakdown` | `client/src/components/SplitBreakdown.jsx` | Shows participant shares and settlement status. | Planned for Phase 4 Budget & Expenses. | Makes group cost allocation understandable. | PROPOSED |

---

# 5. ERD — Entity Relationship Diagram and relational model

## 5.1 Database decision

- Database: PostgreSQL (Cloud SQL Developer Edition).
- ORM/migration tooling: Drizzle ORM (`drizzle-orm`) + Drizzle Kit (`drizzle-kit`) + `pg` Pool (confirmed compatible with AI Studio Cloud SQL in Phase 0).
- Primary keys: UUID (`uuid().defaultRandom().primaryKey()`).
- Foreign keys: enforce parent/child relationships in PostgreSQL.
- Money: `NUMERIC(12,2)` (`numeric({ precision: 12, scale: 2 })`).
- Dates: `DATE` for trip/day calendar dates; `TIME` for local itinerary times; timestamps use `TIMESTAMPTZ` stored in UTC.

## 5.2 Core entities and relationships

```text
users (1) -------- (M) trips
  |                         |
  |                         +---- (1:M) trip_members (M:1) users
  |                         |
  |                         +---- (1:M) itinerary_days
  |                                      |
  |                                      +---- (1:M) itinerary_items
  |                                                    |
  |                                                    +---- (M:1) places (optional)
  |
  +---- (1:M) expenses as payer/creator
trips (1) -------- (M) expenses
expenses (1) ----- (M) expense_splits (M:1) users
```

## 5.3 Proposed tables and columns

### `users`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key, generated UUID |
| `uid` | VARCHAR(128) | Optional unique external/Firebase Auth UID when OAuth is enabled |
| `full_name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, unique, normalized lowercase |
| `password_hash` | VARCHAR(255) | Optional; used only if password auth is approved; never plaintext |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL, maintained by application/database |

### `trips`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key |
| `owner_user_id` | UUID | NOT NULL, FK → `users.id` |
| `title` | VARCHAR(150) | NOT NULL |
| `destination_name` | VARCHAR(180) | NOT NULL |
| `description` | TEXT | Optional |
| `start_date`, `end_date` | DATE | NOT NULL; `end_date >= start_date` |
| `currency` | CHAR(3) | NOT NULL; default `INR` |
| `planned_budget` | NUMERIC(12,2) | NOT NULL; CHECK >= 0 |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL |

### `trip_members`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key |
| `trip_id` | UUID | NOT NULL, FK → `trips.id` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL, FK → `users.id` |
| `role` | VARCHAR(20) | NOT NULL; proposed values `member`, `viewer` |
| `membership_status` | VARCHAR(20) | NOT NULL; proposed values `pending`, `active` |
| `joined_at` | TIMESTAMPTZ | Optional/managed by application |
| Constraint | — | UNIQUE (`trip_id`, `user_id`) |

### `itinerary_days`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key |
| `trip_id` | UUID | NOT NULL, FK → `trips.id` ON DELETE CASCADE |
| `day_date` | DATE | NOT NULL |
| `day_order` | INTEGER | NOT NULL, CHECK >= 1 |
| `notes` | TEXT | Optional |
| Constraint | — | UNIQUE (`trip_id`, `day_date`); UNIQUE (`trip_id`, `day_order`) |

### `places`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key |
| `provider` | VARCHAR(40) | Optional provider key/name |
| `provider_place_id` | VARCHAR(180) | Optional external place ID |
| `name` | VARCHAR(180) | NOT NULL |
| `address` | TEXT | Optional |
| `latitude`, `longitude` | NUMERIC(9,6) | Optional; validate as a pair and geographic range |
| Constraint | — | Optional unique (`provider`, `provider_place_id`) when supplied |

### `itinerary_items`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key |
| `itinerary_day_id` | UUID | NOT NULL, FK → `itinerary_days.id` ON DELETE CASCADE |
| `place_id` | UUID | Optional FK → `places.id` |
| `title` | VARCHAR(180) | NOT NULL |
| `description` | TEXT | Optional |
| `start_time`, `end_time` | TIME | Optional; end should follow start when both exist |
| `estimated_cost` | NUMERIC(12,2) | NOT NULL default 0; CHECK >= 0 |
| `sort_order` | INTEGER | NOT NULL, CHECK >= 1 |
| Constraint | — | UNIQUE (`itinerary_day_id`, `sort_order`) |

### `expenses`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key |
| `trip_id` | UUID | NOT NULL, FK → `trips.id` ON DELETE CASCADE |
| `paid_by_user_id` | UUID | NOT NULL, FK → `users.id` |
| `created_by_user_id` | UUID | NOT NULL, FK → `users.id` |
| `title` | VARCHAR(180) | NOT NULL |
| `amount` | NUMERIC(12,2) | NOT NULL, CHECK > 0 |
| `category` | VARCHAR(50) | NOT NULL |
| `expense_date` | DATE | NOT NULL |
| `notes` | TEXT | Optional |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL |

### `expense_splits`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key |
| `expense_id` | UUID | NOT NULL, FK → `expenses.id` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL, FK → `users.id` |
| `share_amount` | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| `is_settled` | BOOLEAN | NOT NULL default FALSE |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL |
| Constraint | — | UNIQUE (`expense_id`, `user_id`) |

## 5.4 Database migration log

| Migration name | Date | Tables / columns / constraints | Reason | Test result | Status |
|---|---|---|---|---|---|
| `cloudsql.UpdateSchema` (Initial relational baseline from `src/db/schema.ts` via `src/db/drizzle.config.ts`) | 2026-11-07 | Created 8 PostgreSQL tables: `users`, `trips`, `trip_members`, `itinerary_days`, `places`, `itinerary_items`, `expenses`, `expense_splits` with `UUID` PKs (`gen_random_uuid()`), FKs (`ON DELETE CASCADE` / `SET NULL`), `NUMERIC(12,2)`, `DATE`, `TIME`, `TIMESTAMPTZ`, `UNIQUE` & `CHECK` constraints, and `idx_trips_owner_updated` / `idx_expenses_trip_date` indexes. | Provision core relational schema on Cloud SQL PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`). | Verified all 8 tables and 62 columns via `information_schema.columns` query (`0.0118s`). | VERIFIED |

---

# 6. Architectural design

## 6.1 High-level architecture

```text
Browser / Mobile Browser
        |
        v
React 19 + JSX + React Router + CSS (client/src/pages, client/src/components, client/src/layouts)
        |
        | HTTPS + JSON (REST /api/*)
        v
Node.js + Express API (server/server.js + server/src/* in standard .js ES Modules)
Routes -> Controllers -> Validators -> Services -> Authorization
        |
        v
Prisma Schema (server/prisma/schema.prisma) + PostgreSQL Pool & Transactions (server/src/config/db.js)
        |
        v
PostgreSQL database (Cloud SQL Developer Edition: ai-studio-de6d6586)
Users / Trips / Members / Itinerary / Places / Expenses / Splits
```

## 6.2 Actual workspace structure after `.jsx` / `.js` migration

```text
/
  .env.example                  # Documented GEMINI_API_KEY, APP_URL, and SQL_* placeholders (no secrets)
  .gitignore                    # Excludes node_modules, dist, .env* (except !.env.example)
  firebase-applet-config.json   # Provisioned Firebase / Google OAuth client configuration
  index.html                    # HTML entry point loading /client/src/main.jsx
  metadata.json                 # App metadata (RouteWise name & description)
  package.json                  # Pure JS/JSX PERN dependencies ("type": "module", zero TypeScript packages)
  vite.config.js                # Standard ES Module Vite config resolving @ to ./client/src
  client/
    src/
      components/
        ConfirmDialog.jsx
        EmptyState.jsx
        ErrorState.jsx
        LoadingState.jsx
        PageHeader.jsx
      context/
        AuthContext.jsx
      layouts/
        AppShell.jsx
      pages/
        DashboardPage.jsx
        NewTripPage.jsx
      styles/
        index.css
      App.jsx
      main.jsx
  server/
    prisma/
      schema.prisma             # 8-table PostgreSQL Prisma schema
    src/
      config/
        db.js                   # PostgreSQL pg.Pool + parameterized query & withTransaction helpers
        firebase-admin.js       # Firebase Admin token verification setup
      controllers/
        healthController.js     # GET /api/health controller
      middleware/
        auth.js                 # Express requireAuth Bearer token verification middleware
      routes/
        healthRoutes.js         # /api/health router
      services/
        userService.js          # Idempotent PostgreSQL user upsert service
      app.js                    # Express app configuration & centralized error handler
    tests/
      stack.test.js             # Automated Node test verifying health endpoint & .jsx/.js structure
    server.js                   # Express + Vite server entry point on port 3000
  docs/
    ROUTEWISE_PROJECT_NOTEBOOK.md
```

---

# 7. Testing and quality plan

## 7.1 Test register

| Test ID | Requirement | Scenario | Command | Expected result | Actual result / evidence | Status |
|---|---|---|---|---|---|---|
| TC-00 | NFR-06, NFR-07 | PERN `.jsx`/`.js` stack check, `/api/health` unit test, Vite build & PostgreSQL schema check | `node --test server/tests/stack.test.js`, `lint_applet`, `compile_applet` | 2/2 unit tests pass; 0 `.ts`/`.tsx`/`.mjs` files; clean Vite build; 8 PostgreSQL tables verified. | `pass 2, fail 0` (`167ms`); `compile_applet` & `lint_applet` PASS; `find` confirmed 0 `.ts`/`.tsx`/`.mjs` files. | VERIFIED |
| TC-01 | FR-02 | Create trip with valid values | Pending Phase 2 | One trip is persisted and returned. | Pending | NOT RUN |
| TC-02 | FR-03 | End date earlier than start date | Pending Phase 2 | Validation error; no invalid row saved. | Pending | NOT RUN |
| TC-03 | FR-08 | Trip has coordinates | Pending Phase 5 | Map displays a marker; fallback shown if provider fails. | Pending | NOT RUN |
| TC-04 | FR-11 | Add itinerary day outside trip dates | Pending Phase 3 | Rejected or handled according to approved rule. | Pending | NOT RUN |
| TC-05 | FR-14 | Add expense of ₹500 | Pending Phase 4 | Exactly ₹500 is persisted once. | Pending | NOT RUN |
| TC-06 | FR-16 | Split ₹500 among participants | Pending Phase 4 | Split shares total exactly ₹500. | Pending | NOT RUN |
| TC-07 | NFR-05 | User requests another user's private trip | Pending Phase 2 | API returns forbidden/not found according to security design. | Pending | NOT RUN |
| TC-08 | FR-10 | Weather provider is unavailable | Pending Phase 5 | Saved trip data remains usable and safe fallback appears. | Pending | NOT RUN |

---

# 8. Code snippet and component evidence library

| Snippet ID | Planned example | Path | Status |
|---|---|---|---|
| CS-01 | Shared React app shell and route configuration | `client/src/App.jsx`, `client/src/layouts/AppShell.jsx` | VERIFIED |
| CS-02 | TripForm with validation and API call | `client/src/components/TripForm.jsx` | PLACEHOLDER (Phase 2) |
| CS-03 | Express trip route/controller/service | `server/src/routes/tripRoutes.js`, `server/src/services/tripService.js` | PLACEHOLDER (Phase 2) |
| CS-04 | Prisma PostgreSQL schema & transactional `db.js` pool | `server/prisma/schema.prisma`, `server/src/config/db.js` | VERIFIED |
| CS-05 | Expense creation transaction and split validation | `server/src/services/expenseService.js` | PLACEHOLDER (Phase 4) |
| CS-06 | Weather provider adapter and failure handling | `server/src/services/weatherService.js` | PLACEHOLDER (Phase 5) |
| CS-07 | Unit/API test for expense split total | `server/tests/` | PLACEHOLDER (Phase 4) |

### CS-01 — Shared React JSX App Shell & Router (`client/src/App.jsx`)
- **Related IDs:** `ADR-005`, `NFR-02`, `NFR-07`
- **Exact File Path & Symbol:** `/client/src/App.jsx` (`App`)
- **Purpose & Explanation:** Configures client-side routing with `react-router-dom` inside `AuthProvider` and `AppShell.jsx` using pure `.jsx` functional components.
- **Verification:** `compile_applet` & `node --test server/tests/stack.test.js` (`TC-00`, 2026-11-07, PASS).

```jsx
// Excerpt from /client/src/App.jsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppShell from './layouts/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NewTripPage from './pages/NewTripPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trips/new" element={<NewTripPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### CS-04 — Prisma PostgreSQL Schema & Transactional Connection Pool (`server/prisma/schema.prisma`, `server/src/config/db.js`)
- **Related IDs:** `ADR-001`, `ADR-002`, `ADR-003`, `NFR-06`
- **Exact File Paths & Symbols:** `/server/prisma/schema.prisma` (`Trip`) and `/server/src/config/db.js` (`query`, `withTransaction`)
- **Purpose & Explanation:** Models the PostgreSQL schema in Prisma (`@db.Uuid`, `@db.Decimal(12, 2)`, `@db.Date`, `@db.Timestamptz(6)`) and executes parameterized SQL queries and ACID transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) in standard `.js` ES Modules.
- **Verification:** `node --test server/tests/stack.test.js` & `lint_applet` (`TC-00`, 2026-11-07, PASS).

```javascript
// Excerpt from /server/src/config/db.js
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}
```

---

# 9. Phased implementation plan for AI Studio

| Phase | Work package | Completion gate | Status |
|---|---|---|---|
| 0 | Inspect workspace/repository; confirm PERN `.jsx`/`.js` stack, provision Cloud SQL PostgreSQL & verify schema, establish notebook. | Zero `.ts`/`.tsx`/`.mjs` files; PostgreSQL provisioned & verified. | VERIFIED |
| 1 | Build application shell (`AppShell.jsx`), navigation, CSS design tokens (`index.css`), and page placeholders with reusable feedback components. | All routes render; unit & build checks pass; notebook/component registry updated. | VERIFIED |
| 2 | Set up Express trip CRUD API (`/api/trips`), PostgreSQL persistence, validation, and frontend `TripForm.jsx` / `TripCard.jsx` integration. | Trip CRUD tests pass against PostgreSQL. | PROPOSED (Next) |
| 3 | Implement itinerary days/items and ordering. | Date, ownership and ordering tests pass. | PROPOSED |
| 4 | Implement budget, expenses and split transactions. | Decimal-safe totals and split reconciliation tests pass. | PROPOSED |
| 5 | Add map/place (`Leaflet` + `OpenStreetMap`), routing (`openrouteservice`), and weather (`Open-Meteo`) integrations with fallback states. | Attribution/terms checked; provider failure does not break core app. | PROPOSED |
| 6 | Security, responsive polish, accessibility, regression tests and deployment preparation. | Release checklist and evidence complete. | PROPOSED |

---

# 10. Decision register

| ID | Decision | Current choice | Status / rationale |
|---|---|---|---|
| ADR-001 | Database type | SQL instead of MongoDB | CONFIRMED by user on 7 Nov 2026. Zero MongoDB/Mongoose. |
| ADR-002 | SQL database | PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1` via Cloud SQL Developer Edition) | VERIFIED in Phase 0. |
| ADR-003 | ORM/migrations | Prisma ORM (`server/prisma/schema.prisma`) + SQL migrations & parameterized PostgreSQL execution (`server/src/config/db.js`) | VERIFIED in v0.7. |
| ADR-004 | Stack naming | PERN Stack (PostgreSQL, Express.js, React.js, Node.js) | CONFIRMED. |
| ADR-005 | File Extension Rules | **Frontend:** `.jsx` and `.css` ONLY (`client/src/`). **Backend:** standard `.js` with ES Modules (`server/`). **Forbidden:** `.ts`, `.tsx`, `.mjs`. | VERIFIED in v0.7 (0 `.ts`/`.tsx`/`.mjs` files exist in repository). |
| ADR-006 | Authentication | Firebase Auth (Google Sign-In) + Demo Traveller Switcher in `AuthContext.jsx` | IMPLEMENTED in `client/src/context/AuthContext.jsx`. |
| ADR-007 | Member editing permissions | `owner` (full control), `member` (edit itinerary & expenses), `viewer` (read-only) | CONFIRMED baseline for Phase 2/3 backend enforcement. |
| ADR-008 | Map & Routing providers | Maps: Leaflet + OpenStreetMap; Routing: openrouteservice API | CONFIRMED for Phase 5. |
| ADR-009 | Weather provider | Open-Meteo API via backend `.js` REST adapter | CONFIRMED for Phase 5. |
| ADR-010 | Hosting | Google Cloud Run / AI Studio Applet with Cloud SQL scale-to-zero | CONFIRMED baseline (`asia-southeast1`). |

---

# 11. Implementation log — append after every AI Studio phase

### Technology Stack Migration & Phase 1 UX Foundation (`.jsx` + `.css` + `.js` + PostgreSQL)

- **Date:** 2026-11-07
- **Phase:** Stack Migration + P1 Foundation
- **Status:** VERIFIED
- **Objective:** Execute the approved migration from `.ts`/`.tsx` to strict React `.jsx` + `.css` in `client/src/` and Node.js + Express `.js` ES Modules + `server/prisma/schema.prisma` in `server/`, remove all TypeScript files and packages, and verify build, lint, and unit tests.
- **Files created:**
  - `/vite.config.js`
  - `/server/prisma/schema.prisma`
  - `/server/server.js`
  - `/server/src/app.js`
  - `/server/src/config/db.js`
  - `/server/src/config/firebase-admin.js`
  - `/server/src/middleware/auth.js`
  - `/server/src/services/userService.js`
  - `/server/src/controllers/healthController.js`
  - `/server/src/routes/healthRoutes.js`
  - `/server/tests/stack.test.js`
  - `/client/src/main.jsx`
  - `/client/src/App.jsx`
  - `/client/src/styles/index.css`
  - `/client/src/context/AuthContext.jsx`
  - `/client/src/layouts/AppShell.jsx`
  - `/client/src/components/PageHeader.jsx`
  - `/client/src/components/EmptyState.jsx`
  - `/client/src/components/LoadingState.jsx`
  - `/client/src/components/ErrorState.jsx`
  - `/client/src/components/ConfirmDialog.jsx`
  - `/client/src/pages/DashboardPage.jsx`
  - `/client/src/pages/NewTripPage.jsx`
- **Files modified:**
  - `/index.html` (updated script entry to `/client/src/main.jsx`)
  - `/package.json` (installed `react-router-dom`; removed `typescript`, `tsx`, `@types/*`, `tailwindcss`, `@tailwindcss/vite`; configured `.js` server scripts)
  - `/docs/ROUTEWISE_PROJECT_NOTEBOOK.md`
- **Files deleted:**
  - `/src/*` (all legacy `.ts` and `.tsx` files)
  - `/vite.config.ts`
  - `/tsconfig.json`
- **Tests run:**
  - `find . -maxdepth 4 -not -path './node_modules*' -not -path './.git*' \( -name '*.ts' -o -name '*.tsx' -o -name '*.mjs' \)` — Expected: 0 files; Actual: 0 files (PASS).
  - `node --test server/tests/stack.test.js` — Expected: 2/2 pass; Actual: 2/2 pass in `167ms` (PASS).
  - `compile_applet` (`vite build`) & `lint_applet` (`npm run lint`) — Expected: 0 errors; Actual: PASS.
- **Next approved step:** Await user instruction to proceed to **Phase 2 — Backend PostgreSQL Trip CRUD (`/api/trips`) & Frontend Trip Management (`TripForm.jsx`, `TripCard.jsx`, `TripDetailsPage.jsx`)**.

### Phase 0 (Part B) — Cloud SQL PostgreSQL Provisioning & Schema Verification

- **Date:** 2026-11-07
- **Phase:** P0 (Database & Auth Foundation Provisioning)
- **Status:** VERIFIED
- **Objective:** Complete Cloud SQL for PostgreSQL instance provisioning in `asia-southeast1` after user confirmation, configure Firebase OAuth & relational schema, and verify live database metadata via `information_schema.columns`.
- **Database changes:** Provisioned Cloud SQL PostgreSQL instance `ai-studio-de6d6586` in `asia-southeast1` and verified all 8 relational tables (`users`, `trips`, `trip_members`, `itinerary_days`, `places`, `itinerary_items`, `expenses`, `expense_splits`) and 62 columns in `information_schema.columns`.

### Phase 0 (Part A) — Workspace Inspection & Setup Plan

- **Date:** 2026-11-07
- **Phase:** P0
- **Status:** VERIFIED
- **Objective:** Inspect actual workspace files, verify build/lint health, check PostgreSQL compatibility, establish `docs/ROUTEWISE_PROJECT_NOTEBOOK.md`, update `metadata.json` and `index.html`.

---

# 12. Final submission checklist

- [ ] Final source code and repository structure match this notebook.
- [ ] SRS requirement statuses are backed by working screens/endpoints.
- [ ] DRD screen inventory and component registry contain real paths and explanations.
- [ ] ERD matches the actual SQL schema and PostgreSQL migrations.
- [ ] Architecture diagram matches actual runtime/deployment flow.
- [ ] Code snippet library contains short, actual, reviewed excerpts.
- [ ] Test register contains commands, outcomes and evidence—not just planned tests.
- [ ] Known limitations and future scope are stated honestly.
- [ ] No secrets or real private user data appear in submitted documentation.
- [ ] Final DOCX/PDF/PPT exports are generated from the latest Markdown notebook.
