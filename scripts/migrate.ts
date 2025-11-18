import { getDbPool, closeDbPool, testConnection } from '../src/db/client';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  console.log('✓ Database connection established');

  const pool = getDbPool();
  const schemaPath = path.join(__dirname, '../src/db/schema.sql');

  try {
    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);

    console.log('✓ Schema applied successfully');
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDbPool();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runMigrations };
