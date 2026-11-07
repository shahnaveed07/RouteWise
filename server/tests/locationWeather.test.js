import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLocationSearchQuery } from '../src/validators/locationValidator.js';
import { validateWeatherQuery } from '../src/validators/weatherValidator.js';
import {
  clearGeocodingCache,
  normalizeGeocodingItem,
  searchLocations,
} from '../src/services/geocodingService.js';
import {
  clearWeatherCache,
  describeWmoWeatherCode,
  getForecastByCoordinates,
  normalizeWeatherResponse,
} from '../src/services/weatherService.js';
import { createLocationController } from '../src/controllers/locationController.js';
import { createWeatherController } from '../src/controllers/weatherController.js';

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('locationValidator rejects short (<3 chars), empty, or invalid count queries and accepts valid queries', () => {
  assert.equal(validateLocationSearchQuery({}).valid, false);
  assert.equal(validateLocationSearchQuery({ q: '  ' }).valid, false);
  assert.equal(validateLocationSearchQuery({ q: 'Le' }).valid, false);
  assert.equal(validateLocationSearchQuery({ q: 'A'.repeat(121) }).valid, false);
  assert.equal(validateLocationSearchQuery({ q: 'Srinagar', count: '0' }).valid, false);
  assert.equal(validateLocationSearchQuery({ q: 'Srinagar', count: '25' }).valid, false);

  const valid = validateLocationSearchQuery({ q: '  Srinagar  ', count: '5' });
  assert.equal(valid.valid, true);
  assert.equal(valid.data.query, 'Srinagar');
  assert.equal(valid.data.count, 5);
});

test('geocodingService normalizes disambiguated results and handles empty, 429, 502, and timeout errors (mocked)', async () => {
  clearGeocodingCache();

  const mockFetchSuccess = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      results: [
        {
          id: 1255634,
          name: 'Srinagar',
          latitude: 34.083656,
          longitude: 74.797371,
          country: 'India',
          country_code: 'in',
          admin1: 'Jammu and Kashmir',
          admin2: 'Srinagar',
          timezone: 'Asia/Kolkata',
        },
        {
          id: 1255635,
          name: 'Srinagar',
          latitude: 30.2224,
          longitude: 78.7834,
          country: 'India',
          country_code: 'IN',
          admin1: 'Uttarakhand',
          admin2: 'Pauri Garhwal',
          timezone: 'Asia/Kolkata',
        },
      ],
    }),
  });

  const results = await searchLocations('Srinagar', 5, {
    fetchFn: mockFetchSuccess,
    useCache: false,
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].name, 'Srinagar');
  assert.equal(results[0].admin1, 'Jammu and Kashmir');
  assert.equal(results[0].country, 'India');
  assert.equal(results[0].displayName, 'Srinagar, Jammu and Kashmir, India');
  assert.equal(results[0].latitude, 34.083656);
  assert.equal(results[0].longitude, 74.797371);
  assert.equal(results[1].displayName, 'Srinagar, Uttarakhand, India');

  // Empty results
  const emptyResults = await searchLocations('Zzxxqqnonexistent', 5, {
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }),
    useCache: false,
  });
  assert.deepEqual(emptyResults, []);

  // Rate limit 429
  await assert.rejects(
    () =>
      searchLocations('Srinagar', 5, {
        fetchFn: async () => ({ ok: false, status: 429 }),
        useCache: false,
      }),
    (err) => err.statusCode === 429
  );

  // Upstream 500 -> 502
  await assert.rejects(
    () =>
      searchLocations('Srinagar', 5, {
        fetchFn: async () => ({ ok: false, status: 500 }),
        useCache: false,
      }),
    (err) => err.statusCode === 502
  );

  // Timeout AbortError -> 504
  await assert.rejects(
    () =>
      searchLocations('Srinagar', 5, {
        fetchFn: async () => {
          const abortErr = new Error('The operation was aborted');
          abortErr.name = 'AbortError';
          throw abortErr;
        },
        useCache: false,
      }),
    (err) => err.statusCode === 504
  );

  assert.equal(normalizeGeocodingItem(null), null);
});

test('weatherValidator rejects missing or out-of-range coordinates and accepts valid WGS84 coordinates', () => {
  assert.equal(validateWeatherQuery({}).valid, false);
  assert.equal(validateWeatherQuery({ latitude: '34.08' }).valid, false);
  assert.equal(validateWeatherQuery({ latitude: '95', longitude: '74.79' }).valid, false);
  assert.equal(validateWeatherQuery({ latitude: '34.08', longitude: '-190' }).valid, false);
  assert.equal(validateWeatherQuery({ latitude: 'abc', longitude: '74.79' }).valid, false);

  const valid = validateWeatherQuery({ latitude: '34.083656', longitude: '74.797371' });
  assert.equal(valid.valid, true);
  assert.equal(valid.data.latitude, 34.083656);
  assert.equal(valid.data.longitude, 74.797371);
});

test('weatherService normalizes current and 5-day forecast, WMO codes, attribution, and error states (mocked)', async () => {
  clearWeatherCache();

  assert.equal(describeWmoWeatherCode(0).label, 'Clear sky');
  assert.equal(describeWmoWeatherCode(63).label, 'Moderate rain');
  assert.equal(describeWmoWeatherCode(95).icon, 'thunderstorm');

  const mockWeatherPayload = {
    timezone: 'Asia/Kolkata',
    timezone_abbreviation: 'IST',
    current_units: {
      temperature_2m: '°C',
      relative_humidity_2m: '%',
      precipitation: 'mm',
      wind_speed_10m: 'km/h',
    },
    current: {
      time: '2026-11-07T12:00',
      temperature_2m: 16.4,
      apparent_temperature: 15.1,
      relative_humidity_2m: 58,
      precipitation: 0,
      weather_code: 2,
      wind_speed_10m: 8.5,
    },
    daily_units: {
      temperature_2m_max: '°C',
    },
    daily: {
      time: ['2026-11-07', '2026-11-08'],
      weather_code: [2, 61],
      temperature_2m_max: [18.2, 14.0],
      temperature_2m_min: [5.4, 4.1],
      precipitation_probability_max: [10, 65],
    },
  };

  const normalized = await getForecastByCoordinates(34.083656, 74.797371, {
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => mockWeatherPayload,
    }),
    useCache: false,
  });

  assert.equal(normalized.timezone, 'Asia/Kolkata');
  assert.equal(normalized.current.temperature, 16.4);
  assert.equal(normalized.current.conditionLabel, 'Partly cloudy');
  assert.equal(normalized.daily.length, 2);
  assert.equal(normalized.daily[1].conditionLabel, 'Slight rain');
  assert.equal(normalized.attribution.text, 'Weather data by Open-Meteo');
  assert.equal(normalized.attribution.url, 'https://open-meteo.com/');

  // Incomplete payload throws 502
  assert.throws(
    () => normalizeWeatherResponse({}, { latitude: 34, longitude: 74 }),
    (err) => err.statusCode === 502
  );
});

test('locationController and weatherController return 400 on bad params and 200 on valid requests', async () => {
  const { handleSearchLocations } = createLocationController({
    searchLocationsFn: async (q) => [{ id: '1', name: q, latitude: 34.08, longitude: 74.79 }],
  });

  const badLocRes = createMockRes();
  await handleSearchLocations({ query: { q: 'a' } }, badLocRes, () => {});
  assert.equal(badLocRes.statusCode, 400);

  const okLocRes = createMockRes();
  await handleSearchLocations({ query: { q: 'Srinagar' } }, okLocRes, () => {});
  assert.equal(okLocRes.statusCode, 200);
  assert.equal(okLocRes.body.results.length, 1);

  const { handleGetWeather } = createWeatherController({
    getForecastFn: async (lat, lon) => ({
      coordinates: { latitude: lat, longitude: lon },
      current: { temperature: 15, conditionLabel: 'Clear sky' },
    }),
  });

  const badWeatherRes = createMockRes();
  await handleGetWeather({ query: { latitude: '200', longitude: '74' } }, badWeatherRes, () => {});
  assert.equal(badWeatherRes.statusCode, 400);

  const okWeatherRes = createMockRes();
  await handleGetWeather(
    { query: { latitude: '34.0837', longitude: '74.7973' } },
    okWeatherRes,
    () => {}
  );
  assert.equal(okWeatherRes.statusCode, 200);
  assert.equal(okWeatherRes.body.weather.current.temperature, 15);
});

test('live Open-Meteo Geocoding and Forecast APIs return real normalized data for Srinagar', async () => {
  const geoResults = await searchLocations('Srinagar', 5);
  assert.ok(Array.isArray(geoResults));
  assert.ok(geoResults.length > 0, 'Expected at least one geocoding result for Srinagar');

  const first = geoResults[0];
  assert.equal(typeof first.latitude, 'number');
  assert.equal(typeof first.longitude, 'number');
  assert.ok(first.displayName.includes('Srinagar'));

  const forecast = await getForecastByCoordinates(first.latitude, first.longitude);
  assert.ok(forecast.current);
  assert.equal(typeof forecast.current.temperature, 'number');
  assert.ok(Array.isArray(forecast.daily));
  assert.ok(forecast.daily.length > 0);
  assert.equal(forecast.attribution.url, 'https://open-meteo.com/');
});
