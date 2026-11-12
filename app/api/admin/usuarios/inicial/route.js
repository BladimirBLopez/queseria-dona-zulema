import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { crearHashClave } from '@/lib/usuarios';
import { sql } from '@/lib/db';
import { limited } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function respuesta(datos, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

export async function GET(req) {
  if (!await isAdmin(req)) {
    return respuesta(
      { error: 'no_autorizado' },
      401
    );
  }

  try {
    const filas = await sql()`
      SELECT EXISTS (
        SELECT 1
        FROM dz_usuarios
        WHERE rol = 'propietario'
      ) AS existe
    `;

    return respuesta({
      propietarioCreado: filas[0]?.existe === true
    });
  } catch (error) {
    console.error(
      'usuarios inicial GET',
      error?.code || ''
    );

    return respuesta(
      { error: 'error_servidor' },
      500
    );
  }
}

export async function POST(req) {
  if (!await isAdmin(req)) {
    return respuesta(
      { error: 'no_autorizado' },
      401
    );
  }

  if (
    req.headers.get('origin') !==
    new URL(req.url).origin
  ) {
    return respuesta(
      { error: 'origen_invalido' },
      403
    );
  }

  const ip = (
    req.headers.get('x-forwarded-for') || 'x'
  ).split(',')[0].trim();

  if (await limited(
    'dz-crear-propietario:' + ip,
    5,
    900
  )) {
    return respuesta(
      { error: 'demasiados_intentos' },
      429
    );
  }

  const body = await req.json()
    .catch(() => ({}));

  const nombre = typeof body.nombre === 'string'
    ? body.nombre.trim()
    : '';

  const clave = body.clave;

  if (
    nombre.length < 2 ||
    nombre.length > 120 ||
    typeof clave !== 'string' ||
    clave.length < 12 ||
    clave.length > 128
  ) {
    return respuesta(
      { error: 'datos_invalidos' },
      400
    );
  }

  try {
    const hash = await crearHashClave(clave);

    const filas = await sql()`
      INSERT INTO dz_usuarios
        (nombre, usuario, password_hash, rol)
      SELECT
        ${nombre},
        'propietario',
        ${hash},
        'propietario'
      WHERE NOT EXISTS (
        SELECT 1
        FROM dz_usuarios
        WHERE rol = 'propietario'
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (!filas.length) {
      return respuesta(
        { error: 'propietario_ya_existe' },
        409
      );
    }

    return respuesta({
      ok: true,
      usuario: 'propietario'
    });

  } catch (error) {
    console.error(
      'usuarios inicial POST',
      error?.code || ''
    );

    return respuesta(
      { error: 'error_servidor' },
      500
    );
  }
}
