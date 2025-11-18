import { Pool } from 'pg';
import { config } from '../config/env';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: config.pgvector.host,
      port: config.pgvector.port,
      database: config.pgvector.database,
      user: config.pgvector.user,
      password: config.pgvector.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await getDbPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
