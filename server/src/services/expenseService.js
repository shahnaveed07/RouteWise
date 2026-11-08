import { query, withTransaction } from '../config/db.js';
import { isValidUuid } from './tripService.js';
import {
  calculateMoneyPercentage,
  compareMoneyStrings,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  splitAmountEqually,
  subtractMoneyStrings,
  sumMoneyStrings,
} from '../utils/moneyUtils.js';
import {
  EXPENSE_CATEGORIES,
  getExpenseCategoryLabel,
} from '../validators/expenseValidator.js';

/**
 * Lists all deduplicated active trip participants (owner + active members/viewers).
 * The trip owner is always included with tripRole = 'owner' even if not in trip_members.
 */
export async function listTripParticipants(tripId, queryFn = query) {
  if (!isValidUuid(tripId)) {
    return [];
  }

  const sql = `
    SELECT
      u.id AS "userId",
      u.full_name AS "displayName",
      u.email AS "email",
      'owner' AS "tripRole",
      1 AS "roleSort"
    FROM trips t
    JOIN users u ON u.id = t.owner_user_id
    WHERE t.id = $1

    UNION ALL

    SELECT
      u.id AS "userId",
      u.full_name AS "displayName",
      u.email AS "email",
      tm.role AS "tripRole",
      CASE WHEN tm.role = 'member' THEN 2 ELSE 3 END AS "roleSort"
    FROM trip_members tm
    JOIN trips t ON t.id = tm.trip_id
    JOIN users u ON u.id = tm.user_id
    WHERE tm.trip_id = $1
      AND tm.membership_status = 'active'
      AND tm.user_id <> t.owner_user_id
    ORDER BY "roleSort" ASC, "displayName" ASC;
  `;

  const result = await queryFn(sql, [tripId.trim()]);
  const seen = new Set();
  const participants = [];

  for (const row of result.rows) {
    if (seen.has(row.userId)) {
      continue;
    }
    seen.add(row.userId);
    participants.push({
      userId: row.userId,
      displayName: row.displayName,
      email: row.email,
      tripRole: row.tripRole,
      isActive: true,
    });
  }

  return participants;
}

function inferSplitMode(amountStr, splits = []) {
  if (!Array.isArray(splits) || splits.length === 0) {
    return 'custom';
  }
  try {
    const participantIds = splits.map((s) => s.userId);
    const equalShares = splitAmountEqually(amountStr, participantIds);
    const expectedSorted = equalShares
      .map((s) => decimalToMinorUnits(s.shareAmount) ?? -1n)
      .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
    const actualSorted = splits
      .map((s) => decimalToMinorUnits(s.shareAmount) ?? -2n)
      .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
    const matchesEqual = expectedSorted.every(
      (val, idx) => val === actualSorted[idx]
    );
    return matchesEqual ? 'equal' : 'custom';
  } catch (_err) {
    return 'custom';
  }
}

function mapSplitRow(row, paidByUserId, actorUserId, accessRole) {
  const isPayerShare = row.user_id === paidByUserId;
  const isSettled = Boolean(row.is_settled);
  const canMutateTrip = accessRole === 'owner' || accessRole === 'member';
  const canToggleSettlement =
    canMutateTrip &&
    !isPayerShare &&
    (accessRole === 'owner' ||
      paidByUserId === actorUserId ||
      row.user_id === actorUserId);

  return {
    id: row.id,
    expenseId: row.expense_id,
    userId: row.user_id,
    userName: row.user_name || 'Traveller',
    userEmail: row.user_email || null,
    shareAmount: row.share_amount_text,
    isSettled,
    isPayerShare,
    settledAt: row.settled_at || null,
    settledByUserId: row.settled_by_user_id || null,
    settledByUserName: row.settled_by_user_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canToggleSettlement,
  };
}

function mapExpenseRecord(row, splits = [], actorUserId = null, accessRole = 'viewer') {
  const isOwner = accessRole === 'owner';
  const isCreator = Boolean(actorUserId && row.created_by_user_id === actorUserId);
  const canEditOrDelete =
    (accessRole === 'owner' || accessRole === 'member') && (isOwner || isCreator);

  const nonPayerSplits = splits.filter((s) => !s.isPayerShare);
  const pendingNonPayerSplits = nonPayerSplits.filter((s) => !s.isSettled);
  const pendingAmount = sumMoneyStrings(
    pendingNonPayerSplits.map((s) => s.shareAmount)
  );
  const settledSplitsCount = splits.filter((s) => s.isSettled).length;

  return {
    id: row.id,
    tripId: row.trip_id,
    paidByUserId: row.paid_by_user_id,
    paidByUserName: row.paid_by_user_name || 'Traveller',
    createdByUserId: row.created_by_user_id,
    createdByUserName: row.created_by_user_name || 'Traveller',
    title: row.title,
    amount: row.amount_text,
    category: row.category,
    categoryLabel: getExpenseCategoryLabel(row.category),
    expenseDate: row.expense_date,
    notes: row.notes ?? null,
    splitMode: inferSplitMode(row.amount_text, splits),
    splits,
    settlementProgress: {
      totalSplits: splits.length,
      settledSplits: settledSplitsCount,
      nonPayerSplitCount: nonPayerSplits.length,
      settledNonPayerSplitCount: nonPayerSplits.filter((s) => s.isSettled).length,
      pendingNonPayerSplitCount: pendingNonPayerSplits.length,
      pendingAmount,
      isFullySettled: pendingNonPayerSplits.length === 0,
    },
    permissions: {
      canEdit: canEditOrDelete,
      canDelete: canEditOrDelete,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchHydratedExpensesForTrip(
  tripId,
  actorUserId,
  accessRole,
  queryFn = query
) {
  const expensesRes = await queryFn(
    `SELECT
       e.id,
       e.trip_id,
       e.paid_by_user_id,
       payer.full_name AS paid_by_user_name,
       e.created_by_user_id,
       creator.full_name AS created_by_user_name,
       e.title,
       e.amount::numeric(12,2)::text AS amount_text,
       e.category,
       TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
       e.notes,
       e.created_at,
       e.updated_at
     FROM expenses e
     JOIN users payer ON payer.id = e.paid_by_user_id
     JOIN users creator ON creator.id = e.created_by_user_id
     WHERE e.trip_id = $1
     ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC`,
    [tripId]
  );

  if (expensesRes.rows.length === 0) {
    return [];
  }

  const splitsRes = await queryFn(
    `SELECT
       s.id,
       s.expense_id,
       s.user_id,
       u.full_name AS user_name,
       u.email AS user_email,
       s.share_amount::numeric(12,2)::text AS share_amount_text,
       s.is_settled,
       s.settled_at,
       s.settled_by_user_id,
       settler.full_name AS settled_by_user_name,
       s.created_at,
       s.updated_at
     FROM expense_splits s
     JOIN expenses e ON e.id = s.expense_id
     JOIN users u ON u.id = s.user_id
     LEFT JOIN users settler ON settler.id = s.settled_by_user_id
     WHERE e.trip_id = $1
     ORDER BY s.created_at ASC, u.full_name ASC, s.id ASC`,
    [tripId]
  );

  const splitsByExpenseId = new Map();
  for (const expenseRow of expensesRes.rows) {
    splitsByExpenseId.set(expenseRow.id, []);
  }

  for (const splitRow of splitsRes.rows) {
    const parentExpense = expensesRes.rows.find(
      (e) => e.id === splitRow.expense_id
    );
    if (!parentExpense) continue;
    const mappedSplit = mapSplitRow(
      splitRow,
      parentExpense.paid_by_user_id,
      actorUserId,
      accessRole
    );
    splitsByExpenseId.get(splitRow.expense_id).push(mappedSplit);
  }

  return expensesRes.rows.map((row) =>
    mapExpenseRecord(
      row,
      splitsByExpenseId.get(row.id) || [],
      actorUserId,
      accessRole
    )
  );
}

async function fetchSingleHydratedExpense(
  tripId,
  expenseId,
  actorUserId,
  accessRole,
  queryFn = query
) {
  const expensesRes = await queryFn(
    `SELECT
       e.id,
       e.trip_id,
       e.paid_by_user_id,
       payer.full_name AS paid_by_user_name,
       e.created_by_user_id,
       creator.full_name AS created_by_user_name,
       e.title,
       e.amount::numeric(12,2)::text AS amount_text,
       e.category,
       TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
       e.notes,
       e.created_at,
       e.updated_at
     FROM expenses e
     JOIN users payer ON payer.id = e.paid_by_user_id
     JOIN users creator ON creator.id = e.created_by_user_id
     WHERE e.id = $1 AND e.trip_id = $2`,
    [expenseId, tripId]
  );

  if (expensesRes.rowCount === 0) {
    return null;
  }

  const expenseRow = expensesRes.rows[0];
  const splitsRes = await queryFn(
    `SELECT
       s.id,
       s.expense_id,
       s.user_id,
       u.full_name AS user_name,
       u.email AS user_email,
       s.share_amount::numeric(12,2)::text AS share_amount_text,
       s.is_settled,
       s.settled_at,
       s.settled_by_user_id,
       settler.full_name AS settled_by_user_name,
       s.created_at,
       s.updated_at
     FROM expense_splits s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN users settler ON settler.id = s.settled_by_user_id
     WHERE s.expense_id = $1
     ORDER BY s.created_at ASC, u.full_name ASC, s.id ASC`,
    [expenseId]
  );

  const mappedSplits = splitsRes.rows.map((splitRow) =>
    mapSplitRow(
      splitRow,
      expenseRow.paid_by_user_id,
      actorUserId,
      accessRole
    )
  );

  return mapExpenseRecord(expenseRow, mappedSplits, actorUserId, accessRole);
}

/**
 * Pure analytical builder for budget overview, category breakdown, participant balances,
 * and pairwise settlement summary using exact BigInt minor-unit arithmetic.
 * Exported for direct unit testing as well as database dashboard hydration.
 */
export function buildTripFinancialAnalytics({
  plannedBudget = '0.00',
  currency = 'INR',
  itineraryEstimatedTotal = '0.00',
  participants = [],
  expenses = [],
}) {
  const plannedMinor = decimalToMinorUnits(plannedBudget, {
    allowZero: true,
    allowNegative: false,
  }) ?? 0n;
  const hasPlannedBudget = plannedMinor > 0n;

  const totalExpenses = sumMoneyStrings(expenses.map((e) => e.amount));
  const totalExpensesMinor = decimalToMinorUnits(totalExpenses, {
    allowZero: true,
    allowNegative: false,
  }) ?? 0n;

  const remainingBudget = subtractMoneyStrings(plannedBudget, totalExpenses);
  const isOverBudget = hasPlannedBudget && totalExpensesMinor > plannedMinor;
  const overBudgetAmount = isOverBudget
    ? subtractMoneyStrings(totalExpenses, plannedBudget)
    : '0.00';

  const rawUsagePct = hasPlannedBudget
    ? calculateMoneyPercentage(totalExpenses, plannedBudget)
    : null;
  const budgetUsagePercentage =
    rawUsagePct !== null ? rawUsagePct.toFixed(2) : null;

  const budgetState = !hasPlannedBudget
    ? 'NO_BUDGET_SET'
    : isOverBudget
    ? 'OVER_BUDGET'
    : 'WITHIN_BUDGET';

  const budgetSummary = {
    currency,
    plannedBudget: minorUnitsToDecimal(plannedMinor),
    hasPlannedBudget,
    totalExpenses,
    remainingBudget,
    budgetUsagePercentage,
    budgetState,
    status: budgetState,
    isOverBudget,
    overBudgetAmount,
    expenseCount: expenses.length,
    itineraryEstimatedTotal: minorUnitsToDecimal(
      decimalToMinorUnits(itineraryEstimatedTotal, {
        allowZero: true,
        allowNegative: false,
      }) ?? 0n
    ),
  };

  // Category Breakdown (sorted highest spending first)
  const categoryTotalsMap = new Map();
  for (const exp of expenses) {
    const catId = exp.category || 'other';
    const current = categoryTotalsMap.get(catId) || {
      category: catId,
      label: getExpenseCategoryLabel(catId),
      minorTotal: 0n,
      expenseCount: 0,
    };
    const expMinor = decimalToMinorUnits(exp.amount, {
      allowZero: true,
      allowNegative: false,
    }) ?? 0n;
    current.minorTotal += expMinor;
    current.expenseCount += 1;
    categoryTotalsMap.set(catId, current);
  }

  const categoryBreakdown = Array.from(categoryTotalsMap.values())
    .sort((a, b) => {
      if (b.minorTotal > a.minorTotal) return 1;
      if (b.minorTotal < a.minorTotal) return -1;
      return a.label.localeCompare(b.label);
    })
    .map((entry) => {
      const totalStr = minorUnitsToDecimal(entry.minorTotal);
      const rawPct =
        totalExpensesMinor > 0n
          ? calculateMoneyPercentage(totalStr, totalExpenses)
          : 0;
      const pctFormatted =
        rawPct !== null && rawPct !== undefined
          ? Number(rawPct).toFixed(2)
          : '0.00';
      return {
        category: entry.category,
        label: entry.label,
        total: totalStr,
        totalAmount: totalStr,
        expenseCount: entry.expenseCount,
        percentage: pctFormatted,
        percentageOfTotal: pctFormatted,
      };
    });

  // Participant Balances & Group Settlement Summary
  const ledgerMap = new Map();

  for (const p of participants) {
    ledgerMap.set(p.userId, {
      userId: p.userId,
      displayName: p.displayName,
      email: p.email || null,
      tripRole: p.tripRole || 'member',
      isActive: p.isActive !== false,
      totalPaidMinor: 0n,
      totalShareMinor: 0n,
      pendingToPayMinor: 0n,
      pendingToReceiveMinor: 0n,
    });
  }

  const ensureLedgerEntry = (userId, fallbackName = 'Traveller') => {
    if (!ledgerMap.has(userId)) {
      ledgerMap.set(userId, {
        userId,
        displayName: fallbackName,
        email: null,
        tripRole: 'former_member',
        isActive: false,
        totalPaidMinor: 0n,
        totalShareMinor: 0n,
        pendingToPayMinor: 0n,
        pendingToReceiveMinor: 0n,
      });
    }
    return ledgerMap.get(userId);
  };

  let totalOutstandingMinor = 0n;
  let unsettledSplitCount = 0;
  let settledSplitCount = 0;
  const pairwiseDebtMap = new Map();

  for (const exp of expenses) {
    const expMinor = decimalToMinorUnits(exp.amount, {
      allowZero: true,
      allowNegative: false,
    }) ?? 0n;
    const payerEntry = ensureLedgerEntry(
      exp.paidByUserId,
      exp.paidByUserName || 'Traveller'
    );
    payerEntry.totalPaidMinor += expMinor;

    const splits = Array.isArray(exp.splits) ? exp.splits : [];
    for (const split of splits) {
      const shareMinor = decimalToMinorUnits(split.shareAmount, {
        allowZero: true,
        allowNegative: false,
      }) ?? 0n;
      const participantEntry = ensureLedgerEntry(
        split.userId,
        split.userName || 'Traveller'
      );
      participantEntry.totalShareMinor += shareMinor;

      const isPayerOwnShare = split.userId === exp.paidByUserId;
      if (isPayerOwnShare) {
        continue;
      }

      if (split.isSettled) {
        settledSplitCount += 1;
      } else {
        unsettledSplitCount += 1;
        totalOutstandingMinor += shareMinor;
        participantEntry.pendingToPayMinor += shareMinor;
        payerEntry.pendingToReceiveMinor += shareMinor;

        const pairKey = `${split.userId}->${exp.paidByUserId}`;
        const existingPair = pairwiseDebtMap.get(pairKey) || {
          fromUserId: split.userId,
          fromUserName: participantEntry.displayName,
          toUserId: exp.paidByUserId,
          toUserName: payerEntry.displayName,
          amountMinor: 0n,
        };
        existingPair.amountMinor += shareMinor;
        pairwiseDebtMap.set(pairKey, existingPair);
      }
    }
  }

  const participantBalances = Array.from(ledgerMap.values()).map((entry) => {
    const netMinor = entry.pendingToReceiveMinor - entry.pendingToPayMinor;
    let balanceStatus = 'SETTLED';
    if (netMinor > 0n) {
      balanceStatus = 'OWED';
    } else if (netMinor < 0n) {
      balanceStatus = 'OWES';
    } else if (entry.pendingToPayMinor > 0n || entry.pendingToReceiveMinor > 0n) {
      balanceStatus = 'OFFSETTING';
    }

    return {
      userId: entry.userId,
      displayName: entry.displayName,
      email: entry.email,
      tripRole: entry.tripRole,
      isActive: entry.isActive,
      totalPaid: minorUnitsToDecimal(entry.totalPaidMinor),
      totalShare: minorUnitsToDecimal(entry.totalShareMinor),
      pendingToPay: minorUnitsToDecimal(entry.pendingToPayMinor),
      pendingToReceive: minorUnitsToDecimal(entry.pendingToReceiveMinor),
      netOutstanding: minorUnitsToDecimal(netMinor),
      balanceStatus,
    };
  });

  const pairwiseDebts = Array.from(pairwiseDebtMap.values()).map((pair) => ({
    fromUserId: pair.fromUserId,
    fromUserName: pair.fromUserName,
    toUserId: pair.toUserId,
    toUserName: pair.toUserName,
    amount: minorUnitsToDecimal(pair.amountMinor),
  }));

  const settlementSummary = {
    totalOutstandingAmount: minorUnitsToDecimal(totalOutstandingMinor),
    unsettledSplitCount,
    settledSplitCount,
    isAllSettled: unsettledSplitCount === 0,
    pairwiseDebts,
  };

  return {
    budgetSummary,
    categoryBreakdown,
    participantBalances,
    settlementSummary,
  };
}

function assertParticipantMembership(
  activeParticipants,
  paidByUserId,
  splitShares = []
) {
  const activeParticipantIds = new Set(
    activeParticipants.map((p) => p.userId)
  );

  if (!activeParticipantIds.has(paidByUserId)) {
    const err = new Error(
      'Selected payer is not an active participant of this trip.'
    );
    err.status = 400;
    err.code = 'INVALID_EXPENSE_PAYER';
    throw err;
  }

  for (const share of splitShares) {
    if (!activeParticipantIds.has(share.userId)) {
      const err = new Error(
        `Split participant (${share.userId}) is not an active participant of this trip.`
      );
      err.status = 400;
      err.code = 'INVALID_EXPENSE_PARTICIPANT';
      throw err;
    }
  }
}

/**
 * Returns the full trip financial dashboard derived from PostgreSQL records.
 */
export async function getTripExpensesDashboard(trip, actorUserId) {
  const [participants, expenses, itineraryEstRes] = await Promise.all([
    listTripParticipants(trip.id),
    fetchHydratedExpensesForTrip(trip.id, actorUserId, trip.accessRole),
    query(
      `SELECT COALESCE(SUM(ii.estimated_cost), 0)::numeric(12,2)::text AS total_estimated
       FROM itinerary_items ii
       JOIN itinerary_days d ON d.id = ii.itinerary_day_id
       WHERE d.trip_id = $1`,
      [trip.id]
    ),
  ]);

  const itineraryEstimatedTotal =
    itineraryEstRes.rows[0]?.total_estimated || '0.00';

  const analytics = buildTripFinancialAnalytics({
    plannedBudget: trip.plannedBudget,
    currency: trip.currency,
    itineraryEstimatedTotal,
    participants,
    expenses,
  });

  return {
    trip: {
      id: trip.id,
      title: trip.title,
      destinationName: trip.destinationName,
      startDate: trip.startDate,
      endDate: trip.endDate,
      currency: trip.currency,
      plannedBudget: trip.plannedBudget,
      accessRole: trip.accessRole,
    },
    categories: EXPENSE_CATEGORIES,
    participants,
    ...analytics,
    expenses,
  };
}

/**
 * Creates a new expense and its split rows atomically inside a single PostgreSQL transaction.
 * Payer's own share (when included in split) is marked settled immediately with audit metadata.
 */
export async function createTripExpense(trip, actorUserId, validatedData) {
  return withTransaction(async (client) => {
    const queryFn = (text, params) => client.query(text, params);
    const activeParticipants = await listTripParticipants(trip.id, queryFn);

    assertParticipantMembership(
      activeParticipants,
      validatedData.paidByUserId,
      validatedData.split.shares
    );

    // Double-check exact share total against expense amount
    const shareSum = sumMoneyStrings(
      validatedData.split.shares.map((s) => s.shareAmount)
    );
    if (compareMoneyStrings(shareSum, validatedData.amount) !== 0) {
      const err = new Error(
        `Split share total (${shareSum}) must equal expense amount (${validatedData.amount}).`
      );
      err.status = 400;
      err.code = 'SPLIT_TOTAL_MISMATCH';
      throw err;
    }

    const insertExpenseRes = await client.query(
      `INSERT INTO expenses (
         trip_id,
         paid_by_user_id,
         created_by_user_id,
         title,
         amount,
         category,
         expense_date,
         notes,
         created_at,
         updated_at
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5::numeric(12,2),
         $6,
         $7::date,
         $8,
         NOW(),
         NOW()
       )
       RETURNING id`,
      [
        trip.id,
        validatedData.paidByUserId,
        actorUserId,
        validatedData.title,
        validatedData.amount,
        validatedData.category,
        validatedData.expenseDate,
        validatedData.notes ?? null,
      ]
    );

    const expenseId = insertExpenseRes.rows[0].id;

    for (const share of validatedData.split.shares) {
      const isPayerOwnShare = share.userId === validatedData.paidByUserId;
      await client.query(
        `INSERT INTO expense_splits (
           expense_id,
           user_id,
           share_amount,
           is_settled,
           settled_at,
           settled_by_user_id,
           created_at,
           updated_at
         )
         VALUES (
           $1,
           $2,
           $3::numeric(12,2),
           $4,
           CASE WHEN $4 THEN NOW() ELSE NULL END,
           $5,
           NOW(),
           NOW()
         )`,
        [
          expenseId,
          share.userId,
          share.shareAmount,
          isPayerOwnShare,
          isPayerOwnShare ? validatedData.paidByUserId : null,
        ]
      );
    }

    return fetchSingleHydratedExpense(
      trip.id,
      expenseId,
      actorUserId,
      trip.accessRole,
      queryFn
    );
  });
}

function hasFinancialAllocationChanged(
  existingExpenseRow,
  existingSplitRows,
  nextAmount,
  nextPaidByUserId,
  nextShares
) {
  if (compareMoneyStrings(existingExpenseRow.amount_text, nextAmount) !== 0) {
    return true;
  }
  if (existingExpenseRow.paid_by_user_id !== nextPaidByUserId) {
    return true;
  }
  if (!nextShares) {
    return false;
  }
  if (existingSplitRows.length !== nextShares.length) {
    return true;
  }

  const existingShareMap = new Map(
    existingSplitRows.map((row) => [row.user_id, row.share_amount_text])
  );

  for (const share of nextShares) {
    const prevAmount = existingShareMap.get(share.userId);
    if (!prevAmount || compareMoneyStrings(prevAmount, share.shareAmount) !== 0) {
      return true;
    }
  }

  return false;
}

/**
 * Updates an existing expense and (when changed) its split allocation inside a single transaction.
 * Only the trip owner or the original expense creator may edit.
 * Requires confirmSettlementReset=true (409 Conflict) if financial changes would reset settled non-payer shares.
 */
export async function updateTripExpense(
  trip,
  expenseId,
  actorUserId,
  validatedUpdates
) {
  if (!isValidUuid(expenseId)) {
    const err = new Error('Invalid expenseId parameter.');
    err.status = 400;
    throw err;
  }

  return withTransaction(async (client) => {
    const queryFn = (text, params) => client.query(text, params);

    const existingRes = await client.query(
      `SELECT
         id,
         trip_id,
         paid_by_user_id,
         created_by_user_id,
         title,
         amount::numeric(12,2)::text AS amount_text,
         category,
         TO_CHAR(expense_date, 'YYYY-MM-DD') AS expense_date,
         notes
       FROM expenses
       WHERE id = $1 AND trip_id = $2
       FOR UPDATE`,
      [expenseId, trip.id]
    );

    if (existingRes.rowCount === 0) {
      const err = new Error('Expense not found for this trip.');
      err.status = 404;
      throw err;
    }

    const existingExpense = existingRes.rows[0];
    const isOwner = trip.accessRole === 'owner';
    const isCreator = existingExpense.created_by_user_id === actorUserId;

    if (!isOwner && !isCreator) {
      const err = new Error(
        'Forbidden: Only the trip owner or the original expense creator can edit this expense.'
      );
      err.status = 403;
      err.code = 'FORBIDDEN_EXPENSE_EDIT';
      throw err;
    }

    const existingSplitsRes = await client.query(
      `SELECT
         s.id,
         s.user_id,
         u.full_name AS user_name,
         s.share_amount::numeric(12,2)::text AS share_amount_text,
         s.is_settled,
         s.settled_at,
         s.settled_by_user_id
       FROM expense_splits s
       JOIN users u ON u.id = s.user_id
       WHERE s.expense_id = $1
       ORDER BY s.created_at ASC, s.id ASC
       FOR UPDATE OF s`,
      [expenseId]
    );

    const existingSplits = existingSplitsRes.rows;
    const nextTitle = validatedUpdates.title ?? existingExpense.title;
    const nextAmount = validatedUpdates.amount ?? existingExpense.amount_text;
    const nextCategory = validatedUpdates.category ?? existingExpense.category;
    const nextExpenseDate =
      validatedUpdates.expenseDate ?? existingExpense.expense_date;
    const nextNotes = Object.prototype.hasOwnProperty.call(
      validatedUpdates,
      'notes'
    )
      ? validatedUpdates.notes
      : existingExpense.notes;
    const nextPaidByUserId =
      validatedUpdates.paidByUserId ?? existingExpense.paid_by_user_id;

    let nextShares = validatedUpdates.split ? validatedUpdates.split.shares : null;

    if (
      validatedUpdates.split &&
      validatedUpdates.split.mode === 'equal' &&
      !nextShares
    ) {
      try {
        nextShares = splitAmountEqually(
          nextAmount,
          validatedUpdates.split.participantIds
        );
      } catch (splitErr) {
        const err = new Error(
          splitErr.message || 'Unable to split expense amount equally.'
        );
        err.status = 400;
        throw err;
      }
    }

    if (
      !nextShares &&
      compareMoneyStrings(nextAmount, existingExpense.amount_text) !== 0
    ) {
      const err = new Error(
        'When updating the expense amount, an updated split allocation matching the new amount must also be provided.'
      );
      err.status = 400;
      throw err;
    }

    if (!nextShares) {
      nextShares = existingSplits.map((row) => ({
        userId: row.user_id,
        shareAmount: row.share_amount_text,
      }));
    }

    const activeParticipants = await listTripParticipants(trip.id, queryFn);
    assertParticipantMembership(
      activeParticipants,
      nextPaidByUserId,
      nextShares
    );

    const shareSum = sumMoneyStrings(nextShares.map((s) => s.shareAmount));
    if (compareMoneyStrings(shareSum, nextAmount) !== 0) {
      const err = new Error(
        `Split share total (${shareSum}) must equal expense amount (${nextAmount}).`
      );
      err.status = 400;
      err.code = 'SPLIT_TOTAL_MISMATCH';
      throw err;
    }

    const financialChanged = hasFinancialAllocationChanged(
      existingExpense,
      existingSplits,
      nextAmount,
      nextPaidByUserId,
      nextShares
    );

    if (financialChanged) {
      const settledNonPayerSplits = existingSplits.filter(
        (s) => s.user_id !== existingExpense.paid_by_user_id && s.is_settled
      );

      if (
        settledNonPayerSplits.length > 0 &&
        validatedUpdates.confirmSettlementReset !== true
      ) {
        const conflictErr = new Error(
          `Updating the amount, payer, or split allocation will reset ${settledNonPayerSplits.length} settled participant share(s). Please confirm settlement reset to proceed.`
        );
        conflictErr.status = 409;
        conflictErr.code = 'EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED';
        conflictErr.details = {
          expenseId,
          settledNonPayerSplitCount: settledNonPayerSplits.length,
          settledNonPayerShareCount: settledNonPayerSplits.length,
          settledSplits: settledNonPayerSplits.map((s) => ({
            splitId: s.id,
            userId: s.user_id,
            userName: s.user_name,
            shareAmount: s.share_amount_text,
            settledAt: s.settled_at,
          })),
        };
        throw conflictErr;
      }
    }

    await client.query(
      `UPDATE expenses
       SET title = $1,
           amount = $2::numeric(12,2),
           category = $3,
           expense_date = $4::date,
           notes = $5,
           paid_by_user_id = $6,
           updated_at = NOW()
       WHERE id = $7 AND trip_id = $8`,
      [
        nextTitle,
        nextAmount,
        nextCategory,
        nextExpenseDate,
        nextNotes ?? null,
        nextPaidByUserId,
        expenseId,
        trip.id,
      ]
    );

    if (financialChanged) {
      await client.query(`DELETE FROM expense_splits WHERE expense_id = $1`, [
        expenseId,
      ]);

      for (const share of nextShares) {
        const isPayerOwnShare = share.userId === nextPaidByUserId;
        await client.query(
          `INSERT INTO expense_splits (
             expense_id,
             user_id,
             share_amount,
             is_settled,
             settled_at,
             settled_by_user_id,
             created_at,
             updated_at
           )
           VALUES (
             $1,
             $2,
             $3::numeric(12,2),
             $4,
             CASE WHEN $4 THEN NOW() ELSE NULL END,
             $5,
             NOW(),
             NOW()
           )`,
          [
            expenseId,
            share.userId,
            share.shareAmount,
            isPayerOwnShare,
            isPayerOwnShare ? nextPaidByUserId : null,
          ]
        );
      }
    }

    return fetchSingleHydratedExpense(
      trip.id,
      expenseId,
      actorUserId,
      trip.accessRole,
      queryFn
    );
  });
}

/**
 * Deletes an expense (and cascades to expense_splits).
 * Only the trip owner or the original expense creator may delete.
 */
export async function deleteTripExpense(trip, expenseId, actorUserId) {
  if (!isValidUuid(expenseId)) {
    const err = new Error('Invalid expenseId parameter.');
    err.status = 400;
    throw err;
  }

  return withTransaction(async (client) => {
    const existingRes = await client.query(
      `SELECT id, trip_id, created_by_user_id
       FROM expenses
       WHERE id = $1 AND trip_id = $2
       FOR UPDATE`,
      [expenseId, trip.id]
    );

    if (existingRes.rowCount === 0) {
      const err = new Error('Expense not found for this trip.');
      err.status = 404;
      throw err;
    }

    const existingExpense = existingRes.rows[0];
    const isOwner = trip.accessRole === 'owner';
    const isCreator = existingExpense.created_by_user_id === actorUserId;

    if (!isOwner && !isCreator) {
      const err = new Error(
        'Forbidden: Only the trip owner or the original expense creator can delete this expense.'
      );
      err.status = 403;
      err.code = 'FORBIDDEN_EXPENSE_DELETE';
      throw err;
    }

    await client.query(`DELETE FROM expenses WHERE id = $1 AND trip_id = $2`, [
      expenseId,
      trip.id,
    ]);

    return { deletedExpenseId: expenseId };
  });
}

/**
 * Marks a split share as settled or unsettled with settlement audit timestamps.
 * Allowed actors (when role is owner/member):
 *  - Trip owner
 *  - Expense payer
 *  - The participant responsible for the split
 * Payer's own share cannot be marked unsettled.
 */
export async function updateExpenseSplitSettlement(
  trip,
  expenseId,
  splitId,
  actorUserId,
  isSettled
) {
  if (!isValidUuid(expenseId) || !isValidUuid(splitId)) {
    const err = new Error('Invalid expenseId or splitId parameter.');
    err.status = 400;
    throw err;
  }

  return withTransaction(async (client) => {
    const queryFn = (text, params) => client.query(text, params);

    const expenseRes = await client.query(
      `SELECT id, trip_id, paid_by_user_id
       FROM expenses
       WHERE id = $1 AND trip_id = $2
       FOR UPDATE`,
      [expenseId, trip.id]
    );

    if (expenseRes.rowCount === 0) {
      const err = new Error('Expense not found for this trip.');
      err.status = 404;
      throw err;
    }

    const expense = expenseRes.rows[0];

    const splitRes = await client.query(
      `SELECT id, expense_id, user_id, is_settled
       FROM expense_splits
       WHERE id = $1 AND expense_id = $2
       FOR UPDATE`,
      [splitId, expenseId]
    );

    if (splitRes.rowCount === 0) {
      const err = new Error('Expense split record not found for this expense.');
      err.status = 404;
      throw err;
    }

    const split = splitRes.rows[0];

    if (trip.accessRole !== 'owner' && trip.accessRole !== 'member') {
      const err = new Error(
        'Forbidden: Viewers cannot modify expense settlement records.'
      );
      err.status = 403;
      err.code = 'FORBIDDEN_SETTLEMENT_UPDATE';
      throw err;
    }

    const isOwner = trip.accessRole === 'owner';
    const isPayer = expense.paid_by_user_id === actorUserId;
    const isSplitParticipant = split.user_id === actorUserId;

    if (!isOwner && !isPayer && !isSplitParticipant) {
      const err = new Error(
        'Forbidden: Only the split participant, the expense payer, or the trip owner can update this settlement status.'
      );
      err.status = 403;
      err.code = 'FORBIDDEN_SETTLEMENT_UPDATE';
      throw err;
    }

    if (split.user_id === expense.paid_by_user_id && !isSettled) {
      const err = new Error(
        "The payer's own share is automatically covered by their payment and cannot be marked as pending/unsettled."
      );
      err.status = 400;
      err.code = 'PAYER_SHARE_ALREADY_COVERED';
      throw err;
    }

    if (isSettled) {
      await client.query(
        `UPDATE expense_splits
         SET is_settled = TRUE,
             settled_at = NOW(),
             settled_by_user_id = $1,
             updated_at = NOW()
         WHERE id = $2 AND expense_id = $3`,
        [actorUserId, splitId, expenseId]
      );
    } else {
      await client.query(
        `UPDATE expense_splits
         SET is_settled = FALSE,
             settled_at = NULL,
             settled_by_user_id = NULL,
             updated_at = NOW()
         WHERE id = $1 AND expense_id = $2`,
        [splitId, expenseId]
      );
    }

    const updatedExpense = await fetchSingleHydratedExpense(
      trip.id,
      expenseId,
      actorUserId,
      trip.accessRole,
      queryFn
    );
    const updatedSplit =
      updatedExpense?.splits.find((s) => s.id === splitId) || null;

    return {
      split: updatedSplit,
      expense: updatedExpense,
    };
  });
}
