import { PROVIDER_CONFIG } from '../config/providers.js';

const weatherCache = new Map();

const WMO_WEATHER_CODE_MAP = Object.freeze({
  0: { label: 'Clear sky', icon: 'clear' },
  1: { label: 'Mainly clear', icon: 'partly-cloudy' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy' },
  3: { label: 'Overcast', icon: 'cloudy' },
  45: { label: 'Fog', icon: 'fog' },
  48: { label: 'Depositing rime fog', icon: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle' },
  53: { label: 'Moderate drizzle', icon: 'drizzle' },
  55: { label: 'Dense drizzle', icon: 'drizzle' },
  56: { label: 'Light freezing drizzle', icon: 'drizzle' },
  57: { label: 'Dense freezing drizzle', icon: 'drizzle' },
  61: { label: 'Slight rain', icon: 'rain' },
  63: { label: 'Moderate rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  66: { label: 'Light freezing rain', icon: 'rain' },
  67: { label: 'Heavy freezing rain', icon: 'rain' },
  71: { label: 'Slight snow fall', icon: 'snow' },
  73: { label: 'Moderate snow fall', icon: 'snow' },
  75: { label: 'Heavy snow fall', icon: 'snow' },
  77: { label: 'Snow grains', icon: 'snow' },
  80: { label: 'Slight rain showers', icon: 'showers' },
  81: { label: 'Moderate rain showers', icon: 'showers' },
  82: { label: 'Violent rain showers', icon: 'showers' },
  85: { label: 'Slight snow showers', icon: 'snow' },
  86: { label: 'Heavy snow showers', icon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm' },
  96: { label: 'Thunderstorm with slight hail', icon: 'thunderstorm' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'thunderstorm' },
});

export function describeWmoWeatherCode(code) {
  const numericCode = Number(code);
  if (Number.isInteger(numericCode) && WMO_WEATHER_CODE_MAP[numericCode]) {
    return {
      code: numericCode,
      ...WMO_WEATHER_CODE_MAP[numericCode],
    };
  }
  return {
    code: Number.isFinite(numericCode) ? numericCode : null,
    label: 'Conditions unavailable',
    icon: 'cloudy',
  };
}

function getCachedWeather(cacheKey) {
  const entry = weatherCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    weatherCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCachedWeather(cacheKey, value) {
  if (weatherCache.size >= PROVIDER_CONFIG.openMeteo.maxCacheEntries) {
    const oldestKey = weatherCache.keys().next().value;
    if (oldestKey !== undefined) {
      weatherCache.delete(oldestKey);
    }
  }
  weatherCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + PROVIDER_CONFIG.openMeteo.cacheTtlMs,
  });
}

export function clearWeatherCache() {
  weatherCache.clear();
}

export function normalizeWeatherResponse(data, requestedCoords) {
  if (!data || typeof data !== 'object' || !data.current || typeof data.current !== 'object') {
    const err = new Error('Weather provider returned an incomplete forecast payload.');
    err.statusCode = 502;
    throw err;
  }

  const currentCondition = describeWmoWeatherCode(data.current.weather_code);
  const currentUnits = data.current_units || {};
  const dailyUnits = data.daily_units || {};

  const current = {
    time: data.current.time || null,
    temperature:
      typeof data.current.temperature_2m === 'number' ? data.current.temperature_2m : null,
    temperatureUnit: currentUnits.temperature_2m || '°C',
    apparentTemperature:
      typeof data.current.apparent_temperature === 'number'
        ? data.current.apparent_temperature
        : null,
    humidity:
      typeof data.current.relative_humidity_2m === 'number'
        ? data.current.relative_humidity_2m
        : null,
    humidityUnit: currentUnits.relative_humidity_2m || '%',
    precipitation:
      typeof data.current.precipitation === 'number' ? data.current.precipitation : 0,
    precipitationUnit: currentUnits.precipitation || 'mm',
    windSpeed:
      typeof data.current.wind_speed_10m === 'number' ? data.current.wind_speed_10m : null,
    windSpeedUnit: currentUnits.wind_speed_10m || 'km/h',
    weatherCode: currentCondition.code,
    conditionLabel: currentCondition.label,
    conditionIcon: currentCondition.icon,
  };

  const dailyTimes = Array.isArray(data.daily?.time) ? data.daily.time : [];
  const dailyMax = Array.isArray(data.daily?.temperature_2m_max)
    ? data.daily.temperature_2m_max
    : [];
  const dailyMin = Array.isArray(data.daily?.temperature_2m_min)
    ? data.daily.temperature_2m_min
    : [];
  const dailyPrecipProb = Array.isArray(data.daily?.precipitation_probability_max)
    ? data.daily.precipitation_probability_max
    : [];
  const dailyCodes = Array.isArray(data.daily?.weather_code) ? data.daily.weather_code : [];

  const daily = dailyTimes.map((dateStr, idx) => {
    const cond = describeWmoWeatherCode(dailyCodes[idx]);
    return {
      date: dateStr,
      tempMax: typeof dailyMax[idx] === 'number' ? dailyMax[idx] : null,
      tempMin: typeof dailyMin[idx] === 'number' ? dailyMin[idx] : null,
      temperatureUnit: dailyUnits.temperature_2m_max || '°C',
      precipitationProbabilityMax:
        typeof dailyPrecipProb[idx] === 'number' ? dailyPrecipProb[idx] : null,
      weatherCode: cond.code,
      conditionLabel: cond.label,
      conditionIcon: cond.icon,
    };
  });

  return {
    coordinates: {
      latitude: requestedCoords.latitude,
      longitude: requestedCoords.longitude,
    },
    timezone: typeof data.timezone === 'string' ? data.timezone : 'UTC',
    timezoneAbbreviation:
      typeof data.timezone_abbreviation === 'string' ? data.timezone_abbreviation : '',
    current,
    daily,
    attribution: PROVIDER_CONFIG.openMeteo.attribution,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetches current weather and 5-day forecast from Open-Meteo Forecast API.
 */
export async function getForecastByCoordinates(
  latitude,
  longitude,
  { fetchFn = globalThis.fetch, useCache = true } = {}
) {
  const cacheKey = `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;
  if (useCache) {
    const cached = getCachedWeather(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const url = new URL(PROVIDER_CONFIG.openMeteo.forecastUrl);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m'
  );
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  );
  url.searchParams.set('forecast_days', '5');
  url.searchParams.set('timezone', 'auto');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_CONFIG.openMeteo.timeoutMs);

  let response;
  try {
    response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    const isTimeout = networkErr && networkErr.name === 'AbortError';
    const err = new Error(
      isTimeout
        ? 'Weather forecast request timed out while waiting for Open-Meteo.'
        : 'Weather forecast service is temporarily unreachable.'
    );
    err.statusCode = isTimeout ? 504 : 502;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    const rateErr = new Error(
      'Weather forecast rate limit reached. Please wait a moment before retrying.'
    );
    rateErr.statusCode = 429;
    throw rateErr;
  }

  if (!response.ok) {
    const upstreamErr = new Error(
      'Weather forecast provider returned an unexpected response status.'
    );
    upstreamErr.statusCode = 502;
    throw upstreamErr;
  }

  let rawData;
  try {
    rawData = await response.json();
  } catch (_parseErr) {
    const badJsonErr = new Error('Weather forecast provider returned malformed JSON.');
    badJsonErr.statusCode = 502;
    throw badJsonErr;
  }

  const normalized = normalizeWeatherResponse(rawData, { latitude, longitude });
  if (useCache) {
    setCachedWeather(cacheKey, normalized);
  }
  return normalized;
}
