/**
 * Centralized REST API client for RouteWise frontend (.jsx convention).
 * Attaches a verified Firebase ID token to protected requests and normalizes errors.
 * Never sends protected requests when a demo preview persona is active (`token === null`).
 */
export async function apiRequest(path, { method = 'GET', body, getAccessToken } = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (typeof getAccessToken === 'function') {
    const token = await getAccessToken();
    if (!token) {
      const authErr = new Error(
        'Sign-in required: Please sign in with your Google account to access or modify trips.'
      );
      authErr.statusCode = 401;
      authErr.isAuthRequired = true;
      throw authErr;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (_networkError) {
    const netErr = new Error(
      'Unable to reach the RouteWise server. Please check your connection and try again.'
    );
    netErr.statusCode = 0;
    throw netErr;
  }

  if (response.status === 204) {
    return null;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_parseError) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload.error === 'string' && payload.error) ||
      `Request failed with status ${response.status}.`;
    const apiErr = new Error(message);
    apiErr.statusCode = response.status;
    throw apiErr;
  }

  return payload;
}

export async function fetchTrips(getAccessToken) {
  const data = await apiRequest('/api/trips', {
    method: 'GET',
    getAccessToken,
  });
  return Array.isArray(data?.trips) ? data.trips : [];
}

export async function createTripRequest(getAccessToken, tripInput) {
  const data = await apiRequest('/api/trips', {
    method: 'POST',
    body: tripInput,
    getAccessToken,
  });
  return data?.trip;
}

export async function fetchTripById(getAccessToken, tripId) {
  const data = await apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'GET',
    getAccessToken,
  });
  return data?.trip;
}

export async function updateTripRequest(getAccessToken, tripId, tripUpdates) {
  const data = await apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'PATCH',
    body: tripUpdates,
    getAccessToken,
  });
  return data?.trip;
}

export async function deleteTripRequest(getAccessToken, tripId) {
  await apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'DELETE',
    getAccessToken,
  });
  return true;
}
