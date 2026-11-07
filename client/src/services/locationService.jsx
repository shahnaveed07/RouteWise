import { apiRequest } from './apiClient.jsx';

/**
 * Calls the backend geocoding adapter GET /api/locations/search?q=<query>&count=<count>.
 */
export async function searchDestinationLocations(
  getAccessToken,
  query,
  count = 5,
  { signal } = {}
) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (trimmed.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmed,
    count: String(count),
  });

  const data = await apiRequest(`/api/locations/search?${params.toString()}`, {
    method: 'GET',
    getAccessToken,
    signal,
  });

  return Array.isArray(data?.results) ? data.results : [];
}
