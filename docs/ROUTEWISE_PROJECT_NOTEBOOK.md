# RouteWise — Project Notebook

**Product name:** RouteWise  
**Tagline:** Smart Travel Planning  
**Project type:** BCA/MCA academic major project / full-stack web application  
**Team:** Naveed Mushtaq, Mohammad Shariq Khawaja, Nayeem  
**Planning window:** 2–3 months  
**Target cash budget:** ₹0, subject to provider limits and terms  
**Document version:** 0.15 (Phase 5 Trip Budget, Expense Management, Category Analytics, Group Splits & Settlement Tracking)  
**Last updated:** 8 November 2026  
**Project status:** Phases 0–5 `IMPLEMENTED AND VERIFIED` (PostgreSQL Trip CRUD + Leaflet/OSM Map + Open-Meteo Geocoding/Weather + Day-Wise Itinerary CRUD/Reordering + Safe Date-Range Reconciliation + Trip-Switch State Isolation + Routing Adapter & Mock-Route Transparency + Trip Budget, Expense Management, Category Analytics, Group Splits & Settlement Tracking; Live openrouteservice HTTP Integration `IMPLEMENTED BUT NOT VERIFIED` pending `OPENROUTESERVICE_API_KEY`); Phase 6 Member Collaboration & Invitations `PLANNED`  

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
| FR-06 | Add trip members | Medium | Owner can add permitted members; duplicate membership is rejected by `UNIQUE (trip_id, user_id)`. | Read RBAC verified in `trips.test.js`; member management UI/API planned for later collaboration extension. | `PLANNED` |
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
| `/trips/:tripId` | Displays saved trip metadata, `Open Trip Itinerary` button, interactive **Destination Map** (`MapView.jsx`), live **Destination Weather** (`WeatherCard.jsx`), owner-only inline location confirmation (`+ Confirm Destination Location` with `autoSearchOnMount`) and location change (`Change Destination Location`), full edit (`TripForm.jsx`), and delete (`ConfirmDialog.jsx`). | `TripDetailsPage.jsx`, `MapView.jsx`, `WeatherCard.jsx`, `DestinationSearch.jsx`, `TripForm.jsx`, `ConfirmDialog.jsx` | `IMPLEMENTED AND VERIFIED` |
| `/trips/:tripId/itinerary` | Complete day-wise itinerary planner & multi-stop route map: auto-initializes trip days (`1..N`), safely synchronizes date ranges (`409 ITINERARY_OUTSIDE_RANGE_HAS_DATA` conflict banner when out-of-range days contain data), provides in-page trip switcher with clean trip-state reset (`AbortController`, `autoInitTripIdRef`), edits day notes, adds/edits/deletes/reorders activities with optional Open-Meteo geocoded `PlaceSearch.jsx` stops, computes exact daily & total estimated costs, and calculates/renders multi-stop GeoJSON `LineString` routes (`driving-car`, `foot-walking`, `cycling-regular`) on `ItineraryMap.jsx` with explicit mock-route vs. real-provider labeling. | `ItineraryPage.jsx`, `ItineraryDaySection.jsx`, `ItineraryItemCard.jsx`, `ItineraryItemForm.jsx`, `PlaceSearch.jsx`, `ItineraryMap.jsx`, `RouteProfileSelector.jsx`, `RouteSummary.jsx` | `IMPLEMENTED AND VERIFIED` (Live external openrouteservice HTTP call `IMPLEMENTED BUT NOT VERIFIED` pending `OPENROUTESERVICE_API_KEY`) |
| `/trips/:tripId/expenses` | Complete trip budget, expense management, category analytics, group splits (`equal` and `custom`), participant balance cards, pairwise settlement summary, settlement toggle with audit trail (`settled_at`, `settled_by_user_id`), and financial-edit settlement-reset confirmation dialog (`409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED`). | `ExpensesPage.jsx`, `BudgetOverview.jsx`, `CategoryBreakdown.jsx`, `GroupSettlementPanel.jsx`, `ParticipantBalanceCard.jsx`, `ExpenseForm.jsx`, `ExpenseSplitEditor.jsx`, `ExpenseList.jsx`, `ExpenseCard.jsx`, `ConfirmDialog.jsx` | `IMPLEMENTED AND VERIFIED` |

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
| `ParticipantBalanceCard` | `client/src/components/ParticipantBalanceCard.jsx` | `{ balance, currency, isCurrentUser }` | `GroupSettlementPanel.jsx` | Displays a trip participant's role badge, `Total Paid`, `Total Share`, `Pending to Pay`, `Pending to Receive`, and net status badge (`Settled`, `Gets back ...`, or `Owes ...`). | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseForm` | `client/src/components/ExpenseForm.jsx` | `{ trip, participants, categories, currentUserId, initialExpense, onSubmit, onCancel, isSubmitting, serverError }` | `ExpensesPage.jsx` | Create/edit expense form with client validation, category selector, payer selector, date picker, notes input, and integrated `ExpenseSplitEditor.jsx`. Detects when a financial edit (`amount`, `paidByUserId`, or `split`) affects already-settled non-payer shares and shows a warning notice. | `TC-19`..`TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseSplitEditor` | `client/src/components/ExpenseSplitEditor.jsx` | `{ amount, currency, participants, paidByUserId, splitMode, onSplitModeChange, selectedParticipantIds, onSelectedParticipantsChange, customSharesByUserId, onCustomSharesChange, disabled }` | `ExpenseForm.jsx` | Interactive group split editor supporting `Equal Split` (live deterministic minor-unit preview matching backend `33.34 / 33.33 / 33.33` allocation) and `Custom Split` (per-participant decimal inputs with live Assigned Total vs. Expense Total and Remaining Difference indicator). | `TC-19`..`TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseList` | `client/src/components/ExpenseList.jsx` | `{ expenses, categories, participants, currency, currentUserId, tripOwnerId, userRole, onEditExpense, onDeleteExpense, onToggleSplitSettlement, busySplitId, onOpenCreateForm }` | `ExpensesPage.jsx` | Renders filterable expense list (by category, payer, and settlement status: `All`, `Has Pending Shares`, `Fully Settled`) and delegates each item to `ExpenseCard.jsx`. | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `ExpenseCard` | `client/src/components/ExpenseCard.jsx` | `{ expense, currency, currentUserId, tripOwnerId, userRole, onEdit, onDelete, onToggleSplitSettlement, busySplitId }` | `ExpenseList.jsx` | Displays an expense's title, category badge, date, amount, payer, creator, split mode badge (`Equal Split` vs `Custom Split`), per-participant split breakdown with settlement status (`Paid & Covered`, `Settled on YYYY-MM-DD (marked by ...)`, or `Pending`), authorized `Mark as Settled` / `Mark Unsettled` button, and owner/creator-only `Edit` and `Delete` actions. | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |
| `expenseService` (client) | `client/src/services/expenseService.jsx` | `fetchTripExpensesDashboard`, `createTripExpenseRequest`, `updateTripExpenseRequest`, `deleteTripExpenseRequest`, `updateExpenseSplitSettlementRequest` | `ExpensesPage.jsx` | Client REST wrapper for all `/api/trips/:tripId/expenses*` endpoints via `apiClient.jsx` with `AbortSignal` support. | `TC-20`, `TC-21` — `IMPLEMENTED AND VERIFIED` |

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

## 5.2 SQL Migration Log

| Migration file | Date | Purpose | Executed on Cloud SQL (`ai-studio-de6d6586`)? | Verification Evidence | Status |
|---|---|---|---|---|---|
| `server/database/migrations/0001_initial_baseline.sql` | 2026-11-07 | Initial 8-table PostgreSQL relational schema baseline. | Yes (Phase 0). | Verified 8 tables via `information_schema.columns` and Phase 2 CRUD tests. | `IMPLEMENTED AND VERIFIED` |
| `server/database/migrations/0002_trip_destination_coordinates.sql` | 2026-11-07 | Non-destructive `ALTER TABLE "trips"` adding nullable `destination_latitude NUMERIC(9,6)`, `destination_longitude NUMERIC(9,6)`, and `chk_trips_destination_coords_pair_and_range`. | Yes (Phase 3). | Verified 13 columns on `trips` via `cloudsql.ExecuteSql` (`0.0066s`) and live coordinate persistence in `server/tests/trips.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `server/database/migrations/0003_expense_settlement_audit.sql` | 2026-11-08 | Non-destructive `ALTER TABLE "expense_splits"` adding nullable `settled_at TIMESTAMPTZ`, `settled_by_user_id UUID REFERENCES "users"("id") ON DELETE SET NULL`, and indexes `idx_expense_splits_user_settled` and `idx_expense_splits_expense_id`. | Yes (Phase 5). | Executed via `cloudsql.ExecuteSql` (`0.016051s`); verified 9 columns on `expense_splits` and live persistence in `server/tests/expenses.test.js` (`TC-20`) and Chromium (`TC-21`). | `IMPLEMENTED AND VERIFIED` |

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
| `TC-14` | `FR-11`, `FR-12` | Live PostgreSQL + HTTP Itinerary lifecycle & date-range reconciliation (`server/tests/itinerary.test.js`):<br>1. `itineraryValidator` tests (notes, title length, `endTime > startTime`, negative cost, paired place coordinates, reorder UUIDs, route profiles, exact `BigInt` `sumDecimalStrings`).<br>2. Unauthenticated (`401`), non-member (`404`), and viewer (`403` on initialize/notes/create/update/delete/reorder; `200` on `GET`).<br>3. Owner `POST .../initialize` creates 3 ordered days (`2026-10-10..2026-10-12`); idempotent re-initialization preserves notes and activities.<br>4. Member `PATCH .../days/:dayId` updates notes; activity CRUD with geocoded places (upserting `places`) and without a place (`place_id = NULL`); conflict-free `PATCH .../items/reorder` (`1..3`) and `DELETE .../items/:itemId` (`1..2`).<br>5. **Date-range reconciliation:**<br>  - Extending trip (`2026-10-10..2026-10-13`) adds Day 4 and preserves Days 1–3.<br>  - Shortening trip (`2026-10-11..2026-10-12`) when out-of-range Day 1 (`2026-10-10`) has 2 activities returns `409 ITINERARY_OUTSIDE_RANGE_HAS_DATA` (`affectedDays[0].itemCount === 2`) and rolls back cleanly (`dayOrder` remains `[1, 2, 3, 4]`, not `+1000000`).<br>  - Deleting Day 1's activities while Day 1 still has notes still returns `409 ITINERARY_OUTSIDE_RANGE_HAS_DATA` (`hasNotes: true`).<br>  - Clearing Day 1's notes and re-running `POST .../initialize` returns `200`, deletes empty out-of-range days (`2026-10-10`, `2026-10-13`), and renumbers remaining days `2026-10-11..2026-10-12` to `dayOrder = [1, 2]`. | `npm test` (`node --test server/tests/*.test.js`) | All itinerary validator, CRUD, RBAC, and date-range reconciliation tests pass against live Cloud SQL PostgreSQL | **PASS (`20 pass, 0 fail, 2 skipped`, `1991.42ms`)**: Full HTTP + PostgreSQL itinerary & date-range reconciliation lifecycle passed. | `IMPLEMENTED AND VERIFIED` |
| `TC-15` | `FR-12`, `FR-10` | **Mocked / Unit Multi-Stop Routing & Mock-Gate Tests** (`server/tests/itinerary.test.js` — does **not** call live openrouteservice):<br>1. `< 2` geocoded stops returns `400 INSUFFICIENT_ROUTE_STOPS`.<br>2. Missing `OPENROUTESERVICE_API_KEY` returns `503 ROUTING_KEY_MISSING`.<br>3. Production environment (`NODE_ENV: 'production'`) rejects `isLocalE2eMockRoutingAllowed` even when `ROUTEWISE_ENABLE_LOCAL_E2E_AUTH=true` and `ROUTEWISE_ENABLE_LOCAL_E2E_ORS_MOCK=true`, returning `503 ROUTING_KEY_MISSING`.<br>4. Controlled local E2E mock route returns `isMock: true`, `source: 'LOCAL_E2E_MOCK'`, `attribution: null`, and `describeRouteSummaryState` produces `showRealMetrics: false` (`distanceDisplay: 'Simulated (Not Real Road Distance)'`, `durationDisplay: 'Simulated (Not Real Travel Time)'`).<br>5. Mocked openrouteservice `200` GeoJSON response verifies endpoint `https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson`, `Authorization` header, `[longitude, latitude]` coordinate payload, `isMock: false`, `source: 'OPENROUTESERVICE'`, `attribution.service: 'openrouteservice'`, and `describeRouteSummaryState` `showRealMetrics: true`.<br>6. Upstream `429` rate limit and `500 -> 502` error mapping. | `npm test` | All routing service unit, mock-gate, and HTTP error-mapping tests pass | **PASS:** Verified in `server/tests/itinerary.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `TC-16` | `FR-11`, `FR-12` | **Chromium Playwright E2E Verification — Itinerary CRUD & Local E2E Simulated Route** (`playwright-cli` on `http://localhost:3000`):<br>1. Verified day initialization, day note saving, activity creation (with and without geocoded places), exact `BigInt` cost totals (`INR 4150.75`), activity reordering (`#1`, `#2`), and activity deletion (`INR 3700.50`).<br>2. **Important Correction (`v0.14`):** The route polyline rendered during Phase 4 local E2E testing used the controlled local E2E simulated route (`LOCAL_E2E_MOCK`), **not** a live openrouteservice response. | `playwright-cli` on `http://localhost:3000` | Itinerary CRUD, numbered markers, and simulated E2E route polyline verified in Chromium | **PASS:** Verified in Chromium (`TC-16` & `TC-17`). | `IMPLEMENTED AND VERIFIED` |
| `TC-17` | `FR-11`, `FR-12` | **Chromium Playwright E2E Verification — Phase 4.1 Mock-Route Labeling, Date-Range Conflict & Trip-Switch Reset** (`playwright-cli` on `http://localhost:3000`):<br>1. Created Trip A (`2026-11-10..2026-11-12`) and Trip B (`2026-12-01..2026-12-02`).<br>2. Populated Trip A Day 1 (`2026-11-10`) with notes and 2 geocoded stops (`Dal Lake Shikara Pier`, `Pahalgam Valley Point`).<br>3. Calculated route in local E2E mode -> verified `[data-testid="mock-route-banner"]` displays **`SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS`**, distance/duration display `"Simulated (Not Real Road Distance)"` / `"Simulated (Not Real Travel Time)"` instead of presenting fake numbers as real navigation info, and `[data-testid="route-attribution"]` displays `"Source: Local E2E Simulated Geometry (LOCAL_E2E_MOCK) — Not provided by openrouteservice"`.<br>4. Shortened Trip A dates to `2026-11-11..2026-11-12` -> verified `[data-testid="day-1-outside-range-badge"]` (`Outside Current Trip Dates`) -> clicked `Sync Itinerary Days` -> verified `[data-testid="itinerary-sync-conflict-banner"]` (`ITINERARY_OUTSIDE_RANGE_HAS_DATA`) while Day 1's 2 activities and notes remained intact.<br>5. Switched directly from Trip A to Trip B via `[data-testid="itinerary-trip-switcher"]` without full page reload -> verified Trip A's mock route and conflict banner cleared immediately, Trip B auto-initialized its 2 days (`2026-12-01`, `2026-12-02`), and `selectedDayId` updated to Trip B's Day 1. | `playwright-cli` on `http://localhost:3000` | All Phase 4.1 browser E2E checks pass with zero console/page errors and all temporary test rows cleaned up afterward | **PASS:** Verified in Chromium (`.playwright-cli/phase41-mock-and-conflict.png` inspected; all E2E test rows deleted from PostgreSQL afterward). | `IMPLEMENTED AND VERIFIED` |
| `TC-18` | `FR-12` | Opt-in live openrouteservice Directions API smoke test (`Srinagar -> Pahalgam`, `driving-car`). | `npm run test:ors` (`RUN_LIVE_ORS_TESTS=1 node --test server/tests/itinerary.test.js`) | Skips cleanly when `OPENROUTESERVICE_API_KEY` is not set; calls live `api.heigit.org` when configured | **SKIPPED (`ORS_KEY_CONFIGURED: false`):** `OPENROUTESERVICE_API_KEY` is not configured in the current environment (`1 skipped`). | `IMPLEMENTED BUT NOT VERIFIED` (Blocked on `OPENROUTESERVICE_API_KEY` not configured in environment) |
| `TC-19` | `FR-14`..`FR-16` | **Expense Validator & `BigInt` Money Arithmetic Unit Tests** (`server/tests/expenses.test.js`):<br>1. `moneyUtils`: `parseMoneyToMinorUnits`, `formatMinorUnitsToDecimal`, `sumDecimalStrings`, `subtractDecimalStrings`, `calculatePercentageString`, and deterministic equal split `splitAmountEqually("100.00", [u1, u2, u3])` -> `["33.34", "33.33", "33.33"]` (`SUM === "100.00"`).<br>2. `expenseValidator`: rejects `0`, negative amounts, `> 2` decimal places, amounts exceeding `9999999999.99`, invalid categories, invalid calendar dates (`2026-02-30`), non-member `paidByUserId`, non-member split participants, duplicate split participants, and custom split sums that do not equal `amount` (`99.99 !== 100.00`). | `npm test` (`node --test server/tests/*.test.js`) | Pass | **PASS:** Verified in `server/tests/expenses.test.js`. | `IMPLEMENTED AND VERIFIED` |
| `TC-20` | `FR-13`..`FR-17` | **Live PostgreSQL + Express HTTP Expense, Budget, Category Analytics, Split & Settlement Lifecycle** (`server/tests/expenses.test.js`):<br>1. Auth & RBAC: unauthenticated (`401`), outsider (`404`), `viewer` (`200` on `GET`, `403` on `POST`/`PATCH`/`DELETE`/settlement).<br>2. Equal split expense creation (`INR 100.00` across 3 participants -> `33.34`, `33.33`, `33.33`), verifying payer share auto-settled (`isSettled: true`, `settledAt` populated, `settledByUserId = paidByUserId`) and non-payer shares pending (`isSettled: false`).<br>3. Custom split expense creation (`INR 450.00` across 2 participants -> `270.00` + `180.00`), pushing total expenses to `INR 550.00` against `INR 500.00` planned budget (`remainingBudget: "-50.00"`, `budgetUsagePercentage: "110.00"`, `isOverBudget: true`, `budgetStatus: "OVER_BUDGET"`), and verifying `plannedBudget = "0.00"` returns `budgetUsagePercentage: null` (`budgetStatus: "NO_PLANNED_BUDGET"`).<br>4. Category breakdown sorting (`food: 450.00`, `accommodation: 100.00`) and strict separation of `itineraryEstimatedTotal` from `totalExpenses`.<br>5. Ownership RBAC on edit/delete (`403` when Member B attempts to edit or delete Owner A's expense; `200` when Member B edits their own expense).<br>6. Settlement toggle (`PATCH .../splits/:splitId/settlement`), payer share protection (`400 PAYER_SHARE_ALREADY_COVERED`), metadata-only edit preserving settled shares, and financial edit on an expense with settled non-payer shares returning `409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED` without `confirmSettlementReset: true` and succeeding (`200`) with `confirmSettlementReset: true`.<br>7. Expense deletion cascading `expense_splits` (`0` orphan rows in `expense_splits`) and recalculating totals. | `npm test` (`node --test server/tests/*.test.js`) | All 22 automated tests pass against live Cloud SQL PostgreSQL | **PASS (`24 tests, 22 pass, 0 fail, 2 skipped`, `2543.11ms`)**: Full HTTP + PostgreSQL financial lifecycle passed. | `IMPLEMENTED AND VERIFIED` |
| `TC-21` | `FR-13`..`FR-17` | **Chromium Playwright E2E Verification — Trip Budget, Expenses, Splits & Settlement (`/trips/:tripId/expenses`)** (`playwright-cli` on `http://localhost:3000`):<br>1. Navigated from Trip Details (`[data-testid="open-expenses-btn"]`) to `/trips/:tripId/expenses` for a trip with 3 active participants.<br>2. Updated planned budget inline from `INR 1000.00` to `INR 500.00` (`[data-testid="edit-planned-budget-btn"]`).<br>3. Created Equal Split expense (`INR 100.00` across 3 participants) -> verified live preview and persisted split shares `INR 33.34`, `INR 33.33`, `INR 33.33` with payer share `Paid & Covered`.<br>4. Created Custom Split expense (`INR 450.00` across 2 participants: `270.00` + `180.00`) -> verified `[data-testid="over-budget-banner"]` (`OVER_BUDGET`, `Remaining: INR -50.00`, `110.00% used`), category breakdown (`Food & Dining INR 450.00`, `Accommodation INR 100.00`), and participant balance cards.<br>5. Clicked `Mark as Settled` on a non-payer share (`INR 33.33`), reloaded page in Chromium (`page.reload()`), and verified persisted settlement audit trail (`Settled on 2026-11-08 (marked by ...)`).<br>6. Edited the `INR 100.00` expense amount to `INR 150.00` -> verified `[data-testid="settlement-reset-confirm-dialog"]` appeared (`409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED`), clicked `Confirm & Reset Settlements`, and verified shares updated to `INR 50.00` each with non-payer shares reset to `Pending`.<br>7. Deleted the `INR 450.00` expense via confirmation modal -> verified total spending recalculated to `INR 150.00` (`WITHIN_BUDGET`, `Remaining: INR 350.00`).<br>8. Verified desktop (`1440x900`) and mobile (`390x844`) responsive layout with zero horizontal overflow (`scrollWidth <= clientWidth`) and zero console/page errors. | `playwright-cli` on `http://localhost:3000` | All Phase 5 browser E2E checks pass with zero console/page errors and all temporary test rows cleaned up afterward | **PASS:** Verified in Chromium (`desktop 1440x900` and `mobile 390x844`; all E2E test rows deleted from PostgreSQL afterward). | `IMPLEMENTED AND VERIFIED` |

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

---

# 10. Implementation Log — Phase 3.1, Phase 4 & Phase 4.1 Entries

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
- **Files modified:**
  - `/server/src/config/providers.js` (separated openrouteservice route attribution from OpenStreetMap tile attribution)
  - `/server/src/services/routingService.js` (added `isLocalE2eMockRoutingAllowed`, `describeRouteSummaryState`, `formatDistanceKm`, `formatDurationHuman`, explicit `isMock`/`source`/`provider`/`notice`/`attribution` metadata on mock vs. real routes)
  - `/server/src/services/itineraryService.js` (hardened `initializeTripItinerary()` to inspect out-of-range days before any `day_order` shift, throw `409 ITINERARY_OUTSIDE_RANGE_HAS_DATA` when out-of-range days contain activities or notes, delete only empty out-of-range days, and compute `isOutsideTripRange`)
  - `/server/src/controllers/itineraryController.js` (returned structured JSON `409` / `400` responses with `code` and `details` from `initializeTripItineraryHandler`)
  - `/client/src/services/itineraryService.jsx` (added `{ signal }` passthrough to `fetchTripItinerary`, `initializeTripItineraryRequest`, and `calculateDayRouteRequest`)
  - `/client/src/components/RouteSummary.jsx` (rendered `SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS` banner, suppressed simulated distance/duration from being displayed as real navigation info, and prevented openrouteservice attribution on mock routes)
  - `/client/src/components/ItineraryMap.jsx` (distinguished simulated test route lines from active road route lines while keeping OpenStreetMap tile attribution separate)
  - `/client/src/components/ItineraryDaySection.jsx` (rendered `Outside Current Trip Dates` badge when `day.isOutsideTripRange === true`)
  - `/client/src/pages/ItineraryPage.jsx` (reset trip-specific state on `:tripId` change, added `AbortController` + request sequence guards, added `[data-testid="itinerary-trip-switcher"]`, and rendered non-destructive `409 ITINERARY_OUTSIDE_RANGE_HAS_DATA` conflict banner)
  - `/client/src/styles/index.css` (added styles for `.route-summary-mock`, `.route-mock-banner`, `.itinerary-sync-conflict-banner`, and `.itinerary-trip-switcher`)
  - `/server/tests/itinerary.test.js` (added unit and live PostgreSQL regression tests for mock-vs-real route metadata, production mock-gate rejection, and date-range reconciliation `409` rollback / `200` empty-day cleanup)
  - `/docs/ROUTEWISE_PROJECT_NOTEBOOK.md` (updated to `v0.14`)
- **Next Recommended Development Phase:** **Phase 5 — Trip Budgets, Expense Recording, Category Breakdown & Group Expense Splits (`expenses`, `expense_splits`)**.

### Phase 5 — Trip Budget, Expense Management, Category Analytics, Group Splits & Settlement Tracking (`v0.15`)

- **Date:** 2026-11-08
- **Phase:** P5
- **Status:** `IMPLEMENTED AND VERIFIED`
- **Files created / modified:**
  - `/server/database/migrations/0003_expense_settlement_audit.sql` (added nullable `settled_at` and `settled_by_user_id` to `expense_splits` plus lookup indexes)
  - `/server/src/utils/moneyUtils.js` (`BigInt` minor-unit money parser, formatter, addition, subtraction, percentage, and deterministic `splitAmountEqually`)
  - `/server/src/validators/expenseValidator.js` (8-category allowlist, expense create/update validator, equal & custom split validator, and settlement validator)
  - `/server/src/middleware/tripAccess.js` (added and exported `requireTripEditor`)
  - `/server/src/services/expenseService.js` (active trip participant resolution, transactional expense + split CRUD, payer auto-settlement, `409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED` financial edit guard, category breakdown, participant balance matrix, and pairwise settlement summary)
  - `/server/src/controllers/expenseController.js` & `/server/src/routes/expenseRoutes.js` (mounted at `/api/trips/:tripId/expenses` in `/server/src/routes/tripRoutes.js`)
  - `/client/src/services/expenseService.jsx` (client API wrapper for `/api/trips/:tripId/expenses*`)
  - `/client/src/components/BudgetOverview.jsx`, `/client/src/components/CategoryBreakdown.jsx`, `/client/src/components/ParticipantBalanceCard.jsx`, `/client/src/components/GroupSettlementPanel.jsx`, `/client/src/components/ExpenseSplitEditor.jsx`, `/client/src/components/ExpenseForm.jsx`, `/client/src/components/ExpenseCard.jsx`, `/client/src/components/ExpenseList.jsx`, and `/client/src/pages/ExpensesPage.jsx`
  - `/client/src/App.jsx`, `/client/src/pages/TripDetailsPage.jsx`, `/client/src/pages/ItineraryPage.jsx`, and `/client/src/styles/index.css`
  - `/server/tests/expenses.test.js`, `/server/tests/stack.test.js`, and `/package.json`
  - `/docs/ROUTEWISE_PROJECT_NOTEBOOK.md` (updated to `v0.15`)
- **Next Recommended Development Phase:** **Phase 6 — Trip Member Collaboration, Invitations & Role Management (`trip_members` CRUD UI/API)** or **Final Academic Polish & Presentation Packaging**.

