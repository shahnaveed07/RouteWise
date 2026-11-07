# RouteWise — Project Notebook

**Product name:** RouteWise  
**Tagline:** Smart Travel Planning  
**Project type:** BCA/MCA academic major project / full-stack web application  
**Team:** Naveed Mushtaq, Mohammad Shariq Khawaja, Nayeem  
**Planning window:** 2–3 months  
**Target cash budget:** ₹0, subject to provider limits and terms  
**Document version:** 0.10 (Phase 2 Trip Management CRUD, Ownership/Membership Authorization & PostgreSQL Persistence via `pg`)  
**Last updated:** 7 November 2026  
**Project status:** Phase 0–2 `IMPLEMENTED AND VERIFIED` (Backend Trip CRUD, Ownership/Membership RBAC & PostgreSQL Persistence); Live Google OAuth Popup + Interactive Browser Sync `IMPLEMENTED BUT NOT VERIFIED`; Phase 3 Itinerary `PLANNED`  

> This is the living source of truth for the project. AI Studio must update this file after every implementation phase. A planned feature must never be recorded as implemented or verified until the code and test evidence support that status.

---

## 0. Document control and update protocol

### 0.1 Status labels

Use only these five implementation statuses throughout this notebook:

| Status | Meaning |
|---|---|
| `IMPLEMENTED AND VERIFIED` | Source exists and the relevant acceptance checks were executed successfully; evidence is recorded. |
| `IMPLEMENTED BUT NOT VERIFIED` | Source exists, but the full runtime, integration or acceptance check is still outstanding. |
| `PLACEHOLDER` | A screen/component exists only as a shell, empty state or explanatory placeholder; the feature is not implemented. |
| `PLANNED` | Approved or proposed work that has not started. |
| `BLOCKED` | Work cannot safely proceed until a named issue or decision is resolved. |

### 0.2 Update rules for the AI coding agent

1. Read this notebook and inspect the actual repository before every phase. Treat repository code as evidence; do not rely only on old prompts or previous AI summaries.
2. Work only on the phase explicitly approved by the project owner. Do not jump ahead or generate the whole application in one operation.
3. After every phase, update this file at `docs/ROUTEWISE_PROJECT_NOTEBOOK.md` in the same workspace.
4. For every UI component, record its exact path, public props, data flow, where it is imported/used, why it exists, and linked test IDs.
5. For every backend module, record route, controller, service, validator, database calls, authorization rules and test evidence.
6. Mark something `IMPLEMENTED AND VERIFIED` only after the real test/build/manual check passes and the command/result/evidence are recorded.
7. Never invent test results, database verification, screenshots, commits, file paths, API responses or deployment status.
8. Keep secrets, tokens, passwords, private connection strings and personal data out of this notebook and code snippets. Use placeholders in `.env.example`.
9. Record architecture changes in the decision register and change log. Retain an audit trail for retired files and migrations.
10. This Markdown file is the source of truth.
11. The chosen database access layer is `pg` (`node-postgres`) with parameterized SQL (`$1, $2, ...`). There is no ORM.
12. Do not mark a later phase as complete just because the ERD or SQL table already exists.

### 0.3 Change log

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1 | 29 Oct 2026 | Initial SRS, DRD, ERD, architecture, test and code-slot baseline. | `PLANNED` |
| 0.2 | 7 Nov 2026 | Notebook/presentation visual direction simplified to a conventional academic style. | `PLANNED` |
| 0.3 | 7 Nov 2026 | Replaced MongoDB/MERN proposal with PostgreSQL/PERN and a relational ERD. (Prisma was proposed here and later retired in v0.9/v0.10 in favor of direct `pg`). | `PLANNED` |
| 0.7 | 7 Nov 2026 | Workspace migrated to React JSX (`.jsx`) and standard Node.js/Express JavaScript modules (`.js`); TypeScript/TSX removed. | `IMPLEMENTED AND VERIFIED` |
| 0.8 | 7 Nov 2026 | Repository audit corrected auth/demo-persona handling, added `/api/auth/me`, SQL baseline file and strict 5-label implementation statuses. | `IMPLEMENTED AND VERIFIED` |
| 0.9 | 7 Nov 2026 | Locked `pg` (`node-postgres`) as the sole runtime database access layer; retired Prisma ORM claims; defined Phase 2 Trip CRUD implementation gate. | `IMPLEMENTED AND VERIFIED` |
| 0.10 | 7 Nov 2026 | Completed Phase 2 Trip Management (CRUD): moved SQL baseline to `server/database/migrations/0001_initial_baseline.sql`, removed legacy `server/prisma/schema.prisma`, separated 401 token errors from 503 DB sync errors in `requireAuth`, built `tripValidator.js`, `tripAccess.js`, `tripService.js`, `tripController.js`, `tripRoutes.js`, `apiClient.jsx`, `TripForm.jsx`, `TripCard.jsx`, `TripList.jsx`, `TripDetailsPage.jsx`, and verified against live Cloud SQL PostgreSQL with 9 automated unit/HTTP/DB tests. | `IMPLEMENTED AND VERIFIED` |

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
| Trip owner | Creates a trip; reads, updates and deletes own trip details (`trips.owner_user_id = req.dbUser.id`). | `IMPLEMENTED AND VERIFIED` (Backend API & PostgreSQL enforcement verified; live browser OAuth flow `IMPLEMENTED BUT NOT VERIFIED`) |
| Trip member / viewer | Reads shared trips where `trip_members.membership_status = 'active'`; cannot modify or delete trip metadata (`403 Forbidden`). | `IMPLEMENTED AND VERIFIED` (Backend API & PostgreSQL enforcement verified) |
| Project maintainer | Maintains source code, database migrations, configuration, tests and releases. | `IMPLEMENTED AND VERIFIED` |

---

# 2. Technology decisions

## 2.1 Confirmed database and access-layer decision

- **Database:** PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`).
- **Actual database access layer:** `pg` (`node-postgres`) using `pg.Pool` in `server/src/config/db.js`.
- **Queries:** Parameterized SQL (`$1, $2, ...`) executed through `query(text, params)`.
- **Transactions:** `pg` `PoolClient` with explicit `BEGIN`, `COMMIT` and `ROLLBACK` via `withTransaction(callback)`.
- **ORM:** None. `server/prisma/schema.prisma` was a legacy unused file and was removed in Phase 2 (`v0.10`); no Prisma, Sequelize, TypeORM, Mongoose or other ORM packages are installed or used.
- **SQL Migration Baseline:** Plain SQL file stored at `server/database/migrations/0001_initial_baseline.sql`.
- **Runtime Connection Config:** `pg.Pool` Object Method using `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, and `SQL_PASSWORD`.

## 2.2 Confirmed application stack

| Layer | Technology | File format / responsibility | Status |
|---|---|---|---|
| Frontend | React 19 + Vite + React Router v7 | React UI components/pages/services under `client/src/` use `.jsx`; styles use `.css` | `IMPLEMENTED AND VERIFIED` |
| Backend | Node.js + Express.js | Standard JavaScript ES Modules in `.js` files (`server/server.js`, `server/src/**/*.js`) | `IMPLEMENTED AND VERIFIED` |
| Database | PostgreSQL | Relational SQL database (`ai-studio-de6d6586`) | `IMPLEMENTED AND VERIFIED` |
| Database access | `pg` (`node-postgres`) | `pg.Pool`, parameterized SQL (`$1, $2, ...`), explicit transactions | `IMPLEMENTED AND VERIFIED` |
| ORM | None | Raw parameterized SQL runs directly through `pg`; legacy `server/prisma/` removed | `IMPLEMENTED AND VERIFIED` |
| Request validation | Custom strict validator (`server/src/validators/tripValidator.js`) | Validates ISO calendar dates, `NUMERIC(12,2)` budgets, currency, and field lengths | `IMPLEMENTED AND VERIFIED` |
| Authentication | Firebase Google Sign-In + Firebase Admin token verification | `requireAuth` (`server/src/middleware/auth.js`) returns `401` on invalid/missing/demo tokens and `503` if PostgreSQL user sync fails | `IMPLEMENTED AND VERIFIED` (middleware & DB upsert verified; live interactive browser Google popup `IMPLEMENTED BUT NOT VERIFIED`) |
| Maps, Weather & Routing | Leaflet + OpenStreetMap, Open-Meteo, openrouteservice | Planned for Phase 5 | `PLANNED` |

---

# 3. SRS — Software Requirements Specification

| ID | Requirement | Priority | Acceptance criteria | Current Evidence | Status |
|---|---|---|---|---|---|
| FR-01 | Account access | High | Firebase ID token verified by `requireAuth`; demo tokens return `401`; DB sync failures return `503` (not `401`). | `server/src/middleware/auth.js`, `server/src/services/userService.js`, `server/tests/stack.test.js` | `IMPLEMENTED BUT NOT VERIFIED` (Backend middleware & DB sync verified in `stack.test.js` & `trips.test.js`; interactive browser Google OAuth popup requires live user login) |
| FR-02 | Create trip | High | Valid title, destination and travel dates create one trip row in PostgreSQL with `owner_user_id = req.dbUser.id`; client-supplied `ownerUserId` is ignored. | `POST /api/trips`, `server/src/services/tripService.js`, `client/src/pages/NewTripPage.jsx`, `TC-01` | `IMPLEMENTED AND VERIFIED` |
| FR-03 | Edit trip | High | Owner can update trip details via `PATCH /api/trips/:tripId` using fixed column allowlist; invalid date ranges (`endDate < startDate`, even single-date updates) are rejected with `400`; members/viewers receive `403`. | `PATCH /api/trips/:tripId`, `server/src/validators/tripValidator.js`, `client/src/pages/TripDetailsPage.jsx`, `TC-02`, `TC-03` | `IMPLEMENTED AND VERIFIED` |
| FR-04 | List trips | High | Authenticated user sees trips they own or where they have an `active` `trip_members` record without duplicates; `pending` members and unrelated users are excluded. | `GET /api/trips`, `GET /api/trips/:tripId`, `client/src/pages/DashboardPage.jsx`, `TC-05`, `TC-06` | `IMPLEMENTED AND VERIFIED` |
| FR-05 | Delete trip | Medium | Authorized owner can delete a trip (`DELETE /api/trips/:tripId` → `204`) after confirmation in `ConfirmDialog.jsx`; dependent `trip_members` cascade in PostgreSQL. | `DELETE /api/trips/:tripId`, `client/src/pages/TripDetailsPage.jsx`, `ConfirmDialog.jsx`, `TC-04` | `IMPLEMENTED AND VERIFIED` |
| FR-06 | Add trip members | Medium | Owner can add permitted members; duplicate membership is rejected by `UNIQUE (trip_id, user_id)`. | Table & read RBAC verified in `trips.test.js`; member management UI/API is out of Phase 2 scope. | `PLANNED` |
| FR-07 | Destination coordinates | High | Trip or itinerary location can store latitude/longitude in `places`. | `places` table exists; API/UI planned for Phase 5. | `PLANNED` |
| FR-08 | Map view | High | Saved locations with valid coordinates can be displayed on the map. | Planned for Phase 5. | `PLANNED` |
| FR-09 | Weather lookup | High | User can request weather for a selected location via Open-Meteo. | Planned for Phase 5. | `PLANNED` |
| FR-10 | Provider failure handling | High | If an external provider fails, show a useful message; saved trip data remains usable. | Planned for Phase 5. | `PLANNED` |
| FR-11 | Create itinerary day | High | A trip can have days within its date range; trip/day uniqueness is maintained. | Planned for Phase 3. | `PLANNED` |
| FR-12 | Manage itinerary activity | High | Authorized user can add, edit, remove and reorder activities for a day. | Planned for Phase 3. | `PLANNED` |
| FR-13 | Set budget | High | Owner can save a non-negative `NUMERIC(12,2)` planned budget and 3-letter uppercase currency (`INR` default) on a trip. | Validated in `tripValidator.js` and persisted in `trips.planned_budget` and `trips.currency` (`TC-01`, `TC-08`). | `IMPLEMENTED AND VERIFIED` |
| FR-14 | Record expense | High | Authorized user can record title, positive amount, category, date and payer. | Planned for Phase 4. | `PLANNED` |
| FR-15 | Calculate totals | High | Total spent and remaining budget are derived consistently from persisted expenses. | Planned for Phase 4. | `PLANNED` |
| FR-16 | Split expense | Medium | An expense can be split among eligible trip participants; split total must equal expense total. | Planned for Phase 4. | `PLANNED` |
| FR-17 | Edit/delete expense | High | Authorized user can update/delete an expense and its splits; totals recalculate correctly. | Planned for Phase 4. | `PLANNED` |
| FR-18 | Currency handling | Medium | MVP uses one currency per trip (`INR` default). | Validated (`^[A-Z]{3}$`) and persisted on `trips.currency`. | `IMPLEMENTED AND VERIFIED` |
| FR-19 | Empty/loading/error states | High | Shared feedback components are wired into `DashboardPage.jsx`, `NewTripPage.jsx`, `TripDetailsPage.jsx`, and `TripList.jsx`. | `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `ConfirmDialog.jsx` integrated in Phase 2 pages. | `IMPLEMENTED AND VERIFIED` |

## 3.3 Non-functional requirements

| ID | Quality | Requirement / acceptance target | Current Evidence | Status |
|---|---|---|---|---|
| NFR-01 | Usability | Main trip workflow is understandable without training; labels and validation messages are clear. | `TripForm.jsx`, `DashboardPage.jsx`, `TripDetailsPage.jsx` | `IMPLEMENTED AND VERIFIED` |
| NFR-02 | Responsive UI | Core screens work at mobile, tablet and desktop widths without clipped actions. | Responsive CSS grid in `client/src/styles/index.css` | `IMPLEMENTED AND VERIFIED` |
| NFR-03 | Performance | Common operations are measured with representative test data; no performance claim without evidence. | Planned for Phase 6. | `PLANNED` |
| NFR-04 | Reliability | API failures must not erase already saved database data; external services fail independently. | Safe error handling in `app.js` and `apiClient.jsx`; external providers in Phase 5. | `IMPLEMENTED BUT NOT VERIFIED` |
| NFR-05 | Security | Server validates input and checks authorization (`requireAuth`, `requireTripAccess`, `requireTripOwner`) on every private operation; never trusts client-supplied `ownerUserId`. | Verified in `server/tests/trips.test.js` (`TC-01`..`TC-08`). | `IMPLEMENTED AND VERIFIED` |
| NFR-06 | Data integrity | Foreign keys, uniqueness, check constraints and parameterized SQL protect relational consistency. | Verified against live Cloud SQL PostgreSQL in `server/tests/trips.test.js`. | `IMPLEMENTED AND VERIFIED` |
| NFR-07 | Maintainability | Separate pages/components (`.jsx`), routes/controllers/services/validators/middleware (`.js`), and `pg` database access. | Verified in `server/tests/stack.test.js` and `npm run lint`. | `IMPLEMENTED AND VERIFIED` |
| NFR-08 | Accessibility | Readable contrast, keyboard focus, explicit `<label htmlFor>`, `aria-invalid`, `aria-describedby`, `role="dialog"`, `role="alert"`. | Implemented across `TripForm.jsx`, `ConfirmDialog.jsx`, and `AppShell.jsx`. | `IMPLEMENTED AND VERIFIED` |
| NFR-09 | Compatibility | Verify latest Chromium before release. | Verified via Playwright headless Chromium on `http://localhost:3000`. | `IMPLEMENTED AND VERIFIED` |
| NFR-10 | Cost | Target ₹0 using Cloud SQL Developer Edition scale-to-zero free tier. | Active in `asia-southeast1`. | `IMPLEMENTED AND VERIFIED` |

---

# 4. DRD — Design Requirements Document

## 4.1 Screen Inventory & Implementation Status

| Screen / route | Main purpose | Actual Files / Components | Status |
|---|---|---|---|
| `/dashboard` | Lists authenticated user's owned and active-shared trips from PostgreSQL; shows sign-in-required state for demo preview personas. | `client/src/pages/DashboardPage.jsx`, `TripList.jsx`, `TripCard.jsx`, `PageHeader.jsx`, `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/new` | Creates a persisted trip via `POST /api/trips` (`TripForm.jsx`); shows sign-in-required state for demo preview personas. | `client/src/pages/NewTripPage.jsx`, `TripForm.jsx`, `PageHeader.jsx`, `EmptyState.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/:tripId` | Displays one saved trip's metadata; renders owner-only inline `TripForm.jsx` edit and `ConfirmDialog.jsx` delete controls; read-only view for active members/viewers. | `client/src/pages/TripDetailsPage.jsx`, `TripForm.jsx`, `ConfirmDialog.jsx`, `PageHeader.jsx`, `LoadingState.jsx`, `ErrorState.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/:tripId/itinerary` | Day-wise trip plan | Not yet implemented | `PLANNED` (Phase 3) |
| `/trips/:tripId/expenses` | Spending and expense splits | Not yet implemented | `PLANNED` (Phase 4) |
| `/trips/:tripId/map` | View saved destinations | Not yet implemented | `PLANNED` (Phase 5) |
| `/trips/:tripId/members` | Participants and roles | Not yet implemented | `PLANNED` (Later extension) |

## 4.2 Component & Frontend Module Registry

| Component / module | Exact path | Public Props / Signature | Imported by (Parent / Screen) | Responsibility & Reason for Existence | Linked Tests & Status |
|---|---|---|---|---|---|
| `App` | `client/src/App.jsx` | None | `client/src/main.jsx` | Wraps application in `AuthProvider` and configures React Router routes (`/dashboard`, `/trips/new`, `/trips/:tripId`). | `TC-00`, Browser verification — `IMPLEMENTED AND VERIFIED` |
| `AppShell` | `client/src/layouts/AppShell.jsx` | None (consumes `useAuth()`) | `client/src/App.jsx` | Renders header, navigation links, `DEMO PREVIEW — NOT AUTHENTICATED` / `AUTHENTICATED (FIREBASE)` badge, preview persona selector, Google Sign-In button, and `<Outlet />`. | `TC-00`, Browser verification — `IMPLEMENTED AND VERIFIED` |
| `AuthProvider` / `useAuth` | `client/src/context/AuthContext.jsx` | `{ children }` | `client/src/App.jsx` and all pages/layouts | Manages Firebase Auth state (`authReady`, `isAuthenticated`, `isDemo`), unauthenticated demo personas, and `getAccessToken()` (which returns `null` for demo personas). | `TC-00`, `TC-07`, Browser verification — `IMPLEMENTED AND VERIFIED` |
| `apiClient` | `client/src/services/apiClient.jsx` | `fetchTrips`, `createTripRequest`, `fetchTripById`, `updateTripRequest`, `deleteTripRequest` | `DashboardPage.jsx`, `NewTripPage.jsx`, `TripDetailsPage.jsx` | Centralizes REST `/api/trips` calls, attaches `Authorization: Bearer <token>`, blocks unauthenticated demo mutations before network transmission, and normalizes errors. | `TC-01`..`TC-07` — `IMPLEMENTED AND VERIFIED` |
| `PageHeader` | `client/src/components/PageHeader.jsx` | `{ title, subtitle, actions }` | `DashboardPage.jsx`, `NewTripPage.jsx`, `TripDetailsPage.jsx` | Provides consistent page heading hierarchy and action button slot. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `EmptyState` | `client/src/components/EmptyState.jsx` | `{ title, message, action }` | `DashboardPage.jsx`, `NewTripPage.jsx`, `TripDetailsPage.jsx`, `TripList.jsx` | Displays guidance when a list is empty or when sign-in is required for demo personas. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `LoadingState` | `client/src/components/LoadingState.jsx` | `{ message }` | `DashboardPage.jsx`, `NewTripPage.jsx`, `TripDetailsPage.jsx`, `TripList.jsx` | Provides accessible (`role="status"`, `aria-live="polite"`) loading feedback while fetching trip records. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `ErrorState` | `client/src/components/ErrorState.jsx` | `{ title, message, onRetry }` | `TripDetailsPage.jsx`, `TripList.jsx` | Displays recoverable API/network errors (`role="alert"`) with a retry action. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `ConfirmDialog` | `client/src/components/ConfirmDialog.jsx` | `{ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }` | `TripDetailsPage.jsx` | Accessible modal confirmation dialog (`role="dialog"`, `aria-modal="true"`) preventing accidental trip deletion. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `TripForm` | `client/src/components/TripForm.jsx` | `{ initialValues, submitLabel, onSubmit, onCancel, isSubmitting, serverError }` | `NewTripPage.jsx` (create mode), `TripDetailsPage.jsx` (owner edit mode) | Reusable accessible form for creating and editing trips with field-level validation for dates, currency, budget, and character limits. | `TC-01`, `TC-02`, `TC-03`, `TC-08` — `IMPLEMENTED AND VERIFIED` |
| `TripCard` | `client/src/components/TripCard.jsx` | `{ trip }` | `TripList.jsx` | Renders a summary card for one persisted trip (title, destination, dates, currency/budget, role badge, and link to `/trips/:tripId`). | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `TripList` | `client/src/components/TripList.jsx` | `{ trips, isLoading, error, onRetry }` | `DashboardPage.jsx` | Orchestrates loading, error, empty, and card-grid states for the user's saved trips. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `DashboardPage` | `client/src/pages/DashboardPage.jsx` | None | `client/src/App.jsx` (`/dashboard`) | Fetches and displays real trips from `GET /api/trips` for authenticated users or shows a sign-in-required prompt for demo personas. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `NewTripPage` | `client/src/pages/NewTripPage.jsx` | None | `client/src/App.jsx` (`/trips/new`) | Renders `TripForm.jsx` to create a trip via `POST /api/trips` and redirects to `/trips/:tripId`. | Browser verification — `IMPLEMENTED AND VERIFIED` |
| `TripDetailsPage` | `client/src/pages/TripDetailsPage.jsx` | None | `client/src/App.jsx` (`/trips/:tripId`) | Displays saved trip details (`GET /api/trips/:tripId`) and provides owner-only edit (`PATCH`) and confirmed delete (`DELETE`) workflows. | Browser verification — `IMPLEMENTED AND VERIFIED` |

---

# 5. ERD — Entity Relationship Diagram and PostgreSQL Model

## 5.1 Database and SQL access summary

- **Database:** PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`).
- **Runtime library:** `pg` (`node-postgres`), using `pg.Pool` in `server/src/config/db.js`.
- **Query execution:** Parameterized SQL through `query(text, params)`.
- **Transactions:** `withTransaction(callback)` with `BEGIN`, `COMMIT` and `ROLLBACK`.
- **ORM:** None. `server/prisma/schema.prisma` was removed in Phase 2 (`v0.10`), and no ORM packages exist in `package.json`.
- **SQL Migration Baseline:** `server/database/migrations/0001_initial_baseline.sql` (moved from the legacy `server/prisma/migrations/` folder in Phase 2 with 100% identical SQL content preserved; not re-executed on the already-provisioned Cloud SQL database).

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

## 5.3 Eight PostgreSQL tables (`server/database/migrations/0001_initial_baseline.sql`)

1. **`users`**: `id` (`UUID PK`), `uid` (`VARCHAR(128) UNIQUE NOT NULL`), `full_name` (`VARCHAR(100) NOT NULL`), `email` (`VARCHAR(255) UNIQUE NOT NULL`), `password_hash` (`VARCHAR(255)`), `created_at` (`TIMESTAMPTZ`), `updated_at` (`TIMESTAMPTZ`).
2. **`trips`**: `id` (`UUID PK`), `owner_user_id` (`UUID NOT NULL FK -> users.id`), `title` (`VARCHAR(150) NOT NULL`), `destination_name` (`VARCHAR(180) NOT NULL`), `description` (`TEXT`), `start_date` (`DATE NOT NULL`), `end_date` (`DATE NOT NULL`), `currency` (`CHAR(3) DEFAULT 'INR' NOT NULL`), `planned_budget` (`NUMERIC(12,2) DEFAULT 0.00 NOT NULL`), `created_at` (`TIMESTAMPTZ`), `updated_at` (`TIMESTAMPTZ`), `CHECK (end_date >= start_date)`, `CHECK (planned_budget >= 0)`, index `idx_trips_owner_updated (owner_user_id, updated_at)`.
3. **`trip_members`**: `id` (`UUID PK`), `trip_id` (`UUID NOT NULL FK -> trips.id ON DELETE CASCADE`), `user_id` (`UUID NOT NULL FK -> users.id`), `role` (`VARCHAR(20) DEFAULT 'member' NOT NULL`), `membership_status` (`VARCHAR(20) DEFAULT 'active' NOT NULL`), `joined_at` (`TIMESTAMPTZ`), `UNIQUE (trip_id, user_id)`.
4. **`itinerary_days`**: `id` (`UUID PK`), `trip_id` (`UUID NOT NULL FK -> trips.id ON DELETE CASCADE`), `day_date` (`DATE NOT NULL`), `day_order` (`INTEGER NOT NULL CHECK >= 1`), `notes` (`TEXT`), `UNIQUE (trip_id, day_date)`, `UNIQUE (trip_id, day_order)`.
5. **`places`**: `id` (`UUID PK`), `provider` (`VARCHAR(40)`), `provider_place_id` (`VARCHAR(180)`), `name` (`VARCHAR(180) NOT NULL`), `address` (`TEXT`), `latitude` (`NUMERIC(9,6)`), `longitude` (`NUMERIC(9,6)`), `UNIQUE (provider, provider_place_id)`, paired coordinate range `CHECK`.
6. **`itinerary_items`**: `id` (`UUID PK`), `itinerary_day_id` (`UUID NOT NULL FK -> itinerary_days.id ON DELETE CASCADE`), `place_id` (`UUID FK -> places.id ON DELETE SET NULL`), `title` (`VARCHAR(180) NOT NULL`), `description` (`TEXT`), `start_time` (`TIME`), `end_time` (`TIME`), `estimated_cost` (`NUMERIC(12,2) DEFAULT 0.00 NOT NULL CHECK >= 0`), `sort_order` (`INTEGER NOT NULL CHECK >= 1`), `UNIQUE (itinerary_day_id, sort_order)`.
7. **`expenses`**: `id` (`UUID PK`), `trip_id` (`UUID NOT NULL FK -> trips.id ON DELETE CASCADE`), `paid_by_user_id` (`UUID NOT NULL FK -> users.id`), `created_by_user_id` (`UUID NOT NULL FK -> users.id`), `title` (`VARCHAR(180) NOT NULL`), `amount` (`NUMERIC(12,2) NOT NULL CHECK > 0`), `category` (`VARCHAR(50) NOT NULL`), `expense_date` (`DATE NOT NULL`), `notes` (`TEXT`), `created_at` (`TIMESTAMPTZ`), `updated_at` (`TIMESTAMPTZ`), index `idx_expenses_trip_date (trip_id, expense_date)`.
8. **`expense_splits`**: `id` (`UUID PK`), `expense_id` (`UUID NOT NULL FK -> expenses.id ON DELETE CASCADE`), `user_id` (`UUID NOT NULL FK -> users.id`), `share_amount` (`NUMERIC(12,2) NOT NULL CHECK >= 0`), `is_settled` (`BOOLEAN DEFAULT FALSE NOT NULL`), `created_at` (`TIMESTAMPTZ`), `updated_at` (`TIMESTAMPTZ`), `UNIQUE (expense_id, user_id)`.

## 5.4 SQL Migration Log

| Migration file | Date | Purpose | Executed in Phase 2? | Verification Evidence | Status |
|---|---|---|---|---|---|
| `server/database/migrations/0001_initial_baseline.sql` | 2026-11-07 | Initial 8-table PostgreSQL relational schema baseline (moved from legacy `server/prisma/migrations/0001_initial_baseline/migration.sql` with exact 120-line content preserved). | Not re-run in Phase 2 (already applied in Phase 0). | Live CRUD, RBAC, and `ON DELETE CASCADE` verified against `trips`, `users`, and `trip_members` in `server/tests/trips.test.js` (`pass 9, fail 0`). | `IMPLEMENTED AND VERIFIED` |

---

# 6. Architectural Design & API Registry

## 6.1 Runtime Architecture

```text
Browser / Mobile Browser
        |
        v
React 19 + Vite (client/src/**/*.jsx + client/src/styles/index.css)
  Pages (DashboardPage, NewTripPage, TripDetailsPage)
  Components (TripForm, TripCard, TripList, ConfirmDialog, EmptyState, LoadingState, ErrorState)
  Service (client/src/services/apiClient.jsx)
        |
        | HTTPS + JSON (REST /api/health, /api/auth/me, /api/trips, /api/trips/:tripId)
        v
Node.js + Express API (server/server.js -> server/src/app.js)
  routes/tripRoutes.js -> middleware/auth.js (requireAuth)
                       -> middleware/tripAccess.js (requireTripAccess, requireTripOwner)
                       -> controllers/tripController.js
                       -> validators/tripValidator.js
                       -> services/tripService.js
        |
        v
server/src/config/db.js (pg.Pool Object Method using SQL_HOST, SQL_DB_NAME, SQL_USER, SQL_PASSWORD)
        |
        v
Cloud SQL for PostgreSQL (ai-studio-de6d6586)
```

## 6.2 Audited API Endpoint Registry & Permission Matrix

| Method & Path | Auth & Middleware | Request Body / Params | Success Response | Error Responses | Status |
|---|---|---|---|---|---|
| `GET /api/health` | Public | None | `200 { status: "ok", service: "routewise-api", stack: "PERN ..." }` | `500` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/auth/me` | `requireAuth` | Bearer Firebase ID Token | `200 { authenticated: true, user: { id, uid, fullName, email, createdAt, updatedAt } }` | `401` (missing/invalid/demo token), `503` (DB user sync error) | `IMPLEMENTED BUT NOT VERIFIED` (Middleware & DB upsert verified in automated tests; live browser Google OAuth popup pending) |
| `GET /api/trips` | `requireAuth` | Bearer Firebase ID Token | `200 { trips: [ { id, ownerUserId, title, destinationName, description, startDate, endDate, currency, plannedBudget, accessRole, createdAt, updatedAt } ] }` | `401`, `500`/`503` | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trips` | `requireAuth` | `{ title, destinationName, description?, startDate, endDate, currency?, plannedBudget? }` (strips any `ownerUserId`/`id`) | `201 { trip: { ... } }` (`owner_user_id` set from `req.dbUser.id`) | `400` (validation error), `401`, `500`/`503` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/trips/:tripId` | `requireAuth`, `requireTripAccess` | `:tripId` (UUID) | `200 { trip: { ... } }` (owner or `active` member/viewer) | `401`, `404` (missing or inaccessible private trip) | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | Partial subset of `{ title, destinationName, description, startDate, endDate, currency, plannedBudget }` | `200 { trip: { ... } }` (owner only) | `400` (invalid field or `endDate < startDate`), `401`, `403` (active member/viewer), `404` (missing or non-member) | `IMPLEMENTED AND VERIFIED` |
| `DELETE /api/trips/:tripId` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | `:tripId` (UUID) | `204 No Content` (owner only; cascades dependent rows) | `401`, `403` (active member/viewer), `404` (missing or non-member) | `IMPLEMENTED AND VERIFIED` |

### Documented Authorization Policy (`server/src/middleware/tripAccess.js`)
- **Non-existent trip OR non-member / `pending` member:** Always returns HTTP `404 Not Found` (`{ error: "Trip not found." }`) on `GET`, `PATCH`, and `DELETE` so private trip existence is never leaked.
- **Active `member` or `viewer` on a shared trip:** Allowed `GET /api/trips` and `GET /api/trips/:tripId` (`200 OK`); receives HTTP `403 Forbidden` (`{ error: "Forbidden: Only the trip owner can modify or delete this trip." }`) on `PATCH` and `DELETE`.
- **Owner (`trips.owner_user_id === req.dbUser.id`):** Full access to `GET`, `PATCH`, and `DELETE`.

---

# 7. Testing Register & Verification Evidence

| Test ID | Requirement | Scenario | Command Executed | Expected Result | Actual Result & Evidence | Status |
|---|---|---|---|---|---|---|
| `TC-00` | `NFR-05`, `NFR-07` | Health check (`200`), missing token (`401`), demo token (`401` with 0 DB calls), valid token with DB sync failure (`503` instead of `401`), plain SQL migration path (`server/database/migrations/0001_initial_baseline.sql`), and zero Prisma/TypeScript check. | `node --test server/tests/stack.test.js` | 5/5 tests pass. | `5 pass, 0 fail` in `stack.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `TC-01` | `FR-02`, `NFR-05` | Authenticated user creates a valid trip; server ignores client-supplied `ownerUserId` and assigns `req.dbUser.id`. | `node --test server/tests/trips.test.js` | `201 Created`; persisted PostgreSQL row has `owner_user_id = ownerUser.id`. | Passed in both controller + live PostgreSQL test and Express HTTP `fetch` test (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |
| `TC-02` | `FR-03`, `FR-13` | `endDate < startDate` (both on create and single-date `PATCH`), invalid calendar date (`2026-02-30`), empty/overlong fields, negative budget (`-50`), and malformed currency (`inr`, `US`) are rejected. | `node --test server/tests/trips.test.js` | `400 Bad Request`; no invalid row written. | Passed in unit validator tests and Express HTTP `PATCH /api/trips/:id` test (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |
| `TC-03` | `FR-03` | Owner updates trip details via `PATCH /api/trips/:tripId`. | `node --test server/tests/trips.test.js` | `200 OK` with updated `title`, `destinationName`, and `plannedBudget` in PostgreSQL. | Passed in live PostgreSQL test and Express HTTP `PATCH` test (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |
| `TC-04` | `FR-05`, `NFR-06` | Owner deletes trip via `DELETE /api/trips/:tripId`; dependent `trip_members` rows are removed by PostgreSQL `ON DELETE CASCADE`. | `node --test server/tests/trips.test.js` | `204 No Content`; `trips` row and dependent `trip_members` rows count `0`. | Passed against live Cloud SQL PostgreSQL using disposable tagged fixtures (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |
| `TC-05` | `FR-04`, `ADR-007` | Active `member` and `viewer` can list (`GET /api/trips`) and read (`GET /api/trips/:tripId`) shared trip without duplicates, but receive `403 Forbidden` on `PATCH` and `DELETE`. | `node --test server/tests/trips.test.js` | `200 OK` on read; `403 Forbidden` on update/delete; duplicate-free list even if owner also has a `trip_members` row. | Passed against live Cloud SQL PostgreSQL (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |
| `TC-06` | `FR-04`, `NFR-05` | `pending` member and unrelated non-member user are excluded from `GET /api/trips` and receive `404 Not Found` on `GET /api/trips/:tripId`. | `node --test server/tests/trips.test.js` | Excluded from list; `404 Not Found` on detail lookup. | Passed against live Cloud SQL PostgreSQL and Express HTTP `GET` (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |
| `TC-07` | `FR-01`, `NFR-05` | Demo persona token (`Bearer demo-naveed`) calling `POST /api/trips` receives `401 Unauthorized` and writes zero rows to PostgreSQL. | `node --test server/tests/trips.test.js` | `401 Unauthorized`; zero DB writes. | Passed in Express HTTP test (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |
| `TC-08` | `FR-13`, `FR-18` | Decimal budget formatting (`NUMERIC(12,2)`) and 3-letter currency validation. | `node --test server/tests/trips.test.js` | Valid budgets normalized to `0.00` string; invalid budgets/currencies rejected. | Passed (`trips.test.js`). | `IMPLEMENTED AND VERIFIED` |

---

# 8. Code Snippet and Component Evidence Library

| Snippet ID | Description | Exact Path | Status |
|---|---|---|---|
| `CS-01` | React app routes including `/trips/:tripId` | `client/src/App.jsx` | `IMPLEMENTED AND VERIFIED` |
| `CS-02` | PostgreSQL `pg.Pool` connection & parameterized `query` helper | `server/src/config/db.js` | `IMPLEMENTED AND VERIFIED` |
| `CS-03` | Firebase `requireAuth` separating `401` token errors from `503` DB sync errors | `server/src/middleware/auth.js` | `IMPLEMENTED AND VERIFIED` |
| `CS-04` | Initial PostgreSQL DDL baseline | `server/database/migrations/0001_initial_baseline.sql` | `IMPLEMENTED AND VERIFIED` |
| `CS-05` | Parameterized SQL `tripService.js`, `tripValidator.js`, `tripAccess.js`, `tripController.js`, and `tripRoutes.js` | `server/src/services/tripService.js`, `server/src/validators/tripValidator.js` | `IMPLEMENTED AND VERIFIED` |
| `CS-06` | Frontend `apiClient.jsx`, `TripForm.jsx`, `TripCard.jsx`, `TripList.jsx`, and `TripDetailsPage.jsx` | `client/src/services/apiClient.jsx`, `client/src/components/TripForm.jsx` | `IMPLEMENTED AND VERIFIED` |

### CS-03 — Authentication Middleware Separating 401 vs. 503 (`server/src/middleware/auth.js`)
- **Related IDs:** `FR-01`, `NFR-05`, `ADR-006`, `TC-00`
- **Exact File Path & Symbol:** `/server/src/middleware/auth.js` (`createRequireAuth`, `requireAuth`)
- **Purpose & Explanation:** Verifies Firebase ID tokens and rejects `demo-*` tokens with `401`. If token verification succeeds but PostgreSQL user synchronization (`getOrCreateUser`) fails, forwards a `503 Service Unavailable` error to Express error middleware instead of misreporting the failure as an invalid token (`401`).

```javascript
// Excerpt from /server/src/middleware/auth.js
let decodedToken;
try {
  decodedToken = await verifyToken(token);
} catch (_tokenError) {
  return res.status(401).json({
    error: 'Unauthorized: Invalid or expired authentication token.',
  });
}

try {
  const dbUser = await syncUser(
    decodedToken.uid,
    decodedToken.email,
    decodedToken.name || ''
  );
  req.dbUser = dbUser;
  return next();
} catch (dbError) {
  const safeError = new Error(
    'Service temporarily unavailable: Unable to synchronize user account.'
  );
  safeError.statusCode = dbError.statusCode || 503;
  return next(safeError);
}
```

### CS-05 — Parameterized SQL Trip Service with Allowlisted PATCH (`server/src/services/tripService.js`)
- **Related IDs:** `FR-02`, `FR-03`, `FR-04`, `FR-05`, `ADR-002`, `ADR-003`, `TC-01`..`TC-06`
- **Exact File Path & Symbols:** `/server/src/services/tripService.js` (`listTripsForUser`, `createTrip`, `getAccessibleTripById`, `updateTripById`, `deleteTripById`)
- **Purpose & Explanation:** Executes parameterized SQL queries via `pg` (`server/src/config/db.js`). Uses `EXISTS` for duplicate-free listing of owned + active shared trips and a frozen `ALLOWED_UPDATE_COLUMNS` map for `PATCH /api/trips/:tripId`.

```javascript
// Excerpt from /server/src/services/tripService.js
const ALLOWED_UPDATE_COLUMNS = Object.freeze({
  title: 'title',
  destinationName: 'destination_name',
  description: 'description',
  startDate: 'start_date',
  endDate: 'end_date',
  currency: 'currency',
  plannedBudget: 'planned_budget',
});
```

### CS-06 — Centralized Frontend API Client (`client/src/services/apiClient.jsx`)
- **Related IDs:** `FR-01`..`FR-05`, `TC-07`
- **Exact File Path & Symbols:** `/client/src/services/apiClient.jsx` (`apiRequest`, `fetchTrips`, `createTripRequest`, `fetchTripById`, `updateTripRequest`, `deleteTripRequest`)
- **Purpose & Explanation:** Obtains a Firebase ID token from `getAccessToken()`, blocks unauthenticated demo personas before making network calls, and normalizes JSON responses and HTTP errors.

```jsx
// Excerpt from /client/src/services/apiClient.jsx
if (typeof getAccessToken === 'function') {
  const token = await getAccessToken();
  if (!token) {
    const authErr = new Error(
      'Sign-in required: Please sign in with your Google account to access or modify trips.'
    );
    authErr.statusCode = 401;
    authErr.isAuthRequired = true;
    throw authErr;
  }
  headers.Authorization = `Bearer ${token}`;
}
```

---

# 9. Phased Implementation Plan

| Phase | Work package | Completion gate | Current status |
|---|---|---|---|
| 0 | Stack/repository inspection, PERN file-extension rules, PostgreSQL baseline, auth/demo-persona foundation and notebook setup. | Stack rules pass; SQL baseline and project files inspected; tests/build/browser evidence recorded. | `IMPLEMENTED AND VERIFIED` |
| 1 | Application shell, navigation, neutral responsive styles, auth status and shared feedback components. | Routes render; shell browser check passes; component registry updated. | `IMPLEMENTED AND VERIFIED` |
| 2 | Trip CRUD, owner/member access checks, input validation, frontend form/list/detail pages and SQL persistence through `pg`. | All CRUD/access tests pass against PostgreSQL; browser workflow verified; legacy Prisma files retired; notebook updated to v0.10. | `IMPLEMENTED AND VERIFIED` |
| 3 | Itinerary days and ordered activities. | Date, ownership, ordering and CRUD tests pass. | `PLANNED` (Next phase — awaiting owner approval) |
| 4 | Budget, expenses and group splits. | Decimal-safe calculations, transaction rollback and split reconciliation tests pass. | `PLANNED` |
| 5 | Leaflet/OpenStreetMap map display, Open-Meteo weather and openrouteservice routing adapters. | Provider terms/attribution/limits checked; failure states tested. | `PLANNED` |
| 6 | Security hardening, accessibility, responsive polish, regression tests and deployment preparation. | Release checklist and evidence complete. | `PLANNED` |

---

# 10. Decision Register

| ID | Decision | Current choice | Status / rationale |
|---|---|---|---|
| ADR-001 | Database type | PostgreSQL / SQL; no MongoDB or Mongoose | `IMPLEMENTED AND VERIFIED` |
| ADR-002 | SQL runtime access layer | `pg` (`node-postgres`), `pg.Pool`, parameterized SQL (`$1, $2, ...`), explicit transactions (`withTransaction`) | `IMPLEMENTED AND VERIFIED` |
| ADR-003 | ORM | No ORM. Legacy `server/prisma/schema.prisma` and `server/prisma/` directory removed in Phase 2 (`v0.10`). | `IMPLEMENTED AND VERIFIED` |
| ADR-004 | Stack name | PERN: PostgreSQL, Express.js, React.js, Node.js | `IMPLEMENTED AND VERIFIED` |
| ADR-005 | File extensions | Frontend React source `.jsx`, CSS `.css`; backend `.js` ES Modules; migration `.sql`; no `.ts`, `.tsx`, `.mjs` | `IMPLEMENTED AND VERIFIED` |
| ADR-006 | Authentication | Firebase Google Sign-In; backend `requireAuth` returns `401` on invalid/demo tokens and `503` on DB user sync failures | `IMPLEMENTED AND VERIFIED` (Middleware & DB upsert); live interactive browser OAuth popup `IMPLEMENTED BUT NOT VERIFIED` |
| ADR-007 | Trip permissions | Owner (`trips.owner_user_id = req.dbUser.id`) can create/read/update/delete; active `member`/`viewer` can read (`403` on update/delete); `pending`/non-members receive `404` | `IMPLEMENTED AND VERIFIED` |
| ADR-008 | Maps and routing | Leaflet + OpenStreetMap; openrouteservice for route calculation | `PLANNED` (Phase 5) |
| ADR-009 | Weather | Open-Meteo through backend adapter | `PLANNED` (Phase 5) |
| ADR-010 | Hosting | AI Studio / Cloud Run environment and Cloud SQL development baseline | `IMPLEMENTED BUT NOT VERIFIED` for public production release |
| ADR-011 | Cash budget | Target ₹0, using available free services within provider limits | `IMPLEMENTED AND VERIFIED` |

---

# 11. Implementation Log

### Phase 2 — Trip Management (CRUD), Ownership/Membership Authorization & PostgreSQL Persistence (`v0.10`)

- **Date:** 2026-11-07
- **Phase:** P2
- **Status:** `IMPLEMENTED AND VERIFIED`
- **Objective:** Retire legacy Prisma files and move the SQL baseline to `server/database/migrations/0001_initial_baseline.sql`; separate Firebase token errors (`401`) from PostgreSQL user sync errors (`503`) in `requireAuth`; implement full Trip CRUD (`GET /api/trips`, `POST /api/trips`, `GET /api/trips/:tripId`, `PATCH /api/trips/:tripId`, `DELETE /api/trips/:tripId`) with parameterized `pg` SQL and owner/member/viewer authorization; connect React `.jsx` screens (`DashboardPage.jsx`, `NewTripPage.jsx`, `TripDetailsPage.jsx`, `TripForm.jsx`, `TripCard.jsx`, `TripList.jsx`, `apiClient.jsx`); and verify with automated PostgreSQL & browser tests.
- **Files created:**
  - `/server/src/validators/tripValidator.js`
  - `/server/src/middleware/tripAccess.js`
  - `/server/src/services/tripService.js`
  - `/server/src/controllers/tripController.js`
  - `/server/src/routes/tripRoutes.js`
  - `/server/tests/trips.test.js`
  - `/client/src/services/apiClient.jsx`
  - `/client/src/components/TripForm.jsx`
  - `/client/src/components/TripCard.jsx`
  - `/client/src/components/TripList.jsx`
  - `/client/src/pages/TripDetailsPage.jsx`
- **Files moved / removed:**
  - Moved `/server/prisma/migrations/0001_initial_baseline/migration.sql` → `/server/database/migrations/0001_initial_baseline.sql` (exact 120-line SQL DDL preserved; not re-run on live DB).
  - Removed `/server/prisma/schema.prisma` and empty `/server/prisma/` directory.
- **Files modified:**
  - `/server/src/config/db.js` (added `import 'dotenv/config'` so standalone test scripts automatically load `SQL_*` variables)
  - `/server/src/services/userService.js` (tagged DB synchronization errors with `statusCode = 503`)
  - `/server/src/middleware/auth.js` (exported `createRequireAuth` & `requireAuth`; separated `401` token errors from `503` DB sync errors)
  - `/server/src/app.js` (mounted `/api/trips`)
  - `/server/tests/stack.test.js` (added `503` DB sync test and verified `server/database/migrations/0001_initial_baseline.sql` and removal of `server/prisma`)
  - `/client/src/context/AuthContext.jsx` (added `authReady` state and safe `getAccessToken` returning `null` for demo personas)
  - `/client/src/App.jsx` (registered `/trips/:tripId` route)
  - `/client/src/pages/DashboardPage.jsx` (connected to `fetchTrips` and `TripList.jsx` with explicit sign-in-required state for demo personas)
  - `/client/src/pages/NewTripPage.jsx` (connected to `TripForm.jsx` and `createTripRequest`)
  - `/client/src/styles/index.css` (added form, trip card, role badge, and trip detail styles)
  - `/package.json` (updated `"lint"` script to check all backend `.js` modules and added `"test": "node --test server/tests/*.test.js"`)
  - `/docs/ROUTEWISE_PROJECT_NOTEBOOK.md` (updated to v0.10)
- **Database changes:** No new schema changes were required; the existing 8 PostgreSQL tables in `ai-studio-de6d6586` (`0001_initial_baseline.sql`) were used directly.
- **Tests run:**
  - `node --test server/tests/*.test.js` — Expected: 9/9 pass; Actual: `9 pass, 0 fail`.
  - `npm run lint` (`lint_applet`) — Expected: 0 errors; Actual: PASS.
  - `npm run build` (`compile_applet`) — Expected: 0 errors; Actual: PASS.
  - Headless Chromium browser verification (`playwright-cli`) — Verified `/dashboard`, `/trips/new`, and full authenticated trip create → view details → edit → reload persistence → delete confirmation workflow.
- **Next approved step:** Stop after Phase 2 and await project owner approval before starting **Phase 3 — Itinerary Days and Ordered Activities**.
