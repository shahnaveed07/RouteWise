# RouteWise — Project Notebook

**Product name:** RouteWise  
**Tagline:** Smart Travel Planning  
**Project type:** BCA/MCA academic major project / full-stack web application  
**Team:** Naveed Mushtaq, Mohammad Shariq Khawaja, Nayeem  
**Planning window:** 2–3 months  
**Target cash budget:** ₹0, subject to provider limits and terms  
**Document version:** 0.9  
**Last updated:** 7 November 2026  
**Project status:** Stack baseline and authentication shell present; Trip Management is the next implementation phase  

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

A code file existing does not automatically make its business feature implemented. A database table does not mean the corresponding API or screen exists.

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
10. This Markdown file is the source of truth. DOCX/PDF/PPT are human-readable exports and must be regenerated from the latest Markdown near milestones and final submission.
11. The chosen database access layer is `pg` (node-postgres) with parameterized SQL. Do not add an ORM unless the project owner explicitly changes the decision.
12. Do not mark a later phase as complete just because the ERD or SQL table already exists.

### 0.3 Change log

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1 | 29 Oct 2026 | Initial SRS, DRD, ERD, architecture, test and code-slot baseline. | Historical baseline |
| 0.2 | 7 Nov 2026 | Notebook/presentation visual direction simplified to a conventional academic style. | Historical update |
| 0.3 | 7 Nov 2026 | Replaced MongoDB/MERN proposal with PostgreSQL/PERN and a relational ERD. | Superseded database-access proposal |
| 0.7 | 7 Nov 2026 | Workspace migrated to React JSX and standard Node.js/Express JavaScript modules; TypeScript/TSX removed. | `IMPLEMENTED AND VERIFIED` (per repository audit) |
| 0.8 | 7 Nov 2026 | Repository audit corrected auth/demo-persona handling, added `/api/auth/me`, SQL baseline file and strict implementation-status labels. | `IMPLEMENTED AND VERIFIED` / OAuth live flow still unverified |
| 0.9 | 7 Nov 2026 | Locked `pg` (node-postgres) as the sole runtime database access layer; removed Prisma ORM (not used)/Prisma Client claims; defined Phase 2 Trip CRUD implementation gate. | `IMPLEMENTED AND VERIFIED` decision; cleanup and Phase 2 work `PLANNED` |

---

## 0.4 Repository snapshot used for this update

- **Repository:** `https://github.com/shahnaveed07/RouteWise`
- **Branch:** `main`
- **Latest inspected commit:** `961eb4bfadb20907afab1831326bdb1fb8151d36`
- **Latest commit message:** `feat(auth): implement Firebase authentication middleware`
- **Audit report:** AI Studio repository audit report v0.8 supplied by the project owner.
- **Review limitation:** Repository files and the attached audit report were inspected. The AI Studio-reported tests/database checks were not independently executed in this documentation update.

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
| Trip owner | Creates a trip; manages details, itinerary, budget and members. | `PLANNED` |
| Trip member | Views a shared trip and participates in expense records/splits according to permissions. | `PLANNED` |
| Project maintainer | Maintains source code, database migrations, configuration, tests and releases. | `IMPLEMENTED AND VERIFIED` |

Firebase Google Sign-In and backend token verification are present; the live OAuth-to-PostgreSQL synchronization flow remains `IMPLEMENTED BUT NOT VERIFIED`.

## 1.5 Scope

### MVP in scope

- Account access through Firebase Google Sign-In (live OAuth + PostgreSQL sync verification pending).
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

## 2.1 Confirmed database and access-layer decision

**Database:** PostgreSQL (SQL).  
**Runtime database library:** `pg` (node-postgres).  
**Query style:** parameterized SQL through a shared `pg.Pool` connection.  
**Transactions:** explicit PostgreSQL transactions through `withTransaction(callback)` where multiple writes must succeed or fail together.

The project owner explicitly selected `pg` as the actual database access layer on 7 November 2026. Prisma ORM, Prisma Client and Prisma Migrate are **not part of the application stack** and must not be added or claimed as active tooling.

The current repository has:

- `server/src/config/db.js` — active PostgreSQL pool, `query(text, params)` and `withTransaction(callback)` helpers.
- `server/prisma/migrations/0001_initial_baseline/migration.sql` — SQL DDL baseline file currently stored under a legacy/misleading `prisma` folder.
- `server/prisma/schema.prisma` — legacy schema-reference file only; no Prisma package or Prisma Client is installed or used.

**Planned cleanup in Phase 2:** move the SQL migration baseline to `server/database/migrations/0001_initial_baseline.sql`, update notebook references/tests, and remove the unused `server/prisma/schema.prisma` and empty `server/prisma/` structure. Do not reapply the initial baseline to an already-provisioned database. Do not delete the SQL DDL itself.

### Why PostgreSQL + `pg`

RouteWise contains related records: users, trips, members, itinerary days, places, activities, expenses and expense splits. PostgreSQL provides relational constraints, foreign keys, joins and transactions. `pg` is already installed and is the active runtime path; it also supports the Cloud SQL split environment variables used by the current workspace.

The runtime connection uses the object form of `Pool` with `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER` and `SQL_PASSWORD`. The current AI Studio Cloud SQL environment supplies a Unix-socket host value, so keep the object configuration rather than assembling a connection URL. The database config must never be imported by browser code.

## 2.2 Confirmed application stack

| Layer | Technology | File format / responsibility | Status |
|---|---|---|---|
| Frontend | React + Vite | React UI components/pages use `.jsx`; styles use `.css` | `IMPLEMENTED AND VERIFIED` for current shell |
| Backend | Node.js + Express.js | Standard JavaScript ES Modules in `.js` files | `IMPLEMENTED AND VERIFIED` for current API shell |
| Database | PostgreSQL | Relational SQL database | `IMPLEMENTED AND VERIFIED` baseline reported by AI Studio |
| Database access | `pg` (node-postgres) | `pg.Pool`, parameterized SQL, explicit transactions | `IMPLEMENTED AND VERIFIED` as current code path |
| ORM | None | No ORM is installed or used; raw SQL runs through `pg` | `IMPLEMENTED AND VERIFIED` in package manifest and runtime source; unused schema reference cleanup is `PLANNED` |
| API style | REST + JSON | Frontend calls Express; backend accesses PostgreSQL | `IMPLEMENTED BUT NOT VERIFIED` end-to-end |
| Request validation | Zod (already installed) or clear custom validators | Validate request payloads at API boundary | `PLANNED` for Trip CRUD |
| Authentication | Firebase Google Sign-In + Firebase Admin token verification | Browser obtains ID token; Express verifies it; DB user is synchronized | `IMPLEMENTED BUT NOT VERIFIED` for live OAuth + DB flow |
| Maps | Leaflet + OpenStreetMap | Map rendering and tile data, subject to provider policy | `PLANNED` |
| Weather | Open-Meteo | Server-side REST adapter | `PLANNED` |
| Routing | openrouteservice | Server-side REST adapter; API key kept secret | `PLANNED` |
| Testing | Node test runner, API/integration tests and browser checks | Unit, database/API and UI verification | Basic stack/auth tests reported passing; feature tests `PLANNED` |

The correct stack name is **PERN**: PostgreSQL, Express, React and Node.js. Do not call this project MERN.

## 2.3 File-extension rules

- React components, pages, layouts, hooks and frontend modules under `client/src/` use `.jsx`. Keep JSX-bearing code in `.jsx` files.
- Frontend styling uses `.css`.
- Backend routes, controllers, services, middleware, validators and server entry points use standard `.js` files with ES Modules (`"type": "module"` in root `package.json`).
- SQL migrations use `.sql` files.
- No TypeScript, `.ts`, `.tsx` or `.mjs` files.
- Do not rename backend `.js` files to `.jsx`; JSX is for the React frontend.

## 2.4 Development principles

- The browser communicates with Express using REST/JSON. It must never connect directly to PostgreSQL.
- Use parameterized SQL (`$1`, `$2`, etc.) for all values. Never concatenate user input into SQL.
- For dynamic updates, construct SQL only from a fixed server-side allowlist of column names; values remain parameterized.
- Keep database credentials and private API keys on the server in environment variables.
- Keep SQL DDL migration files under `server/database/migrations/`; do not manually change a live schema without a numbered migration and notebook entry.
- The initial schema baseline has already been applied according to the AI Studio v0.8 audit report. Do not rerun it against the live database.
- Use PostgreSQL `NUMERIC(12,2)` for money. Do not use JavaScript floating-point arithmetic for currency calculations; use integer minor units or a decimal-safe approach.
- Store trip/calendar dates as SQL `DATE`; timestamps as `TIMESTAMPTZ`; planned local activity times as `TIME` unless timezone requirements are explicitly designed.
- Use database foreign keys, unique constraints, check constraints and transactions where appropriate.
- Provider integrations must fail independently so a map/weather outage does not block trip CRUD.
- Keep UI styling restrained and conventional, using the existing neutral visual language; do not introduce vibrant redesigns without approval.

# 3. SRS — Software Requirements Specification

## 3.1 Purpose

This section defines functional and non-functional requirements for the RouteWise MVP. IDs should remain stable so that each requirement can be linked to implementation files and test cases.

## 3.2 Functional requirements

| ID | Requirement | Priority | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-01 | Account access | High | Firebase ID token is verified by Express; `/api/auth/me` synchronizes the user row; real OAuth and DB sync pass an interactive end-to-end test. | `IMPLEMENTED BUT NOT VERIFIED` |
| FR-02 | Create trip | High | Valid title, destination and travel dates create one trip record. | `PLANNED` |
| FR-03 | Edit trip | High | Owner can update trip details; invalid date range is rejected. | `PLANNED` |
| FR-04 | List trips | High | User sees trips they own or are authorized to access. | `PLANNED` |
| FR-05 | Delete trip | Medium | Authorized owner can delete a trip after confirmation; dependent records follow documented cascade policy. | `PLANNED` |
| FR-06 | Add trip members | Medium | Owner can add permitted members; duplicate membership is rejected by a unique constraint. | `PLANNED` |
| FR-07 | Destination coordinates | High | Trip or itinerary location can store latitude/longitude; values are validated and paired. | `PLANNED` |
| FR-08 | Map view | High | Saved locations with valid coordinates can be displayed on the map. | `PLANNED` |
| FR-09 | Weather lookup | High | User can request weather for a selected location when the chosen provider supports it. | `PLANNED` |
| FR-10 | Provider failure handling | High | If a provider times out, fails or reaches quota, show a useful message; saved trip data remains usable. | `PLANNED` |
| FR-11 | Create itinerary day | High | A trip can have days within its date range; trip/day uniqueness is maintained. | `PLANNED` |
| FR-12 | Manage itinerary activity | High | Authorized user can add, edit, remove and reorder activities for a day. | `PLANNED` |
| FR-13 | Set budget | High | Owner can save a non-negative planned budget and trip currency. | `PLANNED` |
| FR-14 | Record expense | High | Authorized user can record title, positive amount, category, date and payer. | `PLANNED` |
| FR-15 | Calculate totals | High | Total spent and remaining budget are derived consistently from persisted expenses. | `PLANNED` |
| FR-16 | Split expense | Medium | An expense can be split among eligible trip participants; split total must equal expense total. | `PLANNED` |
| FR-17 | Edit/delete expense | High | Authorized user can update/delete an expense and its splits; totals recalculate correctly. | `PLANNED` |
| FR-18 | Currency handling | Medium | MVP uses one currency per trip, with INR as the proposed default; conversion is out of scope. | `PLANNED` |
| FR-19 | Empty/loading/error states | High | Shared feedback components exist; domain-specific states are wired into real trip/itinerary/expense features. | `IMPLEMENTED BUT NOT VERIFIED` for shared components; trip flows `PLANNED` |

## 3.3 Non-functional requirements

| ID | Quality | Requirement / acceptance target | Status |
|---|---|---|---|
| NFR-01 | Usability | Main trip workflow is understandable without training; labels and validation messages are clear. | `PLANNED` |
| NFR-02 | Responsive UI | Core screens work at mobile, tablet and desktop widths without clipped actions. | `PLANNED` |
| NFR-03 | Performance | Common operations are measured with representative test data; no performance claim without evidence. | `PLANNED` |
| NFR-04 | Reliability | API failures must not erase already saved local/database data; external services fail independently. | `PLANNED` |
| NFR-05 | Security | Server validates input and checks authorization on every private operation; passwords are never stored in plaintext. | `PLANNED` |
| NFR-06 | Data integrity | Foreign keys, uniqueness, check constraints and transactions protect relational consistency. | `PLANNED` |
| NFR-07 | Maintainability | Separate pages/components, routes/controllers, services, database access and provider adapters. | `PLANNED` |
| NFR-08 | Accessibility | Readable contrast, keyboard focus, labels and semantic controls are used where practical. | `PLANNED` |
| NFR-09 | Compatibility | Verify latest Chrome plus at least one additional browser/device size before release. | `PLANNED` |
| NFR-10 | Cost | Target ₹0 using lawful free tools/tiers; re-check quotas, terms and limits before deployment. | `PLANNED` |

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

## 4.2 Navigation and screen inventory

| Screen / route | Main purpose | Current files/components | Status |
|---|---|---|---|
| Auth access | Google Sign-In, sign-out and demo preview separation | `client/src/context/AuthContext.jsx`, `client/src/layouts/AppShell.jsx` | `IMPLEMENTED BUT NOT VERIFIED` for live OAuth/backend sync; demo distinction `IMPLEMENTED AND VERIFIED` per browser audit |
| `/dashboard` | Overview of saved trips | `client/src/pages/DashboardPage.jsx`, `PageHeader.jsx`, `EmptyState.jsx` | `PLACEHOLDER` — no real trip list yet |
| `/trips/new` | Create a trip | `client/src/pages/NewTripPage.jsx` | `PLACEHOLDER` — no form or API persistence yet |
| `/trips/:tripId` | Trip overview | Not yet implemented | `PLANNED` |
| `/trips/:tripId/itinerary` | Day-wise trip plan | Not yet implemented | `PLANNED` |
| `/trips/:tripId/map` | View saved destinations | Not yet implemented | `PLANNED` |
| `/trips/:tripId/expenses` | Spending and expense splits | Not yet implemented | `PLANNED` |
| `/trips/:tripId/members` | Participants and roles | Not yet implemented | `PLANNED` |

## 4.3 Common UI states and behaviours

- Every form has visible labels, required-field rules, field-level errors and submit feedback.
- Disable repeated submit while a request is in progress.
- Lists must support loading, empty, success and error states.
- Destructive actions require confirmation and clear feedback after completion.
- Map/weather errors must not prevent access to stored trip information.
- Monetary values use the trip currency and consistent decimal formatting.
- On narrow screens, cards and forms stack; map controls remain usable.

## 4.4 Component registry — update during implementation

| Component / module | Actual path | Responsibility / where used | Why it exists | Status |
|---|---|---|---|---|
| `App` | `client/src/App.jsx` | Defines routes and wraps app in `AuthProvider`. | Central route composition. | `IMPLEMENTED AND VERIFIED` (workspace/build test reported) |
| `AppShell` | `client/src/layouts/AppShell.jsx` | Shared header, nav, auth/demo status, main outlet and footer. | Consistent application frame. | `IMPLEMENTED AND VERIFIED` (browser smoke check reported) |
| `PageHeader` | `client/src/components/PageHeader.jsx` | Reusable title/subtitle/action header; used on Dashboard and New Trip. | Consistent page hierarchy. | `IMPLEMENTED BUT NOT VERIFIED` |
| `AuthProvider` / `useAuth` | `client/src/context/AuthContext.jsx` | Firebase session listener, Google sign-in/out, demo persona state and ID-token helper. | Keeps auth state shared across screens. | `IMPLEMENTED BUT NOT VERIFIED` for live flow; demo-state UI verified |
| `EmptyState` | `client/src/components/EmptyState.jsx` | Placeholder/empty-state presentation; used on Dashboard. | Gives clear guidance instead of blank UI. | `IMPLEMENTED BUT NOT VERIFIED` |
| `LoadingState` | `client/src/components/LoadingState.jsx` | Shared loading feedback for future data views. | Standard asynchronous feedback. | `IMPLEMENTED BUT NOT VERIFIED` |
| `ErrorState` | `client/src/components/ErrorState.jsx` | Shared recoverable error feedback. | Standard error messaging. | `IMPLEMENTED BUT NOT VERIFIED` |
| `ConfirmDialog` | `client/src/components/ConfirmDialog.jsx` | Confirmation dialog for destructive actions. | Helps prevent accidental deletion. | `IMPLEMENTED BUT NOT VERIFIED` |
| `DashboardPage` | `client/src/pages/DashboardPage.jsx` | Shows preview account/stack summary and placeholder state. | Current dashboard shell. | `PLACEHOLDER` |
| `NewTripPage` | `client/src/pages/NewTripPage.jsx` | Explains that trip form/API will be added in Phase 2. | Route shell for Trip CRUD. | `PLACEHOLDER` |
| `TripForm` | `client/src/components/TripForm.jsx` | Create/edit trip fields and validation. | Reusable trip input. | `PLANNED` |
| `TripCard` | `client/src/components/TripCard.jsx` | One saved trip summary in dashboard list. | Reusable trip preview. | `PLANNED` |
| `TripDetailsPage` | `client/src/pages/TripDetailsPage.jsx` | Shows one trip's stored details. | Dedicated detail route. | `PLANNED` |
| `TripList` | `client/src/components/TripList.jsx` | Displays saved trips and empty/loading/error states. | Isolates list rendering. | `PLANNED` |

**Component documentation rule:** For every new component, record exact path, props, internal state, API dependency, pages that import it, reason for reuse, accessibility details and linked tests. For current code, keep actual paths above; do not replace with hypothetical paths.

---

# 5. ERD — Entity Relationship Diagram and relational model

## 5.1 Database and SQL access decision

- Database: PostgreSQL.
- Runtime library: `pg` (node-postgres), using `pg.Pool` in `server/src/config/db.js`.
- Query execution: parameterized SQL through `query(text, params)`.
- Multi-statement consistency: `withTransaction(callback)` with `BEGIN`, `COMMIT` and `ROLLBACK`.
- ORM: none. Prisma ORM, Prisma Client and Prisma Migrate are not used.
- Migration format: plain `.sql` DDL files. The current initial baseline is stored at `server/prisma/migrations/0001_initial_baseline/migration.sql`; the folder name is legacy and is planned to move to `server/database/migrations/0001_initial_baseline.sql` in Phase 2.
- `server/prisma/schema.prisma` is a legacy reference file only and is planned for removal after its useful ERD information is preserved in this notebook.
- The v0.8 AI Studio audit report states that the live Cloud SQL PostgreSQL database contains 8 tables and 62 columns, verified using information_schema. This is AI Studio-reported evidence; it was not independently queried during this document update.
- Primary keys: UUID. Foreign keys and integrity checks are enforced by PostgreSQL.
- Money: `NUMERIC(12,2)`.
- Dates: `DATE`; timestamps: `TIMESTAMPTZ`; activity times: `TIME`.

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

- One user can own many trips.
- Each trip has one owner (`trips.owner_user_id`).
- A trip may have multiple additional members; `(trip_id, user_id)` is unique.
- A trip has itinerary days; each day has ordered activities.
- A trip has expenses; each expense records a payer and may have multiple participant splits.
- Expense payer and split participants must be the owner or active members; enforce this in service-level authorization and transactions.

## 5.3 Existing relational tables and columns

### `users`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key, generated UUID |
| `full_name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, unique, normalized lowercase |
| `password_hash` | VARCHAR(255) | Nullable legacy/future column; Firebase Google Sign-In is the current auth path; do not store plaintext passwords |
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

## 5.4 Integrity, deletion and transaction rules

- PostgreSQL constraints are the final protection for required fields, uniqueness and basic value ranges; API validation gives user-friendly errors.
- Deleting a trip cascades to its dependent members, days, items, expenses and expense splits. User deletion policy must be designed carefully; do not cascade-delete trips owned by a user without an explicit product decision.
- Create a trip and its owner record (if the membership design later includes owner membership) in one transaction.
- Create/update an expense and all split rows in one transaction.
- The sum of `expense_splits.share_amount` must equal `expenses.amount`. A normal row-level CHECK cannot validate a sum across child rows; enforce it in the service transaction and add tests. A database trigger can be considered later if needed.
- Verify the payer and every split participant belongs to the trip (owner or active member) before commit.
- Use PostgreSQL `NUMERIC` and a decimal-safe JavaScript approach; do not use binary floating-point addition for money.
- Never construct raw SQL by concatenating user input. Use parameterized SQL through `pg`; do not introduce an ORM.

## 5.5 Indexes

- Unique index on normalized `users.email`.
- `trips(owner_user_id, updated_at DESC)` for dashboard listing.
- Unique `trip_members(trip_id, user_id)`.
- Unique `itinerary_days(trip_id, day_date)` and `itinerary_days(trip_id, day_order)`.
- Unique `itinerary_items(itinerary_day_id, sort_order)`.
- `expenses(trip_id, expense_date DESC)`.
- Unique `expense_splits(expense_id, user_id)`.

---

# 6. Architectural design

## 6.1 High-level architecture

```text
Browser / Mobile Browser
        |
        v
React + Vite (JSX)
Pages / reusable components / API client / UI state
        |
        | HTTPS + JSON (REST)
        v
Node.js + Express API
Routes -> Controllers -> Validation -> Services -> Authorization
        |                              |
        |                              +---- Weather adapter
        |                              +---- Geocoding / map data adapter
        v
pg.Pool + parameterized SQL + transactions
        |
        v
PostgreSQL database
Users / Trips / Members / Itinerary / Places / Expenses / Splits
```

The browser must never connect directly to PostgreSQL. Provider keys and the database URL remain server-side. Leaflet can render a map in the browser, but map tiles/geocoding and their usage rules belong to the selected provider integration.

## 6.2 Layer responsibilities

| Layer | Responsibility | Example location |
|---|---|---|
| Frontend pages | Route-level screens and page composition | `client/src/pages/` |
| Reusable components | Shared layout, cards, fields, dialogs and feedback | `client/src/components/` |
| Feature components | Trip, itinerary, map, weather and expense UI | `client/src/features/<feature>/components/` |
| API client | Centralized HTTP calls and error normalization | `client/src/services/api/` |
| Express routes | URL/method to controller mapping | `server/src/routes/` |
| Controllers | Parse request and format response; remain thin | `server/src/controllers/` |
| Services | Business rules, access checks, calculations and transactions | `server/src/services/` |
| Validators | Request schemas and field rules | `server/src/validators/` |
| Database layer | `pg.Pool`, SQL query helpers and versioned `.sql` migrations | `server/src/config/db.js` and `server/database/migrations/` (target path) |
| Provider adapters | Weather/geocoding/routing external calls | `server/src/integrations/` |
| Tests | Unit, API and integration tests | `server/tests/` and feature test folders |

## 6.3 Target repository structure

The existing repository structure takes precedence. Add only the modules needed for the current phase; do not restructure unrelated folders.

```text
routewise/
  client/
    src/
      components/          # Shared UI + feature components, all .jsx
      context/             # AuthContext.jsx
      layouts/             # AppShell.jsx
      pages/               # Route-level screens, all .jsx
      services/             # API client/helpers, .jsx as required by project convention
      styles/              # CSS
      App.jsx
      main.jsx
  server/
    database/
      migrations/           # Plain SQL migration files (.sql)
    src/
      app.js
      config/               # db.js, firebase-admin.js
      controllers/
      middleware/
      routes/
      services/
      validators/
      integrations/         # Future map/weather/routing adapters
    tests/                  # Node test files (.js)
    server.js
  docs/
    ROUTEWISE_PROJECT_NOTEBOOK.md
  .env.example
  package.json
```

Planned Phase 2 cleanup: move the existing SQL baseline to `server/database/migrations/0001_initial_baseline.sql` and retire `server/prisma/schema.prisma`. Preserve the SQL DDL exactly unless a reviewed migration change is required. Do not re-run the initial baseline on the provisioned database.

## 6.4 REST API surface and status

### Existing endpoints

| Method | Endpoint | Purpose | Status |
|---|---|---|---|
| GET | `/api/health` | Public backend health check | `IMPLEMENTED AND VERIFIED` per AI Studio test report |
| GET | `/api/auth/me` | Verify Firebase session and synchronize current user in PostgreSQL | `IMPLEMENTED BUT NOT VERIFIED` for live OAuth/database flow |

### Phase 2 endpoints

| Method | Endpoint | Purpose | Status |
|---|---|---|---|
| GET | `/api/trips` | List owned and active shared trips | `PLANNED` |
| POST | `/api/trips` | Create trip | `PLANNED` |
| GET | `/api/trips/:tripId` | Read one accessible trip | `PLANNED` |
| PATCH | `/api/trips/:tripId` | Update owner-managed trip metadata | `PLANNED` |
| DELETE | `/api/trips/:tripId` | Delete owner-managed trip | `PLANNED` |

### Later-phase endpoints (not yet implemented)

| Area | Proposed endpoints | Planned phase |
|---|---|---|
| Trip members | `/api/trips/:tripId/members` | Later collaboration extension; not in Phase 2 UI |
| Itinerary | `/api/trips/:tripId/itinerary-days`, `/api/itinerary-days/:dayId/items` | Phase 3 |
| Expenses | `/api/trips/:tripId/expenses`, `/api/expenses/:expenseId` | Phase 4 |
| Weather | `/api/weather?lat=&lon=` | Phase 5 |
| Place search | `/api/places/search?q=` | Phase 5, provider-policy dependent |

These later paths are design candidates only. Record exact request/response examples after the endpoint is implemented and tested.

---

# 7. Testing and quality plan

## 7.1 Test levels

- **Unit:** date validation, currency-safe calculations, budget totals, split allocation and permission helpers.
- **API integration:** valid/invalid payloads, CRUD, unauthenticated requests, unauthorized trip access, database constraints and transaction rollback.
- **UI/manual:** navigation, forms, loading/error/empty states, responsive layout and complete trip workflow.
- **Regression:** re-run core trip → itinerary → expense scenario after changes to related modules.

## 7.2 Current baseline evidence and feature test register

The following results are from the AI Studio repository audit report v0.8 and are recorded as reported evidence. They were not re-executed independently in this review.

| Test / check | Scenario | Reported result | Status |
|---|---|---|---|
| `node --test server/tests/stack.test.js` | Health endpoint/controller, missing auth header, demo-token rejection, file/stack check | 4 passed, 0 failed | `IMPLEMENTED AND VERIFIED` (AI Studio-reported) |
| Forbidden extension scan | Search repository for `.ts`, `.tsx`, `.mjs` | 0 files reported | `IMPLEMENTED AND VERIFIED` (AI Studio-reported) |
| Vite production build | `vite build` / `compile_applet` | PASS reported | `IMPLEMENTED AND VERIFIED` (AI Studio-reported) |
| Backend syntax/lint | `node --check` / `lint_applet` | PASS reported | `IMPLEMENTED AND VERIFIED` (AI Studio-reported) |
| Browser smoke check | `/dashboard`, demo badge, preview persona, Google sign-in button, no console/page errors | PASS reported | `IMPLEMENTED AND VERIFIED` (AI Studio-reported) |
| Live Google OAuth + PostgreSQL upsert | Complete interactive Google sign-in and verify `/api/auth/me` user row | Not completed in audit | `IMPLEMENTED BUT NOT VERIFIED` |
| TC-01 | Create valid trip | One trip saved and returned | `PLANNED` |
| TC-02 | End date earlier than start date | Validation error; no invalid row | `PLANNED` |
| TC-03 | Owner can update trip | Updated record returned | `PLANNED` |
| TC-04 | Owner can delete trip | Trip and dependent rows follow documented cascade | `PLANNED` |
| TC-05 | Member/viewer reads accessible trip | Access allowed according to membership | `PLANNED` |
| TC-06 | Non-member reads private trip | 404/403 according to policy; no data leak | `PLANNED` |
| TC-07 | Demo persona calls protected Trip API | HTTP 401; no database write | `PLANNED` |
| TC-08 | Negative budget / invalid currency / malformed dates | Request rejected; no row written | `PLANNED` |

For every future test, record command, environment, date, expected/actual result, test ID and evidence path. Do not claim a database integration test passed if it only used a mocked pool.

# 8. Code snippet and component evidence library

This section is intentionally a set of evidence slots. Replace a placeholder only with a focused excerpt copied from the actual project code.

## 8.1 Required metadata for every code snippet

- Snippet ID and related FR/NFR/ADR ID.
- Exact repository file path and exported symbol/function name.
- Language/library version if material.
- Purpose and explanation of how the code works.
- Why this design/component/library was selected.
- Where/how the component or function is used (call site / importing screen).
- Inputs, outputs, props or API contract.
- Test ID, command, date and actual result.
- Commit hash or project version when available.
- Redaction check: no secrets, tokens, passwords, real personal data or private URLs.

## 8.2 Snippet slots and current evidence

| Snippet ID | Example | Actual / planned path | Status |
|---|---|---|---|
| CS-01 | React app routes and shared auth provider | `client/src/App.jsx` | `IMPLEMENTED AND VERIFIED` (build/route shell reported) |
| CS-02 | PostgreSQL pool and parameterized query helper | `server/src/config/db.js` | `IMPLEMENTED BUT NOT VERIFIED` end-to-end with feature APIs |
| CS-03 | Firebase bearer-token middleware and DB user upsert | `server/src/middleware/auth.js`, `server/src/services/userService.js` | `IMPLEMENTED BUT NOT VERIFIED` for live flow |
| CS-04 | Initial PostgreSQL DDL baseline | Current: `server/prisma/migrations/0001_initial_baseline/migration.sql`; target: `server/database/migrations/0001_initial_baseline.sql` | `IMPLEMENTED AND VERIFIED` per AI Studio audit report; path cleanup `PLANNED` |
| CS-05 | Trip service with parameterized SQL and access checks | `server/src/services/tripService.js` | `PLANNED` (Phase 2) |
| CS-06 | Trip form and dashboard list integration | `client/src/components/TripForm.jsx`, `TripCard.jsx`, `TripList.jsx` | `PLANNED` (Phase 2) |
| CS-07 | Expense transaction and split reconciliation | `server/src/services/expenseService.js` | `PLANNED` (Phase 4) |
| CS-08 | Weather adapter and provider failure handling | `server/src/integrations/weather/` | `PLANNED` (Phase 5) |

Every snippet must include its exact file path, symbol, purpose, how it works, why the approach was chosen, where it is used, related requirement/test IDs, and evidence. Never paste secrets, tokens, passwords or private connection strings.

# 9. Phased implementation plan for AI Studio

| Phase | Work package | Completion gate | Current status |
|---|---|---|---|
| 0 | Stack/repository inspection, PERN file-extension rules, PostgreSQL baseline, auth/demo-persona foundation and notebook setup. | Stack rules pass; SQL baseline and project files inspected; tests/build/browser evidence recorded. | `IMPLEMENTED AND VERIFIED` per AI Studio v0.8 audit report; live OAuth still not verified |
| 1 | Application shell, navigation, neutral responsive styles, auth status and shared feedback components. | Routes render; shell browser check passes; component registry updated. | Shell `IMPLEMENTED AND VERIFIED`; domain screens remain `PLACEHOLDER` |
| 2 | Trip CRUD, owner/member access checks, input validation, frontend form/list/detail pages and SQL persistence through `pg`. | All CRUD/access tests pass against a safe PostgreSQL test environment; browser workflow succeeds; notebook records real code. | `PLANNED` — next phase |
| 3 | Itinerary days and ordered activities. | Date, ownership, ordering and CRUD tests pass. | `PLANNED` |
| 4 | Budget, expenses and group splits. | Decimal-safe calculations, transaction rollback and split reconciliation tests pass. | `PLANNED` |
| 5 | Leaflet/OpenStreetMap map display, Open-Meteo weather and openrouteservice routing adapters. | Provider terms/attribution/limits checked; failure states tested. | `PLANNED` |
| 6 | Security hardening, accessibility, responsive polish, regression tests and deployment preparation. | Release checklist and evidence complete. | `PLANNED` |

Build only one phase at a time. The user approves phase progression. Never silently scope-expand a phase.

# 10. Decision register

| ID | Decision | Current choice | Status / rationale |
|---|---|---|---|
| ADR-001 | Database type | PostgreSQL / SQL; no MongoDB or Mongoose | `IMPLEMENTED AND VERIFIED` in current package/runtime audit |
| ADR-002 | SQL runtime access layer | `pg` (node-postgres), `pg.Pool`, parameterized SQL, explicit transactions | `IMPLEMENTED AND VERIFIED` as current backend code path; feature persistence still to be built |
| ADR-003 | ORM | No ORM. Prisma ORM, Prisma Client and Prisma Migrate are not used. | `IMPLEMENTED AND VERIFIED` in package manifest; legacy schema file cleanup `PLANNED` |
| ADR-004 | Stack name | PERN: PostgreSQL, Express.js, React.js, Node.js | `IMPLEMENTED AND VERIFIED` |
| ADR-005 | File extensions | Frontend React source `.jsx`, CSS `.css`; backend `.js` ES Modules; migration `.sql`; no `.ts`, `.tsx`, `.mjs` | `IMPLEMENTED AND VERIFIED` per scan reported by AI Studio |
| ADR-006 | Authentication | Firebase Google Sign-In; backend verifies Firebase ID token; demo personas are explicitly unauthenticated | Demo UI and 401 rejection `IMPLEMENTED AND VERIFIED`; live OAuth + DB sync `IMPLEMENTED BUT NOT VERIFIED` |
| ADR-007 | Trip permissions | Owner can update/delete trip; active member/viewer can read; member itinerary/expense rights to be enforced in later phases; viewer read-only | `PLANNED` for Phase 2+ backend checks |
| ADR-008 | Maps and routing | Leaflet + OpenStreetMap; openrouteservice for route calculation | `PLANNED`; verify policies/quotas when implemented |
| ADR-009 | Weather | Open-Meteo through backend adapter | `PLANNED`; verify current terms/limits when implemented |
| ADR-010 | Hosting | AI Studio / Cloud Run environment and Cloud SQL currently used for development baseline; final release hosting must be re-evaluated | Development baseline `IMPLEMENTED BUT NOT VERIFIED` for public production readiness |
| ADR-011 | Cash budget | Target ₹0, using available free services within provider limits | `PLANNED`; no guarantee of permanent free tiers |

### Database file cleanup decision

The current SQL baseline is stored under `server/prisma/migrations/` only because that was the earlier folder location. The file is plain SQL and is not being executed by Prisma. In Phase 2, move it to `server/database/migrations/0001_initial_baseline.sql`; retire `server/prisma/schema.prisma`; do not alter or reapply the baseline to the existing Cloud SQL database. Record the exact file move and checksum/content preservation in the implementation log.

# 11. Implementation log — append after every AI Studio phase

Use one entry per phase; keep newest entry first.

### Phase entry template

- **Date:** YYYY-MM-DD
- **Phase:** P0/P1/…
- **Status:** one of the five implementation statuses
- **Objective:**
- **Files created:**
- **Files modified:**
- **Files removed/moved:** explain preservation and reason
- **Components added/changed:**
- **Component usage:** component → imported by → screen/parent → reason
- **Database changes:** schema fields, SQL migration filename, constraints, indexes; state whether migration actually ran
- **API changes:** method, path, request/response, authorization
- **How it works:** concise data flow and important logic
- **Why this approach:** design/technical rationale
- **Code snippet IDs:**
- **Tests run:** command, expected, actual, pass/fail
- **Evidence paths:** screenshots/logs/test reports
- **Known bugs / limitations:**
- **Decisions made or pending:**
- **Next approved step:**

### Current repository baseline — audit v0.8 (7 November 2026)

**Latest inspected commit:** `961eb4bfadb20907afab1831326bdb1fb8151d36` (`feat(auth): implement Firebase authentication middleware`). This was the latest `main` commit observed during the review that produced this notebook update.

**Current files/features observed in the repository:**

- React application: `client/src/App.jsx`, `main.jsx`, `pages/DashboardPage.jsx`, `pages/NewTripPage.jsx`, `layouts/AppShell.jsx`, `context/AuthContext.jsx`, shared components and `styles/index.css`.
- Backend: `server/server.js`, `server/src/app.js`, health endpoint, Firebase Admin setup, auth middleware and user synchronization service.
- Database: `server/src/config/db.js` uses `pg.Pool`, parameterized SQL and an explicit transaction helper.
- Data baseline: eight relational PostgreSQL tables are represented by the SQL migration file; the AI Studio v0.8 report states 8 tables / 62 columns were verified in the Cloud SQL development database.
- Auth: demo preview personas are marked unauthenticated and rejected by the backend; `/api/auth/me` is protected. Live Google OAuth + database upsert remains not verified.
- UI: Dashboard and New Trip routes exist but are placeholders; no trip CRUD API or trip form/list/detail feature exists yet.
- Integrations: Leaflet is listed as a package, but MapView is not implemented. Open-Meteo and openrouteservice integrations are not implemented.
- Database tooling: `pg` is active. No `prisma` or `@prisma/client` dependency is present. `schema.prisma` is a legacy unused file and must not be represented as an ORM implementation.

**AI Studio audit evidence (reported, not independently re-run in this chat):**

- `node --test server/tests/stack.test.js`: 4 pass, 0 fail.
- Forbidden extension scan: 0 `.ts`, `.tsx` and `.mjs` files.
- Vite production build: PASS.
- Backend syntax/lint check: PASS.
- Browser smoke check on `/dashboard`: demo preview badge, preview persona selector and Google sign-in button visible; 0 console/page errors.

**Next approved work package:** Phase 2 — Trip CRUD using Express + `pg` parameterized SQL, owner/member access rules, validation and real React `.jsx` screens. Do not start Phase 3 itinerary features in the same phase.

### Phase 2 implementation entry

Not started. Append actual file changes, endpoint contracts, database queries, component explanations and test evidence only after the user approves and AI Studio completes Phase 2.

---

# 12. Phase 2 — Trip Management specification

## 12.1 Goal

Deliver the first end-to-end working RouteWise feature: authenticated users can create, list, view, edit and delete trips. The dashboard must display persisted PostgreSQL records, not sample/dummy trip data.

## 12.2 Phase 2 scope

**In scope:**

- `GET /api/trips` — list trips owned by the authenticated user or shared with them as an active member.
- `POST /api/trips` — create a trip; authenticated Firebase user is always the owner. Never accept `owner_user_id` or `createdBy` from the client.
- `GET /api/trips/:tripId` — read one trip for its owner or active member.
- `PATCH /api/trips/:tripId` — owner-only trip metadata update.
- `DELETE /api/trips/:tripId` — owner-only deletion after frontend confirmation; dependent records follow the existing FK cascade policy.
- Server-side access middleware for trip read and owner-only mutations.
- Input validation and safe error handling.
- React UI: create/edit form, saved trip list/cards and trip detail screen.
- Reuse the current LoadingState, ErrorState, EmptyState and ConfirmDialog components.
- Authentication token is acquired from Firebase; demo personas must never make protected database requests.
- Correct auth middleware so Firebase-token failures return 401, while PostgreSQL synchronization failures return a server/database error (e.g. 503) rather than being misreported as invalid credentials.
- Retire the unused legacy `schema.prisma` file and move the SQL baseline out of the misleading `server/prisma/` folder, preserving the exact DDL. Do not run the initial baseline again on the existing database.

**Out of scope:** itinerary CRUD, map rendering, weather, routing, expenses, split settlements, payments, invitations/email delivery and collaborative editing. These remain later phases.

## 12.3 Trip field contract

| Field | Type / rule | Required |
|---|---|---|
| `title` | String, trimmed, 1–150 characters | Yes |
| `destinationName` | String, trimmed, 1–180 characters | Yes |
| `description` | String or null; maximum 5,000 characters | No |
| `startDate` | Valid ISO calendar date `YYYY-MM-DD` | Yes |
| `endDate` | Valid ISO calendar date; must be on/after startDate | Yes |
| `currency` | Three uppercase ISO-style currency letters; default `INR` | No |
| `plannedBudget` | Decimal string/number accepted only when finite and >= 0; persist as PostgreSQL NUMERIC(12,2) | No; default `0.00` |

Do not add latitude/longitude to `trips` in this phase; the current relational design stores locations in `places`. Do not add new columns without an approved SQL migration and notebook update.

## 12.4 Authorization policy

- **Owner:** may read, update and delete the trip.
- **Active member:** may read the trip in this phase; future phases may grant itinerary/expense actions according to the role policy.
- **Viewer:** may read only.
- **Pending/inactive member:** cannot access the trip.
- **Non-member:** cannot access another user's private trip.
- **Demo preview persona:** always unauthenticated; protected API returns 401 and does not touch the database.
- The server derives user identity from `req.dbUser.id` set by verified Firebase auth. Never trust a user ID sent in the body, query or URL for ownership.
- For private trip lookups, consistently use either 404 for inaccessible/non-existent trips or a documented 403/404 policy; do not leak trip existence.

No member invitation UI is required in Phase 2. Existing `trip_members` rows should be used to enforce access; if test data is needed, create isolated fixtures safely and clean them up.

## 12.5 API contract

| Method | Path | Auth | Permission | Success |
|---|---|---|---|---|
| GET | `/api/trips` | Required | Owner + active member | `200 { "trips": [...] }` |
| POST | `/api/trips` | Required | Authenticated user creates own trip | `201 { "trip": {...} }` |
| GET | `/api/trips/:tripId` | Required | Owner + active member | `200 { "trip": {...} }` |
| PATCH | `/api/trips/:tripId` | Required | Owner only | `200 { "trip": {...} }` |
| DELETE | `/api/trips/:tripId` | Required | Owner only | `204 No Content` |

Use the existing error envelope convention `{ "error": "human-readable message" }` unless the phase introduces and documents a consistent structured error format. Expected status codes: 400 validation, 401 unauthenticated, 403/404 access denied according to chosen policy, 404 missing record, 409 database uniqueness/conflict where applicable, 500/503 server/database failure. Never return SQL text, passwords, connection details or stack traces.

## 12.6 SQL/data-layer implementation rules

- Use only `pg.Pool` from `server/src/config/db.js`.
- All values must use PostgreSQL placeholders `$1`, `$2`, etc.
- Do not add Prisma, Prisma Client, Sequelize, TypeORM, Mongoose or another ORM.
- Listing must include owned trips and active member trips without duplicate rows; use `EXISTS` or an equivalent duplicate-safe query.
- Dynamic `PATCH` must use a fixed field-to-column allowlist; never interpolate client-provided column names.
- Return selected columns explicitly; do not use `SELECT *` for API payloads.
- Use a transaction only when an operation contains multiple dependent writes. Simple one-row trip create/update/delete can use one parameterized statement.
- Map PostgreSQL `NUMERIC` values safely; do not coerce large currency values into imprecise arithmetic.
- Do not rerun the existing initial SQL baseline. If Phase 2 needs schema changes, create a new numbered SQL migration and explain why.

## 12.7 Frontend screens and components

- `client/src/pages/DashboardPage.jsx`: fetch authenticated user's trips; display real list, loading, error and empty states.
- `client/src/pages/NewTripPage.jsx`: render `TripForm.jsx`; create a persisted trip and navigate to its detail route or dashboard.
- `client/src/pages/TripDetailsPage.jsx`: display saved trip metadata and owner-only edit/delete actions.
- `client/src/components/TripForm.jsx`: create/edit form with accessible labels, field-level validation and pending/error states.
- `client/src/components/TripCard.jsx`: one saved trip summary linking to detail route.
- `client/src/components/TripList.jsx`: render cards and empty/loading/error states.
- `client/src/services/apiClient.jsx` (or another `.jsx` path approved before use): centralize API base URL, Firebase bearer token, JSON parsing and safe error normalization. Keep all frontend source file extensions `.jsx` as agreed.
- Keep the existing visual language and CSS conventions. Do not redesign the shell or add bright/vibrant colors.

## 12.8 Phase 2 tests and completion gate

At minimum, add and run:

- Authenticated user can create a trip; persisted row has the server-derived `owner_user_id`.
- User can list only owned and active-member trips.
- Owner can read, update and delete a trip.
- Active member/viewer can read but cannot update/delete trip metadata.
- Non-member cannot read another user's private trip.
- Missing/invalid Firebase token and demo persona receive 401 with zero database writes.
- Invalid date format, end-before-start, empty title/destination, too-long fields, negative budget and invalid currency are rejected.
- Dashboard loads real trips after refresh; no dummy trip data is used.
- Deleting a trip requires confirmation and the SQL FK cascade behaviour is verified in a disposable test fixture.
- Database failure during user synchronization is not reported as 401 invalid-token error.
- Production build, backend syntax/lint and all existing tests still pass.

Use an isolated test database/schema or uniquely tagged fixture rows. Never use `TRUNCATE`, reset or delete unknown data in the existing development Cloud SQL database. Record test commands and actual output. Phase 2 is complete only when API/database tests and browser workflow both pass and the notebook is updated with exact paths and code snippets.

---

# 13. Final submission checklist

- [ ] Final source code and repository structure match this notebook.
- [ ] SRS requirement statuses are backed by working screens/endpoints.
- [ ] DRD screen inventory and component registry contain real paths and explanations.
- [ ] ERD matches the actual PostgreSQL schema and versioned plain-SQL migrations.
- [ ] Architecture diagram matches the actual React → Express → pg → PostgreSQL runtime flow.
- [ ] Code snippet library contains short, actual, reviewed excerpts.
- [ ] Test register contains commands, outcomes and evidence—not just planned tests.
- [ ] Known limitations and future scope are stated honestly.
- [ ] No secrets or real private user data appear in submitted documentation.
- [ ] Final DOCX/PDF/PPT exports are generated from the latest Markdown notebook.

## Final stack lock (do not change without owner approval)

- Frontend: React JSX (`.jsx`) + CSS (`.css`).
- Backend: Node.js + Express (`.js`, ES Modules).
- Database: PostgreSQL / SQL.
- Database access: `pg` (node-postgres), parameterized SQL and PostgreSQL transactions.
- ORM: none.
- No TypeScript, TSX, `.mjs`, MongoDB, Mongoose, Prisma ORM or Prisma Client.

**End of living project notebook v0.9.**
