import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BudgetOverview from '../components/BudgetOverview.jsx';
import CategoryBreakdown from '../components/CategoryBreakdown.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import ExpenseList from '../components/ExpenseList.jsx';
import GroupSettlementPanel from '../components/GroupSettlementPanel.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTrips, updateTripRequest } from '../services/apiClient.jsx';
import {
  createTripExpenseRequest,
  deleteTripExpenseRequest,
  fetchTripExpenses,
  updateExpenseSplitSettlementRequest,
  updateTripExpenseRequest,
} from '../services/expenseService.jsx';

export default function ExpensesPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [accessibleTrips, setAccessibleTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [editingExpense, setEditingExpense] = useState(null);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [editError, setEditError] = useState(null);
  const [pendingResetConfirm, setPendingResetConfirm] = useState(null);

  const [deletingExpense, setDeletingExpense] = useState(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [settlingSplitId, setSettlingSplitId] = useState(null);
  const [settlementError, setSettlementError] = useState(null);

  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState(null);

  const [statusBanner, setStatusBanner] = useState(null);

  const loadRequestSeqRef = useRef(0);
  const loadAbortRef = useRef(null);

  // Reset trip-specific state immediately whenever :tripId changes
  useEffect(() => {
    if (loadAbortRef.current) {
      loadAbortRef.current.abort();
      loadAbortRef.current = null;
    }
    loadRequestSeqRef.current += 1;

    setDashboardData(null);
    setLoadError(null);
    setIsCreateFormOpen(false);
    setCreateError(null);
    setEditingExpense(null);
    setEditError(null);
    setPendingResetConfirm(null);
    setDeletingExpense(null);
    setDeleteError(null);
    setSettlingSplitId(null);
    setSettlementError(null);
    setBudgetError(null);
    setStatusBanner(null);
  }, [tripId]);

  useEffect(() => {
    return () => {
      if (loadAbortRef.current) {
        loadAbortRef.current.abort();
      }
    };
  }, []);

  // Load accessible trips for in-page trip switching
  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      setAccessibleTrips([]);
      return undefined;
    }
    let cancelled = false;
    fetchTrips(getAccessToken)
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setAccessibleTrips(list);
        }
      })
      .catch(() => {
        // Non-blocking
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, getAccessToken, tripId]);

  const loadExpensesDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAuthenticated || !tripId) {
        setIsLoading(false);
        return;
      }

      if (loadAbortRef.current) {
        loadAbortRef.current.abort();
      }
      const controller = new AbortController();
      loadAbortRef.current = controller;
      const requestId = ++loadRequestSeqRef.current;
      const requestedTripId = tripId;

      if (!silent) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const data = await fetchTripExpenses(getAccessToken, requestedTripId, {
          signal: controller.signal,
        });
        if (
          loadRequestSeqRef.current !== requestId ||
          controller.signal.aborted
        ) {
          return;
        }
        setDashboardData(data);
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return;
        }
        if (loadRequestSeqRef.current !== requestId) {
          return;
        }
        setLoadError(err.message || 'Unable to load trip budget and expenses.');
      } finally {
        if (loadRequestSeqRef.current === requestId && !silent) {
          setIsLoading(false);
        }
      }
    },
    [isAuthenticated, tripId, getAccessToken]
  );

  useEffect(() => {
    if (authReady && isAuthenticated) {
      loadExpensesDashboard();
    } else if (authReady && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authReady, isAuthenticated, loadExpensesDashboard]);

  const trip =
    dashboardData?.trip && dashboardData.trip.id === tripId
      ? dashboardData.trip
      : null;

  const accessRole = trip?.accessRole || 'viewer';
  const isOwner = accessRole === 'owner';
  const canCreateExpense = accessRole === 'owner' || accessRole === 'member';
  const canSettle = accessRole === 'owner' || accessRole === 'member';

  const participants = Array.isArray(dashboardData?.participants)
    ? dashboardData.participants
    : [];
  const categories = Array.isArray(dashboardData?.categories)
    ? dashboardData.categories
    : [];
  const budgetSummary = dashboardData?.budgetSummary || null;
  const categoryBreakdown = Array.isArray(dashboardData?.categoryBreakdown)
    ? dashboardData.categoryBreakdown
    : [];
  const participantBalances = Array.isArray(dashboardData?.participantBalances)
    ? dashboardData.participantBalances
    : [];
  const settlementSummary = dashboardData?.settlementSummary || null;
  const expenses = Array.isArray(dashboardData?.expenses)
    ? dashboardData.expenses
    : [];

  // Resolved database user ID for current authenticated user
  const currentParticipant = participants.find(
    (p) =>
      (currentUser?.email &&
        p.email &&
        p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      p.userId === currentUser?.id
  );
  const currentDbUserId = currentParticipant?.userId || currentUser?.id || '';

  const handleUpdatePlannedBudget = async (nextBudgetValue) => {
    if (!trip || !isOwner) return false;
    setIsUpdatingBudget(true);
    setBudgetError(null);
    setStatusBanner(null);
    try {
      await updateTripRequest(getAccessToken, trip.id, {
        plannedBudget: nextBudgetValue,
      });
      await loadExpensesDashboard({ silent: true });
      setStatusBanner('Planned trip budget updated in PostgreSQL.');
      return true;
    } catch (err) {
      setBudgetError(err.message || 'Unable to update planned trip budget.');
      return false;
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const handleCreateExpense = async (payload) => {
    if (!trip || !canCreateExpense) return;
    setIsCreating(true);
    setCreateError(null);
    setStatusBanner(null);
    try {
      const data = await createTripExpenseRequest(
        getAccessToken,
        trip.id,
        payload
      );
      setDashboardData(data);
      setIsCreateFormOpen(false);
      setStatusBanner(`Recorded expense "${payload.title}" in PostgreSQL.`);
    } catch (err) {
      setCreateError(err.message || 'Unable to record expense.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateExpense = async (payload) => {
    if (!trip || !editingExpense) return;
    setIsUpdatingExpense(true);
    setEditError(null);
    setStatusBanner(null);
    try {
      const data = await updateTripExpenseRequest(
        getAccessToken,
        trip.id,
        editingExpense.id,
        payload
      );
      setDashboardData(data);
      setEditingExpense(null);
      setPendingResetConfirm(null);
      setStatusBanner(`Updated expense "${payload.title}" in PostgreSQL.`);
    } catch (err) {
      if (err.code === 'EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED') {
        setPendingResetConfirm({
          expense: editingExpense,
          payload,
          message: err.message,
          settledNonPayerShareCount:
            err.details?.settledNonPayerShareCount ?? 1,
        });
      } else {
        setEditError(err.message || 'Unable to update expense.');
      }
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const handleConfirmSettlementResetEdit = async () => {
    if (!trip || !pendingResetConfirm) return;
    setIsUpdatingExpense(true);
    setEditError(null);
    setStatusBanner(null);
    try {
      const data = await updateTripExpenseRequest(
        getAccessToken,
        trip.id,
        pendingResetConfirm.expense.id,
        {
          ...pendingResetConfirm.payload,
          confirmSettlementReset: true,
        }
      );
      setDashboardData(data);
      setEditingExpense(null);
      setPendingResetConfirm(null);
      setStatusBanner(
        `Updated expense "${pendingResetConfirm.payload.title}" and reset non-payer settlement states.`
      );
    } catch (err) {
      setEditError(err.message || 'Unable to update expense after confirmation.');
      setPendingResetConfirm(null);
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const handleConfirmDeleteExpense = async () => {
    if (!trip || !deletingExpense || isDeletingExpense) return;
    setIsDeletingExpense(true);
    setDeleteError(null);
    setStatusBanner(null);
    try {
      const data = await deleteTripExpenseRequest(
        getAccessToken,
        trip.id,
        deletingExpense.id
      );
      setDashboardData(data);
      const deletedTitle = deletingExpense.title;
      setDeletingExpense(null);
      if (editingExpense && editingExpense.id === deletingExpense.id) {
        setEditingExpense(null);
      }
      setStatusBanner(
        `Deleted expense "${deletedTitle}" and recalculated trip balances.`
      );
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete expense.');
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const handleToggleSettlement = async (expenseId, splitId, nextIsSettled) => {
    if (!trip || !canSettle) return;
    setSettlingSplitId(splitId);
    setSettlementError(null);
    setStatusBanner(null);
    try {
      const data = await updateExpenseSplitSettlementRequest(
        getAccessToken,
        trip.id,
        expenseId,
        splitId,
        nextIsSettled
      );
      setDashboardData(data);
      setStatusBanner(
        nextIsSettled
          ? 'Marked participant share as settled in PostgreSQL.'
          : 'Reopened participant share settlement status.'
      );
    } catch (err) {
      setSettlementError(
        err.message || 'Unable to update participant settlement status.'
      );
    } finally {
      setSettlingSplitId(null);
    }
  };

  if (!authReady) {
    return <LoadingState message="Checking authentication status..." />;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader
          title="Trip Budget & Expenses"
          subtitle="Protected financial ledger"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <EmptyState
          title="Sign-In Required to View Trip Expenses"
          message={`You are currently using demo preview persona "${currentUser.fullName}". Sign in with your Google account to manage budgets, expenses, and group settlements.`}
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={signInWithGoogle}
            >
              Sign in with Google
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingState message="Loading trip budget, expenses, and group balances from PostgreSQL..." />
    );
  }

  if (loadError || !trip) {
    return (
      <div>
        <PageHeader
          title="Trip Budget & Expenses"
          subtitle="Unable to load requested trip ledger"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <ErrorState
          title="Expenses Unavailable"
          message={
            loadError ||
            'Trip not found or you do not have access to this trip.'
          }
          onRetry={() => loadExpensesDashboard()}
        />
      </div>
    );
  }

  const roleBadgeLabel =
    accessRole === 'owner'
      ? 'Owner (Full Budget, Expense & Settlement Access)'
      : accessRole === 'member'
      ? 'Active Member (Create Expenses & Settle Own Shares)'
      : 'Viewer (Read-Only Financial View)';

  return (
    <div className="expenses-page" data-trip-id={trip.id}>
      <PageHeader
        title={`${trip.title} — Budget & Expenses`}
        subtitle={`${trip.destinationName} • ${trip.startDate} to ${trip.endDate} • Currency: ${trip.currency}`}
        actions={
          <>
            {accessibleTrips.length > 1 && (
              <div className="itinerary-trip-switcher">
                <label
                  htmlFor="expenses-trip-switch-select"
                  className="sr-only"
                >
                  Switch Trip Expenses
                </label>
                <select
                  id="expenses-trip-switch-select"
                  className="form-select"
                  aria-label="Switch Trip Expenses"
                  data-testid="expenses-trip-switcher"
                  value={trip.id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    if (nextId && nextId !== trip.id) {
                      navigate(`/trips/${nextId}/expenses`);
                    }
                  }}
                >
                  {accessibleTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      Switch Trip: {t.title} ({t.startDate} – {t.endDate})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Link
              to={`/trips/${trip.id}`}
              className="btn btn-secondary"
              data-testid="expenses-back-trip-details-link"
            >
              ← Trip Details
            </Link>
            <Link
              to={`/trips/${trip.id}/itinerary`}
              className="btn btn-secondary"
              data-testid="expenses-open-itinerary-link"
            >
              Trip Itinerary
            </Link>
            {canCreateExpense && !editingExpense && (
              <button
                type="button"
                className="btn btn-primary"
                data-testid="toggle-record-expense-btn"
                onClick={() => {
                  setCreateError(null);
                  setStatusBanner(null);
                  setIsCreateFormOpen((prev) => !prev);
                }}
              >
                {isCreateFormOpen ? 'Close Expense Form' : '+ Record Expense'}
              </button>
            )}
          </>
        }
      />

      <div className="expenses-role-bar">
        <span className={`role-badge role-badge-${accessRole}`}>
          {roleBadgeLabel}
        </span>
        <span className="expenses-participant-count">
          Active Trip Participants: <strong>{participants.length}</strong>
        </span>
      </div>

      {statusBanner && (
        <div
          className="form-alert form-alert-success"
          role="status"
          data-testid="expenses-status-banner"
        >
          {statusBanner}
        </div>
      )}

      {settlementError && (
        <div
          className="form-alert form-alert-error"
          role="alert"
          data-testid="expenses-settlement-error"
        >
          {settlementError}
        </div>
      )}

      {deleteError && (
        <div
          className="form-alert form-alert-error"
          role="alert"
          data-testid="expenses-delete-error"
        >
          {deleteError}
        </div>
      )}

      {pendingResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settlement-reset-dialog-title"
          className="feedback-box settlement-reset-dialog"
          data-testid="settlement-reset-confirm-dialog"
        >
          <h2 id="settlement-reset-dialog-title" className="feedback-title">
            Confirm Settlement Reset Before Saving Financial Changes
          </h2>
          <p className="feedback-message">
            {pendingResetConfirm.message ||
              `Changing the amount, payer, or split allocations for "${pendingResetConfirm.expense.title}" will reset ${pendingResetConfirm.settledNonPayerShareCount} settled non-payer share(s) back to Pending.`}
          </p>
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="cancel-settlement-reset-btn"
              onClick={() => setPendingResetConfirm(null)}
              disabled={isUpdatingExpense}
            >
              Cancel Edit
            </button>
            <button
              type="button"
              className="btn btn-danger"
              data-testid="confirm-settlement-reset-btn"
              onClick={handleConfirmSettlementResetEdit}
              disabled={isUpdatingExpense}
            >
              {isUpdatingExpense
                ? 'Resetting & Saving...'
                : 'Confirm & Reset Settlements'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingExpense)}
        title="Delete Expense Record?"
        message={
          deletingExpense
            ? `Are you sure you want to permanently delete "${deletingExpense.title}" (${trip.currency} ${deletingExpense.amount})? Its split allocations and settlement records will be removed via PostgreSQL ON DELETE CASCADE and group balances will be recalculated.`
            : ''
        }
        confirmLabel={isDeletingExpense ? 'Deleting...' : 'Delete Expense'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteExpense}
        onCancel={() => {
          if (!isDeletingExpense) {
            setDeletingExpense(null);
            setDeleteError(null);
          }
        }}
      />

      <BudgetOverview
        trip={trip}
        budgetSummary={budgetSummary}
        isOwner={isOwner}
        onUpdatePlannedBudget={handleUpdatePlannedBudget}
        isUpdatingBudget={isUpdatingBudget}
        budgetError={budgetError}
      />

      {canCreateExpense && isCreateFormOpen && !editingExpense && (
        <ExpenseForm
          participants={participants}
          categories={categories}
          currency={trip.currency}
          defaultDate={trip.startDate}
          defaultPayerId={currentDbUserId}
          initialExpense={null}
          submitLabel="Record Expense"
          onSubmit={handleCreateExpense}
          onCancel={() => {
            setIsCreateFormOpen(false);
            setCreateError(null);
          }}
          isSubmitting={isCreating}
          serverError={createError}
        />
      )}

      {editingExpense && (
        <div
          className="expense-edit-panel-wrapper"
          data-testid="expense-edit-panel"
        >
          <ExpenseForm
            participants={participants}
            categories={categories}
            currency={trip.currency}
            defaultDate={trip.startDate}
            defaultPayerId={currentDbUserId}
            initialExpense={editingExpense}
            submitLabel="Save Expense Changes"
            onSubmit={handleUpdateExpense}
            onCancel={() => {
              setEditingExpense(null);
              setEditError(null);
              setPendingResetConfirm(null);
            }}
            isSubmitting={isUpdatingExpense}
            serverError={editError}
          />
        </div>
      )}

      <div className="expense-analytics-grid">
        <CategoryBreakdown
          categoryBreakdown={categoryBreakdown}
          currency={trip.currency}
          totalExpenses={budgetSummary?.totalExpenses || '0.00'}
        />

        <GroupSettlementPanel
          participantBalances={participantBalances}
          settlementSummary={settlementSummary}
          currency={trip.currency}
          currentUserId={currentDbUserId}
        />
      </div>

      <ExpenseList
        expenses={expenses}
        categories={categories}
        currency={trip.currency}
        canCreateExpense={canCreateExpense}
        onOpenCreateForm={() => {
          setEditingExpense(null);
          setCreateError(null);
          setIsCreateFormOpen(true);
        }}
        onToggleSettlement={handleToggleSettlement}
        busySplitId={settlingSplitId}
        onEditExpense={(exp) => {
          setIsCreateFormOpen(false);
          setEditError(null);
          setPendingResetConfirm(null);
          setEditingExpense(exp);
        }}
        onDeleteExpense={(exp) => {
          setDeleteError(null);
          setDeletingExpense(exp);
        }}
      />
    </div>
  );
}
