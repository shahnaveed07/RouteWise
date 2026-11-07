import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { currentUser, isAuthenticated } = useAuth();

  const authSubtitle = isAuthenticated
    ? `Authenticated via Firebase as ${currentUser.fullName} (${currentUser.email})`
    : `UI Preview Mode (Unauthenticated Demo Persona): ${currentUser.fullName} (${currentUser.email})`;

  return (
    <div>
      <PageHeader
        title="Trips Dashboard"
        subtitle={authSubtitle}
        actions={
          <Link to="/trips/new" className="btn btn-primary">
            + Create New Trip
          </Link>
        }
      />

      <div className="summary-strip" aria-label="Workspace baseline summary">
        <div className="metric-card">
          <div className="metric-label">Frontend Stack</div>
          <div className="metric-value">React .jsx + .css</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Backend Stack</div>
          <div className="metric-value">Node + Express .js</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Database</div>
          <div className="metric-value">PostgreSQL (SQL)</div>
        </div>
      </div>

      <EmptyState
        title="Ready for Phase 1 / Phase 2 Trip Modules"
        message="The technology stack migration to React .jsx, standard CSS, Node.js/Express .js ES Modules, and PostgreSQL with Prisma schema is complete."
        action={
          <Link to="/trips/new" className="btn btn-primary">
            Plan Your First Trip
          </Link>
        }
      />
    </div>
  );
}
