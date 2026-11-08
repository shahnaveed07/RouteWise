import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ItineraryDaySection from '../components/ItineraryDaySection.jsx';
import ItineraryMap from '../components/ItineraryMap.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RouteProfileSelector from '../components/RouteProfileSelector.jsx';
import RouteSummary from '../components/RouteSummary.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTrips } from '../services/apiClient.jsx';
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
  const navigate = useNavigate();
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [itineraryData, setItineraryData] = useState(null);
  const [accessibleTrips, setAccessibleTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [selectedDayId, setSelectedDayId] = useState('ALL');
  const [selectedProfile, setSelectedProfile] = useState('driving-car');
  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [syncConflict, setSyncConflict] = useState(null);

  const autoInitTripIdRef = useRef(null);
  const loadRequestSeqRef = useRef(0);
  const loadAbortRef = useRef(null);
  const routeRequestSeqRef = useRef(0);
  const routeAbortRef = useRef(null);

  // Reset all trip-specific state immediately whenever tripId changes
  useEffect(() => {
    if (loadAbortRef.current) {
      loadAbortRef.current.abort();
      loadAbortRef.current = null;
    }
    if (routeAbortRef.current) {
      routeAbortRef.current.abort();
      routeAbortRef.current = null;
    }
    loadRequestSeqRef.current += 1;
    routeRequestSeqRef.current += 1;
    autoInitTripIdRef.current = null;

    setItineraryData(null);
    setSelectedDayId('ALL');
    setRouteResult(null);
    setRouteError(null);
    setStatusBanner(null);
    setSyncConflict(null);
    setLoadError(null);
    setIsInitializing(false);
    setIsCalculatingRoute(false);
  }, [tripId]);

  // Cleanup any in-flight controllers on unmount
  useEffect(() => {
    return () => {
      if (loadAbortRef.current) {
        loadAbortRef.current.abort();
      }
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
      }
    };
  }, []);

  // Load user's accessible trips so they can switch between trip itineraries without a full page reload
  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      setAccessibleTrips([]);
      return undefined;
    }
    let cancelled = false;
    fetchTrips(getAccessToken)
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setAccessibleTrips(list);
        }
      })
      .catch(() => {
        // Non-blocking: switcher simply stays hidden if listing fails
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, getAccessToken, tripId]);

  const reconcileSelectedDayForData = useCallback((nextData) => {
    const validDays = Array.isArray(nextData?.days) ? nextData.days : [];
    setSelectedDayId((prevSelected) => {
      if (validDays.length === 0) {
        return 'ALL';
      }
      if (
        prevSelected !== 'ALL' &&
        validDays.some((d) => d.id === prevSelected)
      ) {
        return prevSelected;
      }
      return validDays[0].id;
    });
  }, []);

  const loadItinerary = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAuthenticated || !tripId) {
        setIsLoading(false);
        return;
      }

      if (loadAbortRef.current) {
        loadAbortRef.current.abort();
      }
      const controller = new AbortController();
      loadAbortRef.current = controller;
      const requestId = ++loadRequestSeqRef.current;
      const requestedTripId = tripId;

      if (!silent) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const data = await fetchTripItinerary(getAccessToken, requestedTripId, {
          signal: controller.signal,
        });

        if (
          loadRequestSeqRef.current !== requestId ||
          controller.signal.aborted
        ) {
          return;
        }

        const role = data?.trip?.accessRole || 'viewer';
        const canEdit = role === 'owner' || role === 'member';

        if (
          data &&
          Array.isArray(data.days) &&
          data.days.length === 0 &&
          canEdit &&
          autoInitTripIdRef.current !== requestedTripId
        ) {
          autoInitTripIdRef.current = requestedTripId;
          const initializedData = await initializeTripItineraryRequest(
            getAccessToken,
            requestedTripId,
            { signal: controller.signal }
          );

          if (
            loadRequestSeqRef.current !== requestId ||
            controller.signal.aborted
          ) {
            return;
          }

          setItineraryData(initializedData);
          reconcileSelectedDayForData(initializedData);
        } else {
          setItineraryData(data);
          reconcileSelectedDayForData(data);
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return;
        }
        if (loadRequestSeqRef.current !== requestId) {
          return;
        }
        setLoadError(err.message || 'Unable to load trip itinerary.');
      } finally {
        if (loadRequestSeqRef.current === requestId && !silent) {
          setIsLoading(false);
        }
      }
    },
    [isAuthenticated, tripId, getAccessToken, reconcileSelectedDayForData]
  );

  useEffect(() => {
    if (authReady && isAuthenticated) {
      loadItinerary();
    } else if (authReady && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authReady, isAuthenticated, loadItinerary]);

  const trip =
    itineraryData?.trip && itineraryData.trip.id === tripId
      ? itineraryData.trip
      : null;
  const days = useMemo(
    () =>
      trip && Array.isArray(itineraryData?.days) ? itineraryData.days : [],
    [trip, itineraryData]
  );
  const summary =
    trip && itineraryData?.summary
      ? itineraryData.summary
      : {
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
    setSyncConflict(null);

    try {
      const initialized = await initializeTripItineraryRequest(
        getAccessToken,
        tripId
      );
      setItineraryData(initialized);
      reconcileSelectedDayForData(initialized);
      setStatusBanner(
        `Itinerary synchronized with ${
          initialized?.days?.length || 0
        } days matching ${initialized?.trip?.startDate} to ${
          initialized?.trip?.endDate
        }.`
      );
    } catch (err) {
      if (
        err?.statusCode === 409 ||
        err?.code === 'ITINERARY_OUTSIDE_RANGE_HAS_DATA'
      ) {
        setSyncConflict({
          message:
            err.message ||
            'Cannot synchronize itinerary days because one or more days outside the updated trip date range still contain activities or notes.',
          code: err.code || 'ITINERARY_OUTSIDE_RANGE_HAS_DATA',
          details: err.details || null,
        });
      } else if (!trip) {
        setLoadError(err.message || 'Unable to initialize trip itinerary.');
      } else {
        setSyncConflict({
          message: err.message || 'Unable to synchronize itinerary days.',
          code: err.code || 'ITINERARY_SYNC_ERROR',
          details: err.details || null,
        });
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveNotes = async (dayId, notes) => {
    await updateDayNotesRequest(getAccessToken, tripId, dayId, notes);
    setSyncConflict(null);
    await loadItinerary({ silent: true });
    setStatusBanner('Day notes saved to PostgreSQL.');
  };

  const handleCreateItem = async (dayId, payload) => {
    await createItineraryItemRequest(getAccessToken, tripId, dayId, payload);
    if (routeResult && routeResult.dayId === dayId) {
      setRouteResult(null);
    }
    setSyncConflict(null);
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
    setSyncConflict(null);
    await loadItinerary({ silent: true });
    setStatusBanner('Activity updated in PostgreSQL.');
  };

  const handleDeleteItem = async (dayId, itemId) => {
    await deleteItineraryItemRequest(getAccessToken, tripId, dayId, itemId);
    if (routeResult && routeResult.dayId === dayId) {
      setRouteResult(null);
    }
    setSyncConflict(null);
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

    if (routeAbortRef.current) {
      routeAbortRef.current.abort();
    }
    const controller = new AbortController();
    routeAbortRef.current = controller;
    const routeReqId = ++routeRequestSeqRef.current;
    const requestedTripId = tripId;

    setSelectedDayId(dayToRoute.id);
    setIsCalculatingRoute(true);
    setRouteError(null);
    setStatusBanner(null);

    try {
      const result = await calculateDayRouteRequest(
        getAccessToken,
        requestedTripId,
        dayToRoute.id,
        selectedProfile,
        { signal: controller.signal }
      );
      if (
        routeRequestSeqRef.current !== routeReqId ||
        controller.signal.aborted
      ) {
        return;
      }
      setRouteResult({
        ...result,
        tripId: requestedTripId,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return;
      }
      if (routeRequestSeqRef.current !== routeReqId) {
        return;
      }
      setRouteResult(null);
      setRouteError(
        err.message || 'Unable to calculate multi-stop route for this day.'
      );
    } finally {
      if (routeRequestSeqRef.current === routeReqId) {
        setIsCalculatingRoute(false);
      }
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

  if (isLoading && !trip) {
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

  const affectedConflictDays = Array.isArray(syncConflict?.details?.affectedDays)
    ? syncConflict.details.affectedDays
    : [];

  return (
    <div className="itinerary-page" data-trip-id={trip.id}>
      <PageHeader
        title={`${trip.title} — Day-Wise Itinerary`}
        subtitle={`${trip.destinationName} • ${trip.startDate} to ${trip.endDate}`}
        actions={
          <>
            {accessibleTrips.length > 1 && (
              <div className="itinerary-trip-switcher">
                <label
                  htmlFor="itinerary-trip-switch-select"
                  className="sr-only"
                >
                  Switch Trip Itinerary
                </label>
                <select
                  id="itinerary-trip-switch-select"
                  className="form-select"
                  aria-label="Switch Trip Itinerary"
                  data-testid="itinerary-trip-switcher"
                  value={trip.id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    if (nextId && nextId !== trip.id) {
                      navigate(`/trips/${nextId}/itinerary`);
                    }
                  }}
                >
                  {accessibleTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      Switch Trip: {t.title} ({t.startDate} – {t.endDate})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Link
              to={`/trips/${trip.id}`}
              className="btn btn-secondary"
              data-testid="back-to-trip-details-link"
            >
              ← Back to Trip Details
            </Link>
            <Link
              to={`/trips/${trip.id}/expenses`}
              className="btn btn-secondary"
              data-testid="open-expenses-from-itinerary-btn"
            >
              Budget &amp; Expenses
            </Link>
            {canEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleManualInitialize}
                disabled={isInitializing}
                data-testid="sync-itinerary-days-btn"
              >
                {isInitializing ? 'Syncing Days...' : 'Sync Itinerary Days'}
              </button>
            )}
          </>
        }
      />

      {syncConflict && (
        <div
          className="itinerary-sync-conflict-banner"
          role="alert"
          data-testid="itinerary-sync-conflict-banner"
        >
          <div className="itinerary-sync-conflict-header">
            <strong>
              Date-Range Synchronization Conflict — Existing Data Preserved (
              {syncConflict.code})
            </strong>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => setSyncConflict(null)}
            >
              Dismiss Notice
            </button>
          </div>
          <p className="itinerary-sync-conflict-text">{syncConflict.message}</p>
          {affectedConflictDays.length > 0 && (
            <ul
              className="itinerary-sync-conflict-list"
              aria-label="Out-of-range itinerary days with preserved data"
            >
              {affectedConflictDays.map((d) => (
                <li key={d.id || d.dayDate}>
                  <strong>
                    Day {d.dayOrder} ({d.dayDate})
                  </strong>
                  : {d.itemCount}{' '}
                  {d.itemCount === 1 ? 'scheduled activity' : 'scheduled activities'}
                  {d.hasNotes ? ' + saved day notes' : ''} (outside{' '}
                  {trip.startDate} – {trip.endDate})
                </li>
              ))}
            </ul>
          )}
          <p className="itinerary-sync-conflict-hint">
            To complete date synchronization, delete or move the activities and clear the notes on the out-of-range day(s) below (or extend the trip dates on Trip Details), then click{' '}
            <strong>Sync Itinerary Days</strong> again.
          </p>
        </div>
      )}

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
          routeResult={
            routeResult && routeResult.tripId === trip.id ? routeResult : null
          }
          routeError={routeError}
          dayLabel={
            routeResult && routeResult.tripId === trip.id
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
          routeResult={
            routeResult && routeResult.tripId === trip.id ? routeResult : null
          }
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
