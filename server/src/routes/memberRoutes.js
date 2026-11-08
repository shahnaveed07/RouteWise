import { Router } from 'express';
import { requireTripAccess, requireTripOwner } from '../middleware/tripAccess.js';
import {
  getTripMembersHandler,
  removeTripMemberHandler,
  updateTripMemberRoleHandler,
} from '../controllers/memberController.js';

const router = Router({ mergeParams: true });

router.get('/', requireTripAccess, getTripMembersHandler);
router.patch('/:userId', requireTripAccess, requireTripOwner, updateTripMemberRoleHandler);
router.delete('/:userId', requireTripAccess, requireTripOwner, removeTripMemberHandler);

export default router;
