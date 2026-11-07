import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AppShell() {
  const {
    currentUser,
    isAuthenticated,
    isDemo,
    demoTravellers,
    selectDemoTraveller,
    signInWithGoogle,
    logout,
    authError,
  } = useAuth();

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
              <span className="brand-tagline">Smart Travel Planning </span>
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
            <span
              className={
                isAuthenticated ? 'auth-badge auth-badge-verified' : 'auth-badge auth-badge-demo'
              }
            >
              {isAuthenticated
                ? 'AUTHENTICATED (FIREBASE)'
                : 'DEMO PREVIEW — NOT AUTHENTICATED'}
            </span>

            {isDemo && (
              <>
                <label htmlFor="traveller-switcher">UI Preview Persona:</label>
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
              </>
            )}

            {isAuthenticated ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
                Sign Out ({currentUser.fullName})
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={signInWithGoogle}>
                Sign in with Google
              </button>
            )}
          </div>
        </div>
        {authError && (
          <div className="auth-error-banner" role="alert">
            Authentication Notice: {authError}
          </div>
        )}
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
