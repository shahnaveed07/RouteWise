# RouteWise — Project Notebook

**Product name:** RouteWise  
**Tagline:** Smart Travel Planning  
**Project type:** BCA/MCA academic major project / full-stack web application  
**Team:** Naveed Mushtaq, Mohammad Shariq Khawaja, Nayeem  
**Planning window:** 2–3 months  
**Target cash budget:** ₹0, subject to provider limits and terms  
**Document version:** 0.16 (Phase 6 Trip Collaboration, Invitations & Member Role Management)  
**Last updated:** 8 November 2026  
**Project status:** Phases 0–6 `IMPLEMENTED AND VERIFIED` (PostgreSQL Trip CRUD + Leaflet/OSM Map + Open-Meteo Geocoding/Weather + Day-Wise Itinerary CRUD/Reordering + Safe Date-Range Reconciliation + Trip-Switch State Isolation + Routing Adapter & Mock-Route Transparency + Trip Budget, Expense Management, Category Analytics, Group Splits & Settlement Tracking + Trip Collaboration, Shareable Email Invitations & Member Role Management; Live openrouteservice HTTP Integration `IMPLEMENTED BUT NOT VERIFIED` pending `OPENROUTESERVICE_API_KEY`; Outbound Email Delivery `PLANNED` — current invitations use manual shareable links `/invitations/accept#token=...`)  

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
| 0.3 | 7 Nov 2026 | Replaced MongoDB/MERN proposal with PostgreSQL/PERN and a relational ERD. | `PLANNED` |
| 0.7 | 7 Nov 2026 | Workspace migrated to React JSX (`.jsx`) and standard Node.js/Express JavaScript modules (`.js`); TypeScript/TSX removed. | `IMPLEMENTED AND VERIFIED` |
| 0.8 | 7 Nov 2026 | Repository audit corrected auth/demo-persona handling, added `/api/auth/me`, SQL baseline file and strict 5-label implementation statuses. | `IMPLEMENTED AND VERIFIED` |
| 0.9 | 7 Nov 2026 | Locked `pg` (`node-postgres`) as the sole runtime database access layer; retired Prisma ORM claims; defined Phase 2 Trip CRUD implementation gate. | `IMPLEMENTED AND VERIFIED` |
| 0.10 | 7 Nov 2026 | Completed Phase 2 Trip Management (CRUD): moved SQL baseline to `server/database/migrations/0001_initial_baseline.sql`, removed legacy `server/prisma/schema.prisma`, separated 401 token errors from 503 DB sync errors in `requireAuth`, built Trip CRUD backend/frontend, and verified against live Cloud SQL PostgreSQL. | `IMPLEMENTED AND VERIFIED` |
| 0.11 | 7 Nov 2026 | Completed Phase 3 Destination Location, Interactive Maps, Geocoding & Weather Integration: applied `0002_trip_destination_coordinates.sql`, added Open-Meteo Geocoding (`GET /api/locations/search`) & Forecast (`GET /api/weather`) adapters, built `MapView.jsx` (Leaflet + OpenStreetMap), `DestinationSearch.jsx`, and `WeatherCard.jsx`, and registered Phase 4 openrouteservice config. | `IMPLEMENTED AND VERIFIED` |
| 0.12 | 7 Nov 2026 | Completed Phase 3.1 Map Display, Destination Selection & Weather Stabilization: hardened `WeatherCard.jsx` coordinate-key isolation and `AbortController` race protection; added `AbortController`, monotonic `requestSeqRef`, keyboard combobox/listbox navigation, and `autoSearchOnMount` to `DestinationSearch.jsx`; hardened Leaflet container stacking context (`isolation: isolate`), resize invalidation, and inline coordinate change on `TripDetailsPage.jsx`; gated local E2E auth bypass behind `ROUTEWISE_ENABLE_LOCAL_E2E_AUTH=true` + `/api/auth/me` verification; separated deterministic `npm test` (`16 pass, 0 fail, 1 skipped`) from opt-in live provider smoke tests (`npm run test:providers`, `7 pass, 0 fail`). | `IMPLEMENTED AND VERIFIED` |
| 0.13 | 7 Nov 2026 | Completed Phase 4 Day-Wise Itinerary Management & Multi-Stop Route Planning: built `itineraryValidator.js`, `itineraryService.js`, `routingService.js`, `itineraryController.js`, `itineraryRoutes.js`, `requireItineraryEditor` RBAC, and frontend `/trips/:tripId/itinerary`. | `IMPLEMENTED AND VERIFIED` |
| 0.14 | 7 Nov 2026 | Completed Phase 4.1 Routing Verification, Itinerary Data Safety & State Stabilization: added explicit mock-route metadata (`isMock: true`, `source: "LOCAL_E2E_MOCK"`, `attribution: null`) and production-disabled gating (`isLocalE2eMockRoutingAllowed`) in `routingService.js`; updated `RouteSummary.jsx` and `ItineraryMap.jsx` to display `SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS`, suppress simulated numbers from being shown as real navigation distances/times, and separate OpenStreetMap tile attribution from openrouteservice route attribution; hardened `initializeTripItinerary()` in `itineraryService.js` to inspect out-of-range days before any `day_order` shift and reject with `409 Conflict` (`ITINERARY_OUTSIDE_RANGE_HAS_DATA`) when out-of-range days contain activities or notes while safely deleting empty out-of-range days; fixed `ItineraryPage.jsx` trip-switching state isolation (`autoInitTripIdRef`, `AbortController`, `loadRequestSeqRef`, `routeRequestSeqRef`, and in-page trip switcher); corrected Phase 4 test classifications and live openrouteservice status (`IMPLEMENTED BUT NOT VERIFIED` pending `OPENROUTESERVICE_API_KEY`). | `IMPLEMENTED AND VERIFIED` |
| 0.15 | 8 Nov 2026 | Completed Phase 5 Trip Budget, Expense Management, Category Analytics, Group Splits & Settlement Tracking: applied `0003_expense_settlement_audit.sql` adding `settled_at` and `settled_by_user_id` to `expense_splits`; built `moneyUtils.js` (`BigInt` minor-unit arithmetic and deterministic equal split `splitAmountEqually`), `expenseValidator.js` (8-category allowlist, equal & custom split validation), `expenseService.js` (transactional expense & split CRUD, `409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED` financial edit guard, category analytics, participant balance matrix, and outstanding pairwise debts), `expenseController.js`, and `expenseRoutes.js`; built `/trips/:tripId/expenses` (`ExpensesPage.jsx`, `BudgetOverview.jsx`, `CategoryBreakdown.jsx`, `GroupSettlementPanel.jsx`, `ParticipantBalanceCard.jsx`, `ExpenseForm.jsx`, `ExpenseSplitEditor.jsx`, `ExpenseList.jsx`, `ExpenseCard.jsx`) and verified with `npm test` (`22 pass, 0 fail, 2 skipped`) and Chromium Playwright E2E tests. | `IMPLEMENTED AND VERIFIED` |
| 0.16 | 8 Nov 2026 | Completed Phase 6 Trip Collaboration, Invitations & Member Role Management: applied `0004_trip_invitations.sql` creating `trip_invitations` (12 columns, `UNIQUE (token_hash)`, partial unique index `uq_trip_invitations_pending_trip_email` on `(trip_id, invited_email) WHERE status = 'pending'`); built `memberValidator.js`, `invitationValidator.js`, `memberService.js` (active member listing, owner-only `member <-> viewer` role updates, and non-destructive member deactivation `membership_status = 'inactive'` preserving historical itinerary and expense records), `invitationService.js` (32-byte `base64url` token generation, SHA-256 `token_hash` storage, automatic 7-day expiration transitions, transactional `FOR UPDATE` accept/decline with verified email matching and `ON CONFLICT (trip_id, user_id) DO UPDATE` reactivation), `memberController.js`, `invitationController.js`, `memberRoutes.js`, and `invitationRoutes.js`; built `/trips/:tripId/members` (`TripMembersPage.jsx`), `/invitations/accept` (`TripInvitationPage.jsx`), and `memberService.jsx`; updated `TripDetailsPage.jsx` (`Manage Members` button and accurate `Member (Can Edit Itinerary & Expenses)` role explanation) and `ParticipantBalanceCard.jsx` (`Former Member (Inactive)` badge); verified with `npm test` (`28 tests: 26 pass, 0 fail, 2 skipped`), `npm run lint`, `npm run build`, and Chromium Playwright E2E verification. | `IMPLEMENTED AND VERIFIED` |

---

# 1. Project overview

## 1.1 Product summary

RouteWise is a web application intended to help people organize a trip in one workspace. Users can create trips, search and confirm destination coordinates, explore destinations on an interactive Leaflet/OpenStreetMap view, check live destination weather via Open-Meteo, prepare day-wise itineraries, set a budget, record actual expenses and keep track of shared group costs.

**One-line description:** RouteWise helps travellers plan where to go, when to go and how to manage the cost of the journey.

## 1.2 User-facing map visibility prerequisites (Why a user may or may not see a map)

The interactive map is intentionally placed in specific trip workflows and requires verified coordinates:
1. **Dashboard (`/dashboard`):** Does **not** render a full slippy map. Instead, each `TripCard.jsx` displays a readiness badge (`Map & Weather Ready` when coordinates are saved vs `Location Unverified` when coordinates are `NULL`).
2. **Authentication Requirement:** When browsing in default **UI Preview Mode** (`DEMO PREVIEW — NOT AUTHENTICATED` as `Naveed Mushtaq`, `Mohammad Shariq Khawaja`, or `Nayeem`), protected APIs (`/api/trips`, `/api/locations/search`, `/api/weather`) are blocked (`401`) and `/trips/new` displays a sign-in prompt rather than `TripForm.jsx`.
3. **Create Trip (`/trips/new`):** An authenticated user must type at least 3 characters into the **Destination** field and **select a specific geocoded place** from the Open-Meteo dropdown (e.g., `Srinagar, Jammu and Kashmir, India`). Free-text entry alone is never silently geocoded or guessed. Once a candidate is selected, `destinationName`, `destinationLatitude`, and `destinationLongitude` are set together and a compact `MapView.jsx` preview (`230px` height) renders immediately.
4. **Trip Details (`/trips/:tripId`):**
   - If the saved trip has valid coordinates, `TripDetailsPage.jsx` renders the full interactive Leaflet + OpenStreetMap map (`360px` height) with a custom SVG marker and popup alongside `WeatherCard.jsx` (current conditions + 5-day forecast).
   - If an older or manually typed trip has `NULL` coordinates, `MapView.jsx` shows `"Map Coordinates Not Set"` and the trip owner can click **`+ Confirm Destination Location`** (which automatically searches the trip's destination text on mount), select a candidate, preview the map, and save confirmed coordinates without recreating the trip.
   - If coordinates already exist, the trip owner can also click **`Change Destination Location`** (or **`Edit Trip`**) to select a new geocoded destination, immediately updating both the map marker/tiles and the weather forecast.

---

# 2. Technology decisions & External Service Registry

## 2.1 Confirmed application stack

| Layer | Technology | File format / responsibility | Status |
|---|---|---|---|
| Frontend | React 19 + Vite + React Router v7 | React UI components/pages/services under `client/src/` use `.jsx`; styles use `.css` | `IMPLEMENTED AND VERIFIED` |
| Backend | Node.js + Express.js | Standard JavaScript ES Modules in `.js` files (`server/server.js`, `server/src/**/*.js`) | `IMPLEMENTED AND VERIFIED` |
| Database | PostgreSQL (`ai-studio-de6d6586` in `asia-southeast1`) | Relational SQL database | `IMPLEMENTED AND VERIFIED` |
| Database access | `pg` (`node-postgres`) | `pg.Pool`, parameterized SQL (`$1, $2, ...`), explicit transactions (`withTransaction`) | `IMPLEMENTED AND VERIFIED` |
| ORM | None | Raw parameterized SQL runs directly through `pg` | `IMPLEMENTED AND VERIFIED` |
| Authentication | Firebase Google Sign-In + Firebase Admin token verification | `requireAuth` (`server/src/middleware/auth.js`) returns `401` on invalid/missing/demo tokens and `503` if PostgreSQL user sync fails. Local Playwright E2E bypass is disabled by default (`ROUTEWISE_ENABLE_LOCAL_E2E_AUTH="false"`). | `IMPLEMENTED AND VERIFIED` (Middleware, DB upsert & E2E safety); live interactive Google popup `IMPLEMENTED BUT NOT VERIFIED` |
| Interactive Maps | Leaflet (`leaflet ^1.9.4`) + OpenStreetMap standard tiles | `client/src/components/MapView.jsx`, `client/src/components/ItineraryMap.jsx`, `client/src/services/mapConfig.jsx` | `IMPLEMENTED AND VERIFIED` |
| Destination Geocoding | Open-Meteo Geocoding API | `server/src/services/geocodingService.js`, `GET /api/locations/search` | `IMPLEMENTED AND VERIFIED` |
| Destination Weather | Open-Meteo Forecast API | `server/src/services/weatherService.js`, `GET /api/weather` | `IMPLEMENTED AND VERIFIED` |
| Multi-Stop Routing | openrouteservice (HeiGIT) | `server/src/services/routingService.js`, `POST /api/trips/:tripId/itinerary/days/:dayId/route`, `client/src/components/ItineraryMap.jsx`, `RouteProfileSelector.jsx`, `RouteSummary.jsx` | Adapter, `[lon, lat]` payload construction, error mapping (`400`/`422`/`429`/`502`/`503`), and mock-vs-real UI separation `IMPLEMENTED AND VERIFIED`; live external openrouteservice HTTP call `IMPLEMENTED BUT NOT VERIFIED` (blocked on `OPENROUTESERVICE_API_KEY` not configured in environment) |

## 2.2 External Service Registry (Terms, Quotas, Attribution & Production Risks)

| Service / Provider | Real Endpoint Used | API Key Required? | Free / Non-Commercial Terms & Rate Limits | Required Attribution | Production-Readiness Risks & Constraints | Status |
|---|---|---|---|---|---|---|
| **OpenStreetMap Standard Tile Server** (rendered via `leaflet`) | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (configured in `client/src/services/mapConfig.jsx`) | No | Free for non-commercial / low-volume academic MVP use under the [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/). Bulk downloading, offline tile scraping, or automated prefetching is strictly forbidden. | `© OpenStreetMap contributors` linked to `https://www.openstreetmap.org/copyright` (displayed in Leaflet attribution control and `.map-attribution-bar`, kept strictly separate from route-provider attribution). | **No commercial SLA or unlimited capacity.** Public OSM tile servers are volunteer-run; high-traffic or commercial deployment must substitute `MAP_CONFIG.tileUrlTemplate` with a dedicated/commercial tile provider. | `IMPLEMENTED AND VERIFIED` |
| **Open-Meteo Geocoding API** | `https://geocoding-api.open-meteo.com/v1/search` (via backend `server/src/services/geocodingService.js`) | No (non-commercial tier) | Free for non-commercial / academic use only. Fair-use rate limit of ~10,000 API calls/day. Bounded 10-minute TTL in-memory cache (`max 100 entries`), 350ms frontend debounce, and client `AbortController` reduce repeat requests. | Open-Meteo (`CC BY 4.0`). | **Non-commercial license only; no guaranteed SLA.** Commercial deployment requires a paid Open-Meteo API subscription key and commercial host. | `IMPLEMENTED AND VERIFIED` |
| **Open-Meteo Forecast API** | `https://api.open-meteo.com/v1/forecast` (via backend `server/src/services/weatherService.js`) | No (non-commercial tier) | Free for non-commercial / academic use only (`CC BY 4.0`). Requests 5-day daily outlook and current conditions with `timezone=auto` and an `8000ms` `AbortController` timeout. | `Weather data by Open-Meteo` linked to `https://open-meteo.com/` (`CC BY 4.0 (Non-commercial use)`). | **Non-commercial license only; no guaranteed SLA.** Weather failures are isolated inside `WeatherCard.jsx` and never block `MapView.jsx` or Trip CRUD. | `IMPLEMENTED AND VERIFIED` |
| **openrouteservice (HeiGIT)** | `POST https://api.heigit.org/openrouteservice/v2/directions/{profile}/geojson` (`driving-car`, `foot-walking`, `cycling-regular`) | Yes: `OPENROUTESERVICE_API_KEY` (server-side only; never exposed to browser) | Free standard quota subject to HeiGIT registration and per-minute/daily token limits. **Important:** The legacy `api.openrouteservice.org` host was deprecated (shutdown Nov 2026) and is never used. Coordinates are sent in `[longitude, latitude]` order. | `Route directions by openrouteservice.org by HeiGIT` (`https://openrouteservice.org/`), rendered in `RouteSummary.jsx` **only** when `isMock === false` and `source === 'OPENROUTESERVICE'`. | If `OPENROUTESERVICE_API_KEY` is missing or placeholder in `.env`, `routingService.js` returns HTTP `503` (`ROUTING_KEY_MISSING`) by default. Controlled local E2E mock routing (`LOCAL_E2E_MOCK`) is gated behind `NODE_ENV !== 'production'`, `ROUTEWISE_ENABLE_LOCAL_E2E_AUTH === 'true'`, and `ROUTEWISE_ENABLE_LOCAL_E2E_ORS_MOCK === 'true'`, and explicitly sets `isMock: true` and `attribution: null`. | Adapter & error handling `IMPLEMENTED AND VERIFIED`; live external API call `IMPLEMENTED BUT NOT VERIFIED` (`OPENROUTESERVICE_API_KEY` not configured in environment) |

---

# 3. SRS — Software Requirements Specification

| ID | Requirement | Priority | Acceptance criteria | Current Evidence | Status |
|---|---|---|---|---|---|
| FR-01 | Account access | High | Firebase ID token verified by `requireAuth`; demo tokens return `401`; DB sync failures return `503` (not `401`). Local E2E bypass disabled by default and impossible in production. | `server/src/middleware/auth.js`, `server/tests/stack.test.js` (`TC-00`, `TC-13`) | `IMPLEMENTED BUT NOT VERIFIED` (Backend middleware, DB sync & E2E guard verified; live interactive Google OAuth popup pending human login) |
| FR-02 | Create trip | High | Valid title, destination (with optional verified coordinate pair) and travel dates create one trip row in PostgreSQL with `owner_user_id = req.dbUser.id`. | `POST /api/trips`, `server/src/services/tripService.js`, `client/src/pages/NewTripPage.jsx`, `TC-01` | `IMPLEMENTED AND VERIFIED` |
| FR-03 | Edit trip | High | Owner can update trip details and attach/update destination coordinates via `PATCH /api/trips/:tripId`; invalid date ranges or unpaired coordinates rejected (`400`). | `PATCH /api/trips/:tripId`, `server/src/validators/tripValidator.js`, `TC-02`, `TC-03` | `IMPLEMENTED AND VERIFIED` |
| FR-04 | List trips | High | Authenticated user sees owned and active-shared trips without duplicates; pending/unrelated users excluded. | `GET /api/trips`, `client/src/pages/DashboardPage.jsx`, `TC-05`, `TC-06` | `IMPLEMENTED AND VERIFIED` |
| FR-05 | Delete trip | Medium | Authorized owner can delete a trip (`DELETE /api/trips/:tripId` → `204`) after confirmation in `ConfirmDialog.jsx`; dependent records cascade. | `DELETE /api/trips/:tripId`, `ConfirmDialog.jsx`, `TC-04` | `IMPLEMENTED AND VERIFIED` |
| FR-06 | Trip member collaboration, invitations & role management | High | Trip `owner` can invite users by email with role `member` or `viewer` (`POST /api/trips/:tripId/invitations`), generating a cryptographically random 32-byte `base64url` token (`token_hash` stored as SHA-256 hex in `trip_invitations`, default 7-day expiry) and shareable URL `/invitations/accept#token=...` with explicit notice `"Invitation link created — share this link with the invited person."` (no fake email sending claim). Authenticated user whose verified email matches `invited_email` can accept (`POST /api/trip-invitations/accept`, upserting/reactivating `trip_members` with `ON CONFLICT (trip_id, user_id) DO UPDATE`) or decline (`POST /api/trip-invitations/decline`). Owner can list/revoke invitations, change member roles (`member <-> viewer`), and non-destructively remove members (`membership_status = 'inactive'`), preserving historical `users`, `itinerary_items`, `expenses`, `expense_splits`, and settlement audit records. | `0004_trip_invitations.sql`, `memberService.js`, `invitationService.js`, `TripMembersPage.jsx`, `TripInvitationPage.jsx`, `TC-22`..`TC-24` | `IMPLEMENTED AND VERIFIED` (Manual shareable link flow `IMPLEMENTED AND VERIFIED`; automated outbound SMTP/email delivery `PLANNED`) |
| FR-07 | Destination coordinates & selection | High | User types `>= 3` chars and explicitly selects a geocoded candidate from `GET /api/locations/search`. Stores paired WGS84 `destination_latitude` (`NUMERIC(9,6)`) and `destination_longitude` (`NUMERIC(9,6)`). Editing destination text immediately clears stale coordinates and results. Out-of-order responses are cancelled/ignored via `AbortController` and `requestSeqRef`. | `0002_trip_destination_coordinates.sql`, `tripValidator.js`, `DestinationSearch.jsx`, `TC-09`, `TC-10`, `TC-12` | `IMPLEMENTED AND VERIFIED` |
| FR-08 | Map view | High | Saved destinations with valid coordinates render an interactive Leaflet + OpenStreetMap map (`MapView.jsx`) on Create Trip (compact preview) and Trip Details (full map) with marker, popup, zoom controls, resize observer, and OSM attribution; trips without coordinates show a clear empty state and owner-only `+ Confirm Destination Location` flow. | `client/src/components/MapView.jsx`, `TripDetailsPage.jsx`, Playwright browser verification (`TC-12`) | `IMPLEMENTED AND VERIFIED` |
| FR-09 | Weather lookup | High | Saved destinations with valid coordinates display live current conditions and 5-day forecast from Open-Meteo (`GET /api/weather`) with WMO condition labels and attribution. Weather state is strictly keyed to the current coordinate pair (`buildCoordinateWeatherKey`) so changing coordinates never shows stale weather from a previous destination. | `server/src/services/weatherService.js`, `client/src/components/WeatherCard.jsx`, `TC-10`, `TC-11`, `TC-12` | `IMPLEMENTED AND VERIFIED` |
| FR-10 | Provider failure handling | High | Geocoding, weather, and map tile errors/timeouts (`AbortController` 8s timeout, `429`, `502`, `504`) show safe retryable messages and fail independently without breaking Trip CRUD or other panels. | `geocodingService.js`, `weatherService.js`, `WeatherCard.jsx`, `MapView.jsx`, `TC-09`, `TC-11` | `IMPLEMENTED AND VERIFIED` |
| FR-11 | Create & safely synchronize itinerary days | High | A trip initializes one `itinerary_days` record per date from `start_date` to `end_date` (`day_order = 1..N`) idempotently inside a PostgreSQL transaction. When trip dates change, `initializeTripItinerary()` inspects out-of-range days **before** any `day_order` shift or deletion: if any out-of-range day has activities (`item_count > 0`) or non-empty notes, it rejects with HTTP `409 Conflict` (`ITINERARY_OUTSIDE_RANGE_HAS_DATA`) and rolls back without changing `day_order` or deleting data; if out-of-range days are empty, it deletes only those empty days, creates missing in-range dates, and renumbers `1..N`. | `POST /api/trips/:tripId/itinerary/initialize`, `server/src/services/itineraryService.js`, `ItineraryPage.jsx`, `TC-14`, `TC-17` | `IMPLEMENTED AND VERIFIED` |
| FR-12 | Manage itinerary activity & multi-stop route | High | Owner and active `member` can add, edit, delete, and reorder activities (`itinerary_items`) with optional geocoded `places` (`ON CONFLICT (provider, provider_place_id)`) and exact `BigInt` minor-unit cost totals; `viewer` is read-only (`403` on mutations); switching between trips on `/trips/:tripId/itinerary` resets trip-scoped state cleanly (`AbortController`, `autoInitTripIdRef`); `POST .../route` calculates multi-stop GeoJSON `LineString` routes via openrouteservice (`[lon, lat]`) and explicitly distinguishes simulated local E2E mock routes (`isMock: true`, `source: "LOCAL_E2E_MOCK"`) from real openrouteservice routes (`isMock: false`, `source: "OPENROUTESERVICE"`). | `server/src/services/itineraryService.js`, `routingService.js`, `ItineraryPage.jsx`, `RouteSummary.jsx`, `TC-14`..`TC-17` | Itinerary CRUD, RBAC, trip-switch isolation & routing adapter/UI `IMPLEMENTED AND VERIFIED`; live external openrouteservice HTTP call `IMPLEMENTED BUT NOT VERIFIED` (pending `OPENROUTESERVICE_API_KEY`) |
| FR-13 | Set & monitor budget | High | Owner can save/update a non-negative `NUMERIC(12,2)` planned budget and 3-letter currency (`INR` default) on Trip Details or inline on `/trips/:tripId/expenses` (`BudgetOverview.jsx`). Displays `plannedBudget`, `totalExpenses`, `remainingBudget` (negative when over budget), `budgetUsagePercentage` (`null` when `plannedBudget === "0.00"`), `budgetStatus` (`NO_PLANNED_BUDGET`, `WITHIN_BUDGET`, `OVER_BUDGET`), and separate `itineraryEstimatedTotal`. | `tripValidator.js`, `expenseService.js`, `BudgetOverview.jsx`, `TC-01`, `TC-08`, `TC-19`..`TC-21` | `IMPLEMENTED AND VERIFIED` |
| FR-14 | Record & categorize expense | High | Owner and active `member` can record an expense (`POST /api/trips/:tripId/expenses`) with title (`1..180` chars), positive `NUMERIC(12,2)` amount (`0.01..9999999999.99`), server-validated category (`accommodation`, `transport`, `food`, `activities`, `shopping`, `fuel`, `tickets`, `other`), valid `YYYY-MM-DD` date, optional notes (`max 2000` chars), active participant `paidByUserId`, and server-derived `created_by_user_id = req.dbUser.id`. `viewer` is read-only (`403`). | `expenseValidator.js`, `expenseService.js`, `ExpenseForm.jsx`, `TC-19`..`TC-21` | `IMPLEMENTED AND VERIFIED` |
| FR-15 | Calculate totals, category breakdown & participant balances | High | All financial totals (`totalExpenses`, `remainingBudget`, `categoryBreakdown` sorted by highest spending, `participantBalances` with `totalPaid`, `totalShare`, `pendingToPay`, `pendingToReceive`, `netOutstanding`, and `settlementSummary` with `outstandingDebts` and `unsettledSplits`) are calculated server-side from PostgreSQL records using exact `BigInt` minor-unit arithmetic (`moneyUtils.js`). Itinerary estimated costs (`itinerary_items.estimated_cost`) are kept strictly separate from actual `expenses`. | `moneyUtils.js`, `expenseService.js`, `CategoryBreakdown.jsx`, `GroupSettlementPanel.jsx`, `ParticipantBalanceCard.jsx`, `TC-19`..`TC-21` | `IMPLEMENTED AND VERIFIED` |
| FR-16 | Split expense & track settlement | High | Every expense creates matching `expense_splits` rows inside one PostgreSQL transaction (`withTransaction`) where `SUM(share_amount) === expense.amount`. Supports deterministic `equal` splits (`100.00` across 3 participants -> `33.34`, `33.33`, `33.33`) and `custom` splits. Payer's own share is automatically marked settled on creation (`is_settled = TRUE, settled_at = NOW(), settled_by_user_id = paidByUserId`) and cannot be marked unsettled (`400 PAYER_SHARE_ALREADY_COVERED`). Authorized participants (`owner`, `paid_by_user_id`, or split `user_id` with non-viewer role) can mark/unmark non-payer shares as settled (`PATCH .../splits/:splitId/settlement`) with audit timestamp and user attribution. | `0003_expense_settlement_audit.sql`, `moneyUtils.js`, `expenseService.js`, `ExpenseSplitEditor.jsx`, `ExpenseCard.jsx`, `TC-19`..`TC-21` | `IMPLEMENTED AND VERIFIED` |
| FR-17 | Edit & delete expense safely | High | Only trip `owner` or original expense creator (`created_by_user_id === req.dbUser.id`) can edit or delete an expense (`403` for other members and viewers). Metadata-only edits (`title`, `category`, `expenseDate`, `notes`) preserve existing `expense_splits` and settlement audit history. Financial edits (`amount`, `paidByUserId`, or `split`) on an expense with settled non-payer shares require `confirmSettlementReset: true` (`409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED` otherwise) before replacing splits atomically. Deleting an expense cascades `expense_splits` and recalculates all totals. | `expenseService.js`, `ExpenseForm.jsx`, `ExpenseCard.jsx`, `ExpensesPage.jsx`, `TC-20`, `TC-21` | `IMPLEMENTED AND VERIFIED` |
| FR-18 | Currency handling | Medium | MVP uses one currency per trip (`INR` default). | `trips.currency` (`CHAR(3)`). | `IMPLEMENTED AND VERIFIED` |
| FR-19 | Empty/loading/error states | High | Lists, forms, geocoding search, maps, and weather show clear feedback for each state. | `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `DestinationSearch.jsx`, `MapView.jsx`, `WeatherCard.jsx` | `IMPLEMENTED AND VERIFIED` |

---

# 4. DRD — Design Requirements Document

## 4.1 Screen Inventory & Implementation Status

| Screen / route | Main purpose | Actual Files / Components | Status |
|---|---|---|---|
| `/dashboard` | Lists authenticated user's owned and active-shared trips with coordinate readiness badge (`Map & Weather Ready` vs `Location Unverified`). Does not render a full slippy map. | `DashboardPage.jsx`, `TripList.jsx`, `TripCard.jsx`, `PageHeader.jsx`, `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/new` | Creates a persisted trip (`TripForm.jsx`) with debounced Open-Meteo `DestinationSearch.jsx` (combobox/listbox keyboard navigation) and live compact `MapView.jsx` preview once a candidate is selected. | `NewTripPage.jsx`, `TripForm.jsx`, `DestinationSearch.jsx`, `MapView.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/:tripId` | Displays saved trip metadata, `Open Trip Itinerary`, `Trip Budget & Expenses`, and `Manage Members` (`Trip Members` for non-owners) navigation actions, accurate role explanation (`Owner`, `Member (Can Edit Itinerary & Expenses)`, `Viewer (Read-Only)`), interactive **Destination Map** (`MapView.jsx`), live **Destination Weather** (`WeatherCard.jsx`), owner-only inline location confirmation (`+ Confirm Destination Location` with `autoSearchOnMount`) and location change (`Change Destination Location`), full edit (`TripForm.jsx`), and delete (`ConfirmDialog.jsx`). | `TripDetailsPage.jsx`, `MapView.jsx`, `WeatherCard.jsx`, `DestinationSearch.jsx`, `TripForm.jsx`, `ConfirmDialog.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/:tripId/itinerary` | Complete day-wise itinerary planner & multi-stop route map: auto-initializes trip days (`1..N`), safely synchronizes date ranges (`409 ITINERARY_OUTSIDE_RANGE_HAS_DATA` conflict banner when out-of-range days contain data), provides in-page trip switcher with clean trip-state reset (`AbortController`, `autoInitTripIdRef`), edits day notes, adds/edits/deletes/reorders activities with optional Open-Meteo geocoded `PlaceSearch.jsx` stops, computes exact daily & total estimated costs, and calculates/renders multi-stop GeoJSON `LineString` routes (`driving-car`, `foot-walking`, `cycling-regular`) on `ItineraryMap.jsx` with explicit mock-route vs. real-provider labeling. | `ItineraryPage.jsx`, `ItineraryDaySection.jsx`, `ItineraryItemCard.jsx`, `ItineraryItemForm.jsx`, `PlaceSearch.jsx`, `ItineraryMap.jsx`, `RouteProfileSelector.jsx`, `RouteSummary.jsx` | `IMPLEMENTED AND VERIFIED` (Live external openrouteservice HTTP call `IMPLEMENTED BUT NOT VERIFIED` pending `OPENROUTESERVICE_API_KEY`) |
| `/trips/:tripId/expenses` | Complete trip budget, expense management, category analytics, group splits (`equal` and `custom`), participant balance cards (labeling deactivated historical participants as `Former Member (Inactive)`), pairwise settlement summary, settlement toggle with audit trail (`settled_at`, `settled_by_user_id`), and financial-edit settlement-reset confirmation dialog (`409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED`). | `ExpensesPage.jsx`, `BudgetOverview.jsx`, `CategoryBreakdown.jsx`, `GroupSettlementPanel.jsx`, `ParticipantBalanceCard.jsx`, `ExpenseForm.jsx`, `ExpenseSplitEditor.jsx`, `ExpenseList.jsx`, `ExpenseCard.jsx`, `ConfirmDialog.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/:tripId/members` | Trip Collaboration, Invitations & Member Role Management workspace: displays trip owner and active members (`GET /api/trips/:tripId/members`) for all active trip participants; for the trip owner, provides inline `member <-> viewer` role switcher (`PATCH /api/trips/:tripId/members/:userId`), non-destructive member removal (`DELETE /api/trips/:tripId/members/:userId`) with confirmation modal (`ConfirmDialog.jsx`), email invitation creator (`POST /api/trips/:tripId/invitations`) with one-time shareable `/invitations/accept#token=...` link box and copy action, and invitation status register (`pending`, `accepted`, `declined`, `revoked`, `expired`) with pending invitation revocation (`DELETE /api/trips/:tripId/invitations/:invitationId`). | `TripMembersPage.jsx`, `ConfirmDialog.jsx`, `PageHeader.jsx`, `LoadingState.jsx`, `ErrorState.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/invitations/accept` | Invitation Acceptance & Decline screen (`/invitations/accept#token=...`): extracts the raw token from `window.location.hash` (persisting across Google sign-in via `sessionStorage`), prompts unauthenticated visitors to sign in, displays the signed-in user's identity and email, submits `POST /api/trip-invitations/accept` or `POST /api/trip-invitations/decline` with `{ token }` in the request body, clears `#token=...` from the browser URL bar after response, and displays clear error guidance on email mismatch (`403 INVITATION_EMAIL_MISMATCH`), expired (`410 INVITATION_EXPIRED`), revoked/already-used (`409`), or invalid (`404`) tokens. | `TripInvitationPage.jsx`, `PageHeader.jsx`, `EmptyState.jsx`, `LoadingState.jsx` | `IMPLEMENTED AND VERIFIED` |

## 4.2 Component & Frontend Module Registry

| Component / module | Exact path | Public Props / Signature | Imported by (Parent / Screen) | Responsibility & Reason for Existence | Linked Tests & Status |
|---|---|---|---|---|---|
| `MapView` | `client/src/components/MapView.jsx` | `{ latitude, longitude, destinationName, compact, emptyMessage }` | `TripDetailsPage.jsx`, `TripForm.jsx` | Manages single-destination Leaflet map lifecycle, OpenStreetMap tiles, destination SVG pin marker + popup, tile error warning, and visible attribution. | `TC-12` — `IMPLEMENTED AND VERIFIED` |
| `DestinationSearch` | `client/src/components/DestinationSearch.jsx` | `{ value, latitude, longitude, onDestinationChange, disabled, error, inputId, label, autoSearchOnMount }` | `TripForm.jsx`, `TripDetailsPage.jsx` | Debounced (`350ms`, min 3 chars) trip destination autocomplete calling `GET /api/locations/search` with `AbortController`, `requestSeqRef`, and keyboard combobox navigation. | `TC-09`, `TC-10`, `TC-12` — `IMPLEMENTED AND VERIFIED` |
| `WeatherCard` | `client/src/components/WeatherCard.jsx` | `{ latitude, longitude, destinationName }` + exported `buildCoordinateWeatherKey(lat, lon)` | `TripDetailsPage.jsx` | Fetches and renders current weather and 5-day outlook from `GET /api/weather`, keyed by `coordKey`. | `TC-10`, `TC-11`, `TC-12` — `IMPLEMENTED AND VERIFIED` |
| `ItineraryPage` | `client/src/pages/ItineraryPage.jsx` | Route page for `/trips/:tripId/itinerary` | `App.jsx` | Orchestrates itinerary loading, auto-initialization for owners/members when `days.length === 0`, safe date-range synchronization (`syncConflict` banner on `409 ITINERARY_OUTSIDE_RANGE_HAS_DATA`), trip-switch state isolation (`autoInitTripIdRef`, `loadAbortRef`, `routeAbortRef`, `loadRequestSeqRef`, `routeRequestSeqRef`, `[data-testid="itinerary-trip-switcher"]`), day filter selection, multi-stop route calculation (`RouteProfileSelector.jsx`, `RouteSummary.jsx`, `ItineraryMap.jsx`), and day sections (`ItineraryDaySection.jsx`). | `TC-14`, `TC-16`, `TC-17` — `IMPLEMENTED AND VERIFIED` |
| `ItineraryDaySection` | `client/src/components/ItineraryDaySection.jsx` | `{ day, currency, canEdit, isSelectedForMap, onSelectDayForMap, onCalculateDayRoute, isCalculatingRoute, onSaveNotes, onCreateItem, onUpdateItem, onDeleteItem, onReorderItems }` | `ItineraryPage.jsx` | Renders a single itinerary day (`Day N — YYYY-MM-DD`), `Outside Current Trip Dates` badge (`day.isOutsideTripRange`), inline day notes editor, daily estimated cost, `+ Add Activity` form toggle, activity cards, delete confirmation modal, and Move Up / Move Down + HTML5 drag-and-drop reordering. | `TC-14`, `TC-16`, `TC-17` — `IMPLEMENTED AND VERIFIED` |
| `ItineraryItemCard` | `client/src/components/ItineraryItemCard.jsx` | `{ item, index, totalItems, currency, canEdit, isBusy, onEdit, onDelete, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, isDragging }` | `ItineraryDaySection.jsx` | Renders an ordered activity item (`#sortOrder`), 24h time range, estimated cost, place coordinate status badge (`Pin: ...` vs `No Confirmed Location (Skipped in Route Calculation)`), and accessible reorder/edit/delete buttons (hidden for `viewer`). | `TC-14`, `TC-16` — `IMPLEMENTED AND VERIFIED` |
| `ItineraryItemForm` | `client/src/components/ItineraryItemForm.jsx` | `{ dayOrder, dayDate, currency, initialValues, onSubmit, onCancel, isSubmitting, submitLabel }` | `ItineraryDaySection.jsx` | Create/edit activity form validating title (`1..180` chars), 24h start/end times (`endTime > startTime`), non-negative decimal cost, description, and optional `PlaceSearch.jsx` selection. | `TC-14`, `TC-16` — `IMPLEMENTED AND VERIFIED` |
| `PlaceSearch` | `client/src/components/PlaceSearch.jsx` | `{ selectedPlace, onPlaceChange, disabled, inputId, label }` | `ItineraryItemForm.jsx` | Activity stop geocoding search reusing `searchDestinationLocations` (`GET /api/locations/search`) with `AbortController` and `requestSeqRef`, normalizing selected candidate into `{ provider: 'open-meteo-geocoding', providerPlaceId, name, address, latitude, longitude }`. | `TC-14`, `TC-16` — `IMPLEMENTED AND VERIFIED` |
| `ItineraryMap` | `client/src/components/ItineraryMap.jsx` | `{ trip, days, selectedDayId, routeResult }` | `ItineraryPage.jsx` | Dedicated Leaflet + OpenStreetMap map component rendering numbered stop markers (`1..N`) with detailed activity popups, rendering GeoJSON `LineString` route polylines via `L.geoJSON`, distinguishing simulated test route lines from active road route lines in `.map-attribution-bar` while keeping OpenStreetMap tile attribution separate, automatically fitting bounds (`map.fitBounds`), and handling resize invalidation (`ResizeObserver`). | `TC-15`, `TC-16`, `TC-17` — `IMPLEMENTED AND VERIFIED` |
| `RouteProfileSelector` | `client/src/components/RouteProfileSelector.jsx` | `{ selectedProfile, onProfileChange, onCalculateRoute, isCalculating, canCalculate, geocodedStopCount, dayLabel }` | `ItineraryPage.jsx` | Travel profile selector (`driving-car`, `foot-walking`, `cycling-regular`) and `Calculate Multi-Stop Route` trigger (enabled when `geocodedStopCount >= 2`). | `TC-15`, `TC-16` — `IMPLEMENTED AND VERIFIED` |
| `RouteSummary` | `client/src/components/RouteSummary.jsx` | `{ routeResult, routeError, dayLabel, onClearRoute }` + exported `describeRouteSummaryState(route)` | `ItineraryPage.jsx` | Displays calculated route summary: when `isMock === true`, visibly renders `SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS` (`[data-testid="mock-route-banner"]`), suppresses simulated metrics from being shown as real road distance/travel time (`"Simulated (Not Real Road Distance)"` / `"Simulated (Not Real Travel Time)"`), and never attributes mock routes to openrouteservice; when `isMock === false` (`source === "OPENROUTESERVICE"`), renders real distance (`km`/`m`), duration (`hr min`/`min`), ordered stop sequence pills, warnings for skipped unpinned activities, and openrouteservice attribution. | `TC-15`, `TC-16`, `TC-17` — `IMPLEMENTED AND VERIFIED` |
| `itineraryService` (client) | `client/src/services/itineraryService.jsx` | `fetchTripItinerary`, `initializeTripItineraryRequest`, `updateDayNotesRequest`, `fetchDayItems`, `createItineraryItemRequest`, `updateItineraryItemRequest`, `deleteItineraryItemRequest`, `reorderItineraryItemsRequest`, `calculateDayRouteRequest` | `ItineraryPage.jsx` | Client REST wrapper for all `/api/trips/:tripId/itinerary*` endpoints via `apiClient.jsx` with `AbortSignal` (`{ signal }`) support. | `TC-14`..`TC-17` — `IMPLEMENTED AND VERIFIED` |
| `mapConfig` | `client/src/services/mapConfig.jsx` | `MAP_CONFIG`, `hasValidCoordinates(latitude, longitude)` | `MapView.jsx`, `ItineraryMap.jsx`, `DestinationSearch.jsx`, `PlaceSearch.jsx`, `WeatherCard.jsx`, `TripForm.jsx`, `TripCard.jsx`, `TripDetailsPage.jsx` | Centralizes the OSM tile URL template, attribution HTML/link, zoom defaults, and WGS84 coordinate pair validation. | `TC-12`, `TC-16` — `IMPLEMENTED AND VERIFIED` |
| `locationService` | `client/src/services/locationService.jsx` | `searchDestinationLocations(getAccessToken, query, count, { signal })` | `DestinationSearch.jsx`, `PlaceSearch.jsx` | Calls `GET /api/locations/search` through `apiClient.jsx` with `AbortSignal` support. | `TC-09`, `TC-10`, `TC-12`, `TC-16` — `IMPLEMENTED AND VERIFIED` |
| `weatherService` | `client/src/services/weatherService.jsx` | `fetchDestinationWeather(getAccessToken, latitude, longitude, { signal })` | `WeatherCard.jsx` | Calls `GET /api/weather` through `apiClient.jsx` with `AbortSignal` support. | `TC-10`, `TC-11`, `TC-12` — `IMPLEMENTED AND VERIFIED` |
| `TripForm` | `client/src/components/TripForm.jsx` | `{ initialValues, submitLabel, onSubmit, onCancel, isSubmitting, serverError }` | `NewTripPage.jsx`, `TripDetailsPage.jsx` | Create/edit trip form integrating `DestinationSearch.jsx` and compact `MapView.jsx` preview. | `TC-01`..`TC-03`, `TC-12` — `IMPLEMENTED AND VERIFIED` |
| `TripCard` | `client/src/components/TripCard.jsx` | `{ trip }` | `TripList.jsx` | Displays trip summary card and `Map & Weather Ready` / `Location Unverified` badge. | `TC-12` — `IMPLEMENTED AND VERIFIED` |
| `TripList` | `client/src/components/TripList.jsx` | `{ trips, isLoading, error, onRetry }` | `DashboardPage.jsx` | Renders loading, error, empty, or card grid of saved trips. | `TC-12` — `IMPLEMENTED AND VERIFIED` |
| `apiClient` | `client/src/services/apiClient.jsx` | `apiRequest`, `fetchTrips`, `createTripRequest`, `fetchTripById`, `updateTripRequest`, `deleteTripRequest` | `DashboardPage.jsx`, `NewTripPage.jsx`, `TripDetailsPage.jsx`, `locationService.jsx`, `weatherService.jsx`, `itineraryService.jsx`, `expenseService.jsx` | Centralized authenticated REST client attaching Firebase Bearer token, normalizing `payload.error || payload.message`, and forwarding `AbortSignal` (`signal`). | `TC-01`..`TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpensesPage` | `client/src/pages/ExpensesPage.jsx` | Route page for `/trips/:tripId/expenses` | `App.jsx` | Orchestrates the Trip Budget & Expenses workspace: loads `/api/trips/:tripId/expenses` with `AbortController` and `requestSeqRef` race protection, provides in-page trip switcher, handles owner inline planned budget updates (`PATCH /api/trips/:tripId`), manages create/edit `ExpenseForm.jsx` modal/drawer, handles `409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED` financial edit confirmation (`[data-testid="settlement-reset-confirm-dialog"]`), handles split settlement toggles, and handles expense deletion via `ConfirmDialog.jsx`. | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `BudgetOverview` | `client/src/components/BudgetOverview.jsx` | `{ trip, budgetSummary, canEditBudget, onUpdatePlannedBudget, isSavingBudget }` | `ExpensesPage.jsx` | Renders planned budget, actual expenses spent, remaining/over-budget amount, progress bar, `OVER_BUDGET` warning banner (`[data-testid="over-budget-banner"]`), separate itinerary estimated activity cost callout (`itineraryEstimatedTotal`), and owner-only inline planned budget editor (`[data-testid="edit-planned-budget-btn"]`). | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `CategoryBreakdown` | `client/src/components/CategoryBreakdown.jsx` | `{ categoryBreakdown, totalExpenses, currency }` | `ExpensesPage.jsx` | Renders spending analytics across the 8 validated categories sorted from highest to lowest spend with proportional progress bars, expense counts, and percentage of total spend (`[data-testid="category-breakdown-panel"]`). | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `GroupSettlementPanel` | `client/src/components/GroupSettlementPanel.jsx` | `{ participants, participantBalances, settlementSummary, currency, currentUserId, tripOwnerId, userRole, onToggleSplitSettlement, busySplitId }` | `ExpensesPage.jsx` | Displays overall pending settlement total, pairwise debt summary (`Who Owes Whom`), individual unsettled split shares with direct `Mark Settled` action buttons, and the grid of `ParticipantBalanceCard.jsx` cards (`[data-testid="group-settlement-panel"]`). | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ParticipantBalanceCard` | `client/src/components/ParticipantBalanceCard.jsx` | `{ balance, currency, isCurrentUser }` | `GroupSettlementPanel.jsx` | Displays a trip participant's role badge (including `Former Member (Inactive)` when `balance.tripRole === 'former_member'`), `Total Paid`, `Total Share`, `Pending to Pay`, `Pending to Receive`, and net status badge (`Settled`, `Gets back ...`, or `Owes ...`). | `TC-20`..`TC-24` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseForm` | `client/src/components/ExpenseForm.jsx` | `{ trip, participants, categories, currentUserId, initialExpense, onSubmit, onCancel, isSubmitting, serverError }` | `ExpensesPage.jsx` | Create/edit expense form with client validation, category selector, payer selector, date picker, notes input, and integrated `ExpenseSplitEditor.jsx`. Detects when a financial edit (`amount`, `paidByUserId`, or `split`) affects already-settled non-payer shares and shows a warning notice. | `TC-19`..`TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseSplitEditor` | `client/src/components/ExpenseSplitEditor.jsx` | `{ amount, currency, participants, paidByUserId, splitMode, onSplitModeChange, selectedParticipantIds, onSelectedParticipantsChange, customSharesByUserId, onCustomSharesChange, disabled }` | `ExpenseForm.jsx` | Interactive group split editor supporting `Equal Split` (live deterministic minor-unit preview matching backend `33.34 / 33.33 / 33.33` allocation) and `Custom Split` (per-participant decimal inputs with live Assigned Total vs. Expense Total and Remaining Difference indicator). | `TC-19`..`TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseList` | `client/src/components/ExpenseList.jsx` | `{ expenses, categories, participants, currency, currentUserId, tripOwnerId, userRole, onEditExpense, onDeleteExpense, onToggleSplitSettlement, busySplitId, onOpenCreateForm }` | `ExpensesPage.jsx` | Renders filterable expense list (by category, payer, and settlement status: `All`, `Has Pending Shares`, `Fully Settled`) and delegates each item to `ExpenseCard.jsx`. | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseCard` | `client/src/components/ExpenseCard.jsx` | `{ expense, currency, currentUserId, tripOwnerId, userRole, onEdit, onDelete, onToggleSplitSettlement, busySplitId }` | `ExpenseList.jsx` | Displays an expense's title, category badge, date, amount, payer, creator, split mode badge (`Equal Split` vs `Custom Split`), per-participant split breakdown with settlement status (`Paid & Covered`, `Settled on YYYY-MM-DD (marked by ...)`, or `Pending`), authorized `Mark as Settled` / `Mark Unsettled` button, and owner/creator-only `Edit` and `Delete` actions. | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `expenseService` (client) | `client/src/services/expenseService.jsx` | `fetchTripExpensesDashboard`, `createTripExpenseRequest`, `updateTripExpenseRequest`, `deleteTripExpenseRequest`, `updateExpenseSplitSettlementRequest` | `ExpensesPage.jsx` | Client REST wrapper for all `/api/trips/:tripId/expenses*` endpoints via `apiClient.jsx` with `AbortSignal` support. | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `TripMembersPage` | `client/src/pages/TripMembersPage.jsx` | Route page for `/trips/:tripId/members` | `App.jsx` | Orchestrates trip collaboration: loads active members (`GET /api/trips/:tripId/members`) and owner invitation register (`GET /api/trips/:tripId/invitations`) with `AbortController` and `requestSeqRef` race protection, provides in-page trip switcher, renders role permission summary, and provides owner-only role updates, non-destructive member removal (`ConfirmDialog.jsx`), email invitation generation with one-time copyable `/invitations/accept#token=...` link banner, and pending invitation revocation. | `TC-22`..`TC-24` — `IMPLEMENTED AND VERIFIED` |
| `TripInvitationPage` | `client/src/pages/TripInvitationPage.jsx` | Route page for `/invitations/accept` | `App.jsx` | Handles `/invitations/accept#token=...` links: reads the raw token from `window.location.hash` (and `sessionStorage` across sign-in redirects), prompts unauthenticated users to sign in, allows authenticated invitees to accept or decline the invitation via `POST /api/trip-invitations/accept` or `POST /api/trip-invitations/decline`, clears the URL fragment after response, and displays structured error states (`403 INVITATION_EMAIL_MISMATCH`, `410 INVITATION_EXPIRED`, `409`, `404`). | `TC-23`, `TC-24` — `IMPLEMENTED AND VERIFIED` |
| `memberService` (client) | `client/src/services/memberService.jsx` | `fetchTripMembers`, `updateTripMemberRoleRequest`, `removeTripMemberRequest`, `fetchTripInvitations`, `createTripInvitationRequest`, `revokeTripInvitationRequest`, `acceptTripInvitationRequest`, `declineTripInvitationRequest` | `TripMembersPage.jsx`, `TripInvitationPage.jsx` | Client REST wrapper for all `/api/trips/:tripId/members*`, `/api/trips/:tripId/invitations*`, and `/api/trip-invitations/*` endpoints via `apiClient.jsx` with `AbortSignal` support. | `TC-22`..`TC-24` — `IMPLEMENTED AND VERIFIED` |

---

# 5. ERD & Database Migration History

## 5.1 Phase 3 Schema Update on `trips`

Why `destination_latitude` and `destination_longitude` were added directly to `trips` (while preserving `places` for Phase 4):
- Each trip has one primary headline destination (`trips.destination_name`), whereas `places` is a lookup table referenced by `itinerary_items.place_id` for multi-stop day-wise activities in Phase 4.
- Adding nullable `destination_latitude NUMERIC(9,6)` and `destination_longitude NUMERIC(9,6)` with a paired WGS84 range `CHECK` constraint (`chk_trips_destination_coords_pair_and_range`) on `trips` keeps single-trip CRUD atomic without extra joins, preserves all existing Phase 2 trips (which safely default to `NULL` coordinates until resolved), and avoids duplicating `places` rows on every trip edit.

### Updated `trips` Table Columns (13 Columns Live in PostgreSQL)

| Column | PostgreSQL Type | Nullable | Rule / Constraint | Status |
|---|---|---|---|---|
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `owner_user_id` | `UUID` | `NO` | `REFERENCES users(id)` | `IMPLEMENTED AND VERIFIED` |
| `title` | `VARCHAR(150)` | `NO` | `1..150` chars | `IMPLEMENTED AND VERIFIED` |
| `destination_name` | `VARCHAR(180)` | `NO` | `1..180` chars | `IMPLEMENTED AND VERIFIED` |
| `destination_latitude` | `NUMERIC(9,6)` | `YES` | Paired with `destination_longitude`; `-90 <= lat <= 90` (`chk_trips_destination_coords_pair_and_range`) | `IMPLEMENTED AND VERIFIED` |
| `destination_longitude` | `NUMERIC(9,6)` | `YES` | Paired with `destination_latitude`; `-180 <= lon <= 180` (`chk_trips_destination_coords_pair_and_range`) | `IMPLEMENTED AND VERIFIED` |
| `description` | `TEXT` | `YES` | Optional, max 5,000 chars | `IMPLEMENTED AND VERIFIED` |
| `start_date`, `end_date` | `DATE` | `NO` | `CHECK (end_date >= start_date)` | `IMPLEMENTED AND VERIFIED` |
| `currency` | `CHAR(3)` | `NO` | Default `'INR'` | `IMPLEMENTED AND VERIFIED` |
| `planned_budget` | `NUMERIC(12,2)` | `NO` | Default `'0.00'`, `CHECK (planned_budget >= 0)` | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

## 5.1.2 Phase 5 Schema Update on `expense_splits`

Why `settled_at` and `settled_by_user_id` were added to `expense_splits` (while reusing `expenses` and `expense_splits` from `0001_initial_baseline.sql`):
- `0001_initial_baseline.sql` already created `expenses` (11 columns) and `expense_splits` (7 columns including `is_settled BOOLEAN NOT NULL DEFAULT FALSE`).
- To record settlement audit history (when a share was marked settled and which authorized user marked it) without creating duplicate tables, migration `0003_expense_settlement_audit.sql` non-destructively adds nullable `settled_at TIMESTAMPTZ` and `settled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL` to `expense_splits`, along with lookup indexes `idx_expense_splits_user_settled` and `idx_expense_splits_expense_id`.

### Updated `expense_splits` Table Columns (9 Columns Live in PostgreSQL)

| Column | PostgreSQL Type | Nullable | Rule / Constraint | Status |
|---|---|---|---|---|
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `expense_id` | `UUID` | `NO` | `REFERENCES expenses(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `user_id` | `UUID` | `NO` | `REFERENCES users(id) ON DELETE RESTRICT`, `UNIQUE (expense_id, user_id)` | `IMPLEMENTED AND VERIFIED` |
| `share_amount` | `NUMERIC(12,2)` | `NO` | `CHECK (share_amount >= 0)` | `IMPLEMENTED AND VERIFIED` |
| `is_settled` | `BOOLEAN` | `NO` | `DEFAULT FALSE` | `IMPLEMENTED AND VERIFIED` |
| `settled_at` | `TIMESTAMPTZ` | `YES` | Set to `NOW()` when `is_settled = TRUE`; reset to `NULL` when unsettled | `IMPLEMENTED AND VERIFIED` |
| `settled_by_user_id` | `UUID` | `YES` | `REFERENCES users(id) ON DELETE SET NULL`; records actor when `is_settled = TRUE` | `IMPLEMENTED AND VERIFIED` |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

## 5.1.3 Phase 6 Schema Update — `trip_invitations` & Non-Destructive `trip_members` Lifecycle

Why `trip_invitations` was added in `0004_trip_invitations.sql` while reusing `trip_members` from `0001_initial_baseline.sql`:
- `trip_members` (`id`, `trip_id`, `user_id`, `role`, `membership_status`, `joined_at`, `UNIQUE (trip_id, user_id)`) requires a non-null `user_id REFERENCES users(id)`, whereas an owner can invite an email address before that person has ever signed in to RouteWise.
- Creating `trip_invitations` allows email-targeted invitations (`invited_email` normalized to lowercase), stores **only** the hex-encoded SHA-256 hash (`token_hash`) of the 32-byte `base64url` invitation token, enforces a 7-day expiration (`expires_at`), prevents duplicate active pending invitations via the partial unique index `uq_trip_invitations_pending_trip_email` on `(trip_id, invited_email) WHERE status = 'pending'`, and preserves an immutable audit log of `pending`, `accepted`, `declined`, `revoked`, and `expired` invitations.
- When an invited user accepts an invitation, `trip_members` is upserted inside the same transaction via `ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role, membership_status = 'active', joined_at = NOW()`, cleanly reactivating any previously removed (`'inactive'`) or legacy `'pending'` membership row without creating duplicates.
- When an owner removes a member (`DELETE /api/trips/:tripId/members/:userId`), `trip_members.membership_status` is set to `'inactive'` rather than deleting the user or cascading historical records, preserving all `itinerary_items`, `expenses`, `expense_splits`, and settlement audit trails.

### New `trip_invitations` Table Columns (12 Columns Live in PostgreSQL)

| Column | PostgreSQL Type | Nullable | Rule / Constraint | Status |
|---|---|---|---|---|
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` | `IMPLEMENTED AND VERIFIED` |
| `trip_id` | `UUID` | `NO` | `REFERENCES trips(id) ON DELETE CASCADE` | `IMPLEMENTED AND VERIFIED` |
| `invited_email` | `VARCHAR(255)` | `NO` | `CHECK (invited_email = LOWER(BTRIM(invited_email)) AND LENGTH(invited_email) >= 3)` | `IMPLEMENTED AND VERIFIED` |
| `role` | `VARCHAR(20)` | `NO` | `CHECK (role IN ('member', 'viewer'))` (`chk_trip_invitations_role`) | `IMPLEMENTED AND VERIFIED` |
| `token_hash` | `VARCHAR(64)` | `NO` | `UNIQUE (token_hash)` (`uq_trip_invitations_token_hash`); SHA-256 hex digest of raw token | `IMPLEMENTED AND VERIFIED` |
| `status` | `VARCHAR(20)` | `NO` | `DEFAULT 'pending'`, `CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired'))` | `IMPLEMENTED AND VERIFIED` |
| `invited_by_user_id` | `UUID` | `NO` | `REFERENCES users(id) ON DELETE RESTRICT` | `IMPLEMENTED AND VERIFIED` |
| `accepted_by_user_id` | `UUID` | `YES` | `REFERENCES users(id) ON DELETE SET NULL` | `IMPLEMENTED AND VERIFIED` |
| `created_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |
| `expires_at` | `TIMESTAMPTZ` | `NO` | Default `NOW() + INTERVAL '7 days'` | `IMPLEMENTED AND VERIFIED` |
| `responded_at` | `TIMESTAMPTZ` | `YES` | Populated when `status` transitions to `'accepted'` or `'declined'` | `IMPLEMENTED AND VERIFIED` |
| `updated_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT NOW()` | `IMPLEMENTED AND VERIFIED` |

## 5.2 SQL Migration Log

| Migration file | Date | Purpose | Executed on Cloud SQL (`ai-studio-de6d6586`)? | Verification Evidence | Status |
|---|---|---|---|---|---|
| `server/database/migrations/0001_initial_baseline.sql` | 2026-11-07 | Initial 8-table PostgreSQL relational schema baseline. | Yes (Phase 0). | Verified 8 tables via `information_schema.columns` and Phase 2 CRUD tests. | `IMPLEMENTED AND VERIFIED` |
| `server/database/migrations/0002_trip_destination_coordinates.sql` | 2026-11-07 | Non-destructive `ALTER TABLE "trips"` adding nullable `destination_latitude NUMERIC(9,6)`, `destination_longitude NUMERIC(9,6)`, and `chk_trips_destination_coords_pair_and_range`. | Yes (Phase 3). | Verified 13 columns on `trips` via `cloudsql.ExecuteSql` (`0.0066s`) and live coordinate persistence in `server/tests/trips.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `server/database/migrations/0003_expense_settlement_audit.sql` | 2026-11-08 | Non-destructive `ALTER TABLE "expense_splits"` adding nullable `settled_at TIMESTAMPTZ`, `settled_by_user_id UUID REFERENCES "users"("id") ON DELETE SET NULL`, and indexes `idx_expense_splits_user_settled` and `idx_expense_splits_expense_id`. | Yes (Phase 5). | Executed via `cloudsql.ExecuteSql` (`0.016051s`); verified 9 columns on `expense_splits` and live persistence in `server/tests/expenses.test.js` (`TC-20`) and Chromium (`TC-21`). | `IMPLEMENTED AND VERIFIED` |
| `server/database/migrations/0004_trip_invitations.sql` | 2026-11-08 | Creates `trip_invitations` (12 columns), `uq_trip_invitations_token_hash`, `chk_trip_invitations_role`, `chk_trip_invitations_status`, `chk_trip_invitations_email_normalized`, `idx_trip_invitations_trip_status_created`, and partial unique index `uq_trip_invitations_pending_trip_email` (`WHERE status = 'pending'`). | Yes (Phase 6). | Executed via `cloudsql.ExecuteSql` (`0.050143s`); verified 12 columns via `information_schema.columns` (`0.030644s`) and full lifecycle in `server/tests/members.test.js` (`TC-22`), `server/tests/invitations.test.js` (`TC-23`), and Chromium (`TC-24`). | `IMPLEMENTED AND VERIFIED` |

> **Release-Readiness Note on Historical Migration Verification:** Historical migrations `0001_initial_baseline.sql` through `0004_trip_invitations.sql` have been verified against the workspace Cloud SQL PostgreSQL instance (`ai-studio-de6d6586`). Re-verifying the complete sequential migration replay from an empty database on a clean production target is recorded as a release-readiness checklist item for a future deployment phase.

---

# 6. Architectural Design & API Registry

## 6.1 Runtime Architecture

```text
Browser / Mobile Browser
  - React .jsx UI (DashboardPage, NewTripPage, TripDetailsPage, TripForm, DestinationSearch, WeatherCard, ItineraryPage, ExpensesPage)
  - Leaflet MapView.jsx & ItineraryMap.jsx -> HTTPS tile requests to https://tile.openstreetmap.org/{z}/{x}/{y}.png
        |
        | HTTPS + JSON (Bearer Firebase ID Token)
        v
Node.js + Express API (server/src/app.js)
  - /api/trips*                      -> tripRoutes.js -> tripController.js -> tripValidator.js -> tripService.js -> pg.Pool -> Cloud SQL PostgreSQL
  - /api/trips/:tripId/itinerary*    -> itineraryRoutes.js -> itineraryController.js -> itineraryValidator.js -> itineraryService.js & routingService.js
  - /api/trips/:tripId/expenses*     -> expenseRoutes.js -> expenseController.js -> expenseValidator.js & moneyUtils.js -> expenseService.js -> pg.Pool -> Cloud SQL PostgreSQL
  - /api/locations/search            -> locationRoutes.js -> locationController.js -> locationValidator.js -> geocodingService.js -> Open-Meteo Geocoding API
  - /api/weather                     -> weatherRoutes.js -> weatherController.js -> weatherValidator.js -> weatherService.js -> Open-Meteo Forecast API
```

## 6.2 Audited API Endpoint Registry

| Method & Path | Auth | Parameters / Body | Success Response | Error Codes | Status |
|---|---|---|---|---|---|
| `GET /api/health` | Public | None | `200 { status: "ok", service: "routewise-api", stack: "PERN ..." }` | `500` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/auth/me` | `requireAuth` | Bearer Token | `200 { authenticated: true, user: { ... } }` | `401`, `503` | `IMPLEMENTED BUT NOT VERIFIED` (Live browser Google popup pending) |
| `GET /api/trips` | `requireAuth` | Bearer Token | `200 { trips: [ { ..., destinationLatitude, destinationLongitude } ] }` | `401`, `500`/`503` | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trips` | `requireAuth` | `{ title, destinationName, destinationLatitude?, destinationLongitude?, description?, startDate, endDate, currency?, plannedBudget? }` | `201 { trip: { ..., destinationLatitude, destinationLongitude } }` | `400`, `401`, `500`/`503` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/trips/:tripId` | `requireAuth`, `requireTripAccess` | `:tripId` (UUID) | `200 { trip: { ..., destinationLatitude, destinationLongitude } }` | `401`, `404` | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | Partial subset of editable fields (`destinationLatitude` & `destinationLongitude` must be updated together as a pair) | `200 { trip: { ... } }` | `400`, `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `DELETE /api/trips/:tripId` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | `:tripId` (UUID) | `204 No Content` | `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/locations/search` | `requireAuth` | Query: `q` (required, 3–120 chars), `count` (optional int 1–10, default 5) | `200 { results: [ { id, name, admin1, admin2, country, countryCode, latitude, longitude, timezone, displayName } ] }` | `400` (invalid `q`/`count`), `401`, `429` (rate limit), `502` (upstream error), `504` (timeout) | `IMPLEMENTED AND VERIFIED` |
| `GET /api/weather` | `requireAuth` | Query: `latitude` (`-90..90`), `longitude` (`-180..180`) | `200 { weather: { coordinates, timezone, current, daily, attribution, fetchedAt } }` | `400` (invalid coords), `401`, `429`, `502`, `504` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/trips/:tripId/itinerary` | `requireAuth`, `requireTripAccess` | `:tripId` (UUID) | `200 { status: "ok", data: { trip, summary: { dayCount, totalItems, totalEstimatedCost, isInitialized }, days: [ { id, dayDate, dayOrder, isOutsideTripRange, notes, estimatedCost, itemCount, geocodedStopCount, items } ] } }` | `400`, `401`, `404` | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trips/:tripId/itinerary/initialize` | `requireAuth`, `requireTripAccess`, `requireItineraryEditor` | `:tripId` (UUID) | `200 { status: "ok", data: { trip, summary, days } }` (idempotently ensures 1 row per date in `trip.start_date..trip.end_date`; deletes only empty out-of-range days and renumbers `1..N`) | `400`, `401`, `403` (`viewer`), `404`, `409` (`ITINERARY_OUTSIDE_RANGE_HAS_DATA` with `details.affectedDays` when out-of-range days contain activities or notes) | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId/itinerary/days/:dayId` | `requireAuth`, `requireTripAccess`, `requireItineraryEditor` | Body: `{ notes: string | null }` (max 5000 chars) | `200 { status: "ok", data: { day } }` | `400`, `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/trips/:tripId/itinerary/days/:dayId/items` | `requireAuth`, `requireTripAccess` | `:tripId`, `:dayId` (UUIDs) | `200 { status: "ok", data: { items: [ ... ] } }` | `400`, `401`, `404` | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trips/:tripId/itinerary/days/:dayId/items` | `requireAuth`, `requireTripAccess`, `requireItineraryEditor` | Body: `{ title, description?, startTime?, endTime?, estimatedCost?, place? }` | `201 { status: "ok", data: { item } }` (upserts `places` if `place` provided; assigns `MAX(sort_order) + 1`) | `400`, `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId/itinerary/days/:dayId/items/reorder` | `requireAuth`, `requireTripAccess`, `requireItineraryEditor` | Body: `{ itemIds: [ uuid, ... ] }` | `200 { status: "ok", data: { items } }` (transactional positive-offset `sort_order` update `1..N`) | `400`, `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId/itinerary/days/:dayId/items/:itemId` | `requireAuth`, `requireTripAccess`, `requireItineraryEditor` | Partial subset of `{ title, description, startTime, endTime, estimatedCost, place }` | `200 { status: "ok", data: { item } }` | `400`, `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `DELETE /api/trips/:tripId/itinerary/days/:dayId/items/:itemId` | `requireAuth`, `requireTripAccess`, `requireItineraryEditor` | `:tripId`, `:dayId`, `:itemId` (UUIDs) | `200 { status: "ok", data: { deletedItemId } }` (re-normalizes remaining `sort_order` to `1..N`) | `400`, `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trips/:tripId/itinerary/days/:dayId/route` | `requireAuth`, `requireTripAccess` | Body: `{ profile: "driving-car" | "foot-walking" | "cycling-regular" }` | `200 { status: "ok", data: { dayId, dayOrder, dayDate, route: { profile, isMock, source, provider, notice?, distanceMeters, durationSeconds, geometry, stops, skippedItems, warnings, attribution } } }` | `400` (`< 2` stops or bad profile), `401`, `404`, `422` (route not found), `429`, `502`, `503` (`ROUTING_KEY_MISSING`), `504` | Adapter & error mapping `IMPLEMENTED AND VERIFIED`; live external openrouteservice HTTP call `IMPLEMENTED BUT NOT VERIFIED` (pending `OPENROUTESERVICE_API_KEY`) |
| `GET /api/trips/:tripId/expenses` | `requireAuth`, `requireTripAccess` | `:tripId` (UUID) | `200 { status: "ok", data: { trip, categories, participants, budgetSummary, categoryBreakdown, participantBalances, settlementSummary, expenses } }` | `400`, `401`, `404` | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trips/:tripId/expenses` | `requireAuth`, `requireTripAccess`, `requireTripEditor` | Body: `{ title, category, amount, expenseDate, notes?, paidByUserId, split: { mode: "equal" \| "custom", participantIds?, shares? } }` | `201 { status: "ok", data: { expense, ...dashboard } }` (transactional insert of `expenses` and `expense_splits`; payer share auto-settled) | `400` (validation/split mismatch/non-member participant), `401`, `403` (`viewer`), `404` | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId/expenses/:expenseId` | `requireAuth`, `requireTripAccess`, `requireTripEditor` | Partial subset of `{ title, category, amount, expenseDate, notes, paidByUserId, split, confirmSettlementReset? }` | `200 { status: "ok", data: { expense, ...dashboard } }` (only trip `owner` or `created_by_user_id`; metadata-only updates preserve splits) | `400`, `401`, `403` (non-owner/non-creator or `viewer`), `404`, `409` (`EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED`) | `IMPLEMENTED AND VERIFIED` |
| `DELETE /api/trips/:tripId/expenses/:expenseId` | `requireAuth`, `requireTripAccess`, `requireTripEditor` | `:tripId`, `:expenseId` (UUIDs) | `200 { status: "ok", data: { deletedExpenseId, ...dashboard } }` (only trip `owner` or `created_by_user_id`; cascades `expense_splits`) | `400`, `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId/expenses/:expenseId/splits/:splitId/settlement` | `requireAuth`, `requireTripAccess`, `requireTripEditor` | Body: `{ isSettled: boolean }` | `200 { status: "ok", data: { split, expense, ...dashboard } }` (allowed for trip `owner`, expense `paid_by_user_id`, or split `user_id` with non-viewer role) | `400` (`PAYER_SHARE_ALREADY_COVERED`), `401`, `403`, `404` | `IMPLEMENTED AND VERIFIED` |
| `GET /api/trips/:tripId/members` | `requireAuth`, `requireTripAccess` | `:tripId` (UUID) | `200 { status: "ok", trip, owner, members, allMembers, data: { trip, owner, members, allMembers } }` (lists owner + active members sorted `owner -> member -> viewer`) | `400`, `401`, `404` (non-member or `inactive`/`pending` member) | `IMPLEMENTED AND VERIFIED` |
| `PATCH /api/trips/:tripId/members/:userId` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | Body: `{ role: "member" \| "viewer" }` | `200 { status: "ok", member, owner, members, allMembers, data: { ... } }` | `400` (`CANNOT_MODIFY_TRIP_OWNER` / `VALIDATION_ERROR`), `401`, `403` (non-owner), `404` (`MEMBER_NOT_FOUND`) | `IMPLEMENTED AND VERIFIED` |
| `DELETE /api/trips/:tripId/members/:userId` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | `:tripId`, `:userId` (UUIDs) | `200 { status: "ok", removedMember, owner, members, allMembers, data: { ... } }` (sets `membership_status = 'inactive'`; preserves historical itinerary and expense records) | `400` (`CANNOT_REMOVE_TRIP_OWNER`), `401`, `403`, `404` (`MEMBER_NOT_FOUND`) | `IMPLEMENTED AND VERIFIED` |
| `GET /api/trips/:tripId/invitations` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | `:tripId` (UUID) | `200 { status: "ok", invitations, data: { invitations } }` (expires stale pending invitations first; never returns `token` or `token_hash`) | `400`, `401`, `403` (non-owner), `404` | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trips/:tripId/invitations` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | Body: `{ email: string, role: "member" \| "viewer" }` | `201 { status: "ok", invitation, invitationLink: "/invitations/accept#token=...", deliveryNotice, invitations, data: { ... } }` (stores SHA-256 `token_hash` only; returns shareable link once) | `400` (`CANNOT_INVITE_OWNER` / `VALIDATION_ERROR`), `401`, `403`, `404`, `409` (`ALREADY_ACTIVE_TRIP_MEMBER`, `DUPLICATE_PENDING_INVITATION`) | `IMPLEMENTED AND VERIFIED` |
| `DELETE /api/trips/:tripId/invitations/:invitationId` | `requireAuth`, `requireTripAccess`, `requireTripOwner` | `:tripId`, `:invitationId` (UUIDs) | `200 { status: "ok", invitation, invitations, data: { ... } }` (transitions pending invitation to `status = 'revoked'`, preserving row for audit) | `400`, `401`, `403`, `404`, `409` (`INVITATION_NOT_PENDING`) | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trip-invitations/accept` | `requireAuth` | Body: `{ token: string }` | `200 { status: "ok", invitation, membership, trip, data: { invitation, membership, trip } }` (verifies `emailVerified !== false` and exact lowercase email match; locks row `FOR UPDATE`; upserts `trip_members` as `active`) | `400`, `401`, `403` (`EMAIL_NOT_VERIFIED`, `INVITATION_EMAIL_MISMATCH`), `404` (`INVITATION_NOT_FOUND`), `409` (`INVITATION_ACCEPTED`, `INVITATION_DECLINED`, `INVITATION_REVOKED`), `410` (`INVITATION_EXPIRED`) | `IMPLEMENTED AND VERIFIED` |
| `POST /api/trip-invitations/decline` | `requireAuth` | Body: `{ token: string }` | `200 { status: "ok", invitation, data: { invitation } }` (verifies `emailVerified !== false` and exact lowercase email match; transitions `status = 'declined'` and sets `responded_at = NOW()`) | `400`, `401`, `403` (`EMAIL_NOT_VERIFIED`, `INVITATION_EMAIL_MISMATCH`), `404`, `409`, `410` (`INVITATION_EXPIRED`) | `IMPLEMENTED AND VERIFIED` |

## 6.3 Backend Module Registry (Phase 6 Collaboration & Invitations)

| Module | Exact Path | Exported Symbols | Database Tables / Queries | Authorization & Responsibility | Linked Tests & Status |
|---|---|---|---|---|---|
| `memberValidator` | `server/src/validators/memberValidator.js` | `validateUpdateMemberRoleInput(body)` | None (pure validator) | Validates `PATCH /api/trips/:tripId/members/:userId` body so `role` is strictly `'member'` or `'viewer'`. | `TC-22` — `IMPLEMENTED AND VERIFIED` |
| `invitationValidator` | `server/src/validators/invitationValidator.js` | `normalizeEmailAddress`, `validateCreateInvitationInput`, `validateInvitationTokenInput` | None (pure validator) | Normalizes emails (`trim().toLowerCase()`), validates email format and length (`<= 254`), rejects owner inviting self (`CANNOT_INVITE_OWNER`), validates `'member' \| 'viewer'` role, and validates 32..256 char URL-safe tokens without echoing raw tokens in error messages. | `TC-23` — `IMPLEMENTED AND VERIFIED` |
| `memberService` | `server/src/services/memberService.js` | `listTripMembers`, `updateTripMemberRole`, `removeTripMember` | `trips`, `users`, `trip_members` (`FOR UPDATE` inside `withTransaction`) | Resolves trip owner + active `trip_members`, updates member role (`member <-> viewer`) while forbidding owner demotion (`400 CANNOT_MODIFY_TRIP_OWNER`), and non-destructively deactivates members (`membership_status = 'inactive'`) while forbidding owner self-removal (`400 CANNOT_REMOVE_TRIP_OWNER`). | `TC-22`, `TC-24` — `IMPLEMENTED AND VERIFIED` |
| `invitationService` | `server/src/services/invitationService.js` | `generateInvitationToken`, `hashInvitationToken`, `buildInvitationFragmentPath`, `expireStaleInvitationsForTrip`, `listTripInvitations`, `createTripInvitation`, `revokeTripInvitation`, `acceptTripInvitation`, `declineTripInvitation` | `trip_invitations`, `trip_members`, `trips`, `users` (`FOR UPDATE` inside `withTransaction`) | Generates 32-byte `base64url` tokens, stores only SHA-256 hex `token_hash`, expires stale pending invitations (`expires_at <= NOW()`), enforces single pending invitation per `(trip_id, invited_email)`, revokes pending invitations (`status = 'revoked'`), and atomically accepts/declines invitations after verifying `emailVerified !== false` and exact email match. | `TC-23`, `TC-24` — `IMPLEMENTED AND VERIFIED` |
| `memberController` | `server/src/controllers/memberController.js` | `getTripMembersHandler`, `updateTripMemberRoleHandler`, `removeTripMemberHandler` | Calls `memberService.js` | Express HTTP handlers for `/api/trips/:tripId/members*`. | `TC-22`, `TC-24` — `IMPLEMENTED AND VERIFIED` |
| `invitationController` | `server/src/controllers/invitationController.js` | `getTripInvitationsHandler`, `createTripInvitationHandler`, `revokeTripInvitationHandler`, `acceptTripInvitationHandler`, `declineTripInvitationHandler` | Calls `invitationService.js` | Express HTTP handlers for `/api/trips/:tripId/invitations*` and `/api/trip-invitations/*`. | `TC-23`, `TC-24` — `IMPLEMENTED AND VERIFIED` |
| `memberRoutes` | `server/src/routes/memberRoutes.js` | Default `Router({ mergeParams: true })` | Mounted at `/api/trips/:tripId/members` | Enforces `requireTripAccess` on `GET /` and `requireTripAccess + requireTripOwner` on `PATCH /:userId` and `DELETE /:userId`. | `TC-22`, `TC-24` — `IMPLEMENTED AND VERIFIED` |
| `invitationRoutes` | `server/src/routes/invitationRoutes.js` | `tripInvitationRoutes`, default `invitationResponseRoutes` | Mounted at `/api/trips/:tripId/invitations` and `/api/trip-invitations` | Enforces `requireTripAccess + requireTripOwner` on trip invitation management routes and `requireAuth` on `/api/trip-invitations/accept` and `/api/trip-invitations/decline`. | `TC-23`, `TC-24` — `IMPLEMENTED AND VERIFIED` |

---

# 7. Code Snippet Library (Phase 3, 3.1, 4 & 4.1 Additions)

### CS-07 — SQL Migration Adding Destination Coordinates (`server/database/migrations/0002_trip_destination_coordinates.sql`)
- **Related IDs:** `FR-07`, `NFR-06`
- **Exact File Path:** `/server/database/migrations/0002_trip_destination_coordinates.sql`
- **Explanation:** Non-destructively adds nullable `destination_latitude` and `destination_longitude` (`NUMERIC(9,6)`) to `trips` and enforces via `chk_trips_destination_coords_pair_and_range` that both columns are either `NULL` or valid WGS84 coordinates.

```sql
ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "destination_latitude" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "destination_longitude" numeric(9, 6);

ALTER TABLE "trips"
  ADD CONSTRAINT "chk_trips_destination_coords_pair_and_range" CHECK (
    ("destination_latitude" IS NULL AND "destination_longitude" IS NULL)
    OR (
      "destination_latitude" IS NOT NULL
      AND "destination_longitude" IS NOT NULL
      AND "destination_latitude" >= -90
      AND "destination_latitude" <= 90
      AND "destination_longitude" >= -180
      AND "destination_longitude" <= 180
    )
  );
```

### CS-08 — Interactive Leaflet Map Lifecycle, Resize Invalidation & StrictMode Cleanup (`client/src/components/MapView.jsx`)
- **Related IDs:** `FR-08`, `FR-10`, `TC-12`
- **Exact File Path & Symbol:** `/client/src/components/MapView.jsx` (`MapView`)
- **Explanation:** Guards against duplicate Leaflet container initialization, renders OpenStreetMap tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) and custom SVG pin marker + popup, updates map center (`animate: false`) and marker when coordinates change, calls `map.invalidateSize()` via `requestAnimationFrame`, a post-layout timer, and `ResizeObserver`, and removes the map instance on unmount.

```jsx
// Excerpt from /client/src/components/MapView.jsx
if (!mapInstanceRef.current) {
  if (containerRef.current._leaflet_id) {
    containerRef.current._leaflet_id = null;
  }

  const map = L.map(containerRef.current, {
    center: [numericLat, numericLon],
    zoom: MAP_CONFIG.defaultZoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: true,
    attributionControl: true,
  });

  const tileLayer = L.tileLayer(MAP_CONFIG.tileUrlTemplate, {
    attribution: MAP_CONFIG.attributionHtml,
    maxZoom: MAP_CONFIG.maxZoom,
  });
  tileLayer.on('tileload', () => setTileError(false));
  tileLayer.on('tileerror', () => setTileError(true));
  tileLayer.addTo(map);
  mapInstanceRef.current = map;
} else {
  const map = mapInstanceRef.current;
  map.setView([numericLat, numericLon], map.getZoom() || MAP_CONFIG.defaultZoom, {
    animate: false,
  });
  if (markerRef.current) {
    markerRef.current.setLatLng([numericLat, numericLon]);
    markerRef.current.setPopupContent(
      buildPopupElement(destinationName, numericLat, numericLon)
    );
    markerRef.current.openPopup();
  }
}
```

### CS-09 — Geocoding Race Protection (`DestinationSearch.jsx`) & Coordinate-Keyed Weather Isolation (`WeatherCard.jsx`)
- **Related IDs:** `FR-07`, `FR-09`, `FR-10`, `TC-09`..`TC-12`
- **Exact File Paths & Symbols:** `/client/src/components/DestinationSearch.jsx` (`triggerGeocodingSearch`) and `/client/src/components/WeatherCard.jsx` (`loadWeather`, `buildCoordinateWeatherKey`)
- **Explanation:** Both components use `AbortController` and a monotonically increasing `requestSeqRef` to cancel and ignore stale responses. `WeatherCard.jsx` also keys weather state by `currentCoordKey` (`buildCoordinateWeatherKey(latitude, longitude)`) so changing destination coordinates immediately clears any previous destination's weather.

```jsx
// Excerpt from /client/src/components/WeatherCard.jsx
const requestId = ++requestSeqRef.current;
const controller = new AbortController();
abortControllerRef.current = controller;

setWeatherState((prev) =>
  prev.coordKey === currentCoordKey ? prev : { coordKey: currentCoordKey, data: null }
);
setErrorState({ coordKey: currentCoordKey, message: null });
setIsLoading(true);

const data = await fetchDestinationWeather(getAccessToken, latitude, longitude, {
  signal: controller.signal,
});
if (requestSeqRef.current === requestId && !controller.signal.aborted) {
  setWeatherState({ coordKey: currentCoordKey, data });
}
```

### CS-10 — Strictly Guarded Local E2E Authentication Check (`server/src/middleware/auth.js`)
- **Related IDs:** `FR-01`, `TC-13`
- **Exact File Path & Symbol:** `/server/src/middleware/auth.js` (`isLocalE2EBypassAllowed`)
- **Explanation:** Ensures the local Playwright E2E token bypass is disabled by default (`ROUTEWISE_ENABLE_LOCAL_E2E_AUTH !== 'true'`), impossible in production (`NODE_ENV === 'production'`), and restricted to loopback IP and loopback `Host`/`Origin` headers.

```javascript
// Excerpt from /server/src/middleware/auth.js
export function isLocalE2EBypassAllowed(token, req, env = process.env) {
  if (!env || env.NODE_ENV === 'production') return false;
  if (env.ROUTEWISE_ENABLE_LOCAL_E2E_AUTH !== 'true') return false;
  if (token !== DEV_E2E_TOKEN) return false;
  const remoteIp = req?.ip || req?.socket?.remoteAddress || '';
  if (!isLoopbackAddress(remoteIp)) return false;
  if (!isLoopbackHeaderHost(req?.headers?.host) || !isLoopbackHeaderHost(req?.headers?.origin)) {
    return false;
  }
  return true;
}
```

### CS-11 — Transactional Conflict-Free Activity Reordering & Place Upsert (`server/src/services/itineraryService.js`)
- **Related IDs:** `FR-11`, `FR-12`, `TC-14`
- **Exact File Path & Symbols:** `/server/src/services/itineraryService.js` (`upsertPlace`, `reorderItineraryItems`)
- **Explanation:** Because `itinerary_items` enforces both `chk_itinerary_items_sort_positive` (`sort_order >= 1`) and `uq_itinerary_items_day_order` (`UNIQUE (itinerary_day_id, sort_order)`), reordering inside `withTransaction` first shifts all items for the day by `+ 1000000` and then assigns contiguous `1..N` values. Selected places are upserted via `ON CONFLICT (provider, provider_place_id)`.

```javascript
// Excerpt from /server/src/services/itineraryService.js
await client.query(
  `UPDATE itinerary_items
   SET sort_order = sort_order + 1000000
   WHERE itinerary_day_id = $1`,
  [dayId]
);

for (let idx = 0; idx < orderedItemIds.length; idx += 1) {
  await client.query(
    `UPDATE itinerary_items
     SET sort_order = $1
     WHERE id = $2 AND itinerary_day_id = $3`,
    [idx + 1, orderedItemIds[idx], dayId]
  );
}
```

### CS-12 — Multi-Stop Route Calculation & Explicit Mock-Route Separation (`server/src/services/routingService.js`)
- **Related IDs:** `FR-12`, `FR-10`, `TC-15`, `TC-17`
- **Exact File Path & Symbols:** `/server/src/services/routingService.js` (`isLocalE2eMockRoutingAllowed`, `describeRouteSummaryState`, `calculateDayRoute`)
- **Explanation:** Separates real openrouteservice responses (`isMock: false`, `source: 'OPENROUTESERVICE'`, `attribution: PROVIDER_CONFIG.openRouteService.attribution`) from local E2E simulated geometry (`isMock: true`, `source: 'LOCAL_E2E_MOCK'`, `notice: 'SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS'`, `attribution: null`), which is strictly disabled in production (`NODE_ENV === 'production'`).

```javascript
// Excerpt from /server/src/services/routingService.js
export function isLocalE2eMockRoutingAllowed(env = process.env) {
  if (!env || env.NODE_ENV === 'production') {
    return false;
  }
  return (
    env.ROUTEWISE_ENABLE_LOCAL_E2E_AUTH === 'true' &&
    env.ROUTEWISE_ENABLE_LOCAL_E2E_ORS_MOCK === 'true'
  );
}
```

### CS-13 — Safe Date-Range Reconciliation (`409 ITINERARY_OUTSIDE_RANGE_HAS_DATA`) (`server/src/services/itineraryService.js`)
- **Related IDs:** `FR-11`, `TC-14`, `TC-17`
- **Exact File Path & Symbol:** `/server/src/services/itineraryService.js` (`initializeTripItinerary`)
- **Explanation:** Inspects all existing `itinerary_days` and their activity counts (`COUNT(i.id)::int AS item_count`) **before** performing any `day_order` offset shift or deletion. If any out-of-range day contains activities or non-empty notes, throws HTTP `409 Conflict` (`ITINERARY_OUTSIDE_RANGE_HAS_DATA`) and rolls back the transaction cleanly so no `day_order` values are corrupted and no user data is deleted.

```javascript
// Excerpt from /server/src/services/itineraryService.js
const conflictingOutOfRangeDays = outOfRangeRows.filter((row) => {
  const hasItems = Number(row.item_count) > 0;
  const hasNotes = typeof row.notes === 'string' && row.notes.trim().length > 0;
  return hasItems || hasNotes;
});

if (conflictingOutOfRangeDays.length > 0) {
  const conflictErr = new Error(
    `Cannot automatically remove ${conflictingOutOfRangeDays.length} itinerary day(s) outside the updated trip dates (${trip.startDate} to ${trip.endDate}) because they still contain saved activities or notes.`
  );
  conflictErr.status = 409;
  conflictErr.code = 'ITINERARY_OUTSIDE_RANGE_HAS_DATA';
  conflictErr.details = {
    tripId: trip.id,
    startDate: trip.startDate,
    endDate: trip.endDate,
    conflictingDayCount: conflictingOutOfRangeDays.length,
    affectedDays: conflictingOutOfRangeDays.map((row) => ({
      dayId: row.id,
      dayDate: row.day_date,
      dayOrder: Number(row.day_order),
      itemCount: Number(row.item_count),
      hasNotes: typeof row.notes === 'string' && row.notes.trim().length > 0,
    })),
  };
  throw conflictErr;
}
```

### CS-14 — SQL Migration Adding Settlement Audit Columns (`server/database/migrations/0003_expense_settlement_audit.sql`)
- **Related IDs:** `FR-16`, `TC-20`
- **Exact File Path:** `/server/database/migrations/0003_expense_settlement_audit.sql`
- **Explanation:** Non-destructively extends `expense_splits` with nullable `settled_at TIMESTAMPTZ` and `settled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`, plus indexes for split settlement lookups.

```sql
ALTER TABLE "expense_splits"
  ADD COLUMN IF NOT EXISTS "settled_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "settled_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_expense_splits_user_settled"
  ON "expense_splits" ("user_id", "is_settled");

CREATE INDEX IF NOT EXISTS "idx_expense_splits_expense_id"
  ON "expense_splits" ("expense_id");
```

### CS-15 — Deterministic Minor-Unit Equal Split & Money Arithmetic (`server/src/utils/moneyUtils.js`)
- **Related IDs:** `FR-15`, `FR-16`, `TC-19`
- **Exact File Path & Symbol:** `/server/src/utils/moneyUtils.js` (`splitAmountEqually`)
- **Explanation:** Converts decimal strings to `BigInt` minor units (`100.00` -> `10000n`), divides by participant count (`3333n` base, `1n` remainder), and distributes the remainder `+1n` (`0.01`) one unit at a time to the first `R` participants in deterministic order so the shares always sum to the exact expense amount (`33.34 + 33.33 + 33.33 = 100.00`).

```javascript
export function splitAmountEqually(totalAmountStr, participantIds) {
  const totalMinor = parseMoneyToMinorUnits(totalAmountStr);
  const count = BigInt(participantIds.length);
  const baseShare = totalMinor / count;
  const remainder = totalMinor % count;

  return participantIds.map((userId, index) => {
    const extraUnit = BigInt(index) < remainder ? 1n : 0n;
    const shareMinor = baseShare + extraUnit;
    return {
      userId,
      shareAmount: formatMinorUnitsToDecimal(shareMinor),
      shareMinor,
    };
  });
}
```

### CS-16 — Financial Edit Settlement Reset Guard (`409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED`) (`server/src/services/expenseService.js`)
- **Related IDs:** `FR-16`, `FR-17`, `TC-20`, `TC-21`
- **Exact File Path & Symbol:** `/server/src/services/expenseService.js` (`updateTripExpense`)
- **Explanation:** Distinguishes metadata-only updates (`title`, `category`, `expenseDate`, `notes`) from financial updates (`amount`, `paidByUserId`, or `split`). When a financial change is requested on an expense that already has settled non-payer shares (`s.userId !== existing.paidByUserId && s.isSettled`), requires `confirmSettlementReset: true` or rejects with HTTP `409 Conflict` (`EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED`) so settlement history is never silently wiped.

```javascript
const settledNonPayerSplits = existing.splits.filter(
  (s) => s.userId !== existing.paidByUserId && s.isSettled
);

if (settledNonPayerSplits.length > 0 && !validated.confirmSettlementReset) {
  throw createHttpError(
    409,
    `Updating the amount, payer, or split configuration will reset ${settledNonPayerSplits.length} already-settled participant share(s) back to pending. Please confirm to proceed.`,
    'EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED',
    {
      expenseId: existing.id,
      settledNonPayerCount: settledNonPayerSplits.length,
      settledSplits: settledNonPayerSplits.map((s) => ({
        splitId: s.id,
        userId: s.userId,
        userName: s.userName,
        shareAmount: s.shareAmount,
        settledAt: s.settledAt,
      })),
    }
  );
}
```

### CS-17 — SQL Migration Creating `trip_invitations` with Hashed Tokens & Partial Unique Index (`server/database/migrations/0004_trip_invitations.sql`)
- **Related IDs:** `FR-06`, `TC-23`, `TC-24`
- **Exact File Path:** `/server/database/migrations/0004_trip_invitations.sql`
- **Explanation:** Creates `trip_invitations` storing only the 64-character SHA-256 hex digest (`token_hash`) of the invitation token, constrains `role` (`'member'`, `'viewer'`) and `status` (`'pending'`, `'accepted'`, `'declined'`, `'revoked'`, `'expired'`), and enforces via a PostgreSQL partial unique index (`uq_trip_invitations_pending_trip_email`) that at most one `'pending'` invitation can exist for a given `(trip_id, invited_email)` at any time while allowing historical accepted/declined/revoked/expired rows.

```sql
CREATE TABLE IF NOT EXISTS "trip_invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "invited_email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(20) NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "invited_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "accepted_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "responded_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "uq_trip_invitations_token_hash" UNIQUE ("token_hash"),
  CONSTRAINT "chk_trip_invitations_role" CHECK ("role" IN ('member', 'viewer')),
  CONSTRAINT "chk_trip_invitations_status" CHECK ("status" IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  CONSTRAINT "chk_trip_invitations_email_normalized" CHECK ("invited_email" = LOWER(BTRIM("invited_email")) AND LENGTH("invited_email") >= 3)
);

CREATE INDEX IF NOT EXISTS "idx_trip_invitations_trip_status_created"
  ON "trip_invitations" ("trip_id", "status", "created_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_trip_invitations_pending_trip_email"
  ON "trip_invitations" ("trip_id", "invited_email")
  WHERE "status" = 'pending';
```

### CS-18 — Cryptographic Invitation Token Hashing & Transactional `FOR UPDATE` Acceptance (`server/src/services/invitationService.js`)
- **Related IDs:** `FR-06`, `TC-23`, `TC-24`
- **Exact File Path & Symbols:** `/server/src/services/invitationService.js` (`generateInvitationToken`, `hashInvitationToken`, `acceptTripInvitation`)
- **Explanation:** Generates a 32-byte cryptographically random `base64url` token (`crypto.randomBytes(32).toString('base64url')`), hashes it with SHA-256 before any database lookup or insert, locks the `trip_invitations` row with `FOR UPDATE` inside `withTransaction`, verifies `emailVerified !== false` and exact lowercase email match (`403 INVITATION_EMAIL_MISMATCH`), persists `status = 'expired'` before throwing `410 INVITATION_EXPIRED` if `expires_at <= NOW()`, and upserts `trip_members` via `ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role, membership_status = 'active', joined_at = NOW()`.

```javascript
export function generateInvitationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashInvitationToken(rawToken) {
  return crypto
    .createHash('sha256')
    .update(String(rawToken || ''), 'utf8')
    .digest('hex');
}

// Inside acceptTripInvitation(rawToken, acceptingUser):
const upsertMemberRes = await client.query(
  `INSERT INTO trip_members (trip_id, user_id, role, membership_status, joined_at)
   VALUES ($1, $2, $3, 'active', NOW())
   ON CONFLICT (trip_id, user_id)
   DO UPDATE SET
     role = EXCLUDED.role,
     membership_status = 'active',
     joined_at = NOW()
   RETURNING id, trip_id, user_id, role, membership_status, joined_at`,
  [inv.trip_id, acceptingUser.id, finalRole]
);
```

### CS-19 — Non-Destructive Member Deactivation Preserving Historical Financial & Itinerary Records (`server/src/services/memberService.js`)
- **Related IDs:** `FR-06`, `FR-15`..`FR-17`, `TC-22`, `TC-24`
- **Exact File Path & Symbol:** `/server/src/services/memberService.js` (`removeTripMember`)
- **Explanation:** Prevents the trip owner from removing themselves (`400 CANNOT_REMOVE_TRIP_OWNER`), locks the target `trip_members` row (`FOR UPDATE`), and transitions `membership_status` from `'active'` to `'inactive'` instead of deleting the user or cascading historical records. Removed members immediately lose access to `/api/trips/:tripId*` (`404`), while `expenseService.js` continues to display their historical paid expenses and split shares labeled as `Former Member (Inactive)`.

```javascript
export async function removeTripMember(trip, targetUserId) {
  if (!isValidUuid(targetUserId)) {
    throw createHttpError(400, 'Invalid member userId parameter.', 'INVALID_USER_ID');
  }

  const normalizedTargetUserId = targetUserId.trim();
  if (normalizedTargetUserId === trip.ownerUserId) {
    throw createHttpError(
      400,
      'The trip owner cannot be removed from their own trip.',
      'CANNOT_REMOVE_TRIP_OWNER'
    );
  }

  return withTransaction(async (client) => {
    const existingRes = await client.query(
      `SELECT tm.id, tm.trip_id, tm.user_id, tm.role, tm.membership_status, u.full_name, u.email
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = $1 AND tm.user_id = $2
       FOR UPDATE OF tm`,
      [trip.id, normalizedTargetUserId]
    );
    if (existingRes.rowCount === 0 || existingRes.rows[0].membership_status !== 'active') {
      throw createHttpError(404, 'Active trip member not found for this trip.', 'MEMBER_NOT_FOUND');
    }
    await client.query(
      `UPDATE trip_members SET membership_status = 'inactive' WHERE id = $1 AND trip_id = $2`,
      [existingRes.rows[0].id, trip.id]
    );
    return {
      removedUserId: existingRes.rows[0].user_id,
      membershipStatus: 'inactive',
    };
  });
}
```

---

# 8. Testing Register & Verification Evidence

| Test ID | Requirement | Scenario | Command Executed | Expected Result | Actual Result & Evidence | Status |
|---|---|---|---|---|---|---|
| `TC-00` | `NFR-05`, `NFR-07` | Stack, health, auth `401` vs `503` separation, SQL migration path, zero Prisma/TypeScript check. | `npm test` (`node --test server/tests/*.test.js`) | Pass | Passed in `server/tests/stack.test.js` (`6 pass, 0 fail`). | `IMPLEMENTED AND VERIFIED` |
| `TC-01`..`TC-08` | `FR-02`..`FR-05`, `FR-13`, `NFR-05` | Trip CRUD, date/budget/coordinate pair validation, owner/member/viewer RBAC, and PostgreSQL persistence + Express HTTP integration. | `npm test` (`node --test server/tests/trips.test.js`) | 4/4 suites pass against live Cloud SQL PostgreSQL | `4 pass, 0 fail` (including persistence of `destinationLatitude: 34.0484, destinationLongitude: 74.3805` on `trips`). | `IMPLEMENTED AND VERIFIED` |
| `TC-09` | `FR-07`, `FR-10` | Deterministic mocked geocoding validator, disambiguated results (`Srinagar, Jammu and Kashmir, India` vs `Srinagar, Uttarakhand, India`), empty results (`[]`), `429` rate limit, `502` upstream error, `504` timeout. | `npm test` | Pass without external network dependency | Passed (`locationValidator` & `geocodingService` unit tests). | `IMPLEMENTED AND VERIFIED` |
| `TC-10` | `FR-07`, `FR-09` | Opt-in live Open-Meteo Geocoding & Forecast API smoke test for `Srinagar`. | `npm run test:providers` (`RUN_LIVE_PROVIDER_TESTS=1 node --test server/tests/locationWeather.test.js`) | Real HTTPS responses normalized with coordinates, temperature, 5-day daily array, and Open-Meteo attribution URL. | **PASS (`7 pass, 0 fail`, `2914ms`)**: Live Open-Meteo test completed in `2658.66ms`. | `IMPLEMENTED AND VERIFIED` |
| `TC-11` | `FR-09`, `FR-10` | Weather validator, WMO code mapping, incomplete payload handling (`502`), and distinct coordinate cache isolation (`34.0837,74.7974` vs `34.1526,77.5770`). | `npm test` | Pass | Passed (`weatherValidator`, `weatherService`, and cache isolation tests). | `IMPLEMENTED AND VERIFIED` |
| `TC-12` | `FR-07`, `FR-08`, `FR-09` | Real Chromium browser E2E verification (`playwright-cli` on `http://localhost:3000`) for Destination Search, MapView, and WeatherCard. | `playwright-cli` on `http://localhost:3000` | Non-zero map dimensions, HTTP 200 tile responses from `tile.openstreetmap.org`, updated marker/weather on coordinate change, zero console/page errors. | **PASS:** Verified in Phase 3.1 (`v0.12`). | `IMPLEMENTED AND VERIFIED` |
| `TC-13` | `FR-01` | Local E2E bypass & demo persona safety: verify `ROUTEWISE_DEV_E2E_AUTH=1` in browser `localStorage` is rejected (`401` on `/api/auth/me`) and cleared when server `ROUTEWISE_ENABLE_LOCAL_E2E_AUTH` is absent. | `npm test` (`stack.test.js`) + `playwright-cli` default server check | `401 Unauthorized` on `/api/auth/me`, `/api/locations/search`, and `POST /api/trips`; UI stays in `DEMO PREVIEW — NOT AUTHENTICATED`. | **PASS:** Verified in `stack.test.js` and Chromium. | `IMPLEMENTED AND VERIFIED` |
| `TC-14` | `FR-11`, `FR-12` | Live PostgreSQL + HTTP Itinerary lifecycle & date-range reconciliation (`server/tests/itinerary.test.js`). | `npm test` (`node --test server/tests/*.test.js`) | All itinerary validator, CRUD, RBAC, and date-range reconciliation tests pass against live Cloud SQL PostgreSQL | **PASS**: Full HTTP + PostgreSQL itinerary & date-range reconciliation lifecycle passed. | `IMPLEMENTED AND VERIFIED` |
| `TC-15` | `FR-12`, `FR-10` | **Mocked / Unit Multi-Stop Routing & Mock-Gate Tests** (`server/tests/itinerary.test.js` — does **not** call live openrouteservice). | `npm test` | All routing service unit, mock-gate, and HTTP error-mapping tests pass | **PASS:** Verified in `server/tests/itinerary.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `TC-16` | `FR-11`, `FR-12` | **Chromium Playwright E2E Verification — Itinerary CRUD & Local E2E Simulated Route** (`playwright-cli` on `http://localhost:3000`). | `playwright-cli` on `http://localhost:3000` | Itinerary CRUD, numbered markers, and simulated E2E route polyline verified in Chromium | **PASS:** Verified in Chromium (`TC-16` & `TC-17`). | `IMPLEMENTED AND VERIFIED` |
| `TC-17` | `FR-11`, `FR-12` | **Chromium Playwright E2E Verification — Phase 4.1 Mock-Route Labeling, Date-Range Conflict & Trip-Switch Reset** (`playwright-cli` on `http://localhost:3000`). | `playwright-cli` on `http://localhost:3000` | All Phase 4.1 browser E2E checks pass with zero console/page errors and all temporary test rows cleaned up afterward | **PASS:** Verified in Chromium. | `IMPLEMENTED AND VERIFIED` |
| `TC-18` | `FR-12` | Opt-in live openrouteservice Directions API smoke test (`Srinagar -> Pahalgam`, `driving-car`). | `npm run test:ors` (`RUN_LIVE_ORS_TESTS=1 node --test server/tests/itinerary.test.js`) | Skips cleanly when `OPENROUTESERVICE_API_KEY` is not set; calls live `api.heigit.org` when configured | **SKIPPED (`ORS_KEY_CONFIGURED: false`):** `OPENROUTESERVICE_API_KEY` is not configured in the current environment (`1 skipped`). | `IMPLEMENTED BUT NOT VERIFIED` (Blocked on `OPENROUTESERVICE_API_KEY` not configured in environment) |
| `TC-19` | `FR-14`..`FR-16` | **Expense Validator & `BigInt` Money Arithmetic Unit Tests** (`server/tests/expenses.test.js`). | `npm test` (`node --test server/tests/*.test.js`) | Pass | **PASS:** Verified in `server/tests/expenses.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `TC-20` | `FR-13`..`FR-17` | **Live PostgreSQL + Express HTTP Expense, Budget, Category Analytics, Split & Settlement Lifecycle** (`server/tests/expenses.test.js`). | `npm test` (`node --test server/tests/*.test.js`) | All automated expense tests pass against live Cloud SQL PostgreSQL | **PASS:** Verified in `server/tests/expenses.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `TC-21` | `FR-13`..`FR-17` | **Chromium Playwright E2E Verification — Trip Budget, Expenses, Splits & Settlement (`/trips/:tripId/expenses`)** (`playwright-cli` on `http://localhost:3000`). | `playwright-cli` on `http://localhost:3000` | All Phase 5 browser E2E checks pass with zero console/page errors | **PASS:** Verified in Chromium. | `IMPLEMENTED AND VERIFIED` |
| `TC-22` | `FR-06`, `FR-12`, `FR-14`..`FR-17` | **Live PostgreSQL + Express HTTP Trip Member Management, Role Permissions & Non-Destructive Removal Suite** (`server/tests/members.test.js`):<br>1. `memberValidator` unit checks (`member` and `viewer` accepted; `owner`, `admin`, and empty rejected).<br>2. Member listing (`GET /api/trips/:tripId/members`): `owner`, active `member`, and `viewer` receive `200` with `allMembers` ordered `owner -> member -> viewer`; non-member receives `404`.<br>3. Role changes (`PATCH /api/trips/:tripId/members/:userId`): `member` and `viewer` receive `403`; owner attempting to demote self receives `400 CANNOT_MODIFY_TRIP_OWNER`; owner toggles Member B `member -> viewer -> member` (`200`).<br>4. Role permissions across itinerary & expenses: `viewer` receives `403` on itinerary initialization, activity creation, expense creation, and split settlement; active `member` succeeds (`200`/`201`) on itinerary initialization, activity creation, and shared expense creation.<br>5. Member removal (`DELETE /api/trips/:tripId/members/:userId`) & historical integrity: `member` and `viewer` receive `403`; owner cannot remove self (`400 CANNOT_REMOVE_TRIP_OWNER`); owner removes Member B (`200`, `membership_status = 'inactive'`); removed Member B loses access (`404` on `GET /api/trips/:tripId` and `GET /api/trips/:tripId/members`) and no longer sees the trip in `GET /api/trips`; historical itinerary items, expense payer records, expense splits, and settlement audit fields (`settled_at`, `settled_by_user_id`) survive intact, with Member B preserved in `participantBalances` as `tripRole: 'former_member', isActive: false`. | `npm test` (`node --test server/tests/members.test.js`) | All member management, RBAC, and historical integrity assertions pass against live Cloud SQL PostgreSQL | **PASS (`2 subtests, 0 fail`, `1292ms`)**: Full HTTP + PostgreSQL member management & historical integrity suite passed. | `IMPLEMENTED AND VERIFIED` |
| `TC-23` | `FR-06` | **Live PostgreSQL + Express HTTP Trip Invitation Lifecycle, Token Cryptography, Expiration, Reactivation & Concurrency Suite** (`server/tests/invitations.test.js`):<br>1. `invitationValidator` & token cryptography: email normalization, 32-byte `base64url` token generation (`>= 43` chars), and 64-char SHA-256 hex digest (`token_hash !== rawToken`).<br>2. Owner creates `member` and `viewer` invitations (`201`, `/invitations/accept#token=...`, `deliveryNotice: "Invitation link created — share this link with the invited person."`).<br>3. Rejects invalid/empty email (`400`), invalid role (`400`), owner's own email (`400 CANNOT_INVITE_OWNER`), duplicate pending invitation (`409 DUPLICATE_PENDING_INVITATION`), and already-active member email (`409 ALREADY_ACTIVE_TRIP_MEMBER`).<br>4. Non-owner (`member`, `viewer`, outsider) cannot create (`403`/`404`), list (`403`/`404`), or revoke (`403`/`404`) invitations.<br>5. Token confidentiality: PostgreSQL stores only `token_hash`; `GET /api/trips/:tripId/invitations` never exposes `token`, `tokenHash`, `token_hash`, or `invitationLink`.<br>6. Acceptance security: rejects unauthenticated (`401`), unverified email (`emailVerified: false` -> `403 EMAIL_NOT_VERIFIED`), and mismatched authenticated email (`403 INVITATION_EMAIL_MISMATCH`).<br>7. Valid invitee accepts (`200`, creates active `trip_members` row); reuse of accepted token returns `409 INVITATION_ACCEPTED`.<br>8. Declining (`POST /api/trip-invitations/decline` -> `200`) sets `status = 'declined'`, creates no membership, and rejects later acceptance (`409 INVITATION_DECLINED`).<br>9. Owner revoking (`DELETE /api/trips/:tripId/invitations/:invitationId` -> `200`) sets `status = 'revoked'`, preserves audit row, and rejects acceptance (`409 INVITATION_REVOKED`).<br>10. Expired invitation (`expires_at` in past) returns `410 INVITATION_EXPIRED`, persists `status = 'expired'` in PostgreSQL, and allows owner to create a fresh pending invitation for the same email.<br>11. Previously removed (`'inactive'`) and legacy `'pending'` `trip_members` rows are cleanly reactivated (`membership_status = 'active'`) on acceptance without duplicate `(trip_id, user_id)` rows.<br>12. Concurrent `Promise.all` acceptance requests for the same token yield `[200, 409]` and a single `trip_members` row. | `npm test` (`node --test server/tests/invitations.test.js`) | All invitation lifecycle, token security, expiration, reactivation, and concurrency assertions pass against live Cloud SQL PostgreSQL | **PASS (`2 subtests, 0 fail`, `675ms`)**: Full HTTP + PostgreSQL invitation lifecycle & concurrency suite passed (`28 total tests across workspace: 26 pass, 0 fail, 2 skipped`). | `IMPLEMENTED AND VERIFIED` |
| `TC-24` | `FR-06`, `FR-15`..`FR-17` | **Chromium Playwright E2E Verification — Trip Collaboration, Invitation Link Acceptance, Role Change & Non-Destructive Member Removal** (`playwright-cli` on `http://localhost:3000`):<br>1. Owner (`e2e.verifier@routewise.test`) opened `/trips/:tripId`, verified `Manage Members` button (`[data-testid="open-members-btn"]`), and navigated to `/trips/:tripId/members`.<br>2. Owner created an invitation for `e2e.invitee@routewise.test` (`role: 'member'`), verifying `[data-testid="created-invitation-link-box"]` displayed `"Invitation link created — share this link with the invited person."` and a `/invitations/accept#token=...` URL.<br>3. Unauthenticated visitor opened `/invitations/accept#token=...` and verified `[data-testid="invitation-auth-required"]` prompted sign-in.<br>4. Invitee (`e2e.invitee@routewise.test`) opened `/invitations/accept#token=...`, clicked `Accept Invitation` (`[data-testid="accept-invitation-btn"]`), verified `Invitation Accepted` panel appeared and `window.location.hash` was cleared (`""`), and verified `/trips/:tripId` displayed `Member (Can Edit Itinerary & Expenses)`.<br>5. Invitee recorded a shared `120.00 USD` expense (`Geneva Boat Charter`) on the trip.<br>6. Owner returned to `/trips/:tripId/members`, changed Invitee's role from `member` to `viewer` (`[data-testid^="member-role-select-"]`), then removed Invitee via `ConfirmDialog.jsx`.<br>7. Owner opened `/trips/:tripId/expenses` and verified `Geneva Boat Charter` (`120.00 USD`) and its splits remained intact with Invitee's balance card labeled `Former Member (Inactive)`. Zero console or page errors (`Errors: 0, Warnings: 0`). | `playwright-cli` on `http://localhost:3000` | Complete multi-persona collaboration, invitation acceptance, role change, and non-destructive removal verified in Chromium with zero console errors | **PASS:** Verified in Chromium (`Errors: 0, Warnings: 0`; all temporary E2E test rows deleted from PostgreSQL afterward). | `IMPLEMENTED AND VERIFIED` |

---

# 9. Bug / Fix Log

| Issue ID | Component / Area | Root Cause Identified | Fix Implemented | Verification |
|---|---|---|---|---|
| `BUG-P3-01` | Missing Interactive Map in Phase 2 Baseline | 1. `leaflet` (`^1.9.4`) was installed in `package.json`, but no `MapView.jsx` component existed and `leaflet/dist/leaflet.css` was never imported.<br>2. `trips` only stored `destination_name` without coordinate columns.<br>3. `TripForm.jsx` had no geocoding search to resolve WGS84 coordinates. | Applied `0002_trip_destination_coordinates.sql`, built Open-Meteo geocoding/weather adapters, and built `MapView.jsx`, `DestinationSearch.jsx`, and `WeatherCard.jsx`. | Verified in Phase 3 (`v0.11`). |
| `BUG-P31-01` | Stale Weather Display & Race Condition When Coordinates Change (`WeatherCard.jsx`) | `WeatherCard.jsx` kept a single `weather` state object without associating it with the `(latitude, longitude)` pair that produced it and did not cancel in-flight requests. | Added `buildCoordinateWeatherKey(latitude, longitude)`, keyed `weatherState` and `errorState` by `coordKey`, cleared mismatched weather immediately on coordinate change, and added `AbortController` + monotonic `requestSeqRef`. | Verified in Chromium (`TC-12`). |
| `BUG-P31-02` | In-Flight Geocoding Cancellation, Keyboard Navigation & Enter Key Submission (`DestinationSearch.jsx`) | `DestinationSearch.jsx` did not abort in-flight `fetch` calls via `AbortController`, lacked keyboard `ArrowDown`/`ArrowUp`/`Enter`/`Escape` combobox navigation, and pressing `Enter` in the destination input could trigger form submission before selecting a geocoded result. | Added `AbortController` passthrough (`apiClient.jsx`, `locationService.jsx`), monotonic `requestSeqRef`, ARIA combobox/listbox attributes, keyboard navigation, and `autoSearchOnMount`. | Verified in `npm run build`, `npm test`, and Chromium (`TC-12`). |
| `BUG-P31-03` | Local Playwright E2E Auth Bypass Enabled Without Explicit Env Flag (`auth.js`, `AuthContext.jsx`) | `server/src/middleware/auth.js` accepted `DEV_E2E_TOKEN` whenever `NODE_ENV !== 'production'` on loopback without requiring an explicit opt-in environment variable. | Added `isLocalE2EBypassAllowed` requiring `ROUTEWISE_ENABLE_LOCAL_E2E_AUTH === 'true'`, `NODE_ENV !== 'production'`, loopback IP, and loopback `Host`/`Origin` headers. | Verified in `server/tests/stack.test.js` (`TC-13`). |
| `BUG-P31-04` | Deterministic Default Test Suite & Inline Coordinate Change UX (`locationWeather.test.js`, `TripDetailsPage.jsx`) | `server/tests/locationWeather.test.js` called live Open-Meteo endpoints unconditionally during `npm test`, and `TripDetailsPage.jsx` only showed `+ Confirm Destination Location` when coordinates were `NULL`. | Gated live Open-Meteo smoke test behind `RUN_LIVE_PROVIDER_TESTS=1` (`npm run test:providers`) and enabled `Change Destination Location` + `autoSearchOnMount` in `TripDetailsPage.jsx`. | Verified via `npm test` and Chromium (`TC-12`). |
| `BUG-P4-01` | Schema Column Alignment on `itinerary_days`, `places`, `itinerary_items` (`itineraryService.js`) | Initial queries in `itineraryService.js` referenced `created_at` and `updated_at` on `itinerary_days`, `places`, and `itinerary_items`, whereas `0001_initial_baseline.sql` defines those three tables without timestamp audit columns. | Updated all SQL queries in `itineraryService.js` to match the exact columns in `0001_initial_baseline.sql` without altering existing tables. | Verified against live Cloud SQL PostgreSQL in `server/tests/itinerary.test.js` (`TC-14`). |
| `BUG-P4-02` | Route Attribution Object Rendering in `RouteSummary.jsx` | `PROVIDER_CONFIG.openRouteService.attribution` is an object (`{ service, url, text }`), causing React to throw when `{route.attribution}` was rendered directly as a JSX child in `RouteSummary.jsx`. | Updated `RouteSummary.jsx` to render `typeof route.attribution === 'string' ? route.attribution : route.attribution?.text` safely. | Verified in Chromium E2E test (`TC-16`). |
| `BUG-P41-01` | Simulated Local E2E Route Indistinguishable from Real openrouteservice Output (`routingService.js`, `RouteSummary.jsx`, `ItineraryMap.jsx`, `providers.js`) | `buildLocalE2eControlledRoute()` returned `PROVIDER_CONFIG.openRouteService.attribution` and omitted `isMock`/`source` metadata, causing `RouteSummary.jsx` to display simulated Haversine metrics (`59.9 km`, `1 hr 30 min`) as if they were real openrouteservice road directions. | Added `isLocalE2eMockRoutingAllowed(env)`, `describeRouteSummaryState(route)`, and explicit `isMock: true`, `source: 'LOCAL_E2E_MOCK'`, `attribution: null` on simulated routes (`isMock: false`, `source: 'OPENROUTESERVICE'` on real routes); updated `RouteSummary.jsx` to render `SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS` and suppress fake navigation numbers when `isMock === true`; separated OpenStreetMap tile attribution from route-provider attribution. | Verified in `server/tests/itinerary.test.js` (`TC-15`) and Chromium (`TC-17`). |
| `BUG-P41-02` | Out-of-Range Itinerary Days Left with Temporary `day_order + 1000000` When Trip Dates Shortened (`itineraryService.js`, `itineraryController.js`, `ItineraryPage.jsx`) | `initializeTripItinerary()` shifted all existing `itinerary_days.day_order` by `+ 1000000` before only renumbering dates inside `start_date..end_date`, leaving out-of-range days at `1000001+` and ignoring out-of-range days with data. | Updated `initializeTripItinerary()` to inspect all existing days and `item_count` **before** any `day_order` shift: throws HTTP `409 Conflict` (`ITINERARY_OUTSIDE_RANGE_HAS_DATA` with `details.affectedDays`) and rolls back if any out-of-range day has activities or notes; deletes only empty out-of-range days and renumbers `1..N`. Added non-destructive conflict alert banner (`[data-testid="itinerary-sync-conflict-banner"]`) in `ItineraryPage.jsx` and `Outside Current Trip Dates` badge in `ItineraryDaySection.jsx`. | Verified in `server/tests/itinerary.test.js` (`TC-14`) and Chromium (`TC-17`). |
| `BUG-P41-03` | Stale `autoInitializedRef`, `selectedDayId`, and Route State When Switching `:tripId` (`ItineraryPage.jsx`) | `ItineraryPage.jsx` used a boolean `autoInitializedRef.current` that never reset on `:tripId` change, included `selectedDayId` in `loadItinerary`'s `useCallback` dependencies, and did not abort in-flight itinerary/route requests when switching trips. | Replaced boolean ref with `autoInitTripIdRef.current`, added trip-change reset effect clearing `selectedDayId`, `routeResult`, `routeError`, `statusBanner`, `syncConflict`, and `itineraryData`, added `AbortController` (`loadAbortRef`, `routeAbortRef`) + request sequence guards (`loadRequestSeqRef`, `routeRequestSeqRef`), and added in-page trip switcher (`[data-testid="itinerary-trip-switcher"]`). | Verified in Chromium E2E test (`TC-17`). |
| `BUG-P5-01` | Equal Split Mode Classification (`inferSplitMode`) Order Sensitivity (`expenseService.js`) | All `expense_splits` rows inserted inside one PostgreSQL transaction share `created_at = NOW()`. When `fetchHydratedExpensesForTrip` ordered splits by `s.created_at ASC, u.full_name ASC`, alphabetical ordering by participant name placed the `33.34` remainder share at index 1 (`[33.33, 33.34, 33.33]`), causing index-by-index comparison in `inferSplitMode` to label a 3-way `100.00` equal split as `custom`. | Updated `inferSplitMode` in `server/src/services/expenseService.js` to compare the sorted minor-unit multiset of `splits` against `splitAmountEqually(amountStr, participantIds)` so equal split detection is order-independent. | Verified in `server/tests/expenses.test.js` (`TC-20`) and Chromium (`TC-21`). |
| `BUG-P6-01` | Outdated Member Role Label on `TripDetailsPage.jsx` & Persisting Expired Status on Accept/Decline (`TripDetailsPage.jsx`, `invitationService.js`) | 1. `TripDetailsPage.jsx` previously labeled active `member` access as `"Member (Read-Only in Phase 2)"`, which contradicted Phase 4–6 permissions where active members can edit itinerary items and expenses.<br>2. Throwing inside `withTransaction` when an invitation's `expires_at <= NOW()` would roll back the `UPDATE trip_invitations SET status = 'expired'` statement unless committed before throwing. | 1. Updated `TripDetailsPage.jsx` role badge and description to `Member (Can Edit Itinerary & Expenses)` with accurate collaboration copy.<br>2. Updated `acceptTripInvitation` and `declineTripInvitation` in `invitationService.js` to commit `status = 'expired'` inside `withTransaction` and return `{ error }` before throwing `410 INVITATION_EXPIRED`. | Verified in `server/tests/invitations.test.js` (`TC-23`) and Chromium (`TC-24`). |

---

# 10. Implementation Log — Phase 3.1 through Phase 6 Entries

### Phase 3.1 — Map Display, Destination Selection & Weather Stabilization (`v0.12`)

- **Date:** 2026-11-07
- **Phase:** P3.1
- **Status:** `IMPLEMENTED AND VERIFIED`
- **Summary:** Hardened `WeatherCard.jsx`, `DestinationSearch.jsx`, `MapView.jsx`, `TripDetailsPage.jsx`, and `auth.js`; separated deterministic unit tests from opt-in live provider smoke tests.

### Phase 4 — Complete Itinerary Management + Multi-Stop Route Planning (`v0.13`)

- **Date:** 2026-11-07
- **Phase:** P4
- **Status:** `IMPLEMENTED AND VERIFIED`
- **Summary:** Implemented day-wise itinerary CRUD, transactional activity reordering, `places` upsert, openrouteservice adapter, and `/trips/:tripId/itinerary` frontend workspace.

### Phase 4.1 — Routing Verification, Itinerary Data Safety & State Stabilization (`v0.14`)

- **Date:** 2026-11-07
- **Phase:** P4.1
- **Status:** `IMPLEMENTED AND VERIFIED` (Live external openrouteservice HTTP call `IMPLEMENTED BUT NOT VERIFIED` pending `OPENROUTESERVICE_API_KEY`)
- **Summary:** Added mock-vs-real route metadata (`isMock`, `source`, `attribution`), hardened `initializeTripItinerary()` with `409 ITINERARY_OUTSIDE_RANGE_HAS_DATA` protection, and isolated trip-switch state in `ItineraryPage.jsx`.

### Phase 5 — Trip Budget, Expense Management, Category Analytics, Group Splits & Settlement Tracking (`v0.15`)

- **Date:** 2026-11-08
- **Phase:** P5
- **Status:** `IMPLEMENTED AND VERIFIED`
- **Summary:** Applied `0003_expense_settlement_audit.sql`, built `moneyUtils.js`, `expenseValidator.js`, `expenseService.js`, `expenseController.js`, `expenseRoutes.js`, and `/trips/:tripId/expenses` UI workspace.

### Phase 6 — Trip Collaboration, Invitations & Member Role Management (`v0.16`)

- **Date:** 2026-11-08
- **Phase:** P6
- **Status:** `IMPLEMENTED AND VERIFIED`
- **Files created / modified:**
  - `/server/database/migrations/0004_trip_invitations.sql` (created `trip_invitations` table, `uq_trip_invitations_token_hash`, `chk_trip_invitations_role`, `chk_trip_invitations_status`, `chk_trip_invitations_email_normalized`, `idx_trip_invitations_trip_status_created`, and partial unique index `uq_trip_invitations_pending_trip_email`)
  - `/server/src/validators/memberValidator.js` (`validateUpdateMemberRoleInput`)
  - `/server/src/validators/invitationValidator.js` (`normalizeEmailAddress`, `validateCreateInvitationInput`, `validateInvitationTokenInput`)
  - `/server/src/services/memberService.js` (`listTripMembers`, `updateTripMemberRole`, `removeTripMember`)
  - `/server/src/services/invitationService.js` (`generateInvitationToken`, `hashInvitationToken`, `buildInvitationFragmentPath`, `expireStaleInvitationsForTrip`, `listTripInvitations`, `createTripInvitation`, `revokeTripInvitation`, `acceptTripInvitation`, `declineTripInvitation`)
  - `/server/src/controllers/memberController.js` & `/server/src/controllers/invitationController.js`
  - `/server/src/routes/memberRoutes.js` & `/server/src/routes/invitationRoutes.js` (mounted in `/server/src/routes/tripRoutes.js` and `/server/src/app.js`)
  - `/server/src/middleware/auth.js` & `/client/src/context/AuthContext.jsx` (preserved `emailVerified` on `req.user` and added guarded local loopback `DEV_E2E_INVITEE_TOKEN` for multi-user Playwright verification)
  - `/client/src/services/memberService.jsx` (client API wrapper for member and invitation endpoints)
  - `/client/src/pages/TripMembersPage.jsx` (`/trips/:tripId/members`) & `/client/src/pages/TripInvitationPage.jsx` (`/invitations/accept`)
  - `/client/src/App.jsx`, `/client/src/pages/TripDetailsPage.jsx`, `/client/src/components/ParticipantBalanceCard.jsx`, and `/client/src/styles/index.css`
  - `/server/tests/members.test.js`, `/server/tests/invitations.test.js`, `/server/tests/stack.test.js`, and `/package.json`
  - `/docs/ROUTEWISE_PROJECT_NOTEBOOK.md` (updated to `v0.16`)
- **Next Recommended Development Phase:** **Phase 7 — Release Readiness, Historical Migration Replay Verification & Final Academic Presentation Packaging**.

