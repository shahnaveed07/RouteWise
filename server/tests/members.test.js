import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express, { Router } from 'express';
import { createRequireAuth } from '../src/middleware/auth.js';
import { createTripAccessMiddleware } from '../src/middleware/tripAccess.js';
import { validateUpdateMemberRoleInput } from '../src/validators/memberValidator.js';
import {
  getTripMembersHandler,
  removeTripMemberHandler,
  updateTripMemberRoleHandler,
} from '../src/controllers/memberController.js';
import {
  handleGetTrip,
  handleListTrips,
} from '../src/controllers/tripController.js';
import {
  createItineraryItemHandler,
  getTripItineraryHandler,
  initializeTripItineraryHandler,
} from '../src/controllers/itineraryController.js';
import {
  createTripExpenseHandler,
  getTripExpensesDashboardHandler,
  updateExpenseSplitSettlementHandler,
} from '../src/controllers/expenseController.js';
import { getOrCreateUser } from '../src/services/userService.js';
import { createTrip } from '../src/services/tripService.js';
import { pool, query } from '../src/config/db.js';

test('memberValidator: validates role updates strictly for member and viewer', () => {
  const validMember = validateUpdateMemberRoleInput({ role: 'member' });
  assert.equal(validMember.valid, true);
  assert.equal(validMember.data.role, 'member');

  const validViewer = validateUpdateMemberRoleInput({ role: ' VIEWER ' });
  assert.equal(validViewer.valid, true);
  assert.equal(validViewer.data.role, 'viewer');

  const invalidOwner = validateUpdateMemberRoleInput({ role: 'owner' });
  assert.equal(invalidOwner.valid, false);
  assert.ok(invalidOwner.error.includes('"member" or "viewer"'));

  const invalidAdmin = validateUpdateMemberRoleInput({ role: 'admin' });
  assert.equal(invalidAdmin.valid, false);

  const missingRole = validateUpdateMemberRoleInput({});
  assert.equal(missingRole.valid, false);
});

test('Trip Member Management, Role Permissions, Non-Destructive Removal & Historical Expense Integrity', async (t) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const createdTripIds = [];
  const createdUserIds = [];

  const tokenMap = {
    'owner-token': {
      uid: `mem-owner-${runId}`,
      email: `mem-owner-${runId}@routewise.test`,
      name: 'Owner Naveed',
      emailVerified: true,
    },
    'member-b-token': {
      uid: `mem-b-${runId}`,
      email: `mem-b-${runId}@routewise.test`,
      name: 'Member Shariq',
      emailVerified: true,
    },
    'viewer-c-token': {
      uid: `mem-c-${runId}`,
      email: `mem-c-${runId}@routewise.test`,
      name: 'Viewer Nayeem',
      emailVerified: true,
    },
    'outsider-token': {
      uid: `mem-out-${runId}`,
      email: `mem-out-${runId}@routewise.test`,
      name: 'Outsider Zara',
      emailVerified: true,
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

  const { requireTripAccess, requireTripOwner, requireTripEditor } =
    createTripAccessMiddleware();

  const app = express();
  app.use(express.json());
  const router = Router({ mergeParams: true });
  router.use(testAuth);

  // Trip list and detail routes
  router.get('/', handleListTrips);
  router.get('/:tripId', requireTripAccess, handleGetTrip);

  // Member management routes
  router.get('/:tripId/members', requireTripAccess, getTripMembersHandler);
  router.patch(
    '/:tripId/members/:userId',
    requireTripAccess,
    requireTripOwner,
    updateTripMemberRoleHandler
  );
  router.delete(
    '/:tripId/members/:userId',
    requireTripAccess,
    requireTripOwner,
    removeTripMemberHandler
  );

  // Itinerary routes for role permission verification
  router.get('/:tripId/itinerary', requireTripAccess, getTripItineraryHandler);
  router.post(
    '/:tripId/itinerary/initialize',
    requireTripAccess,
    requireTripEditor,
    initializeTripItineraryHandler
  );
  router.post(
    '/:tripId/itinerary/days/:dayId/items',
    requireTripAccess,
    requireTripEditor,
    createItineraryItemHandler
  );

  // Expense routes for role permission & historical integrity verification
  router.get(
    '/:tripId/expenses',
    requireTripAccess,
    getTripExpensesDashboardHandler
  );
  router.post(
    '/:tripId/expenses',
    requireTripAccess,
    requireTripEditor,
    createTripExpenseHandler
  );
  router.patch(
    '/:tripId/expenses/:expenseId/splits/:splitId/settlement',
    requireTripAccess,
    updateExpenseSplitSettlementHandler
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
    for (const userId of createdUserIds) {
      await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
  });

  const requestJson = async (reqPath, { method = 'GET', token, body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}${reqPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  // Provision users and a shared trip
  const ownerUser = await getOrCreateUser(
    tokenMap['owner-token'].uid,
    tokenMap['owner-token'].email,
    tokenMap['owner-token'].name
  );
  const memberBUser = await getOrCreateUser(
    tokenMap['member-b-token'].uid,
    tokenMap['member-b-token'].email,
    tokenMap['member-b-token'].name
  );
  const viewerCUser = await getOrCreateUser(
    tokenMap['viewer-c-token'].uid,
    tokenMap['viewer-c-token'].email,
    tokenMap['viewer-c-token'].name
  );
  const outsiderUser = await getOrCreateUser(
    tokenMap['outsider-token'].uid,
    tokenMap['outsider-token'].email,
    tokenMap['outsider-token'].name
  );
  createdUserIds.push(
    ownerUser.id,
    memberBUser.id,
    viewerCUser.id,
    outsiderUser.id
  );

  const trip = await createTrip(ownerUser.id, {
    title: `Collaboration Test Trip ${runId}`,
    destinationName: 'Istanbul, Turkey',
    destinationLatitude: 41.00824,
    destinationLongitude: 28.978359,
    description: 'Testing collaboration and role permissions',
    startDate: '2026-09-10',
    endDate: '2026-09-14',
    plannedBudget: '1500.00',
    currency: 'USD',
  });
  createdTripIds.push(trip.id);

  await query(
    `INSERT INTO trip_members (trip_id, user_id, role, membership_status)
     VALUES ($1, $2, 'member', 'active'), ($1, $3, 'viewer', 'active')`,
    [trip.id, memberBUser.id, viewerCUser.id]
  );

  // 1-4. Member listing permissions: Owner, Member, Viewer can list; Non-member cannot (404)
  const ownerListRes = await requestJson(`/${trip.id}/members`, {
    token: 'owner-token',
  });
  assert.equal(ownerListRes.status, 200);
  assert.equal(ownerListRes.data.allMembers.length, 3);
  assert.equal(ownerListRes.data.members.length, 2);
  assert.deepEqual(
    ownerListRes.data.allMembers.map((m) => m.role),
    ['owner', 'member', 'viewer']
  );

  const memberListRes = await requestJson(`/${trip.id}/members`, {
    token: 'member-b-token',
  });
  assert.equal(memberListRes.status, 200);
  assert.equal(memberListRes.data.allMembers.length, 3);

  const viewerListRes = await requestJson(`/${trip.id}/members`, {
    token: 'viewer-c-token',
  });
  assert.equal(viewerListRes.status, 200);
  assert.equal(viewerListRes.data.allMembers.length, 3);

  const outsiderListRes = await requestJson(`/${trip.id}/members`, {
    token: 'outsider-token',
  });
  assert.equal(outsiderListRes.status, 404);

  // 5-9. Role update authorization: Member & Viewer forbidden (403); Owner cannot demote self (400); Owner can toggle member <-> viewer
  const memberChangeRoleRes = await requestJson(
    `/${trip.id}/members/${viewerCUser.id}`,
    {
      method: 'PATCH',
      token: 'member-b-token',
      body: { role: 'member' },
    }
  );
  assert.equal(memberChangeRoleRes.status, 403);

  const viewerChangeRoleRes = await requestJson(
    `/${trip.id}/members/${memberBUser.id}`,
    {
      method: 'PATCH',
      token: 'viewer-c-token',
      body: { role: 'viewer' },
    }
  );
  assert.equal(viewerChangeRoleRes.status, 403);

  const ownerDemoteSelfRes = await requestJson(
    `/${trip.id}/members/${ownerUser.id}`,
    {
      method: 'PATCH',
      token: 'owner-token',
      body: { role: 'member' },
    }
  );
  assert.equal(ownerDemoteSelfRes.status, 400);
  assert.equal(ownerDemoteSelfRes.data.code, 'CANNOT_MODIFY_TRIP_OWNER');

  // Owner changes Member B -> viewer
  const demoteMemberBRes = await requestJson(
    `/${trip.id}/members/${memberBUser.id}`,
    {
      method: 'PATCH',
      token: 'owner-token',
      body: { role: 'viewer' },
    }
  );
  assert.equal(demoteMemberBRes.status, 200);
  assert.equal(demoteMemberBRes.data.member.role, 'viewer');

  // Owner promotes Member B back -> member
  const promoteMemberBRes = await requestJson(
    `/${trip.id}/members/${memberBUser.id}`,
    {
      method: 'PATCH',
      token: 'owner-token',
      body: { role: 'member' },
    }
  );
  assert.equal(promoteMemberBRes.status, 200);
  assert.equal(promoteMemberBRes.data.member.role, 'member');

  // 45-49. Role permissions across itinerary and expenses:
  // Viewer C cannot initialize or create itinerary items or expenses (403); Member B can initialize and create both (200/201)
  const viewerInitItineraryRes = await requestJson(
    `/${trip.id}/itinerary/initialize`,
    {
      method: 'POST',
      token: 'viewer-c-token',
    }
  );
  assert.equal(viewerInitItineraryRes.status, 403);

  const memberInitItineraryRes = await requestJson(
    `/${trip.id}/itinerary/initialize`,
    {
      method: 'POST',
      token: 'member-b-token',
    }
  );
  assert.equal(memberInitItineraryRes.status, 200);
  const firstDayId = memberInitItineraryRes.data.data.days[0].id;

  const viewerCreateItineraryRes = await requestJson(
    `/${trip.id}/itinerary/days/${firstDayId}/items`,
    {
      method: 'POST',
      token: 'viewer-c-token',
      body: {
        title: 'Unauthorized Viewer Stop',
      },
    }
  );
  assert.equal(viewerCreateItineraryRes.status, 403);

  const memberCreateItineraryRes = await requestJson(
    `/${trip.id}/itinerary/days/${firstDayId}/items`,
    {
      method: 'POST',
      token: 'member-b-token',
      body: {
        title: 'Hagia Sophia Guided Visit',
        description: 'Morning architectural tour',
      },
    }
  );
  assert.equal(memberCreateItineraryRes.status, 201);
  const createdItineraryItemId = memberCreateItineraryRes.data.data.item.id;

  const viewerCreateExpenseRes = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'viewer-c-token',
    body: {
      title: 'Unauthorized Viewer Expense',
      amount: '50.00',
      category: 'food',
      expenseDate: '2026-09-10',
      paidByUserId: viewerCUser.id,
      split: {
        mode: 'equal',
        participantUserIds: [ownerUser.id, viewerCUser.id],
      },
    },
  });
  assert.equal(viewerCreateExpenseRes.status, 403);

  // Member B records a shared group expense paid by Member B and split among Owner, Member B, and Viewer C
  const memberCreateExpenseRes = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'member-b-token',
    body: {
      title: 'Bosphorus Ferry & Dinner',
      amount: '150.00',
      category: 'food',
      expenseDate: '2026-09-11',
      paidByUserId: memberBUser.id,
      split: {
        mode: 'equal',
        participantUserIds: [ownerUser.id, memberBUser.id, viewerCUser.id],
      },
    },
  });
  assert.equal(memberCreateExpenseRes.status, 201);
  const createdExpense = memberCreateExpenseRes.data.data.expense;
  const ownerSplit = createdExpense.splits.find(
    (s) => s.userId === ownerUser.id
  );
  assert.ok(ownerSplit);

  // Viewer C cannot settle splits (403); Owner settles their own share
  const viewerSettleRes = await requestJson(
    `/${trip.id}/expenses/${createdExpense.id}/splits/${ownerSplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'viewer-c-token',
      body: { isSettled: true },
    }
  );
  assert.equal(viewerSettleRes.status, 403);

  const ownerSettleRes = await requestJson(
    `/${trip.id}/expenses/${createdExpense.id}/splits/${ownerSplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'owner-token',
      body: { isSettled: true },
    }
  );
  assert.equal(ownerSettleRes.status, 200);

  // 10-14. Member removal authorization & non-destructive removal:
  // Member B and Viewer C cannot remove members (403); Owner cannot remove self (400)
  const memberRemoveRes = await requestJson(
    `/${trip.id}/members/${viewerCUser.id}`,
    {
      method: 'DELETE',
      token: 'member-b-token',
    }
  );
  assert.equal(memberRemoveRes.status, 403);

  const viewerRemoveRes = await requestJson(
    `/${trip.id}/members/${memberBUser.id}`,
    {
      method: 'DELETE',
      token: 'viewer-c-token',
    }
  );
  assert.equal(viewerRemoveRes.status, 403);

  const ownerRemoveSelfRes = await requestJson(
    `/${trip.id}/members/${ownerUser.id}`,
    {
      method: 'DELETE',
      token: 'owner-token',
    }
  );
  assert.equal(ownerRemoveSelfRes.status, 400);
  assert.equal(ownerRemoveSelfRes.data.code, 'CANNOT_REMOVE_TRIP_OWNER');

  // Owner removes Member B
  const ownerRemoveMemberBRes = await requestJson(
    `/${trip.id}/members/${memberBUser.id}`,
    {
      method: 'DELETE',
      token: 'owner-token',
    }
  );
  assert.equal(ownerRemoveMemberBRes.status, 200);
  assert.equal(
    ownerRemoveMemberBRes.data.removedMember.membershipStatus,
    'inactive'
  );

  // Verify database row has membership_status = 'inactive'
  const dbMemberRow = await query(
    `SELECT role, membership_status FROM trip_members WHERE trip_id = $1 AND user_id = $2`,
    [trip.id, memberBUser.id]
  );
  assert.equal(dbMemberRow.rows.length, 1);
  assert.equal(dbMemberRow.rows[0].membership_status, 'inactive');

  // 14-15. Removed Member B loses access to the trip (404) and trip disappears from Member B's list,
  // while Owner and Viewer C still see the trip.
  const removedGetTripRes = await requestJson(`/${trip.id}`, {
    token: 'member-b-token',
  });
  assert.equal(removedGetTripRes.status, 404);

  const removedGetMembersRes = await requestJson(`/${trip.id}/members`, {
    token: 'member-b-token',
  });
  assert.equal(removedGetMembersRes.status, 404);

  const memberBListTripsRes = await requestJson(`/`, {
    token: 'member-b-token',
  });
  assert.equal(memberBListTripsRes.status, 200);
  assert.equal(
    memberBListTripsRes.data.trips.some((tItem) => tItem.id === trip.id),
    false
  );

  const viewerCListTripsRes = await requestJson(`/`, {
    token: 'viewer-c-token',
  });
  assert.equal(viewerCListTripsRes.status, 200);
  assert.equal(
    viewerCListTripsRes.data.trips.some((tItem) => tItem.id === trip.id),
    true
  );

  // Active member list now contains only Owner and Viewer C (2 active members total in allMembers, 1 non-owner in members)
  const postRemovalMembersRes = await requestJson(`/${trip.id}/members`, {
    token: 'owner-token',
  });
  assert.equal(postRemovalMembersRes.status, 200);
  assert.equal(postRemovalMembersRes.data.allMembers.length, 2);
  assert.equal(postRemovalMembersRes.data.members.length, 1);
  assert.equal(
    postRemovalMembersRes.data.allMembers.some(
      (m) => m.userId === memberBUser.id
    ),
    false
  );

  // 16-18. Historical data integrity after member removal:
  // Verify user account, itinerary item, expense payer record, expense splits, and settlement audit survive
  const itineraryAfterRemovalRes = await requestJson(`/${trip.id}/itinerary`, {
    token: 'owner-token',
  });
  assert.equal(itineraryAfterRemovalRes.status, 200);
  const allItineraryItems = itineraryAfterRemovalRes.data.data.days.flatMap(
    (d) => d.items
  );
  assert.equal(
    allItineraryItems.some((item) => item.id === createdItineraryItemId),
    true
  );

  const expensesAfterRemovalRes = await requestJson(`/${trip.id}/expenses`, {
    token: 'owner-token',
  });
  assert.equal(expensesAfterRemovalRes.status, 200);
  const expPayload = expensesAfterRemovalRes.data.data;
  assert.equal(expPayload.budgetSummary.totalExpenses, '150.00');
  assert.equal(expPayload.expenses.length, 1);

  const preservedExpense = expPayload.expenses[0];
  assert.equal(preservedExpense.paidByUserId, memberBUser.id);
  assert.equal(preservedExpense.splits.length, 3);

  const preservedOwnerSplit = preservedExpense.splits.find(
    (s) => s.userId === ownerUser.id
  );
  assert.equal(preservedOwnerSplit.isSettled, true);
  assert.ok(preservedOwnerSplit.settledAt);
  assert.equal(preservedOwnerSplit.settledByUserId, ownerUser.id);

  // Active participants for new expenses exclude removed Member B, while participantBalances retains Member B as former_member
  assert.equal(
    expPayload.participants.some((p) => p.userId === memberBUser.id),
    false
  );
  const formerMemberBalance = expPayload.participantBalances.find(
    (b) => b.userId === memberBUser.id
  );
  assert.ok(formerMemberBalance);
  assert.equal(formerMemberBalance.tripRole, 'former_member');
  assert.equal(formerMemberBalance.isActive, false);
  assert.equal(formerMemberBalance.totalPaid, '150.00');
  assert.equal(formerMemberBalance.totalShare, '50.00');
});

test.after(async () => {
  await pool.end().catch(() => {});
});
