import { NextResponse } from 'next/server';
import { autorizar } from '@/lib/permisos';
import { reporte } from '@/lib/ventas';

export const dynamic = 'force-dynamic';

const denegar = (a) =>
  NextResponse.json(
    { error: a.status === 401 ? 'no_autorizado' : 'sin_permiso' },
    { status: a.status }
  );

// Quita del reporte lo que el usuario no puede ver.
// costos.ver: ganancias y costos faltantes. gastos.ver: gastos.
// La utilidad neta necesita los dos permisos.
function filtrar(r, verCostos, verGastos) {
  const out = {
    ...r,
    resumen: { ...r.resumen },
    serie: (r.serie || []).map((x) => ({ ...x })),
    productos: (r.productos || []).map((x) => ({ ...x })),
  };
  if (!verCostos) {
    delete out.resumen.ganancia;
    delete out.resumen.sin_costo;
    out.serie.forEach((x) => { delete x.ganancia; });
    out.productos.forEach((x) => { delete x.ganancia; });
  }
  if (!verGastos) {
    delete out.resumen.gastos;
    delete out.gastos_cat;
  }
  if (!verCostos || !verGastos) delete out.resumen.neta;
  return out;
}

export async function GET(req) {
  const base = await autorizar(req, 'reportes.ver');
  if (!base.ok) return denegar(base);
  try {
    const [c, g] = await Promise.all([
      autorizar(req, 'costos.ver'),
      autorizar(req, 'gastos.ver'),
    ]);
    const p = new URL(req.url).searchParams;
    const r = await reporte(p.get('desde'), p.get('hasta'));
    return NextResponse.json(filtrar(r, c.ok, g.ok), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('reportes', e?.code || '', e?.message || '');
    const falta = e?.code === '42P01' || e?.code === '42703';
    return NextResponse.json({ error: falta ? 'falta_tabla' : 'error_servidor' }, { status: 500 });
  }
}
