import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ItineraryDaySection from '../components/ItineraryDaySection.jsx';
import ItineraryMap from '../components/ItineraryMap.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RouteProfileSelector from '../components/RouteProfileSelector.jsx';
import RouteSummary from '../components/RouteSummary.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  calculateDayRouteRequest,
  createItineraryItemRequest,
  deleteItineraryItemRequest,
  fetchTripItinerary,
  initializeTripItineraryRequest,
  reorderItineraryItemsRequest,
  updateDayNotesRequest,
  updateItineraryItemRequest,
} from '../services/itineraryService.jsx';

export default function ItineraryPage() {
  const { tripId } = useParams();
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [itineraryData, setItineraryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [selectedDayId, setSelectedDayId] = useState('ALL');
  const [selectedProfile, setSelectedProfile] = useState('driving-car');
  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  const didAutoInitRef = useRef(false);

  const loadItinerary = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAuthenticated || !tripId) {
        setIsLoading(false);
        return;
      }

      if (!silent) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const data = await fetchTripItinerary(getAccessToken, tripId);
        const role = data?.trip?.accessRole || 'viewer';
        const canEdit = role === 'owner' || role === 'member';

        if (
          data &&
          Array.isArray(data.days) &&
          data.days.length === 0 &&
          canEdit &&
          !didAutoInitRef.current
        ) {
          didAutoInitRef.current = true;
          const initializedData = await initializeTripItineraryRequest(
            getAccessToken,
            tripId
          );
          setItineraryData(initializedData);
          if (initializedData?.days?.length > 0 && selectedDayId === 'ALL') {
            setSelectedDayId(initializedData.days[0].id);
          }
        } else {
          setItineraryData(data);
          if (data?.days?.length > 0 && selectedDayId === 'ALL') {
            setSelectedDayId(data.days[0].id);
          }
        }
      } catch (err) {
        setLoadError(err.message || 'Unable to load trip itinerary.');
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [isAuthenticated, tripId, getAccessToken, selectedDayId]
  );

  useEffect(() => {
    if (authReady && isAuthenticated) {
      loadItinerary();
    } else if (authReady && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authReady, isAuthenticated, loadItinerary]);

  const trip = itineraryData?.trip || null;
  const days = useMemo(
    () => (Array.isArray(itineraryData?.days) ? itineraryData.days : []),
    [itineraryData]
  );
  const summary = itineraryData?.summary || {
    dayCount: 0,
    totalItems: 0,
    totalEstimatedCost: '0.00',
    isInitialized: false,
  };

  const accessRole = trip?.accessRole || 'viewer';
  const canEdit = accessRole === 'owner' || accessRole === 'member';

  const activeDayForRouting = useMemo(() => {
    if (days.length === 0) return null;
    if (selectedDayId !== 'ALL') {
      return days.find((d) => d.id === selectedDayId) || days[0];
    }
    return days[0];
  }, [days, selectedDayId]);

  const handleManualInitialize = async () => {
    if (!canEdit || isInitializing) return;
    setIsInitializing(true);
    setStatusBanner(null);
    try {
      const initialized = await initializeTripItineraryRequest(
        getAccessToken,
        tripId
      );
      setItineraryData(initialized);
      if (initialized?.days?.length > 0 && selectedDayId === 'ALL') {
        setSelectedDayId(initialized.days[0].id);
      }
      setStatusBanner(
        `Itinerary initialized with ${initialized?.days?.length || 0} days matching the trip date range.`
      );
    } catch (err) {
      setLoadError(err.message || 'Unable to initialize trip itinerary.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveNotes = async (dayId, notes) => {
    await updateDayNotesRequest(getAccessToken, tripId, dayId, notes);
    await loadItinerary({ silent: true });
    setStatusBanner('Day notes saved to PostgreSQL.');
  };

  const handleCreateItem = async (dayId, payload) => {
    await createItineraryItemRequest(getAccessToken, tripId, dayId, payload);
    // Clear stale route if modifying the routed day
    if (routeResult && routeResult.dayId === dayId) {
      setRouteResult(null);
    }
    await loadItinerary({ silent: true });
    setSelectedDayId(dayId);
    setStatusBanner(`Activity "${payload.title}" added to itinerary.`);
  };

  const handleUpdateItem = async (dayId, itemId, payload) => {
    await updateItineraryItemRequest(
      getAccessToken,
      tripId,
      dayId,
      itemId,
      payload
    );
    if (routeResult && routeResult.dayId === dayId) {
      setRouteResult(null);
    }
    await loadItinerary({ silent: true });
    setStatusBanner('Activity updated in PostgreSQL.');
  };

  const handleDeleteItem = async (dayId, itemId) => {
    await deleteItineraryItemRequest(getAccessToken, tripId, dayId, itemId);
    if (routeResult && routeResult.dayId === dayId) {
      setRouteResult(null);
    }
    await loadItinerary({ silent: true });
    setStatusBanner('Activity removed from itinerary.');
  };

  const handleReorderItems = async (dayId, orderedItemIds) => {
    await reorderItineraryItemsRequest(
      getAccessToken,
      tripId,
      dayId,
      orderedItemIds
    );
    if (routeResult && routeResult.dayId === dayId) {
      setRouteResult(null);
    }
    await loadItinerary({ silent: true });
    setStatusBanner('Activity sequence reordered in PostgreSQL.');
  };

  const handleCalculateRoute = async (targetDayId = null) => {
    const dayToRoute = targetDayId
      ? days.find((d) => d.id === targetDayId)
      : activeDayForRouting;

    if (!dayToRoute) return;

    setSelectedDayId(dayToRoute.id);
    setIsCalculatingRoute(true);
    setRouteError(null);
    setStatusBanner(null);

    try {
      const result = await calculateDayRouteRequest(
        getAccessToken,
        tripId,
        dayToRoute.id,
        selectedProfile
      );
      setRouteResult(result);
    } catch (err) {
      setRouteResult(null);
      setRouteError(
        err.message || 'Unable to calculate multi-stop route for this day.'
      );
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  if (!authReady) {
    return <LoadingState message="Checking authentication status..." />;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader
          title="Trip Itinerary"
          subtitle="Protected day-by-day travel schedule"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <EmptyState
          title="Sign-In Required to View Itinerary"
          message={`You are currently browsing with demo persona "${currentUser.fullName}". Sign in with your Google account to manage day-wise itineraries and calculate routes.`}
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={signInWithGoogle}
            >
              Sign in with Google
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingState message="Loading day-wise itinerary from PostgreSQL..." />
    );
  }

  if (loadError || !trip) {
    return (
      <div>
        <PageHeader
          title="Trip Itinerary"
          subtitle="Unable to load requested itinerary"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <ErrorState
          title="Itinerary Unavailable"
          message={
            loadError || 'Trip not found or you do not have access to this trip.'
          }
          onRetry={() => loadItinerary()}
        />
      </div>
    );
  }

  const roleBadgeLabel =
    accessRole === 'owner'
      ? 'Owner (Full Itinerary Editor)'
      : accessRole === 'member'
      ? 'Active Member (Full Itinerary Editor)'
      : 'Viewer (Read-Only Itinerary)';

  const routingDayLabel = activeDayForRouting
    ? `Day ${activeDayForRouting.dayOrder} (${activeDayForRouting.dayDate})`
    : 'No Day Selected';

  return (
    <div className="itinerary-page">
      <PageHeader
        title={`${trip.title} — Day-Wise Itinerary`}
        subtitle={`${trip.destinationName} • ${trip.startDate} to ${trip.endDate}`}
        actions={
          <>
            <Link
              to={`/trips/${trip.id}`}
              className="btn btn-secondary"
              data-testid="back-to-trip-details-link"
            >
              ← Back to Trip Details
            </Link>
            {canEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleManualInitialize}
                disabled={isInitializing}
              >
                {isInitializing ? 'Syncing Days...' : 'Sync Itinerary Days'}
              </button>
            )}
          </>
        }
      />

      {statusBanner && (
        <div className="form-alert form-alert-success" role="status">
          {statusBanner}
        </div>
      )}

      <section
        className="card itinerary-overview-bar"
        aria-label="Itinerary summary metrics"
      >
        <div className="itinerary-overview-metrics">
          <div className="itinerary-metric-item">
            <span className="itinerary-metric-label">Trip Days</span>
            <strong
              className="itinerary-metric-val"
              data-testid="itinerary-day-count"
            >
              {summary.dayCount} {summary.dayCount === 1 ? 'Day' : 'Days'}
            </strong>
          </div>
          <div className="itinerary-metric-item">
            <span className="itinerary-metric-label">Scheduled Activities</span>
            <strong
              className="itinerary-metric-val"
              data-testid="itinerary-total-items"
            >
              {summary.totalItems}{' '}
              {summary.totalItems === 1 ? 'Activity' : 'Activities'}
            </strong>
          </div>
          <div className="itinerary-metric-item">
            <span className="itinerary-metric-label">
              Estimated Itinerary Total
            </span>
            <strong
              className="itinerary-metric-val itinerary-total-cost"
              data-testid="itinerary-total-cost"
            >
              {trip.currency} {summary.totalEstimatedCost}
            </strong>
          </div>
          <div className="itinerary-metric-item">
            <span className="itinerary-metric-label">Planned Trip Budget</span>
            <strong className="itinerary-metric-val">
              {trip.currency} {trip.plannedBudget}
            </strong>
          </div>
        </div>

        <div className="itinerary-overview-role">
          <span className={`role-badge role-badge-${accessRole}`}>
            {roleBadgeLabel}
          </span>
        </div>
      </section>

      <section
        className="card itinerary-map-panel"
        aria-label="Interactive Itinerary Map and Route Planner"
      >
        <div className="itinerary-map-header">
          <div>
            <h2 className="section-heading" style={{ margin: 0 }}>
              Itinerary Stops &amp; Multi-Stop Route Map
            </h2>
            <p className="field-hint" style={{ marginTop: '0.25rem' }}>
              Select a specific day to inspect numbered stops in sequence and calculate driving, walking, or cycling routes via openrouteservice.
            </p>
          </div>

          <div className="itinerary-day-filter">
            <label htmlFor="itinerary-map-day-select" className="form-label">
              Map Day Filter
            </label>
            <select
              id="itinerary-map-day-select"
              className="form-select"
              value={selectedDayId}
              onChange={(e) => {
                setSelectedDayId(e.target.value);
                setRouteError(null);
              }}
            >
              <option value="ALL">All Days ({days.length} days)</option>
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  Day {d.dayOrder} — {d.dayDate} ({d.geocodedStopCount} stops)
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeDayForRouting && (
          <RouteProfileSelector
            selectedProfile={selectedProfile}
            onProfileChange={(nextProfile) => {
              setSelectedProfile(nextProfile);
              setRouteError(null);
            }}
            onCalculateRoute={() => handleCalculateRoute(activeDayForRouting.id)}
            isCalculating={isCalculatingRoute}
            canCalculate={activeDayForRouting.geocodedStopCount >= 2}
            geocodedStopCount={activeDayForRouting.geocodedStopCount}
            dayLabel={routingDayLabel}
          />
        )}

        <RouteSummary
          routeResult={routeResult}
          routeError={routeError}
          dayLabel={
            routeResult
              ? `Day ${routeResult.dayOrder} (${routeResult.dayDate})`
              : routingDayLabel
          }
          onClearRoute={() => {
            setRouteResult(null);
            setRouteError(null);
          }}
        />

        <ItineraryMap
          trip={trip}
          days={days}
          selectedDayId={selectedDayId}
          routeResult={routeResult}
        />
      </section>

      {days.length === 0 ? (
        <EmptyState
          title="No Itinerary Days Initialized"
          message={
            canEdit
              ? 'Initialize the day-wise schedule from your trip start and end dates to begin adding activities.'
              : 'The trip owner has not initialized the day-wise itinerary for this trip yet.'
          }
          action={
            canEdit ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleManualInitialize}
                disabled={isInitializing}
              >
                {isInitializing
                  ? 'Initializing Days...'
                  : 'Initialize Itinerary Days'}
              </button>
            ) : null
          }
        />
      ) : (
        <div className="itinerary-days-stack">
          {days.map((day) => (
            <ItineraryDaySection
              key={day.id}
              day={day}
              currency={trip.currency}
              canEdit={canEdit}
              isSelectedForMap={selectedDayId === day.id}
              onSelectDayForMap={(dayId) => {
                setSelectedDayId(dayId);
                setRouteError(null);
              }}
              onCalculateDayRoute={(dayId) => handleCalculateRoute(dayId)}
              isCalculatingRoute={
                isCalculatingRoute && activeDayForRouting?.id === day.id
              }
              onSaveNotes={handleSaveNotes}
              onCreateItem={handleCreateItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onReorderItems={handleReorderItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}
