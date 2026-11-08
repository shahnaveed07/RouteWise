import { isValidUuid } from '../services/tripService.js';
import {
  validateActivityInput,
  validateDayNotesInput,
  validateReorderItemsInput,
  validateRouteRequestInput,
} from '../validators/itineraryValidator.js';
import {
  createItineraryItem,
  deleteItineraryItem,
  getItineraryDayForTrip,
  getTripItinerary,
  initializeTripItinerary,
  listDayItems,
  reorderItineraryItems,
  updateItineraryDayNotes,
  updateItineraryItem,
} from '../services/itineraryService.js';
import { calculateDayRoute } from '../services/routingService.js';

export async function getTripItineraryHandler(req, res, next) {
  try {
    const data = await getTripItinerary(req.trip, req.tripAccessRole);
    return res.status(200).json({
      status: 'ok',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

export async function initializeTripItineraryHandler(req, res, next) {
  try {
    const data = await initializeTripItinerary(req.trip);
    data.trip.accessRole = req.tripAccessRole || data.trip.accessRole;
    return res.status(200).json({
      status: 'ok',
      data,
    });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({
        status: 'error',
        code: err.code || 'ITINERARY_INITIALIZATION_ERROR',
        error: err.message,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
    }
    return next(err);
  }
}

export async function updateItineraryDayNotesHandler(req, res, next) {
  try {
    const { dayId } = req.params;
    if (!isValidUuid(dayId)) {
      const msg = 'Invalid itinerary day ID format.';
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const validation = validateDayNotesInput(req.body || {});
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const updatedDay = await updateItineraryDayNotes(
      req.trip.id,
      dayId,
      validation.data.notes
    );

    if (!updatedDay) {
      const msg = 'Itinerary day not found for this trip.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: {
        day: updatedDay,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function listDayItemsHandler(req, res, next) {
  try {
    const { dayId } = req.params;
    if (!isValidUuid(dayId)) {
      const msg = 'Invalid itinerary day ID format.';
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const items = await listDayItems(req.trip.id, dayId);
    if (!items) {
      const msg = 'Itinerary day not found for this trip.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: {
        items,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createItineraryItemHandler(req, res, next) {
  try {
    const { dayId } = req.params;
    if (!isValidUuid(dayId)) {
      const msg = 'Invalid itinerary day ID format.';
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const validation = validateActivityInput(req.body || {}, { partial: false });
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const item = await createItineraryItem(
      req.trip.id,
      dayId,
      validation.data
    );

    if (!item) {
      const msg = 'Itinerary day not found for this trip.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    return res.status(201).json({
      status: 'ok',
      data: {
        item,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateItineraryItemHandler(req, res, next) {
  try {
    const { dayId, itemId } = req.params;
    if (!isValidUuid(dayId) || !isValidUuid(itemId)) {
      const msg = 'Invalid itinerary day ID or activity ID format.';
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const validation = validateActivityInput(req.body || {}, { partial: true });
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const result = await updateItineraryItem(
      req.trip.id,
      dayId,
      itemId,
      validation.data
    );

    if (result.status === 'DAY_NOT_FOUND') {
      const msg = 'Itinerary day not found for this trip.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    if (result.status === 'ITEM_NOT_FOUND') {
      const msg = 'Itinerary activity not found for this day.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    if (result.status === 'INVALID_TIME_RANGE') {
      const msg = result.errors[0];
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
        errors: result.errors,
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: {
        item: result.item,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteItineraryItemHandler(req, res, next) {
  try {
    const { dayId, itemId } = req.params;
    if (!isValidUuid(dayId) || !isValidUuid(itemId)) {
      const msg = 'Invalid itinerary day ID or activity ID format.';
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const result = await deleteItineraryItem(req.trip.id, dayId, itemId);
    if (result.status === 'DAY_NOT_FOUND') {
      const msg = 'Itinerary day not found for this trip.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    if (result.status === 'ITEM_NOT_FOUND') {
      const msg = 'Itinerary activity not found for this day.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: {
        deletedItemId: itemId,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function reorderItineraryItemsHandler(req, res, next) {
  try {
    const { dayId } = req.params;
    if (!isValidUuid(dayId)) {
      const msg = 'Invalid itinerary day ID format.';
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const validation = validateReorderItemsInput(req.body || {});
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const result = await reorderItineraryItems(
      req.trip.id,
      dayId,
      validation.data.itemIds
    );

    if (result.status === 'DAY_NOT_FOUND') {
      const msg = 'Itinerary day not found for this trip.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    if (result.status === 'MISMATCH') {
      const msg = result.errors[0];
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
        errors: result.errors,
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: {
        items: result.items,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function calculateDayRouteHandler(req, res, next) {
  try {
    const { dayId } = req.params;
    if (!isValidUuid(dayId)) {
      const msg = 'Invalid itinerary day ID format.';
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const validation = validateRouteRequestInput(req.body || {});
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const day = await getItineraryDayForTrip(req.trip.id, dayId);
    if (!day) {
      const msg = 'Itinerary day not found for this trip.';
      return res.status(404).json({
        status: 'error',
        error: msg,
        message: msg,
      });
    }

    const items = await listDayItems(req.trip.id, dayId);
    const routeData = await calculateDayRoute({
      items,
      profile: validation.data.profile,
    });

    return res.status(200).json({
      status: 'ok',
      data: {
        dayId,
        dayOrder: Number(day.day_order),
        dayDate:
          typeof day.day_date === 'string'
            ? day.day_date.slice(0, 10)
            : day.day_date instanceof Date
            ? day.day_date.toISOString().slice(0, 10)
            : String(day.day_date).slice(0, 10),
        route: routeData,
      },
    });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({
        status: 'error',
        code: err.code || 'ROUTE_CALCULATION_ERROR',
        error: err.message,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
    }
    return next(err);
  }
}
