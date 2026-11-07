import { PROVIDER_CONFIG } from '../config/providers.js';

const PLACEHOLDER_KEYS = new Set([
  '',
  'your-openrouteservice-api-key',
  'your_openrouteservice_api_key',
  'changeme',
  'placeholder',
]);

export function isOpenRouteServiceConfigured() {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ROUTEWISE_ENABLE_LOCAL_E2E_AUTH === 'true' &&
    process.env.ROUTEWISE_ENABLE_LOCAL_E2E_ORS_MOCK === 'true'
  ) {
    return true;
  }

  const rawKey = (process.env.OPENROUTESERVICE_API_KEY || '').trim();
  return rawKey.length > 0 && !PLACEHOLDER_KEYS.has(rawKey.toLowerCase());
}

/**
 * Extracts ordered geocoded stops and skipped items from a day's itinerary items.
 * Notice: openrouteservice requires coordinates in [longitude, latitude] order!
 */
export function extractRouteStopsFromItems(items = []) {
  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const stops = [];
  const skippedItems = [];

  for (const item of ordered) {
    const lat = item.place?.latitude;
    const lon = item.place?.longitude;
    const hasValidCoords =
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      typeof lon === 'number' &&
      Number.isFinite(lon) &&
      lon >= -180 &&
      lon <= 180;

    if (hasValidCoords) {
      stops.push({
        stopNumber: stops.length + 1,
        itemId: item.id,
        title: item.title,
        placeName: item.place.name,
        address: item.place.address || null,
        latitude: lat,
        longitude: lon,
        orsCoordinate: [lon, lat], // [longitude, latitude] for openrouteservice
        sortOrder: item.sortOrder,
        startTime: item.startTime || null,
        endTime: item.endTime || null,
      });
    } else {
      skippedItems.push({
        itemId: item.id,
        title: item.title,
        sortOrder: item.sortOrder,
        reason: 'No confirmed place coordinates attached to this activity.',
      });
    }
  }

  return { stops, skippedItems };
}

function buildLocalE2eControlledRoute({ profile, stops, skippedItems, warnings }) {
  const coordinates = stops.map((stop) => [stop.longitude, stop.latitude]);

  // Approximate great-circle distance across stops for deterministic local E2E verification
  let totalDistanceMeters = 0;
  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1];
    const curr = stops[i];
    const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
    const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((prev.latitude * Math.PI) / 180) *
        Math.cos((curr.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistanceMeters += Math.round(6371000 * c * 1.25);
  }
  if (totalDistanceMeters === 0) {
    totalDistanceMeters = 2400;
  }

  const speedMetersPerSec =
    profile === 'foot-walking' ? 1.4 : profile === 'cycling-regular' ? 4.2 : 11.1;
  const durationSeconds = Math.max(
    120,
    Math.round(totalDistanceMeters / speedMetersPerSec)
  );

  return {
    profile,
    distanceMeters: totalDistanceMeters,
    durationSeconds,
    geometry: {
      type: 'LineString',
      coordinates,
    },
    bbox: null,
    stops: stops.map(({ orsCoordinate, ...rest }) => rest),
    skippedItems,
    warnings,
    attribution: PROVIDER_CONFIG.openRouteService.attribution,
  };
}

/**
 * Calculates a multi-stop route for an itinerary day using openrouteservice (HeiGIT).
 */
export async function calculateDayRoute({ items = [], profile = 'driving-car' }) {
  const { stops, skippedItems } = extractRouteStopsFromItems(items);

  if (stops.length < 2) {
    const error = new Error(
      'At least 2 activities with confirmed map coordinates are required to calculate a route.'
    );
    error.status = 400;
    error.code = 'INSUFFICIENT_ROUTE_STOPS';
    error.details = {
      geocodedStopCount: stops.length,
      skippedItemCount: skippedItems.length,
      skippedItems,
    };
    throw error;
  }

  const warnings = [];
  if (skippedItems.length > 0) {
    warnings.push(
      `${skippedItems.length} activity${
        skippedItems.length === 1 ? ' was' : 'ies were'
      } skipped from route calculation because no location coordinates were set.`
    );
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ROUTEWISE_ENABLE_LOCAL_E2E_AUTH === 'true' &&
    process.env.ROUTEWISE_ENABLE_LOCAL_E2E_ORS_MOCK === 'true'
  ) {
    return buildLocalE2eControlledRoute({
      profile,
      stops,
      skippedItems,
      warnings,
    });
  }

  if (!isOpenRouteServiceConfigured()) {
    const error = new Error(
      'Multi-stop route calculation is currently unavailable because OPENROUTESERVICE_API_KEY is not configured on the server.'
    );
    error.status = 503;
    error.code = 'ROUTING_KEY_MISSING';
    throw error;
  }

  const apiKey = process.env.OPENROUTESERVICE_API_KEY.trim();
  const baseUrl = PROVIDER_CONFIG.openRouteService.baseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/directions/${encodeURIComponent(profile)}/geojson`;
  const orsCoordinates = stops.map((stop) => stop.orsCoordinate);

  const controller = new AbortController();
  const timeoutMs = PROVIDER_CONFIG.openRouteService.timeoutMs || 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json, application/json',
      },
      body: JSON.stringify({
        coordinates: orsCoordinates,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      const timeoutError = new Error(
        'Route calculation request to openrouteservice timed out. Please try again.'
      );
      timeoutError.status = 504;
      timeoutError.code = 'ROUTING_TIMEOUT';
      throw timeoutError;
    }

    const networkError = new Error(
      'Unable to reach openrouteservice routing provider.'
    );
    networkError.status = 502;
    networkError.code = 'ROUTING_UPSTREAM_UNREACHABLE';
    throw networkError;
  } finally {
    clearTimeout(timeoutId);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const upstreamMsg =
      payload?.error?.message ||
      (typeof payload?.error === 'string' ? payload.error : null) ||
      payload?.message ||
      `openrouteservice returned HTTP ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      const authErr = new Error(
        'Route service credentials were rejected by openrouteservice. Check OPENROUTESERVICE_API_KEY configuration.'
      );
      authErr.status = 503;
      authErr.code = 'ROUTING_AUTH_FAILED';
      throw authErr;
    }

    if (response.status === 429) {
      const rateErr = new Error(
        'openrouteservice rate limit reached. Please wait a moment before calculating another route.'
      );
      rateErr.status = 429;
      rateErr.code = 'ROUTING_RATE_LIMIT';
      throw rateErr;
    }

    if (response.status === 400 || response.status === 404) {
      const routeErr = new Error(
        `No valid ${profile} route could be found between the selected activity locations (${upstreamMsg}).`
      );
      routeErr.status = 422;
      routeErr.code = 'ROUTE_NOT_FOUND';
      throw routeErr;
    }

    const genericErr = new Error(
      `openrouteservice routing failed (${response.status}): ${upstreamMsg}`
    );
    genericErr.status = 502;
    genericErr.code = 'ROUTING_UPSTREAM_ERROR';
    throw genericErr;
  }

  const feature = Array.isArray(payload?.features) ? payload.features[0] : null;
  const geometry = feature?.geometry || null;
  const summary = feature?.properties?.summary || {};

  if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    const formatErr = new Error(
      'openrouteservice returned an unexpected route geometry format.'
    );
    formatErr.status = 502;
    formatErr.code = 'ROUTING_INVALID_GEOMETRY';
    throw formatErr;
  }

  return {
    profile,
    distanceMeters:
      typeof summary.distance === 'number' && Number.isFinite(summary.distance)
        ? Math.round(summary.distance)
        : 0,
    durationSeconds:
      typeof summary.duration === 'number' && Number.isFinite(summary.duration)
        ? Math.round(summary.duration)
        : 0,
    geometry,
    bbox: Array.isArray(feature.bbox) ? feature.bbox : Array.isArray(payload.bbox) ? payload.bbox : null,
    stops: stops.map(({ orsCoordinate, ...rest }) => rest),
    skippedItems,
    warnings,
    attribution: PROVIDER_CONFIG.openRouteService.attribution,
  };
}
