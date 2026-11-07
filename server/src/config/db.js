import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export const createPool = () => {
  if (!globalThis._postgresPool) {
    globalThis._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    globalThis._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return globalThis._postgresPool;
};

export const pool = createPool();

/**
 * Executes a parameterized PostgreSQL query with two-layer error sanitization.
 */
export async function query(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database operation failed. Please try again later.', {
      cause: error,
    });
  }
}

/**
 * Runs a callback inside an ACID PostgreSQL transaction (BEGIN / COMMIT / ROLLBACK).
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}
