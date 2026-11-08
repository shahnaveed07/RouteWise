import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppShell from './layouts/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import ItineraryPage from './pages/ItineraryPage.jsx';
import NewTripPage from './pages/NewTripPage.jsx';
import TripDetailsPage from './pages/TripDetailsPage.jsx';
import TripInvitationPage from './pages/TripInvitationPage.jsx';
import TripMembersPage from './pages/TripMembersPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trips/new" element={<NewTripPage />} />
            <Route path="/invitations/accept" element={<TripInvitationPage />} />
            <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
            <Route path="/trips/:tripId/expenses" element={<ExpensesPage />} />
            <Route path="/trips/:tripId/members" element={<TripMembersPage />} />
            <Route path="/trips/:tripId" element={<TripDetailsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
