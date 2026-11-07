import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { searchDestinationLocations } from '../services/locationService.jsx';
import { hasValidCoordinates } from '../services/mapConfig.jsx';

export default function DestinationSearch({
  value = '',
  latitude = null,
  longitude = null,
  onDestinationChange,
  disabled = false,
  error = null,
  inputId = 'trip-destination',
  label = 'Destination',
}) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debounceTimerRef = useRef(null);
  const latestQueryRef = useRef('');

  const coordsConfirmed = hasValidCoordinates(latitude, longitude);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerGeocodingSearch = async (queryText) => {
    const trimmed = queryText.trim();
    if (trimmed.length < 3 || !isAuthenticated) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    latestQueryRef.current = trimmed;
    setIsSearching(true);
    setSearchError(null);
    setIsOpen(true);

    try {
      const candidates = await searchDestinationLocations(getAccessToken, trimmed, 5);
      if (latestQueryRef.current === trimmed) {
        setResults(candidates);
        setHasSearched(true);
      }
    } catch (err) {
      if (latestQueryRef.current === trimmed) {
        setResults([]);
        setSearchError(err.message || 'Unable to search destinations right now.');
        setHasSearched(true);
      }
    } finally {
      if (latestQueryRef.current === trimmed) {
        setIsSearching(false);
      }
    }
  };

  const handleInputChange = (event) => {
    const nextText = event.target.value;

    // Immediately clear any previously selected coordinates when user edits text
    onDestinationChange({
      destinationName: nextText,
      destinationLatitude: null,
      destinationLongitude: null,
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = nextText.trim();
    if (trimmed.length < 3) {
      latestQueryRef.current = '';
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      setHasSearched(false);
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerGeocodingSearch(nextText);
    }, 350);
  };

  const handleSelectCandidate = (candidate) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    latestQueryRef.current = '';
    setIsOpen(false);
    setResults([]);
    setHasSearched(false);
    setSearchError(null);

    onDestinationChange({
      destinationName: candidate.displayName || candidate.name,
      destinationLatitude: candidate.latitude,
      destinationLongitude: candidate.longitude,
    });
  };

  const handleClearCoordinates = () => {
    onDestinationChange({
      destinationName: value,
      destinationLatitude: null,
      destinationLongitude: null,
    });
  };

  return (
    <div className="destination-search">
      <div className="destination-label-row">
        <label htmlFor={inputId} className="form-label">
          {label} <span aria-hidden="true">*</span>
        </label>
        {coordsConfirmed ? (
          <span className="coord-status-badge coord-status-verified">
            Map Ready ({Number(latitude).toFixed(4)}°, {Number(longitude).toFixed(4)}°)
          </span>
        ) : value.trim().length > 0 ? (
          <span className="coord-status-badge coord-status-unverified">
            Unverified Text (No Map Coordinates)
          </span>
        ) : null}
      </div>

      <div className="destination-input-row">
        <input
          id={inputId}
          name="destinationName"
          type="text"
          autoComplete="off"
          className={error ? 'form-input form-input-error' : 'form-input'}
          value={value}
          onChange={handleInputChange}
          maxLength={180}
          placeholder="Type at least 3 characters (e.g. Srinagar, Leh, Tokyo)..."
          required
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
        />
        {value.trim().length >= 3 && !coordsConfirmed && isAuthenticated && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => triggerGeocodingSearch(value)}
            disabled={disabled || isSearching}
          >
            {isSearching ? 'Searching...' : 'Search Places'}
          </button>
        )}
        {coordsConfirmed && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClearCoordinates}
            disabled={disabled}
          >
            Clear Pin
          </button>
        )}
      </div>

      <p id={`${inputId}-hint`} className="field-hint">
        Select a matching place from the geocoding results to attach verified map and weather
        coordinates, or keep manual text if coordinates are not needed yet.
      </p>

      {error && (
        <p id={`${inputId}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}

      {isOpen && (isSearching || searchError || hasSearched) && (
        <div
          className="destination-results-panel"
          role="region"
          aria-label="Destination geocoding results"
        >
          {isSearching && (
            <div className="destination-status-msg" role="status">
              Searching Open-Meteo geocoding directory...
            </div>
          )}

          {!isSearching && searchError && (
            <div className="destination-status-msg destination-status-error" role="alert">
              <span>{searchError}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => triggerGeocodingSearch(value)}
              >
                Retry Search
              </button>
            </div>
          )}

          {!isSearching && !searchError && hasSearched && results.length === 0 && (
            <div className="destination-status-msg" role="status">
              No geocoded locations matched &ldquo;{value.trim()}&rdquo;. You may refine your search
              or save this trip with an unverified destination name.
            </div>
          )}

          {!isSearching && !searchError && results.length > 0 && (
            <ul className="destination-results-list" role="listbox" aria-label="Matching places">
              {results.map((item) => (
                <li key={item.id} className="destination-result-item">
                  <button
                    type="button"
                    className="destination-result-btn"
                    onClick={() => handleSelectCandidate(item)}
                  >
                    <div className="destination-result-main">
                      <span className="destination-result-name">{item.name}</span>
                      <span className="destination-result-region">
                        {[item.admin1, item.admin2, item.country].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                    <span className="destination-result-coords">
                      {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
