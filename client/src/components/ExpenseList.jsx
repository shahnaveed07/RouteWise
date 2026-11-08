import { useMemo, useState } from 'react';
import EmptyState from './EmptyState.jsx';
import ExpenseCard from './ExpenseCard.jsx';
import { EXPENSE_CATEGORIES, sumMoneyStrings } from '../services/expenseService.jsx';

export default function ExpenseList({
  expenses = [],
  categories = EXPENSE_CATEGORIES,
  currency = 'INR',
  canCreateExpense = false,
  onOpenCreateForm,
  onEditExpense,
  onDeleteExpense,
  onToggleSettlement,
  busySplitId = null,
}) {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [settlementFilter, setSettlementFilter] = useState('ALL');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {
        return false;
      }
      if (
        settlementFilter === 'PENDING' &&
        exp.settlementProgress?.isFullySettled
      ) {
        return false;
      }
      if (
        settlementFilter === 'SETTLED' &&
        !exp.settlementProgress?.isFullySettled
      ) {
        return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, settlementFilter]);

  const filteredSubtotal = useMemo(
    () => sumMoneyStrings(filteredExpenses.map((e) => e.amount)),
    [filteredExpenses]
  );

  return (
    <section
      className="card expense-list-section"
      aria-label="Recorded Trip Expenses"
      data-testid="expense-list-section"
    >
      <div className="expense-panel-header">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>
            Recorded Trip Expenses
          </h2>
          <p className="field-hint" style={{ marginTop: '0.2rem' }}>
            Persisted expense ledger with participant split allocations and settlement tracking.
          </p>
        </div>

        {expenses.length > 0 && (
          <div className="expense-filters-row">
            <div className="expense-filter-control">
              <label htmlFor="expense-category-filter" className="sr-only">
                Filter by Category
              </label>
              <select
                id="expense-category-filter"
                className="form-select"
                aria-label="Filter by Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                data-testid="expense-category-filter"
              >
                <option value="ALL">All Categories ({expenses.length})</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="expense-filter-control">
              <label htmlFor="expense-settlement-filter" className="sr-only">
                Filter by Settlement State
              </label>
              <select
                id="expense-settlement-filter"
                className="form-select"
                aria-label="Filter by Settlement State"
                value={settlementFilter}
                onChange={(e) => setSettlementFilter(e.target.value)}
                data-testid="expense-settlement-filter"
              >
                <option value="ALL">All Settlement States</option>
                <option value="PENDING">Has Pending Shares</option>
                <option value="SETTLED">Fully Settled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          title="No Expenses Recorded Yet"
          message={
            canCreateExpense
              ? 'Record your first trip expense above to track actual spending against your planned budget and split costs across participants.'
              : 'No expenses have been recorded for this trip yet.'
          }
          action={
            canCreateExpense && typeof onOpenCreateForm === 'function' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onOpenCreateForm}
                data-testid="empty-record-expense-btn"
              >
                + Record First Expense
              </button>
            ) : null
          }
        />
      ) : filteredExpenses.length === 0 ? (
        <div className="expense-empty-inline">
          No expenses match the selected filter criteria.{' '}
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => {
              setCategoryFilter('ALL');
              setSettlementFilter('ALL');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="expense-list-subheader tabular-nums">
            <span>
              Showing {filteredExpenses.length} of {expenses.length}{' '}
              {expenses.length === 1 ? 'expense' : 'expenses'}
            </span>
            <span>
              Filtered Subtotal: <strong>{currency} {filteredSubtotal}</strong>
            </span>
          </div>

          <div className="expense-cards-stack" data-testid="expense-cards-stack">
            {filteredExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currency={currency}
                onEdit={onEditExpense}
                onDelete={onDeleteExpense}
                onToggleSettlement={onToggleSettlement}
                busySplitId={busySplitId}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
