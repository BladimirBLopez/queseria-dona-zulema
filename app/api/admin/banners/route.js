import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { autorizar } from '@/lib/permisos';
import { destroyImage } from '@/lib/cloudinary';

const denegar = (acceso) => NextResponse.json(
  {
    error: acceso.status === 401
      ? 'no_autorizado'
      : 'sin_permiso'
  },
  { status: acceso.status }
);
const s = (v, m) => String(v ?? '').trim().slice(0, m);
const img = (u) => (/^https:\/\/res\.cloudinary\.com\//.test(String(u || '')) ? String(u).slice(0, 500) : null);

export async function GET(req) {
  const acceso = await autorizar(req, 'banners.ver');
  if (!acceso.ok) return denegar(acceso);
  const rows = await sql()`SELECT * FROM banners ORDER BY orden, id`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  const acceso = await autorizar(req, 'banners.gestionar');
  if (!acceso.ok) return denegar(acceso);
  const b = await req.json().catch(() => ({}));
  const titulo = s(b.titulo, 80);
  if (!titulo) return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  const texto = s(b.texto, 200), boton = s(b.boton, 30), activo = b.activo !== false;
  const url = img(b.imagen_url);
  const pid = url ? s(b.imagen_public_id, 200) : null;
  const q = sql();
  if (b.id) {
    const old = await q`SELECT imagen_public_id FROM banners WHERE id = ${b.id}`;
    if (url && pid && old[0]?.imagen_public_id && old[0].imagen_public_id !== pid) await destroyImage(old[0].imagen_public_id);
    await q`UPDATE banners SET titulo=${titulo}, texto=${texto}, boton=${boton}, activo=${activo},
      imagen_url=COALESCE(${url}, imagen_url), imagen_public_id=COALESCE(${pid}, imagen_public_id) WHERE id=${b.id}`;
  } else {
    await q`INSERT INTO banners (titulo, texto, boton, activo, imagen_url, imagen_public_id, orden)
      VALUES (${titulo}, ${texto}, ${boton}, ${activo}, ${url}, ${pid}, (SELECT COALESCE(MAX(orden), 0) + 1 FROM banners))`;
  }
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const acceso = await autorizar(req, 'banners.gestionar');
  if (!acceso.ok) return denegar(acceso);
  const id = new URL(req.url).searchParams.get('id');
  const r = await sql()`DELETE FROM banners WHERE id = ${id} RETURNING imagen_public_id`;
  if (r[0]?.imagen_public_id) await destroyImage(r[0].imagen_public_id);
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
