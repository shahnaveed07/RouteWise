import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express, { Router } from 'express';
import { createRequireAuth } from '../src/middleware/auth.js';
import { createTripAccessMiddleware } from '../src/middleware/tripAccess.js';
import {
  sumDecimalStrings,
  validateActivityInput,
  validateDayNotesInput,
  validatePlaceInput,
  validateReorderItemsInput,
  validateRouteRequestInput,
} from '../src/validators/itineraryValidator.js';
import { generateDateRange } from '../src/services/itineraryService.js';
import {
  calculateDayRoute,
  describeRouteSummaryState,
  extractRouteStopsFromItems,
  isLocalE2eMockRoutingAllowed,
} from '../src/services/routingService.js';
import {
  calculateDayRouteHandler,
  createItineraryItemHandler,
  deleteItineraryItemHandler,
  getTripItineraryHandler,
  initializeTripItineraryHandler,
  listDayItemsHandler,
  reorderItineraryItemsHandler,
  updateItineraryDayNotesHandler,
  updateItineraryItemHandler,
} from '../src/controllers/itineraryController.js';
import { getOrCreateUser } from '../src/services/userService.js';
import { createTrip, updateTripById } from '../src/services/tripService.js';
import { pool, query } from '../src/config/db.js';

test('itineraryValidator validates day notes, activity fields, HH:MM times, place coords, reorder UUIDs, route profiles, and exact BigInt decimal cost summation', () => {
  // 1. Exact decimal string summation without floating-point inaccuracy
  assert.equal(sumDecimalStrings(['0.10', '0.20', '1499.95', '0.05']), '1500.30');
  assert.equal(sumDecimalStrings([]), '0.00');

  // 2. Day notes validation
  assert.equal(validateDayNotesInput({}).valid, false);
  assert.equal(validateDayNotesInput({ notes: 'A'.repeat(5001) }).valid, false);
  assert.equal(validateDayNotesInput({ notes: '  Arrival and acclimatization  ' }).data.notes, 'Arrival and acclimatization');
  assert.equal(validateDayNotesInput({ notes: '   ' }).data.notes, null);

  // 3. Activity validation: title, start/end time, negative cost
  assert.equal(validateActivityInput({ title: '' }).valid, false);
  assert.equal(validateActivityInput({ title: 'A'.repeat(181) }).valid, false);
  assert.equal(
    validateActivityInput({
      title: 'Shikara Ride',
      startTime: '14:00',
      endTime: '12:30',
    }).valid,
    false
  );
  assert.equal(
    validateActivityInput({
      title: 'Shikara Ride',
      startTime: '14:00',
      endTime: '14:00',
    }).valid,
    false
  );
  assert.equal(
    validateActivityInput({
      title: 'Shikara Ride',
      estimatedCost: '-15.00',
    }).valid,
    false
  );
  assert.equal(
    validateActivityInput({
      title: 'Shikara Ride',
      estimatedCost: '250.5',
      startTime: '09:30',
      endTime: '11:00',
    }).data.estimatedCost,
    '250.50'
  );

  // 4. Place validation: paired coordinates and ranges
  assert.equal(
    validatePlaceInput({
      name: 'Dal Lake',
      latitude: 34.0837,
    }).valid,
    false
  );
  assert.equal(
    validatePlaceInput({
      name: 'Dal Lake',
      latitude: 95,
      longitude: 74.7973,
    }).valid,
    false
  );
  const validPlace = validatePlaceInput({
    provider: 'open-meteo-geocoding',
    providerPlaceId: '1255634',
    name: 'Srinagar',
    address: 'Jammu and Kashmir, India',
    latitude: 34.083656,
    longitude: 74.797371,
  });
  assert.equal(validPlace.valid, true);
  assert.equal(validPlace.data.latitude, 34.083656);

  // 5. Reorder UUID list validation
  assert.equal(validateReorderItemsInput({ itemIds: [] }).valid, false);
  assert.equal(validateReorderItemsInput({ itemIds: ['not-a-uuid'] }).valid, false);
  const idA = crypto.randomUUID();
  assert.equal(validateReorderItemsInput({ itemIds: [idA, idA] }).valid, false);

  // 6. Route profile validation
  assert.equal(validateRouteRequestInput({ profile: 'driving-car' }).valid, true);
  assert.equal(validateRouteRequestInput({ profile: 'foot-walking' }).valid, true);
  assert.equal(validateRouteRequestInput({ profile: 'cycling-regular' }).valid, true);
  assert.equal(validateRouteRequestInput({ profile: 'flying-helicopter' }).valid, false);
});

test('generateDateRange produces inclusive UTC calendar dates and extractRouteStopsFromItems orders [lon, lat] stops while skipping unpinned items', () => {
  const dates = generateDateRange('2026-11-10', '2026-11-13');
  assert.deepEqual(dates, ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);

  const { stops, skippedItems } = extractRouteStopsFromItems([
    {
      id: 'item-2',
      title: 'Lunch Break (Unpinned)',
      sortOrder: 2,
      place: null,
    },
    {
      id: 'item-1',
      title: 'Dal Lake Gate 1',
      sortOrder: 1,
      place: {
        name: 'Dal Lake',
        latitude: 34.0837,
        longitude: 74.7973,
      },
    },
    {
      id: 'item-3',
      title: 'Mughal Gardens Nishat',
      sortOrder: 3,
      place: {
        name: 'Nishat Bagh',
        latitude: 34.1246,
        longitude: 74.8806,
      },
    },
  ]);

  assert.equal(stops.length, 2);
  assert.equal(skippedItems.length, 1);
  assert.equal(stops[0].itemId, 'item-1');
  // Verify openrouteservice [longitude, latitude] coordinate ordering!
  assert.deepEqual(stops[0].orsCoordinate, [74.7973, 34.0837]);
  assert.equal(stops[1].itemId, 'item-3');
  assert.deepEqual(stops[1].orsCoordinate, [74.8806, 34.1246]);
});

test('calculateDayRoute and RouteSummary distinguish local E2E mock routes from real openrouteservice responses, reject mock in production, and handle 400/503/429/502/504', async () => {
  // 1. Fewer than 2 geocoded stops -> 400 INSUFFICIENT_ROUTE_STOPS
  await assert.rejects(
    () =>
      calculateDayRoute({
        items: [
          {
            id: 'only-1',
            title: 'Single Stop',
            sortOrder: 1,
            place: { name: 'Srinagar', latitude: 34.0837, longitude: 74.7973 },
          },
        ],
        profile: 'driving-car',
      }),
    (err) => err.status === 400 && err.code === 'INSUFFICIENT_ROUTE_STOPS'
  );

  const sampleItems = [
    {
      id: 'stop-1',
      title: 'Srinagar Center',
      sortOrder: 1,
      place: { name: 'Srinagar', latitude: 34.0837, longitude: 74.7973 },
    },
    {
      id: 'stop-2',
      title: 'Unpinned Coffee Stop',
      sortOrder: 2,
      place: null,
    },
    {
      id: 'stop-3',
      title: 'Pahalgam Valley',
      sortOrder: 3,
      place: { name: 'Pahalgam', latitude: 34.0161, longitude: 75.315 },
    },
  ];

  // 2. Local E2E mock environment gate and explicit mock metadata
  const mockDevEnv = {
    NODE_ENV: 'development',
    ROUTEWISE_ENABLE_LOCAL_E2E_AUTH: 'true',
    ROUTEWISE_ENABLE_LOCAL_E2E_ORS_MOCK: 'true',
  };
  assert.equal(isLocalE2eMockRoutingAllowed(mockDevEnv), true);

  const mockRoute = await calculateDayRoute({
    items: sampleItems,
    profile: 'driving-car',
    env: mockDevEnv,
  });
  assert.equal(mockRoute.isMock, true);
  assert.equal(mockRoute.source, 'LOCAL_E2E_MOCK');
  assert.equal(mockRoute.provider, 'local-e2e-simulated');
  assert.equal(
    mockRoute.notice,
    'SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS'
  );
  assert.equal(mockRoute.attribution, null);

  // Verify RouteSummary UI state helper for mock routes:
  // - Visibly labels as simulated
  // - Never shows mock distance/duration as real road navigation metrics
  // - Never attributes mock route to openrouteservice
  const mockUiState = describeRouteSummaryState(mockRoute);
  assert.equal(mockUiState.isMock, true);
  assert.equal(mockUiState.source, 'LOCAL_E2E_MOCK');
  assert.equal(
    mockUiState.bannerHeading,
    'SIMULATED TEST ROUTE — NOT REAL ROAD DIRECTIONS'
  );
  assert.equal(
    mockUiState.distanceDisplay,
    'Simulated (Not Real Road Distance)'
  );
  assert.equal(
    mockUiState.durationDisplay,
    'Simulated (Not Real Travel Time)'
  );
  assert.equal(mockUiState.attributionUrl, null);
  assert.ok(
    mockUiState.attributionText.includes('Not provided by openrouteservice')
  );

  // 3. Production mode strictly rejects the mock path even when local E2E flags are set
  const prodEnvWithFlags = {
    NODE_ENV: 'production',
    ROUTEWISE_ENABLE_LOCAL_E2E_AUTH: 'true',
    ROUTEWISE_ENABLE_LOCAL_E2E_ORS_MOCK: 'true',
    OPENROUTESERVICE_API_KEY: '',
  };
  assert.equal(isLocalE2eMockRoutingAllowed(prodEnvWithFlags), false);
  await assert.rejects(
    () =>
      calculateDayRoute({
        items: sampleItems,
        profile: 'driving-car',
        env: prodEnvWithFlags,
      }),
    (err) => err.status === 503 && err.code === 'ROUTING_KEY_MISSING'
  );

  // 4. Missing key in normal mode -> 503 ROUTING_KEY_MISSING
  await assert.rejects(
    () =>
      calculateDayRoute({
        items: sampleItems,
        profile: 'driving-car',
        env: { NODE_ENV: 'development', OPENROUTESERVICE_API_KEY: '' },
      }),
    (err) => err.status === 503 && err.code === 'ROUTING_KEY_MISSING'
  );

  // 5. Real provider response via mocked fetch: verifies [lon, lat] payload, heiGIT endpoint, and non-mock metadata
  const realProviderEnv = {
    NODE_ENV: 'production',
    OPENROUTESERVICE_API_KEY: 'test-ors-key-12345',
  };
  const originalFetch = globalThis.fetch;
  let capturedUrl = null;
  let capturedHeaders = null;
  let capturedBody = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            bbox: [74.7973, 34.0161, 75.315, 34.0837],
            properties: {
              summary: {
                distance: 89420.4,
                duration: 7380.2,
              },
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [74.7973, 34.0837],
                [75.05, 34.05],
                [75.315, 34.0161],
              ],
            },
          },
        ],
      }),
    };
  };

  try {
    const route = await calculateDayRoute({
      items: sampleItems,
      profile: 'driving-car',
      env: realProviderEnv,
    });

    assert.equal(
      capturedUrl,
      'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson'
    );
    assert.equal(capturedHeaders.Authorization, 'test-ors-key-12345');
    assert.deepEqual(capturedBody.coordinates, [
      [74.7973, 34.0837],
      [75.315, 34.0161],
    ]);

    assert.equal(route.isMock, false);
    assert.equal(route.source, 'OPENROUTESERVICE');
    assert.equal(route.provider, 'openrouteservice');
    assert.equal(route.profile, 'driving-car');
    assert.equal(route.distanceMeters, 89420);
    assert.equal(route.durationSeconds, 7380);
    assert.equal(route.geometry.type, 'LineString');
    assert.equal(route.stops.length, 2);
    assert.equal(route.skippedItems.length, 1);
    assert.equal(route.warnings.length, 1);
    assert.equal(route.attribution.service, 'openrouteservice by HeiGIT');

    // Verify RouteSummary UI state helper for real provider responses
    const realUiState = describeRouteSummaryState(route);
    assert.equal(realUiState.isMock, false);
    assert.equal(realUiState.source, 'OPENROUTESERVICE');
    assert.equal(realUiState.bannerHeading, null);
    assert.equal(realUiState.distanceDisplay, '89.4 km');
    assert.equal(realUiState.durationDisplay, '2 hr 3 min');
    assert.equal(realUiState.attributionUrl, 'https://openrouteservice.org/');
    assert.equal(
      realUiState.attributionText,
      'Route directions by openrouteservice.org by HeiGIT'
    );

    // 6. Rate limit 429 handling
    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Quota exceeded' } }),
    });

    await assert.rejects(
      () =>
        calculateDayRoute({
          items: sampleItems,
          profile: 'foot-walking',
          env: realProviderEnv,
        }),
      (err) => err.status === 429 && err.code === 'ROUTING_RATE_LIMIT'
    );

    // 7. Invalid geometry handling (502 ROUTING_INVALID_GEOMETRY)
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ type: 'FeatureCollection', features: [] }),
    });

    await assert.rejects(
      () =>
        calculateDayRoute({
          items: sampleItems,
          profile: 'cycling-regular',
          env: realProviderEnv,
        }),
      (err) => err.status === 502 && err.code === 'ROUTING_INVALID_GEOMETRY'
    );

    // 8. Timeout handling (504 ROUTING_TIMEOUT)
    globalThis.fetch = async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    };

    await assert.rejects(
      () =>
        calculateDayRoute({
          items: sampleItems,
          profile: 'driving-car',
          env: realProviderEnv,
        }),
      (err) => err.status === 504 && err.code === 'ROUTING_TIMEOUT'
    );

    // 9. Upstream 500 -> 502 handling
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal error' } }),
    });

    await assert.rejects(
      () =>
        calculateDayRoute({
          items: sampleItems,
          profile: 'cycling-regular',
          env: realProviderEnv,
        }),
      (err) => err.status === 502 && err.code === 'ROUTING_UPSTREAM_ERROR'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Full HTTP + PostgreSQL Itinerary lifecycle, RBAC, and safe date-range synchronization (extend, shorten with 409 conflict on activities/notes, rollback verification, and empty day cleanup)', async (t) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const createdUserIds = [];
  const createdTripIds = [];
  const createdPlaceIds = [];

  const tokenMap = {
    'owner-token': {
      uid: `itinerary-owner-${runId}`,
      email: `itinerary-owner-${runId}@routewise.test`,
      name: 'Itinerary Owner',
    },
    'member-token': {
      uid: `itinerary-member-${runId}`,
      email: `itinerary-member-${runId}@routewise.test`,
      name: 'Active Trip Member',
    },
    'viewer-token': {
      uid: `itinerary-viewer-${runId}`,
      email: `itinerary-viewer-${runId}@routewise.test`,
      name: 'Read Only Viewer',
    },
    'stranger-token': {
      uid: `itinerary-stranger-${runId}`,
      email: `itinerary-stranger-${runId}@routewise.test`,
      name: 'Non Member Stranger',
    },
  };

  const testAuth = createRequireAuth({
    verifyToken: async (token) => {
      if (tokenMap[token]) return tokenMap[token];
      const err = new Error('Invalid token');
      err.code = 'auth/invalid-id-token';
      throw err;
    },
    syncUser: async (uid, email, name) => {
      const u = await getOrCreateUser(uid, email, name);
      if (u?.id && !createdUserIds.includes(u.id)) {
        createdUserIds.push(u.id);
      }
      return u;
    },
  });

  const { requireTripAccess, requireItineraryEditor } = createTripAccessMiddleware();

  const app = express();
  app.use(express.json());
  const router = Router({ mergeParams: true });
  router.use(testAuth);

  router.get('/:tripId/itinerary', requireTripAccess, getTripItineraryHandler);
  router.post(
    '/:tripId/itinerary/initialize',
    requireTripAccess,
    requireItineraryEditor,
    initializeTripItineraryHandler
  );
  router.patch(
    '/:tripId/itinerary/days/:dayId',
    requireTripAccess,
    requireItineraryEditor,
    updateItineraryDayNotesHandler
  );
  router.get(
    '/:tripId/itinerary/days/:dayId/items',
    requireTripAccess,
    listDayItemsHandler
  );
  router.post(
    '/:tripId/itinerary/days/:dayId/items',
    requireTripAccess,
    requireItineraryEditor,
    createItineraryItemHandler
  );
  router.patch(
    '/:tripId/itinerary/days/:dayId/items/reorder',
    requireTripAccess,
    requireItineraryEditor,
    reorderItineraryItemsHandler
  );
  router.patch(
    '/:tripId/itinerary/days/:dayId/items/:itemId',
    requireTripAccess,
    requireItineraryEditor,
    updateItineraryItemHandler
  );
  router.delete(
    '/:tripId/itinerary/days/:dayId/items/:itemId',
    requireTripAccess,
    requireItineraryEditor,
    deleteItineraryItemHandler
  );
  router.post(
    '/:tripId/itinerary/days/:dayId/route',
    requireTripAccess,
    calculateDayRouteHandler
  );

  app.use('/api/trips', router);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/trips`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const tripId of createdTripIds) {
      await query('DELETE FROM trips WHERE id = $1', [tripId]).catch(() => {});
    }
    for (const placeId of createdPlaceIds) {
      await query('DELETE FROM places WHERE id = $1', [placeId]).catch(() => {});
    }
    for (const userId of createdUserIds) {
      await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
  });

  // Create users and a 3-day trip in PostgreSQL
  const ownerUser = await getOrCreateUser(
    tokenMap['owner-token'].uid,
    tokenMap['owner-token'].email,
    tokenMap['owner-token'].name
  );
  createdUserIds.push(ownerUser.id);

  const memberUser = await getOrCreateUser(
    tokenMap['member-token'].uid,
    tokenMap['member-token'].email,
    tokenMap['member-token'].name
  );
  createdUserIds.push(memberUser.id);

  const viewerUser = await getOrCreateUser(
    tokenMap['viewer-token'].uid,
    tokenMap['viewer-token'].email,
    tokenMap['viewer-token'].name
  );
  createdUserIds.push(viewerUser.id);

  const trip = await createTrip(ownerUser.id, {
    title: `Kashmir Expedition ${runId}`,
    destinationName: 'Srinagar, Jammu and Kashmir, India',
    destinationLatitude: 34.083656,
    destinationLongitude: 74.797371,
    description: '3-day itinerary test trip',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    currency: 'INR',
    plannedBudget: '25000.00',
  });
  createdTripIds.push(trip.id);

  // Add active member and active viewer to trip_members
  await query(
    `INSERT INTO trip_members (trip_id, user_id, role, membership_status, joined_at)
     VALUES ($1, $2, 'member', 'active', NOW()),
            ($1, $3, 'viewer', 'active', NOW())`,
    [trip.id, memberUser.id, viewerUser.id]
  );

  // 1. Unauthenticated request returns 401
  const unauthRes = await fetch(`${baseUrl}/${trip.id}/itinerary`);
  assert.equal(unauthRes.status, 401);

  // 2. Non-member request returns 404
  const strangerRes = await fetch(`${baseUrl}/${trip.id}/itinerary`, {
    headers: { Authorization: 'Bearer stranger-token' },
  });
  assert.equal(strangerRes.status, 404);

  // 3. Viewer cannot initialize itinerary -> 403 Forbidden
  const viewerInitRes = await fetch(`${baseUrl}/${trip.id}/itinerary/initialize`, {
    method: 'POST',
    headers: { Authorization: 'Bearer viewer-token' },
  });
  assert.equal(viewerInitRes.status, 403);

  // 4. Owner initializes itinerary -> creates 3 days (2026-10-10..2026-10-12)
  const initRes = await fetch(`${baseUrl}/${trip.id}/itinerary/initialize`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner-token' },
  });
  assert.equal(initRes.status, 200);
  const initPayload = await initRes.json();
  assert.equal(initPayload.data.days.length, 3);
  assert.equal(initPayload.data.days[0].dayOrder, 1);
  assert.equal(initPayload.data.days[0].dayDate, '2026-10-10');
  assert.equal(initPayload.data.days[1].dayOrder, 2);
  assert.equal(initPayload.data.days[1].dayDate, '2026-10-11');
  assert.equal(initPayload.data.days[2].dayOrder, 3);
  assert.equal(initPayload.data.days[2].dayDate, '2026-10-12');

  const day1Id = initPayload.data.days[0].id;
  const day2Id = initPayload.data.days[1].id;

  // 5. Update Day 1 notes as active member (200) & reject viewer (403)
  const viewerNotesRes = await fetch(`${baseUrl}/${trip.id}/itinerary/days/${day1Id}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer viewer-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes: 'Viewer should not edit' }),
  });
  assert.equal(viewerNotesRes.status, 403);

  const memberNotesRes = await fetch(`${baseUrl}/${trip.id}/itinerary/days/${day1Id}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer member-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes: 'Day 1 arrival in Srinagar and Boulevard Road walk' }),
  });
  assert.equal(memberNotesRes.status, 200);
  const notesBody = await memberNotesRes.json();
  assert.equal(
    notesBody.data.day.notes,
    'Day 1 arrival in Srinagar and Boulevard Road walk'
  );

  // 6. Create Activity #1 with a geocoded place
  const createItem1Res = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer owner-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Morning Shikara Ride at Dal Lake',
        description: 'Gate 1 Shikara stand',
        startTime: '08:30',
        endTime: '10:30',
        estimatedCost: '1200.50',
        place: {
          provider: 'open-meteo-geocoding',
          providerPlaceId: `test-dal-${runId}`,
          name: 'Dal Lake',
          address: 'Srinagar, Jammu and Kashmir, India',
          latitude: 34.083656,
          longitude: 74.797371,
        },
      }),
    }
  );
  assert.equal(createItem1Res.status, 201);
  const item1 = (await createItem1Res.json()).data.item;
  assert.equal(item1.sortOrder, 1);
  assert.equal(item1.estimatedCost, '1200.50');
  assert.equal(item1.hasConfirmedLocation, true);
  assert.equal(item1.place.name, 'Dal Lake');
  createdPlaceIds.push(item1.place.id);

  // 7. Create Activity #2 without a place (unpinned activity)
  const createItem2Res = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer member-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Traditional Wazwan Lunch',
        description: 'Local restaurant break',
        startTime: '13:00',
        endTime: '14:30',
        estimatedCost: '850.25',
        place: null,
      }),
    }
  );
  assert.equal(createItem2Res.status, 201);
  const item2 = (await createItem2Res.json()).data.item;
  assert.equal(item2.sortOrder, 2);
  assert.equal(item2.hasConfirmedLocation, false);
  assert.equal(item2.place, null);

  // 8. Create Activity #3 with a second geocoded place
  const createItem3Res = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer owner-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Nishat Mughal Garden Sunset',
        startTime: '16:00',
        endTime: '18:00',
        estimatedCost: '300.00',
        place: {
          provider: 'open-meteo-geocoding',
          providerPlaceId: `test-nishat-${runId}`,
          name: 'Nishat Bagh',
          address: 'Srinagar, Jammu and Kashmir, India',
          latitude: 34.1246,
          longitude: 74.8806,
        },
      }),
    }
  );
  assert.equal(createItem3Res.status, 201);
  const item3 = (await createItem3Res.json()).data.item;
  assert.equal(item3.sortOrder, 3);
  createdPlaceIds.push(item3.place.id);

  // 9. Re-initialize itinerary idempotently -> preserves notes and all 3 activities!
  const reInitRes = await fetch(`${baseUrl}/${trip.id}/itinerary/initialize`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner-token' },
  });
  assert.equal(reInitRes.status, 200);
  const reInitData = (await reInitRes.json()).data;
  assert.equal(reInitData.days.length, 3);
  assert.equal(
    reInitData.days[0].notes,
    'Day 1 arrival in Srinagar and Boulevard Road walk'
  );
  assert.equal(reInitData.days[0].items.length, 3);
  assert.equal(reInitData.days[0].estimatedCost, '2350.75');
  assert.equal(reInitData.summary.totalEstimatedCost, '2350.75');

  // 10. Reorder Day 1 activities without unique constraint violation (item3, item1, item2)
  const reorderRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items/reorder`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemIds: [item3.id, item1.id, item2.id],
      }),
    }
  );
  assert.equal(reorderRes.status, 200);
  const reorderedItems = (await reorderRes.json()).data.items;
  assert.equal(reorderedItems[0].id, item3.id);
  assert.equal(reorderedItems[0].sortOrder, 1);
  assert.equal(reorderedItems[1].id, item1.id);
  assert.equal(reorderedItems[1].sortOrder, 2);
  assert.equal(reorderedItems[2].id, item2.id);
  assert.equal(reorderedItems[2].sortOrder, 3);

  // 11. Update Activity #2 cost and title
  const patchItemRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items/${item2.id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer member-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Traditional Wazwan Lunch & Kahwa',
        estimatedCost: '950.25',
      }),
    }
  );
  assert.equal(patchItemRes.status, 200);
  const patchedItem = (await patchItemRes.json()).data.item;
  assert.equal(patchedItem.title, 'Traditional Wazwan Lunch & Kahwa');
  assert.equal(patchedItem.estimatedCost, '950.25');

  // 12. Viewer can GET itinerary (200) but cannot delete activity (403)
  const viewerGetRes = await fetch(`${baseUrl}/${trip.id}/itinerary`, {
    headers: { Authorization: 'Bearer viewer-token' },
  });
  assert.equal(viewerGetRes.status, 200);
  const viewerGetBody = await viewerGetRes.json();
  assert.equal(viewerGetBody.data.trip.accessRole, 'viewer');
  assert.equal(viewerGetBody.data.summary.totalEstimatedCost, '2450.75');

  const viewerDelRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items/${item2.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: 'Bearer viewer-token' },
    }
  );
  assert.equal(viewerDelRes.status, 403);

  // 13. Route calculation endpoint on Day 2 (0 stops -> 400 INSUFFICIENT_ROUTE_STOPS)
  const emptyRouteRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day2Id}/route`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer owner-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile: 'driving-car' }),
    }
  );
  assert.equal(emptyRouteRes.status, 400);

  // 14. Delete Activity #2 and verify remaining items re-normalize sort_order 1..2
  const deleteItem2Res = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items/${item2.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: 'Bearer owner-token' },
    }
  );
  assert.equal(deleteItem2Res.status, 200);

  const listAfterDelRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/days/${day1Id}/items`,
    {
      headers: { Authorization: 'Bearer owner-token' },
    }
  );
  assert.equal(listAfterDelRes.status, 200);
  const remainingItems = (await listAfterDelRes.json()).data.items;
  assert.equal(remainingItems.length, 2);
  assert.equal(remainingItems[0].sortOrder, 1);
  assert.equal(remainingItems[1].sortOrder, 2);

  // 15. Phase 4.1 Date-Range Synchronization:
  // Step 15a: Extend trip dates from 2026-10-10..2026-10-12 to 2026-10-10..2026-10-13 -> adds Day 4 (2026-10-13)
  await updateTripById(trip.id, ownerUser.id, {
    startDate: '2026-10-10',
    endDate: '2026-10-13',
  });
  const extendInitRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/initialize`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer owner-token' },
    }
  );
  assert.equal(extendInitRes.status, 200);
  const extendedData = (await extendInitRes.json()).data;
  assert.equal(extendedData.days.length, 4);
  assert.deepEqual(
    extendedData.days.map((d) => [d.dayOrder, d.dayDate]),
    [
      [1, '2026-10-10'],
      [2, '2026-10-11'],
      [3, '2026-10-12'],
      [4, '2026-10-13'],
    ]
  );
  const day4Id = extendedData.days[3].id;

  // Step 15b: Shorten trip dates to 2026-10-11..2026-10-13 while Day 1 (2026-10-10) has 2 activities and notes -> MUST return 409 Conflict!
  await updateTripById(trip.id, ownerUser.id, {
    startDate: '2026-10-11',
    endDate: '2026-10-13',
  });
  const conflictActivitiesRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/initialize`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer owner-token' },
    }
  );
  assert.equal(conflictActivitiesRes.status, 409);
  const conflictActivitiesBody = await conflictActivitiesRes.json();
  assert.equal(
    conflictActivitiesBody.code,
    'ITINERARY_OUTSIDE_RANGE_HAS_DATA'
  );
  assert.equal(conflictActivitiesBody.details.conflictingDayCount, 1);
  assert.equal(conflictActivitiesBody.details.affectedDays[0].dayDate, '2026-10-10');
  assert.equal(conflictActivitiesBody.details.affectedDays[0].itemCount, 2);
  assert.equal(conflictActivitiesBody.details.affectedDays[0].hasNotes, true);

  // Verify rollback safety: no temporary day_order values (+100000) and all 4 days + activities preserved
  const afterConflictGet = await fetch(`${baseUrl}/${trip.id}/itinerary`, {
    headers: { Authorization: 'Bearer owner-token' },
  });
  const afterConflictData = (await afterConflictGet.json()).data;
  assert.deepEqual(
    afterConflictData.days.map((d) => d.dayOrder),
    [1, 2, 3, 4]
  );
  assert.equal(afterConflictData.days[0].isOutsideTripRange, true);
  assert.equal(afterConflictData.days[0].items.length, 2);

  // Step 15c: Restore startDate to 2026-10-10, add notes ONLY to Day 4 (2026-10-13), then shorten endDate to 2026-10-12 -> MUST return 409 Conflict on notes!
  await updateTripById(trip.id, ownerUser.id, {
    startDate: '2026-10-10',
    endDate: '2026-10-13',
  });
  await fetch(`${baseUrl}/${trip.id}/itinerary/days/${day4Id}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes: 'Departure morning checklist' }),
  });

  await updateTripById(trip.id, ownerUser.id, {
    startDate: '2026-10-10',
    endDate: '2026-10-12',
  });
  const conflictNotesRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/initialize`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer owner-token' },
    }
  );
  assert.equal(conflictNotesRes.status, 409);
  const conflictNotesBody = await conflictNotesRes.json();
  assert.equal(conflictNotesBody.code, 'ITINERARY_OUTSIDE_RANGE_HAS_DATA');
  assert.equal(conflictNotesBody.details.affectedDays[0].dayDate, '2026-10-13');
  assert.equal(conflictNotesBody.details.affectedDays[0].itemCount, 0);
  assert.equal(conflictNotesBody.details.affectedDays[0].hasNotes, true);

  // Step 15d: Clear notes on Day 4 (2026-10-13) so it is safely empty, then synchronize -> removes 2026-10-13 and keeps 1..3 contiguous!
  await fetch(`${baseUrl}/${trip.id}/itinerary/days/${day4Id}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes: null }),
  });

  const cleanSyncRes = await fetch(
    `${baseUrl}/${trip.id}/itinerary/initialize`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer owner-token' },
    }
  );
  assert.equal(cleanSyncRes.status, 200);
  const cleanSyncData = (await cleanSyncRes.json()).data;
  assert.equal(cleanSyncData.days.length, 3);
  assert.deepEqual(
    cleanSyncData.days.map((d) => [d.dayOrder, d.dayDate, d.isOutsideTripRange]),
    [
      [1, '2026-10-10', false],
      [2, '2026-10-11', false],
      [3, '2026-10-12', false],
    ]
  );
  assert.equal(cleanSyncData.days[0].items.length, 2);
});

test(
  'Live openrouteservice directions integration test (requires RUN_LIVE_ORS_TESTS=1 and OPENROUTESERVICE_API_KEY)',
  {
    skip:
      process.env.RUN_LIVE_ORS_TESTS !== '1' ||
      !process.env.OPENROUTESERVICE_API_KEY,
  },
  async () => {
    const route = await calculateDayRoute({
      profile: 'driving-car',
      items: [
        {
          id: 'live-1',
          title: 'Srinagar',
          sortOrder: 1,
          place: { name: 'Srinagar', latitude: 34.083656, longitude: 74.797371 },
        },
        {
          id: 'live-2',
          title: 'Pahalgam',
          sortOrder: 2,
          place: { name: 'Pahalgam', latitude: 34.0161, longitude: 75.315 },
        },
      ],
    });
    assert.equal(route.isMock, false);
    assert.equal(route.source, 'OPENROUTESERVICE');
    assert.equal(route.geometry.type, 'LineString');
    assert.ok(route.distanceMeters > 1000);
    assert.ok(route.durationSeconds > 60);
  }
);

test.after(async () => {
  await pool.end().catch(() => {});
});
