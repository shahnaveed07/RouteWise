export default function EmptyState({ title, message, action }) {
  return (
    <section className="feedback-box" aria-live="polite">
      <h2 className="feedback-title">{title}</h2>
      <p className="feedback-message">{message}</p>
      {action && <div>{action}</div>}
    </section>
  );
}
