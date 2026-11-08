import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTrips } from '../services/apiClient.jsx';
import {
  createTripInvitationRequest,
  fetchTripInvitations,
  fetchTripMembers,
  removeTripMemberRequest,
  revokeTripInvitationRequest,
  updateTripMemberRoleRequest,
} from '../services/memberService.jsx';

function formatDateTimeShort(isoStr) {
  if (!isoStr) return '—';
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return String(isoStr);
  return date.toISOString().slice(0, 10);
}

function getRoleExplanation(role) {
  if (role === 'owner') {
    return 'Owner: Full trip control, member management, and trip metadata.';
  }
  if (role === 'member') {
    return 'Member: Can edit itinerary and expenses; cannot manage members or edit/delete trip metadata.';
  }
  return 'Viewer: Read-only access.';
}

export default function TripMembersPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [accessibleTrips, setAccessibleTrips] = useState([]);
  const [tripData, setTripData] = useState(null);
  const [ownerRecord, setOwnerRecord] = useState(null);
  const [activeMembers, setActiveMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [statusBanner, setStatusBanner] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Invitation creation form state (owner only)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [latestCreatedInvite, setLatestCreatedInvite] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Member role update / removal state
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Invitation revocation state
  const [busyInvitationId, setBusyInvitationId] = useState(null);

  const loadAbortRef = useRef(null);
  const loadRequestSeqRef = useRef(0);

  // Reset trip-scoped state immediately when switching `:tripId`
  useEffect(() => {
    if (loadAbortRef.current) {
      loadAbortRef.current.abort();
      loadAbortRef.current = null;
    }
    setTripData(null);
    setOwnerRecord(null);
    setActiveMembers([]);
    setInvitations([]);
    setLoadError(null);
    setStatusBanner(null);
    setActionError(null);
    setInviteEmail('');
    setInviteRole('member');
    setInviteError(null);
    setLatestCreatedInvite(null);
    setCopiedLink(false);
    setMemberPendingRemoval(null);
  }, [tripId]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      setAccessibleTrips([]);
      return;
    }
    let cancelled = false;
    fetchTrips(getAccessToken)
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setAccessibleTrips(list);
        }
      })
      .catch(() => {
        // Non-blocking trip switcher list
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, getAccessToken]);

  const loadCollaborationData = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAuthenticated || !tripId) {
        setIsLoading(false);
        return;
      }

      const requestedTripId = tripId;
      const requestId = ++loadRequestSeqRef.current;

      if (loadAbortRef.current) {
        loadAbortRef.current.abort();
      }
      const controller = new AbortController();
      loadAbortRef.current = controller;

      if (!silent) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const membersPayload = await fetchTripMembers(
          getAccessToken,
          requestedTripId,
          { signal: controller.signal }
        );

        if (
          loadRequestSeqRef.current !== requestId ||
          controller.signal.aborted
        ) {
          return;
        }

        const loadedTrip = membersPayload?.trip || null;
        setTripData(loadedTrip);
        setOwnerRecord(membersPayload?.owner || null);
        setActiveMembers(
          Array.isArray(membersPayload?.members) ? membersPayload.members : []
        );

        if (loadedTrip?.accessRole === 'owner') {
          const loadedInvitations = await fetchTripInvitations(
            getAccessToken,
            requestedTripId,
            { signal: controller.signal }
          );

          if (
            loadRequestSeqRef.current !== requestId ||
            controller.signal.aborted
          ) {
            return;
          }

          setInvitations(
            Array.isArray(loadedInvitations) ? loadedInvitations : []
          );
        } else {
          setInvitations([]);
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return;
        }
        if (loadRequestSeqRef.current !== requestId) {
          return;
        }
        setLoadError(err.message || 'Unable to load trip members.');
      } finally {
        if (loadRequestSeqRef.current === requestId && !silent) {
          setIsLoading(false);
        }
      }
    },
    [isAuthenticated, tripId, getAccessToken]
  );

  useEffect(() => {
    if (authReady && isAuthenticated) {
      loadCollaborationData();
    } else if (authReady && !isAuthenticated) {
      setIsLoading(false);
    }
    return () => {
      if (loadAbortRef.current) {
        loadAbortRef.current.abort();
      }
    };
  }, [authReady, isAuthenticated, loadCollaborationData]);

  const trip =
    tripData && tripData.id === tripId ? tripData : null;
  const accessRole = trip?.accessRole || 'viewer';
  const isOwner = accessRole === 'owner';

  const handleCreateInvitation = async (event) => {
    event.preventDefault();
    if (!trip || !isOwner || isCreatingInvite) return;

    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setInviteError('Please enter an email address to invite.');
      return;
    }

    setIsCreatingInvite(true);
    setInviteError(null);
    setActionError(null);
    setStatusBanner(null);
    setCopiedLink(false);

    try {
      const created = await createTripInvitationRequest(
        getAccessToken,
        trip.id,
        {
          email: trimmedEmail,
          role: inviteRole,
        }
      );

      const fullLink =
        typeof window !== 'undefined' && created?.invitationLink
          ? `${window.location.origin}${created.invitationLink}`
          : created?.invitationLink || '';

      setLatestCreatedInvite({
        invitation: created?.invitation || null,
        relativePath: created?.invitationLink || '',
        fullLink,
        deliveryNotice:
          created?.deliveryNotice ||
          'Invitation link created — share this link with the invited person.',
      });

      if (Array.isArray(created?.invitations)) {
        setInvitations(created.invitations);
      } else {
        await loadCollaborationData({ silent: true });
      }

      setInviteEmail('');
      setStatusBanner(
        created?.deliveryNotice ||
          'Invitation link created — share this link with the invited person.'
      );
    } catch (err) {
      setInviteError(err.message || 'Unable to create trip invitation.');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInvitationLink = async () => {
    if (!latestCreatedInvite?.fullLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(latestCreatedInvite.fullLink);
        setCopiedLink(true);
      }
    } catch (_err) {
      setCopiedLink(false);
    }
  };

  const handleChangeMemberRole = async (memberUserId, nextRole) => {
    if (!trip || !isOwner || busyMemberId) return;
    setBusyMemberId(memberUserId);
    setActionError(null);
    setStatusBanner(null);

    try {
      const updated = await updateTripMemberRoleRequest(
        getAccessToken,
        trip.id,
        memberUserId,
        nextRole
      );
      if (Array.isArray(updated?.members)) {
        setActiveMembers(updated.members);
      } else {
        await loadCollaborationData({ silent: true });
      }
      setStatusBanner(
        `Updated role for ${updated?.member?.fullName || 'member'} to "${nextRole}".`
      );
    } catch (err) {
      setActionError(err.message || 'Unable to update member role.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!trip || !isOwner || !memberPendingRemoval || isRemovingMember) return;
    setIsRemovingMember(true);
    setActionError(null);
    setStatusBanner(null);

    try {
      const result = await removeTripMemberRequest(
        getAccessToken,
        trip.id,
        memberPendingRemoval.userId
      );
      if (Array.isArray(result?.members)) {
        setActiveMembers(result.members);
      } else {
        await loadCollaborationData({ silent: true });
      }
      setStatusBanner(
        `Removed ${memberPendingRemoval.fullName} from active trip access. Historical itinerary and expense records remain intact.`
      );
      setMemberPendingRemoval(null);
    } catch (err) {
      setActionError(err.message || 'Unable to remove trip member.');
      setMemberPendingRemoval(null);
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleRevokeInvitation = async (invitation) => {
    if (!trip || !isOwner || !invitation || busyInvitationId) return;
    setBusyInvitationId(invitation.id);
    setActionError(null);
    setStatusBanner(null);

    try {
      const result = await revokeTripInvitationRequest(
        getAccessToken,
        trip.id,
        invitation.id
      );
      if (Array.isArray(result?.invitations)) {
        setInvitations(result.invitations);
      } else {
        await loadCollaborationData({ silent: true });
      }
      if (
        latestCreatedInvite?.invitation?.id &&
        latestCreatedInvite.invitation.id === invitation.id
      ) {
        setLatestCreatedInvite(null);
      }
      setStatusBanner(
        `Revoked pending invitation for ${invitation.invitedEmail}.`
      );
    } catch (err) {
      setActionError(err.message || 'Unable to revoke invitation.');
    } finally {
      setBusyInvitationId(null);
    }
  };

  if (!authReady) {
    return <LoadingState message="Checking authentication status..." />;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader
          title="Trip Members & Collaboration"
          subtitle="Protected collaboration workspace"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <EmptyState
          title="Sign-In Required to View Trip Members"
          message={`You are currently using demo preview persona "${currentUser.fullName}". Sign in with your Google account to view trip members or manage invitations.`}
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={signInWithGoogle}
            >
              Sign in with Google
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading trip members from PostgreSQL..." />;
  }

  if (loadError || !trip) {
    return (
      <div>
        <PageHeader
          title="Trip Members & Collaboration"
          subtitle="Unable to load trip members"
          actions={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
        <ErrorState
          title="Trip Members Unavailable"
          message={
            loadError || 'Trip not found or you do not have active access to it.'
          }
          onRetry={() => loadCollaborationData()}
        />
      </div>
    );
  }

  return (
    <div data-testid="trip-members-page">
      <PageHeader
        title={`${trip.title} — Trip Members`}
        subtitle={`${trip.destinationName} · ${trip.startDate} to ${trip.endDate}`}
        actions={
          <>
            {accessibleTrips.length > 1 && (
              <div className="itinerary-trip-switcher">
                <label
                  htmlFor="members-trip-switcher-select"
                  className="sr-only"
                >
                  Switch Trip
                </label>
                <select
                  id="members-trip-switcher-select"
                  data-testid="members-trip-switcher"
                  className="form-input form-input-sm"
                  value={trip.id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    if (nextId && nextId !== trip.id) {
                      navigate(`/trips/${nextId}/members`);
                    }
                  }}
                >
                  {accessibleTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.destinationName})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Link
              to={`/trips/${trip.id}`}
              className="btn btn-secondary"
              data-testid="back-to-trip-details-btn"
            >
              Back to Trip Details
            </Link>
            <Link
              to={`/trips/${trip.id}/itinerary`}
              className="btn btn-secondary"
            >
              Trip Itinerary
            </Link>
            <Link
              to={`/trips/${trip.id}/expenses`}
              className="btn btn-secondary"
            >
              Budget &amp; Expenses
            </Link>
          </>
        }
      />

      <ConfirmDialog
        isOpen={Boolean(memberPendingRemoval)}
        title="Remove Trip Member?"
        message={
          memberPendingRemoval
            ? `Remove "${memberPendingRemoval.fullName}" (${memberPendingRemoval.email}) from "${trip.title}"? Their membership status will be set to inactive and their trip access will be revoked immediately, while preserving all historical itinerary items, expenses, splits, and settlement records.`
            : ''
        }
        confirmLabel={isRemovingMember ? 'Removing...' : 'Remove Member'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => {
          if (!isRemovingMember) {
            setMemberPendingRemoval(null);
          }
        }}
      />

      {statusBanner && (
        <div
          className="form-alert form-alert-success"
          role="status"
          data-testid="members-status-banner"
        >
          {statusBanner}
        </div>
      )}

      {actionError && (
        <div
          className="form-alert form-alert-error"
          role="alert"
          data-testid="members-error-banner"
        >
          {actionError}
        </div>
      )}

      <section
        className="card members-role-summary-card"
        aria-label="Your trip access level"
      >
        <div className="members-role-summary-row">
          <div>
            <span className={`role-badge role-badge-${accessRole}`}>
              {accessRole === 'owner'
                ? 'Owner'
                : accessRole === 'member'
                  ? 'Member'
                  : 'Viewer'}
            </span>
            <p className="members-role-explanation" data-testid="current-role-explanation">
              {getRoleExplanation(accessRole)}
            </p>
          </div>
          <div className="members-count-summary tabular-nums">
            <span>
              <strong>{1 + activeMembers.length}</strong> Active Participant
              {activeMembers.length === 0 ? '' : 's'}
            </span>
          </div>
        </div>
      </section>

      <div className="members-workspace-grid">
        <section
          className="card members-panel"
          aria-label="Trip Owner and Active Members"
        >
          <h2 className="section-heading">Trip Owner &amp; Active Members</h2>

          {ownerRecord && (
            <div
              className="member-row-card member-row-owner"
              data-testid="trip-owner-card"
            >
              <div className="member-row-info">
                <div className="member-row-name">
                  <strong>{ownerRecord.fullName}</strong>
                  {currentUser?.email &&
                  ownerRecord.email &&
                  currentUser.email.toLowerCase() ===
                    ownerRecord.email.toLowerCase()
                    ? ' (You)'
                    : ''}
                </div>
                <div className="member-row-meta">
                  <span>{ownerRecord.email}</span>
                  <span aria-hidden="true">·</span>
                  <span>Status: Active</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Since {formatDateTimeShort(ownerRecord.joinedAt)}
                  </span>
                </div>
                <div className="member-row-role-note">
                  Full trip control, member management, and trip metadata.
                </div>
              </div>
              <div className="member-row-actions">
                <span className="role-badge role-badge-owner">Owner</span>
              </div>
            </div>
          )}

          <div
            className="members-list-container"
            data-testid="active-members-list"
          >
            <h3 className="detail-subheading" style={{ marginTop: '1.25rem' }}>
              Active Shared Members ({activeMembers.length})
            </h3>

            {activeMembers.length === 0 ? (
              <p className="empty-inline-note" data-testid="no-active-members-note">
                No additional active members have joined this trip yet.
                {isOwner
                  ? ' Use the Invite Collaborator panel to create and share an invitation link.'
                  : ''}
              </p>
            ) : (
              activeMembers.map((member) => {
                const isSelf =
                  currentUser?.email &&
                  member.email &&
                  currentUser.email.toLowerCase() ===
                    member.email.toLowerCase();
                const isBusy = busyMemberId === member.userId;

                return (
                  <div
                    key={member.userId}
                    className="member-row-card"
                    data-testid={`member-card-${member.userId}`}
                  >
                    <div className="member-row-info">
                      <div className="member-row-name">
                        <strong>{member.fullName}</strong>
                        {isSelf ? ' (You)' : ''}
                      </div>
                      <div className="member-row-meta">
                        <span>{member.email}</span>
                        <span aria-hidden="true">·</span>
                        <span>Status: Active</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          Joined {formatDateTimeShort(member.joinedAt)}
                        </span>
                      </div>
                      <div className="member-row-role-note">
                        {member.role === 'member'
                          ? 'Can edit itinerary and expenses; cannot manage members or edit/delete trip metadata.'
                          : 'Read-only access to trip details, itinerary, expenses, and member list.'}
                      </div>
                    </div>

                    <div className="member-row-actions">
                      <span
                        className={`role-badge role-badge-${member.role}`}
                        data-testid={`member-role-badge-${member.userId}`}
                      >
                        {member.role === 'member' ? 'Member' : 'Viewer'}
                      </span>

                      {isOwner && (
                        <div className="member-owner-controls">
                          <label
                            htmlFor={`role-select-${member.userId}`}
                            className="sr-only"
                          >
                            Change role for {member.fullName}
                          </label>
                          <select
                            id={`role-select-${member.userId}`}
                            data-testid={`member-role-select-${member.userId}`}
                            className="form-input form-input-sm"
                            value={member.role}
                            disabled={isBusy}
                            onChange={(e) =>
                              handleChangeMemberRole(
                                member.userId,
                                e.target.value
                              )
                            }
                          >
                            <option value="member">Member (Can Edit)</option>
                            <option value="viewer">Viewer (Read-Only)</option>
                          </select>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            data-testid={`remove-member-btn-${member.userId}`}
                            disabled={isBusy}
                            onClick={() => setMemberPendingRemoval(member)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {isOwner && (
          <div className="members-side-column">
            <section
              className="card members-panel"
              aria-label="Invite Collaborator"
            >
              <h2 className="section-heading">Invite Collaborator by Email</h2>
              <p className="form-helper-text" style={{ marginBottom: '1rem' }}>
                Generate a secure 7-day shareable invitation link for a specific
                Google account email address. Only the invited email can accept
                the link.
              </p>

              <form
                onSubmit={handleCreateInvitation}
                data-testid="invite-member-form"
                noValidate
              >
                {inviteError && (
                  <div
                    className="form-alert form-alert-error"
                    role="alert"
                    data-testid="invite-form-error"
                  >
                    {inviteError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="invite-email-input" className="form-label">
                    Invitee Email Address *
                  </label>
                  <input
                    id="invite-email-input"
                    data-testid="invite-email-input"
                    type="email"
                    className="form-input"
                    placeholder="traveller@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isCreatingInvite}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="invite-role-select" className="form-label">
                    Access Role *
                  </label>
                  <select
                    id="invite-role-select"
                    data-testid="invite-role-select"
                    className="form-input"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    disabled={isCreatingInvite}
                  >
                    <option value="member">
                      Member — Can edit itinerary &amp; expenses
                    </option>
                    <option value="viewer">
                      Viewer — Read-only access
                    </option>
                  </select>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    data-testid="create-invitation-btn"
                    disabled={isCreatingInvite}
                  >
                    {isCreatingInvite
                      ? 'Generating Link...'
                      : 'Create Invitation Link'}
                  </button>
                </div>
              </form>

              {latestCreatedInvite && (
                <div
                  className="created-invitation-box"
                  data-testid="created-invitation-link-box"
                >
                  <div className="created-invitation-title">
                    {latestCreatedInvite.deliveryNotice}
                  </div>
                  <p className="created-invitation-subtext">
                    Invited: <strong>{latestCreatedInvite.invitation?.invitedEmail}</strong>{' '}
                    ({latestCreatedInvite.invitation?.role}) · Expires{' '}
                    <span className="tabular-nums">
                      {formatDateTimeShort(
                        latestCreatedInvite.invitation?.expiresAt
                      )}
                    </span>
                  </p>
                  <div className="created-invitation-link-row">
                    <input
                      type="text"
                      readOnly
                      className="form-input form-input-sm"
                      data-testid="generated-invitation-link-input"
                      value={latestCreatedInvite.fullLink}
                      aria-label="Generated shareable invitation link"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      data-testid="copy-invitation-link-btn"
                      onClick={handleCopyInvitationLink}
                    >
                      {copiedLink ? 'Copied!' : 'Copy Invitation Link'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section
              className="card members-panel"
              aria-label="Trip Invitations"
              style={{ marginTop: '1.25rem' }}
            >
              <h2 className="section-heading">
                Invitations ({invitations.length})
              </h2>

              {invitations.length === 0 ? (
                <p
                  className="empty-inline-note"
                  data-testid="no-invitations-note"
                >
                  No invitations have been created for this trip yet.
                </p>
              ) : (
                <div
                  className="invitations-list"
                  data-testid="invitations-list"
                >
                  {invitations.map((inv) => {
                    const isPending = inv.status === 'pending';
                    const isRevoking = busyInvitationId === inv.id;

                    return (
                      <div
                        key={inv.id}
                        className="invitation-row-card"
                        data-testid={`invitation-card-${inv.id}`}
                      >
                        <div className="invitation-row-main">
                          <div className="invitation-row-email">
                            <strong>{inv.invitedEmail}</strong>
                          </div>
                          <div className="invitation-row-meta tabular-nums">
                            <span>
                              Role:{' '}
                              <strong>
                                {inv.role === 'member' ? 'Member' : 'Viewer'}
                              </strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Status:{' '}
                              <strong
                                data-testid={`invitation-status-${inv.id}`}
                              >
                                {inv.status.toUpperCase()}
                              </strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Created {formatDateTimeShort(inv.createdAt)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Expires {formatDateTimeShort(inv.expiresAt)}
                            </span>
                          </div>
                        </div>

                        {isPending && (
                          <div className="invitation-row-actions">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              data-testid={`revoke-invitation-btn-${inv.id}`}
                              disabled={isRevoking}
                              onClick={() => handleRevokeInvitation(inv)}
                            >
                              {isRevoking ? 'Revoking...' : 'Revoke'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
