import { Router } from 'express';
import {
  requireItineraryEditor,
  requireTripAccess,
} from '../middleware/tripAccess.js';
import {
  calculateDayRouteHandler,
  createItineraryItemHandler,
  deleteItineraryItemHandler,
  getTripItineraryHandler,
  initializeTripItineraryHandler,
  listDayItemsHandler,
  reorderItineraryItemsHandler,
  updateItineraryDayNotesHandler,
  updateItineraryItemHandler,
} from '../controllers/itineraryController.js';

const router = Router({ mergeParams: true });

router.get('/', requireTripAccess, getTripItineraryHandler);
router.post(
  '/initialize',
  requireTripAccess,
  requireItineraryEditor,
  initializeTripItineraryHandler
);

router.patch(
  '/days/:dayId',
  requireTripAccess,
  requireItineraryEditor,
  updateItineraryDayNotesHandler
);

router.get('/days/:dayId/items', requireTripAccess, listDayItemsHandler);
router.post(
  '/days/:dayId/items',
  requireTripAccess,
  requireItineraryEditor,
  createItineraryItemHandler
);

// Must be declared before /days/:dayId/items/:itemId so "reorder" is not parsed as :itemId
router.patch(
  '/days/:dayId/items/reorder',
  requireTripAccess,
  requireItineraryEditor,
  reorderItineraryItemsHandler
);

router.patch(
  '/days/:dayId/items/:itemId',
  requireTripAccess,
  requireItineraryEditor,
  updateItineraryItemHandler
);
router.delete(
  '/days/:dayId/items/:itemId',
  requireTripAccess,
  requireItineraryEditor,
  deleteItineraryItemHandler
);

router.post('/days/:dayId/route', requireTripAccess, calculateDayRouteHandler);

export default router;
