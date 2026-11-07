import { getAccessibleTripById } from '../services/tripService.js';

/**
 * Verifies that the authenticated user (`req.dbUser.id`) is either the trip owner
 * or an active member/viewer in `trip_members`.
 *
 * Security policy: Returns HTTP 404 for both non-existent and inaccessible trips
 * so private trip existence is never leaked to unauthorized users.
 */
export function createTripAccessMiddleware({ fetchAccessibleTrip = getAccessibleTripById } = {}) {
  const requireTripAccess = async (req, res, next) => {
    const userId = req.dbUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authenticated database user required.' });
    }

    const { tripId } = req.params;
    try {
      const trip = await fetchAccessibleTrip(tripId, userId);
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }
      req.trip = trip;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Verifies that the authenticated user is the owner of the trip (`trips.owner_user_id === req.dbUser.id`).
   * - If the user has no access to the trip (or the trip does not exist), returns 404 (no existence leak).
   * - If the user is an active member or viewer on the trip, returns 403 Forbidden.
   */
  const requireTripOwner = async (req, res, next) => {
    const userId = req.dbUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authenticated database user required.' });
    }

    const { tripId } = req.params;
    try {
      const trip = req.trip || (await fetchAccessibleTrip(tripId, userId));
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }
      if (trip.ownerUserId !== userId || trip.accessRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden: Only the trip owner can modify or delete this trip.',
        });
      }
      req.trip = trip;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Verifies that the authenticated user is an authorized itinerary editor
   * (`accessRole === 'owner'` or `accessRole === 'member'`).
   * - If the user has no access to the trip (or the trip does not exist), returns 404.
   * - If the user is a read-only viewer (`accessRole === 'viewer'`), returns 403 Forbidden.
   */
  const requireItineraryEditor = async (req, res, next) => {
    const userId = req.dbUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authenticated database user required.' });
    }

    const { tripId } = req.params;
    try {
      const trip = req.trip || (await fetchAccessibleTrip(tripId, userId));
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }
      if (trip.accessRole !== 'owner' && trip.accessRole !== 'member') {
        return res.status(403).json({
          error:
            'Forbidden: Viewers have read-only access and cannot initialize or modify itinerary records.',
        });
      }
      req.trip = trip;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  return { requireTripAccess, requireTripOwner, requireItineraryEditor };
}

const defaultMiddleware = createTripAccessMiddleware();
export const requireTripAccess = defaultMiddleware.requireTripAccess;
export const requireTripOwner = defaultMiddleware.requireTripOwner;
export const requireItineraryEditor = defaultMiddleware.requireItineraryEditor;
