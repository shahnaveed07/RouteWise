import { apiRequest } from './apiClient.jsx';

/**
 * Calls the backend weather adapter GET /api/weather?latitude=<lat>&longitude=<lon>.
 */
export async function fetchDestinationWeather(
  getAccessToken,
  latitude,
  longitude,
  { signal } = {}
) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });

  const data = await apiRequest(`/api/weather?${params.toString()}`, {
    method: 'GET',
    getAccessToken,
    signal,
  });

  return data?.weather || null;
}
