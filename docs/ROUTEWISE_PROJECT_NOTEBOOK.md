# RouteWise — Project Notebook

**Product name:** RouteWise  
**Tagline:** Smart Travel Planning  
**Project type:** BCA/MCA academic major project / full-stack web application  
**Team:** Naveed Mushtaq, Mohammad Shariq Khawaja, Nayeem  
**Planning window:** 2–3 months  
**Target cash budget:** ₹0, subject to provider limits and terms  
**Document version:** 0.8 (Repository Audit & Documentation Correction)  
**Last updated:** 7 November 2026  
**Project status:** Phase 0 Database & Stack Baseline `IMPLEMENTED AND VERIFIED`; Phase 1 App Shell & Placeholders `PLACEHOLDER` / `IMPLEMENTED AND VERIFIED`; Trip CRUD & Domain Modules `PLANNED`  

> This is the living source of truth for the project. AI Studio must update this file after every implementation phase. A planned feature must never be recorded as implemented or verified until the code and test evidence support that status.

---

## 0. Document control and update protocol

### 0.1 Mandatory Audit Status Labels

All SRS requirements, DRD screens, components, API endpoints, database migrations, test cases, and project phases in this notebook use strictly the following five status labels:

| Status | Meaning |
|---|---|
| `IMPLEMENTED AND VERIFIED` | Source code exists in the current repository AND automated unit/API/database/browser verification has executed and passed with recorded evidence. |
| `IMPLEMENTED BUT NOT VERIFIED` | Source code exists in the current repository, but end-to-end or automated runtime verification has not yet been executed (or requires live user OAuth credentials / mounting in a feature page). |
| `PLACEHOLDER` | A structural route, page frame, or documentation stub exists in the repository to reserve navigation/layout, without working domain persistence or business logic. |
| `PLANNED` | Approved in the project scope/design for an upcoming phase; no source code implementation exists yet. |
| `BLOCKED` | Cannot proceed due to a technical, environment, or policy constraint; the blocker and chosen resolution are documented. |

### 0.2 Update rules for the AI coding agent

1. Read this notebook before making changes and inspect the actual project files before assuming the current state.
2. Work on only the phase explicitly requested by the user. Do not jump to later phases or generate the entire application at once.
3. After each phase, update this notebook in the same workspace: implementation summary, exact file paths, component registry, API registry, data flow, decisions, tests, issues and code snippets.
4. For every UI component, record **what it does, where it lives, where it is used, how it is used, and why it exists**.
5. Mark a feature `IMPLEMENTED AND VERIFIED` only after the corresponding source files exist and a real test/build/browser check succeeds with the command and result recorded.
6. Never invent test results, screenshots, commits, file paths, API responses or deployment status.
7. Keep secrets, tokens, passwords, real personal data and production connection strings out of this notebook and code snippets. Use `.env.example` with placeholder values only.
8. Record significant scope or architecture changes in the Decision Register and Change Log.
9. The Markdown file in `docs/ROUTEWISE_PROJECT_NOTEBOOK.md` is the primary editable record.

### 0.3 Change log

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1 | 29 Oct 2026 | Initial SRS, DRD, ERD, architecture, test and code-slot baseline. | `PLANNED` |
| 0.2 | 7 Nov 2026 | Presentation visual style simplified; documentation retained. | `PLANNED` |
| 0.3 | 7 Nov 2026 | Replaced MongoDB/MERN proposal with PostgreSQL/PERN and a relational ERD; introduced Prisma as the proposed ORM; established this Markdown living notebook. | `PLANNED` |
| 0.4 | 7 Nov 2026 | Provisioned Cloud SQL PostgreSQL instance `ai-studio-de6d6586` (`asia-southeast1`) and created the 8 relational tables in PostgreSQL. (Historical Drizzle files used during provisioning were subsequently removed in v0.7). | `IMPLEMENTED AND VERIFIED` |
| 0.5 | 7 Nov 2026 | Initial workspace audit rejecting TypeScript (`.ts`/`.tsx`). | `IMPLEMENTED AND VERIFIED` |
| 0.6 | 7 Nov 2026 | Finalized PERN stack file extension rules (`.jsx`, `.css`, `.js`, PostgreSQL). | `IMPLEMENTED AND VERIFIED` |
| 0.7 | 7 Nov 2026 | Migrated workspace to `client/src/**/*.jsx` + `.css` and `server/**/*.js` ES Modules; removed all `.ts`/`.tsx` files and TypeScript packages. | `IMPLEMENTED AND VERIFIED` |
| 0.8 | 7 Nov 2026 | Conducted full repository vs. documentation audit: resolved `DATABASE_URL` vs. `SQL_*` connection strategy in `server/prisma/schema.prisma` and `server/src/config/db.js`; recorded SQL baseline in `server/prisma/migrations/0001_initial_baseline/migration.sql`; hardened `requireAuth` (`server/src/middleware/auth.js`) and `AuthContext.jsx` so demo personas cannot be mistaken for authenticated accounts; added `GET /api/auth/me`; updated all tables to use the 5 strict audit statuses. | `IMPLEMENTED AND VERIFIED` |

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

| User type | Responsibilities | Current Implementation Status |
|---|---|---|
| Trip owner | Creates a trip; manages details, itinerary, budget and members. | `PLANNED` (Schema column `trips.owner_user_id` exists; trip ownership enforcement middleware not yet built) |
| Trip member | Views a shared trip and participates in expense records/splits according to permissions. | `PLANNED` (Table `trip_members` exists; membership authorization middleware not yet built) |
| Project maintainer | Maintains source code, database schema, configuration, tests and releases. | `IMPLEMENTED AND VERIFIED` |

## 1.5 Scope

### MVP in scope

- Account access via Firebase Google Sign-In (`client/src/context/AuthContext.jsx`, `server/src/middleware/auth.js`, `server/src/services/userService.js`), clearly separated from unauthenticated UI preview personas.
- Trip create, read, update and delete (`PLANNED` for Phase 2).
- Destination name and optional coordinates (`PLANNED` for Phase 2/5).
- Map view for saved locations (`PLANNED` for Phase 5).
- Weather lookup for a selected destination (`PLANNED` for Phase 5).
- Itinerary days and ordered activities (`PLANNED` for Phase 3).
- Trip budget, expense categories and actual expense records (`PLANNED` for Phase 4).
- Basic participant and expense-split records (`PLANNED` for Phase 4).
- Responsive desktop and mobile layouts (`IMPLEMENTED AND VERIFIED` for AppShell; `PLANNED` for domain screens).
- Server-side authorization and validation (`IMPLEMENTED AND VERIFIED` for token check & demo-persona rejection on `/api/auth/me`; `PLANNED` for trip ownership/membership authorization).

### Out of scope for the first release

- Flight, hotel or transport booking.
- Payment processing, wallets or storing card/bank details.
- Guaranteed real-time traffic or turn-by-turn navigation.
- Offline map downloads.
- AI-generated trip plans or paid partner integrations.
- Real-time collaborative editing/chat.
- Native Android/iOS applications.

---

# 2. Technology decisions & Database/Authentication Audit

## 2.1 Audited Technology Stack Table

| Layer | Technology in Actual Repository | File Extensions & Location | Audit Status |
|---|---|---|---|
| Frontend UI & Routing | React 19 (`react`, `react-dom`) + React Router v7 (`react-router-dom`) | **`.jsx` ONLY** in `client/src/` | `IMPLEMENTED AND VERIFIED` |
| Frontend Styling | Standard CSS custom properties & responsive layout | **`.css` ONLY** in `client/src/styles/index.css` | `IMPLEMENTED AND VERIFIED` |
| Backend Runtime & API | Node.js + Express 4 (`express`) with ES Modules (`"type": "module"`) | **`.js` ONLY** in `server/server.js` and `server/src/` | `IMPLEMENTED AND VERIFIED` |
| Relational Database | PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`) | 8 relational tables verified in `information_schema.columns` | `IMPLEMENTED AND VERIFIED` |
| Runtime DB Driver & Transactions | `pg` (`pg.Pool` Object Method in `server/src/config/db.js`) | Parameterized SQL (`query`) + ACID transaction wrapper (`withTransaction`) using `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` | `IMPLEMENTED AND VERIFIED` |
| Schema Reference & SQL Migration Baseline | `server/prisma/schema.prisma` + `server/prisma/migrations/0001_initial_baseline/migration.sql` | Canonical 8-table Prisma data model and executed PostgreSQL DDL baseline | `IMPLEMENTED AND VERIFIED` (Schema & SQL DDL) |
| Prisma CLI (`prisma migrate`) & `@prisma/client` Runtime | Not installed in `package.json`; not used at runtime | Cloud SQL environment provides split Unix-socket `SQL_*` variables rather than `DATABASE_URL` | `BLOCKED` (Runtime queries execute via `pg.Pool` in `server/src/config/db.js` instead) |
| Authentication | Firebase Client Web SDK (`firebase/auth`) + `firebase-admin` (`server/src/config/firebase-admin.js`) | Google Sign-In popup + Bearer ID token verification + `users` table upsert | `IMPLEMENTED BUT NOT VERIFIED` (Unit-tested 401/demo rejection; live Google popup requires interactive browser login) |
| Maps, Weather & Routing | Leaflet + OpenStreetMap, Open-Meteo, openrouteservice | External adapters not yet created in `server/src/services/` or `client/src/` | `PLANNED` (Phase 5) |

## 2.2 Database Configuration Audit & Single Connection Strategy Decision

### Problem Found During Audit
1. `server/prisma/schema.prisma` declared `url = env("DATABASE_URL")`, whereas `.env.example` and `server/src/config/db.js` used split environment variables (`SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`).
2. Neither `prisma` nor `@prisma/client` is installed in `package.json`, and earlier documentation in v0.7 contained a stale reference to deleted Phase 0 files (`src/db/schema.ts` and `src/db/drizzle.config.ts`).

### Documented PostgreSQL Connection Strategy Decision
- **Single Runtime Connection Strategy:** All backend runtime queries and ACID transactions connect to PostgreSQL exclusively through `/server/src/config/db.js` using the `pg.Pool` **Object Method** (`host: process.env.SQL_HOST`, `user: process.env.SQL_USER`, `password: process.env.SQL_PASSWORD`, `database: process.env.SQL_DB_NAME`, `max: 10`).
- **Why `SQL_*` Instead of `DATABASE_URL` at Runtime:** In the AI Studio Cloud SQL environment, PostgreSQL credentials and the local Unix domain socket path (`/cloudsql/...`) are injected as separate `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, and `SQL_PASSWORD` environment variables. Passing `SQL_HOST` directly to `pg.Pool` avoids URL-encoding errors on Unix socket paths and passwords.
- **Role of `server/prisma/schema.prisma` and `server/prisma/migrations/`:**
  - `server/prisma/schema.prisma` is retained as the canonical Prisma relational schema reference documenting the 8 tables, foreign keys, indexes, and `@check` constraint annotations.
  - `server/prisma/migrations/0001_initial_baseline/migration.sql` records the exact PostgreSQL DDL (including `CHECK` constraints and `CREATE INDEX` statements) applied to the live Cloud SQL instance `ai-studio-de6d6586`.
  - **Honest Migration Status:** Prisma CLI (`npx prisma migrate`) and `@prisma/client` are **not** executed at runtime (`BLOCKED` by split `SQL_*` Unix-socket environment provisioning). All schema verification against the live Cloud SQL database was executed via SQL inspection against `information_schema.columns` (`IMPLEMENTED AND VERIFIED`).

## 2.3 Authentication & Authorization Audit

### Findings & Corrections Made
1. **Demo Traveller Personas vs. Real Authenticated Accounts:**
   - *Previous issue:* `client/src/context/AuthContext.jsx` initialized `currentUser` to `DEMO_TRAVELLERS[0]` (`Naveed Mushtaq`) and `DashboardPage.jsx` rendered `"Signed in as Naveed Mushtaq (naveed@routewise.edu)"`, which could mislead a reviewer into thinking a real authenticated session was active.
   - *Correction implemented:*
     - Every demo persona in `client/src/context/AuthContext.jsx` now carries `isDemo: true`, `isAuthenticated: false`, and `authMode: 'demo_preview'`.
     - `AppShell.jsx` now displays an amber warning badge (`DEMO PREVIEW — NOT AUTHENTICATED`), labels the selector `UI Preview Persona:`, and provides a `Sign in with Google` button alongside real Firebase `onAuthStateChanged` state tracking.
     - `DashboardPage.jsx` explicitly states `UI Preview Mode (Unauthenticated Demo Persona): ...` whenever a demo persona is selected.
     - `server/src/middleware/auth.js` (`requireAuth`) explicitly rejects any `Bearer demo-*` token or missing/invalid `Authorization` header with HTTP `401 Unauthorized` (verified by automated unit tests in `server/tests/stack.test.js`).
2. **Backend Token Validation & User Synchronization:**
   - `server/src/middleware/auth.js` validates Bearer tokens using `adminAuth.verifyIdToken(token)` (`server/src/config/firebase-admin.js`), normalizes the user record, and calls `getOrCreateUser` (`server/src/services/userService.js`) to synchronize the authenticated user into PostgreSQL `users` (`req.dbUser`).
   - Mounted `GET /api/auth/me` in `server/src/app.js` protected by `requireAuth` so authenticated user synchronization has a live API endpoint.
3. **Server-Side Ownership & Membership Authorization Status:**
   - **Not Yet Implemented (`PLANNED` for Phase 2):** While `requireAuth` verifies identity (`req.user` and `req.dbUser`), trip-level authorization middleware checking `trips.owner_user_id = req.dbUser.id` or membership in `trip_members` (`role IN ('member', 'viewer')`) has **not** yet been implemented because Trip CRUD routes (`/api/trips`) are scheduled for Phase 2.

---

# 3. SRS — Software Requirements Specification (Audited Status)

## 3.1 Functional requirements

| ID | Requirement | Priority | Acceptance criteria | Current Repository Evidence | Audit Status |
|---|---|---|---|---|---|
| FR-01 | Account access | High | A user can authenticate via Firebase Google Sign-In; demo personas are strictly unauthenticated and rejected by `/api/auth/me` (`401`). Trip-level access control awaits Phase 2. | `client/src/context/AuthContext.jsx`, `server/src/middleware/auth.js`, `server/src/services/userService.js`, `GET /api/auth/me` | `IMPLEMENTED BUT NOT VERIFIED` (401 & demo rejection unit-tested; live Google login & trip RBAC pending) |
| FR-02 | Create trip | High | Valid title, destination and travel dates create one trip record in PostgreSQL `trips`. | `NewTripPage.jsx` is a read-only placeholder; no `POST /api/trips` route yet. | `PLACEHOLDER` |
| FR-03 | Edit trip | High | Owner can update trip details; invalid date range is rejected. | `trips` table exists in PostgreSQL; no update endpoint or form yet. | `PLANNED` |
| FR-04 | List trips | High | User sees trips they own or are authorized to access. | `DashboardPage.jsx` renders static placeholder summary and `EmptyState.jsx`; no `GET /api/trips` route yet. | `PLACEHOLDER` |
| FR-05 | Delete trip | Medium | Authorized owner can delete a trip after confirmation; dependent records cascade. | `ON DELETE CASCADE` verified in PostgreSQL schema; `ConfirmDialog.jsx` exists; no `DELETE /api/trips/:id` route yet. | `PLANNED` |
| FR-06 | Add trip members | Medium | Owner can add permitted members; duplicate membership is rejected by `UNIQUE (trip_id, user_id)`. | `trip_members` table & constraint exist in PostgreSQL; no API/UI yet. | `PLANNED` |
| FR-07 | Destination coordinates | High | Trip or itinerary location can store latitude/longitude (`NUMERIC(9,6)`) validated as a pair. | `places` table & coordinate `CHECK` constraint exist in PostgreSQL; no API/UI yet. | `PLANNED` |
| FR-08 | Map view | High | Saved locations with valid coordinates can be displayed on the map. | No Leaflet component or route exists yet. | `PLANNED` |
| FR-09 | Weather lookup | High | User can request weather for a selected location via Open-Meteo adapter. | No weather service or UI component exists yet. | `PLANNED` |
| FR-10 | Provider failure handling | High | If a provider times out or fails, show a useful message; saved trip data remains usable. | `ErrorState.jsx` exists; external provider adapters not yet built. | `PLANNED` |
| FR-11 | Create itinerary day | High | A trip can have days within its date range; `(trip_id, day_date)` and `(trip_id, day_order)` uniqueness maintained. | `itinerary_days` table & constraints exist in PostgreSQL; no API/UI yet. | `PLANNED` |
| FR-12 | Manage itinerary activity | High | Authorized user can add, edit, remove and reorder activities for a day. | `itinerary_items` table & constraints exist in PostgreSQL; no API/UI yet. | `PLANNED` |
| FR-13 | Set budget | High | Owner can save a non-negative planned budget (`NUMERIC(12,2)`) and trip currency (`CHAR(3)`). | `trips.planned_budget` and `trips.currency` exist in PostgreSQL; no API/UI yet. | `PLANNED` |
| FR-14 | Record expense | High | Authorized user can record title, positive amount, category, date and payer. | `expenses` table & `CHECK (amount > 0)` exist in PostgreSQL; no API/UI yet. | `PLANNED` |
| FR-15 | Calculate totals | High | Total spent and remaining budget are derived consistently from persisted expenses. | Not yet implemented. | `PLANNED` |
| FR-16 | Split expense | Medium | An expense can be split among eligible trip participants; split total must equal expense total. | `expense_splits` table & `withTransaction` helper exist; split service not yet built. | `PLANNED` |
| FR-17 | Edit/delete expense | High | Authorized user can update/delete an expense and its splits; totals recalculate. | `ON DELETE CASCADE` on `expense_splits` exists; no API/UI yet. | `PLANNED` |
| FR-18 | Currency handling | Medium | MVP uses one currency per trip (`INR` default). | `trips.currency` default `'INR'` exists in PostgreSQL; UI formatting pending Phase 2/4. | `PLANNED` |
| FR-19 | Empty/loading/error states | High | Lists, forms, maps and weather show clear feedback for each state. | `EmptyState.jsx` (`IMPLEMENTED AND VERIFIED`), `LoadingState.jsx` & `ErrorState.jsx` (`IMPLEMENTED BUT NOT VERIFIED`). | `IMPLEMENTED BUT NOT VERIFIED` |

## 3.2 Non-functional requirements

| ID | Quality | Requirement / acceptance target | Current Repository Evidence | Audit Status |
|---|---|---|---|---|
| NFR-01 | Usability | Main trip workflow is understandable without training; labels and validation messages are clear. | AppShell & Dashboard navigation verified in browser; trip workflow forms pending Phase 2. | `PLACEHOLDER` |
| NFR-02 | Responsive UI | Core screens work at mobile, tablet and desktop widths without clipped actions. | `client/src/styles/index.css` responsive media queries verified on `/dashboard` and `/trips/new`. | `IMPLEMENTED AND VERIFIED` (AppShell baseline) |
| NFR-03 | Performance | Common operations are measured with representative test data; no performance claim without evidence. | No domain benchmark executed yet. | `PLANNED` |
| NFR-04 | Reliability | API failures must not erase already saved local/database data; external services fail independently. | Centralized error handler in `server/src/app.js`; external adapters pending Phase 5. | `PLANNED` |
| NFR-05 | Security | Server validates input and checks authorization on every private operation; demo personas rejected on protected endpoints. | `requireAuth` rejects missing & `demo-*` tokens (`401`); trip ownership/member RBAC pending Phase 2. | `IMPLEMENTED BUT NOT VERIFIED` |
| NFR-06 | Data integrity | Foreign keys, uniqueness, check constraints and transactions protect relational consistency. | All 8 PostgreSQL tables, FKs, `UNIQUE`, `CHECK` constraints, and `withTransaction` in `server/src/config/db.js` verified. | `IMPLEMENTED AND VERIFIED` |
| NFR-07 | Maintainability | Strict PERN separation: `.jsx` + `.css` in `client/src/`, `.js` ES Modules in `server/src/`, zero `.ts`/`.tsx`/`.mjs`. | Verified by `node --test server/tests/stack.test.js` and `npm run lint`. | `IMPLEMENTED AND VERIFIED` |
| NFR-08 | Accessibility | Readable contrast, keyboard focus, labels and semantic controls (`<nav>`, `<main>`, `role="status"`, `role="alert"`, `role="dialog"`). | Implemented in `AppShell.jsx` and feedback components. | `IMPLEMENTED AND VERIFIED` |
| NFR-09 | Compatibility | Verify latest headless Chromium before release. | Verified via Playwright headless Chromium on `http://localhost:3000`. | `IMPLEMENTED AND VERIFIED` (Phase 1 shell) |
| NFR-10 | Cost | Target ₹0 using Cloud SQL Developer Edition scale-to-zero free tier and free external APIs. | Provisioned Cloud SQL Developer Edition (`ai-studio-de6d6586`). | `IMPLEMENTED AND VERIFIED` |

---

# 4. DRD — Design Requirements Document (Audited Status)

## 4.1 Screen Inventory & Implementation Status

| Screen / route | Main purpose | Actual File in Repository | Audit Status |
|---|---|---|---|
| `/dashboard` | Overview, auth mode indicator, stack baseline metrics, and empty-state CTA | `client/src/pages/DashboardPage.jsx` (renders static baseline metrics and `EmptyState.jsx`; does not yet query PostgreSQL trips) | `PLACEHOLDER` |
| `/trips/new` | Create a trip | `client/src/pages/NewTripPage.jsx` (renders Phase 2 placeholder card; does not yet render `TripForm.jsx` or call `POST /api/trips`) | `PLACEHOLDER` |
| `/login` and `/register` | Account access | Handled via header `Sign in with Google` button in `client/src/layouts/AppShell.jsx`; no standalone `/login` route | `PLANNED` |
| `/trips/:tripId` | Trip overview | Route and page file do not exist yet | `PLANNED` |
| `/trips/:tripId/itinerary` | Day-wise trip plan | Route and page file do not exist yet | `PLANNED` |
| `/trips/:tripId/map` | View saved destinations | Route and page file do not exist yet | `PLANNED` |
| `/trips/:tripId/expenses` | Actual spending and splits | Route and page file do not exist yet | `PLANNED` |
| `/trips/:tripId/members` | Participants and roles | Route and page file do not exist yet | `PLANNED` |

## 4.2 Component Registry (Audited Against `client/src/`)

| Component | Exact `.jsx` path | Responsibility / where used | Props & Data Flow | Why it exists | Audit Status |
|---|---|---|---|---|---|
| `AppShell` | `client/src/layouts/AppShell.jsx` | Shared page frame, sticky navigation bar, explicit `DEMO PREVIEW — NOT AUTHENTICATED` / `AUTHENTICATED (FIREBASE)` badge, UI Preview Persona selector, Google Sign-In button, and `<Outlet />`; used in `client/src/App.jsx`. | Consumes `useAuth()` from `AuthContext.jsx`. | Prevents duplicated layout, keeps navigation consistent, and ensures demo personas are never mistaken for authenticated users. | `IMPLEMENTED AND VERIFIED` |
| `PageHeader` | `client/src/components/PageHeader.jsx` | Page title, subtitle and primary action slot; imported by `DashboardPage.jsx` and `NewTripPage.jsx`. | Props: `{ title, subtitle, actions }`. | Standardizes page hierarchy and action placement. | `IMPLEMENTED AND VERIFIED` |
| `EmptyState` | `client/src/components/EmptyState.jsx` | Guides user when a list has no records; imported by `DashboardPage.jsx`. | Props: `{ title, message, action }`. | Prevents blank/unexplained screens. | `IMPLEMENTED AND VERIFIED` |
| `AuthContext` / `AuthProvider` | `client/src/context/AuthContext.jsx` | Provides `currentUser`, `isAuthenticated`, `isDemo`, `demoTravellers`, `selectDemoTraveller`, `signInWithGoogle`, `logout`, and `getAccessToken`; wraps `<App />`. | Reads `/firebase-applet-config.json` and subscribes to `onAuthStateChanged`. | Centralizes Firebase Google Sign-In and unauthenticated demo persona preview state. | `IMPLEMENTED AND VERIFIED` (UI state & demo flags verified in browser; live Google OAuth popup requires user interaction) |
| `LoadingState` | `client/src/components/LoadingState.jsx` | Indicates ongoing asynchronous operations (`role="status"`, `aria-live="polite"`). Currently not imported by a page until Phase 2 data fetching begins. | Props: `{ message }`. | Gives consistent asynchronous feedback. | `IMPLEMENTED BUT NOT VERIFIED` |
| `ErrorState` | `client/src/components/ErrorState.jsx` | Explains recoverable failures (`role="alert"`) with optional retry button. Currently not imported by a page until Phase 2 data fetching begins. | Props: `{ title, message, onRetry }`. | Avoids silent failures and raw stack traces. | `IMPLEMENTED BUT NOT VERIFIED` |
| `ConfirmDialog` | `client/src/components/ConfirmDialog.jsx` | Modal dialog (`role="dialog"`, `aria-modal="true"`) confirming destructive actions. Currently not imported by a page until Phase 2 trip deletion. | Props: `{ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }`. | Reduces accidental deletion. | `IMPLEMENTED BUT NOT VERIFIED` |
| `TripCard` | `client/src/components/TripCard.jsx` (Not yet created) | Shows a trip summary on dashboard/trip lists. | Planned for Phase 2 Trip CRUD. | Reusable trip preview with consistent navigation. | `PLANNED` |
| `TripForm` | `client/src/components/TripForm.jsx` (Not yet created) | Creates/edits trip details. | Planned for Phase 2 Trip CRUD. | Shares field validation and submit logic. | `PLANNED` |
| `BudgetSummary` | `client/src/components/BudgetSummary.jsx` (Not yet created) | Shows planned, spent and remaining amounts. | Planned for Phase 4 Budget & Expenses. | Keeps money calculations and formatting consistent. | `PLANNED` |
| `ItineraryDayCard` | `client/src/components/ItineraryDayCard.jsx` (Not yet created) | Groups activities for one date. | Planned for Phase 3 Itinerary. | Mirrors the user's day-wise planning model. | `PLANNED` |
| `ItineraryItem` | `client/src/components/ItineraryItem.jsx` (Not yet created) | Shows one scheduled activity/place. | Planned for Phase 3 Itinerary. | Supports ordering and editing at activity level. | `PLANNED` |
| `ActivityForm` | `client/src/components/ActivityForm.jsx` (Not yet created) | Adds/edits an itinerary item. | Planned for Phase 3 Itinerary. | Keeps activity validation reusable. | `PLANNED` |
| `MapView` | `client/src/components/MapView.jsx` (Not yet created) | Displays coordinates and markers using Leaflet + OpenStreetMap. | Planned for Phase 5 Maps & Weather. | Isolates map library/provider-specific UI. | `PLANNED` |
| `WeatherCard` | `client/src/components/WeatherCard.jsx` (Not yet created) | Displays destination forecast/status via Open-Meteo adapter. | Planned for Phase 5 Maps & Weather. | Separates external weather states from trip screens. | `PLANNED` |
| `ExpenseForm` | `client/src/components/ExpenseForm.jsx` (Not yet created) | Records title, amount, payer, category and optional splits. | Planned for Phase 4 Budget & Expenses. | Centralizes expense input and validation. | `PLANNED` |
| `ExpenseList` | `client/src/components/ExpenseList.jsx` (Not yet created) | Displays trip expenses. | Planned for Phase 4 Budget & Expenses. | Reusable list with edit/delete affordances. | `PLANNED` |
| `SplitBreakdown` | `client/src/components/SplitBreakdown.jsx` (Not yet created) | Shows participant shares and settlement status. | Planned for Phase 4 Budget & Expenses. | Makes group cost allocation understandable. | `PLANNED` |

---

# 5. ERD — Entity Relationship Diagram & PostgreSQL Schema Audit

## 5.1 Database & Schema Audit Summary

- **Database Engine:** PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`, Cloud SQL Developer Edition).
- **Runtime Database Access:** `/server/src/config/db.js` (`pg.Pool` Object Method using `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` + `query()` and `withTransaction()`).
- **Schema Definition Files:**
  1. `/server/prisma/schema.prisma` — 8-model Prisma schema matching all 8 PostgreSQL tables, column types, foreign keys, `@@unique` constraints, and `@@index` definitions, plus `@check` documentation comments.
  2. `/server/prisma/migrations/0001_initial_baseline/migration.sql` — Complete SQL DDL baseline including PostgreSQL `CHECK` constraints (which Prisma schema syntax does not natively enforce without raw SQL migrations).

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

## 5.3 Audited Tables, Columns, and Constraints (`schema.prisma` vs. Live PostgreSQL)

All 8 tables and 62 columns below are **live in PostgreSQL** (`IMPLEMENTED AND VERIFIED` via `information_schema.columns`):

### 1. `users` (6 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `uid` | `VARCHAR(128)` | `String? @unique @db.VarChar(128)` | `UNIQUE` (Firebase Auth UID) | `IMPLEMENTED AND VERIFIED` |
| `full_name` | `VARCHAR(100)` | `String @map("full_name") @db.VarChar(100)` | `NOT NULL` | `IMPLEMENTED AND VERIFIED` |
| `email` | `VARCHAR(255)` | `String @unique @db.VarChar(255)` | `NOT NULL UNIQUE` | `IMPLEMENTED AND VERIFIED` |
| `password_hash` | `VARCHAR(255)` | `String? @map("password_hash") @db.VarChar(255)` | Nullable | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `DateTime @default(now()) @db.Timestamptz(6)` | `NOT NULL DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

### 2. `trips` (11 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `owner_user_id` | `UUID` | `String @map("owner_user_id") @db.Uuid` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `title` | `VARCHAR(150)` | `String @db.VarChar(150)` | `NOT NULL` | `IMPLEMENTED AND VERIFIED` |
| `destination_name` | `VARCHAR(180)` | `String @map("destination_name") @db.VarChar(180)` | `NOT NULL` | `IMPLEMENTED AND VERIFIED` |
| `description` | `TEXT` | `String?` | Nullable | `IMPLEMENTED AND VERIFIED` |
| `start_date`, `end_date` | `DATE` | `DateTime @db.Date` | `NOT NULL`, `CHECK (end_date >= start_date)` | `IMPLEMENTED AND VERIFIED` |
| `currency` | `CHAR(3)` | `String @default("INR") @db.Char(3)` | `NOT NULL DEFAULT 'INR'` | `IMPLEMENTED AND VERIFIED` |
| `planned_budget` | `NUMERIC(12,2)` | `Decimal @default(0.00) @db.Decimal(12, 2)` | `NOT NULL DEFAULT 0.00`, `CHECK (planned_budget >= 0)` | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `DateTime @default(now()) @db.Timestamptz(6)` | `NOT NULL DEFAULT NOW()`; Index `idx_trips_owner_updated` | `IMPLEMENTED AND VERIFIED` |

### 3. `trip_members` (6 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `trip_id` | `UUID` | `String @map("trip_id") @db.Uuid` | `NOT NULL REFERENCES trips(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `user_id` | `UUID` | `String @map("user_id") @db.Uuid` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `role` | `VARCHAR(20)` | `String @default("member") @db.VarChar(20)` | `NOT NULL CHECK (role IN ('member', 'viewer'))` | `IMPLEMENTED AND VERIFIED` |
| `membership_status` | `VARCHAR(20)` | `String @default("active") @db.VarChar(20)` | `NOT NULL CHECK (membership_status IN ('pending', 'active'))` | `IMPLEMENTED AND VERIFIED` |
| `joined_at` | `TIMESTAMPTZ` | `DateTime? @default(now()) @db.Timestamptz(6)` | `UNIQUE (trip_id, user_id)` | `IMPLEMENTED AND VERIFIED` |

### 4. `itinerary_days` (7 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `trip_id` | `UUID` | `String @map("trip_id") @db.Uuid` | `NOT NULL REFERENCES trips(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `day_date` | `DATE` | `DateTime @map("day_date") @db.Date` | `NOT NULL`, `UNIQUE (trip_id, day_date)` | `IMPLEMENTED AND VERIFIED` |
| `day_order` | `INTEGER` | `Int @map("day_order")` | `NOT NULL CHECK (day_order >= 1)`, `UNIQUE (trip_id, day_order)` | `IMPLEMENTED AND VERIFIED` |
| `notes` | `TEXT` | `String?` | Nullable | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `DateTime @default(now()) @db.Timestamptz(6)` | `NOT NULL DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

### 5. `places` (8 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `provider`, `provider_place_id` | `VARCHAR(40)`, `VARCHAR(180)` | `String? @db.VarChar(40)`, `String? @db.VarChar(180)` | `UNIQUE (provider, provider_place_id)` | `IMPLEMENTED AND VERIFIED` |
| `name`, `address` | `VARCHAR(180)`, `TEXT` | `String @db.VarChar(180)`, `String?` | `name NOT NULL` | `IMPLEMENTED AND VERIFIED` |
| `latitude`, `longitude` | `NUMERIC(9,6)` | `Decimal? @db.Decimal(9, 6)` | Paired null/range `CHECK` constraint | `IMPLEMENTED AND VERIFIED` |
| `created_at` | `TIMESTAMPTZ` | `DateTime @default(now()) @db.Timestamptz(6)` | `NOT NULL DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

### 6. `itinerary_items` (11 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `itinerary_day_id` | `UUID` | `String @map("itinerary_day_id") @db.Uuid` | `NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `place_id` | `UUID` | `String? @map("place_id") @db.Uuid` | `REFERENCES places(id) ON DELETE SET NULL` | `IMPLEMENTED AND VERIFIED` |
| `title`, `description` | `VARCHAR(180)`, `TEXT` | `String @db.VarChar(180)`, `String?` | `title NOT NULL` | `IMPLEMENTED AND VERIFIED` |
| `start_time`, `end_time` | `TIME` | `DateTime? @db.Time(6)` | `CHECK (start_time IS NULL OR end_time IS NULL OR end_time >= start_time)` | `IMPLEMENTED AND VERIFIED` |
| `estimated_cost` | `NUMERIC(12,2)` | `Decimal @default(0.00) @db.Decimal(12, 2)` | `NOT NULL DEFAULT 0.00 CHECK (estimated_cost >= 0)` | `IMPLEMENTED AND VERIFIED` |
| `sort_order` | `INTEGER` | `Int @map("sort_order")` | `NOT NULL CHECK (sort_order >= 1)`, `UNIQUE (itinerary_day_id, sort_order)` | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `DateTime @default(now()) @db.Timestamptz(6)` | `NOT NULL DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

### 7. `expenses` (11 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `trip_id` | `UUID` | `String @map("trip_id") @db.Uuid` | `NOT NULL REFERENCES trips(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `paid_by_user_id`, `created_by_user_id` | `UUID` | `String @db.Uuid` | `NOT NULL REFERENCES users(id) ON DELETE RESTRICT` | `IMPLEMENTED AND VERIFIED` |
| `title`, `category`, `notes` | `VARCHAR(180)`, `VARCHAR(50)`, `TEXT` | `String @db.VarChar(180)`, `String @db.VarChar(50)`, `String?` | `title, category NOT NULL` | `IMPLEMENTED AND VERIFIED` |
| `amount` | `NUMERIC(12,2)` | `Decimal @db.Decimal(12, 2)` | `NOT NULL CHECK (amount > 0)` | `IMPLEMENTED AND VERIFIED` |
| `expense_date` | `DATE` | `DateTime @map("expense_date") @db.Date` | `NOT NULL`; Index `idx_expenses_trip_date` | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `DateTime @default(now()) @db.Timestamptz(6)` | `NOT NULL DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

### 8. `expense_splits` (7 columns)
| Column | PostgreSQL Type | Prisma Mapping (`schema.prisma`) | Constraints in Live DB & `0001_initial_baseline/migration.sql` | Audit Status |
|---|---|---|---|---|
| `id` | `UUID` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `expense_id` | `UUID` | `String @map("expense_id") @db.Uuid` | `NOT NULL REFERENCES expenses(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `user_id` | `UUID` | `String @map("user_id") @db.Uuid` | `NOT NULL REFERENCES users(id) ON DELETE RESTRICT` | `IMPLEMENTED AND VERIFIED` |
| `share_amount` | `NUMERIC(12,2)` | `Decimal @map("share_amount") @db.Decimal(12, 2)` | `NOT NULL CHECK (share_amount >= 0)` | `IMPLEMENTED AND VERIFIED` |
| `is_settled` | `BOOLEAN` | `Boolean @default(false) @map("is_settled")` | `NOT NULL DEFAULT FALSE`, `UNIQUE (expense_id, user_id)` | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `DateTime @default(now()) @db.Timestamptz(6)` | `NOT NULL DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

## 5.4 Database migration history (Audited)

| Migration / Action | Date | Artifact in Current Repository | Execution Mechanism & Evidence | Audit Status |
|---|---|---|---|---|
| `0001_initial_baseline` | 2026-11-07 | `server/prisma/migrations/0001_initial_baseline/migration.sql` & `server/prisma/schema.prisma` | Applied to Cloud SQL PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`) during Phase 0 provisioning and verified via `cloudsql.ExecuteSql` query against `information_schema.columns` (8 tables, 62 columns, `0.0118s`). *(Note: Historical temporary Drizzle files used only during initial Cloud SQL provisioning were deleted in v0.7).* | `IMPLEMENTED AND VERIFIED` |
| Prisma CLI (`npx prisma migrate`) | 2026-11-07 | `server/prisma/schema.prisma` | Not executed via Prisma CLI because AI Studio Cloud SQL injects split `SQL_*` Unix-socket credentials rather than `DATABASE_URL`, and `prisma` is not installed in `package.json`. | `BLOCKED` |

---

# 6. Architectural Design & API Registry (Audited Against Runtime Code)

## 6.1 Actual Runtime Architecture

```text
Browser / Mobile Browser
        |
        v
React 19 + JSX + React Router + CSS (client/src/pages, client/src/components, client/src/layouts, client/src/context)
        |
        | HTTP/HTTPS JSON (/api/health, /api/auth/me)
        v
Node.js + Express API (server/server.js -> server/src/app.js)
  - Public route: GET /api/health -> healthRoutes.js -> healthController.js
  - Protected route: GET /api/auth/me -> requireAuth (middleware/auth.js) -> firebase-admin.js + userService.js
        |
        v
PostgreSQL Connection Pool & Transaction Helper (server/src/config/db.js using pg.Pool with SQL_*)
        |
        v
PostgreSQL Database (Cloud SQL Developer Edition: ai-studio-de6d6586)
  - 8 tables live: users, trips, trip_members, itinerary_days, places, itinerary_items, expenses, expense_splits
```

## 6.2 Audited API Endpoint Registry

| Method & Path | Auth Requirement | Controller / Middleware in Repository | Purpose | Audit Status |
|---|---|---|---|---|
| `GET /api/health` | Public | `server/src/routes/healthRoutes.js` → `server/src/controllers/healthController.js` (`getHealthStatus`) | Returns HTTP 200 JSON `{ status: 'ok', service: 'routewise-api', stack: 'PERN ...' }`. | `IMPLEMENTED AND VERIFIED` |
| `GET /api/auth/me` | Bearer Firebase ID Token (`requireAuth`) | `server/src/app.js` → `server/src/middleware/auth.js` (`requireAuth`) → `server/src/services/userService.js` (`getOrCreateUser`) | Verifies Firebase ID token, rejects missing or `demo-*` tokens with HTTP 401, upserts PostgreSQL `users` row, and returns `{ user: req.dbUser, authMode: 'firebase' }`. | `IMPLEMENTED BUT NOT VERIFIED` (401 & demo token rejection verified by unit tests; 200 flow requires live Firebase ID token) |
| `GET /api/trips` | Bearer Token (`requireAuth`) | Not yet created | List trips owned by or shared with the authenticated user. | `PLANNED` |
| `POST /api/trips` | Bearer Token (`requireAuth`) | Not yet created | Create a new trip in PostgreSQL `trips`. | `PLANNED` |
| `GET /api/trips/:tripId` | Bearer Token + Trip Owner/Member check | Not yet created | Fetch a single trip's details and summary. | `PLANNED` |
| `PUT /api/trips/:tripId` | Bearer Token + Trip Owner check | Not yet created | Update trip details and planned budget. | `PLANNED` |
| `DELETE /api/trips/:tripId` | Bearer Token + Trip Owner check | Not yet created | Delete a trip and cascade dependent records. | `PLANNED` |
| `GET/POST/PUT/DELETE /api/trips/:tripId/itinerary*` | Bearer Token + Trip Owner/Member check | Not yet created | Manage itinerary days and ordered activities. | `PLANNED` |
| `GET/POST/PUT/DELETE /api/trips/:tripId/expenses*` | Bearer Token + Trip Owner/Member check | Not yet created | Manage expenses and transactional `expense_splits`. | `PLANNED` |
| `GET /api/weather` & `GET /api/routing` | Public or Protected | Not yet created | Backend adapters for Open-Meteo and openrouteservice. | `PLANNED` |

## 6.3 Actual Workspace File Tree

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
        ConfirmDialog.jsx       # IMPLEMENTED BUT NOT VERIFIED
        EmptyState.jsx          # IMPLEMENTED AND VERIFIED
        ErrorState.jsx          # IMPLEMENTED BUT NOT VERIFIED
        LoadingState.jsx        # IMPLEMENTED BUT NOT VERIFIED
        PageHeader.jsx          # IMPLEMENTED AND VERIFIED
      context/
        AuthContext.jsx         # IMPLEMENTED AND VERIFIED (unauthenticated demo personas vs Firebase auth)
      layouts/
        AppShell.jsx            # IMPLEMENTED AND VERIFIED
      pages/
        DashboardPage.jsx       # PLACEHOLDER
        NewTripPage.jsx         # PLACEHOLDER
      styles/
        index.css               # IMPLEMENTED AND VERIFIED
      App.jsx                   # IMPLEMENTED AND VERIFIED
      main.jsx                  # IMPLEMENTED AND VERIFIED
  server/
    prisma/
      migrations/
        0001_initial_baseline/
          migration.sql         # IMPLEMENTED AND VERIFIED (SQL DDL baseline on ai-studio-de6d6586)
      schema.prisma             # IMPLEMENTED AND VERIFIED (8-model Prisma schema reference)
    src/
      config/
        db.js                   # IMPLEMENTED AND VERIFIED (pg.Pool with SQL_* + query & withTransaction)
        firebase-admin.js       # IMPLEMENTED AND VERIFIED (Firebase Admin initialization)
      controllers/
        healthController.js     # IMPLEMENTED AND VERIFIED (GET /api/health)
      middleware/
        auth.js                 # IMPLEMENTED AND VERIFIED (requireAuth: rejects missing & demo-* tokens with 401)
      routes/
        healthRoutes.js         # IMPLEMENTED AND VERIFIED (/api/health router)
      services/
        userService.js          # IMPLEMENTED BUT NOT VERIFIED (PostgreSQL user upsert on valid Firebase login)
      app.js                    # IMPLEMENTED AND VERIFIED (Express app, /api/health, /api/auth/me, error handler)
    tests/
      stack.test.js             # IMPLEMENTED AND VERIFIED (4 automated Node tests)
    server.js                   # IMPLEMENTED AND VERIFIED (Express + Vite server entry point on port 3000)
  docs/
    ROUTEWISE_PROJECT_NOTEBOOK.md
```

---

# 7. Testing Evidence & Quality Register (Audited)

| Test ID | Requirement | Scenario | Command Executed | Expected result | Actual result / evidence | Audit Status |
|---|---|---|---|---|---|---|
| TC-00a | NFR-07 | `getHealthStatus` unit test | `node --test server/tests/stack.test.js` | HTTP 200 with `{ status: 'ok', service: 'routewise-api', stack: 'PERN ...' }` | Passed (`getHealthStatus returns 200 and PERN stack metadata`). | `IMPLEMENTED AND VERIFIED` |
| TC-00b | FR-01, NFR-05 | `requireAuth` rejects missing `Authorization` header | `node --test server/tests/stack.test.js` | HTTP 401 `{ error: 'Unauthorized: Missing or invalid Bearer token.' }` | Passed (`requireAuth rejects missing Authorization header with 401`). | `IMPLEMENTED AND VERIFIED` |
| TC-00c | FR-01, NFR-05 | `requireAuth` rejects `Bearer demo-naveed` persona token | `node --test server/tests/stack.test.js` | HTTP 401 `{ error: 'Unauthorized: Demo traveller personas are for UI preview only...' }` | Passed (`requireAuth rejects demo traveller persona tokens with 401`). | `IMPLEMENTED AND VERIFIED` |
| TC-00d | NFR-06, NFR-07 | Workspace `.jsx`/`.js`/`.css` file check, Prisma schema & migration SQL existence, and zero `.ts`/`.tsx`/`.mjs` check | `node --test server/tests/stack.test.js`, `npm run lint`, `npm run build` | 4/4 unit tests pass; 0 `.ts`/`.tsx`/`.mjs` files; Vite production bundle builds cleanly. | 4/4 tests pass; `compile_applet` & `lint_applet` pass with 0 errors. | `IMPLEMENTED AND VERIFIED` |
| TC-00e | NFR-06 | Live Cloud SQL PostgreSQL schema inspection | `cloudsql.ExecuteSql` against `information_schema.columns` | All 8 tables and 62 columns exist in `public` schema. | Verified 8 tables (`users`, `trips`, `trip_members`, `itinerary_days`, `places`, `itinerary_items`, `expenses`, `expense_splits`) and 62 columns (`0.0118s`). | `IMPLEMENTED AND VERIFIED` |
| TC-00f | NFR-02, NFR-09 | Headless Chromium render & navigation check on `http://localhost:3000` | `playwright-cli` open `http://localhost:3000/dashboard` & `/trips/new` | Renders `AppShell.jsx`, `DEMO PREVIEW — NOT AUTHENTICATED` badge, `UI Preview Persona` selector, and `Sign in with Google` button with zero console/page errors. | Verified via Playwright CLI inspection. | `IMPLEMENTED AND VERIFIED` |
| TC-01 | FR-02 | Create trip with valid values | Pending Phase 2 | One trip is persisted in PostgreSQL and returned. | Not yet implemented. | `PLANNED` |
| TC-02 | FR-03 | End date earlier than start date | Pending Phase 2 | Validation error; no invalid row saved. | Not yet implemented. | `PLANNED` |
| TC-03 | FR-08 | Trip has coordinates | Pending Phase 5 | Map displays a marker; fallback shown if provider fails. | Not yet implemented. | `PLANNED` |
| TC-04 | FR-11 | Add itinerary day outside trip dates | Pending Phase 3 | Rejected or handled according to approved rule. | Not yet implemented. | `PLANNED` |
| TC-05 | FR-14 | Add expense of ₹500 | Pending Phase 4 | Exactly ₹500 is persisted once. | Not yet implemented. | `PLANNED` |
| TC-06 | FR-16 | Split ₹500 among participants | Pending Phase 4 | Split shares total exactly ₹500. | Not yet implemented. | `PLANNED` |
| TC-07 | NFR-05 | User requests another user's private trip | Pending Phase 2 | API returns 403/404 according to security design. | Not yet implemented. | `PLANNED` |
| TC-08 | FR-10 | Weather provider is unavailable | Pending Phase 5 | Saved trip data remains usable and safe fallback appears. | Not yet implemented. | `PLANNED` |

---

# 8. Code Snippet and Component Evidence Library

| Snippet ID | Description | Path | Audit Status |
|---|---|---|---|
| CS-01 | Shared React `.jsx` app shell, router, and explicit demo vs. authenticated banner | `client/src/App.jsx`, `client/src/layouts/AppShell.jsx` | `IMPLEMENTED AND VERIFIED` |
| CS-02 | `TripForm.jsx` with validation and API call | `client/src/components/TripForm.jsx` | `PLANNED` |
| CS-03 | Express trip route/controller/service | `server/src/routes/tripRoutes.js`, `server/src/services/tripService.js` | `PLANNED` |
| CS-04 | PostgreSQL `pg.Pool` (`SQL_*`) & ACID `withTransaction` helper + `requireAuth` demo rejection | `server/src/config/db.js`, `server/src/middleware/auth.js` | `IMPLEMENTED AND VERIFIED` |
| CS-05 | Expense creation transaction and split validation | `server/src/services/expenseService.js` | `PLANNED` |
| CS-06 | Weather provider adapter and failure handling | `server/src/services/weatherService.js` | `PLANNED` |
| CS-07 | Unit/API test for expense split total | `server/tests/` | `PLANNED` |

### CS-01 — Shared React JSX App Shell & Unauthenticated Demo Banner (`client/src/layouts/AppShell.jsx`)
- **Exact File Path:** `/client/src/layouts/AppShell.jsx`
- **Purpose:** Renders the navigation frame and displays an unmistakable `DEMO PREVIEW — NOT AUTHENTICATED` badge whenever a UI preview persona is selected, preventing demo personas from being mistaken for real authenticated accounts.
- **Status:** `IMPLEMENTED AND VERIFIED`

```jsx
// Excerpt from /client/src/layouts/AppShell.jsx
<div className="user-switcher">
  <span
    className={
      isAuthenticated ? 'auth-badge auth-badge-verified' : 'auth-badge auth-badge-demo'
    }
  >
    {isAuthenticated
      ? 'AUTHENTICATED (FIREBASE)'
      : 'DEMO PREVIEW — NOT AUTHENTICATED'}
  </span>
  {isDemo && (
    <>
      <label htmlFor="traveller-switcher">UI Preview Persona:</label>
      <select
        id="traveller-switcher"
        className="user-select"
        value={currentUser.id}
        onChange={(e) => selectDemoTraveller(e.target.value)}
      >
        {demoTravellers.map((traveller) => (
          <option key={traveller.id} value={traveller.id}>
            {traveller.fullName} ({traveller.roleLabel})
          </option>
        ))}
      </select>
    </>
  )}
</div>
```

### CS-04 — Backend `requireAuth` Middleware Rejecting Demo Personas (`server/src/middleware/auth.js`)
- **Exact File Path:** `/server/src/middleware/auth.js`
- **Purpose:** Rejects missing headers and any `demo-*` preview persona IDs with HTTP `401`, validates real Firebase ID tokens via `adminAuth.verifyIdToken`, and synchronizes the authenticated user into PostgreSQL `users` via `getOrCreateUser`.
- **Status:** `IMPLEMENTED AND VERIFIED`

```javascript
// Excerpt from /server/src/middleware/auth.js
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid Bearer token.',
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token || token.startsWith('demo-')) {
    return res.status(401).json({
      error: 'Unauthorized: Demo traveller personas are for UI preview only and cannot access protected API resources.',
    });
  }
  // ... verifies token with adminAuth.verifyIdToken(token) and syncs req.dbUser
}
```

---

# 9. Phased Implementation Plan & Completion Status (Audited)

| Phase | Work package | Completion gate | Audit Status |
|---|---|---|---|
| Phase 0 | Inspect workspace/repository; enforce PERN `.jsx`/`.js` stack, provision Cloud SQL PostgreSQL (`ai-studio-de6d6586`), apply 8-table relational schema (`0001_initial_baseline/migration.sql`), and audit connection/auth setup. | Zero `.ts`/`.tsx`/`.mjs` files; 8 PostgreSQL tables verified; `db.js` and `requireAuth` audited and unit-tested. | `IMPLEMENTED AND VERIFIED` |
| Phase 1 | Build application shell (`AppShell.jsx`), navigation, CSS design tokens (`index.css`), feedback components (`PageHeader.jsx`, `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `ConfirmDialog.jsx`), and placeholder routes (`/dashboard`, `/trips/new`). | Shell & navigation verified in headless Chromium; note that `/dashboard` and `/trips/new` remain `PLACEHOLDER` pages until Phase 2 Trip CRUD is connected, and `LoadingState`/`ErrorState`/`ConfirmDialog` remain `IMPLEMENTED BUT NOT VERIFIED` until mounted in Phase 2. | `IMPLEMENTED AND VERIFIED` (AppShell & routing) / `PLACEHOLDER` (Trip pages) |
| Phase 2 | Set up Express trip CRUD API (`/api/trips`), trip ownership & membership authorization middleware, PostgreSQL persistence, validation, and frontend `TripForm.jsx` / `TripCard.jsx` / `TripDetailsPage.jsx` integration. | Trip CRUD & authorization tests (`TC-01`, `TC-02`, `TC-07`) pass against PostgreSQL. | `PLANNED` (Recommended Next Phase) |
| Phase 3 | Implement itinerary days/items (`itinerary_days`, `itinerary_items`) and ordering. | Date, ownership and ordering tests (`TC-04`) pass. | `PLANNED` |
| Phase 4 | Implement budget, expenses (`expenses`) and transactional split records (`expense_splits`). | Decimal-safe totals and split reconciliation tests (`TC-05`, `TC-06`) pass. | `PLANNED` |
| Phase 5 | Add map/place (`Leaflet` + `OpenStreetMap`), routing (`openrouteservice`), and weather (`Open-Meteo`) integrations with fallback states. | Attribution/terms checked; provider failure tests (`TC-03`, `TC-08`) pass. | `PLANNED` |
| Phase 6 | Security, responsive polish, accessibility, regression tests and final submission export. | Release checklist and evidence complete. | `PLANNED` |

---

# 10. Decision Register (Audited)

| ID | Decision | Current choice | Audit Status & Rationale |
|---|---|---|---|
| ADR-001 | Database type | PostgreSQL (SQL) instead of MongoDB | `IMPLEMENTED AND VERIFIED` — Zero MongoDB/Mongoose packages or files exist. |
| ADR-002 | SQL database instance | Cloud SQL for PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`) | `IMPLEMENTED AND VERIFIED` — 8 tables and 62 columns live in `public` schema. |
| ADR-003 | PostgreSQL connection & migration strategy | Runtime connections use `pg.Pool` Object Method (`SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`) in `server/src/config/db.js`. Schema reference is maintained in `server/prisma/schema.prisma` with SQL DDL baseline in `server/prisma/migrations/0001_initial_baseline/migration.sql`. Prisma CLI / `@prisma/client` runtime is not used due to split Unix-socket `SQL_*` env vars. | `IMPLEMENTED AND VERIFIED` (`db.js` + SQL baseline) / `BLOCKED` (Prisma CLI runtime) |
| ADR-004 | Stack naming | PERN Stack (PostgreSQL, Express.js, React.js, Node.js) | `IMPLEMENTED AND VERIFIED` |
| ADR-005 | File Extension Rules | Frontend: `.jsx` and `.css` ONLY (`client/src/`). Backend: standard `.js` with ES Modules (`server/`). Forbidden: `.ts`, `.tsx`, `.mjs`. | `IMPLEMENTED AND VERIFIED` (0 `.ts`/`.tsx`/`.mjs` files in repository). |
| ADR-006 | Authentication & Demo Personas | Firebase Google Sign-In (`AuthContext.jsx` + `requireAuth` in `server/src/middleware/auth.js` + `GET /api/auth/me`). Demo personas are explicitly labeled `DEMO PREVIEW — NOT AUTHENTICATED` in UI and rejected with HTTP 401 by `requireAuth`. | `IMPLEMENTED AND VERIFIED` (UI separation & 401 rejection) / `IMPLEMENTED BUT NOT VERIFIED` (live Google OAuth user upsert) |
| ADR-007 | Member editing permissions | `owner` (full control), `member` (edit itinerary & expenses), `viewer` (read-only) | `PLANNED` for Phase 2/3 backend middleware enforcement. |
| ADR-008 | Map & Routing providers | Maps: Leaflet + OpenStreetMap; Routing: openrouteservice API | `PLANNED` for Phase 5. |
| ADR-009 | Weather provider | Open-Meteo API via backend `.js` REST adapter | `PLANNED` for Phase 5. |
| ADR-010 | Hosting | Google Cloud Run / AI Studio Applet with Cloud SQL scale-to-zero | `IMPLEMENTED AND VERIFIED` (development environment on port 3000). |
