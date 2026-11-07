export default function ErrorState({
  title = 'Unable to load data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
}) {
  return (
    <section className="feedback-box feedback-error" role="alert">
      <h2 className="feedback-title">{title}</h2>
      <p className="feedback-message">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </section>
  );
}
