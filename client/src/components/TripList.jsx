import { Link } from 'react-router-dom';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import LoadingState from './LoadingState.jsx';
import TripCard from './TripCard.jsx';

export default function TripList({ trips = [], isLoading = false, error = null, onRetry }) {
  if (isLoading) {
    return <LoadingState message="Loading your saved trips from PostgreSQL..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to Load Trips"
        message={error}
        onRetry={onRetry}
      />
    );
  }

  if (!Array.isArray(trips) || trips.length === 0) {
    return (
      <EmptyState
        title="No Saved Trips Yet"
        message="You do not have any saved or shared trips in PostgreSQL yet. Create your first trip to start organizing dates and planned budget."
        action={
          <Link to="/trips/new" className="btn btn-primary">
            + Create First Trip
          </Link>
        }
      />
    );
  }

  return (
    <div className="card-grid" aria-label="Saved trips list">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
