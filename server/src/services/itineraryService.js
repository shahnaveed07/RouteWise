import { query, withTransaction } from '../config/db.js';
import {
  normalizeTimeString,
  sumDecimalStrings,
  timeToMinutes,
} from '../validators/itineraryValidator.js';

function formatDateOnly(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/**
 * Generates an inclusive list of YYYY-MM-DD calendar dates between startDate and endDate.
 * Uses UTC calendar arithmetic to avoid local timezone drift.
 */
export function generateDateRange(startDateStr, endDateStr) {
  const start = formatDateOnly(startDateStr);
  const end = formatDateOnly(endDateStr);
  if (!start || !end || end < start) {
    return [];
  }

  const [sYear, sMonth, sDay] = start.split('-').map(Number);
  const [eYear, eMonth, eDay] = end.split('-').map(Number);

  const cursor = new Date(Date.UTC(sYear, sMonth - 1, sDay));
  const last = new Date(Date.UTC(eYear, eMonth - 1, eDay));
  const dates = [];

  while (cursor <= last && dates.length <= 366) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function mapPlaceRow(row) {
  if (!row || !row.place_id) {
    return null;
  }
  const hasCoordinates =
    row.place_latitude !== null &&
    row.place_latitude !== undefined &&
    row.place_longitude !== null &&
    row.place_longitude !== undefined;

  return {
    id: row.place_id,
    provider: row.place_provider || null,
    providerPlaceId: row.place_provider_place_id || null,
    name: row.place_name,
    address: row.place_address || null,
    latitude: hasCoordinates ? Number(row.place_latitude) : null,
    longitude: hasCoordinates ? Number(row.place_longitude) : null,
    hasCoordinates,
  };
}

export function mapItineraryItemRow(row) {
  const place = mapPlaceRow(row);
  return {
    id: row.id,
    itineraryDayId: row.itinerary_day_id,
    placeId: row.place_id || null,
    title: row.title,
    description: row.description || null,
    startTime: normalizeTimeString(row.start_time),
    endTime: normalizeTimeString(row.end_time),
    estimatedCost:
      row.estimated_cost !== null && row.estimated_cost !== undefined
        ? String(row.estimated_cost)
        : '0.00',
    sortOrder: Number(row.sort_order),
    place,
    hasConfirmedLocation: Boolean(place && place.hasCoordinates),
  };
}

export function mapItineraryDayRow(row, items = [], tripRange = null) {
  const orderedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const estimatedCost = sumDecimalStrings(
    orderedItems.map((item) => item.estimatedCost)
  );
  const geocodedStopCount = orderedItems.filter(
    (item) => item.place && item.place.hasCoordinates
  ).length;
  const dayDate = formatDateOnly(row.day_date);
  const isOutsideTripRange = Boolean(
    tripRange &&
      tripRange.startDate &&
      tripRange.endDate &&
      dayDate &&
      (dayDate < tripRange.startDate || dayDate > tripRange.endDate)
  );

  return {
    id: row.id,
    tripId: row.trip_id,
    dayDate,
    dayOrder: Number(row.day_order),
    notes: row.notes || null,
    estimatedCost,
    itemCount: orderedItems.length,
    geocodedStopCount,
    isOutsideTripRange,
    items: orderedItems,
  };
}

/**
 * Upserts a place record into PostgreSQL `places` table inside an existing client or pool.
 */
export async function upsertPlace(placeData, dbClient = null) {
  if (!placeData) {
    return null;
  }

  const executor = dbClient ? dbClient.query.bind(dbClient) : query;
  const provider = placeData.provider || 'open-meteo-geocoding';
  const providerPlaceId = placeData.providerPlaceId || null;

  if (provider && providerPlaceId) {
    const result = await executor(
      `INSERT INTO places (
         provider,
         provider_place_id,
         name,
         address,
         latitude,
         longitude
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (provider, provider_place_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         address = COALESCE(EXCLUDED.address, places.address),
         latitude = COALESCE(EXCLUDED.latitude, places.latitude),
         longitude = COALESCE(EXCLUDED.longitude, places.longitude)
       RETURNING id`,
      [
        provider,
        providerPlaceId,
        placeData.name,
        placeData.address,
        placeData.latitude,
        placeData.longitude,
      ]
    );
    return result.rows[0].id;
  }

  const insertResult = await executor(
    `INSERT INTO places (
       provider,
       provider_place_id,
       name,
       address,
       latitude,
       longitude
     )
     VALUES ($1, NULL, $2, $3, $4, $5)
     RETURNING id`,
    [
      provider,
      placeData.name,
      placeData.address,
      placeData.latitude,
      placeData.longitude,
    ]
  );
  return insertResult.rows[0].id;
}

/**
 * Safely initializes or reconciles `itinerary_days` for every date from trip.startDate to trip.endDate.
 * - Inspects out-of-range days BEFORE modifying any day_order or deleting rows.
 * - Rejects with HTTP 409 (`ITINERARY_OUTSIDE_RANGE_HAS_DATA`) and rolls back if any out-of-range day
 *   contains scheduled activities or non-empty notes.
 * - Deletes only safely empty out-of-range days (neither activities nor notes).
 * - Preserves existing in-range days, notes, and attached itinerary_items, and renumbers 1..N.
 */
export async function initializeTripItinerary(trip) {
  const startDate = formatDateOnly(trip.startDate || trip.start_date);
  const endDate = formatDateOnly(trip.endDate || trip.end_date);
  const dateRange = generateDateRange(startDate, endDate);
  if (dateRange.length === 0) {
    const err = new Error('Trip date range is invalid for itinerary initialization.');
    err.status = 400;
    err.code = 'INVALID_TRIP_DATE_RANGE';
    throw err;
  }

  const dateRangeSet = new Set(dateRange);

  await withTransaction(async (client) => {
    // 1. Inspect all existing itinerary days for this trip BEFORE any day_order shift or deletion
    const existingDaysRes = await client.query(
      `SELECT
         d.id,
         d.day_date,
         d.day_order,
         d.notes,
         COUNT(i.id)::int AS item_count
       FROM itinerary_days d
       LEFT JOIN itinerary_items i ON i.itinerary_day_id = d.id
       WHERE d.trip_id = $1
       GROUP BY d.id, d.day_date, d.day_order, d.notes
       ORDER BY d.day_date ASC, d.id ASC`,
      [trip.id]
    );

    const outOfRangeDays = [];
    for (const row of existingDaysRes.rows) {
      const dayDateStr = formatDateOnly(row.day_date);
      if (!dateRangeSet.has(dayDateStr)) {
        const itemCount = Number(row.item_count) || 0;
        const hasNotes =
          typeof row.notes === 'string' && row.notes.trim().length > 0;
        outOfRangeDays.push({
          id: row.id,
          dayDate: dayDateStr,
          dayOrder: Number(row.day_order),
          itemCount,
          hasNotes,
          hasData: itemCount > 0 || hasNotes,
        });
      }
    }

    const conflictingDays = outOfRangeDays.filter((d) => d.hasData);
    if (conflictingDays.length > 0) {
      const affectedDatesList = conflictingDays.map((d) => d.dayDate).join(', ');
      const conflictErr = new Error(
        `Cannot synchronize itinerary days to ${startDate} – ${endDate} because ${conflictingDays.length} itinerary day(s) outside the updated trip dates (${affectedDatesList}) still contain scheduled activities or notes. All existing itinerary data has been preserved.`
      );
      conflictErr.status = 409;
      conflictErr.code = 'ITINERARY_OUTSIDE_RANGE_HAS_DATA';
      conflictErr.details = {
        tripId: trip.id,
        startDate,
        endDate,
        conflictingDayCount: conflictingDays.length,
        affectedDays: conflictingDays.map(({ hasData, ...safeDay }) => safeDay),
      };
      throw conflictErr;
    }

    const emptyOutOfRangeIds = outOfRangeDays.map((d) => d.id);
    if (emptyOutOfRangeIds.length > 0) {
      await client.query(
        `DELETE FROM itinerary_days
         WHERE trip_id = $1
           AND id = ANY($2::uuid[])`,
        [trip.id, emptyOutOfRangeIds]
      );
    }

    // 2. Shift remaining in-range day_order values to a positive temporary offset to avoid uq_itinerary_days_trip_order collisions
    await client.query(
      `UPDATE itinerary_days
       SET day_order = day_order + 100000
       WHERE trip_id = $1`,
      [trip.id]
    );

    // 3. Ensure every date in the trip range exists with temporarily offset order
    for (let idx = 0; idx < dateRange.length; idx += 1) {
      const dayDate = dateRange[idx];
      const tempOrder = 200000 + idx + 1;
      await client.query(
        `INSERT INTO itinerary_days (trip_id, day_date, day_order, notes)
         VALUES ($1, $2, $3, NULL)
         ON CONFLICT (trip_id, day_date)
         DO UPDATE SET
           day_order = EXCLUDED.day_order`,
        [trip.id, dayDate, tempOrder]
      );
    }

    // 4. Reassign contiguous 1..N day_order ordered strictly by day_date ASC
    const allDaysRes = await client.query(
      `SELECT id
       FROM itinerary_days
       WHERE trip_id = $1
       ORDER BY day_date ASC, id ASC`,
      [trip.id]
    );

    for (let idx = 0; idx < allDaysRes.rows.length; idx += 1) {
      await client.query(
        `UPDATE itinerary_days
         SET day_order = $1
         WHERE id = $2`,
        [idx + 1, allDaysRes.rows[idx].id]
      );
    }
  });

  return getTripItinerary(trip);
}

/**
 * Fetches complete trip itinerary including ordered days, items, places, and exact cost totals.
 */
export async function getTripItinerary(trip, accessRole = null) {
  const tripStartDate = formatDateOnly(trip.startDate || trip.start_date);
  const tripEndDate = formatDateOnly(trip.endDate || trip.end_date);
  const tripRange = {
    startDate: tripStartDate,
    endDate: tripEndDate,
  };

  const daysResult = await query(
    `SELECT
       id,
       trip_id,
       day_date,
       day_order,
       notes
     FROM itinerary_days
     WHERE trip_id = $1
     ORDER BY day_order ASC, day_date ASC`,
    [trip.id]
  );

  const itemsResult = await query(
    `SELECT
       i.id,
       i.itinerary_day_id,
       i.place_id,
       i.title,
       i.description,
       i.start_time,
       i.end_time,
       i.estimated_cost,
       i.sort_order,
       p.provider AS place_provider,
       p.provider_place_id AS place_provider_place_id,
       p.name AS place_name,
       p.address AS place_address,
       p.latitude AS place_latitude,
       p.longitude AS place_longitude
     FROM itinerary_items i
     INNER JOIN itinerary_days d ON d.id = i.itinerary_day_id
     LEFT JOIN places p ON p.id = i.place_id
     WHERE d.trip_id = $1
     ORDER BY d.day_order ASC, i.sort_order ASC, i.id ASC`,
    [trip.id]
  );

  const itemsByDayId = new Map();
  for (const row of itemsResult.rows) {
    const mapped = mapItineraryItemRow(row);
    const list = itemsByDayId.get(mapped.itineraryDayId) || [];
    list.push(mapped);
    itemsByDayId.set(mapped.itineraryDayId, list);
  }

  const days = daysResult.rows.map((dayRow) =>
    mapItineraryDayRow(dayRow, itemsByDayId.get(dayRow.id) || [], tripRange)
  );

  const totalEstimatedCost = sumDecimalStrings(
    days.map((day) => day.estimatedCost)
  );
  const totalItems = days.reduce((sum, day) => sum + day.itemCount, 0);

  const rawLat =
    trip.destinationLatitude !== undefined
      ? trip.destinationLatitude
      : trip.destination_latitude !== undefined
      ? trip.destination_latitude
      : trip.destination_lat;
  const rawLon =
    trip.destinationLongitude !== undefined
      ? trip.destinationLongitude
      : trip.destination_longitude !== undefined
      ? trip.destination_longitude
      : trip.destination_lon;

  return {
    trip: {
      id: trip.id,
      title: trip.title,
      destinationName: trip.destinationName || trip.destination_name,
      destinationLatitude:
        rawLat !== null && rawLat !== undefined ? Number(rawLat) : null,
      destinationLongitude:
        rawLon !== null && rawLon !== undefined ? Number(rawLon) : null,
      startDate: formatDateOnly(trip.startDate || trip.start_date),
      endDate: formatDateOnly(trip.endDate || trip.end_date),
      currency:
        typeof trip.currency === 'string' && trip.currency.trim()
          ? trip.currency.trim()
          : 'INR',
      plannedBudget:
        trip.plannedBudget !== undefined
          ? String(trip.plannedBudget)
          : trip.planned_budget !== undefined
          ? String(trip.planned_budget)
          : '0.00',
      accessRole: accessRole || trip.accessRole || trip.access_role || 'owner',
    },
    summary: {
      dayCount: days.length,
      totalItems,
      totalEstimatedCost,
      isInitialized: days.length > 0,
    },
    days,
  };
}

export async function getItineraryDayForTrip(tripId, dayId) {
  const result = await query(
    `SELECT
       id,
       trip_id,
       day_date,
       day_order,
       notes
     FROM itinerary_days
     WHERE id = $1 AND trip_id = $2
     LIMIT 1`,
    [dayId, tripId]
  );

  return result.rows[0] || null;
}

export async function updateItineraryDayNotes(tripId, dayId, notes) {
  const result = await query(
    `UPDATE itinerary_days
     SET notes = $1
     WHERE id = $2 AND trip_id = $3
     RETURNING
       id,
       trip_id,
       day_date,
       day_order,
       notes`,
    [notes, dayId, tripId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const items = await listDayItems(tripId, dayId);
  return mapItineraryDayRow(row, items);
}

export async function listDayItems(tripId, dayId) {
  const day = await getItineraryDayForTrip(tripId, dayId);
  if (!day) {
    return null;
  }

  const result = await query(
    `SELECT
       i.id,
       i.itinerary_day_id,
       i.place_id,
       i.title,
       i.description,
       i.start_time,
       i.end_time,
       i.estimated_cost,
       i.sort_order,
       p.provider AS place_provider,
       p.provider_place_id AS place_provider_place_id,
       p.name AS place_name,
       p.address AS place_address,
       p.latitude AS place_latitude,
       p.longitude AS place_longitude
     FROM itinerary_items i
     LEFT JOIN places p ON p.id = i.place_id
     WHERE i.itinerary_day_id = $1
     ORDER BY i.sort_order ASC, i.id ASC`,
    [dayId]
  );

  return result.rows.map(mapItineraryItemRow);
}

async function fetchSingleItemById(itemId, dbClient = null) {
  const executor = dbClient ? dbClient.query.bind(dbClient) : query;
  const result = await executor(
    `SELECT
       i.id,
       i.itinerary_day_id,
       i.place_id,
       i.title,
       i.description,
       i.start_time,
       i.end_time,
       i.estimated_cost,
       i.sort_order,
       p.provider AS place_provider,
       p.provider_place_id AS place_provider_place_id,
       p.name AS place_name,
       p.address AS place_address,
       p.latitude AS place_latitude,
       p.longitude AS place_longitude
     FROM itinerary_items i
     LEFT JOIN places p ON p.id = i.place_id
     WHERE i.id = $1
     LIMIT 1`,
    [itemId]
  );
  return result.rows[0] ? mapItineraryItemRow(result.rows[0]) : null;
}

export async function createItineraryItem(tripId, dayId, itemData) {
  const day = await getItineraryDayForTrip(tripId, dayId);
  if (!day) {
    return null;
  }

  return withTransaction(async (client) => {
    const placeId = itemData.place
      ? await upsertPlace(itemData.place, client)
      : null;

    const maxOrderResult = await client.query(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order
       FROM itinerary_items
       WHERE itinerary_day_id = $1`,
      [dayId]
    );
    const nextSortOrder = Number(maxOrderResult.rows[0].max_sort_order) + 1;

    const insertResult = await client.query(
      `INSERT INTO itinerary_items (
         itinerary_day_id,
         place_id,
         title,
         description,
         start_time,
         end_time,
         estimated_cost,
         sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        dayId,
        placeId,
        itemData.title,
        itemData.description,
        itemData.startTime,
        itemData.endTime,
        itemData.estimatedCost,
        nextSortOrder,
      ]
    );

    return fetchSingleItemById(insertResult.rows[0].id, client);
  });
}

export async function updateItineraryItem(tripId, dayId, itemId, updates) {
  const day = await getItineraryDayForTrip(tripId, dayId);
  if (!day) {
    return { status: 'DAY_NOT_FOUND', item: null };
  }

  return withTransaction(async (client) => {
    const existingRes = await client.query(
      `SELECT
         id,
         itinerary_day_id,
         place_id,
         title,
         description,
         start_time,
         end_time,
         estimated_cost,
         sort_order
       FROM itinerary_items
       WHERE id = $1 AND itinerary_day_id = $2
       LIMIT 1`,
      [itemId, dayId]
    );

    const existing = existingRes.rows[0];
    if (!existing) {
      return { status: 'ITEM_NOT_FOUND', item: null };
    }

    const nextTitle =
      updates.title !== undefined ? updates.title : existing.title;
    const nextDescription =
      updates.description !== undefined
        ? updates.description
        : existing.description;
    const nextStartTime =
      updates.startTime !== undefined
        ? updates.startTime
        : normalizeTimeString(existing.start_time);
    const nextEndTime =
      updates.endTime !== undefined
        ? updates.endTime
        : normalizeTimeString(existing.end_time);
    const nextEstimatedCost =
      updates.estimatedCost !== undefined
        ? updates.estimatedCost
        : String(existing.estimated_cost);

    if (nextStartTime && nextEndTime) {
      const startMins = timeToMinutes(nextStartTime);
      const endMins = timeToMinutes(nextEndTime);
      if (startMins !== null && endMins !== null && endMins <= startMins) {
        return {
          status: 'INVALID_TIME_RANGE',
          errors: ['endTime must be later than startTime.'],
          item: null,
        };
      }
    }

    let nextPlaceId = existing.place_id;
    if (Object.prototype.hasOwnProperty.call(updates, 'place')) {
      nextPlaceId = updates.place
        ? await upsertPlace(updates.place, client)
        : null;
    }

    await client.query(
      `UPDATE itinerary_items
       SET place_id = $1,
           title = $2,
           description = $3,
           start_time = $4,
           end_time = $5,
           estimated_cost = $6
       WHERE id = $7 AND itinerary_day_id = $8`,
      [
        nextPlaceId,
        nextTitle,
        nextDescription,
        nextStartTime,
        nextEndTime,
        nextEstimatedCost,
        itemId,
        dayId,
      ]
    );

    const updatedItem = await fetchSingleItemById(itemId, client);
    return { status: 'OK', item: updatedItem };
  });
}

export async function deleteItineraryItem(tripId, dayId, itemId) {
  const day = await getItineraryDayForTrip(tripId, dayId);
  if (!day) {
    return { status: 'DAY_NOT_FOUND' };
  }

  return withTransaction(async (client) => {
    const deleteRes = await client.query(
      `DELETE FROM itinerary_items
       WHERE id = $1 AND itinerary_day_id = $2
       RETURNING id`,
      [itemId, dayId]
    );

    if (deleteRes.rowCount === 0) {
      return { status: 'ITEM_NOT_FOUND' };
    }

    // Re-normalize remaining sort_order values to contiguous 1..N
    const remainingRes = await client.query(
      `SELECT id
       FROM itinerary_items
       WHERE itinerary_day_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [dayId]
    );

    if (remainingRes.rows.length > 0) {
      await client.query(
        `UPDATE itinerary_items
         SET sort_order = sort_order + 1000000
         WHERE itinerary_day_id = $1`,
        [dayId]
      );

      for (let idx = 0; idx < remainingRes.rows.length; idx += 1) {
        await client.query(
          `UPDATE itinerary_items
           SET sort_order = $1
           WHERE id = $2`,
          [idx + 1, remainingRes.rows[idx].id]
        );
      }
    }

    return { status: 'OK' };
  });
}

export async function reorderItineraryItems(tripId, dayId, orderedItemIds) {
  const day = await getItineraryDayForTrip(tripId, dayId);
  if (!day) {
    return { status: 'DAY_NOT_FOUND', items: null };
  }

  return withTransaction(async (client) => {
    const existingRes = await client.query(
      `SELECT id
       FROM itinerary_items
       WHERE itinerary_day_id = $1
       ORDER BY sort_order ASC`,
      [dayId]
    );

    const existingIds = existingRes.rows.map((r) => r.id.toLowerCase());
    const requestedIds = orderedItemIds.map((id) => id.toLowerCase());

    if (existingIds.length !== requestedIds.length) {
      return {
        status: 'MISMATCH',
        errors: [
          `Reorder list must include all ${existingIds.length} activities belonging to this day.`,
        ],
        items: null,
      };
    }

    const existingSet = new Set(existingIds);
    for (const reqId of requestedIds) {
      if (!existingSet.has(reqId)) {
        return {
          status: 'MISMATCH',
          errors: [
            'One or more activity IDs do not belong to the specified itinerary day.',
          ],
          items: null,
        };
      }
    }

    // Step 1: Offset all sort_order values positively to avoid unique constraint uq_itinerary_items_day_order
    await client.query(
      `UPDATE itinerary_items
       SET sort_order = sort_order + 1000000
       WHERE itinerary_day_id = $1`,
      [dayId]
    );

    // Step 2: Assign final contiguous sort_order 1..N
    for (let idx = 0; idx < orderedItemIds.length; idx += 1) {
      await client.query(
        `UPDATE itinerary_items
         SET sort_order = $1
         WHERE id = $2 AND itinerary_day_id = $3`,
        [idx + 1, orderedItemIds[idx], dayId]
      );
    }

    const itemsResult = await client.query(
      `SELECT
         i.id,
         i.itinerary_day_id,
         i.place_id,
         i.title,
         i.description,
         i.start_time,
         i.end_time,
         i.estimated_cost,
         i.sort_order,
         p.provider AS place_provider,
         p.provider_place_id AS place_provider_place_id,
         p.name AS place_name,
         p.address AS place_address,
         p.latitude AS place_latitude,
         p.longitude AS place_longitude
       FROM itinerary_items i
       LEFT JOIN places p ON p.id = i.place_id
       WHERE i.itinerary_day_id = $1
       ORDER BY i.sort_order ASC`,
      [dayId]
    );

    return {
      status: 'OK',
      items: itemsResult.rows.map(mapItineraryItemRow),
    };
  });
}
