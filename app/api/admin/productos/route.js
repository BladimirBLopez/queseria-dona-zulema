import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { autorizar } from '@/lib/permisos';
import { destroyImage } from '@/lib/cloudinary';
import { admiteDecimales } from '@/lib/unidades';

const denegar = (acceso) => NextResponse.json(
  {
    error: acceso.status === 401
      ? 'no_autorizado'
      : 'sin_permiso'
  },
  { status: acceso.status }
);
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

export async function GET(req) {
  const acceso = await autorizar(req, 'productos.ver');
  if (!acceso.ok) return denegar(acceso);
  const puedeVerCostos = (await autorizar(req, 'costos.ver')).ok;
  const q = sql();
  const [productos, categorias] = await Promise.all([
    q`SELECT p.*, c.nombre AS categoria, l.nombre AS linea
      FROM productos p JOIN categorias c ON c.id = p.categoria_id
      JOIN lineas l ON l.id = c.linea_id
      ORDER BY l.orden, c.orden, p.nombre`,
    q`SELECT c.id, c.nombre, l.nombre AS linea
      FROM categorias c JOIN lineas l ON l.id = c.linea_id ORDER BY l.orden, c.orden`,
  ]);
  const NUMS = ['precio_menor', 'precio_mayor', 'mayor_desde', 'costo', 'stock', 'stock_min'];
  const limpios = productos.map((p) => {
    const o = { ...p };

    // No revelar datos financieros sin permiso.
    if (!puedeVerCostos) {
      for (const campo of Object.keys(o)) {
        if (
          /(^|_)(costo|costos|margen|margenes|ganancia|ganancias|utilidad|utilidades)($|_)|^precio_compra$/i.test(campo)
        ) {
          delete o[campo];
        }
      }
    }

    for (const k of NUMS) {
      if (o[k] != null && o[k] !== '') {
        o[k] = Number(o[k]);
      }
    }

    return o;
  });
  return NextResponse.json(
    { productos: limpios, categorias },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req) {
  const acceso = await autorizar(req, 'productos.gestionar');
  if (!acceso.ok) return denegar(acceso);
  const puedeEditarCostos = (await autorizar(req, 'costos.editar')).ok;
  // Sin costos.editar se puede guardar el producto, pero el costo no se toca.
  const b = await req.json().catch(() => ({}));
  const nombre = String(b.nombre || '').trim().slice(0, 120);
  if (!nombre || !b.categoria_id) return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  const nums = [b.precio_menor, b.precio_mayor, b.mayor_desde, b.costo, b.stock_min].map(num);
  if (nums.some((x) => x !== null && x < 0)) return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  const q = sql();
  const unidad = String(b.unidad ?? '').trim().slice(0, 20);
  if (!unidad) return NextResponse.json({ error: 'unidad_vacia' }, { status: 400 });
  const cantidades = [b.mayor_desde, b.stock_min, ...(b.id ? [] : [b.stock])].map(num);
  if (!admiteDecimales(unidad) && cantidades.some((x) => x !== null && !Number.isInteger(x))) {
    return NextResponse.json({ error: 'cantidad_entera' }, { status: 400 });
  }
  const disp = b.disponible !== false;
  // codigo-v1
  const codigo = String(b.codigo ?? '').replace(/\s+/g, '').slice(0, 40) || null;
  if (codigo) {
    const dup = await q`SELECT nombre FROM productos WHERE codigo = ${codigo} AND id IS DISTINCT FROM ${b.id ? Number(b.id) : null}::int LIMIT 1`;
    if (dup.length) return NextResponse.json({ error: 'codigo_repetido', producto: dup[0].nombre }, { status: 409 });
  }
  if (b.id) {
    const old = await q`SELECT imagen_public_id FROM productos WHERE id = ${b.id}`;
    if (b.imagen_public_id && old[0]?.imagen_public_id && old[0].imagen_public_id !== b.imagen_public_id) {
      await destroyImage(old[0].imagen_public_id);
    }
    await q`UPDATE productos SET categoria_id=${b.categoria_id}, nombre=${nombre},
      precio_menor=${num(b.precio_menor)}, precio_mayor=${num(b.precio_mayor)}, mayor_desde=${num(b.mayor_desde)},
      unidad=${unidad}, disponible=${disp}, codigo=${codigo},
      costo=CASE WHEN ${puedeEditarCostos}::boolean THEN ${num(b.costo)}::numeric ELSE costo END, stock_min=${num(b.stock_min)},
      imagen_url=COALESCE(${b.imagen_url || null}, imagen_url),
      imagen_public_id=COALESCE(${b.imagen_public_id || null}, imagen_public_id)
      WHERE id=${b.id}`;
  } else {
    const stockInicial = num(b.stock);
    if (stockInicial !== null && (!Number.isFinite(stockInicial) || stockInicial < 0)) {
      return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
    }
    await q`
      WITH creado AS (
        INSERT INTO productos (
          categoria_id, nombre, precio_menor, precio_mayor, mayor_desde,
          unidad, disponible, costo, stock, stock_min, codigo,
          imagen_url, imagen_public_id
        )
        VALUES (
          ${b.categoria_id}, ${nombre},
          ${num(b.precio_menor)}, ${num(b.precio_mayor)}, ${num(b.mayor_desde)},
          ${unidad}, ${disp},
          ${puedeEditarCostos ? num(b.costo) : null}, ${stockInicial}, ${num(b.stock_min)}, ${codigo},
          ${b.imagen_url || null}, ${b.imagen_public_id || null}
        )
        RETURNING id, stock
      ),
      movimiento AS (
        INSERT INTO stock_mov (producto_id, cantidad, motivo)
        SELECT creado.id::text, creado.stock, 'ingreso'
        FROM creado
        WHERE creado.stock > 0
        RETURNING id
      )
      SELECT creado.id,
        (SELECT COUNT(*) FROM movimiento) AS movimientos
      FROM creado`;

  }
  revalidatePath('/'); return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const acceso = await autorizar(req, 'productos.eliminar');
  if (!acceso.ok) return denegar(acceso);
  const id = new URL(req.url).searchParams.get('id');
  const q = sql();
  const r = await q`DELETE FROM productos WHERE id=${id} RETURNING imagen_public_id`;
  if (r[0]?.imagen_public_id) await destroyImage(r[0].imagen_public_id);
  revalidatePath('/'); return NextResponse.json({ ok: true });
}

export async function PUT(req) {
  const acceso = await autorizar(req, 'productos.gestionar');
  if (!acceso.ok) return denegar(acceso);
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  await sql()`UPDATE productos SET disponible = ${b.disponible === true} WHERE id = ${b.id}`;
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
