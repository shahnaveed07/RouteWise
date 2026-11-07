import { apiRequest } from './apiClient.jsx';

export async function fetchTripItinerary(getAccessToken, tripId) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary`,
    {
      method: 'GET',
      getAccessToken,
    }
  );
  return response?.data;
}

export async function initializeTripItineraryRequest(getAccessToken, tripId) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/initialize`,
    {
      method: 'POST',
      getAccessToken,
    }
  );
  return response?.data;
}

export async function updateDayNotesRequest(
  getAccessToken,
  tripId,
  dayId,
  notes
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/days/${encodeURIComponent(
      dayId
    )}`,
    {
      method: 'PATCH',
      body: { notes },
      getAccessToken,
    }
  );
  return response?.data?.day;
}

export async function fetchDayItems(getAccessToken, tripId, dayId) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/days/${encodeURIComponent(
      dayId
    )}/items`,
    {
      method: 'GET',
      getAccessToken,
    }
  );
  return Array.isArray(response?.data?.items) ? response.data.items : [];
}

export async function createItineraryItemRequest(
  getAccessToken,
  tripId,
  dayId,
  itemPayload
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/days/${encodeURIComponent(
      dayId
    )}/items`,
    {
      method: 'POST',
      body: itemPayload,
      getAccessToken,
    }
  );
  return response?.data?.item;
}

export async function updateItineraryItemRequest(
  getAccessToken,
  tripId,
  dayId,
  itemId,
  itemUpdates
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/days/${encodeURIComponent(
      dayId
    )}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      body: itemUpdates,
      getAccessToken,
    }
  );
  return response?.data?.item;
}

export async function deleteItineraryItemRequest(
  getAccessToken,
  tripId,
  dayId,
  itemId
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/days/${encodeURIComponent(
      dayId
    )}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'DELETE',
      getAccessToken,
    }
  );
  return response?.data?.deletedItemId;
}

export async function reorderItineraryItemsRequest(
  getAccessToken,
  tripId,
  dayId,
  itemIds
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/days/${encodeURIComponent(
      dayId
    )}/items/reorder`,
    {
      method: 'PATCH',
      body: { itemIds },
      getAccessToken,
    }
  );
  return Array.isArray(response?.data?.items) ? response.data.items : [];
}

export async function calculateDayRouteRequest(
  getAccessToken,
  tripId,
  dayId,
  profile = 'driving-car'
) {
  const response = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/days/${encodeURIComponent(
      dayId
    )}/route`,
    {
      method: 'POST',
      body: { profile },
      getAccessToken,
    }
  );
  return response?.data;
}
