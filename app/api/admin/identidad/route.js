import { NextResponse } from 'next/server';
import { obtenerUsuarioSesion } from '@/lib/usuarios';
import { getNegocio } from '@/lib/negocio';

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
    // Exigir una sesion individual valida,
    // perteneciente a una cuenta activa.
    const usuario = await obtenerUsuarioSesion(req);

    if (!usuario) {
      return responder({
        error: 'no_autorizado'
      }, 401);
    }

    const negocio = await getNegocio();

    // Lista explicita de datos permitidos.
    // No devolver toda la configuracion.
    const nombre =
      typeof negocio.nombre === 'string'
        ? negocio.nombre.slice(0, 60)
        : 'Doña Zulema';

    const logo =
      typeof negocio.logo === 'string' &&
      negocio.logo.startsWith(
        'https://res.cloudinary.com/'
      )
        ? negocio.logo.slice(0, 500)
        : '';

    return responder({
      nombre,
      logo
    });

  } catch (error) {
    console.error(
      'identidad negocio',
      error?.code || ''
    );

    return responder({
      error: 'error_servidor'
    }, 500);
  }
}
