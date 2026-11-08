import { useEffect, useState } from 'react';
import { decimalToMinorUnits, minorUnitsToDecimal } from '../services/expenseService.jsx';

export default function BudgetOverview({
  budgetSummary,
  isOwner = false,
  onUpdatePlannedBudget,
  isUpdatingBudget = false,
}) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    budgetSummary?.plannedBudget || '0.00'
  );
  const [budgetError, setBudgetError] = useState(null);

  useEffect(() => {
    setBudgetInput(budgetSummary?.plannedBudget || '0.00');
  }, [budgetSummary?.plannedBudget]);

  if (!budgetSummary) {
    return null;
  }

  const {
    currency = 'INR',
    plannedBudget = '0.00',
    hasPlannedBudget = false,
    totalExpenses = '0.00',
    remainingBudget = '0.00',
    budgetUsagePercentage = null,
    budgetState = 'NO_BUDGET_SET',
    isOverBudget = false,
    overBudgetAmount = '0.00',
    expenseCount = 0,
    itineraryEstimatedTotal = '0.00',
  } = budgetSummary;

  const progressWidth =
    budgetUsagePercentage === null
      ? 0
      : Math.min(100, Math.max(0, Number(budgetUsagePercentage)));

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    setBudgetError(null);

    const minor = decimalToMinorUnits(budgetInput, {
      allowZero: true,
      allowNegative: false,
    });
    if (minor === null) {
      setBudgetError(
        'Enter a non-negative budget amount with up to 2 decimal places (max 9999999999.99).'
      );
      return;
    }

    try {
      await onUpdatePlannedBudget(minorUnitsToDecimal(minor));
      setIsEditingBudget(false);
    } catch (err) {
      setBudgetError(err.message || 'Unable to update planned trip budget.');
    }
  };

  return (
    <section
      className="card expense-budget-overview"
      aria-label="Trip Budget Overview"
      data-testid="budget-overview-panel"
    >
      <div className="expense-panel-header">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>
            Budget &amp; Spending Overview
          </h2>
          <p className="field-hint" style={{ marginTop: '0.2rem' }}>
            Actual recorded expenses compared against the trip&apos;s planned budget in PostgreSQL.
          </p>
        </div>

        {isOwner && !isEditingBudget && typeof onUpdatePlannedBudget === 'function' && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setBudgetError(null);
              setBudgetInput(plannedBudget);
              setIsEditingBudget(true);
            }}
            data-testid="edit-planned-budget-btn"
          >
            {hasPlannedBudget ? 'Update Planned Budget' : 'Set Planned Budget'}
          </button>
        )}
      </div>

      {isOwner && isEditingBudget && (
        <form
          className="budget-inline-edit-form"
          onSubmit={handleBudgetSubmit}
          data-testid="planned-budget-form"
        >
          <div className="budget-inline-row">
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 220px' }}>
              <label htmlFor="planned-budget-input" className="form-label">
                Planned Trip Budget ({currency})
              </label>
              <input
                id="planned-budget-input"
                type="text"
                inputMode="decimal"
                className="form-input tabular-nums"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                disabled={isUpdatingBudget}
                placeholder="e.g. 50000.00"
                data-testid="planned-budget-input"
              />
            </div>
            <div className="budget-inline-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setBudgetError(null);
                  setIsEditingBudget(false);
                }}
                disabled={isUpdatingBudget}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isUpdatingBudget}
                data-testid="save-planned-budget-btn"
              >
                {isUpdatingBudget ? 'Saving...' : 'Save Budget'}
              </button>
            </div>
          </div>
          {budgetError && (
            <p className="form-error" role="alert" style={{ marginTop: '0.4rem' }}>
              {budgetError}
            </p>
          )}
        </form>
      )}

      {isOverBudget && (
        <div
          className="expense-over-budget-banner"
          role="alert"
          data-testid="over-budget-warning"
        >
          <strong>Budget Exceeded:</strong> Actual recorded expenses ({currency}{' '}
          <span className="tabular-nums">{totalExpenses}</span>) exceed the planned budget ({currency}{' '}
          <span className="tabular-nums">{plannedBudget}</span>) by{' '}
          <strong className="tabular-nums">
            {currency} {overBudgetAmount}
          </strong>
          . Expense recording remains unlocked.
        </div>
      )}

      <div className="budget-metrics-grid">
        <div className="budget-metric-box">
          <span className="budget-metric-label">Planned Budget</span>
          <strong
            className="budget-metric-value tabular-nums"
            data-testid="budget-planned-value"
          >
            {currency} {plannedBudget}
          </strong>
          <span className="budget-metric-sub">
            {hasPlannedBudget ? 'Target trip ceiling' : 'No planned budget configured (0.00)'}
          </span>
        </div>

        <div className="budget-metric-box">
          <span className="budget-metric-label">Actual Recorded Spending</span>
          <strong
            className="budget-metric-value tabular-nums"
            data-testid="budget-actual-spending"
          >
            {currency} {totalExpenses}
          </strong>
          <span className="budget-metric-sub">
            Across {expenseCount} {expenseCount === 1 ? 'persisted expense' : 'persisted expenses'}
          </span>
        </div>

        <div className="budget-metric-box">
          <span className="budget-metric-label">Remaining Budget</span>
          <strong
            className={`budget-metric-value tabular-nums ${
              isOverBudget ? 'budget-value-negative' : ''
            }`}
            data-testid="budget-remaining-value"
          >
            {currency} {remainingBudget}
          </strong>
          <span className="budget-metric-sub">
            {!hasPlannedBudget
              ? 'Net against 0.00 planned budget'
              : isOverBudget
              ? `Over budget by ${currency} ${overBudgetAmount}`
              : 'Available within planned budget'}
          </span>
        </div>

        <div className="budget-metric-box budget-metric-box-muted">
          <span className="budget-metric-label">
            Itinerary Estimated Cost (Separate)
          </span>
          <strong
            className="budget-metric-value tabular-nums"
            data-testid="budget-itinerary-estimated"
          >
            {currency} {itineraryEstimatedTotal}
          </strong>
          <span className="budget-metric-sub">
            Day-wise schedule estimate · Not included in actual spending
          </span>
        </div>
      </div>

      <div className="budget-progress-section" data-testid="budget-progress-section">
        <div className="budget-progress-header">
          <span className="budget-progress-title">
            {budgetState === 'NO_BUDGET_SET'
              ? 'Budget Usage: No Planned Budget Set (0.00)'
              : budgetState === 'OVER_BUDGET'
              ? 'Budget Usage: Over Planned Budget'
              : 'Budget Usage'}
          </span>
          <span
            className="budget-progress-pct tabular-nums"
            data-testid="budget-usage-percentage"
          >
            {budgetUsagePercentage !== null
              ? `${Number(budgetUsagePercentage).toFixed(2)}% used`
              : 'No budget ceiling set'}
          </span>
        </div>

        <div
          className="budget-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            budgetUsagePercentage !== null
              ? Math.round(Math.min(100, Number(budgetUsagePercentage)))
              : 0
          }
          aria-label="Planned budget usage progress"
        >
          <div
            className={`budget-progress-fill ${
              isOverBudget
                ? 'budget-progress-fill-over'
                : progressWidth >= 85
                ? 'budget-progress-fill-warn'
                : 'budget-progress-fill-ok'
            }`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>
    </section>
  );
}
