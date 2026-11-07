import { useCallback, useEffect, useRef, useState } from 'react';
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
  autoSearchOnMount = false,
}) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceTimerRef = useRef(null);
  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef(null);
  const didAutoSearchRef = useRef(false);

  const coordsConfirmed = hasValidCoordinates(latitude, longitude);
  const listboxId = `${inputId}-listbox`;

  const cancelPendingSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingSearch();
    };
  }, [cancelPendingSearch]);

  const triggerGeocodingSearch = useCallback(
    async (queryText) => {
      const trimmed = typeof queryText === 'string' ? queryText.trim() : '';
      cancelPendingSearch();

      if (trimmed.length < 3 || !isAuthenticated) {
        requestSeqRef.current += 1;
        setResults([]);
        setActiveIndex(-1);
        setIsSearching(false);
        setSearchError(null);
        setHasSearched(false);
        setIsOpen(false);
        return;
      }

      const requestId = ++requestSeqRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setSearchError(null);
      setResults([]);
      setActiveIndex(-1);
      setIsOpen(true);

      try {
        const candidates = await searchDestinationLocations(getAccessToken, trimmed, 5, {
          signal: controller.signal,
        });
        if (requestSeqRef.current === requestId && !controller.signal.aborted) {
          setResults(candidates);
          setActiveIndex(candidates.length > 0 ? 0 : -1);
          setHasSearched(true);
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return;
        }
        if (requestSeqRef.current === requestId && !controller.signal.aborted) {
          setResults([]);
          setActiveIndex(-1);
          setSearchError(err.message || 'Unable to search destinations right now.');
          setHasSearched(true);
        }
      } finally {
        if (requestSeqRef.current === requestId && !controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [cancelPendingSearch, getAccessToken, isAuthenticated]
  );

  useEffect(() => {
    if (
      autoSearchOnMount &&
      !didAutoSearchRef.current &&
      isAuthenticated &&
      !coordsConfirmed &&
      value.trim().length >= 3
    ) {
      didAutoSearchRef.current = true;
      triggerGeocodingSearch(value);
    }
  }, [autoSearchOnMount, isAuthenticated, coordsConfirmed, value, triggerGeocodingSearch]);

  const handleInputChange = (event) => {
    const nextText = event.target.value;

    // Cancel any in-flight request and invalidate old request sequence immediately
    cancelPendingSearch();
    requestSeqRef.current += 1;

    // Immediately clear stale results and any previously selected coordinates when user edits text
    setResults([]);
    setActiveIndex(-1);
    setIsSearching(false);
    setSearchError(null);
    setHasSearched(false);

    onDestinationChange({
      destinationName: nextText,
      destinationLatitude: null,
      destinationLongitude: null,
    });

    const trimmed = nextText.trim();
    if (trimmed.length < 3) {
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerGeocodingSearch(nextText);
    }, 350);
  };

  const handleSelectCandidate = (candidate) => {
    cancelPendingSearch();
    requestSeqRef.current += 1;
    setIsOpen(false);
    setResults([]);
    setActiveIndex(-1);
    setIsSearching(false);
    setHasSearched(false);
    setSearchError(null);

    onDestinationChange({
      destinationName: candidate.displayName || candidate.name,
      destinationLatitude: candidate.latitude,
      destinationLongitude: candidate.longitude,
    });
  };

  const handleClearCoordinates = () => {
    cancelPendingSearch();
    requestSeqRef.current += 1;
    setResults([]);
    setActiveIndex(-1);
    setIsOpen(false);
    setHasSearched(false);
    setSearchError(null);

    onDestinationChange({
      destinationName: value,
      destinationLatitude: null,
      destinationLongitude: null,
    });
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      if (results.length > 0) {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      if (results.length > 0) {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      }
      return;
    }

    if (event.key === 'Enter') {
      if (isOpen && results.length > 0 && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        handleSelectCandidate(results[activeIndex]);
        return;
      }
      if (!coordsConfirmed && value.trim().length >= 3 && isAuthenticated && !hasSearched) {
        event.preventDefault();
        triggerGeocodingSearch(value);
      }
    }
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 && results[activeIndex]
      ? `${inputId}-option-${activeIndex}`
      : undefined;

  return (
    <div className="destination-search">
      <div className="destination-label-row">
        <label htmlFor={inputId} className="form-label">
          {label} <span aria-hidden="true">*</span>
        </label>
        {coordsConfirmed ? (
          <span
            className="coord-status-badge coord-status-verified"
            data-testid="coord-status-verified"
          >
            Map Ready ({Number(latitude).toFixed(4)}°, {Number(longitude).toFixed(4)}°)
          </span>
        ) : value.trim().length > 0 ? (
          <span
            className="coord-status-badge coord-status-unverified"
            data-testid="coord-status-unverified"
          >
            Unverified Text (No Map Coordinates)
          </span>
        ) : null}
      </div>

      <div className="destination-input-row">
        <input
          id={inputId}
          name="destinationName"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(isOpen && results.length > 0)}
          aria-controls={isOpen && results.length > 0 ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          className={error ? 'form-input form-input-error' : 'form-input'}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
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
            <ul
              id={listboxId}
              className="destination-results-list"
              role="listbox"
              aria-label="Matching places"
            >
              {results.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <li
                    key={item.id}
                    id={`${inputId}-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    className="destination-result-item"
                  >
                    <button
                      type="button"
                      className={
                        isSelected
                          ? 'destination-result-btn destination-result-btn-active'
                          : 'destination-result-btn'
                      }
                      onMouseEnter={() => setActiveIndex(idx)}
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
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
