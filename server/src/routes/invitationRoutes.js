import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTripAccess, requireTripOwner } from '../middleware/tripAccess.js';
import {
  acceptTripInvitationHandler,
  createTripInvitationHandler,
  declineTripInvitationHandler,
  getTripInvitationsHandler,
  revokeTripInvitationHandler,
} from '../controllers/invitationController.js';

/**
 * Owner-only trip-scoped invitation management routes mounted at `/api/trips/:tripId/invitations`.
 */
export const tripInvitationRoutes = Router({ mergeParams: true });

tripInvitationRoutes.get(
  '/',
  requireTripAccess,
  requireTripOwner,
  getTripInvitationsHandler
);
tripInvitationRoutes.post(
  '/',
  requireTripAccess,
  requireTripOwner,
  createTripInvitationHandler
);
tripInvitationRoutes.delete(
  '/:invitationId',
  requireTripAccess,
  requireTripOwner,
  revokeTripInvitationHandler
);

/**
 * Authenticated invitee response routes mounted at `/api/trip-invitations`.
 * Invitees do not yet have trip access, so authorization is verified via Firebase auth + invitation token.
 */
const invitationResponseRoutes = Router();

invitationResponseRoutes.use(requireAuth);
invitationResponseRoutes.post('/accept', acceptTripInvitationHandler);
invitationResponseRoutes.post('/decline', declineTripInvitationHandler);

export default invitationResponseRoutes;
