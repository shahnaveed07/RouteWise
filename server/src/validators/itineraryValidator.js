import { isValidUuid } from '../services/tripService.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const DECIMAL_COST_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const ALLOWED_ROUTE_PROFILES = ['driving-car', 'foot-walking', 'cycling-regular'];

export function normalizeTimeString(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  const match = str.match(TIME_PATTERN);
  if (!match) {
    return null;
  }
  return `${match[1]}:${match[2]}`;
}

export function timeToMinutes(timeStr) {
  const normalized = normalizeTimeString(timeStr);
  if (!normalized) {
    return null;
  }
  const [hoursStr, minutesStr] = normalized.split(':');
  return Number(hoursStr) * 60 + Number(minutesStr);
}

/**
 * Sums an array of NUMERIC(12,2) decimal strings using exact BigInt minor-unit arithmetic.
 * Avoids floating-point rounding inaccuracies.
 */
export function sumDecimalStrings(values = []) {
  let totalMinorUnits = 0n;

  for (const rawValue of values) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }
    const str = String(rawValue).trim();
    if (!DECIMAL_COST_PATTERN.test(str)) {
      continue;
    }
    const [wholePart, fracPart = ''] = str.split('.');
    const paddedFrac = (fracPart + '00').slice(0, 2);
    const minorUnits = BigInt(wholePart) * 100n + BigInt(paddedFrac);
    totalMinorUnits += minorUnits;
  }

  const whole = totalMinorUnits / 100n;
  const cents = totalMinorUnits % 100n;
  return `${whole.toString()}.${cents.toString().padStart(2, '0')}`;
}

export function normalizeCostString(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '0.00';
  }
  const str = String(rawValue).trim();
  if (!DECIMAL_COST_PATTERN.test(str)) {
    return null;
  }
  const [wholePart, fracPart = ''] = str.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);
  const minorUnits = BigInt(wholePart) * 100n + BigInt(paddedFrac);
  if (minorUnits > 999999999999n) {
    return null;
  }
  const whole = minorUnits / 100n;
  const cents = minorUnits % 100n;
  return `${whole.toString()}.${cents.toString().padStart(2, '0')}`;
}

export function validateDayNotesInput(payload = {}) {
  const errors = [];
  if (!Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    errors.push('notes field is required.');
    return { valid: false, errors, data: null };
  }

  let normalizedNotes = null;
  if (payload.notes !== null && payload.notes !== undefined) {
    if (typeof payload.notes !== 'string') {
      errors.push('notes must be a string or null.');
    } else {
      const trimmed = payload.notes.trim();
      if (trimmed.length > 5000) {
        errors.push('notes cannot exceed 5000 characters.');
      } else {
        normalizedNotes = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      notes: normalizedNotes,
    },
  };
}

export function validatePlaceInput(placePayload) {
  if (placePayload === null || placePayload === undefined) {
    return { valid: true, errors: [], data: null };
  }

  if (typeof placePayload !== 'object' || Array.isArray(placePayload)) {
    return {
      valid: false,
      errors: ['place must be an object or null.'],
      data: null,
    };
  }

  const errors = [];
  const rawName = typeof placePayload.name === 'string' ? placePayload.name.trim() : '';
  if (!rawName) {
    errors.push('place.name is required when a place is provided.');
  } else if (rawName.length > 180) {
    errors.push('place.name must be 180 characters or fewer.');
  }

  const rawProvider =
    typeof placePayload.provider === 'string' && placePayload.provider.trim()
      ? placePayload.provider.trim()
      : 'open-meteo-geocoding';

  if (rawProvider.length > 40) {
    errors.push('place.provider must be 40 characters or fewer.');
  }

  const rawProviderPlaceId =
    placePayload.providerPlaceId !== undefined && placePayload.providerPlaceId !== null
      ? String(placePayload.providerPlaceId).trim()
      : placePayload.provider_place_id !== undefined && placePayload.provider_place_id !== null
      ? String(placePayload.provider_place_id).trim()
      : null;

  if (rawProviderPlaceId && rawProviderPlaceId.length > 180) {
    errors.push('place.providerPlaceId must be 180 characters or fewer.');
  }

  const rawAddress =
    typeof placePayload.address === 'string' && placePayload.address.trim()
      ? placePayload.address.trim()
      : null;

  if (rawAddress && rawAddress.length > 1000) {
    errors.push('place.address must be 1000 characters or fewer.');
  }

  const hasLat =
    placePayload.latitude !== undefined &&
    placePayload.latitude !== null &&
    placePayload.latitude !== '';
  const hasLon =
    placePayload.longitude !== undefined &&
    placePayload.longitude !== null &&
    placePayload.longitude !== '';

  let latitude = null;
  let longitude = null;

  if (hasLat !== hasLon) {
    errors.push('place.latitude and place.longitude must both be provided together.');
  } else if (hasLat && hasLon) {
    const parsedLat = Number(placePayload.latitude);
    const parsedLon = Number(placePayload.longitude);

    if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      errors.push('place.latitude must be a valid number between -90 and 90.');
    } else {
      latitude = Number(parsedLat.toFixed(6));
    }

    if (!Number.isFinite(parsedLon) || parsedLon < -180 || parsedLon > 180) {
      errors.push('place.longitude must be a valid number between -180 and 180.');
    } else {
      longitude = Number(parsedLon.toFixed(6));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data:
      errors.length === 0
        ? {
            provider: rawProvider,
            providerPlaceId: rawProviderPlaceId || null,
            name: rawName,
            address: rawAddress,
            latitude,
            longitude,
          }
        : null,
  };
}

export function validateActivityInput(payload = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'title')) {
    const rawTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
    if (!rawTitle) {
      errors.push('Activity title is required.');
    } else if (rawTitle.length > 180) {
      errors.push('Activity title must be between 1 and 180 characters.');
    } else {
      data.title = rawTitle;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'description')) {
    if (payload.description === null || payload.description === undefined || payload.description === '') {
      data.description = null;
    } else if (typeof payload.description !== 'string') {
      errors.push('Activity description must be a string.');
    } else {
      const trimmedDesc = payload.description.trim();
      if (trimmedDesc.length > 5000) {
        errors.push('Activity description cannot exceed 5000 characters.');
      } else {
        data.description = trimmedDesc.length > 0 ? trimmedDesc : null;
      }
    }
  }

  const hasStartTimeKey =
    Object.prototype.hasOwnProperty.call(payload, 'startTime') ||
    Object.prototype.hasOwnProperty.call(payload, 'start_time');
  const hasEndTimeKey =
    Object.prototype.hasOwnProperty.call(payload, 'endTime') ||
    Object.prototype.hasOwnProperty.call(payload, 'end_time');

  if (!partial || hasStartTimeKey) {
    const rawStart =
      payload.startTime !== undefined ? payload.startTime : payload.start_time;
    if (rawStart === null || rawStart === undefined || rawStart === '') {
      data.startTime = null;
    } else {
      const normalizedStart = normalizeTimeString(rawStart);
      if (!normalizedStart) {
        errors.push('startTime must be a valid 24-hour time in HH:MM format.');
      } else {
        data.startTime = normalizedStart;
      }
    }
  }

  if (!partial || hasEndTimeKey) {
    const rawEnd = payload.endTime !== undefined ? payload.endTime : payload.end_time;
    if (rawEnd === null || rawEnd === undefined || rawEnd === '') {
      data.endTime = null;
    } else {
      const normalizedEnd = normalizeTimeString(rawEnd);
      if (!normalizedEnd) {
        errors.push('endTime must be a valid 24-hour time in HH:MM format.');
      } else {
        data.endTime = normalizedEnd;
      }
    }
  }

  if (data.startTime && data.endTime) {
    const startMins = timeToMinutes(data.startTime);
    const endMins = timeToMinutes(data.endTime);
    if (startMins !== null && endMins !== null && endMins <= startMins) {
      errors.push('endTime must be later than startTime.');
    }
  }

  const hasCostKey =
    Object.prototype.hasOwnProperty.call(payload, 'estimatedCost') ||
    Object.prototype.hasOwnProperty.call(payload, 'estimated_cost');

  if (!partial || hasCostKey) {
    const rawCost =
      payload.estimatedCost !== undefined ? payload.estimatedCost : payload.estimated_cost;
    const normalizedCost = normalizeCostString(rawCost);
    if (normalizedCost === null) {
      errors.push('estimatedCost must be a non-negative amount with up to 2 decimal places.');
    } else {
      data.estimatedCost = normalizedCost;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'place')) {
    if (payload.place === undefined) {
      if (!partial) {
        data.place = null;
      }
    } else {
      const placeValidation = validatePlaceInput(payload.place);
      if (!placeValidation.valid) {
        errors.push(...placeValidation.errors);
      } else {
        data.place = placeValidation.data;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data,
  };
}

export function validateReorderItemsInput(payload = {}) {
  const errors = [];
  const rawIds = Array.isArray(payload.itemIds)
    ? payload.itemIds
    : Array.isArray(payload.orderedItemIds)
    ? payload.orderedItemIds
    : null;

  if (!rawIds) {
    errors.push('itemIds must be an array of itinerary item UUIDs.');
    return { valid: false, errors, data: null };
  }

  if (rawIds.length === 0) {
    errors.push('itemIds array cannot be empty.');
    return { valid: false, errors, data: null };
  }

  const normalizedIds = [];
  const seen = new Set();

  for (const id of rawIds) {
    const trimmed = typeof id === 'string' ? id.trim() : '';
    if (!isValidUuid(trimmed)) {
      errors.push(`Invalid itinerary item UUID: ${String(id)}`);
      continue;
    }
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) {
      errors.push(`Duplicate itinerary item UUID in reorder list: ${trimmed}`);
      continue;
    }
    seen.add(lower);
    normalizedIds.push(trimmed);
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      itemIds: normalizedIds,
    },
  };
}

export function validateRouteRequestInput(payload = {}) {
  const errors = [];
  const rawProfile =
    typeof payload.profile === 'string' && payload.profile.trim()
      ? payload.profile.trim()
      : 'driving-car';

  if (!ALLOWED_ROUTE_PROFILES.includes(rawProfile)) {
    errors.push(
      `profile must be one of: ${ALLOWED_ROUTE_PROFILES.join(', ')}.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      profile: rawProfile,
    },
  };
}
