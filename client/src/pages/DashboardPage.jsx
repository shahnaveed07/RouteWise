import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TripList from '../components/TripList.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTrips } from '../services/apiClient.jsx';

export default function DashboardPage() {
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();
  const location = useLocation();

  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const flashMessage = location.state?.flashMessage || null;

  const loadTrips = useCallback(async () => {
    if (!isAuthenticated) {
      setTrips([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const loadedTrips = await fetchTrips(getAccessToken);
      setTrips(loadedTrips);
    } catch (err) {
      setError(err.message || 'Unable to load trips from the server.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    if (authReady && isAuthenticated) {
      loadTrips();
    } else if (authReady && !isAuthenticated) {
      setTrips([]);
      setError(null);
      setIsLoading(false);
    }
  }, [authReady, isAuthenticated, loadTrips]);

  const authSubtitle = isAuthenticated
    ? `Authenticated via Firebase as ${currentUser.fullName} (${currentUser.email})`
    : `UI Preview Mode (Unauthenticated Demo Persona): ${currentUser.fullName} (${currentUser.email})`;

  const ownedCount = trips.filter((t) => t.accessRole === 'owner').length;
  const sharedCount = trips.filter((t) => t.accessRole !== 'owner').length;

  return (
    <div>
      <PageHeader
        title="Trips Dashboard"
        subtitle={authSubtitle}
        actions={
          <Link to="/trips/new" className="btn btn-primary">
            + Create New Trip
          </Link>
        }
      />

      {flashMessage && (
        <div className="form-alert form-alert-success" role="status">
          {flashMessage}
        </div>
      )}

      {!authReady ? (
        <LoadingState message="Checking authentication status..." />
      ) : !isAuthenticated ? (
        <EmptyState
          title="Sign-In Required to View or Manage Saved Trips"
          message={`You are currently browsing as "${currentUser.fullName}" in unauthenticated UI Preview Mode. Demo personas never send protected API requests or display dummy trips. Sign in with your Google account to load and create real PostgreSQL trips.`}
          action={
            <div className="page-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={signInWithGoogle}>
                Sign in with Google
              </button>
              <Link to="/trips/new" className="btn btn-secondary">
                View Create Trip Screen
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="summary-strip" aria-label="Saved trips summary">
            <div className="metric-card">
              <div className="metric-label">Accessible Trips</div>
              <div className="metric-value">{trips.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Owned by You</div>
              <div className="metric-value">{ownedCount}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Shared with You</div>
              <div className="metric-value">{sharedCount}</div>
            </div>
          </div>

          <TripList
            trips={trips}
            isLoading={isLoading}
            error={error}
            onRetry={loadTrips}
          />
        </>
      )}
    </div>
  );
}
