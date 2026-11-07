import { PROVIDER_CONFIG } from '../config/providers.js';

const geocodingCache = new Map();

function getCachedResult(cacheKey) {
  const entry = geocodingCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geocodingCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCachedResult(cacheKey, value) {
  if (geocodingCache.size >= PROVIDER_CONFIG.openMeteo.maxCacheEntries) {
    const oldestKey = geocodingCache.keys().next().value;
    if (oldestKey !== undefined) {
      geocodingCache.delete(oldestKey);
    }
  }
  geocodingCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + PROVIDER_CONFIG.openMeteo.cacheTtlMs,
  });
}

export function clearGeocodingCache() {
  geocodingCache.clear();
}

export function normalizeGeocodingItem(item) {
  if (!item || typeof item !== 'object') return null;

  const lat = Number(item.latitude);
  const lon = Number(item.longitude);
  const name = typeof item.name === 'string' ? item.name.trim() : '';

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  const admin1 = typeof item.admin1 === 'string' && item.admin1.trim() ? item.admin1.trim() : null;
  const admin2 = typeof item.admin2 === 'string' && item.admin2.trim() ? item.admin2.trim() : null;
  const country =
    typeof item.country === 'string' && item.country.trim() ? item.country.trim() : null;
  const countryCode =
    typeof item.country_code === 'string' && item.country_code.trim()
      ? item.country_code.trim().toUpperCase()
      : null;

  const contextParts = [name];
  if (admin1 && admin1.toLowerCase() !== name.toLowerCase()) {
    contextParts.push(admin1);
  }
  if (country && country.toLowerCase() !== (admin1 || '').toLowerCase()) {
    contextParts.push(country);
  }

  return {
    id: String(item.id ?? `${lat.toFixed(6)},${lon.toFixed(6)}`),
    name,
    admin1,
    admin2,
    country,
    countryCode,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lon.toFixed(6)),
    timezone: typeof item.timezone === 'string' ? item.timezone : null,
    displayName: contextParts.join(', '),
  };
}

/**
 * Queries Open-Meteo Geocoding API and returns normalized destination candidates.
 */
export async function searchLocations(
  query,
  count = 5,
  { fetchFn = globalThis.fetch, useCache = true } = {}
) {
  const normalizedKey = `${String(query).trim().toLowerCase()}::${count}`;
  if (useCache) {
    const cached = getCachedResult(normalizedKey);
    if (cached) {
      return cached;
    }
  }

  const url = new URL(PROVIDER_CONFIG.openMeteo.geocodingUrl);
  url.searchParams.set('name', String(query).trim());
  url.searchParams.set('count', String(count));
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

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
        ? 'Destination search timed out while waiting for the geocoding provider.'
        : 'Destination search service is temporarily unreachable.'
    );
    err.statusCode = isTimeout ? 504 : 502;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    const rateErr = new Error(
      'Destination search rate limit reached. Please wait a moment before searching again.'
    );
    rateErr.statusCode = 429;
    throw rateErr;
  }

  if (!response.ok) {
    const upstreamErr = new Error(
      'Destination search service returned an unexpected status. Please try again later.'
    );
    upstreamErr.statusCode = 502;
    throw upstreamErr;
  }

  let data;
  try {
    data = await response.json();
  } catch (_parseErr) {
    const badJsonErr = new Error(
      'Destination search provider returned an unreadable response.'
    );
    badJsonErr.statusCode = 502;
    throw badJsonErr;
  }

  const rawResults = Array.isArray(data?.results) ? data.results : [];
  const results = rawResults.map(normalizeGeocodingItem).filter(Boolean);

  if (useCache) {
    setCachedResult(normalizedKey, results);
  }

  return results;
}
