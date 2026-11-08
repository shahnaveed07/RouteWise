import {
  compareMoneyStrings,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  splitAmountEquallyPreview,
  subtractMoneyStrings,
  sumMoneyStrings,
} from '../services/expenseService.jsx';

export default function ExpenseSplitEditor({
  mode = 'equal',
  onModeChange,
  participants = [],
  paidByUserId = '',
  amount = '',
  selectedParticipantIds = [],
  onSelectedParticipantIdsChange,
  customSharesMap = {},
  onCustomSharesMapChange,
  currency = 'INR',
  disabled = false,
}) {
  const equalPreview = splitAmountEquallyPreview(amount, selectedParticipantIds);
  const equalShareLookup = new Map(
    equalPreview.shares.map((s) => [s.userId, s.shareAmount])
  );

  const amountMinor = decimalToMinorUnits(amount, {
    allowZero: false,
    allowNegative: false,
  });
  const formattedExpenseTotal =
    amountMinor !== null ? minorUnitsToDecimal(amountMinor) : '0.00';

  const activeCustomParticipantIds = participants
    .map((p) => p.userId)
    .filter((id) => Object.prototype.hasOwnProperty.call(customSharesMap, id));

  const validCustomShareStrings = [];
  let hasInvalidCustomEntry = false;

  for (const userId of activeCustomParticipantIds) {
    const rawShare = customSharesMap[userId];
    const minor = decimalToMinorUnits(rawShare, {
      allowZero: false,
      allowNegative: false,
    });
    if (minor === null) {
      hasInvalidCustomEntry = true;
    } else {
      validCustomShareStrings.push(minorUnitsToDecimal(minor));
    }
  }

  const totalCustomAllocated = sumMoneyStrings(validCustomShareStrings);
  const remainingUnallocated =
    amountMinor !== null
      ? subtractMoneyStrings(formattedExpenseTotal, totalCustomAllocated)
      : '0.00';
  const customComparison =
    amountMinor !== null
      ? compareMoneyStrings(totalCustomAllocated, formattedExpenseTotal)
      : null;

  const isOverAllocated = customComparison === 1;
  const isExactCustomMatch =
    amountMinor !== null &&
    activeCustomParticipantIds.length > 0 &&
    !hasInvalidCustomEntry &&
    customComparison === 0;

  const handleToggleEqualParticipant = (userId) => {
    if (disabled) return;
    const exists = selectedParticipantIds.includes(userId);
    if (exists) {
      onSelectedParticipantIdsChange(
        selectedParticipantIds.filter((id) => id !== userId)
      );
    } else {
      const orderedNext = participants
        .map((p) => p.userId)
        .filter((id) => id === userId || selectedParticipantIds.includes(id));
      onSelectedParticipantIdsChange(orderedNext);
    }
  };

  const handleToggleCustomParticipant = (userId) => {
    if (disabled) return;
    const nextMap = { ...customSharesMap };
    if (Object.prototype.hasOwnProperty.call(nextMap, userId)) {
      delete nextMap[userId];
    } else {
      nextMap[userId] = '';
    }
    onCustomSharesMapChange(nextMap);
  };

  const handleCustomShareInput = (userId, value) => {
    if (disabled) return;
    onCustomSharesMapChange({
      ...customSharesMap,
      [userId]: value,
    });
  };

  const handlePrefillCustomFromEqual = () => {
    if (disabled) return;
    const targetIds =
      activeCustomParticipantIds.length > 0
        ? activeCustomParticipantIds
        : participants.map((p) => p.userId);
    const preview = splitAmountEquallyPreview(amount, targetIds);
    if (!preview.valid) return;
    const nextMap = {};
    for (const share of preview.shares) {
      nextMap[share.userId] = share.shareAmount;
    }
    onCustomSharesMapChange(nextMap);
  };

  return (
    <div className="expense-split-editor" data-testid="expense-split-editor">
      <div className="split-editor-header">
        <div>
          <span className="form-label" style={{ marginBottom: 0 }}>
            Expense Split Allocation
          </span>
          <p className="field-hint" style={{ marginTop: '0.15rem' }}>
            Choose equal minor-unit distribution or enter custom participant shares that sum to the expense total.
          </p>
        </div>

        <div
          className="split-mode-toggle"
          role="group"
          aria-label="Expense split mode"
        >
          <button
            type="button"
            className={`split-mode-btn ${
              mode === 'equal' ? 'split-mode-btn-active' : ''
            }`}
            onClick={() => onModeChange('equal')}
            disabled={disabled}
            data-testid="split-mode-equal-btn"
          >
            Equal Split
          </button>
          <button
            type="button"
            className={`split-mode-btn ${
              mode === 'custom' ? 'split-mode-btn-active' : ''
            }`}
            onClick={() => onModeChange('custom')}
            disabled={disabled}
            data-testid="split-mode-custom-btn"
          >
            Custom Split
          </button>
        </div>
      </div>

      {mode === 'equal' ? (
        <div className="split-equal-panel" data-testid="split-equal-panel">
          <div className="split-toolbar-row">
            <span className="expense-meta-inline">
              {selectedParticipantIds.length} of {participants.length}{' '}
              {participants.length === 1 ? 'participant' : 'participants'} selected
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              disabled={disabled}
              onClick={() =>
                onSelectedParticipantIdsChange(participants.map((p) => p.userId))
              }
              data-testid="equal-select-all-btn"
            >
              Select All Participants
            </button>
          </div>

          {!equalPreview.valid && (
            <p
              className="split-validation-hint"
              data-testid="equal-split-hint"
            >
              {equalPreview.error}
            </p>
          )}

          <ul className="split-participants-list">
            {participants.map((participant) => {
              const isSelected = selectedParticipantIds.includes(
                participant.userId
              );
              const shareAmount = equalShareLookup.get(participant.userId);
              const isPayer = participant.userId === paidByUserId;

              return (
                <li
                  key={participant.userId}
                  className={`split-participant-row ${
                    isSelected ? 'split-participant-row-selected' : ''
                  }`}
                >
                  <label className="split-participant-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        handleToggleEqualParticipant(participant.userId)
                      }
                      disabled={disabled}
                      data-testid={`equal-split-checkbox-${participant.userId}`}
                    />
                    <span className="split-participant-name">
                      {participant.displayName}
                    </span>
                    <span className="expense-meta-inline" aria-hidden="true">
                      ·
                    </span>
                    <span className="expense-meta-inline">
                      {participant.tripRole}
                    </span>
                    {isPayer && (
                      <>
                        <span className="expense-meta-inline" aria-hidden="true">
                          ·
                        </span>
                        <span className="payer-inline-tag">
                          Payer (Own share covered)
                        </span>
                      </>
                    )}
                  </label>

                  <div className="split-share-preview tabular-nums">
                    {isSelected && shareAmount ? (
                      <strong
                        data-testid={`equal-share-preview-${participant.userId}`}
                      >
                        {currency} {shareAmount}
                      </strong>
                    ) : (
                      <span className="expense-meta-inline">Not included</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="split-custom-panel" data-testid="split-custom-panel">
          <div className="custom-split-reconcile-bar tabular-nums">
            <div className="reconcile-metric">
              <span className="expense-meta-inline">Expense Total</span>
              <strong data-testid="custom-split-expense-total">
                {currency} {formattedExpenseTotal}
              </strong>
            </div>
            <div className="reconcile-metric">
              <span className="expense-meta-inline">Total Allocated</span>
              <strong data-testid="custom-split-allocated-total">
                {currency} {totalCustomAllocated}
              </strong>
            </div>
            <div className="reconcile-metric">
              <span className="expense-meta-inline">
                {isOverAllocated ? 'Over-Allocated By' : 'Remaining Unallocated'}
              </span>
              <strong
                className={
                  isExactCustomMatch
                    ? 'amount-receivable'
                    : isOverAllocated
                    ? 'amount-payable'
                    : ''
                }
                data-testid="custom-split-remaining"
              >
                {currency}{' '}
                {isOverAllocated
                  ? remainingUnallocated.replace(/^-/, '')
                  : remainingUnallocated}
              </strong>
            </div>
            {amountMinor !== null && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={handlePrefillCustomFromEqual}
                disabled={disabled}
                data-testid="custom-prefill-equal-btn"
              >
                Distribute Equally
              </button>
            )}
          </div>

          {isOverAllocated && (
            <div
              className="form-alert form-alert-error"
              role="alert"
              data-testid="custom-split-overallocated-warning"
              style={{ marginBottom: '0.65rem' }}
            >
              Over-Allocation Warning: Custom shares ({currency}{' '}
              {totalCustomAllocated}) exceed the expense total ({currency}{' '}
              {formattedExpenseTotal}). Reduce shares by {currency}{' '}
              {remainingUnallocated.replace(/^-/, '')}.
            </div>
          )}

          {!isOverAllocated && !isExactCustomMatch && (
            <p
              className="split-validation-hint"
              data-testid="custom-split-status"
            >
              {amountMinor === null
                ? 'Enter a valid positive expense amount first.'
                : activeCustomParticipantIds.length === 0
                ? 'Select at least one participant and enter their share amount.'
                : hasInvalidCustomEntry
                ? 'Every selected participant must have a positive share amount (> 0.00, up to 2 decimal places).'
                : `Remaining unallocated amount: ${currency} ${remainingUnallocated}. Total shares must equal ${currency} ${formattedExpenseTotal}.`}
            </p>
          )}

          <ul className="split-participants-list">
            {participants.map((participant) => {
              const isIncluded = Object.prototype.hasOwnProperty.call(
                customSharesMap,
                participant.userId
              );
              const shareVal = isIncluded
                ? customSharesMap[participant.userId]
                : '';
              const isPayer = participant.userId === paidByUserId;

              return (
                <li
                  key={participant.userId}
                  className={`split-participant-row ${
                    isIncluded ? 'split-participant-row-selected' : ''
                  }`}
                >
                  <label className="split-participant-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() =>
                        handleToggleCustomParticipant(participant.userId)
                      }
                      disabled={disabled}
                      data-testid={`custom-split-checkbox-${participant.userId}`}
                    />
                    <span className="split-participant-name">
                      {participant.displayName}
                    </span>
                    <span className="expense-meta-inline" aria-hidden="true">
                      ·
                    </span>
                    <span className="expense-meta-inline">
                      {participant.tripRole}
                    </span>
                    {isPayer && (
                      <>
                        <span className="expense-meta-inline" aria-hidden="true">
                          ·
                        </span>
                        <span className="payer-inline-tag">
                          Payer (Own share covered)
                        </span>
                      </>
                    )}
                  </label>

                  {isIncluded ? (
                    <div className="custom-share-input-group">
                      <span className="custom-currency-prefix">{currency}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-input custom-share-input tabular-nums"
                        placeholder="0.00"
                        aria-label={`Custom share amount for ${participant.displayName}`}
                        value={shareVal}
                        onChange={(e) =>
                          handleCustomShareInput(
                            participant.userId,
                            e.target.value
                          )
                        }
                        disabled={disabled}
                        data-testid={`custom-share-input-${participant.userId}`}
                      />
                    </div>
                  ) : (
                    <span className="expense-meta-inline">Not included</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
