import { NextResponse } from 'next/server';
import { obtenerUsuarioSesion } from '@/lib/usuarios';
import { permisosEfectivos } from '@/lib/permisos';

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

export async function GET(req) {
  try {
    const usuario = await obtenerUsuarioSesion(req);

    if (!usuario) {
      return responder({
        error: 'no_autorizado'
      }, 401);
    }

    const permisos = await permisosEfectivos(usuario);

    return responder({
      ok: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        usuario: usuario.usuario,
        rol: usuario.rol
      },
      permisos
    });

  } catch (error) {
    console.error(
      'sesion individual',
      error?.code || ''
    );

    return responder({
      error: 'error_servidor'
    }, 500);
  }
}
