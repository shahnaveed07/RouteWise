import { isValidUuid } from '../services/tripService.js';
import {
  validateExpenseInput,
  validateSettlementInput,
} from '../validators/expenseValidator.js';
import {
  createTripExpense,
  deleteTripExpense,
  getTripExpensesDashboard,
  updateExpenseSplitSettlement,
  updateTripExpense,
} from '../services/expenseService.js';

function sendStructuredServiceError(res, err, fallbackCode = 'EXPENSE_ERROR') {
  return res.status(err.status).json({
    status: 'error',
    code: err.code || fallbackCode,
    error: err.message,
    message: err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}

export async function getTripExpensesHandler(req, res, next) {
  try {
    const data = await getTripExpensesDashboard(req.trip, req.dbUser.id);
    return res.status(200).json({
      status: 'ok',
      data,
    });
  } catch (err) {
    if (err && err.status) {
      return sendStructuredServiceError(res, err, 'EXPENSE_FETCH_ERROR');
    }
    return next(err);
  }
}

export const getTripExpensesDashboardHandler = getTripExpensesHandler;

export async function createTripExpenseHandler(req, res, next) {
  try {
    const validation = validateExpenseInput(req.body || {}, { partial: false });
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_EXPENSE_INPUT',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const expense = await createTripExpense(
      req.trip,
      req.dbUser.id,
      validation.data
    );
    const dashboard = await getTripExpensesDashboard(req.trip, req.dbUser.id);

    return res.status(201).json({
      status: 'ok',
      data: {
        ...dashboard,
        expense,
      },
    });
  } catch (err) {
    if (err && err.status) {
      return sendStructuredServiceError(res, err, 'EXPENSE_CREATE_ERROR');
    }
    return next(err);
  }
}

export async function updateTripExpenseHandler(req, res, next) {
  try {
    const { expenseId } = req.params;
    if (!isValidUuid(expenseId)) {
      const msg = 'Invalid expense ID format.';
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_EXPENSE_ID',
        error: msg,
        message: msg,
      });
    }

    const validation = validateExpenseInput(req.body || {}, { partial: true });
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_EXPENSE_INPUT',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const expense = await updateTripExpense(
      req.trip,
      expenseId,
      req.dbUser.id,
      validation.data
    );
    const dashboard = await getTripExpensesDashboard(req.trip, req.dbUser.id);

    return res.status(200).json({
      status: 'ok',
      data: {
        ...dashboard,
        expense,
      },
    });
  } catch (err) {
    if (err && err.status) {
      return sendStructuredServiceError(res, err, 'EXPENSE_UPDATE_ERROR');
    }
    return next(err);
  }
}

export async function deleteTripExpenseHandler(req, res, next) {
  try {
    const { expenseId } = req.params;
    if (!isValidUuid(expenseId)) {
      const msg = 'Invalid expense ID format.';
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_EXPENSE_ID',
        error: msg,
        message: msg,
      });
    }

    const result = await deleteTripExpense(
      req.trip,
      expenseId,
      req.dbUser.id
    );
    const dashboard = await getTripExpensesDashboard(req.trip, req.dbUser.id);

    return res.status(200).json({
      status: 'ok',
      data: {
        ...dashboard,
        ...result,
      },
    });
  } catch (err) {
    if (err && err.status) {
      return sendStructuredServiceError(res, err, 'EXPENSE_DELETE_ERROR');
    }
    return next(err);
  }
}

export async function updateExpenseSplitSettlementHandler(req, res, next) {
  try {
    const { expenseId, splitId } = req.params;
    if (!isValidUuid(expenseId) || !isValidUuid(splitId)) {
      const msg = 'Invalid expense ID or split ID format.';
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_SPLIT_ID',
        error: msg,
        message: msg,
      });
    }

    const validation = validateSettlementInput(req.body || {});
    if (!validation.valid) {
      const msg = validation.errors[0];
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_SETTLEMENT_INPUT',
        error: msg,
        message: msg,
        errors: validation.errors,
      });
    }

    const result = await updateExpenseSplitSettlement(
      req.trip,
      expenseId,
      splitId,
      req.dbUser.id,
      validation.data.isSettled
    );
    const dashboard = await getTripExpensesDashboard(req.trip, req.dbUser.id);

    return res.status(200).json({
      status: 'ok',
      data: {
        ...dashboard,
        ...result,
      },
    });
  } catch (err) {
    if (err && err.status) {
      return sendStructuredServiceError(res, err, 'SETTLEMENT_UPDATE_ERROR');
    }
    return next(err);
  }
}
