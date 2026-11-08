import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTripAccess, requireTripOwner } from '../middleware/tripAccess.js';
import {
  handleCreateTrip,
  handleDeleteTrip,
  handleGetTrip,
  handleListTrips,
  handleUpdateTrip,
} from '../controllers/tripController.js';
import itineraryRoutes from './itineraryRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import memberRoutes from './memberRoutes.js';
import { tripInvitationRoutes } from './invitationRoutes.js';

const router = Router();

router.use(requireAuth);

router.get('/', handleListTrips);
router.post('/', handleCreateTrip);
router.use('/:tripId/itinerary', itineraryRoutes);
router.use('/:tripId/expenses', expenseRoutes);
router.use('/:tripId/members', memberRoutes);
router.use('/:tripId/invitations', tripInvitationRoutes);
router.get('/:tripId', requireTripAccess, handleGetTrip);
router.patch('/:tripId', requireTripAccess, requireTripOwner, handleUpdateTrip);
router.delete('/:tripId', requireTripAccess, requireTripOwner, handleDeleteTrip);

export default router;

