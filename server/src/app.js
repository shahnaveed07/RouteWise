import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

// Public REST API health check
app.use('/api/health', healthRoutes);

// Protected account verification endpoint (requires verified Firebase Bearer token)
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: req.dbUser || {
      uid: req.user.uid,
      email: req.user.email || null,
      fullName: req.user.name || null,
    },
  });
});

// 404 handler for unknown /api/* endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized API error handler (never leaks raw SQL or stack traces)
app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err);
  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error. Please try again later.' : err.message,
  });
});

export default app;
