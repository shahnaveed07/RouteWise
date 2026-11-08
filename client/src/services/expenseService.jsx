import { apiRequest } from './apiClient.jsx';

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

export const MAX_MONEY_MINOR_UNITS = 999999999999n;
const UNSIGNED_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const SIGNED_DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

/**
 * Converts a decimal string into exact BigInt minor units (paise/cents).
 * Never uses floating-point arithmetic.
 */
export function decimalToMinorUnits(
  rawValue,
  { allowZero = true, allowNegative = false } = {}
) {
  if (
    rawValue === null ||
    rawValue === undefined ||
    typeof rawValue === 'boolean'
  ) {
    return null;
  }

  const str = String(rawValue).trim();
  if (!str) {
    return null;
  }

  const pattern = allowNegative
    ? SIGNED_DECIMAL_PATTERN
    : UNSIGNED_DECIMAL_PATTERN;
  if (!pattern.test(str)) {
    return null;
  }

  const isNegative = str.startsWith('-');
  const unsignedStr = isNegative ? str.slice(1) : str;
  const [wholePart, fracPart = ''] = unsignedStr.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);

  let magnitude;
  try {
    magnitude = BigInt(wholePart) * 100n + BigInt(paddedFrac);
  } catch (_err) {
    return null;
  }

  if (magnitude > MAX_MONEY_MINOR_UNITS) {
    return null;
  }

  if (magnitude === 0n) {
    return allowZero ? 0n : null;
  }

  if (isNegative && !allowNegative) {
    return null;
  }

  return isNegative ? -magnitude : magnitude;
}

export function minorUnitsToDecimal(minorUnits) {
  const bigVal =
    typeof minorUnits === 'bigint' ? minorUnits : BigInt(minorUnits);
  const isNegative = bigVal < 0n;
  const absVal = isNegative ? -bigVal : bigVal;
  const whole = absVal / 100n;
  const cents = absVal % 100n;
  const formatted = `${whole.toString()}.${cents.toString().padStart(2, '0')}`;
  return isNegative && absVal > 0n ? `-${formatted}` : formatted;
}

export function sumMoneyStrings(values = []) {
  let totalMinorUnits = 0n;
  for (const rawValue of values) {
    const minor = decimalToMinorUnits(rawValue, {
      allowZero: true,
      allowNegative: true,
    });
    if (minor !== null) {
      totalMinorUnits += minor;
    }
  }
  return minorUnitsToDecimal(totalMinorUnits);
}

export function subtractMoneyStrings(leftStr, rightStr) {
  const leftMinor =
    decimalToMinorUnits(leftStr, { allowZero: true, allowNegative: true }) ?? 0n;
  const rightMinor =
    decimalToMinorUnits(rightStr, { allowZero: true, allowNegative: true }) ??
    0n;
  return minorUnitsToDecimal(leftMinor - rightMinor);
}

export function compareMoneyStrings(leftStr, rightStr) {
  const leftMinor = decimalToMinorUnits(leftStr, {
    allowZero: true,
    allowNegative: true,
  });
  const rightMinor = decimalToMinorUnits(rightStr, {
    allowZero: true,
    allowNegative: true,
  });
  if (leftMinor === null || rightMinor === null) {
    return null;
  }
  if (leftMinor < rightMinor) return -1;
  if (leftMinor > rightMinor) return 1;
  return 0;
}

/**
 * Deterministic equal-split preview in the browser using exact BigInt minor units.
 */
export function splitAmountEquallyPreview(amountStr, participantIds = []) {
  const totalMinor = decimalToMinorUnits(amountStr, {
    allowZero: false,
    allowNegative: false,
  });
  if (
    totalMinor === null ||
    !Array.isArray(participantIds) ||
    participantIds.length === 0
  ) {
    return {
      valid: false,
      shares: [],
      error:
        totalMinor === null
          ? 'Enter a valid positive expense amount to preview equal shares.'
          : 'Select at least one participant to split this expense.',
    };
  }

  const countBig = BigInt(participantIds.length);
  if (totalMinor < countBig) {
    return {
      valid: false,
      shares: [],
      error: `Amount (${minorUnitsToDecimal(
        totalMinor
      )}) is too small to split among ${participantIds.length} participants.`,
    };
  }

  const baseShare = totalMinor / countBig;
  const remainder = totalMinor % countBig;

  const shares = participantIds.map((userId, index) => {
    const extra = BigInt(index) < remainder ? 1n : 0n;
    return {
      userId,
      shareAmount: minorUnitsToDecimal(baseShare + extra),
    };
  });

  return {
    valid: true,
    shares,
    error: null,
  };
}

export async function fetchTripExpenses(
  getAccessToken,
  tripId,
  { signal } = {}
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/expenses`,
    {
      method: 'GET',
      getAccessToken,
      signal,
    }
  );
  return response?.data || null;
}

export async function createTripExpenseRequest(
  getAccessToken,
  tripId,
  payload
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/expenses`,
    {
      method: 'POST',
      body: payload,
      getAccessToken,
    }
  );
  return response?.data || null;
}

export async function updateTripExpenseRequest(
  getAccessToken,
  tripId,
  expenseId,
  payload
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(
      expenseId
    )}`,
    {
      method: 'PATCH',
      body: payload,
      getAccessToken,
    }
  );
  return response?.data || null;
}

export async function deleteTripExpenseRequest(
  getAccessToken,
  tripId,
  expenseId
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(
      expenseId
    )}`,
    {
      method: 'DELETE',
      getAccessToken,
    }
  );
  return response?.data || null;
}

export async function updateExpenseSplitSettlementRequest(
  getAccessToken,
  tripId,
  expenseId,
  splitId,
  isSettled
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(
      expenseId
    )}/splits/${encodeURIComponent(splitId)}/settlement`,
    {
      method: 'PATCH',
      body: { isSettled },
      getAccessToken,
    }
  );
  return response?.data || null;
}
