export default function CategoryBreakdown({
  categoryBreakdown = [],
  currency = 'INR',
  totalExpenses = '0.00',
}) {
  return (
    <section
      className="card expense-category-panel"
      aria-label="Category Spending Breakdown"
      data-testid="category-breakdown-panel"
    >
      <div className="expense-panel-header">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>
            Category Breakdown
          </h2>
          <p className="field-hint" style={{ marginTop: '0.2rem' }}>
            Actual spending sorted from highest to lowest category total.
          </p>
        </div>
        <span className="expense-meta-inline tabular-nums">
          Total: {currency} {totalExpenses}
        </span>
      </div>

      {categoryBreakdown.length === 0 ? (
        <p className="expense-empty-inline" data-testid="category-breakdown-empty">
          No categorized expenses recorded yet. Record an expense to view category analytics.
        </p>
      ) : (
        <ul className="category-breakdown-list" data-testid="category-breakdown-list">
          {categoryBreakdown.map((item) => {
            const widthPct = Math.min(100, Math.max(0, Number(item.percentage || 0)));
            return (
              <li
                key={item.category}
                className="category-breakdown-row"
                data-testid={`category-row-${item.category}`}
              >
                <div className="category-row-top">
                  <div className="category-row-title-group">
                    <span className="category-row-label">{item.label}</span>
                    <span className="expense-meta-inline" aria-hidden="true">
                      ·
                    </span>
                    <span className="expense-meta-inline">
                      {item.expenseCount}{' '}
                      {item.expenseCount === 1 ? 'expense' : 'expenses'}
                    </span>
                  </div>
                  <div className="category-row-figures tabular-nums">
                    <strong data-testid={`category-total-${item.category}`}>
                      {currency} {item.total}
                    </strong>
                    <span className="expense-meta-inline" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className="category-row-pct"
                      data-testid={`category-pct-${item.category}`}
                    >
                      {Number(item.percentage || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="category-bar-track" aria-hidden="true">
                  <div
                    className="category-bar-fill"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
