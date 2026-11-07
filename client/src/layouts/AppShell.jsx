import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AppShell() {
  const { currentUser, demoTravellers, selectDemoTraveller } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/dashboard" className="brand-link">
            <span className="brand-mark" aria-hidden="true">
              RW
            </span>
            <span>
              <span className="brand-title">RouteWise</span>
              <span className="brand-tagline">Smart Travel Planning • PERN Stack</span>
            </span>
          </NavLink>

          <nav className="app-nav" aria-label="Main navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/trips/new"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Create Trip
            </NavLink>
          </nav>

          <div className="user-switcher">
            <label htmlFor="traveller-switcher">Active Traveller:</label>
            <select
              id="traveller-switcher"
              className="user-select"
              value={currentUser.id}
              onChange={(e) => selectDemoTraveller(e.target.value)}
            >
              {demoTravellers.map((traveller) => (
                <option key={traveller.id} value={traveller.id}>
                  {traveller.fullName} ({traveller.roleLabel})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        RouteWise — Smart Travel Planning • PostgreSQL + Express.js + React.js (.jsx) + Node.js (.js)
      </footer>
    </div>
  );
}
