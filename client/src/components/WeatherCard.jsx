import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { hasValidCoordinates } from '../services/mapConfig.jsx';
import { fetchDestinationWeather } from '../services/weatherService.jsx';

const WEATHER_ICON_SYMBOL = Object.freeze({
  clear: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  snow: '❄️',
  showers: '🌦️',
  thunderstorm: '⛈️',
});

export function buildCoordinateWeatherKey(latitude, longitude) {
  if (!hasValidCoordinates(latitude, longitude)) {
    return null;
  }
  return `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;
}

export default function WeatherCard({ latitude, longitude, destinationName }) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [weatherState, setWeatherState] = useState({
    coordKey: null,
    data: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState({
    coordKey: null,
    message: null,
  });

  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef(null);

  const coordsValid = hasValidCoordinates(latitude, longitude);
  const currentCoordKey = buildCoordinateWeatherKey(latitude, longitude);

  const cancelPendingWeatherRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingWeatherRequest();
    };
  }, [cancelPendingWeatherRequest]);

  const loadWeather = useCallback(async () => {
    cancelPendingWeatherRequest();

    if (!coordsValid || !currentCoordKey || !isAuthenticated) {
      requestSeqRef.current += 1;
      setWeatherState({ coordKey: null, data: null });
      setErrorState({ coordKey: null, message: null });
      setIsLoading(false);
      return;
    }

    const requestId = ++requestSeqRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Clear weather from any different coordinate pair immediately so previous destination's
    // weather is never displayed under the new destination.
    setWeatherState((prev) =>
      prev.coordKey === currentCoordKey ? prev : { coordKey: currentCoordKey, data: null }
    );
    setErrorState({ coordKey: currentCoordKey, message: null });
    setIsLoading(true);

    try {
      const data = await fetchDestinationWeather(getAccessToken, latitude, longitude, {
        signal: controller.signal,
      });
      if (requestSeqRef.current === requestId && !controller.signal.aborted) {
        setWeatherState({
          coordKey: currentCoordKey,
          data,
        });
        setErrorState({ coordKey: currentCoordKey, message: null });
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return;
      }
      if (requestSeqRef.current === requestId && !controller.signal.aborted) {
        setErrorState({
          coordKey: currentCoordKey,
          message: err.message || 'Destination weather forecast is currently unavailable.',
        });
      }
    } finally {
      if (requestSeqRef.current === requestId && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [
    cancelPendingWeatherRequest,
    coordsValid,
    currentCoordKey,
    isAuthenticated,
    getAccessToken,
    latitude,
    longitude,
  ]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  if (!coordsValid || !currentCoordKey) {
    return (
      <div className="weather-empty-state" role="region" aria-label="Destination weather unavailable">
        <p className="weather-empty-title">Weather Forecast Unavailable</p>
        <p className="weather-empty-text">
          Confirm a geocoded destination location to view live current conditions and the 5-day
          forecast for {destinationName || 'this trip'}.
        </p>
      </div>
    );
  }

  // Only render weather or error if it belongs to the currently active coordinate pair
  const activeWeather =
    weatherState.coordKey === currentCoordKey ? weatherState.data : null;
  const activeError =
    errorState.coordKey === currentCoordKey ? errorState.message : null;

  if (isLoading && !activeWeather) {
    return (
      <div className="weather-loading-state" role="status" aria-live="polite">
        Loading live weather forecast from Open-Meteo for {destinationName || 'selected destination'}...
      </div>
    );
  }

  if (activeError && !activeWeather) {
    return (
      <div className="weather-error-state" role="alert">
        <p className="weather-empty-title">Weather Service Temporarily Unavailable</p>
        <p className="weather-empty-text">{activeError}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadWeather}>
          Retry Weather Lookup
        </button>
      </div>
    );
  }

  if (!activeWeather || !activeWeather.current) {
    return null;
  }

  const { current, daily = [], attribution } = activeWeather;
  const iconSymbol = WEATHER_ICON_SYMBOL[current.conditionIcon] || '☁️';

  return (
    <div
      className="weather-card-content"
      role="region"
      aria-label={`Weather for ${destinationName}`}
      data-testid="weather-card-content"
      data-coord-key={currentCoordKey}
    >
      {activeError && (
        <div className="weather-stale-banner" role="status">
          <span>Showing cached weather snapshot ({activeError})</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadWeather}>
            Refresh
          </button>
        </div>
      )}

      <div className="weather-current-banner">
        <div className="weather-current-primary">
          <span className="weather-condition-icon" aria-hidden="true">
            {iconSymbol}
          </span>
          <div>
            <div className="weather-temp-main" data-testid="weather-current-temp">
              {current.temperature !== null ? `${current.temperature}${current.temperatureUnit}` : '—'}
            </div>
            <div className="weather-condition-label">{current.conditionLabel}</div>
          </div>
        </div>

        <dl className="weather-metrics-grid">
          <div>
            <dt>Feels Like</dt>
            <dd>
              {current.apparentTemperature !== null
                ? `${current.apparentTemperature}${current.temperatureUnit}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Humidity</dt>
            <dd>
              {current.humidity !== null ? `${current.humidity}${current.humidityUnit}` : '—'}
            </dd>
          </div>
          <div>
            <dt>Wind</dt>
            <dd>
              {current.windSpeed !== null ? `${current.windSpeed} ${current.windSpeedUnit}` : '—'}
            </dd>
          </div>
          <div>
            <dt>Precipitation</dt>
            <dd>
              {current.precipitation !== null
                ? `${current.precipitation} ${current.precipitationUnit}`
                : '0 mm'}
            </dd>
          </div>
        </dl>
      </div>

      {daily.length > 0 && (
        <div className="weather-daily-section">
          <h4 className="weather-daily-heading">5-Day Outlook ({activeWeather.timezone})</h4>
          <div className="weather-daily-grid">
            {daily.map((day) => (
              <div key={day.date} className="weather-day-item">
                <div className="weather-day-date">{day.date}</div>
                <div className="weather-day-cond">
                  <span aria-hidden="true">
                    {WEATHER_ICON_SYMBOL[day.conditionIcon] || '☁️'}
                  </span>{' '}
                  <span>{day.conditionLabel}</span>
                </div>
                <div className="weather-day-temps">
                  <span className="temp-max">
                    {day.tempMax !== null ? `${day.tempMax}°` : '—'}
                  </span>
                  {' / '}
                  <span className="temp-min">
                    {day.tempMin !== null ? `${day.tempMin}°` : '—'}
                  </span>
                </div>
                {day.precipitationProbabilityMax !== null && (
                  <div className="weather-day-precip">
                    Rain chance: {day.precipitationProbabilityMax}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-attribution-bar">
        <span>
          <a
            href={attribution?.url || 'https://open-meteo.com/'}
            target="_blank"
            rel="noopener noreferrer"
          >
            {attribution?.text || 'Weather data by Open-Meteo'}
          </a>{' '}
          ({attribution?.license || 'CC BY 4.0'})
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadWeather}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Weather'}
        </button>
      </div>
    </div>
  );
}
