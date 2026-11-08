import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express, { Router } from 'express';
import { createRequireAuth } from '../src/middleware/auth.js';
import { createTripAccessMiddleware } from '../src/middleware/tripAccess.js';
import {
  calculateMoneyPercentage,
  compareMoneyStrings,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeMoneyString,
  splitAmountEqually,
  subtractMoneyStrings,
  sumMoneyStrings,
  validateMoneyRange,
} from '../src/utils/moneyUtils.js';
import {
  EXPENSE_CATEGORIES,
  normalizeExpenseCategory,
  validateExpenseInput,
  validateSettlementInput,
  validateSplitAllocationInput,
} from '../src/validators/expenseValidator.js';
import {
  createTripExpenseHandler,
  deleteTripExpenseHandler,
  getTripExpensesDashboardHandler,
  updateExpenseSplitSettlementHandler,
  updateTripExpenseHandler,
} from '../src/controllers/expenseController.js';
import { getOrCreateUser } from '../src/services/userService.js';
import { createTrip, updateTripById } from '../src/services/tripService.js';
import { pool, query } from '../src/config/db.js';

test('moneyUtils & expenseValidator: exact BigInt minor-unit arithmetic, deterministic equal splits, custom split validation, categories, and dates', () => {
  // 1. Positive decimal amounts & minor unit conversions
  assert.equal(decimalToMinorUnits('0.01'), 1n);
  assert.equal(decimalToMinorUnits('100.00'), 10000n);
  assert.equal(decimalToMinorUnits('9999999999.99'), 999999999999n);
  assert.equal(minorUnitsToDecimal(10000n), '100.00');
  assert.equal(minorUnitsToDecimal(-15025n), '-150.25');
  assert.equal(normalizeMoneyString('250.5'), '250.50');

  // 2. Exact addition, subtraction, comparison, and percentage without float drift
  assert.equal(sumMoneyStrings(['0.10', '0.20', '1499.95', '0.05']), '1500.30');
  assert.equal(subtractMoneyStrings('500.00', '650.00'), '-150.00');
  assert.equal(compareMoneyStrings('100.00', '100.00'), 0);
  assert.equal(compareMoneyStrings('99.99', '100.00'), -1);
  assert.equal(calculateMoneyPercentage('33.34', '100.00'), 33.34);
  assert.equal(calculateMoneyPercentage('100.00', '0.00'), null);

  // 3. Range validation: zero/negative rejection, >2 decimals rejection, max boundary
  assert.equal(validateMoneyRange('0.01', { allowZero: false }).valid, true);
  assert.equal(
    validateMoneyRange('9999999999.99', { allowZero: false }).valid,
    true
  );
  assert.equal(validateMoneyRange('0.00', { allowZero: false }).valid, false);
  assert.equal(validateMoneyRange('-10.00', { allowZero: false }).valid, false);
  assert.equal(validateMoneyRange('12.345', { allowZero: false }).valid, false);
  assert.equal(
    validateMoneyRange('10000000000.00', { allowZero: false }).valid,
    false
  );

  // 4. Deterministic equal split of 100.00 among 3 participants -> 33.34, 33.33, 33.33
  const u1 = crypto.randomUUID();
  const u2 = crypto.randomUUID();
  const u3 = crypto.randomUUID();
  const equalThree = splitAmountEqually('100.00', [u1, u2, u3]);
  assert.deepEqual(equalThree, [
    { userId: u1, shareAmount: '33.34' },
    { userId: u2, shareAmount: '33.33' },
    { userId: u3, shareAmount: '33.33' },
  ]);
  assert.equal(
    sumMoneyStrings(equalThree.map((s) => s.shareAmount)),
    '100.00'
  );

  // 5. Equal split of amount smaller than participant count (0.02 among 3 -> rejected)
  assert.throws(() => splitAmountEqually('0.02', [u1, u2, u3]));
  const tooSmallSplit = validateSplitAllocationInput('0.02', {
    mode: 'equal',
    participantUserIds: [u1, u2, u3],
  });
  assert.equal(tooSmallSplit.valid, false);
  assert.ok(tooSmallSplit.errors[0].includes('too small to split'));

  // 6. Custom split exact total validation & mismatched total rejection
  const validCustom = validateSplitAllocationInput('100.00', {
    mode: 'custom',
    shares: [
      { userId: u1, shareAmount: '45.50' },
      { userId: u2, shareAmount: '54.50' },
    ],
  });
  assert.equal(validCustom.valid, true);
  assert.deepEqual(validCustom.data.shares, [
    { userId: u1, shareAmount: '45.50' },
    { userId: u2, shareAmount: '54.50' },
  ]);

  const mismatchedCustom = validateSplitAllocationInput('100.00', {
    mode: 'custom',
    shares: [
      { userId: u1, shareAmount: '45.00' },
      { userId: u2, shareAmount: '54.00' },
    ],
  });
  assert.equal(mismatchedCustom.valid, false);
  assert.ok(mismatchedCustom.errors[0].includes('does not equal'));

  // 7. Duplicate participant rejection in equal & custom splits
  assert.equal(
    validateSplitAllocationInput('100.00', {
      mode: 'equal',
      participantUserIds: [u1, u1],
    }).valid,
    false
  );
  assert.equal(
    validateSplitAllocationInput('100.00', {
      mode: 'custom',
      shares: [
        { userId: u1, shareAmount: '50.00' },
        { userId: u1, shareAmount: '50.00' },
      ],
    }).valid,
    false
  );

  // 8. Category allowlist & normalization
  assert.equal(EXPENSE_CATEGORIES.length, 8);
  assert.equal(normalizeExpenseCategory('Food & Dining'), 'food');
  assert.equal(normalizeExpenseCategory('ACCOMMODATION'), 'accommodation');
  assert.equal(normalizeExpenseCategory('luxury_yacht'), null);

  // 9. Full expense payload validation (invalid category & invalid date rejection)
  assert.equal(
    validateExpenseInput({
      title: 'Hotel Deposit',
      category: 'invalid-cat',
      amount: '120.00',
      paidByUserId: u1,
      expenseDate: '2026-10-10',
      split: { mode: 'equal', participantUserIds: [u1, u2] },
    }).valid,
    false
  );

  assert.equal(
    validateExpenseInput({
      title: 'Hotel Deposit',
      category: 'accommodation',
      amount: '120.00',
      paidByUserId: u1,
      expenseDate: '2026-02-30',
      split: { mode: 'equal', participantUserIds: [u1, u2] },
    }).valid,
    false
  );

  // 10. Settlement boolean validation
  assert.equal(validateSettlementInput({ isSettled: true }).valid, true);
  assert.equal(validateSettlementInput({ isSettled: 'yes' }).valid, false);
});

test('Full HTTP + PostgreSQL Expense, Budget, Category Analytics, Split & Settlement Lifecycle', async (t) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const createdUserIds = [];
  const createdTripIds = [];

  const tokenMap = {
    'owner-token': {
      uid: `exp-owner-${runId}`,
      email: `exp-owner-${runId}@routewise.test`,
      name: 'Trip Owner Aamir',
    },
    'member-a-token': {
      uid: `exp-member-a-${runId}`,
      email: `exp-member-a-${runId}@routewise.test`,
      name: 'Active Member Bilal',
    },
    'member-b-token': {
      uid: `exp-member-b-${runId}`,
      email: `exp-member-b-${runId}@routewise.test`,
      name: 'Active Member Danish',
    },
    'pending-token': {
      uid: `exp-pending-${runId}`,
      email: `exp-pending-${runId}@routewise.test`,
      name: 'Pending Invitee Zayd',
    },
    'viewer-token': {
      uid: `exp-viewer-${runId}`,
      email: `exp-viewer-${runId}@routewise.test`,
      name: 'Viewer Farah',
    },
    'stranger-token': {
      uid: `exp-stranger-${runId}`,
      email: `exp-stranger-${runId}@routewise.test`,
      name: 'Stranger User',
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

  const { requireTripAccess, requireTripEditor } = createTripAccessMiddleware();

  const app = express();
  app.use(express.json());
  const router = Router({ mergeParams: true });
  router.use(testAuth);

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
    '/:tripId/expenses/:expenseId',
    requireTripAccess,
    updateTripExpenseHandler
  );
  router.delete(
    '/:tripId/expenses/:expenseId',
    requireTripAccess,
    deleteTripExpenseHandler
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

  const requestJson = async (path, { method = 'GET', token, body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => ({}));
    return {
      status: res.status,
      data:
        payload && payload.status === 'ok' && payload.data
          ? payload.data
          : payload,
    };
  };

  // Provision users in PostgreSQL
  const ownerUser = await getOrCreateUser(
    tokenMap['owner-token'].uid,
    tokenMap['owner-token'].email,
    tokenMap['owner-token'].name
  );
  const memberAUser = await getOrCreateUser(
    tokenMap['member-a-token'].uid,
    tokenMap['member-a-token'].email,
    tokenMap['member-a-token'].name
  );
  const memberBUser = await getOrCreateUser(
    tokenMap['member-b-token'].uid,
    tokenMap['member-b-token'].email,
    tokenMap['member-b-token'].name
  );
  const pendingUser = await getOrCreateUser(
    tokenMap['pending-token'].uid,
    tokenMap['pending-token'].email,
    tokenMap['pending-token'].name
  );
  const viewerUser = await getOrCreateUser(
    tokenMap['viewer-token'].uid,
    tokenMap['viewer-token'].email,
    tokenMap['viewer-token'].name
  );
  const strangerUser = await getOrCreateUser(
    tokenMap['stranger-token'].uid,
    tokenMap['stranger-token'].email,
    tokenMap['stranger-token'].name
  );
  createdUserIds.push(
    ownerUser.id,
    memberAUser.id,
    memberBUser.id,
    pendingUser.id,
    viewerUser.id,
    strangerUser.id
  );

  // Create a trip with plannedBudget = 500.00 USD
  const trip = await createTrip(ownerUser.id, {
    title: 'Kashmir Group Expedition',
    destinationName: 'Srinagar',
    destinationLatitude: 34.083656,
    destinationLongitude: 74.797371,
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    plannedBudget: '500.00',
    currency: 'USD',
    description: 'Phase 5 financial verification trip',
  });
  createdTripIds.push(trip.id);

  // Add active members, a viewer, and a pending member
  await query(
    `INSERT INTO trip_members (trip_id, user_id, role, membership_status, joined_at)
     VALUES
       ($1, $2, 'member', 'active', NOW()),
       ($1, $3, 'member', 'active', NOW()),
       ($1, $4, 'viewer', 'active', NOW()),
       ($1, $5, 'member', 'pending', NULL)
     ON CONFLICT (trip_id, user_id) DO UPDATE
       SET role = EXCLUDED.role, membership_status = EXCLUDED.membership_status`,
    [trip.id, memberAUser.id, memberBUser.id, viewerUser.id, pendingUser.id]
  );

  // Add an itinerary item with estimated_cost = 80.00 to verify separation from actual expenses
  const dayRes = await query(
    `INSERT INTO itinerary_days (trip_id, day_order, day_date, notes)
     VALUES ($1, 1, '2026-10-10', 'Day 1')
     RETURNING id`,
    [trip.id]
  );
  await query(
    `INSERT INTO itinerary_items (itinerary_day_id, title, sort_order, estimated_cost)
     VALUES ($1, 'Shikara Estimate', 1, 80.00)`,
    [dayRes.rows[0].id]
  );

  // =========================================================================
  // B. Access Control: Unauthenticated (401), Stranger (404), Viewer (read-only)
  // =========================================================================
  const unauthRes = await requestJson(`/${trip.id}/expenses`);
  assert.equal(unauthRes.status, 401);

  const strangerRes = await requestJson(`/${trip.id}/expenses`, {
    token: 'stranger-token',
  });
  assert.equal(strangerRes.status, 404);

  const viewerGetRes = await requestJson(`/${trip.id}/expenses`, {
    token: 'viewer-token',
  });
  assert.equal(viewerGetRes.status, 200);
  assert.equal(viewerGetRes.data.trip.accessRole, 'viewer');
  // Pending member must NOT appear in active participants
  assert.equal(
    viewerGetRes.data.participants.some((p) => p.userId === pendingUser.id),
    false
  );

  const viewerPostRes = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'viewer-token',
    body: {
      title: 'Unauthorized Viewer Expense',
      category: 'food',
      amount: '25.00',
      paidByUserId: viewerUser.id,
      expenseDate: '2026-10-10',
      split: { mode: 'equal', participantUserIds: [ownerUser.id] },
    },
  });
  assert.equal(viewerPostRes.status, 403);

  // =========================================================================
  // C. Expense Creation & Splits
  // =========================================================================
  // 1. Reject inactive/pending participant or non-member payer
  const pendingSplitRes = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'member-a-token',
    body: {
      title: 'Invalid Pending Participant Split',
      category: 'food',
      amount: '50.00',
      paidByUserId: memberAUser.id,
      expenseDate: '2026-10-10',
      split: {
        mode: 'equal',
        participantUserIds: [ownerUser.id, pendingUser.id],
      },
    },
  });
  assert.equal(pendingSplitRes.status, 400);

  const strangerPayerRes = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'member-a-token',
    body: {
      title: 'Invalid Stranger Payer',
      category: 'food',
      amount: '50.00',
      paidByUserId: strangerUser.id,
      expenseDate: '2026-10-10',
      split: {
        mode: 'equal',
        participantUserIds: [ownerUser.id, memberAUser.id],
      },
    },
  });
  assert.equal(strangerPayerRes.status, 400);

  // 2. Active Member A creates Expense #1: 100.00 equal split across Owner, MemberA, MemberB
  // Expect deterministic shares: Owner=33.34, MemberA=33.33, MemberB=33.33
  // Paid by MemberA -> MemberA's own share (33.33) is automatically marked settled
  const createExp1Res = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'member-a-token',
    body: {
      title: 'Houseboat Advance Booking',
      category: 'accommodation',
      amount: '100.00',
      paidByUserId: memberAUser.id,
      expenseDate: '2026-10-10',
      notes: 'Dal Lake houseboat deposit',
      split: {
        mode: 'equal',
        participantUserIds: [ownerUser.id, memberAUser.id, memberBUser.id],
      },
    },
  });
  assert.equal(createExp1Res.status, 201);
  const exp1 = createExp1Res.data.expenses[0];
  assert.equal(exp1.title, 'Houseboat Advance Booking');
  assert.equal(exp1.category, 'accommodation');
  assert.equal(exp1.amount, '100.00');
  assert.equal(exp1.paidByUserId, memberAUser.id);
  assert.equal(exp1.createdByUserId, memberAUser.id);
  assert.equal(exp1.splits.length, 3);

  const exp1OwnerSplit = exp1.splits.find((s) => s.userId === ownerUser.id);
  const exp1MemberASplit = exp1.splits.find((s) => s.userId === memberAUser.id);
  const exp1MemberBSplit = exp1.splits.find((s) => s.userId === memberBUser.id);
  assert.equal(exp1OwnerSplit.shareAmount, '33.34');
  assert.equal(exp1OwnerSplit.isSettled, false);
  assert.equal(exp1OwnerSplit.settledAt, null);

  assert.equal(exp1MemberASplit.shareAmount, '33.33');
  assert.equal(exp1MemberASplit.isSettled, true);
  assert.equal(exp1MemberASplit.isPayerShare, true);
  assert.equal(exp1MemberASplit.settledByUserId, memberAUser.id);
  assert.ok(exp1MemberASplit.settledAt);

  assert.equal(exp1MemberBSplit.shareAmount, '33.33');
  assert.equal(exp1MemberBSplit.isSettled, false);

  // 3. Active Member B creates Expense #2: 150.00 custom split where payer (Member B) is NOT in split
  // Owner share = 90.00, Member A share = 60.00
  const createExp2Res = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'member-b-token',
    body: {
      title: 'Private Airport Transfer SUV',
      category: 'transport',
      amount: '150.00',
      paidByUserId: memberBUser.id,
      expenseDate: '2026-10-10',
      split: {
        mode: 'custom',
        shares: [
          { userId: ownerUser.id, shareAmount: '90.00' },
          { userId: memberAUser.id, shareAmount: '60.00' },
        ],
      },
    },
  });
  assert.equal(createExp2Res.status, 201);
  const exp2 = createExp2Res.data.expenses.find(
    (e) => e.title === 'Private Airport Transfer SUV'
  );
  assert.equal(exp2.splits.length, 2);
  assert.equal(
    exp2.splits.some((s) => s.userId === memberBUser.id),
    false
  );

  // =========================================================================
  // D. Budget & Analytics Calculations
  // =========================================================================
  // At this point: plannedBudget = 500.00, totalExpenses = 250.00 (100 + 150)
  // itineraryEstimatedTotal = 80.00 (must NOT be mixed into totalExpenses)
  const bSummary1 = createExp2Res.data.budgetSummary;
  assert.equal(bSummary1.plannedBudget, '500.00');
  assert.equal(bSummary1.totalExpenses, '250.00');
  assert.equal(bSummary1.remainingBudget, '250.00');
  assert.equal(bSummary1.budgetUsagePercentage, '50.00');
  assert.equal(bSummary1.isOverBudget, false);
  assert.equal(bSummary1.status, 'WITHIN_BUDGET');
  assert.equal(bSummary1.itineraryEstimatedTotal, '80.00');

  // Verify participant balances:
  // Owner: paid 0.00, share = 33.34 + 90.00 = 123.34, pendingToPay = 123.34, pendingToReceive = 0.00, net = -123.34
  // Member A: paid 100.00, share = 33.33 + 60.00 = 93.33, pendingToPay = 60.00 (to Member B), pendingToReceive = 66.67 (33.34 from Owner + 33.33 from Member B), net = +6.67
  // Member B: paid 150.00, share = 33.33, pendingToPay = 0.00... wait: Member B owes 33.33 to Member A on Exp1! And receives 150.00 (90 from Owner + 60 from Member A) on Exp2 -> net = 150.00 - 33.33 = +116.67
  const ownerBal1 = createExp2Res.data.participantBalances.find(
    (b) => b.userId === ownerUser.id
  );
  const memberABal1 = createExp2Res.data.participantBalances.find(
    (b) => b.userId === memberAUser.id
  );
  const memberBBal1 = createExp2Res.data.participantBalances.find(
    (b) => b.userId === memberBUser.id
  );
  assert.equal(ownerBal1.totalPaid, '0.00');
  assert.equal(ownerBal1.totalShare, '123.34');
  assert.equal(ownerBal1.pendingToPay, '123.34');
  assert.equal(ownerBal1.pendingToReceive, '0.00');
  assert.equal(ownerBal1.netOutstanding, '-123.34');

  assert.equal(memberABal1.totalPaid, '100.00');
  assert.equal(memberABal1.totalShare, '93.33');
  assert.equal(memberABal1.pendingToPay, '60.00');
  assert.equal(memberABal1.pendingToReceive, '66.67');
  assert.equal(memberABal1.netOutstanding, '6.67');

  assert.equal(memberBBal1.totalPaid, '150.00');
  assert.equal(memberBBal1.totalShare, '33.33');
  assert.equal(memberBBal1.pendingToPay, '33.33');
  assert.equal(memberBBal1.pendingToReceive, '150.00');
  assert.equal(memberBBal1.netOutstanding, '116.67');

  // Add Expense #3 (400.00 food) by Owner to trigger OVER_BUDGET
  const createExp3Res = await requestJson(`/${trip.id}/expenses`, {
    method: 'POST',
    token: 'owner-token',
    body: {
      title: 'Wazwan Group Banquet Dinner',
      category: 'food',
      amount: '400.00',
      paidByUserId: ownerUser.id,
      expenseDate: '2026-10-11',
      split: {
        mode: 'custom',
        shares: [
          { userId: ownerUser.id, shareAmount: '200.00' },
          { userId: memberAUser.id, shareAmount: '100.00' },
          { userId: memberBUser.id, shareAmount: '100.00' },
        ],
      },
    },
  });
  assert.equal(createExp3Res.status, 201);
  const bSummary2 = createExp3Res.data.budgetSummary;
  assert.equal(bSummary2.totalExpenses, '650.00');
  assert.equal(bSummary2.remainingBudget, '-150.00');
  assert.equal(bSummary2.budgetUsagePercentage, '130.00');
  assert.equal(bSummary2.isOverBudget, true);
  assert.equal(bSummary2.status, 'OVER_BUDGET');

  // Verify category breakdown sorted highest spending first:
  // food: 400.00 (61.54%), transport: 150.00 (23.08%), accommodation: 100.00 (15.38%)
  const breakdown = createExp3Res.data.categoryBreakdown;
  assert.equal(breakdown.length, 3);
  assert.equal(breakdown[0].category, 'food');
  assert.equal(breakdown[0].totalAmount, '400.00');
  assert.equal(breakdown[0].percentageOfTotal, '61.54');
  assert.equal(breakdown[1].category, 'transport');
  assert.equal(breakdown[1].totalAmount, '150.00');
  assert.equal(breakdown[1].percentageOfTotal, '23.08');
  assert.equal(breakdown[2].category, 'accommodation');
  assert.equal(breakdown[2].totalAmount, '100.00');
  assert.equal(breakdown[2].percentageOfTotal, '15.38');

  // Verify zero planned budget state (NO_BUDGET_SET)
  await updateTripById(trip.id, ownerUser.id, { plannedBudget: '0.00' });
  const zeroBudgetRes = await requestJson(`/${trip.id}/expenses`, {
    token: 'owner-token',
  });
  assert.equal(zeroBudgetRes.data.budgetSummary.plannedBudget, '0.00');
  assert.equal(zeroBudgetRes.data.budgetSummary.status, 'NO_BUDGET_SET');
  assert.equal(zeroBudgetRes.data.budgetSummary.budgetUsagePercentage, null);
  assert.equal(zeroBudgetRes.data.budgetSummary.isOverBudget, false);
  // Restore plannedBudget to 500.00
  await updateTripById(trip.id, ownerUser.id, { plannedBudget: '500.00' });

  // =========================================================================
  // E. Settlement Flow
  // =========================================================================
  // 1. Payer's own share cannot become pending (400 PAYER_SHARE_ALREADY_COVERED)
  const payerUnsettleRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}/splits/${exp1MemberASplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'member-a-token',
      body: { isSettled: false },
    }
  );
  assert.equal(payerUnsettleRes.status, 400);
  assert.equal(payerUnsettleRes.data.code, 'PAYER_SHARE_ALREADY_COVERED');

  // 2. Unauthorized third-party member (Member B) cannot settle or alter Owner's share on Member A's expense (exp1)
  const thirdPartySettleRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}/splits/${exp1OwnerSplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'member-b-token',
      body: { isSettled: true },
    }
  );
  assert.equal(thirdPartySettleRes.status, 403);

  // 3. Viewer cannot settle any share (403)
  const viewerSettleRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}/splits/${exp1OwnerSplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'viewer-token',
      body: { isSettled: true },
    }
  );
  assert.equal(viewerSettleRes.status, 403);

  // 4. Member B marks their own share on Exp1 (33.33) as settled
  const memberBSettleRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}/splits/${exp1MemberBSplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'member-b-token',
      body: { isSettled: true },
    }
  );
  assert.equal(memberBSettleRes.status, 200);
  const updatedExp1AfterSettle = memberBSettleRes.data.expenses.find(
    (e) => e.id === exp1.id
  );
  const settledSplitB = updatedExp1AfterSettle.splits.find(
    (s) => s.id === exp1MemberBSplit.id
  );
  assert.equal(settledSplitB.isSettled, true);
  assert.equal(settledSplitB.settledByUserId, memberBUser.id);
  assert.ok(settledSplitB.settledAt);

  // 5. Reopen settlement (isSettled: false) clears settledAt and settledByUserId, then re-settle for edit test
  const reopenRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}/splits/${exp1MemberBSplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'member-a-token', // Expense payer can also toggle settlement
      body: { isSettled: false },
    }
  );
  assert.equal(reopenRes.status, 200);
  const reopenedSplitB = reopenRes.data.expenses
    .find((e) => e.id === exp1.id)
    .splits.find((s) => s.id === exp1MemberBSplit.id);
  assert.equal(reopenedSplitB.isSettled, false);
  assert.equal(reopenedSplitB.settledAt, null);
  assert.equal(reopenedSplitB.settledByUserId, null);

  // Mark settled again so we can test metadata-only edit preservation and 409 financial reset protection
  await requestJson(
    `/${trip.id}/expenses/${exp1.id}/splits/${exp1MemberBSplit.id}/settlement`,
    {
      method: 'PATCH',
      token: 'member-b-token',
      body: { isSettled: true },
    }
  );

  // =========================================================================
  // F. Edit & Delete Rules + 409 Settlement Reset Confirmation
  // =========================================================================
  // 1. Non-creator member (Member B) cannot edit or delete Member A's expense (exp1) -> 403
  const forbiddenEditRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}`,
    {
      method: 'PATCH',
      token: 'member-b-token',
      body: {
        title: 'Unauthorized Edit Attempt',
        category: 'accommodation',
        amount: '100.00',
        paidByUserId: memberAUser.id,
        expenseDate: '2026-10-10',
        split: {
          mode: 'custom',
          shares: [
            { userId: ownerUser.id, shareAmount: '33.34' },
            { userId: memberAUser.id, shareAmount: '33.33' },
            { userId: memberBUser.id, shareAmount: '33.33' },
          ],
        },
      },
    }
  );
  assert.equal(forbiddenEditRes.status, 403);

  const forbiddenDeleteRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}`,
    {
      method: 'DELETE',
      token: 'member-b-token',
    }
  );
  assert.equal(forbiddenDeleteRes.status, 403);

  // 2. Creator (Member A) performs a metadata-only update on Exp1 (title, notes, date)
  // Expect 200 OK AND existing settled share for Member B is preserved!
  const metadataEditRes = await requestJson(`/${trip.id}/expenses/${exp1.id}`, {
    method: 'PATCH',
    token: 'member-a-token',
    body: {
      title: 'Houseboat Deluxe Suite Deposit',
      category: 'accommodation',
      amount: '100.00',
      paidByUserId: memberAUser.id,
      expenseDate: '2026-10-11',
      notes: 'Updated notes without changing split amounts',
      split: {
        mode: 'equal',
        participantUserIds: [ownerUser.id, memberAUser.id, memberBUser.id],
      },
    },
  });
  assert.equal(metadataEditRes.status, 200);
  const exp1AfterMeta = metadataEditRes.data.expenses.find(
    (e) => e.id === exp1.id
  );
  assert.equal(exp1AfterMeta.title, 'Houseboat Deluxe Suite Deposit');
  assert.equal(exp1AfterMeta.expenseDate, '2026-10-11');
  const preservedSplitB = exp1AfterMeta.splits.find(
    (s) => s.userId === memberBUser.id
  );
  assert.equal(preservedSplitB.isSettled, true);
  assert.equal(preservedSplitB.settledByUserId, memberBUser.id);
  assert.ok(preservedSplitB.settledAt);

  // 3. Financial allocation update on Exp1 (changing amount from 100.00 to 120.00) WITHOUT confirmSettlementReset
  // Expect 409 EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED
  const unconfirmedFinancialEditRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}`,
    {
      method: 'PATCH',
      token: 'member-a-token',
      body: {
        title: 'Houseboat Deluxe Suite Deposit',
        category: 'accommodation',
        amount: '120.00',
        paidByUserId: memberAUser.id,
        expenseDate: '2026-10-11',
        split: {
          mode: 'equal',
          participantUserIds: [ownerUser.id, memberAUser.id, memberBUser.id],
        },
      },
    }
  );
  assert.equal(unconfirmedFinancialEditRes.status, 409);
  assert.equal(
    unconfirmedFinancialEditRes.data.code,
    'EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED'
  );
  assert.equal(
    unconfirmedFinancialEditRes.data.details.settledNonPayerShareCount,
    1
  );

  // 4. Retry financial allocation update with confirmSettlementReset: true -> 200 OK
  // Non-payer shares reset to pending (40.00 each), payer's own share (40.00) stays settled
  const confirmedFinancialEditRes = await requestJson(
    `/${trip.id}/expenses/${exp1.id}`,
    {
      method: 'PATCH',
      token: 'member-a-token',
      body: {
        title: 'Houseboat Deluxe Suite Deposit',
        category: 'accommodation',
        amount: '120.00',
        paidByUserId: memberAUser.id,
        expenseDate: '2026-10-11',
        confirmSettlementReset: true,
        split: {
          mode: 'equal',
          participantUserIds: [ownerUser.id, memberAUser.id, memberBUser.id],
        },
      },
    }
  );
  assert.equal(confirmedFinancialEditRes.status, 200);
  const exp1AfterReset = confirmedFinancialEditRes.data.expenses.find(
    (e) => e.id === exp1.id
  );
  assert.equal(exp1AfterReset.amount, '120.00');
  const resetSplitB = exp1AfterReset.splits.find(
    (s) => s.userId === memberBUser.id
  );
  assert.equal(resetSplitB.shareAmount, '40.00');
  assert.equal(resetSplitB.isSettled, false);
  assert.equal(resetSplitB.settledAt, null);
  assert.equal(resetSplitB.settledByUserId, null);

  // 5. Trip Owner deletes Member B's expense (exp2: 150.00 transport)
  // Verify ON DELETE CASCADE removes expense_splits rows and recalculates totals (120 + 400 = 520.00)
  const ownerDeleteRes = await requestJson(
    `/${trip.id}/expenses/${exp2.id}`,
    {
      method: 'DELETE',
      token: 'owner-token',
    }
  );
  assert.equal(ownerDeleteRes.status, 200);
  assert.equal(ownerDeleteRes.data.budgetSummary.totalExpenses, '520.00');
  assert.equal(ownerDeleteRes.data.expenses.length, 2);

  const orphanSplitsRes = await query(
    'SELECT COUNT(*)::int AS cnt FROM expense_splits WHERE expense_id = $1',
    [exp2.id]
  );
  assert.equal(orphanSplitsRes.rows[0].cnt, 0);
});

test.after(async () => {
  await pool.end().catch(() => {});
});
