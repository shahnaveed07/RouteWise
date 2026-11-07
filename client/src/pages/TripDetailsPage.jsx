import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DestinationSearch from '../components/DestinationSearch.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import MapView from '../components/MapView.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TripForm from '../components/TripForm.jsx';
import WeatherCard from '../components/WeatherCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  deleteTripRequest,
  fetchTripById,
  updateTripRequest,
} from '../services/apiClient.jsx';
import { hasValidCoordinates } from '../services/mapConfig.jsx';

export default function TripDetailsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [pendingLocation, setPendingLocation] = useState({
    destinationName: '',
    destinationLatitude: null,
    destinationLongitude: null,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [statusMessage, setStatusMessage] = useState(
    location.state?.flashMessage || null
  );

  const loadTrip = useCallback(async () => {
    if (!isAuthenticated || !tripId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const loadedTrip = await fetchTripById(getAccessToken, tripId);
      setTrip(loadedTrip);
      setPendingLocation({
        destinationName: loadedTrip?.destinationName || '',
        destinationLatitude: loadedTrip?.destinationLatitude ?? null,
        destinationLongitude: loadedTrip?.destinationLongitude ?? null,
      });
    } catch (err) {
      setLoadError(err.message || 'Unable to load trip details.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, tripId, getAccessToken]);

  useEffect(() => {
    if (authReady && isAuthenticated) {
      loadTrip();
    } else if (authReady && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authReady, isAuthenticated, loadTrip]);

  const handleUpdateTrip = async (updatedFields) => {
    setIsUpdating(true);
    setUpdateError(null);
    setStatusMessage(null);
    try {
      const savedTrip = await updateTripRequest(getAccessToken, trip.id, updatedFields);
      setTrip(savedTrip);
      setIsEditing(false);
      setIsResolvingLocation(false);
      setStatusMessage('Trip details updated in PostgreSQL.');
    } catch (err) {
      setUpdateError(err.message || 'Unable to update trip details.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveResolvedLocation = async (event) => {
    event.preventDefault();
    if (
      !hasValidCoordinates(
        pendingLocation.destinationLatitude,
        pendingLocation.destinationLongitude
      )
    ) {
      setUpdateError('Please select a geocoded destination from the search results first.');
      return;
    }

    await handleUpdateTrip({
      destinationName: pendingLocation.destinationName.trim(),
      destinationLatitude: pendingLocation.destinationLatitude,
      destinationLongitude: pendingLocation.destinationLongitude,
    });
  };

  const handleDeleteTrip = async () => {
    if (!trip || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTripRequest(getAccessToken, trip.id);
      setIsDeleteDialogOpen(false);
      navigate('/dashboard', {
        state: {
          flashMessage: `Trip "${trip.title}" was deleted.`,
        },
      });
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete trip.');
      setIsDeleting(false);
    }
  };

  if (!authReady) {
    return <LoadingState message="Checking authentication status..." />;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader
          title="Trip Details"
          subtitle="Protected trip record"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <EmptyState
          title="Sign-In Required to View Trip Details"
          message={`You are currently using demo preview persona "${currentUser.fullName}". Sign in with your Google account to view trips you own or are an active member of.`}
          action={
            <button type="button" className="btn btn-primary" onClick={signInWithGoogle}>
              Sign in with Google
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading trip details from PostgreSQL..." />;
  }

  if (loadError || !trip) {
    return (
      <div>
        <PageHeader
          title="Trip Details"
          subtitle="Unable to retrieve requested trip"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <ErrorState
          title="Trip Unavailable"
          message={loadError || 'Trip not found or you do not have access to it.'}
          onRetry={loadTrip}
        />
      </div>
    );
  }

  const isOwner = trip.accessRole === 'owner';
  const coordsConfirmed = hasValidCoordinates(
    trip.destinationLatitude,
    trip.destinationLongitude
  );
  const roleLabel =
    trip.accessRole === 'owner'
      ? 'Owner (Full Access)'
      : trip.accessRole === 'member'
        ? 'Member (Read-Only Trip Details)'
        : 'Viewer (Read-Only)';

  return (
    <div>
      <PageHeader
        title={trip.title}
        subtitle={`Destination: ${trip.destinationName}`}
        actions={
          <>
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
            {isOwner && !isEditing && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setUpdateError(null);
                    setStatusMessage(null);
                    setIsEditing(true);
                  }}
                >
                  Edit Trip
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setDeleteError(null);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  Delete Trip
                </button>
              </>
            )}
          </>
        }
      />

      {statusMessage && (
        <div className="form-alert form-alert-success" role="status">
          {statusMessage}
        </div>
      )}

      {deleteError && (
        <div className="form-alert form-alert-error" role="alert">
          {deleteError}
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Trip?"
        message={`Are you sure you want to permanently delete "${trip.title}" (${trip.destinationName})? Dependent itinerary days, members, and expense records will also be removed via PostgreSQL ON DELETE CASCADE.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Permanently'}
        cancelLabel="Cancel"
        onConfirm={handleDeleteTrip}
        onCancel={() => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(false);
          }
        }}
      />

      {isEditing && isOwner ? (
        <section aria-label="Edit trip details">
          <h2 className="section-heading">Edit Trip Details</h2>
          <TripForm
            initialValues={trip}
            submitLabel="Save Changes"
            onSubmit={handleUpdateTrip}
            onCancel={() => {
              setUpdateError(null);
              setIsEditing(false);
            }}
            isSubmitting={isUpdating}
            serverError={updateError}
          />
        </section>
      ) : (
        <>
          <section className="card trip-details-card" aria-label="Trip summary details">
            <div className="trip-details-top">
              <div className="trip-badges-row">
                <span className={`role-badge role-badge-${trip.accessRole || 'owner'}`}>
                  {roleLabel}
                </span>
                <span
                  className={
                    coordsConfirmed
                      ? 'coord-status-badge coord-status-verified'
                      : 'coord-status-badge coord-status-unverified'
                  }
                >
                  {coordsConfirmed
                    ? `Coordinates: ${Number(trip.destinationLatitude).toFixed(4)}°, ${Number(trip.destinationLongitude).toFixed(4)}°`
                    : 'Destination Coordinates Not Confirmed'}
                </span>
              </div>
              {!isOwner && (
                <span className="readonly-note">
                  Only the trip owner can edit or delete trip metadata.
                </span>
              )}
            </div>

            <dl className="trip-details-grid">
              <div className="detail-item">
                <dt>Destination</dt>
                <dd>{trip.destinationName}</dd>
              </div>
              <div className="detail-item">
                <dt>Start Date</dt>
                <dd>{trip.startDate}</dd>
              </div>
              <div className="detail-item">
                <dt>End Date</dt>
                <dd>{trip.endDate}</dd>
              </div>
              <div className="detail-item">
                <dt>Planned Budget</dt>
                <dd className="trip-budget-value">
                  {trip.currency} {trip.plannedBudget}
                </dd>
              </div>
            </dl>

            <div className="detail-description-block">
              <h3 className="detail-subheading">Description & Planning Notes</h3>
              <p className="detail-description-text">
                {trip.description || 'No description provided for this trip.'}
              </p>
            </div>
          </section>

          <div className="trip-insights-grid">
            <section className="card trip-insight-panel" aria-label="Destination Map">
              <div className="insight-panel-header">
                <h2 className="section-heading" style={{ margin: 0 }}>
                  Destination Map
                </h2>
                {isOwner && !coordsConfirmed && !isResolvingLocation && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setUpdateError(null);
                      setPendingLocation({
                        destinationName: trip.destinationName,
                        destinationLatitude: null,
                        destinationLongitude: null,
                      });
                      setIsResolvingLocation(true);
                    }}
                  >
                    + Confirm Destination Location
                  </button>
                )}
              </div>

              {isOwner && !coordsConfirmed && isResolvingLocation && (
                <form className="resolve-location-box" onSubmit={handleSaveResolvedLocation}>
                  {updateError && (
                    <div className="form-alert form-alert-error" role="alert">
                      {updateError}
                    </div>
                  )}
                  <DestinationSearch
                    value={pendingLocation.destinationName}
                    latitude={pendingLocation.destinationLatitude}
                    longitude={pendingLocation.destinationLongitude}
                    onDestinationChange={setPendingLocation}
                    disabled={isUpdating}
                    inputId="resolve-trip-destination"
                    label="Search & Select Destination to Attach Coordinates"
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setUpdateError(null);
                        setIsResolvingLocation(false);
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={
                        isUpdating ||
                        !hasValidCoordinates(
                          pendingLocation.destinationLatitude,
                          pendingLocation.destinationLongitude
                        )
                      }
                    >
                      {isUpdating ? 'Saving...' : 'Save Confirmed Coordinates'}
                    </button>
                  </div>
                </form>
              )}

              <MapView
                latitude={trip.destinationLatitude}
                longitude={trip.destinationLongitude}
                destinationName={trip.destinationName}
                emptyMessage={
                  isOwner
                    ? 'This trip does not have verified coordinates yet. Click "+ Confirm Destination Location" above or "Edit Trip" to search and select a geocoded destination.'
                    : 'The trip owner has not attached verified map coordinates to this destination yet.'
                }
              />
            </section>

            <section className="card trip-insight-panel" aria-label="Destination Weather">
              <div className="insight-panel-header">
                <h2 className="section-heading" style={{ margin: 0 }}>
                  Destination Weather
                </h2>
              </div>
              <WeatherCard
                latitude={trip.destinationLatitude}
                longitude={trip.destinationLongitude}
                destinationName={trip.destinationName}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
