import { Router } from 'express';
import {
  requireTripAccess,
  requireTripEditor,
} from '../middleware/tripAccess.js';
import {
  createTripExpenseHandler,
  deleteTripExpenseHandler,
  getTripExpensesHandler,
  updateExpenseSplitSettlementHandler,
  updateTripExpenseHandler,
} from '../controllers/expenseController.js';

const router = Router({ mergeParams: true });

// All expense endpoints require trip membership/ownership access (404 if unauthorized/missing)
router.use(requireTripAccess);

// Read endpoints (accessible to owner, active member, and active viewer)
router.get('/', getTripExpensesHandler);

// Mutation endpoints (accessible to owner and active member; viewer receives 403)
router.post('/', requireTripEditor, createTripExpenseHandler);
router.patch('/:expenseId', requireTripEditor, updateTripExpenseHandler);
router.delete('/:expenseId', requireTripEditor, deleteTripExpenseHandler);
router.patch(
  '/:expenseId/splits/:splitId/settlement',
  requireTripEditor,
  updateExpenseSplitSettlementHandler
);

export default router;
