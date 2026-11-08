/**
 * Exact BigInt Minor-Unit (Paise / Cents) Financial Utility for RouteWise.
 *
 * PostgreSQL NUMERIC(12,2) stores up to 10 digits before the decimal point and 2 after:
 * Maximum supported positive value: "9999999999.99" (999_999_999_999n minor units).
 * Never uses IEEE-754 floating-point arithmetic for monetary aggregation or split allocation.
 */

export const MAX_MONEY_MINOR_UNITS = 999999999999n;
export const MAX_MONEY_DECIMAL_STRING = '9999999999.99';

const UNSIGNED_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const SIGNED_DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

/**
 * Converts a decimal string (or integer/string representation with at most 2 decimals)
 * into exact BigInt minor units (paise/cents).
 * Returns null if the input is malformed, out of NUMERIC(12,2) range, or violates sign rules.
 */
export function decimalToMinorUnits(
  rawValue,
  { allowZero = true, allowNegative = false } = {}
) {
  if (rawValue === null || rawValue === undefined || typeof rawValue === 'boolean') {
    return null;
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue)) {
      return null;
    }
  }

  const str = String(rawValue).trim();
  if (!str) {
    return null;
  }

  const pattern = allowNegative ? SIGNED_DECIMAL_PATTERN : UNSIGNED_DECIMAL_PATTERN;
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

/**
 * Converts an exact BigInt minor-unit value back into a canonical "0.00" (or "-0.00") decimal string.
 */
export function minorUnitsToDecimal(minorUnits) {
  const bigVal = typeof minorUnits === 'bigint' ? minorUnits : BigInt(minorUnits);
  const isNegative = bigVal < 0n;
  const absVal = isNegative ? -bigVal : bigVal;
  const whole = absVal / 100n;
  const cents = absVal % 100n;
  const formatted = `${whole.toString()}.${cents.toString().padStart(2, '0')}`;
  return isNegative && absVal > 0n ? `-${formatted}` : formatted;
}

/**
 * Validates and normalizes a money input into a canonical NUMERIC(12,2) string.
 * Returns null when invalid.
 */
export function normalizeMoneyString(
  rawValue,
  { allowZero = false, allowNegative = false } = {}
) {
  const minor = decimalToMinorUnits(rawValue, { allowZero, allowNegative });
  if (minor === null) {
    return null;
  }
  return minorUnitsToDecimal(minor);
}

/**
 * Detailed validation helper returning { valid, minorUnits, normalized, error }.
 */
export function validateMoneyRange(
  rawValue,
  { allowZero = false, allowNegative = false, fieldName = 'Amount' } = {}
) {
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    return {
      valid: false,
      minorUnits: null,
      normalized: null,
      error: `${fieldName} is required.`,
    };
  }

  const str = String(rawValue).trim();
  if (str.startsWith('-') && !allowNegative) {
    return {
      valid: false,
      minorUnits: null,
      normalized: null,
      error: `${fieldName} must be a positive amount and cannot be negative.`,
    };
  }

  const pattern = allowNegative ? SIGNED_DECIMAL_PATTERN : UNSIGNED_DECIMAL_PATTERN;
  if (!pattern.test(str)) {
    return {
      valid: false,
      minorUnits: null,
      normalized: null,
      error: `${fieldName} must be a valid decimal number with at most 2 decimal places.`,
    };
  }

  const isNegative = str.startsWith('-');
  const unsignedStr = isNegative ? str.slice(1) : str;
  const [wholePart, fracPart = ''] = unsignedStr.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);

  let magnitude;
  try {
    magnitude = BigInt(wholePart) * 100n + BigInt(paddedFrac);
  } catch (_err) {
    return {
      valid: false,
      minorUnits: null,
      normalized: null,
      error: `${fieldName} is invalid.`,
    };
  }

  if (magnitude > MAX_MONEY_MINOR_UNITS) {
    return {
      valid: false,
      minorUnits: null,
      normalized: null,
      error: `${fieldName} cannot exceed ${MAX_MONEY_DECIMAL_STRING}.`,
    };
  }

  if (magnitude === 0n && !allowZero) {
    return {
      valid: false,
      minorUnits: null,
      normalized: null,
      error: `${fieldName} must be greater than 0.00.`,
    };
  }

  const signedMinor = isNegative ? -magnitude : magnitude;
  return {
    valid: true,
    minorUnits: signedMinor,
    normalized: minorUnitsToDecimal(signedMinor),
    error: null,
  };
}

/**
 * Sums an array of decimal strings using exact BigInt minor units.
 * Throws if any non-empty element is malformed unless ignoreInvalid is true.
 */
export function sumMoneyStrings(values = [], { ignoreInvalid = false } = {}) {
  let totalMinorUnits = 0n;

  for (const rawValue of values) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }
    const minor = decimalToMinorUnits(rawValue, {
      allowZero: true,
      allowNegative: true,
    });
    if (minor === null) {
      if (ignoreInvalid) {
        continue;
      }
      throw new Error(`Invalid monetary value in sumMoneyStrings: ${String(rawValue)}`);
    }
    totalMinorUnits += minor;
  }

  return minorUnitsToDecimal(totalMinorUnits);
}

/**
 * Subtracts rightStr from leftStr (left - right) using exact BigInt minor units.
 */
export function subtractMoneyStrings(leftStr, rightStr) {
  const leftMinor = decimalToMinorUnits(leftStr ?? '0.00', {
    allowZero: true,
    allowNegative: true,
  });
  const rightMinor = decimalToMinorUnits(rightStr ?? '0.00', {
    allowZero: true,
    allowNegative: true,
  });

  if (leftMinor === null || rightMinor === null) {
    throw new Error('Invalid monetary operands in subtractMoneyStrings.');
  }

  return minorUnitsToDecimal(leftMinor - rightMinor);
}

/**
 * Compares two decimal strings using exact BigInt minor units.
 * Returns -1 if left < right, 0 if left === right, 1 if left > right.
 */
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
    throw new Error('Invalid monetary operands in compareMoneyStrings.');
  }

  if (leftMinor < rightMinor) return -1;
  if (leftMinor > rightMinor) return 1;
  return 0;
}

/**
 * Deterministically splits a positive expense amount equally across ordered participantIds.
 *
 * Example: "100.00" across [u1, u2, u3] ->
 *   [
 *     { userId: u1, shareAmount: "33.34" },
 *     { userId: u2, shareAmount: "33.33" },
 *     { userId: u3, shareAmount: "33.33" }
 *   ]
 *
 * Rejects if totalMinorUnits < participantCount (which would produce a 0.00 share).
 */
export function splitAmountEqually(amountStr, participantIds = []) {
  const rangeCheck = validateMoneyRange(amountStr, {
    allowZero: false,
    allowNegative: false,
    fieldName: 'Expense amount',
  });
  if (!rangeCheck.valid) {
    throw new Error(rangeCheck.error);
  }

  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new Error('At least one split participant is required.');
  }

  const countBig = BigInt(participantIds.length);
  const totalMinor = rangeCheck.minorUnits;

  if (totalMinor < countBig) {
    throw new Error(
      `Expense amount (${rangeCheck.normalized}) is too small to split among ${participantIds.length} participants with positive shares.`
    );
  }

  const baseShare = totalMinor / countBig;
  const remainder = totalMinor % countBig;

  return participantIds.map((userId, index) => {
    const extraUnit = BigInt(index) < remainder ? 1n : 0n;
    const shareMinor = baseShare + extraUnit;
    return {
      userId,
      shareAmount: minorUnitsToDecimal(shareMinor),
    };
  });
}

/**
 * Computes percentage (part / whole * 100) rounded to 2 decimal places using BigInt integer scaling.
 * Returns null if whole <= 0.
 */
export function calculateMoneyPercentage(partStr, wholeStr) {
  const partMinor = decimalToMinorUnits(partStr ?? '0.00', {
    allowZero: true,
    allowNegative: false,
  });
  const wholeMinor = decimalToMinorUnits(wholeStr ?? '0.00', {
    allowZero: true,
    allowNegative: false,
  });

  if (partMinor === null || wholeMinor === null || wholeMinor <= 0n) {
    return null;
  }

  // Scale by 10000 (100% * 100 for 2 decimal places) with half-up rounding
  const scaledBasisPoints =
    (partMinor * 10000n + wholeMinor / 2n) / wholeMinor;
  return Number(scaledBasisPoints) / 100;
}
