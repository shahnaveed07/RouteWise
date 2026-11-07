import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { searchDestinationLocations } from '../services/locationService.jsx';
import { hasValidCoordinates } from '../services/mapConfig.jsx';

export default function PlaceSearch({
  selectedPlace = null,
  onPlaceChange,
  disabled = false,
  inputId = 'activity-place-search',
  label = 'Activity Location / Place (Optional)',
}) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [queryText, setQueryText] = useState(
    selectedPlace?.name
      ? selectedPlace.address
        ? `${selectedPlace.name} (${selectedPlace.address})`
        : selectedPlace.name
      : ''
  );
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceTimerRef = useRef(null);
  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef(null);

  const coordsConfirmed = hasValidCoordinates(
    selectedPlace?.latitude,
    selectedPlace?.longitude
  );
  const listboxId = `${inputId}-listbox`;

  useEffect(() => {
    if (selectedPlace?.name) {
      setQueryText(
        selectedPlace.address
          ? `${selectedPlace.name} (${selectedPlace.address})`
          : selectedPlace.name
      );
    } else if (!selectedPlace) {
      setQueryText('');
    }
  }, [selectedPlace]);

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

  const triggerPlaceSearch = useCallback(
    async (rawQuery) => {
      const trimmed = typeof rawQuery === 'string' ? rawQuery.trim() : '';
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
        const candidates = await searchDestinationLocations(
          getAccessToken,
          trimmed,
          5,
          { signal: controller.signal }
        );
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
          setSearchError(err.message || 'Unable to search places right now.');
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

  const handleInputChange = (event) => {
    const nextText = event.target.value;
    setQueryText(nextText);

    cancelPendingSearch();
    requestSeqRef.current += 1;
    setResults([]);
    setActiveIndex(-1);
    setIsSearching(false);
    setSearchError(null);
    setHasSearched(false);

    // Clear confirmed place if user edits text after selecting a place
    if (selectedPlace) {
      onPlaceChange(null);
    }

    const trimmed = nextText.trim();
    if (trimmed.length < 3) {
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerPlaceSearch(nextText);
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

    const addressParts = [candidate.admin1, candidate.admin2, candidate.country]
      .filter(Boolean)
      .join(', ');

    const normalizedPlace = {
      provider: 'open-meteo-geocoding',
      providerPlaceId: candidate.id ? String(candidate.id) : null,
      name: candidate.name,
      address: addressParts || candidate.displayName || null,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    };

    setQueryText(
      normalizedPlace.address
        ? `${normalizedPlace.name} (${normalizedPlace.address})`
        : normalizedPlace.name
    );
    onPlaceChange(normalizedPlace);
  };

  const handleClearPlace = () => {
    cancelPendingSearch();
    requestSeqRef.current += 1;
    setQueryText('');
    setResults([]);
    setActiveIndex(-1);
    setIsOpen(false);
    setHasSearched(false);
    setSearchError(null);
    onPlaceChange(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      return;
    }
    if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      return;
    }
    if (event.key === 'Enter') {
      if (isOpen && results.length > 0 && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        handleSelectCandidate(results[activeIndex]);
      } else if (!coordsConfirmed && queryText.trim().length >= 3) {
        event.preventDefault();
        triggerPlaceSearch(queryText);
      }
    }
  };

  return (
    <div className="destination-search place-search-field">
      <div className="destination-label-row">
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
        {coordsConfirmed ? (
          <span
            className="coord-status-badge coord-status-verified"
            data-testid="place-coord-verified"
          >
            Confirmed Stop ({Number(selectedPlace.latitude).toFixed(4)}°,{' '}
            {Number(selectedPlace.longitude).toFixed(4)}°)
          </span>
        ) : (
          <span
            className="coord-status-badge coord-status-unverified"
            data-testid="place-coord-unverified"
          >
            No Map Pin Attached
          </span>
        )}
      </div>

      <div className="destination-input-row">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(isOpen && results.length > 0)}
          aria-controls={isOpen && results.length > 0 ? listboxId : undefined}
          autoComplete="off"
          className="form-input"
          value={queryText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          maxLength={180}
          placeholder="Search a city, landmark, or station (e.g. Pahalgam, Gulmarg, Nishat)..."
          disabled={disabled}
        />
        {queryText.trim().length >= 3 && !coordsConfirmed && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => triggerPlaceSearch(queryText)}
            disabled={disabled || isSearching}
          >
            {isSearching ? 'Searching...' : 'Find Place'}
          </button>
        )}
        {(coordsConfirmed || queryText.trim().length > 0) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClearPlace}
            disabled={disabled}
          >
            Clear Location
          </button>
        )}
      </div>

      <p className="field-hint">
        Select a geocoded place to include this activity as a stop on the itinerary map and route calculation. Leave blank for unpinned activities.
      </p>

      {isOpen && (isSearching || searchError || hasSearched) && (
        <div
          className="destination-results-panel"
          role="region"
          aria-label="Activity place search results"
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
                onClick={() => triggerPlaceSearch(queryText)}
              >
                Retry
              </button>
            </div>
          )}

          {!isSearching && !searchError && hasSearched && results.length === 0 && (
            <div className="destination-status-msg" role="status">
              No geocoded places matched &ldquo;{queryText.trim()}&rdquo;. You can save this activity without a pinned location.
            </div>
          )}

          {!isSearching && !searchError && results.length > 0 && (
            <ul
              id={listboxId}
              className="destination-results-list"
              role="listbox"
              aria-label="Matching activity locations"
            >
              {results.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <li
                    key={item.id}
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
                          {[item.admin1, item.admin2, item.country]
                            .filter(Boolean)
                            .join(' • ')}
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
