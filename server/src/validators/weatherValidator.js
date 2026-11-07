/**
 * Validates query parameters for GET /api/weather?latitude=<lat>&longitude=<lon>.
 */
export function validateWeatherQuery(queryObj = {}) {
  const rawLat = queryObj.latitude;
  const rawLon = queryObj.longitude;

  if (
    rawLat === undefined ||
    rawLat === null ||
    String(rawLat).trim() === '' ||
    rawLon === undefined ||
    rawLon === null ||
    String(rawLon).trim() === ''
  ) {
    return {
      valid: false,
      error: 'Both "latitude" and "longitude" query parameters are required.',
    };
  }

  const latitude = Number(String(rawLat).trim());
  const longitude = Number(String(rawLon).trim());

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return {
      valid: false,
      error: 'Parameter "latitude" must be a valid number between -90 and 90.',
    };
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return {
      valid: false,
      error: 'Parameter "longitude" must be a valid number between -180 and 180.',
    };
  }

  return {
    valid: true,
    data: {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
    },
  };
}
