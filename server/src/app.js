import express from 'express';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

// REST API routes
app.use('/api/health', healthRoutes);

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
