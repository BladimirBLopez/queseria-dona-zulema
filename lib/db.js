import { neon } from '@neondatabase/serverless';

let client;
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL faltante');
  if (!client) client = neon(process.env.DATABASE_URL);
  return client;
}
