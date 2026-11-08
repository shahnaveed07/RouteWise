import { useEffect, useMemo, useState } from 'react';
import ExpenseSplitEditor from './ExpenseSplitEditor.jsx';
import {
  EXPENSE_CATEGORIES,
  compareMoneyStrings,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  splitAmountEquallyPreview,
  sumMoneyStrings,
} from '../services/expenseService.jsx';

export default function ExpenseForm({
  participants = [],
  categories = EXPENSE_CATEGORIES,
  currency = 'INR',
  defaultDate = '',
  defaultPayerId = '',
  initialExpense = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Record Expense',
  serverError = null,
}) {
  const isEditMode = Boolean(initialExpense);

  const [title, setTitle] = useState(initialExpense?.title || '');
  const [amount, setAmount] = useState(initialExpense?.amount || '');
  const [category, setCategory] = useState(
    initialExpense?.category || 'accommodation'
  );
  const [expenseDate, setExpenseDate] = useState(
    initialExpense?.expenseDate || defaultDate || ''
  );
  const [paidByUserId, setPaidByUserId] = useState(
    initialExpense?.paidByUserId ||
      defaultPayerId ||
      participants[0]?.userId ||
      ''
  );
  const [notes, setNotes] = useState(initialExpense?.notes || '');
  const [splitMode, setSplitMode] = useState(
    initialExpense?.splitMode || 'equal'
  );

  const [selectedParticipantIds, setSelectedParticipantIds] = useState(() => {
    if (initialExpense && Array.isArray(initialExpense.splits)) {
      return initialExpense.splits.map((s) => s.userId);
    }
    return participants.map((p) => p.userId);
  });

  const [customSharesMap, setCustomSharesMap] = useState(() => {
    if (initialExpense && Array.isArray(initialExpense.splits)) {
      const map = {};
      for (const s of initialExpense.splits) {
        map[s.userId] = s.shareAmount;
      }
      return map;
    }
    const map = {};
    for (const p of participants) {
      map[p.userId] = '';
    }
    return map;
  });

  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!initialExpense && participants.length > 0) {
      setPaidByUserId((prev) => prev || defaultPayerId || participants[0].userId);
      setSelectedParticipantIds((prev) =>
        prev.length > 0 ? prev : participants.map((p) => p.userId)
      );
    }
  }, [initialExpense, participants, defaultPayerId]);

  const handleModeChange = (nextMode) => {
    if (nextMode === splitMode) return;
    if (nextMode === 'custom') {
      const targetIds =
        selectedParticipantIds.length > 0
          ? selectedParticipantIds
          : participants.map((p) => p.userId);
      const preview = splitAmountEquallyPreview(amount, targetIds);
      const nextMap = {};
      if (preview.valid) {
        for (const s of preview.shares) {
          nextMap[s.userId] = s.shareAmount;
        }
      } else {
        for (const id of targetIds) {
          nextMap[id] = customSharesMap[id] || '';
        }
      }
      setCustomSharesMap(nextMap);
    } else if (nextMode === 'equal') {
      const customIds = participants
        .map((p) => p.userId)
        .filter((id) => Object.prototype.hasOwnProperty.call(customSharesMap, id));
      if (customIds.length > 0) {
        setSelectedParticipantIds(customIds);
      }
    }
    setSplitMode(nextMode);
    setFormError(null);
  };

  const splitReadiness = useMemo(() => {
    const amountMinor = decimalToMinorUnits(amount, {
      allowZero: false,
      allowNegative: false,
    });
    if (amountMinor === null) {
      return {
        valid: false,
        reason: 'Enter a positive expense amount with at most 2 decimal places.',
      };
    }

    const normalizedAmount = minorUnitsToDecimal(amountMinor);

    if (splitMode === 'equal') {
      const preview = splitAmountEquallyPreview(
        normalizedAmount,
        selectedParticipantIds
      );
      return {
        valid: preview.valid,
        reason: preview.error,
        normalizedAmount,
      };
    }

    const activeCustomIds = participants
      .map((p) => p.userId)
      .filter((id) => Object.prototype.hasOwnProperty.call(customSharesMap, id));

    if (activeCustomIds.length === 0) {
      return {
        valid: false,
        reason: 'Select at least one participant for the custom split.',
      };
    }

    const shares = [];
    for (const userId of activeCustomIds) {
      const minor = decimalToMinorUnits(customSharesMap[userId], {
        allowZero: false,
        allowNegative: false,
      });
      if (minor === null) {
        return {
          valid: false,
          reason:
            'Every selected custom-split participant must have a positive share amount (> 0.00).',
        };
      }
      shares.push({
        userId,
        shareAmount: minorUnitsToDecimal(minor),
      });
    }

    const sumStr = sumMoneyStrings(shares.map((s) => s.shareAmount));
    if (compareMoneyStrings(sumStr, normalizedAmount) !== 0) {
      return {
        valid: false,
        reason: `Custom shares sum to ${currency} ${sumStr}, which must equal the expense total of ${currency} ${normalizedAmount}.`,
      };
    }

    return {
      valid: true,
      reason: null,
      normalizedAmount,
      customShares: shares,
    };
  }, [amount, splitMode, selectedParticipantIds, customSharesMap, participants, currency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length > 180) {
      setFormError('Expense title is required (1 to 180 characters).');
      return;
    }

    if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      setFormError('Please select a valid expense date (YYYY-MM-DD).');
      return;
    }

    if (!paidByUserId) {
      setFormError('Please select which trip participant paid for this expense.');
      return;
    }

    if (!splitReadiness.valid) {
      setFormError(
        splitReadiness.reason || 'Please resolve the split allocation before saving.'
      );
      return;
    }

    const payload = {
      title: trimmedTitle,
      amount: splitReadiness.normalizedAmount,
      category,
      expenseDate,
      paidByUserId,
      notes: notes.trim() ? notes.trim() : null,
      split:
        splitMode === 'equal'
          ? {
              mode: 'equal',
              participantIds: selectedParticipantIds,
            }
          : {
              mode: 'custom',
              shares: splitReadiness.customShares,
            },
    };

    try {
      await onSubmit(payload);
      if (!isEditMode) {
        setTitle('');
        setAmount('');
        setNotes('');
        setSelectedParticipantIds(participants.map((p) => p.userId));
      }
    } catch (err) {
      if (err?.code === 'EXPENSE_SETTLEMENT_RESET_CONFIRMATION_REQUIRED') {
        return;
      }
      setFormError(err.message || 'Unable to save expense record.');
    }
  };

  return (
    <form
      className="card expense-form-card"
      onSubmit={handleSubmit}
      data-testid={isEditMode ? 'edit-expense-form' : 'create-expense-form'}
    >
      <div className="expense-panel-header">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>
            {isEditMode ? `Edit Expense: ${initialExpense.title}` : 'Record New Trip Expense'}
          </h2>
          <p className="field-hint" style={{ marginTop: '0.2rem' }}>
            {isEditMode
              ? 'Update expense details or participant split allocations.'
              : 'Enter the actual amount spent, select who paid, and allocate shares across active participants.'}
          </p>
        </div>
      </div>

      {(formError || serverError) && (
        <div
          className="form-alert form-alert-error"
          role="alert"
          data-testid="expense-form-error"
        >
          {formError || serverError}
        </div>
      )}

      <div className="form-row-grid">
        <div className="form-group">
          <label htmlFor="expense-title-input" className="form-label">
            Expense Title *
          </label>
          <input
            id="expense-title-input"
            type="text"
            className="form-input"
            maxLength={180}
            placeholder="e.g. Dal Lake Houseboat Stay"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            required
            data-testid="expense-title-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="expense-amount-input" className="form-label">
            Amount ({currency}) *
          </label>
          <input
            id="expense-amount-input"
            type="text"
            inputMode="decimal"
            className="form-input tabular-nums"
            placeholder="e.g. 6000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
            required
            data-testid="expense-amount-input"
          />
        </div>
      </div>

      <div className="form-row-grid form-row-three">
        <div className="form-group">
          <label htmlFor="expense-category-select" className="form-label">
            Category *
          </label>
          <select
            id="expense-category-select"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSubmitting}
            data-testid="expense-category-select"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="expense-date-input" className="form-label">
            Expense Date *
          </label>
          <input
            id="expense-date-input"
            type="date"
            className="form-input tabular-nums"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            disabled={isSubmitting}
            required
            data-testid="expense-date-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="expense-payer-select" className="form-label">
            Paid By *
          </label>
          <select
            id="expense-payer-select"
            className="form-select"
            value={paidByUserId}
            onChange={(e) => setPaidByUserId(e.target.value)}
            disabled={isSubmitting}
            data-testid="expense-payer-select"
          >
            {participants.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.displayName} ({p.tripRole})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="expense-notes-input" className="form-label">
          Notes (Optional)
        </label>
        <textarea
          id="expense-notes-input"
          className="form-textarea"
          rows={2}
          maxLength={5000}
          placeholder="Receipt reference, booking details, or context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          data-testid="expense-notes-input"
        />
      </div>

      <ExpenseSplitEditor
        mode={splitMode}
        onModeChange={handleModeChange}
        participants={participants}
        paidByUserId={paidByUserId}
        amount={amount}
        selectedParticipantIds={selectedParticipantIds}
        onSelectedParticipantIdsChange={setSelectedParticipantIds}
        customSharesMap={customSharesMap}
        onCustomSharesMapChange={setCustomSharesMap}
        currency={currency}
        disabled={isSubmitting}
      />

      <div className="form-actions" style={{ marginTop: '1rem' }}>
        {typeof onCancel === 'function' && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="expense-form-cancel-btn"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={
            isSubmitting ||
            !title.trim() ||
            !expenseDate ||
            !paidByUserId ||
            !splitReadiness.valid
          }
          data-testid="expense-form-submit-btn"
        >
          {isSubmitting ? 'Saving Expense...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
