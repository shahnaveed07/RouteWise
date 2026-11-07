import { useCallback, useEffect, useState } from 'react';
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

export default function WeatherCard({ latitude, longitude, destinationName }) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const coordsValid = hasValidCoordinates(latitude, longitude);

  const loadWeather = useCallback(async () => {
    if (!coordsValid || !isAuthenticated) {
      setWeather(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDestinationWeather(getAccessToken, latitude, longitude);
      setWeather(data);
    } catch (err) {
      setError(err.message || 'Destination weather forecast is currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [coordsValid, isAuthenticated, getAccessToken, latitude, longitude]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  if (!coordsValid) {
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

  if (isLoading && !weather) {
    return (
      <div className="weather-loading-state" role="status" aria-live="polite">
        Loading live weather forecast from Open-Meteo...
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="weather-error-state" role="alert">
        <p className="weather-empty-title">Weather Service Temporarily Unavailable</p>
        <p className="weather-empty-text">{error}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadWeather}>
          Retry Weather Lookup
        </button>
      </div>
    );
  }

  if (!weather || !weather.current) {
    return null;
  }

  const { current, daily = [], attribution } = weather;
  const iconSymbol = WEATHER_ICON_SYMBOL[current.conditionIcon] || '☁️';

  return (
    <div className="weather-card-content" role="region" aria-label={`Weather for ${destinationName}`}>
      {error && (
        <div className="weather-stale-banner" role="status">
          <span>Showing cached weather snapshot ({error})</span>
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
            <div className="weather-temp-main">
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
          <h4 className="weather-daily-heading">5-Day Outlook ({weather.timezone})</h4>
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
