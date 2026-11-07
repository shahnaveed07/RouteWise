export default function LoadingState({ message = 'Loading trip information...' }) {
  return (
    <section className="feedback-box" role="status" aria-live="polite">
      <h2 className="feedback-title">Please wait</h2>
      <p className="feedback-message">{message}</p>
    </section>
  );
}
