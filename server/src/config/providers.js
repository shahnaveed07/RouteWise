/**
 * Centralized external provider configuration for RouteWise backend adapters.
 *
 * Terms & Limits Note:
 * - Open-Meteo Geocoding & Forecast APIs are free for non-commercial / academic use only
 *   (CC BY 4.0 attribution required; subject to fair-use rate limits, ~10,000 calls/day).
 *   They carry no commercial SLA.
 * - openrouteservice (HeiGIT) is registered here for Phase 4 itinerary route calculation.
 *   Note: The legacy host `api.openrouteservice.org` was deprecated; Phase 4 MUST use
 *   `https://api.heigit.org/openrouteservice/v2/` with server-side `OPENROUTESERVICE_API_KEY`.
 */
export const PROVIDER_CONFIG = Object.freeze({
  openMeteo: {
    geocodingUrl: 'https://geocoding-api.open-meteo.com/v1/search',
    forecastUrl: 'https://api.open-meteo.com/v1/forecast',
    timeoutMs: 8000,
    cacheTtlMs: 10 * 60 * 1000,
    maxCacheEntries: 100,
    attribution: {
      text: 'Weather data by Open-Meteo',
      url: 'https://open-meteo.com/',
      license: 'CC BY 4.0 (Non-commercial use)',
    },
  },
  openRouteService: {
    baseUrl: 'https://api.heigit.org/openrouteservice/v2/',
    supportedProfiles: ['driving-car', 'foot-walking', 'cycling-regular'],
    apiKeyEnvVar: 'OPENROUTESERVICE_API_KEY',
    status: 'PLANNED_PHASE_4',
  },
});
