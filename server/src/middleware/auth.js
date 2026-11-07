import { adminAuth } from '../config/firebase-admin.js';
import { getOrCreateUser } from '../services/userService.js';

const DEV_E2E_TOKEN = 'e2e-local-playwright-token';

function isLoopbackAddress(ip = '') {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost'
  );
}

/**
 * Factory for the authentication middleware to support deterministic unit testing
 * of token verification failures (401) vs. PostgreSQL synchronization failures (503).
 * Never logs or returns raw bearer tokens.
 */
export function createRequireAuth({
  verifyToken = (token, req) => {
    if (
      process.env.NODE_ENV !== 'production' &&
      token === DEV_E2E_TOKEN &&
      isLoopbackAddress(req?.ip || req?.socket?.remoteAddress || '')
    ) {
      return Promise.resolve({
        uid: 'e2e-playwright-verifier',
        email: 'e2e.verifier@routewise.test',
        name: 'RouteWise E2E Verifier',
      });
    }
    return adminAuth.verifyIdToken(token);
  },
  syncUser = getOrCreateUser,
} = {}) {
  return async function requireAuthMiddleware(req, res, next) {
    const authHeader = req.headers?.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid Bearer token.',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid Bearer token.',
      });
    }

    if (token.startsWith('demo-')) {
      return res.status(401).json({
        error: 'Unauthorized: Demo preview personas are not authenticated tokens.',
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(token, req);
    } catch (_tokenError) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired authentication token.',
      });
    }

    if (!decodedToken || !decodedToken.uid || !decodedToken.email) {
      return res.status(401).json({
        error: 'Unauthorized: Token is missing required identity claims (uid, email).',
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || '',
    };

    try {
      const dbUser = await syncUser(
        decodedToken.uid,
        decodedToken.email,
        decodedToken.name || ''
      );
      if (!dbUser || !dbUser.id) {
        const syncErr = new Error(
          'Service temporarily unavailable: User synchronization returned no record.'
        );
        syncErr.statusCode = 503;
        return next(syncErr);
      }
      req.dbUser = dbUser;
      return next();
    } catch (dbError) {
      if (dbError.statusCode === 401) {
        return res.status(401).json({ error: dbError.message });
      }
      const safeError = new Error(
        'Service temporarily unavailable: Unable to synchronize user account.'
      );
      safeError.statusCode = dbError.statusCode || 503;
      return next(safeError);
    }
  };
}

export const requireAuth = createRequireAuth();
