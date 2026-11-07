import { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fixed server-side allowlist mapping validated camelCase payload keys to PostgreSQL column names.
 * Request keys are never interpolated directly into SQL.
 */
const ALLOWED_UPDATE_COLUMNS = Object.freeze({
  title: 'title',
  destinationName: 'destination_name',
  description: 'description',
  startDate: 'start_date',
  endDate: 'end_date',
  currency: 'currency',
  plannedBudget: 'planned_budget',
});

export function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function mapTripRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    title: row.title,
    destinationName: row.destinationName,
    description: row.description ?? null,
    startDate: row.startDate,
    endDate: row.endDate,
    currency: typeof row.currency === 'string' ? row.currency.trim() : 'INR',
    plannedBudget:
      typeof row.plannedBudget === 'string'
        ? row.plannedBudget
        : Number(row.plannedBudget ?? 0).toFixed(2),
    accessRole: row.accessRole || 'owner',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Lists all trips owned by `userId` OR shared with `userId` via an active `trip_members` record.
 * Uses `EXISTS` to guarantee duplicate-free results and orders newest updated first.
 */
export async function listTripsForUser(userId, queryFn = query) {
  const sql = `
    SELECT
      t.id,
      t.owner_user_id AS "ownerUserId",
      t.title,
      t.destination_name AS "destinationName",
      t.description,
      TO_CHAR(t.start_date, 'YYYY-MM-DD') AS "startDate",
      TO_CHAR(t.end_date, 'YYYY-MM-DD') AS "endDate",
      TRIM(t.currency) AS "currency",
      t.planned_budget::text AS "plannedBudget",
      t.created_at AS "createdAt",
      t.updated_at AS "updatedAt",
      CASE
        WHEN t.owner_user_id = $1 THEN 'owner'
        ELSE COALESCE(
          (
            SELECT tm.role
            FROM trip_members tm
            WHERE tm.trip_id = t.id
              AND tm.user_id = $1
              AND tm.membership_status = 'active'
            LIMIT 1
          ),
          'viewer'
        )
      END AS "accessRole"
    FROM trips t
    WHERE t.owner_user_id = $1
       OR EXISTS (
         SELECT 1
         FROM trip_members tm
         WHERE tm.trip_id = t.id
           AND tm.user_id = $1
           AND tm.membership_status = 'active'
       )
    ORDER BY t.updated_at DESC, t.created_at DESC;
  `;

  const result = await queryFn(sql, [userId]);
  return result.rows.map(mapTripRow);
}

/**
 * Creates a new trip owned by `ownerUserId` (derived strictly from `req.dbUser.id`).
 */
export async function createTrip(ownerUserId, tripData, queryFn = query) {
  const sql = `
    INSERT INTO trips (
      owner_user_id,
      title,
      destination_name,
      description,
      start_date,
      end_date,
      currency,
      planned_budget,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8::numeric(12,2), NOW(), NOW())
    RETURNING
      id,
      owner_user_id AS "ownerUserId",
      title,
      destination_name AS "destinationName",
      description,
      TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
      TO_CHAR(end_date, 'YYYY-MM-DD') AS "endDate",
      TRIM(currency) AS "currency",
      planned_budget::text AS "plannedBudget",
      'owner' AS "accessRole",
      created_at AS "createdAt",
      updated_at AS "updatedAt";
  `;

  const params = [
    ownerUserId,
    tripData.title,
    tripData.destinationName,
    tripData.description ?? null,
    tripData.startDate,
    tripData.endDate,
    tripData.currency,
    tripData.plannedBudget,
  ];

  const result = await queryFn(sql, params);
  return mapTripRow(result.rows[0]);
}

/**
 * Fetches a single trip if and only if `userId` is the owner or an active member/viewer.
 */
export async function getAccessibleTripById(tripId, userId, queryFn = query) {
  if (!isValidUuid(tripId) || !isValidUuid(userId)) {
    return null;
  }

  const sql = `
    SELECT
      t.id,
      t.owner_user_id AS "ownerUserId",
      t.title,
      t.destination_name AS "destinationName",
      t.description,
      TO_CHAR(t.start_date, 'YYYY-MM-DD') AS "startDate",
      TO_CHAR(t.end_date, 'YYYY-MM-DD') AS "endDate",
      TRIM(t.currency) AS "currency",
      t.planned_budget::text AS "plannedBudget",
      t.created_at AS "createdAt",
      t.updated_at AS "updatedAt",
      CASE
        WHEN t.owner_user_id = $2 THEN 'owner'
        ELSE (
          SELECT tm.role
          FROM trip_members tm
          WHERE tm.trip_id = t.id
            AND tm.user_id = $2
            AND tm.membership_status = 'active'
          LIMIT 1
        )
      END AS "accessRole"
    FROM trips t
    WHERE t.id = $1
      AND (
        t.owner_user_id = $2
        OR EXISTS (
          SELECT 1
          FROM trip_members tm
          WHERE tm.trip_id = t.id
            AND tm.user_id = $2
            AND tm.membership_status = 'active'
        )
      );
  `;

  const result = await queryFn(sql, [tripId.trim(), userId.trim()]);
  return mapTripRow(result.rows[0]);
}

/**
 * Updates allowed fields on a trip owned by `ownerUserId`.
 * Uses a fixed server-side column allowlist and parameterized SQL placeholders.
 */
export async function updateTripById(tripId, ownerUserId, updates, queryFn = query) {
  if (!isValidUuid(tripId) || !isValidUuid(ownerUserId)) {
    return null;
  }

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [fieldKey, columnName] of Object.entries(ALLOWED_UPDATE_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(updates, fieldKey)) {
      if (fieldKey === 'startDate' || fieldKey === 'endDate') {
        setClauses.push(`${columnName} = $${paramIndex}::date`);
      } else if (fieldKey === 'plannedBudget') {
        setClauses.push(`${columnName} = $${paramIndex}::numeric(12,2)`);
      } else {
        setClauses.push(`${columnName} = $${paramIndex}`);
      }
      values.push(updates[fieldKey]);
      paramIndex += 1;
    }
  }

  if (setClauses.length === 0) {
    return null;
  }

  setClauses.push('updated_at = NOW()');
  values.push(tripId.trim(), ownerUserId.trim());

  const tripIdParam = `$${paramIndex}`;
  const ownerIdParam = `$${paramIndex + 1}`;

  const sql = `
    UPDATE trips
    SET ${setClauses.join(', ')}
    WHERE id = ${tripIdParam}
      AND owner_user_id = ${ownerIdParam}
    RETURNING
      id,
      owner_user_id AS "ownerUserId",
      title,
      destination_name AS "destinationName",
      description,
      TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
      TO_CHAR(end_date, 'YYYY-MM-DD') AS "endDate",
      TRIM(currency) AS "currency",
      planned_budget::text AS "plannedBudget",
      'owner' AS "accessRole",
      created_at AS "createdAt",
      updated_at AS "updatedAt";
  `;

  const result = await queryFn(sql, values);
  return mapTripRow(result.rows[0]);
}

/**
 * Deletes a trip owned by `ownerUserId`.
 * Dependent records in `trip_members`, `itinerary_days`, `expenses`, etc. follow ON DELETE CASCADE.
 */
export async function deleteTripById(tripId, ownerUserId, queryFn = query) {
  if (!isValidUuid(tripId) || !isValidUuid(ownerUserId)) {
    return false;
  }

  const sql = `
    DELETE FROM trips
    WHERE id = $1
      AND owner_user_id = $2
    RETURNING id;
  `;

  const result = await queryFn(sql, [tripId.trim(), ownerUserId.trim()]);
  return result.rowCount > 0;
}
