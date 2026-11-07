# RouteWise — Project Notebook

**Product name:** RouteWise  
**Tagline:** Smart Travel Planning  
**Project type:** BCA/MCA academic major project / full-stack web application  
**Team:** Naveed Mushtaq, Mohammad Shariq Khawaja, Nayeem  
**Planning window:** 2–3 months  
**Target cash budget:** ₹0, subject to provider limits and terms  
**Document version:** 0.3  
**Last updated:** 7 November 2026  
**Project status:** Planning baseline; implementation not yet verified  

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

**Use SQL instead of MongoDB.** Recommended database: **PostgreSQL**.

Reason: RouteWise has naturally related records—users, trips, trip members, itinerary days, activities, expenses and participant splits. PostgreSQL provides relational constraints, foreign keys, joins and transactions that are useful for maintaining these relationships and keeping financial records consistent.

## 2.2 Proposed application stack

| Layer | Technology | Purpose | Status |
|---|---|---|---|
| Frontend | React + Vite, JavaScript/JSX | Browser UI and reusable components | PROPOSED |
| Backend | Node.js + Express.js | REST API, validation, authorization and business logic | PROPOSED |
| Database | PostgreSQL | Relational persistent data | CONFIRMED direction |
| ORM / migrations | Prisma ORM + Prisma Migrate | Type-safe database access and versioned schema migrations | PROPOSED; confirm during Phase 0 |
| API style | REST + JSON | Frontend/backend communication | PROPOSED |
| Validation | Zod or a similarly maintained schema validator | Validate request payloads at API boundary | PROPOSED |
| Maps | Leaflet + an approved tile/geocoding provider | Display locations | PROPOSED; provider terms to verify |
| Weather | Open-Meteo or another suitable provider | Destination forecast lookup | PROPOSED; verify current terms and attribution |
| Testing | Vitest/Jest, Supertest and browser/manual testing | Unit, API and UI verification | PROPOSED |

After the SQL decision, the stack is called **PERN**: PostgreSQL, Express, React and Node. Do not describe the project as MERN in new documentation.

## 2.3 Development principles

- JavaScript and JSX are the default unless the existing workspace or supervisor requires TypeScript.
- Keep frontend, backend and database responsibilities separate.
- Never connect to PostgreSQL directly from browser code. The browser calls the backend API.
- Keep database credentials and private API keys on the server in environment variables.
- Use SQL migrations; do not modify production schema manually without a migration record.
- Use PostgreSQL `NUMERIC(12,2)` for money. Avoid binary floating-point arithmetic for currency; use Prisma Decimal or equivalent precise decimal handling.
- Store travel calendar dates as SQL `DATE`; store event/audit timestamps as `TIMESTAMPTZ` in UTC. Store planned local activity times as `TIME` where no timezone conversion is required.
- Use database foreign keys, unique constraints, check constraints and transactions where appropriate.
- Keep optional providers replaceable behind small service/adapter modules.

---

# 3. SRS — Software Requirements Specification

## 3.1 Purpose

This section defines functional and non-functional requirements for the RouteWise MVP. IDs should remain stable so that each requirement can be linked to implementation files and test cases.

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

The list below is the proposed component inventory. It is not evidence that the components already exist. After building each component, replace/extend the row with its real path and implementation notes.

| Component | Proposed path | Responsibility / where used | Why it exists | Status |
|---|---|---|---|---|
| `AppShell` | `client/src/components/layout/AppShell.jsx` | Shared page frame, navigation and content area; used on authenticated pages. | Prevents duplicated layout and keeps navigation consistent. | PROPOSED |
| `PageHeader` | `client/src/components/common/PageHeader.jsx` | Page title, subtitle and primary action. | Standardizes page hierarchy and action placement. | PROPOSED |
| `TripCard` | `client/src/features/trips/components/TripCard.jsx` | Shows a trip summary on dashboard/trip lists. | Reusable trip preview with consistent navigation. | PROPOSED |
| `TripForm` | `client/src/features/trips/components/TripForm.jsx` | Creates/edits trip details. | Shares field validation and submit logic. | PROPOSED |
| `BudgetSummary` | `client/src/features/expenses/components/BudgetSummary.jsx` | Shows planned, spent and remaining amounts. | Keeps money calculations and formatting consistent. | PROPOSED |
| `ItineraryDayCard` | `client/src/features/itinerary/components/ItineraryDayCard.jsx` | Groups activities for one date. | Mirrors the user's day-wise planning model. | PROPOSED |
| `ItineraryItem` | `client/src/features/itinerary/components/ItineraryItem.jsx` | Shows one scheduled activity/place. | Supports ordering and editing at activity level. | PROPOSED |
| `ActivityForm` | `client/src/features/itinerary/components/ActivityForm.jsx` | Adds/edits an itinerary item. | Keeps activity validation reusable. | PROPOSED |
| `MapView` | `client/src/features/map/components/MapView.jsx` | Displays coordinates and markers. | Isolates map library/provider-specific UI. | PROPOSED |
| `WeatherCard` | `client/src/features/weather/components/WeatherCard.jsx` | Displays destination forecast/status. | Separates external weather states from trip screens. | PROPOSED |
| `ExpenseForm` | `client/src/features/expenses/components/ExpenseForm.jsx` | Records title, amount, payer, category and optional splits. | Centralizes expense input and validation. | PROPOSED |
| `ExpenseList` | `client/src/features/expenses/components/ExpenseList.jsx` | Displays trip expenses. | Reusable list with edit/delete affordances. | PROPOSED |
| `SplitBreakdown` | `client/src/features/expenses/components/SplitBreakdown.jsx` | Shows participant shares and settlement status. | Makes group cost allocation understandable. | PROPOSED |
| `EmptyState` | `client/src/components/feedback/EmptyState.jsx` | Guides user when a list has no records. | Prevents blank/unexplained screens. | PROPOSED |
| `LoadingState` | `client/src/components/feedback/LoadingState.jsx` | Indicates ongoing operations. | Gives consistent asynchronous feedback. | PROPOSED |
| `ErrorState` | `client/src/components/feedback/ErrorState.jsx` | Explains recoverable failures. | Avoids silent failures and raw stack traces. | PROPOSED |
| `ConfirmDialog` | `client/src/components/feedback/ConfirmDialog.jsx` | Confirms destructive actions. | Reduces accidental deletion. | PROPOSED |

**Component documentation rule:** For every implemented component, record its real path, public props, internal state (if any), data/API dependency, screens that consume it, reason for reuse, accessibility notes and linked test IDs.

---

# 5. ERD — Entity Relationship Diagram and relational model

## 5.1 Database decision

- Database: PostgreSQL.
- ORM/migration tooling: Prisma is the proposed default, subject to confirmation in Phase 0.
- Primary keys: UUID.
- Foreign keys: enforce parent/child relationships in PostgreSQL.
- Money: `NUMERIC(12,2)`.
- Dates: `DATE` for trip/day calendar dates; timestamps use `TIMESTAMPTZ`.

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

## 5.3 Proposed tables and columns

### `users`

| Column | PostgreSQL type | Rule |
|---|---|---|
| `id` | UUID | Primary key, generated UUID |
| `full_name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, unique, normalized lowercase |
| `password_hash` | VARCHAR(255) | Required only if password auth is approved; never plaintext |
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
- Use `NUMERIC`/Prisma Decimal; do not use JavaScript floating-point addition for money.
- Never construct raw SQL by concatenating user input. Use Prisma parameterized queries or parameterized SQL.

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
Prisma ORM + Prisma Migrate
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
| Database layer | Prisma client, schema and migrations | `server/prisma/` and `server/src/db/` |
| Provider adapters | Weather/geocoding/routing external calls | `server/src/integrations/` |
| Tests | Unit, API and integration tests | `server/tests/` and feature test folders |

## 6.3 Proposed repository structure

```text
routewise/
  client/
    src/
      app/                 # app bootstrap, routes, providers
      components/          # shared layout and UI components
      features/
        auth/
        trips/
        itinerary/
        map/
        weather/
        expenses/
        members/
      services/api/         # API client
      hooks/
      styles/
      assets/
  server/
    prisma/
      schema.prisma
      migrations/
      seed.js               # optional demo data only
    src/
      app.js
      server.js
      routes/
      controllers/
      services/
      validators/
      middleware/
      db/
      integrations/
      utils/
    tests/
  docs/
    ROUTEWISE_PROJECT_NOTEBOOK.md
    api-contract.md
    decisions.md
  .env.example
  README.md
```

The folder tree is a proposal. AI Studio must adapt to an existing project instead of forcing a destructive restructure. In the actual file, use the exact filename `docs/ROUTEWISE_PROJECT_NOTEBOOK.md`.

## 6.4 Proposed REST API surface

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register (if email/password auth is approved) |
| POST | `/api/auth/login` | Login (if approved) |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Current account |
| GET | `/api/trips` | List accessible trips |
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/:tripId` | Read one authorized trip |
| PATCH | `/api/trips/:tripId` | Update trip |
| DELETE | `/api/trips/:tripId` | Delete trip |
| GET/POST | `/api/trips/:tripId/members` | List/add members |
| DELETE | `/api/trips/:tripId/members/:memberId` | Remove member |
| GET/POST | `/api/trips/:tripId/itinerary-days` | List/create days |
| PATCH/DELETE | `/api/itinerary-days/:dayId` | Update/delete day |
| POST | `/api/itinerary-days/:dayId/items` | Add activity |
| PATCH/DELETE | `/api/itinerary-items/:itemId` | Update/delete activity |
| GET/POST | `/api/trips/:tripId/expenses` | List/create expenses |
| PATCH/DELETE | `/api/expenses/:expenseId` | Update/delete expense |
| GET | `/api/weather?lat=&lon=` | Weather lookup through server adapter |
| GET | `/api/places/search?q=` | Place search if approved provider supports it |

These paths are proposed API contracts, not implemented endpoints. Add exact request/response examples to `docs/api-contract.md` when routes are built.

---

# 7. Testing and quality plan

## 7.1 Test levels

- **Unit:** date validation, currency-safe calculations, budget totals, split allocation and permission helpers.
- **API integration:** valid/invalid payloads, CRUD, unauthenticated requests, unauthorized trip access, database constraints and transaction rollback.
- **UI/manual:** navigation, forms, loading/error/empty states, responsive layout and complete trip workflow.
- **Regression:** re-run core trip → itinerary → expense scenario after changes to related modules.

## 7.2 Initial test register

| Test ID | Requirement | Scenario | Expected result | Actual result / evidence | Status |
|---|---|---|---|---|---|
| TC-01 | FR-02 | Create trip with valid values | One trip is persisted and returned. | Pending | NOT RUN |
| TC-02 | FR-03 | End date earlier than start date | Validation error; no invalid row saved. | Pending | NOT RUN |
| TC-03 | FR-08 | Trip has coordinates | Map displays a marker; fallback shown if provider fails. | Pending | NOT RUN |
| TC-04 | FR-11 | Add itinerary day outside trip dates | Rejected or handled according to approved rule. | Pending | NOT RUN |
| TC-05 | FR-14 | Add expense of ₹500 | Exactly ₹500 is persisted once. | Pending | NOT RUN |
| TC-06 | FR-16 | Split ₹500 among participants | Split shares total exactly ₹500. | Pending | NOT RUN |
| TC-07 | NFR-05 | User requests another user's private trip | API returns forbidden/not found according to security design. | Pending | NOT RUN |
| TC-08 | FR-10 | Weather provider is unavailable | Saved trip data remains usable and safe fallback appears. | Pending | NOT RUN |

Record command, environment, date, expected/actual result and evidence path when each test is run. Do not claim a test passed from code inspection alone.

---

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

## 8.2 Planned snippet slots

| Snippet ID | Planned example | Proposed path | Status |
|---|---|---|---|
| CS-01 | Shared React app shell and route configuration | `client/src/app/` | PLACEHOLDER |
| CS-02 | TripForm with validation and API call | `client/src/features/trips/components/TripForm.jsx` | PLACEHOLDER |
| CS-03 | Express trip route/controller/service | `server/src/routes/tripRoutes.js`, `server/src/services/tripService.js` | PLACEHOLDER |
| CS-04 | Prisma schema and first SQL migration | `server/prisma/schema.prisma`, `server/prisma/migrations/` | PLACEHOLDER |
| CS-05 | Expense creation transaction and split validation | `server/src/services/expenseService.js` | PLACEHOLDER |
| CS-06 | Weather provider adapter and failure handling | `server/src/integrations/weather/` | PLACEHOLDER |
| CS-07 | Unit/API test for expense split total | `server/tests/` | PLACEHOLDER |

Do not fill these with fabricated implementation examples. Add real source excerpts only after their files are created and reviewed.

---

# 9. Phased implementation plan for AI Studio

| Phase | Work package | Completion gate |
|---|---|---|
| 0 | Inspect workspace/repository; confirm build setup, runtime, PostgreSQL/Prisma compatibility, auth choice and notebook location. | Existing files and constraints reported; no destructive changes. |
| 1 | Build application shell, navigation, responsive design tokens and page placeholders with reusable feedback components. | All routes render; responsive smoke check passes; notebook/component registry updated. |
| 2 | Set up Express API, PostgreSQL connection, Prisma schema/migration, health endpoint and trip CRUD. | Migration applies; trip CRUD tests pass against PostgreSQL. |
| 3 | Implement itinerary days/items and ordering. | Date, ownership and ordering tests pass. |
| 4 | Implement budget, expenses and split transactions. | Decimal-safe totals and split reconciliation tests pass. |
| 5 | Add map/place and weather integration with provider adapters and failure states. | Attribution/terms checked; provider failure does not break core app. |
| 6 | Security, responsive polish, accessibility, regression tests and deployment preparation. | Release checklist and evidence complete. |

**Build in parts:** do not start the next phase until the user requests it or explicitly approves the phase gate. If a decision blocks the current phase, ask one focused question rather than silently guessing.

---

# 10. Decision register

| ID | Decision | Current choice | Status / rationale |
|---|---|---|---|
| ADR-001 | Database type | SQL instead of MongoDB | CONFIRMED by user on 7 Nov 2026. |
| ADR-002 | SQL database | PostgreSQL | RECOMMENDED baseline; confirm during Phase 0. Chosen for relational integrity and transactions. |
| ADR-003 | ORM/migrations | Prisma ORM + Prisma Migrate | PROPOSED; confirm after inspecting AI Studio workspace and backend. |
| ADR-004 | Stack naming | PERN (PostgreSQL, Express, React, Node) | CONFIRMED consequence of ADR-001. Do not write MERN in current docs. |
| ADR-005 | Frontend language | JavaScript + JSX | PROPOSED default; preserve existing codebase conventions if already established. |
| ADR-006 | Authentication | Email/password or guest/demo | TO CONFIRM before protected auth code. |
| ADR-007 | Member editing permissions | Owner-only or member roles | TO CONFIRM before collaboration implementation. |
| ADR-008 | Map/geocoding provider | Leaflet plus provider selected after policy review | TO CONFIRM; check terms, attribution, quotas and privacy. |
| ADR-009 | Weather provider | Open-Meteo candidate | TO CONFIRM; check current usage terms and attribution at build time. |
| ADR-010 | Hosting | Select only after checking current free tier and PostgreSQL support | TO CONFIRM; ₹0 is target, not guarantee. |

---

# 11. Implementation log — append after every AI Studio phase

Use one entry per phase; keep newest entry first.

### Phase entry template

- **Date:** YYYY-MM-DD
- **Phase:** P0/P1/…
- **Status:** IN PROGRESS / IMPLEMENTED / VERIFIED / BLOCKED
- **Objective:**
- **Files created:**
- **Files modified:**
- **Components added/changed:**
- **Component usage:** component → imported by → screen/parent → reason
- **Database changes:** schema fields, migration name, constraints, indexes
- **API changes:** method, path, request/response, authorization
- **How it works:** concise data flow and important logic
- **Why this approach:** design/technical rationale
- **Code snippet IDs:**
- **Tests run:** command, expected, actual, pass/fail
- **Evidence paths:** screenshots/logs/test reports
- **Known bugs / limitations:**
- **Decisions made or pending:**
- **Next approved step:**

### Current implementation log

No application implementation has been verified yet. The project is at the planning and technical-baseline stage. Do not treat this notebook, prompt or proposed schema as evidence that the application has been built.

---

# 12. Final submission checklist

- [ ] Final source code and repository structure match this notebook.
- [ ] SRS requirement statuses are backed by working screens/endpoints.
- [ ] DRD screen inventory and component registry contain real paths and explanations.
- [ ] ERD matches the actual Prisma schema and PostgreSQL migrations.
- [ ] Architecture diagram matches actual runtime/deployment flow.
- [ ] Code snippet library contains short, actual, reviewed excerpts.
- [ ] Test register contains commands, outcomes and evidence—not just planned tests.
- [ ] Known limitations and future scope are stated honestly.
- [ ] No secrets or real private user data appear in submitted documentation.
- [ ] Final DOCX/PDF/PPT exports are generated from the latest Markdown notebook.

**End of planning baseline v0.3.**
