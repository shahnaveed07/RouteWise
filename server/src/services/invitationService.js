import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { isValidUuid } from './tripService.js';
import { normalizeEmailAddress } from '../validators/invitationValidator.js';

export const DEFAULT_INVITATION_TTL_DAYS = 7;
export const INVITATION_DELIVERY_NOTICE =
  'Invitation link created — share this link with the invited person.';

function createHttpError(status, message, code, details) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  if (code) err.code = code;
  if (details) err.details = details;
  return err;
}

/**
 * Generates a cryptographically secure 32-byte URL-safe random token.
 * Never persisted in PostgreSQL or written to server logs.
 */
export function generateInvitationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Computes the hex-encoded SHA-256 hash of an invitation token.
 * Only this hash is stored and indexed in PostgreSQL.
 */
export function hashInvitationToken(rawToken) {
  return crypto
    .createHash('sha256')
    .update(String(rawToken || ''), 'utf8')
    .digest('hex');
}

/**
 * Builds the frontend relative invitation URL placing the token in the URL fragment.
 */
export function buildInvitationFragmentPath(rawToken) {
  return `/invitations/accept#token=${rawToken}`;
}

/**
 * Maps a `trip_invitations` row to a safe public JSON object.
 * Strictly omits `token_hash` and never includes a raw token.
 */
function mapInvitationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
    invitedEmail: row.invited_email,
    role: row.role,
    status: row.status,
    invitedByUserId: row.invited_by_user_id,
    invitedByName: row.invited_by_name || null,
    acceptedByUserId: row.accepted_by_user_id || null,
    acceptedByName: row.accepted_by_name || null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at || null,
    updatedAt: row.updated_at,
  };
}

/**
 * Transitions any pending invitations whose `expires_at` timestamp has passed to `'expired'`.
 */
export async function expireStaleInvitationsForTrip(tripId, queryFn = query) {
  if (!isValidUuid(tripId)) {
    return 0;
  }
  const res = await queryFn(
    `UPDATE trip_invitations
     SET status = 'expired',
         updated_at = NOW()
     WHERE trip_id = $1
       AND status = 'pending'
       AND expires_at <= NOW()`,
    [tripId.trim()]
  );
  return res.rowCount || 0;
}

/**
 * Lists all invitations for a trip (owner-only).
 * First transitions any expired pending invitations to `'expired'`.
 * Never returns `token_hash` or raw tokens.
 */
export async function listTripInvitations(tripId, queryFn = query) {
  if (!isValidUuid(tripId)) {
    throw createHttpError(400, 'Invalid tripId parameter.', 'INVALID_TRIP_ID');
  }

  await expireStaleInvitationsForTrip(tripId, queryFn);

  const res = await queryFn(
    `SELECT
       ti.id,
       ti.trip_id,
       ti.invited_email,
       ti.role,
       ti.status,
       ti.invited_by_user_id,
       inviter.full_name AS invited_by_name,
       ti.accepted_by_user_id,
       accepter.full_name AS accepted_by_name,
       ti.created_at,
       ti.expires_at,
       ti.responded_at,
       ti.updated_at
     FROM trip_invitations ti
     LEFT JOIN users inviter ON inviter.id = ti.invited_by_user_id
     LEFT JOIN users accepter ON accepter.id = ti.accepted_by_user_id
     WHERE ti.trip_id = $1
     ORDER BY
       CASE WHEN ti.status = 'pending' THEN 0 ELSE 1 END ASC,
       ti.created_at DESC,
       ti.id DESC`,
    [tripId.trim()]
  );

  return res.rows.map(mapInvitationRow);
}

/**
 * Creates a new email-based invitation for a trip (owner-only).
 * - Expires stale pending invitations in the same transaction first so the partial unique
 *   index on `(trip_id, invited_email) WHERE status = 'pending'` allows re-inviting after expiry.
 * - Rejects inviting the owner's own email, already-active trip members, or duplicate pending emails.
 * - Stores only the SHA-256 token hash in PostgreSQL and returns the raw token once for link sharing.
 */
export async function createTripInvitation(
  trip,
  ownerUser,
  validatedInput,
  options = {}
) {
  const invitedEmail = normalizeEmailAddress(validatedInput.invitedEmail);
  const role = validatedInput.role;

  const ownerEmail = normalizeEmailAddress(ownerUser?.email || '');
  if (ownerEmail && invitedEmail === ownerEmail) {
    throw createHttpError(
      400,
      'You are the trip owner and cannot invite your own email address.',
      'CANNOT_INVITE_OWNER'
    );
  }

  return withTransaction(async (client) => {
    const queryFn = (text, params) => client.query(text, params);

    // Lock trip row to serialize invitation creation for this trip
    const tripRes = await client.query(
      `SELECT t.id, t.owner_user_id, u.email AS owner_email
       FROM trips t
       JOIN users u ON u.id = t.owner_user_id
       WHERE t.id = $1
       FOR UPDATE OF t`,
      [trip.id]
    );

    if (tripRes.rowCount === 0) {
      throw createHttpError(404, 'Trip not found.', 'TRIP_NOT_FOUND');
    }

    const dbOwnerEmail = normalizeEmailAddress(tripRes.rows[0].owner_email);
    if (dbOwnerEmail && invitedEmail === dbOwnerEmail) {
      throw createHttpError(
        400,
        'You are the trip owner and cannot invite your own email address.',
        'CANNOT_INVITE_OWNER'
      );
    }

    // Expire stale pending invitations on this trip before checking duplicates or inserting
    await expireStaleInvitationsForTrip(trip.id, queryFn);

    // Reject if the invited email belongs to an already-active member of this trip
    const activeMemberRes = await client.query(
      `SELECT tm.id, tm.role
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = $1
         AND LOWER(BTRIM(u.email)) = $2
         AND tm.membership_status = 'active'
       LIMIT 1`,
      [trip.id, invitedEmail]
    );

    if (activeMemberRes.rowCount > 0) {
      throw createHttpError(
        409,
        `A user with email "${invitedEmail}" is already an active member of this trip.`,
        'ALREADY_ACTIVE_TRIP_MEMBER'
      );
    }

    // Reject if an unexpired pending invitation already exists for this trip + email
    const pendingRes = await client.query(
      `SELECT id, expires_at
       FROM trip_invitations
       WHERE trip_id = $1
         AND invited_email = $2
         AND status = 'pending'
       LIMIT 1`,
      [trip.id, invitedEmail]
    );

    if (pendingRes.rowCount > 0) {
      throw createHttpError(
        409,
        `A pending invitation already exists for "${invitedEmail}" on this trip. Revoke the existing invitation first if you wish to generate a new link.`,
        'DUPLICATE_PENDING_INVITATION'
      );
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);

    const customExpiresAt = options.expiresAt ? new Date(options.expiresAt) : null;
    const ttlDays =
      typeof options.ttlDays === 'number' && options.ttlDays > 0
        ? options.ttlDays
        : DEFAULT_INVITATION_TTL_DAYS;
    const expiresAt =
      customExpiresAt && !Number.isNaN(customExpiresAt.getTime())
        ? customExpiresAt.toISOString()
        : new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    const insertRes = await client.query(
      `INSERT INTO trip_invitations (
         trip_id,
         invited_email,
         role,
         token_hash,
         status,
         invited_by_user_id,
         created_at,
         expires_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), $6::timestamptz, NOW())
       RETURNING
         id,
         trip_id,
         invited_email,
         role,
         status,
         invited_by_user_id,
         accepted_by_user_id,
         created_at,
         expires_at,
         responded_at,
         updated_at`,
      [trip.id, invitedEmail, role, tokenHash, ownerUser.id, expiresAt]
    );

    const insertedRow = insertRes.rows[0];
    insertedRow.invited_by_name = ownerUser.fullName || null;

    const invitationLink = buildInvitationFragmentPath(rawToken);

    return {
      invitation: mapInvitationRow(insertedRow),
      invitationLink,
      token: rawToken,
      deliveryNotice: INVITATION_DELIVERY_NOTICE,
    };
  });
}

/**
 * Revokes a pending invitation (owner-only).
 * Preserves the invitation record with `status = 'revoked'` for audit trail.
 */
export async function revokeTripInvitation(trip, invitationId) {
  if (!isValidUuid(invitationId)) {
    throw createHttpError(
      400,
      'Invalid invitationId parameter.',
      'INVALID_INVITATION_ID'
    );
  }

  return withTransaction(async (client) => {
    const queryFn = (text, params) => client.query(text, params);
    await expireStaleInvitationsForTrip(trip.id, queryFn);

    const existingRes = await client.query(
      `SELECT
         ti.id,
         ti.trip_id,
         ti.invited_email,
         ti.role,
         ti.status,
         ti.invited_by_user_id,
         inviter.full_name AS invited_by_name,
         ti.accepted_by_user_id,
         accepter.full_name AS accepted_by_name,
         ti.created_at,
         ti.expires_at,
         ti.responded_at,
         ti.updated_at
       FROM trip_invitations ti
       LEFT JOIN users inviter ON inviter.id = ti.invited_by_user_id
       LEFT JOIN users accepter ON accepter.id = ti.accepted_by_user_id
       WHERE ti.id = $1
         AND ti.trip_id = $2
       FOR UPDATE OF ti`,
      [invitationId.trim(), trip.id]
    );

    if (existingRes.rowCount === 0) {
      throw createHttpError(
        404,
        'Invitation not found for this trip.',
        'INVITATION_NOT_FOUND'
      );
    }

    const inv = existingRes.rows[0];
    if (inv.status !== 'pending') {
      throw createHttpError(
        409,
        `Cannot revoke this invitation because its current status is "${inv.status}". Only pending invitations can be revoked.`,
        'INVITATION_NOT_PENDING'
      );
    }

    const updatedRes = await client.query(
      `UPDATE trip_invitations
       SET status = 'revoked',
           responded_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND trip_id = $2
       RETURNING
         id,
         trip_id,
         invited_email,
         role,
         status,
         invited_by_user_id,
         accepted_by_user_id,
         created_at,
         expires_at,
         responded_at,
         updated_at`,
      [inv.id, trip.id]
    );

    const updatedRow = updatedRes.rows[0];
    updatedRow.invited_by_name = inv.invited_by_name;
    updatedRow.accepted_by_name = inv.accepted_by_name;

    return mapInvitationRow(updatedRow);
  });
}

/**
 * Accepts a pending trip invitation using the raw token and authenticated user identity.
 * - Requires verified email claim (`emailVerified !== false`).
 * - Hashes token with SHA-256 and locks the invitation row (`FOR UPDATE`).
 * - Transitions expired pending invitations to `'expired'` and commits that state before rejecting.
 * - Enforces exact normalized email match between authenticated user and `invited_email`.
 * - Upserts/reactivates `trip_members` (`ON CONFLICT (trip_id, user_id) DO UPDATE`) and marks
 *   the invitation `'accepted'` in a single PostgreSQL transaction.
 */
export async function acceptTripInvitation(
  rawToken,
  authenticatedDbUser,
  authClaims = {}
) {
  if (!authenticatedDbUser || !authenticatedDbUser.id || !authenticatedDbUser.email) {
    throw createHttpError(
      401,
      'Authentication required: Please sign in to accept this trip invitation.',
      'AUTH_REQUIRED'
    );
  }

  if (authClaims.emailVerified === false) {
    throw createHttpError(
      403,
      'Forbidden: Your account email address must be verified before accepting a trip invitation.',
      'EMAIL_NOT_VERIFIED'
    );
  }

  const normalizedUserEmail = normalizeEmailAddress(authenticatedDbUser.email);
  const tokenHash = hashInvitationToken(rawToken);

  const outcome = await withTransaction(async (client) => {
    const invRes = await client.query(
      `SELECT
         ti.id,
         ti.trip_id,
         ti.invited_email,
         ti.role,
         ti.status,
         ti.invited_by_user_id,
         ti.accepted_by_user_id,
         ti.created_at,
         ti.expires_at,
         ti.responded_at,
         ti.updated_at,
         t.title AS trip_title,
         t.destination_name AS trip_destination,
         t.owner_user_id AS trip_owner_user_id
       FROM trip_invitations ti
       JOIN trips t ON t.id = ti.trip_id
       WHERE ti.token_hash = $1
       FOR UPDATE OF ti`,
      [tokenHash]
    );

    if (invRes.rowCount === 0) {
      return {
        error: createHttpError(
          404,
          'This invitation link is invalid or no longer available.',
          'INVITATION_NOT_FOUND'
        ),
      };
    }

    const inv = invRes.rows[0];
    const nowMs = Date.now();
    const expiresMs = new Date(inv.expires_at).getTime();

    if (inv.status === 'pending' && expiresMs <= nowMs) {
      await client.query(
        `UPDATE trip_invitations
         SET status = 'expired',
             updated_at = NOW()
         WHERE id = $1`,
        [inv.id]
      );
      return {
        error: createHttpError(
          410,
          'This trip invitation has expired. Please ask the trip owner to generate a new invitation link.',
          'INVITATION_EXPIRED'
        ),
      };
    }

    if (inv.status !== 'pending') {
      return {
        error: createHttpError(
          409,
          `This invitation is no longer active (current status: ${inv.status}).`,
          `INVITATION_${inv.status.toUpperCase()}`
        ),
      };
    }

    const normalizedInvitedEmail = normalizeEmailAddress(inv.invited_email);
    if (normalizedUserEmail !== normalizedInvitedEmail) {
      return {
        error: createHttpError(
          403,
          'Forbidden: This invitation was issued for a different email address. Please sign in with the invited account.',
          'INVITATION_EMAIL_MISMATCH'
        ),
      };
    }

    if (authenticatedDbUser.id === inv.trip_owner_user_id) {
      return {
        error: createHttpError(
          400,
          'You are already the owner of this trip.',
          'ALREADY_TRIP_OWNER'
        ),
      };
    }

    const memberUpsertRes = await client.query(
      `INSERT INTO trip_members (
         trip_id,
         user_id,
         role,
         membership_status,
         joined_at
       )
       VALUES ($1, $2, $3, 'active', NOW())
       ON CONFLICT (trip_id, user_id)
       DO UPDATE SET
         role = EXCLUDED.role,
         membership_status = 'active',
         joined_at = NOW()
       RETURNING
         id,
         trip_id,
         user_id,
         role,
         membership_status,
         joined_at`,
      [inv.trip_id, authenticatedDbUser.id, inv.role]
    );

    const updatedInvRes = await client.query(
      `UPDATE trip_invitations
       SET status = 'accepted',
           accepted_by_user_id = $1,
           responded_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING
         id,
         trip_id,
         invited_email,
         role,
         status,
         invited_by_user_id,
         accepted_by_user_id,
         created_at,
         expires_at,
         responded_at,
         updated_at`,
      [authenticatedDbUser.id, inv.id]
    );

    await client.query(
      `UPDATE trips
       SET updated_at = NOW()
       WHERE id = $1`,
      [inv.trip_id]
    );

    const memberRow = memberUpsertRes.rows[0];
    const updatedInvRow = updatedInvRes.rows[0];

    return {
      result: {
        invitation: mapInvitationRow(updatedInvRow),
        membership: {
          id: memberRow.id,
          tripId: memberRow.trip_id,
          userId: memberRow.user_id,
          role: memberRow.role,
          membershipStatus: memberRow.membership_status,
          joinedAt: memberRow.joined_at,
        },
        trip: {
          id: inv.trip_id,
          title: inv.trip_title,
          destinationName: inv.trip_destination,
          accessRole: memberRow.role,
        },
      },
    };
  });

  if (outcome.error) {
    throw outcome.error;
  }

  return outcome.result;
}

/**
 * Declines a pending trip invitation using the raw token and authenticated user identity.
 * - Requires authenticated user whose normalized email matches `invited_email`.
 * - Transitions expired pending invitations to `'expired'` before rejecting.
 * - Marks the invitation `'declined'` without creating or activating any `trip_members` row.
 */
export async function declineTripInvitation(
  rawToken,
  authenticatedDbUser,
  authClaims = {}
) {
  if (!authenticatedDbUser || !authenticatedDbUser.id || !authenticatedDbUser.email) {
    throw createHttpError(
      401,
      'Authentication required: Please sign in to respond to this trip invitation.',
      'AUTH_REQUIRED'
    );
  }

  if (authClaims.emailVerified === false) {
    throw createHttpError(
      403,
      'Forbidden: Your account email address must be verified before responding to a trip invitation.',
      'EMAIL_NOT_VERIFIED'
    );
  }

  const normalizedUserEmail = normalizeEmailAddress(authenticatedDbUser.email);
  const tokenHash = hashInvitationToken(rawToken);

  const outcome = await withTransaction(async (client) => {
    const invRes = await client.query(
      `SELECT
         ti.id,
         ti.trip_id,
         ti.invited_email,
         ti.role,
         ti.status,
         ti.invited_by_user_id,
         ti.accepted_by_user_id,
         ti.created_at,
         ti.expires_at,
         ti.responded_at,
         ti.updated_at
       FROM trip_invitations ti
       WHERE ti.token_hash = $1
       FOR UPDATE OF ti`,
      [tokenHash]
    );

    if (invRes.rowCount === 0) {
      return {
        error: createHttpError(
          404,
          'This invitation link is invalid or no longer available.',
          'INVITATION_NOT_FOUND'
        ),
      };
    }

    const inv = invRes.rows[0];
    const nowMs = Date.now();
    const expiresMs = new Date(inv.expires_at).getTime();

    if (inv.status === 'pending' && expiresMs <= nowMs) {
      await client.query(
        `UPDATE trip_invitations
         SET status = 'expired',
             updated_at = NOW()
         WHERE id = $1`,
        [inv.id]
      );
      return {
        error: createHttpError(
          410,
          'This trip invitation has expired.',
          'INVITATION_EXPIRED'
        ),
      };
    }

    if (inv.status !== 'pending') {
      return {
        error: createHttpError(
          409,
          `This invitation is no longer active (current status: ${inv.status}).`,
          `INVITATION_${inv.status.toUpperCase()}`
        ),
      };
    }

    const normalizedInvitedEmail = normalizeEmailAddress(inv.invited_email);
    if (normalizedUserEmail !== normalizedInvitedEmail) {
      return {
        error: createHttpError(
          403,
          'Forbidden: This invitation was issued for a different email address. Please sign in with the invited account.',
          'INVITATION_EMAIL_MISMATCH'
        ),
      };
    }

    const updatedInvRes = await client.query(
      `UPDATE trip_invitations
       SET status = 'declined',
           responded_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING
         id,
         trip_id,
         invited_email,
         role,
         status,
         invited_by_user_id,
         accepted_by_user_id,
         created_at,
         expires_at,
         responded_at,
         updated_at`,
      [inv.id]
    );

    return {
      result: {
        invitation: mapInvitationRow(updatedInvRes.rows[0]),
      },
    };
  });

  if (outcome.error) {
    throw outcome.error;
  }

  return outcome.result;
}
