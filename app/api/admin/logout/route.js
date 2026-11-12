import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/admin';
import {
  COOKIE_USUARIO,
  revocarSesionUsuario
} from '@/lib/usuarios';

export const runtime = 'nodejs';

function leerCookie(req, nombre) {
  const texto = req.headers.get('cookie') || '';

  for (const parte of texto.split(';')) {
    const [clave, ...valor] =
      parte.trim().split('=');

    if (clave === nombre) return valor.join('=');
  }

  return '';
}

export async function GET(req) {
  const token = leerCookie(req, COOKIE_USUARIO);

  if (token) {
    try {
      await revocarSesionUsuario(token);
    } catch (error) {
      console.error(
        'logout individual',
        error?.code || ''
      );

      return NextResponse.json(
        { error: 'no_se_pudo_cerrar_sesion' },
        { status: 503 }
      );
    }
  }

  const res = NextResponse.redirect(
    new URL('/admin', req.url)
  );

  for (const nombre of [
    COOKIE,
    COOKIE_USUARIO
  ]) {
    res.cookies.set(nombre, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });
  }

  return res;
}
