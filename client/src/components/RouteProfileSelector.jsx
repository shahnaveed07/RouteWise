const PROFILE_OPTIONS = [
  {
    value: 'driving-car',
    label: 'Driving (Car)',
  },
  {
    value: 'foot-walking',
    label: 'Walking (Foot)',
  },
  {
    value: 'cycling-regular',
    label: 'Cycling (Regular)',
  },
];

export default function RouteProfileSelector({
  selectedProfile = 'driving-car',
  onProfileChange,
  onCalculateRoute,
  isCalculating = false,
  canCalculate = false,
  geocodedStopCount = 0,
  dayLabel = 'Selected Day',
}) {
  return (
    <div
      className="route-profile-selector"
      role="region"
      aria-label={`Multi-stop route controls for ${dayLabel}`}
    >
      <div className="route-profile-field">
        <label htmlFor="route-profile-select" className="form-label">
          Travel Mode ({dayLabel})
        </label>
        <select
          id="route-profile-select"
          className="form-select"
          value={selectedProfile}
          onChange={(e) => onProfileChange(e.target.value)}
          disabled={isCalculating}
        >
          {PROFILE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="route-profile-action">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onCalculateRoute}
          disabled={!canCalculate || isCalculating}
          data-testid="calculate-route-btn"
        >
          {isCalculating ? 'Calculating Route...' : 'Calculate Multi-Stop Route'}
        </button>
        <span className="route-stops-hint">
          {geocodedStopCount >= 2
            ? `${geocodedStopCount} geocoded stops ready in sequence`
            : `Add at least 2 geocoded stops to calculate a route (${geocodedStopCount}/2 ready)`}
        </span>
      </div>
    </div>
  );
}
