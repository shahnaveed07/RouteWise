export default function ParticipantBalanceCard({
  participant,
  currency = 'INR',
  isCurrentUser = false,
}) {
  if (!participant) return null;

  const {
    userId,
    displayName,
    tripRole,
    totalPaid = '0.00',
    totalShare = '0.00',
    pendingToPay = '0.00',
    pendingToReceive = '0.00',
    netOutstanding = '0.00',
    balanceStatus = 'SETTLED',
  } = participant;

  const roleText =
    tripRole === 'owner'
      ? 'Trip Owner'
      : tripRole === 'member'
      ? 'Active Member'
      : tripRole === 'viewer'
      ? 'Viewer'
      : tripRole === 'former_member'
      ? 'Former Member (Inactive)'
      : 'Participant';

  let statusLabel = 'All Shares Settled';
  let statusClass = 'participant-status-settled';

  if (balanceStatus === 'OWED') {
    statusLabel = `Owed ${currency} ${netOutstanding} Net`;
    statusClass = 'participant-status-owed';
  } else if (balanceStatus === 'OWES') {
    const absNet = netOutstanding.startsWith('-')
      ? netOutstanding.slice(1)
      : netOutstanding;
    statusLabel = `Owes ${currency} ${absNet} Net`;
    statusClass = 'participant-status-owes';
  } else if (balanceStatus === 'OFFSETTING') {
    statusLabel = 'Offsetting Pending Shares';
    statusClass = 'participant-status-offsetting';
  }

  return (
    <article
      className="participant-balance-card"
      data-testid={`participant-balance-${userId}`}
    >
      <div className="participant-card-header">
        <div>
          <h3 className="participant-card-name">
            {displayName}
            {isCurrentUser ? ' (You)' : ''}
          </h3>
          <p className="expense-meta-inline">{roleText}</p>
        </div>
        <span
          className={`participant-status-text ${statusClass} tabular-nums`}
          data-testid={`participant-status-${userId}`}
        >
          {statusLabel}
        </span>
      </div>

      <dl className="participant-metrics-grid tabular-nums">
        <div className="participant-metric-cell">
          <dt>Total Paid</dt>
          <dd data-testid={`participant-paid-${userId}`}>
            {currency} {totalPaid}
          </dd>
        </div>
        <div className="participant-metric-cell">
          <dt>Allocated Share</dt>
          <dd data-testid={`participant-share-${userId}`}>
            {currency} {totalShare}
          </dd>
        </div>
        <div className="participant-metric-cell">
          <dt>Pending to Pay</dt>
          <dd
            className={pendingToPay !== '0.00' ? 'amount-payable' : ''}
            data-testid={`participant-pending-pay-${userId}`}
          >
            {currency} {pendingToPay}
          </dd>
        </div>
        <div className="participant-metric-cell">
          <dt>Pending to Receive</dt>
          <dd
            className={pendingToReceive !== '0.00' ? 'amount-receivable' : ''}
            data-testid={`participant-pending-receive-${userId}`}
          >
            {currency} {pendingToReceive}
          </dd>
        </div>
      </dl>

      <div className="participant-net-row tabular-nums">
        <span>Net Outstanding Balance</span>
        <strong
          className={
            balanceStatus === 'OWED'
              ? 'amount-receivable'
              : balanceStatus === 'OWES'
              ? 'amount-payable'
              : ''
          }
          data-testid={`participant-net-${userId}`}
        >
          {currency} {netOutstanding}
        </strong>
      </div>
    </article>
  );
}
