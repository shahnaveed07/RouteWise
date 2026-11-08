import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express, { Router } from 'express';
import { createRequireAuth } from '../src/middleware/auth.js';
import { createTripAccessMiddleware } from '../src/middleware/tripAccess.js';
import {
  normalizeEmailAddress,
  validateCreateInvitationInput,
  validateInvitationTokenInput,
} from '../src/validators/invitationValidator.js';
import {
  generateInvitationToken,
  hashInvitationToken,
} from '../src/services/invitationService.js';
import {
  acceptTripInvitationHandler,
  createTripInvitationHandler,
  declineTripInvitationHandler,
  getTripInvitationsHandler,
  revokeTripInvitationHandler,
} from '../src/controllers/invitationController.js';
import {
  getTripMembersHandler,
  removeTripMemberHandler,
} from '../src/controllers/memberController.js';
import {
  handleGetTrip,
  handleListTrips,
} from '../src/controllers/tripController.js';
import { getOrCreateUser } from '../src/services/userService.js';
import { createTrip } from '../src/services/tripService.js';
import { pool, query } from '../src/config/db.js';

test('invitationValidator & token cryptography: email normalization, token generation, and SHA-256 hashing', () => {
  assert.equal(
    normalizeEmailAddress('  Shariq.Traveller@RouteWise.Test '),
    'shariq.traveller@routewise.test'
  );

  const validCreate = validateCreateInvitationInput({
    email: '  Invite.Me@RouteWise.Test  ',
    role: 'MEMBER',
  });
  assert.equal(validCreate.valid, true);
  assert.equal(validCreate.data.invitedEmail, 'invite.me@routewise.test');
  assert.equal(validCreate.data.role, 'member');

  const invalidEmail = validateCreateInvitationInput({
    email: 'not-an-email',
    role: 'viewer',
  });
  assert.equal(invalidEmail.valid, false);

  const emptyEmail = validateCreateInvitationInput({
    email: '   ',
    role: 'member',
  });
  assert.equal(emptyEmail.valid, false);

  const invalidRole = validateCreateInvitationInput({
    email: 'user@routewise.test',
    role: 'owner',
  });
  assert.equal(invalidRole.valid, false);

  // Cryptographic token generation: 32 random bytes base64url (>= 43 chars)
  const rawToken1 = generateInvitationToken();
  const rawToken2 = generateInvitationToken();
  assert.notEqual(rawToken1, rawToken2);
  assert.ok(rawToken1.length >= 43);
  assert.match(rawToken1, /^[A-Za-z0-9_-]+$/);

  const hash1 = hashInvitationToken(rawToken1);
  assert.equal(hash1.length, 64);
  assert.notEqual(hash1, rawToken1);
  assert.equal(
    hash1,
    crypto.createHash('sha256').update(rawToken1, 'utf8').digest('hex')
  );

  const validTokenCheck = validateInvitationTokenInput({ token: rawToken1 });
  assert.equal(validTokenCheck.valid, true);

  const shortTokenCheck = validateInvitationTokenInput({ token: 'short-tok' });
  assert.equal(shortTokenCheck.valid, false);
});

test('Trip Invitation Lifecycle, Token Security, Expiration, Reactivation & Concurrent Acceptance', async (t) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const createdTripIds = [];
  const createdUserIds = [];

  const tokenMap = {
    'owner-token': {
      uid: `inv-owner-${runId}`,
      email: `inv-owner-${runId}@routewise.test`,
      name: 'Owner Naveed',
      emailVerified: true,
    },
    'member-b-token': {
      uid: `inv-mem-b-${runId}`,
      email: `inv-mem-b-${runId}@routewise.test`,
      name: 'Invited Member B',
      emailVerified: true,
    },
    'viewer-c-token': {
      uid: `inv-view-c-${runId}`,
      email: `inv-view-c-${runId}@routewise.test`,
      name: 'Invited Viewer C',
      emailVerified: true,
    },
    'decline-d-token': {
      uid: `inv-dec-d-${runId}`,
      email: `inv-dec-d-${runId}@routewise.test`,
      name: 'Declining User D',
      emailVerified: true,
    },
    'revoke-e-token': {
      uid: `inv-rev-e-${runId}`,
      email: `inv-rev-e-${runId}@routewise.test`,
      name: 'Revoked User E',
      emailVerified: true,
    },
    'expired-f-token': {
      uid: `inv-exp-f-${runId}`,
      email: `inv-exp-f-${runId}@routewise.test`,
      name: 'Expired User F',
      emailVerified: true,
    },
    'legacy-g-token': {
      uid: `inv-leg-g-${runId}`,
      email: `inv-leg-g-${runId}@routewise.test`,
      name: 'Legacy Pending User G',
      emailVerified: true,
    },
    'concurrent-h-token': {
      uid: `inv-conc-h-${runId}`,
      email: `inv-conc-h-${runId}@routewise.test`,
      name: 'Concurrent User H',
      emailVerified: true,
    },
    'unverified-token': {
      uid: `inv-mem-b-${runId}`,
      email: `inv-mem-b-${runId}@routewise.test`,
      name: 'Invited Member B',
      emailVerified: false,
    },
    'outsider-token': {
      uid: `inv-out-${runId}`,
      email: `inv-out-${runId}@routewise.test`,
      name: 'Wrong Account Outsider',
      emailVerified: true,
    },
  };

  const testAuth = createRequireAuth({
    verifyToken: async (token) => {
      if (tokenMap[token]) return tokenMap[token];
      const err = new Error('Invalid token');
      err.code = 'auth/invalid-id-token';
      throw err;
    },
    syncUser: async (uid, email, name) => {
      const u = await getOrCreateUser(uid, email, name);
      if (u?.id && !createdUserIds.includes(u.id)) {
        createdUserIds.push(u.id);
      }
      return u;
    },
  });

  const { requireTripAccess, requireTripOwner } = createTripAccessMiddleware();

  const app = express();
  app.use(express.json());

  const tripRouter = Router({ mergeParams: true });
  tripRouter.use(testAuth);
  tripRouter.get('/', handleListTrips);
  tripRouter.get('/:tripId', requireTripAccess, handleGetTrip);
  tripRouter.get('/:tripId/members', requireTripAccess, getTripMembersHandler);
  tripRouter.delete(
    '/:tripId/members/:userId',
    requireTripAccess,
    requireTripOwner,
    removeTripMemberHandler
  );
  tripRouter.get(
    '/:tripId/invitations',
    requireTripAccess,
    requireTripOwner,
    getTripInvitationsHandler
  );
  tripRouter.post(
    '/:tripId/invitations',
    requireTripAccess,
    requireTripOwner,
    createTripInvitationHandler
  );
  tripRouter.delete(
    '/:tripId/invitations/:invitationId',
    requireTripAccess,
    requireTripOwner,
    revokeTripInvitationHandler
  );

  const inviteResponseRouter = Router();
  inviteResponseRouter.use(testAuth);
  inviteResponseRouter.post('/accept', acceptTripInvitationHandler);
  inviteResponseRouter.post('/decline', declineTripInvitationHandler);

  app.use('/api/trips', tripRouter);
  app.use('/api/trip-invitations', inviteResponseRouter);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const apiBase = `http://127.0.0.1:${port}/api`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const tripId of createdTripIds) {
      await query('DELETE FROM trips WHERE id = $1', [tripId]).catch(() => {});
    }
    for (const userId of createdUserIds) {
      await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
  });

  const requestJson = async (reqPath, { method = 'GET', token, body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${apiBase}${reqPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const extractTokenFromLink = (invitationLink) => {
    assert.ok(invitationLink.startsWith('/invitations/accept#token='));
    const fragment = invitationLink.split('#')[1] || '';
    const params = new URLSearchParams(fragment);
    return params.get('token');
  };

  // Provision owner and create trip
  const ownerUser = await getOrCreateUser(
    tokenMap['owner-token'].uid,
    tokenMap['owner-token'].email,
    tokenMap['owner-token'].name
  );
  createdUserIds.push(ownerUser.id);

  const trip = await createTrip(ownerUser.id, {
    title: `Invitation Lifecycle Trip ${runId}`,
    destinationName: 'Zurich, Switzerland',
    destinationLatitude: 47.376887,
    destinationLongitude: 8.541694,
    description: 'Testing invitation lifecycle and security',
    startDate: '2026-10-01',
    endDate: '2026-10-06',
    plannedBudget: '2500.00',
    currency: 'EUR',
  });
  createdTripIds.push(trip.id);

  // 19-20. Owner can create member and viewer invitations
  const createMemberInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: {
        email: `  ${tokenMap['member-b-token'].email.toUpperCase()}  `,
        role: 'member',
      },
    }
  );
  assert.equal(createMemberInviteRes.status, 201);
  assert.equal(
    createMemberInviteRes.data.invitation.invitedEmail,
    tokenMap['member-b-token'].email
  );
  assert.equal(createMemberInviteRes.data.invitation.role, 'member');
  assert.equal(createMemberInviteRes.data.invitation.status, 'pending');
  assert.equal(
    createMemberInviteRes.data.deliveryNotice,
    'Invitation link created — share this link with the invited person.'
  );
  const memberBRawToken = extractTokenFromLink(
    createMemberInviteRes.data.invitationLink
  );
  assert.ok(memberBRawToken && memberBRawToken.length >= 43);

  const createViewerInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: {
        email: tokenMap['viewer-c-token'].email,
        role: 'viewer',
      },
    }
  );
  assert.equal(createViewerInviteRes.status, 201);
  assert.equal(createViewerInviteRes.data.invitation.role, 'viewer');
  const viewerCRawToken = extractTokenFromLink(
    createViewerInviteRes.data.invitationLink
  );

  // 21-22 & 25. Validation rejections: invalid email, empty email, invalid role, owner inviting self, duplicate pending invitation
  const badEmailRes = await requestJson(`/trips/${trip.id}/invitations`, {
    method: 'POST',
    token: 'owner-token',
    body: { email: 'invalid-email-format', role: 'member' },
  });
  assert.equal(badEmailRes.status, 400);

  const badRoleRes = await requestJson(`/trips/${trip.id}/invitations`, {
    method: 'POST',
    token: 'owner-token',
    body: { email: 'someone@routewise.test', role: 'owner' },
  });
  assert.equal(badRoleRes.status, 400);

  const inviteSelfRes = await requestJson(`/trips/${trip.id}/invitations`, {
    method: 'POST',
    token: 'owner-token',
    body: { email: tokenMap['owner-token'].email, role: 'member' },
  });
  assert.equal(inviteSelfRes.status, 400);
  assert.equal(inviteSelfRes.data.code, 'CANNOT_INVITE_OWNER');

  const duplicatePendingRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: { email: tokenMap['member-b-token'].email, role: 'viewer' },
    }
  );
  assert.equal(duplicatePendingRes.status, 409);
  assert.equal(duplicatePendingRes.data.code, 'DUPLICATE_PENDING_INVITATION');

  // 28-30. Token hashing & listing confidentiality:
  // Raw token is NOT stored in PostgreSQL; only SHA-256 hash is stored; GET list never returns token or tokenHash
  const dbInviteRow = await query(
    `SELECT token_hash FROM trip_invitations WHERE id = $1`,
    [createMemberInviteRes.data.invitation.id]
  );
  assert.equal(dbInviteRow.rows.length, 1);
  assert.notEqual(dbInviteRow.rows[0].token_hash, memberBRawToken);
  assert.equal(
    dbInviteRow.rows[0].token_hash,
    hashInvitationToken(memberBRawToken)
  );

  const ownerListInvitesRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      token: 'owner-token',
    }
  );
  assert.equal(ownerListInvitesRes.status, 200);
  assert.equal(ownerListInvitesRes.data.invitations.length, 2);
  for (const inv of ownerListInvitesRes.data.invitations) {
    assert.equal(inv.token, undefined);
    assert.equal(inv.tokenHash, undefined);
    assert.equal(inv.token_hash, undefined);
    assert.equal(inv.invitationLink, undefined);
  }

  // 31-33. Acceptance security: unauthenticated (401), unverified email (403), wrong authenticated email (403)
  const unauthAcceptRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    body: { token: memberBRawToken },
  });
  assert.equal(unauthAcceptRes.status, 401);

  const unverifiedAcceptRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'unverified-token',
    body: { token: memberBRawToken },
  });
  assert.equal(unverifiedAcceptRes.status, 403);
  assert.equal(unverifiedAcceptRes.data.code, 'EMAIL_NOT_VERIFIED');

  const wrongEmailAcceptRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'outsider-token',
    body: { token: memberBRawToken },
  });
  assert.equal(wrongEmailAcceptRes.status, 403);
  assert.equal(wrongEmailAcceptRes.data.code, 'INVITATION_EMAIL_MISMATCH');

  const wrongEmailDeclineRes = await requestJson(`/trip-invitations/decline`, {
    method: 'POST',
    token: 'outsider-token',
    body: { token: memberBRawToken },
  });
  assert.equal(wrongEmailDeclineRes.status, 403);
  assert.equal(wrongEmailDeclineRes.data.code, 'INVITATION_EMAIL_MISMATCH');

  // 34 & 39. Correct authenticated user (Member B) accepts invitation -> active member; cannot reuse accepted invitation (409)
  const memberBAcceptRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'member-b-token',
    body: { token: memberBRawToken },
  });
  assert.equal(memberBAcceptRes.status, 200);
  assert.equal(memberBAcceptRes.data.invitation.status, 'accepted');
  assert.equal(memberBAcceptRes.data.membership.role, 'member');
  assert.equal(memberBAcceptRes.data.membership.membershipStatus, 'active');

  // Viewer C also accepts viewer invitation
  const viewerCAcceptRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'viewer-c-token',
    body: { token: viewerCRawToken },
  });
  assert.equal(viewerCAcceptRes.status, 200);
  assert.equal(viewerCAcceptRes.data.membership.role, 'viewer');

  // Reuse of accepted invitation rejected (409 INVITATION_ACCEPTED)
  const reuseAcceptedRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'member-b-token',
    body: { token: memberBRawToken },
  });
  assert.equal(reuseAcceptedRes.status, 409);
  assert.equal(reuseAcceptedRes.data.code, 'INVITATION_ACCEPTED');

  // 23-24 & 26-27. Non-owner (Member B, Viewer C, Outsider) cannot create, list, or revoke invitations;
  // Already-active member cannot be invited again (409 ALREADY_ACTIVE_TRIP_MEMBER)
  const alreadyActiveInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: { email: tokenMap['member-b-token'].email, role: 'viewer' },
    }
  );
  assert.equal(alreadyActiveInviteRes.status, 409);
  assert.equal(alreadyActiveInviteRes.data.code, 'ALREADY_ACTIVE_TRIP_MEMBER');

  const memberCreateInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'member-b-token',
      body: { email: 'newperson@routewise.test', role: 'viewer' },
    }
  );
  assert.equal(memberCreateInviteRes.status, 403);

  const viewerCreateInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'viewer-c-token',
      body: { email: 'newperson@routewise.test', role: 'viewer' },
    }
  );
  assert.equal(viewerCreateInviteRes.status, 403);

  const memberListInvitesRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      token: 'member-b-token',
    }
  );
  assert.equal(memberListInvitesRes.status, 403);

  const outsiderListInvitesRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      token: 'outsider-token',
    }
  );
  assert.equal(outsiderListInvitesRes.status, 404);

  // 35 & 40. Declining a valid invitation sets status = 'declined', creates no membership, and cannot be accepted later
  const createDeclineInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: { email: tokenMap['decline-d-token'].email, role: 'member' },
    }
  );
  assert.equal(createDeclineInviteRes.status, 201);
  const declineDRawToken = extractTokenFromLink(
    createDeclineInviteRes.data.invitationLink
  );

  const declineRes = await requestJson(`/trip-invitations/decline`, {
    method: 'POST',
    token: 'decline-d-token',
    body: { token: declineDRawToken },
  });
  assert.equal(declineRes.status, 200);
  assert.equal(declineRes.data.invitation.status, 'declined');
  assert.ok(declineRes.data.invitation.respondedAt);

  // Verify User D is NOT a trip member
  const userDTripRes = await requestJson(`/trips/${trip.id}`, {
    token: 'decline-d-token',
  });
  assert.equal(userDTripRes.status, 404);

  // Declined invitation cannot be accepted later
  const acceptAfterDeclineRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'decline-d-token',
    body: { token: declineDRawToken },
  });
  assert.equal(acceptAfterDeclineRes.status, 409);
  assert.equal(acceptAfterDeclineRes.data.code, 'INVITATION_DECLINED');

  // 36 & 38. Revoking a pending invitation sets status = 'revoked', preserves row for audit, and prevents acceptance
  const createRevokeInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: { email: tokenMap['revoke-e-token'].email, role: 'viewer' },
    }
  );
  assert.equal(createRevokeInviteRes.status, 201);
  const revokeInviteId = createRevokeInviteRes.data.invitation.id;
  const revokeERawToken = extractTokenFromLink(
    createRevokeInviteRes.data.invitationLink
  );

  // Non-owner cannot revoke (403)
  const memberRevokeRes = await requestJson(
    `/trips/${trip.id}/invitations/${revokeInviteId}`,
    {
      method: 'DELETE',
      token: 'member-b-token',
    }
  );
  assert.equal(memberRevokeRes.status, 403);

  // Owner revokes pending invitation
  const ownerRevokeRes = await requestJson(
    `/trips/${trip.id}/invitations/${revokeInviteId}`,
    {
      method: 'DELETE',
      token: 'owner-token',
    }
  );
  assert.equal(ownerRevokeRes.status, 200);
  assert.equal(ownerRevokeRes.data.invitation.status, 'revoked');

  // Revoked invitation cannot be accepted
  const acceptRevokedRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'revoke-e-token',
    body: { token: revokeERawToken },
  });
  assert.equal(acceptRevokedRes.status, 409);
  assert.equal(acceptRevokedRes.data.code, 'INVITATION_REVOKED');

  // 37. Expired invitation cannot be accepted (410 INVITATION_EXPIRED), transitions to status = 'expired' in DB,
  // and allows owner to create a fresh pending invitation for the same email afterward
  const createExpInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: { email: tokenMap['expired-f-token'].email, role: 'member' },
    }
  );
  assert.equal(createExpInviteRes.status, 201);
  const expiredInviteId = createExpInviteRes.data.invitation.id;
  const expiredFRawToken = extractTokenFromLink(
    createExpInviteRes.data.invitationLink
  );

  // Backdate expires_at into the past
  await query(
    `UPDATE trip_invitations SET expires_at = NOW() - INTERVAL '2 hours' WHERE id = $1`,
    [expiredInviteId]
  );

  const acceptExpiredRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'expired-f-token',
    body: { token: expiredFRawToken },
  });
  assert.equal(acceptExpiredRes.status, 410);
  assert.equal(acceptExpiredRes.data.code, 'INVITATION_EXPIRED');

  const expiredDbCheck = await query(
    `SELECT status FROM trip_invitations WHERE id = $1`,
    [expiredInviteId]
  );
  assert.equal(expiredDbCheck.rows[0].status, 'expired');

  // Owner can now create a fresh pending invitation for the same email
  const reInviteAfterExpiryRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: { email: tokenMap['expired-f-token'].email, role: 'viewer' },
    }
  );
  assert.equal(reInviteAfterExpiryRes.status, 201);

  // 41-42. Legacy 'pending' membership row and previously removed 'inactive' membership row are reactivated cleanly
  // Case A: Remove Member B -> membership_status = 'inactive', then re-invite as 'viewer' and accept
  const memberBUser = (
    await query('SELECT id FROM users WHERE email = $1', [
      tokenMap['member-b-token'].email,
    ])
  ).rows[0];
  const removeBRes = await requestJson(
    `/trips/${trip.id}/members/${memberBUser.id}`,
    {
      method: 'DELETE',
      token: 'owner-token',
    }
  );
  assert.equal(removeBRes.status, 200);

  const reInviteBRes = await requestJson(`/trips/${trip.id}/invitations`, {
    method: 'POST',
    token: 'owner-token',
    body: { email: tokenMap['member-b-token'].email, role: 'viewer' },
  });
  assert.equal(reInviteBRes.status, 201);
  const reInviteBRawToken = extractTokenFromLink(
    reInviteBRes.data.invitationLink
  );

  const reactivateBAcceptRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'member-b-token',
    body: { token: reInviteBRawToken },
  });
  assert.equal(reactivateBAcceptRes.status, 200);
  assert.equal(reactivateBAcceptRes.data.membership.role, 'viewer');
  assert.equal(reactivateBAcceptRes.data.membership.membershipStatus, 'active');

  const countBRows = await query(
    `SELECT COUNT(*)::int AS cnt FROM trip_members WHERE trip_id = $1 AND user_id = $2`,
    [trip.id, memberBUser.id]
  );
  assert.equal(countBRows.rows[0].cnt, 1);

  // Case B: Legacy 'pending' membership row in trip_members
  const legacyGUser = await getOrCreateUser(
    tokenMap['legacy-g-token'].uid,
    tokenMap['legacy-g-token'].email,
    tokenMap['legacy-g-token'].name
  );
  createdUserIds.push(legacyGUser.id);

  await query(
    `INSERT INTO trip_members (trip_id, user_id, role, membership_status)
     VALUES ($1, $2, 'viewer', 'pending')`,
    [trip.id, legacyGUser.id]
  );

  const inviteLegacyGRes = await requestJson(`/trips/${trip.id}/invitations`, {
    method: 'POST',
    token: 'owner-token',
    body: { email: tokenMap['legacy-g-token'].email, role: 'member' },
  });
  assert.equal(inviteLegacyGRes.status, 201);
  const legacyGRawToken = extractTokenFromLink(
    inviteLegacyGRes.data.invitationLink
  );

  const acceptLegacyGRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'legacy-g-token',
    body: { token: legacyGRawToken },
  });
  assert.equal(acceptLegacyGRes.status, 200);
  assert.equal(acceptLegacyGRes.data.membership.role, 'member');
  assert.equal(acceptLegacyGRes.data.membership.membershipStatus, 'active');

  // 43. Concurrent acceptance requests: Promise.all for the same token -> one 200, one 409, single membership row
  const createConcInviteRes = await requestJson(
    `/trips/${trip.id}/invitations`,
    {
      method: 'POST',
      token: 'owner-token',
      body: { email: tokenMap['concurrent-h-token'].email, role: 'member' },
    }
  );
  assert.equal(createConcInviteRes.status, 201);
  const concHRawToken = extractTokenFromLink(
    createConcInviteRes.data.invitationLink
  );

  // Pre-sync Concurrent User H so both requests hit acceptTripInvitation simultaneously
  const concHUser = await getOrCreateUser(
    tokenMap['concurrent-h-token'].uid,
    tokenMap['concurrent-h-token'].email,
    tokenMap['concurrent-h-token'].name
  );
  createdUserIds.push(concHUser.id);

  const [concRes1, concRes2] = await Promise.all([
    requestJson(`/trip-invitations/accept`, {
      method: 'POST',
      token: 'concurrent-h-token',
      body: { token: concHRawToken },
    }),
    requestJson(`/trip-invitations/accept`, {
      method: 'POST',
      token: 'concurrent-h-token',
      body: { token: concHRawToken },
    }),
  ]);

  const statuses = [concRes1.status, concRes2.status].sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 409]);

  const countConcRows = await query(
    `SELECT COUNT(*)::int AS cnt FROM trip_members WHERE trip_id = $1 AND user_id = $2`,
    [trip.id, concHUser.id]
  );
  assert.equal(countConcRows.rows[0].cnt, 1);

  // 44. Invalid / non-existent token returns 404 without leaking sensitive data
  const nonexistentToken = generateInvitationToken();
  const notFoundTokenRes = await requestJson(`/trip-invitations/accept`, {
    method: 'POST',
    token: 'owner-token',
    body: { token: nonexistentToken },
  });
  assert.equal(notFoundTokenRes.status, 404);
  assert.equal(notFoundTokenRes.data.code, 'INVITATION_NOT_FOUND');
});

test.after(async () => {
  await pool.end().catch(() => {});
});
