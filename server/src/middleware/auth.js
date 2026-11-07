import { adminAuth } from '../config/firebase-admin.js';
import { getOrCreateUser } from '../services/userService.js';

/**
 * Verifies a real Firebase ID token from the Authorization Bearer header
 * and synchronizes the authenticated user record in PostgreSQL.
 * Explicitly rejects missing tokens, malformed headers, or unauthenticated demo persona IDs.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token.startsWith('demo-')) {
    return res.status(401).json({
      error: 'Unauthorized: Demo preview personas are not authenticated tokens',
    });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    if (decodedToken.uid && decodedToken.email) {
      req.dbUser = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email,
        decodedToken.name || ''
      );
    }

    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};
