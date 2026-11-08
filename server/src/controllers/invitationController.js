import {
  acceptTripInvitation,
  createTripInvitation,
  declineTripInvitation,
  listTripInvitations,
  revokeTripInvitation,
} from '../services/invitationService.js';
import {
  validateCreateInvitationInput,
  validateInvitationTokenInput,
} from '../validators/invitationValidator.js';

function handleControllerError(err, res, next) {
  const status = err?.status || err?.statusCode;
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({
      error: err.message,
      code: err.code || undefined,
      details: err.details || undefined,
    });
  }
  return next(err);
}

/**
 * GET /api/trips/:tripId/invitations
 * Owner only. Never returns raw tokens or token hashes.
 */
export async function getTripInvitationsHandler(req, res, next) {
  try {
    const invitations = await listTripInvitations(req.trip.id);
    return res.status(200).json({
      status: 'ok',
      invitations,
      data: {
        invitations,
      },
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}

/**
 * POST /api/trips/:tripId/invitations
 * Owner only. Generates a secure invitation token and returns the shareable link once.
 */
export async function createTripInvitationHandler(req, res, next) {
  const validation = validateCreateInvitationInput(req.body, req.dbUser?.email);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code || 'VALIDATION_ERROR',
    });
  }

  try {
    const created = await createTripInvitation(
      req.trip,
      req.dbUser,
      validation.data
    );
    const invitations = await listTripInvitations(req.trip.id);

    return res.status(201).json({
      status: 'ok',
      invitation: created.invitation,
      invitationLink: created.invitationLink,
      token: created.token,
      deliveryNotice: created.deliveryNotice,
      invitations,
      data: {
        invitation: created.invitation,
        invitationLink: created.invitationLink,
        token: created.token,
        deliveryNotice: created.deliveryNotice,
        invitations,
      },
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}

/**
 * DELETE /api/trips/:tripId/invitations/:invitationId
 * Owner only. Revokes a pending invitation while preserving the audit record.
 */
export async function revokeTripInvitationHandler(req, res, next) {
  try {
    const revoked = await revokeTripInvitation(
      req.trip,
      req.params.invitationId
    );
    const invitations = await listTripInvitations(req.trip.id);

    return res.status(200).json({
      status: 'ok',
      invitation: revoked,
      invitations,
      data: {
        invitation: revoked,
        invitations,
      },
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}

/**
 * POST /api/trip-invitations/accept
 * Authenticated invited user. Validates token in JSON body and activates membership.
 */
export async function acceptTripInvitationHandler(req, res, next) {
  const validation = validateInvitationTokenInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      code: 'INVALID_INVITATION_TOKEN',
    });
  }

  try {
    const accepted = await acceptTripInvitation(
      validation.data.token,
      req.dbUser,
      req.user
    );
    return res.status(200).json({
      status: 'ok',
      ...accepted,
      data: accepted,
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}

/**
 * POST /api/trip-invitations/decline
 * Authenticated invited user. Validates token in JSON body and marks invitation declined.
 */
export async function declineTripInvitationHandler(req, res, next) {
  const validation = validateInvitationTokenInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      code: 'INVALID_INVITATION_TOKEN',
    });
  }

  try {
    const declined = await declineTripInvitation(
      validation.data.token,
      req.dbUser,
      req.user
    );
    return res.status(200).json({
      status: 'ok',
      ...declined,
      data: declined,
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}
