import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { limited } from '@/lib/ratelimit';
import {
  obtenerUsuarioSesion,
  verificarHashClave,
  crearHashClave
} from '@/lib/usuarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function responder(datos, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(req) {
  try {
    if (
      req.headers.get('origin') !==
      new URL(req.url).origin
    ) {
      return responder({
        error: 'origen_invalido'
      }, 403);
    }

    const usuario = await obtenerUsuarioSesion(req);

    if (!usuario?.id) {
      return responder({
        error: 'no_autorizado'
      }, 401);
    }

    const limitado = await limited(
      'dz-cambio-clave:' + String(usuario.id),
      5,
      300
    );

    if (limitado) {
      return responder({
        error: 'demasiados_intentos'
      }, 429);
    }

    const cuerpo = await req.json()
      .catch(() => ({}));

    const actual = cuerpo.actual;
    const nueva = cuerpo.nueva;

    if (
      typeof actual !== 'string' ||
      typeof nueva !== 'string' ||
      nueva.length < 12 ||
      nueva.length > 128 ||
      actual === nueva
    ) {
      return responder({
        error: 'clave_invalida'
      }, 400);
    }

    const id = String(usuario.id);

    const filas = await sql()`
      SELECT password_hash
      FROM dz_usuarios
      WHERE id = ${id}::bigint
        AND activo = true
      LIMIT 1
    `;

    if (!filas.length) {
      return responder({
        error: 'no_autorizado'
      }, 401);
    }

    const hashActual = filas[0].password_hash;

    const coincide = await verificarHashClave(
      actual,
      hashActual
    );

    if (!coincide) {
      return responder({
        error: 'clave_actual_incorrecta'
      }, 400);
    }

    const hashNuevo = await crearHashClave(nueva);

    // Actualizar la clave y revocar las sesiones
    // como una sola operacion en PostgreSQL.
    const resultado = await sql()`
      WITH actualizacion AS (
        UPDATE dz_usuarios
        SET
          password_hash = ${hashNuevo},
          actualizado_en = now()
        WHERE id = ${id}::bigint
          AND password_hash = ${hashActual}
          AND activo = true
        RETURNING id
      ),
      revocacion AS (
        UPDATE dz_sesiones
        SET revocado_en = now()
        WHERE usuario_id IN (
          SELECT id FROM actualizacion
        )
          AND revocado_en IS NULL
        RETURNING usuario_id
      )
      SELECT
        (
          SELECT count(*)::int
          FROM actualizacion
        ) AS actualizadas,
        (
          SELECT count(*)::int
          FROM revocacion
        ) AS sesiones_revocadas
    `;

    if (Number(resultado[0]?.actualizadas) !== 1) {
      return responder({
        error: 'clave_no_actualizada'
      }, 409);
    }

    return responder({
      ok: true,
      requiere_nuevo_login: true
    });

  } catch (error) {
    console.error(
      'cambiar clave individual',
      error?.code || ''
    );

    return responder({
      error: 'error_servidor'
    }, 500);
  }
}
