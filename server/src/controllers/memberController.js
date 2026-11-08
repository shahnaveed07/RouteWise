import {
  listTripMembers,
  removeTripMember,
  updateTripMemberRole,
} from '../services/memberService.js';
import { validateUpdateMemberRoleInput } from '../validators/memberValidator.js';

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
 * GET /api/trips/:tripId/members
 * Accessible to any active trip member (owner, member, viewer).
 */
export async function getTripMembersHandler(req, res, next) {
  try {
    const result = await listTripMembers(req.trip.id);
    return res.status(200).json({
      status: 'ok',
      trip: req.trip,
      owner: result.owner,
      members: result.members,
      allMembers: result.allMembers,
      data: {
        trip: req.trip,
        owner: result.owner,
        members: result.members,
        allMembers: result.allMembers,
      },
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}

/**
 * PATCH /api/trips/:tripId/members/:userId
 * Accessible to the trip owner only.
 */
export async function updateTripMemberRoleHandler(req, res, next) {
  const validation = validateUpdateMemberRoleInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    const updatedMember = await updateTripMemberRole(
      req.trip,
      req.params.userId,
      validation.data.role
    );
    const refreshed = await listTripMembers(req.trip.id);

    return res.status(200).json({
      status: 'ok',
      member: updatedMember,
      owner: refreshed.owner,
      members: refreshed.members,
      allMembers: refreshed.allMembers,
      data: {
        member: updatedMember,
        owner: refreshed.owner,
        members: refreshed.members,
        allMembers: refreshed.allMembers,
      },
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}

/**
 * DELETE /api/trips/:tripId/members/:userId
 * Accessible to the trip owner only. Non-destructively deactivates membership.
 */
export async function removeTripMemberHandler(req, res, next) {
  try {
    const removedMember = await removeTripMember(req.trip, req.params.userId);
    const refreshed = await listTripMembers(req.trip.id);

    return res.status(200).json({
      status: 'ok',
      removedMember,
      owner: refreshed.owner,
      members: refreshed.members,
      allMembers: refreshed.allMembers,
      data: {
        removedMember,
        owner: refreshed.owner,
        members: refreshed.members,
        allMembers: refreshed.allMembers,
      },
    });
  } catch (err) {
    return handleControllerError(err, res, next);
  }
}
