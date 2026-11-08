const ALLOWED_MEMBER_ROLES = new Set(['member', 'viewer']);

/**
 * Validates payload for PATCH /api/trips/:tripId/members/:userId
 */
export function validateUpdateMemberRoleInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      error: 'Request body must be a JSON object with a valid role.',
    };
  }

  const rawRole = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';
  if (!ALLOWED_MEMBER_ROLES.has(rawRole)) {
    return {
      valid: false,
      error: 'Member role must be either "member" or "viewer".',
    };
  }

  return {
    valid: true,
    data: {
      role: rawRole,
    },
  };
}
