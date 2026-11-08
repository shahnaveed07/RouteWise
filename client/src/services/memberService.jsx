import { apiRequest } from './apiClient.jsx';

/**
 * Fetches the trip owner and active members for `/trips/:tripId/members`.
 * Accessible to any active trip member (owner, member, viewer).
 */
export async function fetchTripMembers(
  getAccessToken,
  tripId,
  { signal } = {}
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/members`,
    {
      method: 'GET',
      getAccessToken,
      signal,
    }
  );
  return payload?.data || payload;
}

/**
 * Updates an active trip member's role ('member' or 'viewer').
 * Accessible to the trip owner only.
 */
export async function updateTripMemberRoleRequest(
  getAccessToken,
  tripId,
  userId,
  role,
  { signal } = {}
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: { role },
      getAccessToken,
      signal,
    }
  );
  return payload?.data || payload;
}

/**
 * Removes an active trip member non-destructively (`membership_status = 'inactive'`).
 * Accessible to the trip owner only.
 */
export async function removeTripMemberRequest(
  getAccessToken,
  tripId,
  userId,
  { signal } = {}
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      getAccessToken,
      signal,
    }
  );
  return payload?.data || payload;
}

/**
 * Lists invitations for a trip (owner only).
 */
export async function fetchTripInvitations(
  getAccessToken,
  tripId,
  { signal } = {}
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/invitations`,
    {
      method: 'GET',
      getAccessToken,
      signal,
    }
  );
  return payload?.data?.invitations || payload?.invitations || [];
}

/**
 * Creates a new email invitation for a trip (owner only).
 * Returns `{ invitation, invitationLink, token, deliveryNotice, invitations }`.
 */
export async function createTripInvitationRequest(
  getAccessToken,
  tripId,
  invitationInput,
  { signal } = {}
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/invitations`,
    {
      method: 'POST',
      body: invitationInput,
      getAccessToken,
      signal,
    }
  );
  return payload?.data || payload;
}

/**
 * Revokes a pending invitation (owner only).
 */
export async function revokeTripInvitationRequest(
  getAccessToken,
  tripId,
  invitationId,
  { signal } = {}
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/invitations/${encodeURIComponent(invitationId)}`,
    {
      method: 'DELETE',
      getAccessToken,
      signal,
    }
  );
  return payload?.data || payload;
}

/**
 * Accepts a trip invitation by submitting the raw token in a POST JSON body.
 */
export async function acceptTripInvitationRequest(
  getAccessToken,
  token,
  { signal } = {}
) {
  const payload = await apiRequest('/api/trip-invitations/accept', {
    method: 'POST',
    body: { token },
    getAccessToken,
    signal,
  });
  return payload?.data || payload;
}

/**
 * Declines a trip invitation by submitting the raw token in a POST JSON body.
 */
export async function declineTripInvitationRequest(
  getAccessToken,
  token,
  { signal } = {}
) {
  const payload = await apiRequest('/api/trip-invitations/decline', {
    method: 'POST',
    body: { token },
    getAccessToken,
    signal,
  });
  return payload?.data || payload;
}
