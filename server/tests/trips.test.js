import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express, { Router } from 'express';
import { createRequireAuth } from '../src/middleware/auth.js';
import {
  isValidIsoCalendarDate,
  normalizePlannedBudget,
  validateCreateTripInput,
  validateUpdateTripInput,
} from '../src/validators/tripValidator.js';
import {
  getAccessibleTripById,
  listTripsForUser,
} from '../src/services/tripService.js';
import { createTripAccessMiddleware } from '../src/middleware/tripAccess.js';
import { createTripControllers } from '../src/controllers/tripController.js';
import { getOrCreateUser } from '../src/services/userService.js';
import { pool, query } from '../src/config/db.js';

function createMockRes() {
  return {
    statusCode: 200,
    body: undefined,
    sent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.sent = true;
      return this;
    },
    send() {
      this.sent = true;
      return this;
    },
  };
}

test('tripValidator rejects invalid calendar dates, endDate < startDate, empty/overlong strings, negative budget, and malformed currency', () => {
  // Invalid calendar date (Feb 30)
  assert.equal(isValidIsoCalendarDate('2026-02-30'), false);
  assert.equal(isValidIsoCalendarDate('2026-13-01'), false);
  assert.equal(isValidIsoCalendarDate('2026-11-15'), true);

  // Empty title
  assert.equal(
    validateCreateTripInput({
      title: '   ',
      destinationName: 'Ladakh',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
    }).valid,
    false
  );

  // Overlong title (>150 chars)
  assert.equal(
    validateCreateTripInput({
      title: 'A'.repeat(151),
      destinationName: 'Ladakh',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
    }).valid,
    false
  );

  // Overlong destinationName (>180 chars)
  assert.equal(
    validateCreateTripInput({
      title: 'Ladakh Trip',
      destinationName: 'B'.repeat(181),
      startDate: '2026-11-10',
      endDate: '2026-11-15',
    }).valid,
    false
  );

  // Overlong description (>5000 chars)
  assert.equal(
    validateCreateTripInput({
      title: 'Ladakh Trip',
      destinationName: 'Leh',
      description: 'C'.repeat(5001),
      startDate: '2026-11-10',
      endDate: '2026-11-15',
    }).valid,
    false
  );

  // endDate earlier than startDate
  const badRange = validateCreateTripInput({
    title: 'Ladakh Trip',
    destinationName: 'Leh',
    startDate: '2026-11-15',
    endDate: '2026-11-10',
  });
  assert.equal(badRange.valid, false);
  assert.match(badRange.error, /endDate must be on or after startDate/i);

  // Negative budget & >2 decimal places
  assert.equal(normalizePlannedBudget(-50).valid, false);
  assert.equal(normalizePlannedBudget('-10.00').valid, false);
  assert.equal(normalizePlannedBudget('100.999').valid, false);
  assert.equal(normalizePlannedBudget('1500.5').value, '1500.50');

  // Malformed currency
  assert.equal(
    validateCreateTripInput({
      title: 'Ladakh Trip',
      destinationName: 'Leh',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      currency: 'inr',
    }).valid,
    false
  );
  assert.equal(
    validateCreateTripInput({
      title: 'Ladakh Trip',
      destinationName: 'Leh',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      currency: 'US',
    }).valid,
    false
  );
});

test('tripValidator strips client-supplied ownerUserId/id and enforces PATCH single-date range check', () => {
  const createCheck = validateCreateTripInput({
    id: 'fake-id',
    ownerUserId: 'attacker-user-id',
    owner_user_id: 'attacker-user-id',
    createdBy: 'attacker-user-id',
    title: '  Kashmir Valley Tour  ',
    destinationName: '  Srinagar & Pahalgam ',
    startDate: '2026-12-01',
    endDate: '2026-12-07',
    plannedBudget: '24500',
  });

  assert.equal(createCheck.valid, true);
  assert.equal('ownerUserId' in createCheck.data, false);
  assert.equal('owner_user_id' in createCheck.data, false);
  assert.equal('id' in createCheck.data, false);
  assert.equal(createCheck.data.title, 'Kashmir Valley Tour');
  assert.equal(createCheck.data.destinationName, 'Srinagar & Pahalgam');
  assert.equal(createCheck.data.currency, 'INR');
  assert.equal(createCheck.data.plannedBudget, '24500.00');

  // PATCH changing only endDate to before existing startDate must fail
  const existingTrip = {
    startDate: '2026-12-05',
    endDate: '2026-12-10',
  };

  const badEndDatePatch = validateUpdateTripInput(
    { endDate: '2026-12-01' },
    existingTrip
  );
  assert.equal(badEndDatePatch.valid, false);
  assert.match(badEndDatePatch.error, /endDate must be on or after startDate/i);

  // PATCH changing only startDate to after existing endDate must fail
  const badStartDatePatch = validateUpdateTripInput(
    { startDate: '2026-12-12' },
    existingTrip
  );
  assert.equal(badStartDatePatch.valid, false);
  assert.match(badStartDatePatch.error, /endDate must be on or after startDate/i);
});

test('live PostgreSQL integration: create, list (owned + active shared, excluding pending/unrelated), read, owner update/delete, member/viewer 403, outsider 404, and FK cascade', async (t) => {
  const runId = crypto.randomUUID().slice(0, 8);
  let ownerUser = null;
  let activeMemberUser = null;
  let activeViewerUser = null;
  let pendingMemberUser = null;
  let outsiderUser = null;
  const createdTripIds = [];

  t.after(async () => {
    // Clean up only disposable fixture rows created by this test run
    for (const tripId of createdTripIds) {
      await query('DELETE FROM trips WHERE id = $1', [tripId]).catch(() => {});
    }
    const userIds = [
      ownerUser?.id,
      activeMemberUser?.id,
      activeViewerUser?.id,
      pendingMemberUser?.id,
      outsiderUser?.id,
    ].filter(Boolean);
    for (const uid of userIds) {
      await query('DELETE FROM users WHERE id = $1', [uid]).catch(() => {});
    }
  });

  // 1. Synchronize disposable test users in PostgreSQL
  ownerUser = await getOrCreateUser(
    `test-p2-owner-${runId}`,
    `owner.${runId}@routewise.test`,
    'Phase2 Owner'
  );
  activeMemberUser = await getOrCreateUser(
    `test-p2-member-${runId}`,
    `member.${runId}@routewise.test`,
    'Phase2 Active Member'
  );
  activeViewerUser = await getOrCreateUser(
    `test-p2-viewer-${runId}`,
    `viewer.${runId}@routewise.test`,
    'Phase2 Active Viewer'
  );
  pendingMemberUser = await getOrCreateUser(
    `test-p2-pending-${runId}`,
    `pending.${runId}@routewise.test`,
    'Phase2 Pending Member'
  );
  outsiderUser = await getOrCreateUser(
    `test-p2-outsider-${runId}`,
    `outsider.${runId}@routewise.test`,
    'Phase2 Outsider'
  );

  assert.ok(ownerUser.id);
  assert.ok(activeMemberUser.id);

  // 2. Create trip via controller (verifying client-supplied ownerUserId is ignored and req.dbUser.id is used)
  const controllers = createTripControllers();
  const createReq = {
    dbUser: ownerUser,
    body: {
      ownerUserId: outsiderUser.id,
      title: `P2 Test Trip ${runId}`,
      destinationName: 'Gulmarg, Kashmir',
      description: 'Snowboarding and gondola planning',
      startDate: '2026-12-10',
      endDate: '2026-12-15',
      currency: 'INR',
      plannedBudget: '18500.50',
    },
  };
  const createRes = createMockRes();
  await controllers.handleCreateTrip(createReq, createRes, (err) => {
    throw err;
  });

  assert.equal(createRes.statusCode, 201);
  const createdTrip = createRes.body.trip;
  assert.ok(createdTrip.id);
  createdTripIds.push(createdTrip.id);

  // Confirm ownerUserId is ownerUser.id, NOT outsiderUser.id
  assert.equal(createdTrip.ownerUserId, ownerUser.id);
  assert.equal(createdTrip.title, `P2 Test Trip ${runId}`);
  assert.equal(createdTrip.startDate, '2026-12-10');
  assert.equal(createdTrip.endDate, '2026-12-15');
  assert.equal(createdTrip.plannedBudget, '18500.50');
  assert.equal(createdTrip.accessRole, 'owner');

  // 3. Insert active member, active viewer, and pending member rows in trip_members
  await query(
    `INSERT INTO trip_members (trip_id, user_id, role, membership_status)
     VALUES ($1, $2, 'member', 'active'),
            ($1, $3, 'viewer', 'active'),
            ($1, $4, 'member', 'pending')`,
    [createdTrip.id, activeMemberUser.id, activeViewerUser.id, pendingMemberUser.id]
  );

  // Also insert an active trip_members row for the owner themselves to verify duplicate-safe listing
  await query(
    `INSERT INTO trip_members (trip_id, user_id, role, membership_status)
     VALUES ($1, $2, 'member', 'active')`,
    [createdTrip.id, ownerUser.id]
  );

  // 4. List trips: owner sees 1 trip (no duplicates), activeMember sees 1 trip ('member'),
  // activeViewer sees 1 trip ('viewer'), pendingMember sees 0, outsider sees 0
  const ownerList = await listTripsForUser(ownerUser.id);
  const matchingOwnerTrips = ownerList.filter((tr) => tr.id === createdTrip.id);
  assert.equal(matchingOwnerTrips.length, 1);
  assert.equal(matchingOwnerTrips[0].accessRole, 'owner');

  const memberList = await listTripsForUser(activeMemberUser.id);
  const matchingMemberTrips = memberList.filter((tr) => tr.id === createdTrip.id);
  assert.equal(matchingMemberTrips.length, 1);
  assert.equal(matchingMemberTrips[0].accessRole, 'member');

  const viewerList = await listTripsForUser(activeViewerUser.id);
  const matchingViewerTrips = viewerList.filter((tr) => tr.id === createdTrip.id);
  assert.equal(matchingViewerTrips.length, 1);
  assert.equal(matchingViewerTrips[0].accessRole, 'viewer');

  const pendingList = await listTripsForUser(pendingMemberUser.id);
  assert.equal(pendingList.some((tr) => tr.id === createdTrip.id), false);

  const outsiderList = await listTripsForUser(outsiderUser.id);
  assert.equal(outsiderList.some((tr) => tr.id === createdTrip.id), false);

  // 5. Authorization middleware checks (requireTripAccess & requireTripOwner)
  const { requireTripAccess, requireTripOwner } = createTripAccessMiddleware();

  // Active member can read (requireTripAccess passes)
  let nextCalled = false;
  const memberReadReq = {
    dbUser: activeMemberUser,
    params: { tripId: createdTrip.id },
  };
  const memberReadRes = createMockRes();
  await requireTripAccess(memberReadReq, memberReadRes, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(memberReadReq.trip.accessRole, 'member');

  // Active member cannot PATCH/DELETE (requireTripOwner returns 403)
  let ownerNextCalled = false;
  const memberWriteRes = createMockRes();
  await requireTripOwner(memberReadReq, memberWriteRes, () => {
    ownerNextCalled = true;
  });
  assert.equal(ownerNextCalled, false);
  assert.equal(memberWriteRes.statusCode, 403);

  // Active viewer cannot PATCH/DELETE (requireTripOwner returns 403)
  const viewerReq = {
    dbUser: activeViewerUser,
    params: { tripId: createdTrip.id },
  };
  const viewerWriteRes = createMockRes();
  await requireTripOwner(viewerReq, viewerWriteRes, () => {});
  assert.equal(viewerWriteRes.statusCode, 403);

  // Pending member and outsider get 404 (no private trip existence leak)
  const pendingReq = {
    dbUser: pendingMemberUser,
    params: { tripId: createdTrip.id },
  };
  const pendingRes = createMockRes();
  await requireTripAccess(pendingReq, pendingRes, () => {});
  assert.equal(pendingRes.statusCode, 404);

  const outsiderReq = {
    dbUser: outsiderUser,
    params: { tripId: createdTrip.id },
  };
  const outsiderRes = createMockRes();
  await requireTripAccess(outsiderReq, outsiderRes, () => {});
  assert.equal(outsiderRes.statusCode, 404);

  // 6. Owner can update trip details via handleUpdateTrip
  const ownerUpdateReq = {
    dbUser: ownerUser,
    trip: createdTrip,
    body: {
      title: `P2 Updated Trip ${runId}`,
      plannedBudget: '22000.75',
    },
  };
  const ownerUpdateRes = createMockRes();
  await controllers.handleUpdateTrip(ownerUpdateReq, ownerUpdateRes, (err) => {
    throw err;
  });
  assert.equal(ownerUpdateRes.statusCode, 200);
  assert.equal(ownerUpdateRes.body.trip.title, `P2 Updated Trip ${runId}`);
  assert.equal(ownerUpdateRes.body.trip.plannedBudget, '22000.75');

  // 7. Owner can delete trip via handleDeleteTrip and FK ON DELETE CASCADE removes dependent trip_members
  const ownerDeleteReq = {
    dbUser: ownerUser,
    trip: createdTrip,
  };
  const ownerDeleteRes = createMockRes();
  await controllers.handleDeleteTrip(ownerDeleteReq, ownerDeleteRes, (err) => {
    throw err;
  });
  assert.equal(ownerDeleteRes.statusCode, 204);

  const afterDeleteLookup = await getAccessibleTripById(createdTrip.id, ownerUser.id);
  assert.equal(afterDeleteLookup, null);

  const remainingMembers = await query(
    'SELECT COUNT(*)::int AS cnt FROM trip_members WHERE trip_id = $1',
    [createdTrip.id]
  );
  assert.equal(remainingMembers.rows[0].cnt, 0);
});

test('HTTP REST API (/api/trips) end-to-end with Express + requireAuth + PostgreSQL', async (t) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const createdTripIds = [];
  const createdUserIds = [];

  const tokenDirectory = {
    'valid-owner-token': {
      uid: `http-owner-${runId}`,
      email: `http.owner.${runId}@routewise.test`,
      name: 'HTTP Owner',
    },
    'valid-member-token': {
      uid: `http-member-${runId}`,
      email: `http.member.${runId}@routewise.test`,
      name: 'HTTP Member',
    },
  };

  const testAuth = createRequireAuth({
    verifyToken: async (token) => {
      if (tokenDirectory[token]) {
        return tokenDirectory[token];
      }
      throw new Error('Invalid token');
    },
    syncUser: async (uid, email, name) => {
      const u = await getOrCreateUser(uid, email, name);
      if (u?.id && !createdUserIds.includes(u.id)) {
        createdUserIds.push(u.id);
      }
      return u;
    },
  });

  const { requireTripAccess, requireTripOwner } = createTripAccessMiddleware();
  const controllers = createTripControllers();

  const testApp = express();
  testApp.use(express.json());
  const router = Router();
  router.use(testAuth);
  router.get('/', controllers.handleListTrips);
  router.post('/', controllers.handleCreateTrip);
  router.get('/:tripId', requireTripAccess, controllers.handleGetTrip);
  router.patch('/:tripId', requireTripAccess, requireTripOwner, controllers.handleUpdateTrip);
  router.delete('/:tripId', requireTripAccess, requireTripOwner, controllers.handleDeleteTrip);
  testApp.use('/api/trips', router);

  const server = await new Promise((resolve) => {
    const s = testApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/trips`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const tripId of createdTripIds) {
      await query('DELETE FROM trips WHERE id = $1', [tripId]).catch(() => {});
    }
    for (const userId of createdUserIds) {
      await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
  });

  // 1. Demo persona token is rejected with 401 and no DB writes
  const demoRes = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer demo-naveed',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Demo Attempt',
      destinationName: 'Srinagar',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
    }),
  });
  assert.equal(demoRes.status, 401);

  // 2. Authenticated POST /api/trips creates a trip in PostgreSQL
  const postRes = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid-owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `HTTP Trip ${runId}`,
      destinationName: 'Pahalgam',
      description: 'Lidder Valley trek',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      currency: 'INR',
      plannedBudget: '12000.00',
    }),
  });
  assert.equal(postRes.status, 201);
  const { trip } = await postRes.json();
  createdTripIds.push(trip.id);
  assert.equal(trip.title, `HTTP Trip ${runId}`);
  assert.equal(trip.plannedBudget, '12000.00');

  // 3. Authenticated PATCH /api/trips/:tripId with invalid date range returns 400
  const badPatchRes = await fetch(`${baseUrl}/${trip.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer valid-owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endDate: '2026-11-20',
    }),
  });
  assert.equal(badPatchRes.status, 400);

  // 4. Authenticated PATCH /api/trips/:tripId updates trip in PostgreSQL
  const goodPatchRes = await fetch(`${baseUrl}/${trip.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer valid-owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destinationName: 'Pahalgam & Aru Valley',
      plannedBudget: '15500.25',
    }),
  });
  assert.equal(goodPatchRes.status, 200);
  const patchedData = await goodPatchRes.json();
  assert.equal(patchedData.trip.destinationName, 'Pahalgam & Aru Valley');
  assert.equal(patchedData.trip.plannedBudget, '15500.25');

  // 5. Non-member GET /api/trips/:tripId returns 404
  const nonMemberGet = await fetch(`${baseUrl}/${trip.id}`, {
    headers: {
      Authorization: 'Bearer valid-member-token',
    },
  });
  assert.equal(nonMemberGet.status, 404);

  // 6. Owner DELETE /api/trips/:tripId returns 204
  const deleteRes = await fetch(`${baseUrl}/${trip.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer valid-owner-token',
    },
  });
  assert.equal(deleteRes.status, 204);
});

test.after(async () => {
  await pool.end().catch(() => {});
});
