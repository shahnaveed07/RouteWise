import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TripForm from '../components/TripForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createTripRequest } from '../services/apiClient.jsx';

export default function NewTripPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    authReady,
    isAuthenticated,
    getAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleCreateTrip = async (tripInput) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const createdTrip = await createTripRequest(getAccessToken, tripInput);
      navigate(`/trips/${createdTrip.id}`, {
        state: {
          flashMessage: `Trip "${createdTrip.title}" was saved to PostgreSQL.`,
        },
      });
    } catch (error) {
      setServerError(error.message || 'Unable to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create a New Trip"
        subtitle="Set destination, travel dates, currency, and planned budget."
        actions={
          <Link to="/dashboard" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        }
      />

      {!authReady ? (
        <LoadingState message="Checking authentication status..." />
      ) : !isAuthenticated ? (
        <EmptyState
          title="Sign-In Required to Create a Trip"
          message={`You are viewing RouteWise as unauthenticated demo persona "${currentUser.fullName}". Protected mutations require a verified Firebase Google Sign-In session so the backend can assign ownership to your PostgreSQL user record.`}
          action={
            <div className="page-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={signInWithGoogle}>
                Sign in with Google
              </button>
              <Link to="/dashboard" className="btn btn-secondary">
                Return to Dashboard
              </Link>
            </div>
          }
        />
      ) : (
        <TripForm
          submitLabel="Create Trip"
          onSubmit={handleCreateTrip}
          onCancel={() => navigate('/dashboard')}
          isSubmitting={isSubmitting}
          serverError={serverError}
        />
      )}
    </div>
  );
}
