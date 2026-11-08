function formatAuditTimestamp(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString).slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch (_err) {
    return String(isoString).slice(0, 10);
  }
}

export default function ExpenseCard({
  expense,
  currency = 'INR',
  onEdit,
  onDelete,
  onToggleSettlement,
  busySplitId = null,
}) {
  if (!expense) return null;

  const {
    id,
    title,
    amount,
    category,
    categoryLabel,
    expenseDate,
    paidByUserName,
    createdByUserName,
    notes,
    splitMode,
    splits = [],
    settlementProgress = {},
    permissions = {},
  } = expense;

  const {
    nonPayerSplitCount = 0,
    settledNonPayerSplitCount = 0,
    pendingAmount = '0.00',
    isFullySettled = true,
  } = settlementProgress;

  return (
    <article
      className="expense-card"
      data-testid={`expense-card-${id}`}
    >
      <div className="expense-card-top">
        <div className="expense-card-main">
          <div className="expense-card-meta-line">
            <span data-testid={`expense-category-${id}`}>{categoryLabel || category}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums" data-testid={`expense-date-${id}`}>
              {expenseDate}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Paid by <strong data-testid={`expense-payer-${id}`}>{paidByUserName}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {splits.length} {splits.length === 1 ? 'participant' : 'participants'} ({splitMode === 'equal' ? 'Equal split' : 'Custom split'})
            </span>
          </div>

          <h3 className="expense-card-title" data-testid={`expense-title-${id}`}>
            {title}
          </h3>

          {notes && (
            <p className="expense-card-notes" data-testid={`expense-notes-${id}`}>
              {notes}
            </p>
          )}
        </div>

        <div className="expense-card-amount-col tabular-nums">
          <strong
            className="expense-card-amount"
            data-testid={`expense-amount-${id}`}
          >
            {currency} {amount}
          </strong>
          <span
            className={`expense-settlement-summary-text ${
              isFullySettled ? 'amount-receivable' : 'amount-payable'
            }`}
            data-testid={`expense-settlement-summary-${id}`}
          >
            {nonPayerSplitCount === 0
              ? 'Payer sole participant (Covered)'
              : isFullySettled
              ? `All ${nonPayerSplitCount} participant shares settled`
              : `${settledNonPayerSplitCount}/${nonPayerSplitCount} settled · ${currency} ${pendingAmount} pending`}
          </span>
        </div>
      </div>

      <div className="expense-splits-section">
        <div className="expense-splits-header">
          <span className="detail-subheading" style={{ margin: 0 }}>
            Participant Split &amp; Settlement Breakdown
          </span>
          <span className="expense-meta-inline">
            Recorded by {createdByUserName}
          </span>
        </div>

        <ul className="expense-splits-list" data-testid={`expense-splits-list-${id}`}>
          {splits.map((split) => {
            const isBusy = busySplitId === split.id;
            const settledDateText = formatAuditTimestamp(split.settledAt);

            return (
              <li
                key={split.id}
                className="expense-split-row"
                data-testid={`expense-split-row-${split.id}`}
              >
                <div className="expense-split-person">
                  <strong className="expense-split-name">{split.userName}</strong>
                  <span className="expense-meta-inline" aria-hidden="true">
                    ·
                  </span>
                  {split.isPayerShare ? (
                    <span
                      className="split-state-text split-state-covered"
                      data-testid={`split-status-${split.id}`}
                    >
                      Covered by Payer (Paid upfront)
                    </span>
                  ) : split.isSettled ? (
                    <span
                      className="split-state-text split-state-settled"
                      data-testid={`split-status-${split.id}`}
                    >
                      Settled
                      {settledDateText ? ` on ${settledDateText}` : ''}
                      {split.settledByUserName
                        ? ` (marked by ${split.settledByUserName})`
                        : ''}
                    </span>
                  ) : (
                    <span
                      className="split-state-text split-state-pending"
                      data-testid={`split-status-${split.id}`}
                    >
                      Pending (Owes {paidByUserName})
                    </span>
                  )}
                </div>

                <div className="expense-split-right tabular-nums">
                  <strong
                    className="expense-split-share"
                    data-testid={`split-amount-${split.id}`}
                  >
                    {currency} {split.shareAmount}
                  </strong>

                  {!split.isPayerShare && split.canToggleSettlement && (
                    <button
                      type="button"
                      className={
                        split.isSettled
                          ? 'btn btn-secondary btn-xs'
                          : 'btn btn-primary btn-xs'
                      }
                      disabled={isBusy}
                      onClick={() =>
                        onToggleSettlement(id, split.id, !split.isSettled)
                      }
                      data-testid={`toggle-settlement-btn-${split.id}`}
                    >
                      {isBusy
                        ? 'Updating...'
                        : split.isSettled
                        ? 'Reopen Settlement'
                        : 'Mark as Settled'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {(permissions.canEdit || permissions.canDelete) && (
        <div className="expense-card-actions">
          {permissions.canEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEdit(expense)}
              data-testid={`edit-expense-btn-${id}`}
            >
              Edit Expense
            </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(expense)}
              data-testid={`delete-expense-btn-${id}`}
            >
              Delete Expense
            </button>
          )}
        </div>
      )}
    </article>
  );
}
