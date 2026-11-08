const ALLOWED_INVITATION_ROLES = new Set(['member', 'viewer']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Normalizes an email address to trimmed lowercase.
 */
export function normalizeEmailAddress(rawEmail) {
  if (typeof rawEmail !== 'string') {
    return '';
  }
  return rawEmail.trim().toLowerCase();
}

/**
 * Validates payload for POST /api/trips/:tripId/invitations
 */
export function validateCreateInvitationInput(body, ownerEmail = '') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      error: 'Request body must be a JSON object with email and role.',
    };
  }

  const rawEmail = body.email ?? body.invitedEmail;
  const normalizedEmail = normalizeEmailAddress(rawEmail);

  if (!normalizedEmail) {
    return {
      valid: false,
      error: 'Invited email address is required.',
    };
  }

  if (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
    return {
      valid: false,
      error: 'Please provide a valid email address.',
    };
  }

  const normalizedOwnerEmail = normalizeEmailAddress(ownerEmail);
  if (normalizedOwnerEmail && normalizedEmail === normalizedOwnerEmail) {
    return {
      valid: false,
      code: 'CANNOT_INVITE_OWNER',
      error: 'You are the trip owner and cannot send an invitation to your own email address.',
    };
  }

  const rawRole =
    typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';
  if (!ALLOWED_INVITATION_ROLES.has(rawRole)) {
    return {
      valid: false,
      error: 'Invitation role must be either "member" or "viewer".',
    };
  }

  return {
    valid: true,
    data: {
      invitedEmail: normalizedEmail,
      role: rawRole,
    },
  };
}

/**
 * Validates payload for POST /api/trip-invitations/accept and POST /api/trip-invitations/decline
 * Never echoes the raw token back in error messages.
 */
export function validateInvitationTokenInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      error: 'Request body must be a JSON object containing an invitation token.',
    };
  }

  const rawToken = typeof body.token === 'string' ? body.token.trim() : '';
  if (!rawToken) {
    return {
      valid: false,
      error: 'Invitation token is required.',
    };
  }

  // At least 32 random bytes base64url (~43 chars) or hex (~64 chars); bound length safely
  if (rawToken.length < 32 || rawToken.length > 256 || !/^[A-Za-z0-9_-]+$/.test(rawToken)) {
    return {
      valid: false,
      error: 'Invalid or malformed invitation token.',
    };
  }

  return {
    valid: true,
    data: {
      token: rawToken,
    },
  };
}
