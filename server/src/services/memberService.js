import { query, withTransaction } from '../config/db.js';
import { isValidUuid } from './tripService.js';

function createHttpError(status, message, code, details) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  if (code) err.code = code;
  if (details) err.details = details;
  return err;
}

/**
 * Lists the trip owner and all active members (`membership_status = 'active'`) for a trip.
 * The trip owner is always resolved from `trips.owner_user_id` and never duplicated from `trip_members`.
 */
export async function listTripMembers(tripId, queryFn = query) {
  if (!isValidUuid(tripId)) {
    throw createHttpError(400, 'Invalid tripId parameter.', 'INVALID_TRIP_ID');
  }

  const ownerRes = await queryFn(
    `SELECT
       t.id AS trip_id,
       t.title AS trip_title,
       t.destination_name AS trip_destination,
       t.created_at AS trip_created_at,
       u.id AS user_id,
       u.full_name,
       u.email
     FROM trips t
     JOIN users u ON u.id = t.owner_user_id
     WHERE t.id = $1`,
    [tripId.trim()]
  );

  if (ownerRes.rowCount === 0) {
    throw createHttpError(404, 'Trip not found.', 'TRIP_NOT_FOUND');
  }

  const ownerRow = ownerRes.rows[0];
  const owner = {
    id: null,
    userId: ownerRow.user_id,
    fullName: ownerRow.full_name,
    email: ownerRow.email,
    role: 'owner',
    membershipStatus: 'active',
    joinedAt: ownerRow.trip_created_at,
    isOwner: true,
  };

  const membersRes = await queryFn(
    `SELECT
       tm.id,
       tm.trip_id,
       tm.user_id,
       tm.role,
       tm.membership_status,
       tm.joined_at,
       u.full_name,
       u.email
     FROM trip_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.trip_id = $1
       AND tm.membership_status = 'active'
       AND tm.user_id <> $2
     ORDER BY
       CASE WHEN tm.role = 'member' THEN 1 ELSE 2 END ASC,
       u.full_name ASC,
       tm.joined_at ASC`,
    [tripId.trim(), ownerRow.user_id]
  );

  const members = membersRes.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    membershipStatus: row.membership_status,
    joinedAt: row.joined_at,
    isOwner: false,
  }));

  return {
    owner,
    members,
    allMembers: [owner, ...members],
  };
}

/**
 * Changes an active member's role between 'member' and 'viewer'.
 * Only the trip owner is authorized to call this service.
 * The trip owner cannot be demoted or modified.
 */
export async function updateTripMemberRole(trip, targetUserId, newRole) {
  if (!isValidUuid(targetUserId)) {
    throw createHttpError(400, 'Invalid member userId parameter.', 'INVALID_USER_ID');
  }

  const normalizedTargetUserId = targetUserId.trim();
  if (normalizedTargetUserId === trip.ownerUserId) {
    throw createHttpError(
      400,
      'The trip owner cannot be demoted or assigned a member/viewer role.',
      'CANNOT_MODIFY_TRIP_OWNER'
    );
  }

  return withTransaction(async (client) => {
    const existingRes = await client.query(
      `SELECT
         tm.id,
         tm.trip_id,
         tm.user_id,
         tm.role,
         tm.membership_status,
         tm.joined_at,
         u.full_name,
         u.email
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = $1
         AND tm.user_id = $2
       FOR UPDATE OF tm`,
      [trip.id, normalizedTargetUserId]
    );

    if (
      existingRes.rowCount === 0 ||
      existingRes.rows[0].membership_status !== 'active'
    ) {
      throw createHttpError(
        404,
        'Active trip member not found for this trip.',
        'MEMBER_NOT_FOUND'
      );
    }

    const memberRow = existingRes.rows[0];

    await client.query(
      `UPDATE trip_members
       SET role = $1
       WHERE id = $2 AND trip_id = $3`,
      [newRole, memberRow.id, trip.id]
    );

    await client.query(
      `UPDATE trips
       SET updated_at = NOW()
       WHERE id = $1`,
      [trip.id]
    );

    return {
      id: memberRow.id,
      userId: memberRow.user_id,
      fullName: memberRow.full_name,
      email: memberRow.email,
      role: newRole,
      membershipStatus: 'active',
      joinedAt: memberRow.joined_at,
      isOwner: false,
    };
  });
}

/**
 * Non-destructively removes an active trip member by transitioning
 * `membership_status` to `'inactive'`.
 * Preserves the user's account, historical itinerary items, expenses,
 * expense splits, and settlement audit records.
 */
export async function removeTripMember(trip, targetUserId) {
  if (!isValidUuid(targetUserId)) {
    throw createHttpError(400, 'Invalid member userId parameter.', 'INVALID_USER_ID');
  }

  const normalizedTargetUserId = targetUserId.trim();
  if (normalizedTargetUserId === trip.ownerUserId) {
    throw createHttpError(
      400,
      'The trip owner cannot be removed from their own trip.',
      'CANNOT_REMOVE_TRIP_OWNER'
    );
  }

  return withTransaction(async (client) => {
    const existingRes = await client.query(
      `SELECT
         tm.id,
         tm.trip_id,
         tm.user_id,
         tm.role,
         tm.membership_status,
         u.full_name,
         u.email
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = $1
         AND tm.user_id = $2
       FOR UPDATE OF tm`,
      [trip.id, normalizedTargetUserId]
    );

    if (
      existingRes.rowCount === 0 ||
      existingRes.rows[0].membership_status !== 'active'
    ) {
      throw createHttpError(
        404,
        'Active trip member not found for this trip.',
        'MEMBER_NOT_FOUND'
      );
    }

    const memberRow = existingRes.rows[0];

    await client.query(
      `UPDATE trip_members
       SET membership_status = 'inactive'
       WHERE id = $1 AND trip_id = $2`,
      [memberRow.id, trip.id]
    );

    await client.query(
      `UPDATE trips
       SET updated_at = NOW()
       WHERE id = $1`,
      [trip.id]
    );

    return {
      removedUserId: memberRow.user_id,
      fullName: memberRow.full_name,
      email: memberRow.email,
      previousRole: memberRow.role,
      membershipStatus: 'inactive',
    };
  });
}
