import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import invitationResponseRoutes from './routes/invitationRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

// Public REST API health check
app.use('/api/health', healthRoutes);

// Protected account verification endpoint (requires verified Firebase Bearer token)
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: req.dbUser,
  });
});

// Protected Trip CRUD & collaboration endpoints
app.use('/api/trips', tripRoutes);

// Protected Trip Invitation response endpoints (/api/trip-invitations/accept, /decline)
app.use('/api/trip-invitations', invitationResponseRoutes);

// Protected Open-Meteo Geocoding & Weather adapter endpoints
app.use('/api/locations', locationRoutes);
app.use('/api/weather', weatherRoutes);

// 404 handler for unknown /api/* endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized API error handler (never leaks raw SQL, hostnames, credentials, or stack traces)
app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err.message || err);
  const statusCode =
    err.statusCode && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;
  const safeMessage =
    statusCode === 500
      ? 'Internal server error. Please try again later.'
      : err.message || 'Request could not be completed.';
  res.status(statusCode).json({
    error: safeMessage,
  });
});

export default app;
