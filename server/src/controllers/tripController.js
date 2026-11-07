import {
  createTrip,
  deleteTripById,
  listTripsForUser,
  updateTripById,
} from '../services/tripService.js';
import {
  validateCreateTripInput,
  validateUpdateTripInput,
} from '../validators/tripValidator.js';

export function createTripControllers({
  listTrips = listTripsForUser,
  insertTrip = createTrip,
  patchTrip = updateTripById,
  removeTrip = deleteTripById,
} = {}) {
  const handleListTrips = async (req, res, next) => {
    try {
      const trips = await listTrips(req.dbUser.id);
      return res.status(200).json({ trips });
    } catch (error) {
      return next(error);
    }
  };

  const handleCreateTrip = async (req, res, next) => {
    const validation = validateCreateTripInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const trip = await insertTrip(req.dbUser.id, validation.data);
      return res.status(201).json({ trip });
    } catch (error) {
      return next(error);
    }
  };

  const handleGetTrip = async (req, res) => {
    return res.status(200).json({ trip: req.trip });
  };

  const handleUpdateTrip = async (req, res, next) => {
    const validation = validateUpdateTripInput(req.body, req.trip);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const updatedTrip = await patchTrip(req.trip.id, req.dbUser.id, validation.data);
      if (!updatedTrip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }
      return res.status(200).json({ trip: updatedTrip });
    } catch (error) {
      return next(error);
    }
  };

  const handleDeleteTrip = async (req, res, next) => {
    try {
      const deleted = await removeTrip(req.trip.id, req.dbUser.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Trip not found.' });
      }
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  return {
    handleListTrips,
    handleCreateTrip,
    handleGetTrip,
    handleUpdateTrip,
    handleDeleteTrip,
  };
}

const defaultControllers = createTripControllers();
export const handleListTrips = defaultControllers.handleListTrips;
export const handleCreateTrip = defaultControllers.handleCreateTrip;
export const handleGetTrip = defaultControllers.handleGetTrip;
export const handleUpdateTrip = defaultControllers.handleUpdateTrip;
export const handleDeleteTrip = defaultControllers.handleDeleteTrip;
