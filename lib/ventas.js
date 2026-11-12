import { sql } from './db.js';
import { admiteDecimales } from './unidades.js';
import { obtenerPrecioPedido } from './precio-pedido.js';

const METODOS = ['efectivo', 'qr', 'transferencia', 'fiado'];
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const num = (v) => (v === '' || v == null ? NaN : Number(v));
const txt = (v, m) => String(v ?? '').trim().slice(0, m);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const fechaOk = (f) => FECHA.test(String(f || '')) && !isNaN(Date.parse(f));

/* caja-v2 */
const titulo = (s) => s.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export async function crearVenta(b = {}, q = sql()) {
  const vistos = new Set();
  const items = [];
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 100) : []) {
    const precio = r2(num(it.precio));
    const monto = it.monto == null || it.monto === '' ? null : r2(num(it.monto));
    if (monto !== null && !(monto > 0 && monto <= 10000000)) return { error: 'items_invalidos' };
    const cantidad = monto !== null && precio > 0 ? r3(monto / precio) : r3(num(it.cantidad));
    const nombre = txt(it.nombre, 120);
    const pid = it.producto_id == null || it.producto_id === '' ? null : txt(it.producto_id, 40);
    if (!nombre || !(cantidad > 0) || cantidad > 100000 || !(precio > 0) || precio > 10000000) return { error: 'items_invalidos' };
    if (pid) {
      if (vistos.has(pid)) return { error: 'producto_repetido' };
      vistos.add(pid);
    }
    const lista = it.lista == null || it.lista === '' ? null : r2(num(it.lista));
    items.push({
      producto_id: pid, nombre, unidad: txt(it.unidad, 20) || 'u', cantidad, precio,
      lista: Number.isFinite(lista) && lista >= 0 ? lista : null,
      subtotal: monto !== null ? monto : r2(cantidad * precio),
    });
  }
  if (!items.length) return { error: 'sin_items' };

  const ids = items.filter((i) => i.producto_id).map((i) => i.producto_id);
  if (ids.length) {
    const ps = await q`SELECT id::text AS id, nombre, unidad, stock::float AS stock FROM productos WHERE id::text = ANY(${ids}::text[])`;
    const mapa = new Map(ps.map((p) => [p.id, p]));
    for (const it of items) {
      const p = it.producto_id ? mapa.get(it.producto_id) : null;
      if (!p) continue;
      if (!admiteDecimales(p.unidad) && !Number.isInteger(it.cantidad)) return { error: 'cantidad_entera', producto: p.nombre, unidad: p.unidad };
      if (p.stock != null && it.cantidad > p.stock) return { error: 'stock_insuficiente', producto: p.nombre, disponible: p.stock, unidad: p.unidad };
    }
  }

  const bruto = r2(items.reduce((a, i) => a + i.subtotal, 0));
  const descuento = Math.min(bruto, Math.max(0, r2(num(b.descuento) || 0)));
  const total = r2(bruto - descuento);
  const metodo = METODOS.includes(b.metodo) ? b.metodo : 'efectivo';
  const tipo = b.tipo === 'mayor' ? 'mayor' : 'menor';
  const nombre = titulo(txt(b.cliente_nombre, 80));
  if (metodo === 'fiado' && !nombre) return { error: 'fiado_sin_cliente' };
  const pagado = metodo === 'fiado' ? Math.min(total, Math.max(0, r2(num(b.pagado) || 0))) : total;
  const cobro = METODOS.includes(b.metodo_pago) && b.metodo_pago !== 'fiado' ? b.metodo_pago : 'efectivo';
  const metodoCobro = metodo === 'fiado' ? cobro : metodo;
  const tel = String(b.cliente_tel ?? '').replace(/\D/g, '').slice(0, 15) || null;
  const fecha = fechaOk(b.fecha) ? b.fecha : null;
  const clave = txt(b.clave, 80) || null;
  const pedidoEnviado = b.pedido_id != null && String(b.pedido_id).trim() !== '';
  const pedidoNumero = Number(b.pedido_id);
  if (pedidoEnviado && (!Number.isInteger(pedidoNumero) || pedidoNumero < 1 || pedidoNumero > 2147483647)) {
    return { error: 'pedido_invalido' };
  }
  const pedido = pedidoEnviado ? pedidoNumero : null;

  if (clave) {
    const ya = await q`SELECT id, total::float AS total FROM ventas WHERE clave = ${clave} LIMIT 1`;
    if (ya.length) return { ok: true, id: ya[0].id, total: ya[0].total, repetida: true };
  }

  let r;
  try {
    r = await q`
      WITH pedido_pendiente AS MATERIALIZED (
        SELECT id
        FROM pedidos
        WHERE id = ${pedido}::int
          AND estado = 'pendiente'
        FOR UPDATE
      ), validacion AS (
        SELECT NOT EXISTS (
          SELECT 1
          FROM jsonb_to_recordset(${JSON.stringify(items)}::jsonb) AS x(producto_id text)
          WHERE x.producto_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM productos p WHERE p.id::text = x.producto_id
            )
        ) AS ok
      ), v AS (
        INSERT INTO ventas (fecha, cliente_nombre, cliente_tel, tipo, metodo, descuento, total, pagado, nota, pedido_id, clave)
        SELECT COALESCE(((${fecha}::date + time '12:00') AT TIME ZONE 'America/La_Paz'), now()),
          ${nombre || null}, ${tel}, ${tipo}, ${metodo}, ${descuento}, ${total}, ${pagado}, ${txt(b.nota, 300) || null}, ${pedido}::int, ${clave}
        FROM validacion
        WHERE ok
          AND (${pedido}::int IS NULL OR EXISTS (SELECT 1 FROM pedido_pendiente))
        RETURNING id, fecha
      ), i AS (
        INSERT INTO venta_items (venta_id, producto_id, nombre, unidad, cantidad, precio, costo, subtotal, precio_lista)
        SELECT v.id, x.producto_id, x.nombre, x.unidad, x.cantidad, x.precio, p.costo, x.subtotal, x.lista
        FROM v CROSS JOIN jsonb_to_recordset(${JSON.stringify(items)}::jsonb)
          AS x(producto_id text, nombre text, unidad text, cantidad numeric, precio numeric, lista numeric, subtotal numeric)
        LEFT JOIN productos p ON p.id::text = x.producto_id
        RETURNING producto_id, cantidad
      ), s AS (
        UPDATE productos p SET stock = p.stock - i.cantidad
        FROM i WHERE p.id::text = i.producto_id AND p.stock IS NOT NULL
        RETURNING p.id
      ), m AS (
        INSERT INTO stock_mov (producto_id, cantidad, motivo, ref)
        SELECT s.id::text, -i.cantidad, 'venta', (SELECT id FROM v) FROM s JOIN i ON s.id::text = i.producto_id
        RETURNING 1
      ), pg AS (
        INSERT INTO pagos (venta_id, monto, metodo, fecha)
        SELECT v.id, ${pagado}::numeric, ${metodoCobro}, v.fecha FROM v WHERE ${pagado}::numeric > 0
        RETURNING 1
      ), pe AS (
        UPDATE pedidos pe
        SET estado = 'entregado', venta_id = v.id
        FROM v
        JOIN pedido_pendiente pp ON TRUE
        WHERE pe.id = pp.id
          AND pe.estado = 'pendiente'
        RETURNING pe.id
      )
      SELECT
        (SELECT id FROM v) AS id,
        (SELECT ok FROM validacion) AS productos_ok,
        (${pedido}::int IS NULL OR EXISTS (SELECT 1 FROM pedido_pendiente)) AS pedido_ok,
        (${pedido}::int IS NULL OR EXISTS (SELECT 1 FROM pe)) AS pedido_actualizado`;
  } catch (e) {
    if (e?.code === '23505' && clave) {
      const ya = await q`SELECT id, total::float AS total FROM ventas WHERE clave = ${clave} LIMIT 1`;
      if (ya.length) return { ok: true, id: ya[0].id, total: ya[0].total, repetida: true };
    }
    throw e;
  }
  const resultado = r[0];
  if (!resultado?.productos_ok) return { error: 'producto_inexistente' };
  if (!resultado.pedido_ok) return { error: 'pedido_no_pendiente' };
  if (!resultado.id || !resultado.pedido_actualizado) return { error: 'error_servidor' };
  return { ok: true, id: resultado.id, total };
}

export async function anularVenta(id, q = sql()) {
  const r = await q`
    WITH v AS (
      UPDATE ventas
      SET estado = 'anulada'
      WHERE id = ${id}::int AND estado = 'activa'
      RETURNING id
    ),
    salidas AS (
      SELECT sm.producto_id,
        SUM(-sm.cantidad) AS cantidad
      FROM stock_mov sm
      JOIN v ON v.id = sm.ref
      WHERE sm.motivo = 'venta'
        AND sm.cantidad < 0
      GROUP BY sm.producto_id
    ),
    s AS (
      UPDATE productos p
      SET stock = p.stock + salidas.cantidad
      FROM salidas
      WHERE p.id::text = salidas.producto_id
        AND p.stock IS NOT NULL
      RETURNING p.id, salidas.cantidad
    ),
    m AS (
      INSERT INTO stock_mov (producto_id, cantidad, motivo, ref)
      SELECT s.id::text, s.cantidad, 'anulacion',
        (SELECT id FROM v)
      FROM s
      RETURNING id
    )
    SELECT id FROM v`;
  return r.length ? { ok: true } : { error: 'no_encontrada' };
}

export async function abonar(id, monto, metodo, q = sql()) {
  const m = r2(num(monto));
  if (!Number.isFinite(m) || !(m > 0)) return { error: 'monto_invalido' };
  const met = METODOS.includes(metodo) && metodo !== 'fiado' ? metodo : 'efectivo';
  const r = await q`
    WITH s AS MATERIALIZED (
      SELECT id, LEAST(${m}::numeric, total - pagado) AS ap
      FROM ventas
      WHERE id = ${id}::int AND estado = 'activa' AND total > pagado
      FOR UPDATE
    ),
    u AS (
      UPDATE ventas v
      SET pagado = v.pagado + s.ap
      FROM s
      WHERE v.id = s.id
      RETURNING v.id, s.ap
    ),
    p AS (
      INSERT INTO pagos (venta_id, monto, metodo)
      SELECT id, ap, ${met} FROM u
      RETURNING venta_id
    )
    SELECT u.id, u.ap
    FROM u JOIN p ON p.venta_id = u.id`;
  return r.length ? { ok: true, aplicado: Number(r[0].ap) } : { error: 'sin_deuda' };
}

export async function listarVentas({ desde, hasta, q: buscar, solo } = {}, q = sql()) {
  const d = fechaOk(desde) ? desde : null;
  const h = fechaOk(hasta) ? hasta : null;
  const t = txt(buscar, 60).toLowerCase();
  const deuda = solo === 'deuda';
  return q`
    SELECT v.id, v.fecha, v.cliente_nombre, v.cliente_tel, v.tipo, v.metodo, v.descuento::float AS descuento,
      v.total::float AS total, v.pagado::float AS pagado, v.nota, v.estado,
      COALESCE((SELECT json_agg(json_build_object('nombre', i.nombre, 'unidad', i.unidad, 'cantidad', i.cantidad::float,
        'precio', i.precio::float, 'subtotal', i.subtotal::float) ORDER BY i.id)
        FROM venta_items i WHERE i.venta_id = v.id), '[]'::json) AS items
    FROM ventas v
    WHERE (${d}::date IS NULL OR (v.fecha AT TIME ZONE 'America/La_Paz')::date >= ${d}::date)
      AND (${h}::date IS NULL OR (v.fecha AT TIME ZONE 'America/La_Paz')::date <= ${h}::date)
      AND (${deuda} = false OR (v.estado = 'activa' AND v.total - v.pagado > 0))
      AND (${t} = '' OR lower(coalesce(v.cliente_nombre, '')) LIKE '%' || ${t} || '%'
        OR EXISTS (SELECT 1 FROM venta_items i WHERE i.venta_id = v.id AND lower(i.nombre) LIKE '%' || ${t} || '%'))
    ORDER BY v.fecha DESC, v.id DESC LIMIT 300`;
}

export async function crearPedido(b = {}, q = sql()) {
  const pedidos = new Map();
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 60) : []) {
    const id = txt(it?.id, 40);
    const cant = r3(num(it?.qty));
    if (id && cant > 0 && cant <= 10000) pedidos.set(id, cant);
  }
  if (!pedidos.size) return { error: 'sin_items' };
  const tipo = b.tipo === 'mayor' ? 'mayor' : 'menor';
  const rows = await q`SELECT id::text AS id, nombre, unidad, precio_menor, precio_mayor, mayor_desde FROM productos
    WHERE disponible AND id::text = ANY(${[...pedidos.keys()]}::text[])`;
  if (!rows.length) return { error: 'sin_items' };
  const items = rows.map((p) => {
    const cantidad = pedidos.get(p.id);
    const { precio } = obtenerPrecioPedido(p, cantidad, tipo);
    return {
      producto_id: p.id,
      nombre: p.nombre,
      unidad: p.unidad || 'kg',
      cantidad,
      precio,
    };
  });
  const total = r2(items.reduce(
    (s, i) => s + (i.precio === null ? 0 : r2(i.precio * i.cantidad)),
    0
  ));
  const r = await q`INSERT INTO pedidos (cliente_nombre, items, total)
    VALUES (${txt(b.nombre, 80) || null}, ${JSON.stringify(items)}::jsonb, ${total}) RETURNING id`;
  return { ok: true, id: r[0].id };
}

export async function listarPedidos(estado, q = sql()) {
  const e = ['pendiente', 'entregado', 'cancelado'].includes(estado) ? estado : null;
  return q`SELECT id, creado, cliente_nombre, items, total::float AS total, estado, venta_id FROM pedidos
    WHERE (${e}::text IS NULL OR estado = ${e}) ORDER BY creado DESC LIMIT 100`;
}

export async function cancelarPedido(id, q = sql()) {
  const r = await q`UPDATE pedidos SET estado = 'cancelado' WHERE id = ${id}::int AND estado = 'pendiente' RETURNING id`;
  return r.length ? { ok: true } : { error: 'no_encontrado' };
}

export async function listarGastos({ desde, hasta } = {}, q = sql()) {
  const d = fechaOk(desde) ? desde : null;
  const h = fechaOk(hasta) ? hasta : null;
  return q`SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, concepto, categoria, de_caja, monto::float AS monto FROM gastos
    WHERE (${d}::date IS NULL OR fecha >= ${d}::date) AND (${h}::date IS NULL OR fecha <= ${h}::date)
    ORDER BY fecha DESC, id DESC LIMIT 300`;
}

export async function crearGasto(b = {}, q = sql()) {
  const monto = r2(num(b.monto));
  const concepto = txt(b.concepto, 120);
  if (!concepto || !(monto > 0) || monto > 10000000) return { error: 'datos_invalidos' };
  const fecha = fechaOk(b.fecha) ? b.fecha : null;
  await q`INSERT INTO gastos (fecha, concepto, categoria, de_caja, monto)
    VALUES (COALESCE(${fecha}::date, (now() AT TIME ZONE 'America/La_Paz')::date), ${concepto}, ${txt(b.categoria, 40) || null}, ${b.de_caja === true}, ${monto})`;
  return { ok: true };
}

export async function borrarGasto(id, q = sql()) {
  await q`DELETE FROM gastos WHERE id = ${id}::int`;
  return { ok: true };
}

export async function moverStock(b = {}, q = sql()) {
  const cant = r3(num(b.cantidad));
  const pid = txt(b.producto_id, 40);
  const motivo = ['ingreso', 'ajuste', 'merma'].includes(b.motivo) ? b.motivo : 'ingreso';
  if (!pid || !Number.isFinite(cant) || cant === 0 || Math.abs(cant) > 100000) return { error: 'datos_invalidos' };
  if ((motivo === 'ingreso' && cant < 0) || (motivo === 'merma' && cant > 0)) return { error: 'datos_invalidos' };
  const p = await q`SELECT nombre, unidad, stock::float AS stock FROM productos WHERE id::text = ${pid}`;
  if (!p.length) return { error: 'no_encontrado' };
  const { nombre, unidad, stock } = p[0];
  if (!admiteDecimales(unidad) && !Number.isInteger(cant)) return { error: 'cantidad_entera', producto: nombre, unidad };
  if (cant < 0 && stock == null) return { error: 'sin_control_stock' };
  if (cant < 0 && r3(stock + cant) < 0) return { error: 'stock_insuficiente', producto: nombre, disponible: stock, unidad };
  const r = await q`
    WITH u AS (UPDATE productos SET stock = COALESCE(stock, 0) + ${cant}::numeric WHERE id::text = ${pid} RETURNING id, stock),
    m AS (INSERT INTO stock_mov (producto_id, cantidad, motivo) SELECT id::text, ${cant}::numeric, ${motivo} FROM u RETURNING 1)
    SELECT id, stock::float AS stock FROM u`;
  return r.length ? { ok: true, stock: r[0].stock } : { error: 'no_encontrado' };
}

export function hoyBolivia(offsetDias = 0) {
  const d = new Date(Date.now() - 4 * 3600 * 1000 + offsetDias * 86400000);
  return d.toISOString().slice(0, 10);
}

export async function reporte(desde, hasta, q = sql()) {
  let d = fechaOk(desde) ? desde : hoyBolivia(-6);
  let h = fechaOk(hasta) ? hasta : hoyBolivia(0);
  if (d > h) [d, h] = [h, d];
  if ((Date.parse(h) - Date.parse(d)) / 86400000 > 366) d = new Date(Date.parse(h) - 366 * 86400000).toISOString().slice(0, 10);

  const [resumen, margen, serie, productos, categorias, metodos, gastos, gcat, global, bajo] = await Promise.all([
    q`SELECT count(*)::int AS n, COALESCE(sum(total),0)::float AS total, COALESCE(sum(descuento),0)::float AS descuento,
        COALESCE(sum(total - pagado),0)::float AS por_cobrar
      FROM ventas v WHERE v.estado = 'activa' AND (v.fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${d}::date AND ${h}::date`,
    q`SELECT COALESCE(sum(i.subtotal - i.cantidad * COALESCE(i.costo, 0)),0)::float AS margen,
        count(*) FILTER (WHERE i.costo IS NULL)::int AS sin_costo
      FROM venta_items i JOIN ventas v ON v.id = i.venta_id
      WHERE v.estado = 'activa' AND (v.fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${d}::date AND ${h}::date`,
    q`WITH d AS (SELECT generate_series(${d}::date, ${h}::date, interval '1 day')::date AS dia),
      v AS (SELECT (fecha AT TIME ZONE 'America/La_Paz')::date AS dia, count(*)::int AS n, sum(total) AS total, sum(descuento) AS descuento
        FROM ventas WHERE estado = 'activa' AND (fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${d}::date AND ${h}::date GROUP BY 1),
      m AS (SELECT (v.fecha AT TIME ZONE 'America/La_Paz')::date AS dia, sum(i.subtotal - i.cantidad * COALESCE(i.costo, 0)) AS margen
        FROM venta_items i JOIN ventas v ON v.id = i.venta_id
        WHERE v.estado = 'activa' AND (v.fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${d}::date AND ${h}::date GROUP BY 1)
      SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia, COALESCE(v.n, 0)::int AS n, COALESCE(v.total, 0)::float AS total,
        (COALESCE(m.margen, 0) - COALESCE(v.descuento, 0))::float AS ganancia
      FROM d LEFT JOIN v USING (dia) LEFT JOIN m USING (dia) ORDER BY d.dia`,
    q`SELECT i.nombre, max(i.unidad) AS unidad, sum(i.cantidad)::float AS cantidad, sum(i.subtotal)::float AS total,
        sum(i.subtotal - i.cantidad * COALESCE(i.costo, 0))::float AS ganancia
      FROM venta_items i JOIN ventas v ON v.id = i.venta_id
      WHERE v.estado = 'activa' AND (v.fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${d}::date AND ${h}::date
      GROUP BY i.nombre ORDER BY sum(i.subtotal) DESC LIMIT 20`,
    q`SELECT COALESCE(c.nombre, 'Sin categoría') AS nombre, sum(i.subtotal)::float AS total
      FROM venta_items i JOIN ventas v ON v.id = i.venta_id
      LEFT JOIN productos p ON p.id::text = i.producto_id LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE v.estado = 'activa' AND (v.fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${d}::date AND ${h}::date
      GROUP BY 1 ORDER BY 2 DESC`,
    q`SELECT p.metodo AS nombre, sum(p.monto)::float AS total
      FROM pagos p JOIN ventas v ON v.id = p.venta_id
      WHERE v.estado = 'activa' AND (p.fecha AT TIME ZONE 'America/La_Paz')::date BETWEEN ${d}::date AND ${h}::date
      GROUP BY 1 ORDER BY 2 DESC`,
    q`SELECT COALESCE(sum(monto),0)::float AS total FROM gastos WHERE fecha BETWEEN ${d}::date AND ${h}::date`,
    q`SELECT COALESCE(categoria, 'Otros') AS nombre, sum(monto)::float AS total FROM gastos
      WHERE fecha BETWEEN ${d}::date AND ${h}::date GROUP BY 1 ORDER BY 2 DESC`,
    q`SELECT (SELECT COALESCE(sum(total - pagado),0)::float FROM ventas WHERE estado = 'activa') AS por_cobrar,
        (SELECT count(*)::int FROM pedidos WHERE estado = 'pendiente') AS pedidos`,
    q`SELECT nombre, stock::float AS stock, stock_min::float AS stock_min, unidad FROM productos
      WHERE stock IS NOT NULL AND stock_min IS NOT NULL AND stock <= stock_min ORDER BY stock LIMIT 12`,
  ]);
  const ganancia = Math.round((margen[0].margen - resumen[0].descuento) * 100) / 100;
  const g = gastos[0].total;
  return {
    desde: d, hasta: h,
    resumen: { ...resumen[0], ganancia, gastos: g, neta: Math.round((ganancia - g) * 100) / 100, sin_costo: margen[0].sin_costo },
    serie, productos, categorias, metodos, gastos_cat: gcat,
    global: global[0], stock_bajo: bajo,
  };
}
