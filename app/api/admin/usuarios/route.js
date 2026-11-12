import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { obtenerUsuarioSesion, crearHashClave } from '@/lib/usuarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROLES = [
  'administrador',
  'cajero',
  'inventario',
  'contabilidad'
];

function responder(datos, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

async function propietario(req) {
  const usuario = await obtenerUsuarioSesion(req);
  return usuario?.rol === 'propietario';
}

function origenValido(req) {
  return req.headers.get('origin') ===
    new URL(req.url).origin;
}

function validarUsuario(valor) {
  return typeof valor === 'string' &&
    /^[a-z0-9._-]{3,60}$/.test(valor);
}

function validarNombre(valor) {
  return typeof valor === 'string' &&
    valor.length >= 2 &&
    valor.length <= 120;
}

function validarClave(valor) {
  return typeof valor === 'string' &&
    valor.length >= 12 &&
    valor.length <= 128;
}

export async function GET(req) {
  try {
    if (!await propietario(req)) {
      return responder({
        error: 'sin_permiso'
      }, 403);
    }

    const filas = await sql()`
      SELECT
        id::text AS id,
        nombre,
        usuario,
        rol,
        activo,
        creado_en,
        ultimo_acceso_en
      FROM dz_usuarios
      ORDER BY
        CASE WHEN rol = 'propietario'
          THEN 0 ELSE 1 END,
        id
    `;

    return responder({
      usuarios: filas
    });

  } catch (error) {
    console.error(
      'usuarios GET',
      error?.code || ''
    );

    return responder({
      error: 'error_servidor'
    }, 500);
  }
}

export async function POST(req) {
  try {
    if (!await propietario(req)) {
      return responder({
        error: 'sin_permiso'
      }, 403);
    }

    if (!origenValido(req)) {
      return responder({
        error: 'origen_invalido'
      }, 403);
    }

    const b = await req.json().catch(() => ({}));

    const nombre = typeof b.nombre === 'string'
      ? b.nombre.trim()
      : '';

    const usuario = typeof b.usuario === 'string'
      ? b.usuario.trim().toLowerCase()
      : '';

    if (
      !validarNombre(nombre) ||
      !validarUsuario(usuario) ||
      !ROLES.includes(b.rol) ||
      !validarClave(b.clave)
    ) {
      return responder({
        error: 'datos_invalidos'
      }, 400);
    }

    const hash = await crearHashClave(b.clave);

    const filas = await sql()`
      INSERT INTO dz_usuarios
        (
          nombre,
          usuario,
          password_hash,
          rol,
          activo
        )
      VALUES (
        ${nombre},
        ${usuario},
        ${hash},
        ${b.rol},
        false
      )
      RETURNING id::text AS id
    `;

    return responder({
      ok: true,
      id: filas[0].id
    }, 201);

  } catch (error) {
    if (error?.code === '23505') {
      return responder({
        error: 'usuario_duplicado'
      }, 409);
    }

    console.error(
      'usuarios POST',
      error?.code || ''
    );

    return responder({
      error: 'error_servidor'
    }, 500);
  }
}

export async function PATCH(req) {
  try {
    if (!await propietario(req)) {
      return responder({
        error: 'sin_permiso'
      }, 403);
    }

    if (!origenValido(req)) {
      return responder({
        error: 'origen_invalido'
      }, 403);
    }

    const b = await req.json().catch(() => ({}));

    const id = String(b.id || '');

    if (!/^[1-9]\d{0,17}$/.test(id)) {
      return responder({
        error: 'id_invalido'
      }, 400);
    }

    const nombre = typeof b.nombre === 'string'
      ? b.nombre.trim()
      : '';

    const usuario = typeof b.usuario === 'string'
      ? b.usuario.trim().toLowerCase()
      : '';

    if (
      !validarNombre(nombre) ||
      !validarUsuario(usuario) ||
      !ROLES.includes(b.rol) ||
      typeof b.activo !== 'boolean'
    ) {
      return responder({
        error: 'datos_invalidos'
      }, 400);
    }

    // Se habilitaran las cuentas cuando todas
    // las API tengan control de permisos.
    if (b.activo === true) {
      return responder({
        error: 'habilitacion_pendiente'
      }, 409);
    }

    const clave = b.clave || '';

    if (
      clave &&
      !validarClave(clave)
    ) {
      return responder({
        error: 'clave_invalida'
      }, 400);
    }

    const hash = clave
      ? await crearHashClave(clave)
      : null;

    const q = sql();

    const filas = await q`
      UPDATE dz_usuarios
      SET
        nombre = ${nombre},
        usuario = ${usuario},
        rol = ${b.rol},
        activo = ${b.activo},
        password_hash = COALESCE(
          ${hash}::text,
          password_hash
        ),
        actualizado_en = now()
      WHERE id = ${id}::bigint
        AND rol <> 'propietario'
      RETURNING id
    `;

    if (!filas.length) {
      return responder({
        error: 'usuario_no_editable'
      }, 403);
    }

    // Revocar sesiones anteriores cuando
    // se modifican los datos de una cuenta.
    await q`
      UPDATE dz_sesiones
      SET revocado_en = now()
      WHERE usuario_id = ${id}::bigint
        AND revocado_en IS NULL
    `;

    return responder({
      ok: true
    });

  } catch (error) {
    if (error?.code === '23505') {
      return responder({
        error: 'usuario_duplicado'
      }, 409);
    }

    console.error(
      'usuarios PATCH',
      error?.code || ''
    );

    return responder({
      error: 'error_servidor'
    }, 500);
  }
}
