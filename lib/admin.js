import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { sql } from '@/lib/db';
import { obtenerUsuarioSesion } from '@/lib/usuarios';

export const COOKIE = 'dz_admin';
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

const scrypt = promisify(crypto.scrypt);
const KEY = 'admin_password_hash';

function safeEq(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function readCookie(req, name) {
  const h = req.headers.get('cookie') || '';
  for (const part of h.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

async function storedHash() {
  const rows = await sql()`SELECT value FROM app_settings WHERE key = ${KEY}`;
  return rows[0]?.value || null;
}

async function verify(pw, hash) {
  if (typeof pw !== 'string') return false;
  if (!hash) return Boolean(process.env.ADMIN_PASSWORD) &&
    safeEq(pw, process.env.ADMIN_PASSWORD);

  const parts = hash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length !== 16 || expected.length !== 64) return false;

  const actual = await scrypt(pw, salt, 64);
  return crypto.timingSafeEqual(actual, expected);
}

async function sign(exp, hash) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('ADMIN_PASSWORD faltante');
  return crypto.createHmac('sha256', secret)
    .update('dz-admin:' + exp + ':' + (hash || 'inicial'))
    .digest('hex');
}

export async function checkPassword(pw) {
  return verify(pw, await storedHash());
}

export async function loginToken(pw) {
  const hash = await storedHash();
  if (!await verify(pw, hash)) return null;
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  return exp + '.' + await sign(exp, hash);
}

export async function isAdmin(req) {
  try {
    const usuario = await obtenerUsuarioSesion(req);

    // Solo el propietario con sesion individual
    // puede acceder a las API aun no adaptadas.
    return usuario?.rol === 'propietario';
  } catch (error) {
    console.error(
      'isAdmin',
      error?.code || ''
    );
    return false;
  }
}

export async function changePassword(current, next) {
  if (typeof current !== 'string' || typeof next !== 'string') {
    return { error: 'datos_invalidos' };
  }
  if (next.length < 12 || next.length > 128) {
    return { error: 'longitud_invalida' };
  }
  if (current === next) return { error: 'clave_repetida' };

  const previous = await storedHash();
  if (!await verify(current, previous)) {
    return { error: 'clave_actual_incorrecta' };
  }

  const salt = crypto.randomBytes(16);
  const derived = await scrypt(next, salt, 64);
  const hash = 'scrypt$' + salt.toString('hex') + '$' + derived.toString('hex');

  let rows;
  if (previous === null) {
    rows = await sql()`INSERT INTO app_settings (key, value, updated_at)
      VALUES (${KEY}, ${hash}, now())
      ON CONFLICT (key) DO NOTHING
      RETURNING key`;
  } else {
    rows = await sql()`UPDATE app_settings
      SET value = ${hash}, updated_at = now()
      WHERE key = ${KEY} AND value = ${previous}
      RETURNING key`;
  }
  if (!rows.length) return { error: 'cambio_simultaneo' };
  return { ok: true };
}
