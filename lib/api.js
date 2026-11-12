import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { autorizar } from '@/lib/permisos';

const STATUS = {
  no_encontrada: 404,
  no_encontrado: 404,
  sin_deuda: 409,
  stock_insuficiente: 409,
  sin_control_stock: 409,
  pedido_no_pendiente: 409,
};

export function admin(fn, permiso = null) {
  return async (req) => {
    try {
      // Las rutas que todavia no declaran permisos
      // permanecen reservadas al propietario.
      if (permiso === null && !(await isAdmin(req))) {
        return NextResponse.json(
          { error: 'no_autorizado' },
          { status: 401 }
        );
      }

      const body = req.method === 'GET' ||
        req.method === 'DELETE'
          ? null
          : await req.json().catch(() => ({}));

      const p = new URL(req.url).searchParams;

      if (permiso !== null) {
        const requerido = typeof permiso === 'function'
          ? permiso({ req, body, p })
          : permiso;

        if (!requerido) {
          return NextResponse.json(
            { error: 'accion_invalida' },
            { status: 400 }
          );
        }

        const acceso = await autorizar(
          req,
          requerido
        );

        if (!acceso.ok) {
          return NextResponse.json(
            {
              error: acceso.status === 401
                ? 'no_autorizado'
                : 'sin_permiso'
            },
            { status: acceso.status }
          );
        }
      }

      const out = await fn({ body, p });
      if (out?.error) return NextResponse.json(out, { status: STATUS[out.error] || 400 });
      return NextResponse.json(out);
    } catch (e) {
      console.error('admin api', e?.code || '', e?.message || '');
      if (e?.code === '23505' &&
          (e?.constraint === 'ventas_pedido_id_unico' ||
           String(e?.message || '').includes('ventas_pedido_id_unico'))) {
        return NextResponse.json(
          { error: 'pedido_no_pendiente' },
          { status: 409 }
        );
      }
      if (e?.code === '23514' &&
          (e?.constraint === 'productos_stock_no_negativo' ||
           String(e?.message || '').includes('productos_stock_no_negativo'))) {
        return NextResponse.json(
          { error: 'stock_insuficiente' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: e?.code === '42P01' || e?.code === '42703' ? 'falta_tabla' : 'error_servidor' }, { status: 500 });
    }
  };
}
