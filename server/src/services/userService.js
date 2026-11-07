import { query } from '../config/db.js';

/**
 * Synchronizes an authenticated user into the PostgreSQL users table using
 * an idempotent ON CONFLICT (uid) DO UPDATE query.
 */
export async function getOrCreateUser(uid, email, fullName, queryFn = query) {
  const normalizedUid = String(uid || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedUid || !normalizedEmail) {
    const validationErr = new Error('Authenticated token is missing required uid or email claims.');
    validationErr.statusCode = 401;
    throw validationErr;
  }

  const resolvedName =
    fullName && String(fullName).trim().length > 0
      ? String(fullName).trim().slice(0, 100)
      : (normalizedEmail.split('@')[0] || 'RouteWise Traveller').slice(0, 100);

  const sql = `
    INSERT INTO users (uid, email, full_name, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (uid)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), users.full_name),
      updated_at = NOW()
    RETURNING id, uid, full_name AS "fullName", email, created_at AS "createdAt", updated_at AS "updatedAt";
  `;

  try {
    const result = await queryFn(sql, [normalizedUid, normalizedEmail, resolvedName]);
    return result.rows[0];
  } catch (error) {
    console.error('Database user synchronization failed:', error.message);
    const dbError = new Error(
      'Service temporarily unavailable: Unable to synchronize user account in database.',
      { cause: error }
    );
    dbError.statusCode = 503;
    dbError.code = 'DB_USER_SYNC_FAILED';
    throw dbError;
  }
}
