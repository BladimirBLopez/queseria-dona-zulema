import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { sql } from '@/lib/db';

export const COOKIE_USUARIO = 'dz_usuario';
export const DURACION_SESION = 7 * 24 * 60 * 60;

const scrypt = promisify(crypto.scrypt);

export async function crearHashClave(clave) {
  if (
    typeof clave !== 'string' ||
    clave.length < 12 ||
    clave.length > 128
  ) {
    throw new Error('longitud_invalida');
  }

  const salt = crypto.randomBytes(16);
  const derivada = await scrypt(clave, salt, 64);

  return [
    'scrypt',
    salt.toString('hex'),
    derivada.toString('hex')
  ].join('$');
}

export async function verificarHashClave(clave, hash) {
  if (
    typeof clave !== 'string' ||
    typeof hash !== 'string'
  ) return false;

  const partes = hash.split('$');

  if (
    partes.length !== 3 ||
    partes[0] !== 'scrypt' ||
    !/^[a-f0-9]{32}$/i.test(partes[1]) ||
    !/^[a-f0-9]{128}$/i.test(partes[2])
  ) return false;

  const salt = Buffer.from(partes[1], 'hex');
  const esperado = Buffer.from(partes[2], 'hex');

  const obtenido = await scrypt(clave, salt, 64);

  return crypto.timingSafeEqual(
    obtenido,
    esperado
  );
}

export async function validarCredenciales(
  nombreUsuario,
  clave
) {
  if (
    typeof nombreUsuario !== 'string' ||
    typeof clave !== 'string' ||
    nombreUsuario.length > 60 ||
    clave.length > 128
  ) return null;

  const nombre = nombreUsuario.trim().toLowerCase();

  if (!/^[a-z0-9._-]{3,60}$/.test(nombre)) {
    return null;
  }

  const usuarios = await sql()`
    SELECT id, nombre, usuario, password_hash,
           rol, activo
    FROM dz_usuarios
    WHERE lower(usuario) = ${nombre}
    LIMIT 1
  `;

  const u = usuarios[0];

  if (!u || !u.activo) return null;

  if (!await verificarHashClave(
    clave,
    u.password_hash
  )) return null;

  return {
    id: u.id,
    nombre: u.nombre,
    usuario: u.usuario,
    rol: u.rol
  };
}

export async function crearSesionUsuario(usuarioId) {
  const token = crypto.randomBytes(32)
    .toString('base64url');

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  await sql()`
    INSERT INTO dz_sesiones
      (token_hash, usuario_id, expira_en)
    VALUES (
      ${tokenHash},
      ${usuarioId}::bigint,
      now() + interval '7 days'
    )
  `;

  return token;
}

function leerCookie(req, nombre) {
  const cookies = req.headers.get('cookie') || '';

  for (const parte of cookies.split(';')) {
    const [clave, ...valor] =
      parte.trim().split('=');

    if (clave === nombre) {
      return valor.join('=');
    }
  }

  return '';
}

export async function obtenerUsuarioSesion(req) {
  const token = leerCookie(req, COOKIE_USUARIO);

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const filas = await sql()`
    SELECT
      u.id,
      u.nombre,
      u.usuario,
      u.rol
    FROM dz_sesiones s
    JOIN dz_usuarios u
      ON u.id = s.usuario_id
    WHERE s.token_hash = ${tokenHash}
      AND s.revocado_en IS NULL
      AND s.expira_en > now()
      AND u.activo = true
    LIMIT 1
  `;

  return filas[0] || null;
}

export async function revocarSesionUsuario(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) {
    return false;
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const filas = await sql()`
    UPDATE dz_sesiones
    SET revocado_en = now()
    WHERE token_hash = ${tokenHash}
      AND revocado_en IS NULL
    RETURNING token_hash
  `;

  return filas.length > 0;
}
