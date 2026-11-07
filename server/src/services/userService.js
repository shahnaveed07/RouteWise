import { query } from '../config/db.js';

/**
 * Synchronizes an authenticated user into the PostgreSQL users table using
 * an idempotent ON CONFLICT (uid) DO UPDATE query.
 */
export async function getOrCreateUser(uid, email, fullName) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const resolvedName =
    fullName && String(fullName).trim().length > 0
      ? String(fullName).trim()
      : normalizedEmail.split('@')[0] || 'RouteWise Traveller';

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
    const result = await query(sql, [uid, normalizedEmail, resolvedName]);
    return result.rows[0];
  } catch (error) {
    console.error('Database user synchronization failed:', error);
    throw new Error('Unable to synchronize user account. Please try again later.', {
      cause: error,
    });
  }
}
