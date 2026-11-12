// cierre-v1
import { sql } from '@/lib/db';

const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const num = (v) => (v === '' || v == null ? NaN : Number(String(v).replace(',', '.')));

export async function estadoCaja(q = sql()) {
  const hoy = (await q`SELECT to_char((now() AT TIME ZONE 'America/La_Paz')::date, 'YYYY-MM-DD') AS hoy`)[0].hoy;
  const ult = await q`SELECT to_char(fecha + 1, 'YYYY-MM-DD') AS desde, deja::float AS deja
    FROM cierres_caja WHERE fecha < ${hoy}::date ORDER BY fecha DESC LIMIT 1`;
  const desde = ult.length ? ult[0].desde : hoy;
  const [cob, com, gas, cer] = await Promise.all([
    q`SELECT COALESCE(sum(p.monto) FILTER (WHERE p.metodo = 'efectivo'), 0)::float AS efectivo,
        COALESCE(sum(p.monto) FILTER (WHERE p.metodo IN ('qr', 'transferencia')), 0)::float AS otros
      FROM pagos p JOIN ventas v ON v.id = p.venta_id
      WHERE v.estado = 'activa' AND (p.fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${desde}::date AND ${hoy}::date`,
    q`SELECT COALESCE(sum(total), 0)::float AS t FROM compras
      WHERE estado = 'activa' AND de_caja AND fecha BETWEEN ${desde}::date AND ${hoy}::date`,
    q`SELECT COALESCE(sum(monto), 0)::float AS t FROM gastos
      WHERE de_caja AND fecha BETWEEN ${desde}::date AND ${hoy}::date`,
    q`SELECT contado::float AS contado, diferencia::float AS diferencia FROM cierres_caja WHERE fecha = ${hoy}::date`,
  ]);
  return {
    hoy, desde, primera: !ult.length, apertura: ult.length ? ult[0].deja : null,
    efectivo: cob[0].efectivo, otros: cob[0].otros, compras: com[0].t, gastos: gas[0].t,
    cerrado_hoy: cer[0] || null,
  };
}

export async function guardarCierre(b = {}, q = sql()) {
  const e = await estadoCaja(q);
  const contado = r2(num(b.contado));
  const deja = b.deja === '' || b.deja == null ? contado : r2(num(b.deja));
  const apertura = e.primera ? (b.apertura === '' || b.apertura == null ? 0 : r2(num(b.apertura))) : e.apertura;
  if (![contado, deja, apertura].every(Number.isFinite)) return { error: 'datos_invalidos' };
  if (contado < 0 || deja < 0 || apertura < 0 || contado > 10000000 || apertura > 10000000 || deja > contado) return { error: 'datos_invalidos' };
  const esperado = r2(apertura + e.efectivo - e.compras - e.gastos);
  const diferencia = r2(contado - esperado);
  await q`INSERT INTO cierres_caja (fecha, apertura, efectivo, compras, gastos, esperado, contado, diferencia, deja)
    VALUES (${e.hoy}::date, ${apertura}, ${e.efectivo}, ${e.compras}, ${e.gastos}, ${esperado}, ${contado}, ${diferencia}, ${deja})
    ON CONFLICT (fecha) DO UPDATE SET apertura = EXCLUDED.apertura, efectivo = EXCLUDED.efectivo, compras = EXCLUDED.compras,
      gastos = EXCLUDED.gastos, esperado = EXCLUDED.esperado, contado = EXCLUDED.contado, diferencia = EXCLUDED.diferencia,
      deja = EXCLUDED.deja, creado = now()`;
  return { ok: true, esperado, diferencia };
}
