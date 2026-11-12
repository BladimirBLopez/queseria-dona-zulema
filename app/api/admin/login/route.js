import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/admin';
import { limited } from '@/lib/ratelimit';
import {
  validarCredenciales,
  crearSesionUsuario,
  COOKIE_USUARIO,
  DURACION_SESION
} from '@/lib/usuarios';

export const runtime = 'nodejs';

function json(datos, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(req) {
  if (
    req.headers.get('origin') !==
    new URL(req.url).origin
  ) {
    return json(
      { error: 'origen_invalido' },
      403
    );
  }

  const ip = (
    req.headers.get('x-forwarded-for') || 'x'
  ).split(',')[0].trim();

  if (await limited(
    'dz-login-usuario:' + ip,
    5,
    300
  )) {
    return json(
      { error: 'demasiados_intentos' },
      429
    );
  }

  const body = await req.json().catch(() => ({}));

  try {
    const usuario = await validarCredenciales(
      body.usuario,
      body.clave
    );

    // No habilitar empleados hasta implementar
    // los permisos de todas las API.
    if (!usuario || usuario.rol !== 'propietario') {
      return json(
        { error: 'credenciales_invalidas' },
        401
      );
    }

    const token = await crearSesionUsuario(usuario.id);

    const res = json({
      ok: true,
      usuario: {
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });

    res.cookies.set(COOKIE_USUARIO, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: DURACION_SESION
    });

    // Eliminar la cookie administrativa anterior.
    res.cookies.set(COOKIE, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return res;

  } catch (error) {
    console.error(
      'login individual',
      error?.code || ''
    );

    return json(
      { error: 'error_servidor' },
      500
    );
  }
}
