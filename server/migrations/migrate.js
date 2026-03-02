/**
 * Programmatic migration runner
 * Executes SQL migration files in order against PostgreSQL
 *
 * Usage:
 *   node migrations/migrate.js          # Run all pending migrations
 *   node migrations/migrate.js --reset  # Drop all tables and re-run
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'saas_dev',
  password: process.env.DB_PASSWORD || 'saas_dev_password',
  database: process.env.DB_NAME || 'saas_crm',
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getExecutedMigrations(client) {
  const { rows } = await client.query(
    'SELECT filename FROM _migrations ORDER BY filename'
  );
  return new Set(rows.map((r) => r.filename));
}

async function getMigrationFiles() {
  const files = await readdir(__dirname);
  return files
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();
}

async function resetDatabase(client) {
  console.log('⚠  Resetting database...');
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.query('GRANT ALL ON SCHEMA public TO PUBLIC;');
  console.log('   Schema reset complete.');
}

async function runMigrations() {
  const isReset = process.argv.includes('--reset');
  const client = await pool.connect();

  try {
    if (isReset) {
      await resetDatabase(client);
    }

    await ensureMigrationsTable(client);
    const executed = await getExecutedMigrations(client);
    const files = await getMigrationFiles();

    const pending = files.filter((f) => !executed.has(f));

    if (pending.length === 0) {
      console.log('All migrations already applied.');
      return;
    }

    console.log(`Running ${pending.length} migration(s)...\n`);

    for (const file of pending) {
      const sql = await readFile(join(__dirname, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${file}: ${err.message}`);
        throw err;
      }
    }

    console.log(`\nDone. ${pending.length} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
