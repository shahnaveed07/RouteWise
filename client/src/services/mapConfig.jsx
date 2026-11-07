/**
 * Centralized Leaflet + OpenStreetMap configuration for RouteWise frontend.
 *
 * Usage & Policy Note:
 * - Uses the standard OpenStreetMap tile server for non-commercial academic MVP use.
 * - Public OSM tiles have no commercial SLA or unlimited capacity; replace `tileUrlTemplate`
 *   with a commercial/dedicated tile host if RouteWise is deployed for heavy production traffic.
 */
export const MAP_CONFIG = Object.freeze({
  tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attributionHtml:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  copyrightUrl: 'https://www.openstreetmap.org/copyright',
  defaultZoom: 11,
  minZoom: 2,
  maxZoom: 19,
});

export function hasValidCoordinates(latitude, longitude) {
  if (
    latitude === null ||
    latitude === undefined ||
    latitude === '' ||
    longitude === null ||
    longitude === undefined ||
    longitude === ''
  ) {
    return false;
  }
  const lat = Number(latitude);
  const lon = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
