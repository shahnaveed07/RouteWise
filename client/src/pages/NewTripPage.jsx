import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

export default function NewTripPage() {
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
      <div className="card">
        <p style={{ margin: 0 }}>
          Trip creation form (`TripForm.jsx`) and PostgreSQL trip CRUD routes (`/api/trips`) will be enabled in the next approved phase.
        </p>
      </div>
    </div>
  );
}
