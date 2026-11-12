import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { obtenerUsuarioSesion } from '@/lib/usuarios';
import {
  CATALOGO_PERMISOS,
  permisoExiste
} from '@/lib/permisos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(datos, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

function idValido(id) {
  return typeof id === 'string' &&
    /^[1-9]\d{0,17}$/.test(id);
}

async function verificarPropietario(req) {
  const usuario = await obtenerUsuarioSesion(req);

  return usuario?.rol === 'propietario';
}

export async function GET(req) {
  try {
    if (!await verificarPropietario(req)) {
      return json({ error: 'sin_permiso' }, 403);
    }

    const id = new URL(req.url)
      .searchParams.get('usuario_id');

    if (id !== null && !idValido(id)) {
      return json({ error: 'id_invalido' }, 400);
    }

    let ajustes = [];

    if (id !== null) {
      ajustes = await sql()`
        SELECT permiso, permitido
        FROM dz_permisos_usuario
        WHERE usuario_id = ${id}::bigint
      `;
    }

    return json({
      catalogo: CATALOGO_PERMISOS,
      ajustes
    });

  } catch (error) {
    console.error(
      'permisos GET',
      error?.code || ''
    );

    return json({ error: 'error_servidor' }, 500);
  }
}

export async function PATCH(req) {
  try {
    if (!await verificarPropietario(req)) {
      return json({ error: 'sin_permiso' }, 403);
    }

    if (
      req.headers.get('origin') !==
      new URL(req.url).origin
    ) {
      return json({ error: 'origen_invalido' }, 403);
    }

    const b = await req.json().catch(() => ({}));
    const id = String(b.usuario_id || '');
    const permiso = b.permiso;
    const permitido = b.permitido;

    if (
      !idValido(id) ||
      !permisoExiste(permiso) ||
      !(
        permitido === true ||
        permitido === false ||
        permitido === null
      )
    ) {
      return json({ error: 'datos_invalidos' }, 400);
    }

    const q = sql();

    const usuarios = await q`
      SELECT id
      FROM dz_usuarios
      WHERE id = ${id}::bigint
        AND rol <> 'propietario'
      LIMIT 1
    `;

    if (!usuarios.length) {
      return json({
        error: 'usuario_no_editable'
      }, 403);
    }

    if (permitido === null) {
      await q`
        DELETE FROM dz_permisos_usuario
        WHERE usuario_id = ${id}::bigint
          AND permiso = ${permiso}
      `;
    } else {
      await q`
        INSERT INTO dz_permisos_usuario
          (usuario_id, permiso, permitido)
        VALUES (
          ${id}::bigint,
          ${permiso},
          ${permitido}
        )
        ON CONFLICT (usuario_id, permiso)
        DO UPDATE SET
          permitido = EXCLUDED.permitido
      `;
    }

    return json({ ok: true });

  } catch (error) {
    console.error(
      'permisos PATCH',
      error?.code || ''
    );

    return json({ error: 'error_servidor' }, 500);
  }
}
