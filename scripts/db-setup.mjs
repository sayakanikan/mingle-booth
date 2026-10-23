import pg from 'pg';
import crypto from 'node:crypto';

const { Client } = pg;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  process.loadEnvFile?.();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set in .env');
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Supabase Postgres.');

  // 1. Add admin_password_hash column if not present
  console.log('Ensuring admin_password_hash column exists...');
  await client.query(`
    ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS admin_password_hash text;
  `);

  // 2. Hash existing plaintext password if not yet hashed
  const evRes = await client.query(`SELECT id, admin_password, admin_password_hash FROM public.events WHERE id = 'default'`);
  const ev = evRes.rows[0];

  if (ev) {
    if (!ev.admin_password_hash && ev.admin_password) {
      console.log(`Hashing existing plaintext password "${ev.admin_password}"...`);
      const hash = await hashPassword(ev.admin_password);
      await client.query(`UPDATE public.events SET admin_password_hash = $1 WHERE id = 'default'`, [hash]);
      console.log('Admin password hashed successfully.');
    } else {
      console.log('admin_password_hash is already populated.');
    }
  }

  // 3. Drop open RLS policies so anon key has no access
  console.log('Securing RLS policies (dropping public_all)...');
  const tables = ['events', 'frames', 'photo_sessions', 'session_photos'];
  for (const t of tables) {
    try {
      await client.query(`DROP POLICY IF EXISTS "public_all" ON public.${t}`);
      console.log(`✓ Dropped public_all on ${t}`);
    } catch (e) {
      console.warn(`Policy drop notice on ${t}:`, e.message);
    }
  }

  console.log('Database security upgrade complete.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
