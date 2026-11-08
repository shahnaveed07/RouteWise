import ParticipantBalanceCard from './ParticipantBalanceCard.jsx';

export default function GroupSettlementPanel({
  participantBalances = [],
  settlementSummary = null,
  currency = 'INR',
  currentUserId = null,
}) {
  const totalOutstandingAmount =
    settlementSummary?.totalOutstandingAmount || '0.00';
  const unsettledSplitCount = settlementSummary?.unsettledSplitCount || 0;
  const settledSplitCount = settlementSummary?.settledSplitCount || 0;
  const pairwiseDebts = Array.isArray(settlementSummary?.pairwiseDebts)
    ? settlementSummary.pairwiseDebts
    : [];

  return (
    <section
      className="card group-settlement-panel"
      aria-label="Group Balances and Settlement Summary"
      data-testid="group-settlement-panel"
    >
      <div className="expense-panel-header">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>
            Group Balances &amp; Settlement Tracking
          </h2>
          <p className="field-hint" style={{ marginTop: '0.2rem' }}>
            Lifetime contributions vs. currently unsettled non-payer shares. Settlement records are self-reported tracking, not automated bank transfers.
          </p>
        </div>

        <div className="settlement-header-summary tabular-nums">
          <span data-testid="settlement-total-outstanding">
            Outstanding to Settle: <strong>{currency} {totalOutstandingAmount}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span data-testid="settlement-unsettled-count">
            {unsettledSplitCount} pending {unsettledSplitCount === 1 ? 'share' : 'shares'}
          </span>
          <span aria-hidden="true">·</span>
          <span data-testid="settlement-settled-count">
            {settledSplitCount} settled
          </span>
        </div>
      </div>

      {pairwiseDebts.length > 0 ? (
        <div
          className="pairwise-debts-box"
          data-testid="pairwise-debts-list"
          aria-label="Outstanding participant obligations"
        >
          <h3 className="detail-subheading" style={{ marginBottom: '0.45rem' }}>
            Current Unsettled Obligations
          </h3>
          <ul className="pairwise-debts-list tabular-nums">
            {pairwiseDebts.map((debt) => (
              <li
                key={`${debt.fromUserId}->${debt.toUserId}`}
                className="pairwise-debt-item"
              >
                <span>
                  <strong>{debt.fromUserName}</strong> owes{' '}
                  <strong>{debt.toUserName}</strong>
                </span>
                <strong>
                  {currency} {debt.amount}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          className="pairwise-settled-notice"
          data-testid="all-shares-settled-notice"
        >
          All recorded non-payer expense shares are currently settled ({currency} 0.00 outstanding).
        </div>
      )}

      <div className="participant-balances-grid" data-testid="participant-balances-grid">
        {participantBalances.map((participant) => (
          <ParticipantBalanceCard
            key={participant.userId}
            participant={participant}
            currency={currency}
            isCurrentUser={Boolean(
              currentUserId && participant.userId === currentUserId
            )}
          />
        ))}
      </div>
    </section>
  );
}
