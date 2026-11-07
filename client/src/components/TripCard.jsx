import { Link } from 'react-router-dom';

export default function TripCard({ trip }) {
  const roleLabel =
    trip.accessRole === 'owner'
      ? 'Owner'
      : trip.accessRole === 'member'
        ? 'Member'
        : 'Viewer';

  return (
    <article className="card trip-card">
      <div className="trip-card-header">
        <div>
          <h2 className="trip-card-title">
            <Link to={`/trips/${trip.id}`} className="trip-card-link">
              {trip.title}
            </Link>
          </h2>
          <p className="trip-card-destination">{trip.destinationName}</p>
        </div>
        <span className={`role-badge role-badge-${trip.accessRole || 'owner'}`}>
          {roleLabel}
        </span>
      </div>

      <dl className="trip-card-meta">
        <div>
          <dt>Travel Dates</dt>
          <dd>
            {trip.startDate} to {trip.endDate}
          </dd>
        </div>
        <div>
          <dt>Planned Budget</dt>
          <dd className="trip-budget-value">
            {trip.currency} {trip.plannedBudget}
          </dd>
        </div>
      </dl>

      {trip.description && <p className="trip-card-description">{trip.description}</p>}

      <div className="trip-card-footer">
        <Link to={`/trips/${trip.id}`} className="btn btn-secondary btn-sm">
          View Trip Details
        </Link>
      </div>
    </article>
  );
}
