// compras-v1
import { sql } from '@/lib/db';
import { admiteDecimales } from './unidades.js';

const METODOS = ['efectivo', 'qr', 'transferencia', 'otro'];
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const num = (v) => (v === '' || v == null ? NaN : Number(v));
const txt = (v, m) => String(v ?? '').trim().slice(0, m);
const fechaOk = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) && !isNaN(Date.parse(f));
const hoyBO = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
// Mismo criterio de las reglas de unidades: decimales solo en kilo y litro.
const admiteDec = admiteDecimales;

export async function listarProveedores(q = sql()) {
  return q`SELECT id, nombre, telefono, nota FROM proveedores WHERE activo ORDER BY lower(nombre)`;
}

export async function guardarProveedor(b = {}, q = sql()) {
  const nombre = txt(b.nombre, 80);
  if (!nombre) return { error: 'datos_invalidos' };
  const tel = String(b.telefono ?? '').replace(/\D/g, '').slice(0, 15) || null;
  const nota = txt(b.nota, 200) || null;
  try {
    if (b.id != null && b.id !== '') {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id < 1 || id > 2147483647) return { error: 'datos_invalidos' };
      const r = await q`UPDATE proveedores SET nombre = ${nombre}, telefono = ${tel}, nota = ${nota} WHERE id = ${id}::int RETURNING id`;
      return r.length ? { ok: true, id: r[0].id } : { error: 'no_encontrado' };
    }
    const r = await q`INSERT INTO proveedores (nombre, telefono, nota) VALUES (${nombre}, ${tel}, ${nota}) RETURNING id`;
    return { ok: true, id: r[0].id };
  } catch (e) {
    if (e?.code === '23505') return { error: 'proveedor_repetido' };
    throw e;
  }
}

export async function listarCompras({ desde, hasta } = {}, q = sql()) {
  const d = fechaOk(desde) ? desde : null;
  const h = fechaOk(hasta) ? hasta : null;
  return q`
    SELECT c.id, to_char(c.fecha, 'YYYY-MM-DD') AS fecha, c.metodo, c.de_caja, c.total::float AS total, c.nota, c.estado,
      pr.nombre AS proveedor,
      COALESCE((SELECT json_agg(json_build_object('nombre', i.nombre, 'unidad', i.unidad, 'cantidad', i.cantidad::float,
        'costo', i.costo::float, 'subtotal', i.subtotal::float) ORDER BY i.id)
        FROM compra_items i WHERE i.compra_id = c.id), '[]'::json) AS items
    FROM compras c LEFT JOIN proveedores pr ON pr.id = c.proveedor_id
    WHERE (${d}::date IS NULL OR c.fecha >= ${d}::date) AND (${h}::date IS NULL OR c.fecha <= ${h}::date)
    ORDER BY c.fecha DESC, c.id DESC LIMIT 200`;
}

export async function crearCompra(b = {}, q = sql()) {
  const vistos = new Set();
  const items = [];
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 100) : []) {
    const pid = txt(it?.producto_id, 40);
    const cantidad = r3(num(it?.cantidad));
    let costo = r2(num(it?.costo));
    let subtotal = r2(num(it?.subtotal));
    if (!pid || !(cantidad > 0) || cantidad > 100000) return { error: 'items_invalidos' };
    if (vistos.has(pid)) return { error: 'producto_repetido' };
    vistos.add(pid);
    if (!Number.isFinite(subtotal) && Number.isFinite(costo)) subtotal = r2(cantidad * costo);
    if (!Number.isFinite(costo) && Number.isFinite(subtotal)) costo = r2(subtotal / cantidad);
    if (!(costo > 0) || !(subtotal > 0) || costo > 10000000 || subtotal > 100000000) return { error: 'items_invalidos' };
    if (Math.abs(subtotal - cantidad * costo) > Math.max(1, cantidad * 0.006)) return { error: 'items_invalidos' };
    items.push({ producto_id: pid, cantidad, costo, subtotal });
  }
  if (!items.length) return { error: 'sin_items' };

  const ids = items.map((i) => i.producto_id);
  const prods = await q`SELECT id::text AS id, nombre, unidad FROM productos WHERE id::text = ANY(${ids}::text[])`;
  if (prods.length !== ids.length) return { error: 'producto_inexistente' };
  for (const i of items) {
    const p = prods.find((x) => x.id === i.producto_id);
    if (!admiteDec(p.unidad) && !Number.isInteger(i.cantidad)) return { error: 'cantidad_entera', producto: p.nombre, unidad: p.unidad };
  }

  const total = r2(items.reduce((a, i) => a + i.subtotal, 0));
  const metodo = METODOS.includes(b.metodo) ? b.metodo : 'efectivo';
  const deCaja = metodo === 'efectivo' && b.de_caja === true;
  const fecha = fechaOk(b.fecha) ? b.fecha : null;
  if (fecha && fecha > hoyBO()) return { error: 'fecha_invalida' };
  const prov = b.proveedor_id == null || b.proveedor_id === '' ? null : Number(b.proveedor_id);
  if (prov !== null && (!Number.isInteger(prov) || prov < 1 || prov > 2147483647)) return { error: 'proveedor_invalido' };
  const clave = txt(b.clave, 80) || null;
  const nota = txt(b.nota, 300) || null;

  if (clave) {
    const ya = await q`SELECT id, total::float AS total FROM compras WHERE clave = ${clave} LIMIT 1`;
    if (ya.length) return { ok: true, id: ya[0].id, total: ya[0].total, repetida: true };
  }

  let r;
  try {
    r = await q`
      WITH c AS (
        INSERT INTO compras (fecha, proveedor_id, metodo, de_caja, total, nota, clave)
        VALUES (COALESCE(${fecha}::date, (now() AT TIME ZONE 'America/La_Paz')::date), ${prov}::int, ${metodo}, ${deCaja}, ${total}, ${nota}, ${clave})
        RETURNING id
      ), i AS (
        INSERT INTO compra_items (compra_id, producto_id, nombre, unidad, cantidad, costo, subtotal)
        SELECT c.id, x.producto_id, p.nombre, p.unidad, x.cantidad, x.costo, x.subtotal
        FROM c CROSS JOIN jsonb_to_recordset(${JSON.stringify(items)}::jsonb)
          AS x(producto_id text, cantidad numeric, costo numeric, subtotal numeric)
        JOIN productos p ON p.id::text = x.producto_id
        RETURNING producto_id, cantidad, costo
      ), s AS (
        UPDATE productos p SET stock = COALESCE(p.stock, 0) + i.cantidad, costo = i.costo
        FROM i WHERE p.id::text = i.producto_id
        RETURNING p.id
      ), m AS (
        INSERT INTO stock_mov (producto_id, cantidad, motivo, ref)
        SELECT s.id::text, i.cantidad, 'ingreso', (SELECT id FROM c) FROM s JOIN i ON s.id::text = i.producto_id
        RETURNING 1
      )
      SELECT (SELECT id FROM c) AS id`;
  } catch (e) {
    if (e?.code === '23503') return { error: 'proveedor_invalido' };
    if (e?.code === '23505' && clave) {
      const ya = await q`SELECT id, total::float AS total FROM compras WHERE clave = ${clave} LIMIT 1`;
      if (ya.length) return { ok: true, id: ya[0].id, total: ya[0].total, repetida: true };
    }
    throw e;
  }
  if (!r[0]?.id) return { error: 'error_servidor' };
  return { ok: true, id: r[0].id, total };
}

export async function anularCompra(id, q = sql()) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) return { error: 'datos_invalidos' };
  const filas = await q`
    SELECT ci.producto_id, ci.cantidad::float AS cantidad, p.nombre, p.unidad, p.stock::float AS stock
    FROM compra_items ci JOIN compras c ON c.id = ci.compra_id
    LEFT JOIN productos p ON p.id::text = ci.producto_id
    WHERE c.id = ${n}::int AND c.estado = 'activa'`;
  if (!filas.length) return { error: 'no_encontrada' };
  for (const f of filas) {
    if (f.stock != null && r3(f.stock - f.cantidad) < 0) {
      return { error: 'stock_insuficiente', producto: f.nombre, disponible: f.stock, unidad: f.unidad };
    }
  }
  const r = await q`
    WITH c AS (UPDATE compras SET estado = 'anulada' WHERE id = ${n}::int AND estado = 'activa' RETURNING id),
    it AS (SELECT ci.producto_id, ci.cantidad FROM compra_items ci JOIN c ON c.id = ci.compra_id WHERE ci.producto_id IS NOT NULL),
    s AS (UPDATE productos p SET stock = COALESCE(p.stock, 0) - it.cantidad FROM it WHERE p.id::text = it.producto_id RETURNING p.id, it.cantidad),
    m AS (INSERT INTO stock_mov (producto_id, cantidad, motivo, ref)
      SELECT s.id::text, -s.cantidad, 'ajuste', (SELECT id FROM c) FROM s RETURNING 1)
    SELECT id FROM c`;
  return r.length ? { ok: true } : { error: 'no_encontrada' };
}
