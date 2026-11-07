const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const DECIMAL_BUDGET_REGEX = /^\d{1,10}(\.\d{1,2})?$/;

/**
 * Checks that a string is a strict YYYY-MM-DD calendar date (e.g. rejects 2026-02-30).
 */
export function isValidIsoCalendarDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

/**
 * Validates and formats a non-negative NUMERIC(12,2) budget value as a 2-decimal string.
 * Avoids floating-point arithmetic by validating string digits directly.
 */
export function normalizePlannedBudget(rawBudget) {
  if (rawBudget === undefined || rawBudget === null || rawBudget === '') {
    return { valid: true, value: '0.00' };
  }

  let strValue;
  if (typeof rawBudget === 'number') {
    if (!Number.isFinite(rawBudget) || rawBudget < 0) {
      return {
        valid: false,
        error: 'plannedBudget must be a non-negative number up to 9999999999.99.',
      };
    }
    strValue = String(rawBudget);
  } else if (typeof rawBudget === 'string') {
    strValue = rawBudget.trim();
  } else {
    return {
      valid: false,
      error: 'plannedBudget must be a non-negative decimal number or string.',
    };
  }

  if (!DECIMAL_BUDGET_REGEX.test(strValue)) {
    return {
      valid: false,
      error:
        'plannedBudget must be a non-negative amount with at most 2 decimal places (max 9999999999.99).',
    };
  }

  const [intPart, decPart = ''] = strValue.split('.');
  const normalizedInt = intPart.replace(/^0+(?=\d)/, '');
  const paddedDec = (decPart + '00').slice(0, 2);
  return {
    valid: true,
    value: `${normalizedInt}.${paddedDec}`,
  };
}

/**
 * Validates a paired WGS84 coordinate set (destinationLatitude, destinationLongitude).
 * Either both must be null/omitted OR both must be finite numbers in [-90, 90] and [-180, 180].
 */
export function normalizeCoordinatePair(rawLat, rawLon) {
  const latEmpty = rawLat === undefined || rawLat === null || rawLat === '';
  const lonEmpty = rawLon === undefined || rawLon === null || rawLon === '';

  if (latEmpty && lonEmpty) {
    return {
      valid: true,
      destinationLatitude: null,
      destinationLongitude: null,
    };
  }

  if (latEmpty !== lonEmpty) {
    return {
      valid: false,
      error:
        'destinationLatitude and destinationLongitude must be provided together as a coordinate pair or both set to null.',
    };
  }

  const latNum = typeof rawLat === 'number' ? rawLat : Number(String(rawLat).trim());
  const lonNum = typeof rawLon === 'number' ? rawLon : Number(String(rawLon).trim());

  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
    return {
      valid: false,
      error: 'destinationLatitude must be a valid number between -90 and 90.',
    };
  }

  if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
    return {
      valid: false,
      error: 'destinationLongitude must be a valid number between -180 and 180.',
    };
  }

  return {
    valid: true,
    destinationLatitude: Number(latNum.toFixed(6)),
    destinationLongitude: Number(lonNum.toFixed(6)),
  };
}

/**
 * Validates payload for POST /api/trips.
 * Strictly ignores any client-supplied identity or audit fields (ownerUserId, id, etc.).
 */
export function validateCreateTripInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 1 || title.length > 150) {
    return {
      valid: false,
      error: 'title is required and must be between 1 and 150 characters.',
    };
  }

  const destinationName =
    typeof body.destinationName === 'string' ? body.destinationName.trim() : '';
  if (destinationName.length < 1 || destinationName.length > 180) {
    return {
      valid: false,
      error: 'destinationName is required and must be between 1 and 180 characters.',
    };
  }

  let description = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      return { valid: false, error: 'description must be a string or null.' };
    }
    const trimmedDesc = body.description.trim();
    if (trimmedDesc.length > 5000) {
      return {
        valid: false,
        error: 'description must not exceed 5,000 characters.',
      };
    }
    description = trimmedDesc.length > 0 ? trimmedDesc : null;
  }

  const startDate = typeof body.startDate === 'string' ? body.startDate.trim() : '';
  if (!isValidIsoCalendarDate(startDate)) {
    return {
      valid: false,
      error: 'startDate must be a valid calendar date in YYYY-MM-DD format.',
    };
  }

  const endDate = typeof body.endDate === 'string' ? body.endDate.trim() : '';
  if (!isValidIsoCalendarDate(endDate)) {
    return {
      valid: false,
      error: 'endDate must be a valid calendar date in YYYY-MM-DD format.',
    };
  }

  if (endDate < startDate) {
    return {
      valid: false,
      error: 'endDate must be on or after startDate.',
    };
  }

  let currency = 'INR';
  if (body.currency !== undefined && body.currency !== null && body.currency !== '') {
    if (typeof body.currency !== 'string' || !CURRENCY_REGEX.test(body.currency.trim())) {
      return {
        valid: false,
        error: 'currency must be a 3-letter uppercase ISO currency code (e.g. INR, USD, EUR).',
      };
    }
    currency = body.currency.trim();
  }

  const budgetCheck = normalizePlannedBudget(body.plannedBudget);
  if (!budgetCheck.valid) {
    return { valid: false, error: budgetCheck.error };
  }

  const coordsCheck = normalizeCoordinatePair(
    body.destinationLatitude,
    body.destinationLongitude
  );
  if (!coordsCheck.valid) {
    return { valid: false, error: coordsCheck.error };
  }

  return {
    valid: true,
    data: {
      title,
      destinationName,
      destinationLatitude: coordsCheck.destinationLatitude,
      destinationLongitude: coordsCheck.destinationLongitude,
      description,
      startDate,
      endDate,
      currency,
      plannedBudget: budgetCheck.value,
    },
  };
}

/**
 * Validates payload for PATCH /api/trips/:tripId against the existing trip record.
 * Enforces date range consistency and paired coordinate consistency.
 */
export function validateUpdateTripInput(body, existingTrip) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 1 || title.length > 150) {
      return {
        valid: false,
        error: 'title must be between 1 and 150 characters.',
      };
    }
    updates.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'destinationName')) {
    const destinationName =
      typeof body.destinationName === 'string' ? body.destinationName.trim() : '';
    if (destinationName.length < 1 || destinationName.length > 180) {
      return {
        valid: false,
        error: 'destinationName must be between 1 and 180 characters.',
      };
    }
    updates.destinationName = destinationName;
  }

  const hasLat = Object.prototype.hasOwnProperty.call(body, 'destinationLatitude');
  const hasLon = Object.prototype.hasOwnProperty.call(body, 'destinationLongitude');
  if (hasLat || hasLon) {
    if (hasLat !== hasLon) {
      return {
        valid: false,
        error:
          'destinationLatitude and destinationLongitude must be updated together as a coordinate pair.',
      };
    }
    const coordsCheck = normalizeCoordinatePair(
      body.destinationLatitude,
      body.destinationLongitude
    );
    if (!coordsCheck.valid) {
      return { valid: false, error: coordsCheck.error };
    }
    updates.destinationLatitude = coordsCheck.destinationLatitude;
    updates.destinationLongitude = coordsCheck.destinationLongitude;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    if (body.description === null) {
      updates.description = null;
    } else if (typeof body.description === 'string') {
      const trimmedDesc = body.description.trim();
      if (trimmedDesc.length > 5000) {
        return {
          valid: false,
          error: 'description must not exceed 5,000 characters.',
        };
      }
      updates.description = trimmedDesc.length > 0 ? trimmedDesc : null;
    } else {
      return { valid: false, error: 'description must be a string or null.' };
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'startDate')) {
    const startDate = typeof body.startDate === 'string' ? body.startDate.trim() : '';
    if (!isValidIsoCalendarDate(startDate)) {
      return {
        valid: false,
        error: 'startDate must be a valid calendar date in YYYY-MM-DD format.',
      };
    }
    updates.startDate = startDate;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'endDate')) {
    const endDate = typeof body.endDate === 'string' ? body.endDate.trim() : '';
    if (!isValidIsoCalendarDate(endDate)) {
      return {
        valid: false,
        error: 'endDate must be a valid calendar date in YYYY-MM-DD format.',
      };
    }
    updates.endDate = endDate;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'currency')) {
    if (typeof body.currency !== 'string' || !CURRENCY_REGEX.test(body.currency.trim())) {
      return {
        valid: false,
        error: 'currency must be a 3-letter uppercase ISO currency code (e.g. INR, USD, EUR).',
      };
    }
    updates.currency = body.currency.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'plannedBudget')) {
    if (body.plannedBudget === null || body.plannedBudget === '') {
      return {
        valid: false,
        error: 'plannedBudget must be a non-negative amount with at most 2 decimal places.',
      };
    }
    const budgetCheck = normalizePlannedBudget(body.plannedBudget);
    if (!budgetCheck.valid) {
      return { valid: false, error: budgetCheck.error };
    }
    updates.plannedBudget = budgetCheck.value;
  }

  if (Object.keys(updates).length === 0) {
    return {
      valid: false,
      error:
        'At least one editable trip field (title, destinationName, destinationLatitude/destinationLongitude, description, startDate, endDate, currency, plannedBudget) must be provided.',
    };
  }

  const effectiveStartDate = updates.startDate ?? existingTrip?.startDate;
  const effectiveEndDate = updates.endDate ?? existingTrip?.endDate;

  if (effectiveStartDate && effectiveEndDate && effectiveEndDate < effectiveStartDate) {
    return {
      valid: false,
      error: 'endDate must be on or after startDate.',
    };
  }

  return {
    valid: true,
    data: updates,
  };
}
