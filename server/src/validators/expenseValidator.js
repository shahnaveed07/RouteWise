import { isValidUuid } from '../services/tripService.js';
import { isValidIsoCalendarDate } from './tripValidator.js';
import {
  compareMoneyStrings,
  splitAmountEqually,
  sumMoneyStrings,
  validateMoneyRange,
} from '../utils/moneyUtils.js';

/**
 * Server-side allowlist of RouteWise financial categories.
 * Prevents arbitrary category strings from being persisted in PostgreSQL.
 */
export const EXPENSE_CATEGORIES = Object.freeze([
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'transport', label: 'Transport' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'activities', label: 'Activities & Entertainment' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'tickets', label: 'Tickets & Entry Fees' },
  { id: 'other', label: 'Other' },
]);

const CATEGORY_MAP = new Map(
  EXPENSE_CATEGORIES.map((cat) => [cat.id, cat.label])
);

export function getExpenseCategoryLabel(categoryId) {
  if (typeof categoryId !== 'string') {
    return 'Other';
  }
  return CATEGORY_MAP.get(categoryId.trim().toLowerCase()) || 'Other';
}

export function normalizeExpenseCategory(rawCategory) {
  if (typeof rawCategory !== 'string') {
    return null;
  }
  const normalized = rawCategory.trim().toLowerCase();
  if (CATEGORY_MAP.has(normalized)) {
    return normalized;
  }
  for (const cat of EXPENSE_CATEGORIES) {
    if (cat.label.toLowerCase() === normalized) {
      return cat.id;
    }
  }
  return null;
}

/**
 * Validates the split allocation object (`{ mode: "equal" | "custom", participantIds?, participantUserIds?, shares? }`)
 * against the validated expense amount.
 * Accepts either (splitPayload, normalizedAmount) or (normalizedAmount, splitPayload).
 *
 * Returns { valid, errors, data: { mode, shares: [{ userId, shareAmount }], participantIds } }
 */
export function validateSplitAllocationInput(arg1, arg2) {
  const isFirstArgAmount = typeof arg1 === 'string' || typeof arg1 === 'number';
  const splitPayload = isFirstArgAmount ? arg2 : arg1;
  const normalizedAmount = isFirstArgAmount ? String(arg1).trim() : arg2;
  const errors = [];

  if (!splitPayload || typeof splitPayload !== 'object' || Array.isArray(splitPayload)) {
    return {
      valid: false,
      errors: ['split configuration object is required.'],
      data: null,
    };
  }

  const rawMode =
    typeof splitPayload.mode === 'string'
      ? splitPayload.mode.trim().toLowerCase()
      : '';

  if (rawMode !== 'equal' && rawMode !== 'custom') {
    return {
      valid: false,
      errors: ['split.mode must be either "equal" or "custom".'],
      data: null,
    };
  }

  if (rawMode === 'equal') {
    const rawParticipantIds = Array.isArray(splitPayload.participantIds)
      ? splitPayload.participantIds
      : Array.isArray(splitPayload.participantUserIds)
      ? splitPayload.participantUserIds
      : null;

    if (!rawParticipantIds || rawParticipantIds.length === 0) {
      return {
        valid: false,
        errors: ['split.participantIds must contain at least one participant UUID.'],
        data: null,
      };
    }

    const normalizedParticipantIds = [];
    const seen = new Set();

    for (const rawId of rawParticipantIds) {
      const trimmed = typeof rawId === 'string' ? rawId.trim() : '';
      if (!isValidUuid(trimmed)) {
        errors.push(`Invalid participant UUID in split.participantIds: ${String(rawId)}`);
        continue;
      }
      const lower = trimmed.toLowerCase();
      if (seen.has(lower)) {
        errors.push(`Duplicate participant UUID in split.participantIds: ${trimmed}`);
        continue;
      }
      seen.add(lower);
      normalizedParticipantIds.push(trimmed);
    }

    if (errors.length > 0) {
      return { valid: false, errors, data: null };
    }

    if (!normalizedAmount) {
      return {
        valid: true,
        errors: [],
        data: {
          mode: 'equal',
          participantIds: normalizedParticipantIds,
          shares: null,
          requiresAmountResolution: true,
        },
      };
    }

    try {
      const calculatedShares = splitAmountEqually(
        normalizedAmount,
        normalizedParticipantIds
      );
      return {
        valid: true,
        errors: [],
        data: {
          mode: 'equal',
          participantIds: normalizedParticipantIds,
          shares: calculatedShares,
        },
      };
    } catch (splitErr) {
      return {
        valid: false,
        errors: [splitErr.message || 'Unable to split expense amount equally.'],
        data: null,
      };
    }
  }

  // Custom split mode
  const rawShares = Array.isArray(splitPayload.shares) ? splitPayload.shares : null;
  if (!rawShares || rawShares.length === 0) {
    return {
      valid: false,
      errors: ['split.shares must contain at least one participant share.'],
      data: null,
    };
  }

  const normalizedShares = [];
  const normalizedParticipantIds = [];
  const seen = new Set();

  for (let idx = 0; idx < rawShares.length; idx += 1) {
    const entry = rawShares[idx];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`split.shares[${idx}] must be an object with userId and shareAmount.`);
      continue;
    }

    const rawUserId =
      entry.userId !== undefined ? entry.userId : entry.user_id;
    const trimmedUserId = typeof rawUserId === 'string' ? rawUserId.trim() : '';

    if (!isValidUuid(trimmedUserId)) {
      errors.push(`Invalid participant UUID in split.shares[${idx}].`);
    } else {
      const lower = trimmedUserId.toLowerCase();
      if (seen.has(lower)) {
        errors.push(`Duplicate participant UUID in split.shares: ${trimmedUserId}`);
      } else {
        seen.add(lower);
      }
    }

    const rawShareAmount =
      entry.shareAmount !== undefined ? entry.shareAmount : entry.share_amount;
    const shareCheck = validateMoneyRange(rawShareAmount, {
      allowZero: false,
      allowNegative: false,
      fieldName: `Share amount for participant #${idx + 1}`,
    });

    if (!shareCheck.valid) {
      errors.push(shareCheck.error);
    } else if (isValidUuid(trimmedUserId)) {
      normalizedShares.push({
        userId: trimmedUserId,
        shareAmount: shareCheck.normalized,
      });
      normalizedParticipantIds.push(trimmedUserId);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  if (normalizedAmount) {
    const totalCustomShares = sumMoneyStrings(
      normalizedShares.map((s) => s.shareAmount)
    );
    if (compareMoneyStrings(totalCustomShares, normalizedAmount) !== 0) {
      return {
        valid: false,
        errors: [
          `Custom split shares sum to ${totalCustomShares}, which does not equal the expense amount of ${normalizedAmount}.`,
        ],
        data: null,
      };
    }
  }

  return {
    valid: true,
    errors: [],
    data: {
      mode: 'custom',
      participantIds: normalizedParticipantIds,
      shares: normalizedShares,
    },
  };
}

/**
 * Validates payload for POST /api/trips/:tripId/expenses (partial=false)
 * and PATCH /api/trips/:tripId/expenses/:expenseId (partial=true).
 *
 * Strictly ignores any client-supplied createdByUserId / created_by_user_id.
 */
export function validateExpenseInput(
  payload = {},
  { partial = false, existingAmount = null } = {}
) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      errors: ['Request body must be a JSON object.'],
      data: null,
    };
  }

  const errors = [];
  const data = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'title')) {
    const rawTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
    if (!rawTitle) {
      errors.push('Expense title is required.');
    } else if (rawTitle.length > 180) {
      errors.push('Expense title must be between 1 and 180 characters.');
    } else {
      data.title = rawTitle;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'amount')) {
    const amountCheck = validateMoneyRange(payload.amount, {
      allowZero: false,
      allowNegative: false,
      fieldName: 'Expense amount',
    });
    if (!amountCheck.valid) {
      errors.push(amountCheck.error);
    } else {
      data.amount = amountCheck.normalized;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'category')) {
    const normalizedCategory = normalizeExpenseCategory(payload.category);
    if (!normalizedCategory) {
      const allowedList = EXPENSE_CATEGORIES.map((c) => c.id).join(', ');
      errors.push(
        `Invalid expense category. Allowed categories are: ${allowedList}.`
      );
    } else {
      data.category = normalizedCategory;
    }
  }

  const hasDateKey =
    Object.prototype.hasOwnProperty.call(payload, 'expenseDate') ||
    Object.prototype.hasOwnProperty.call(payload, 'expense_date');

  if (!partial || hasDateKey) {
    const rawDate =
      payload.expenseDate !== undefined
        ? payload.expenseDate
        : payload.expense_date;
    const trimmedDate = typeof rawDate === 'string' ? rawDate.trim() : '';
    if (!isValidIsoCalendarDate(trimmedDate)) {
      errors.push(
        'expenseDate must be a valid calendar date in YYYY-MM-DD format.'
      );
    } else {
      data.expenseDate = trimmedDate;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    if (payload.notes === null || payload.notes === undefined || payload.notes === '') {
      data.notes = null;
    } else if (typeof payload.notes !== 'string') {
      errors.push('notes must be a string or null.');
    } else {
      const trimmedNotes = payload.notes.trim();
      if (trimmedNotes.length > 5000) {
        errors.push('notes cannot exceed 5,000 characters.');
      } else {
        data.notes = trimmedNotes.length > 0 ? trimmedNotes : null;
      }
    }
  }

  const hasPayerKey =
    Object.prototype.hasOwnProperty.call(payload, 'paidByUserId') ||
    Object.prototype.hasOwnProperty.call(payload, 'paid_by_user_id');

  if (!partial || hasPayerKey) {
    const rawPayer =
      payload.paidByUserId !== undefined
        ? payload.paidByUserId
        : payload.paid_by_user_id;
    const trimmedPayer = typeof rawPayer === 'string' ? rawPayer.trim() : '';
    if (!isValidUuid(trimmedPayer)) {
      errors.push('paidByUserId must be a valid participant UUID.');
    } else {
      data.paidByUserId = trimmedPayer;
    }
  }

  const effectiveAmount = data.amount || existingAmount;

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'split')) {
    const splitValidation = validateSplitAllocationInput(
      payload.split,
      effectiveAmount
    );
    if (!splitValidation.valid) {
      errors.push(...splitValidation.errors);
    } else {
      data.split = splitValidation.data;
    }
  } else if (partial && data.amount && !Object.prototype.hasOwnProperty.call(payload, 'split')) {
    errors.push(
      'When updating the expense amount, an updated split allocation matching the new amount must also be provided.'
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'confirmSettlementReset')) {
    data.confirmSettlementReset = payload.confirmSettlementReset === true;
  } else {
    data.confirmSettlementReset = false;
  }

  if (partial && errors.length === 0) {
    const editableKeys = [
      'title',
      'amount',
      'category',
      'expenseDate',
      'notes',
      'paidByUserId',
      'split',
    ];
    const hasAnyField = editableKeys.some((key) =>
      Object.prototype.hasOwnProperty.call(data, key)
    );
    if (!hasAnyField) {
      errors.push(
        'At least one editable expense field (title, amount, category, expenseDate, notes, paidByUserId, split) must be provided.'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null,
  };
}

/**
 * Validates payload for PATCH /api/trips/:tripId/expenses/:expenseId/splits/:splitId/settlement.
 */
export function validateSettlementInput(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      errors: ['Request body must be a JSON object.'],
      data: null,
    };
  }

  const rawIsSettled =
    payload.isSettled !== undefined ? payload.isSettled : payload.is_settled;

  if (typeof rawIsSettled !== 'boolean') {
    return {
      valid: false,
      errors: ['isSettled must be a boolean (true or false).'],
      data: null,
    };
  }

  return {
    valid: true,
    errors: [],
    data: {
      isSettled: rawIsSettled,
    },
  };
}
