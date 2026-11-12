import { admin } from '@/lib/api';
import { sql } from '@/lib/db';

export const POST = admin(async ({ body }) => {
  const lista = Array.isArray(body?.items) ? body.items.slice(0, 500) : [];
  const items = [];
  for (const it of lista) {
    const id = String(it?.id ?? '').trim().slice(0, 40);
    const vacio = it?.costo === null || it?.costo === '';
    const costo = vacio ? null : Math.round(Number(it?.costo) * 100) / 100;
    if (!id || (!vacio && (!Number.isFinite(costo) || costo < 0 || costo > 10000000))) return { error: 'datos_invalidos' };
    items.push({ id, costo });
  }
  if (!items.length) return { error: 'datos_invalidos' };
  const r = await sql()`
    UPDATE productos p SET costo = x.costo
    FROM jsonb_to_recordset(${JSON.stringify(items)}::jsonb) AS x(id text, costo numeric)
    WHERE p.id::text = x.id RETURNING p.id`;
  return { ok: true, actualizados: r.length };
}, 'costos.editar');
