import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  acceptTripInvitationRequest,
  declineTripInvitationRequest,
} from '../services/memberService.jsx';

/**
 * Extracts `token` from a URL fragment such as `#token=...`.
 * Never persists the raw token in localStorage or sessionStorage.
 */
function extractTokenFromHash(hashString = '') {
  if (!hashString || typeof hashString !== 'string') {
    return '';
  }
  const trimmed = hashString.startsWith('#')
    ? hashString.slice(1)
    : hashString;
  const params = new URLSearchParams(trimmed);
  const token = params.get('token');
  return token ? token.trim() : '';
}

function clearUrlFragmentSafely() {
  if (typeof window === 'undefined' || !window.history?.replaceState) {
    return;
  }
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', cleanUrl);
}

export default function TripInvitationPage() {
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [invitationToken, setInvitationToken] = useState(() =>
    typeof window !== 'undefined'
      ? extractTokenFromHash(window.location.hash)
      : ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseAction, setResponseAction] = useState(null); // 'accept' | 'decline'
  const [acceptedData, setAcceptedData] = useState(null);
  const [declinedData, setDeclinedData] = useState(null);
  const [responseError, setResponseError] = useState(null);

  useEffect(() => {
    const onHashChange = () => {
      const nextToken = extractTokenFromHash(window.location.hash);
      if (nextToken) {
        setInvitationToken(nextToken);
        setAcceptedData(null);
        setDeclinedData(null);
        setResponseError(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleRespondToInvitation = useCallback(
    async (action) => {
      if (!isAuthenticated || !invitationToken || isSubmitting) return;

      setIsSubmitting(true);
      setResponseAction(action);
      setResponseError(null);

      try {
        if (action === 'accept') {
          const result = await acceptTripInvitationRequest(
            getAccessToken,
            invitationToken
          );
          clearUrlFragmentSafely();
          setInvitationToken('');
          setAcceptedData(result);
        } else {
          const result = await declineTripInvitationRequest(
            getAccessToken,
            invitationToken
          );
          clearUrlFragmentSafely();
          setInvitationToken('');
          setDeclinedData(result);
        }
      } catch (err) {
        setResponseError({
          message:
            err.message || 'Unable to process this trip invitation request.',
          code: err.code || null,
          statusCode: err.statusCode || null,
        });
        // If invitation is permanently terminal (expired, revoked, already accepted/declined), clear fragment
        if (
          err.statusCode === 410 ||
          err.statusCode === 409 ||
          err.statusCode === 404
        ) {
          clearUrlFragmentSafely();
        }
      } finally {
        setIsSubmitting(false);
        setResponseAction(null);
      }
    },
    [isAuthenticated, invitationToken, isSubmitting, getAccessToken]
  );

  if (!authReady) {
    return <LoadingState message="Checking authentication status..." />;
  }

  return (
    <div data-testid="trip-invitation-page">
      <PageHeader
        title="Trip Collaboration Invitation"
        subtitle="Respond to a shared RouteWise trip invitation"
        actions={
          <Link to="/dashboard" className="btn btn-secondary">
            Go to Dashboard
          </Link>
        }
      />

      {acceptedData ? (
        <section
          className="card invitation-response-card"
          data-testid="invitation-accepted-panel"
        >
          <h2 className="section-heading">Invitation Accepted</h2>
          <p className="detail-description-text">
            You now have active{' '}
            <strong>
              {acceptedData.trip?.accessRole === 'member'
                ? 'Member (Can Edit Itinerary & Expenses)'
                : 'Viewer (Read-Only)'}
            </strong>{' '}
            access to{' '}
            <strong>{acceptedData.trip?.title || 'the shared trip'}</strong>
            {acceptedData.trip?.destinationName
              ? ` (${acceptedData.trip.destinationName})`
              : ''}
            .
          </p>
          <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '1.25rem' }}>
            {acceptedData.trip?.id && (
              <Link
                to={`/trips/${acceptedData.trip.id}`}
                className="btn btn-primary"
                data-testid="open-accepted-trip-btn"
              >
                Open Shared Trip
              </Link>
            )}
            <Link
              to="/dashboard"
              className="btn btn-secondary"
              data-testid="accepted-go-dashboard-btn"
            >
              View Trips Dashboard
            </Link>
          </div>
        </section>
      ) : declinedData ? (
        <section
          className="card invitation-response-card"
          data-testid="invitation-declined-panel"
        >
          <h2 className="section-heading">Invitation Declined</h2>
          <p className="detail-description-text">
            You have declined this trip invitation. No trip membership was
            created.
          </p>
          <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '1.25rem' }}>
            <Link to="/dashboard" className="btn btn-secondary">
              Return to Trips Dashboard
            </Link>
          </div>
        </section>
      ) : !invitationToken && !responseError ? (
        <EmptyState
          title="Invitation Token Missing"
          message="This page requires a valid invitation token in the URL fragment (for example, /invitations/accept#token=...). Please open the full link shared by the trip owner."
          action={
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          }
        />
      ) : !isAuthenticated ? (
        <div data-testid="invitation-auth-required">
          <EmptyState
            title="Sign-In Required to Respond to This Invitation"
            message="Please sign in with the Google account that matches the invited email address. RouteWise verifies your authenticated email before granting access to any shared trip."
            action={
              <button
                type="button"
                className="btn btn-primary"
                data-testid="invitation-signin-btn"
                onClick={signInWithGoogle}
              >
                Sign in with Google
              </button>
            }
          />
        </div>
      ) : (
        <section
          className="card invitation-response-card"
          data-testid="invitation-action-panel"
        >
          <h2 className="section-heading">Review &amp; Respond to Invitation</h2>
          <p className="detail-description-text">
            Signed in as <strong>{currentUser.fullName}</strong> (
            <strong>{currentUser.email}</strong>). Click{' '}
            <strong>Accept Invitation</strong> to verify your invitation token
            and join the trip, or <strong>Decline Invitation</strong> if you do
            not wish to join.
          </p>

          {responseError && (
            <div
              className="form-alert form-alert-error"
              role="alert"
              data-testid="invitation-error-panel"
              style={{ marginTop: '1rem' }}
            >
              {responseError.message}
            </div>
          )}

          {invitationToken && (
            <div
              className="form-actions"
              style={{ justifyContent: 'flex-start', marginTop: '1.25rem' }}
            >
              <button
                type="button"
                className="btn btn-primary"
                data-testid="accept-invitation-btn"
                disabled={isSubmitting}
                onClick={() => handleRespondToInvitation('accept')}
              >
                {isSubmitting && responseAction === 'accept'
                  ? 'Accepting...'
                  : 'Accept Invitation'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                data-testid="decline-invitation-btn"
                disabled={isSubmitting}
                onClick={() => handleRespondToInvitation('decline')}
              >
                {isSubmitting && responseAction === 'decline'
                  ? 'Declining...'
                  : 'Decline Invitation'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
