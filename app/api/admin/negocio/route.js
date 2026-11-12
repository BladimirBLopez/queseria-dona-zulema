import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { autorizar } from '@/lib/permisos';
import { getNegocio, limpiarConLogo } from '@/lib/negocio';

const denegar = (acceso) => NextResponse.json(
  {
    error: acceso.status === 401
      ? 'no_autorizado'
      : 'sin_permiso'
  },
  { status: acceso.status }
);

export async function GET(req) {
  const acceso = await autorizar(req, 'negocio.ver');
  if (!acceso.ok) return denegar(acceso);
  return NextResponse.json(await getNegocio());
}

export async function POST(req) {
  const acceso = await autorizar(req, 'negocio.editar');
  if (!acceso.ok) return denegar(acceso);
  const b = await req.json().catch(() => ({}));
  const v = JSON.stringify(limpiarConLogo(b));
  await sql()`INSERT INTO app_settings (key, value, updated_at) VALUES ('negocio', ${v}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${v}, updated_at = now()`;
  revalidatePath('/'); return NextResponse.json({ ok: true });
}
