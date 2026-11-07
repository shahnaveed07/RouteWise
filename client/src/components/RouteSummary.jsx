function formatDistanceKm(distanceMeters) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    return '0.0 km';
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatDurationHuman(durationSeconds) {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds)) {
    return '0 min';
  }
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

const PROFILE_LABELS = {
  'driving-car': 'Driving (Car)',
  'foot-walking': 'Walking (Foot)',
  'cycling-regular': 'Cycling (Regular)',
};

export default function RouteSummary({
  routeResult = null,
  routeError = null,
  dayLabel = 'Selected Day',
  onClearRoute,
}) {
  if (routeError) {
    return (
      <div
        className="route-summary-card route-summary-error"
        role="alert"
        data-testid="route-error-banner"
      >
        <div className="route-summary-header">
          <h3 className="route-summary-title">
            Route Calculation Unavailable ({dayLabel})
          </h3>
        </div>
        <p className="route-error-text">{routeError}</p>
      </div>
    );
  }

  if (!routeResult || !routeResult.route) {
    return null;
  }

  const { route } = routeResult;
  const stops = Array.isArray(route.stops) ? route.stops : [];
  const warnings = Array.isArray(route.warnings) ? route.warnings : [];

  return (
    <div
      className="route-summary-card"
      role="region"
      aria-label={`Calculated route summary for ${dayLabel}`}
      data-testid="route-summary-card"
    >
      <div className="route-summary-header">
        <div>
          <h3 className="route-summary-title">
            Multi-Stop Route Summary — {dayLabel}
          </h3>
          <span className="route-summary-subtitle">
            Profile: {PROFILE_LABELS[route.profile] || route.profile} •{' '}
            {stops.length} ordered stops
          </span>
        </div>
        {onClearRoute && (
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={onClearRoute}
          >
            Clear Route Line
          </button>
        )}
      </div>

      <div className="route-metrics-grid">
        <div className="route-metric-box">
          <span className="route-metric-label">Total Route Distance</span>
          <strong className="route-metric-value" data-testid="route-distance-value">
            {formatDistanceKm(route.distanceMeters)}
          </strong>
        </div>
        <div className="route-metric-box">
          <span className="route-metric-label">Estimated Travel Time</span>
          <strong className="route-metric-value" data-testid="route-duration-value">
            {formatDurationHuman(route.durationSeconds)}
          </strong>
        </div>
        <div className="route-metric-box">
          <span className="route-metric-label">Included Stops</span>
          <strong className="route-metric-value">{stops.length} Stops</strong>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="route-warning-box" role="status">
          {warnings.map((warningText, idx) => (
            <p key={idx} className="route-warning-text">
              Note: {warningText}
            </p>
          ))}
        </div>
      )}

      {stops.length > 0 && (
        <ol className="route-stops-sequence" aria-label="Ordered route stops">
          {stops.map((stop) => (
            <li key={stop.itemId} className="route-stop-pill">
              <span className="route-stop-num">{stop.stopNumber}</span>
              <span className="route-stop-name">
                {stop.title} ({stop.placeName})
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="route-attribution-note">
        {typeof route.attribution === 'string'
          ? route.attribution
          : route.attribution?.text ||
            'Route calculation by openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors'}
      </div>
    </div>
  );
}
