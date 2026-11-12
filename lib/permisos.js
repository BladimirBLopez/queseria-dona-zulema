import { sql } from '@/lib/db';
import { obtenerUsuarioSesion } from '@/lib/usuarios';

export const ROLES = [
  'propietario',
  'administrador',
  'cajero',
  'inventario',
  'contabilidad'
];

const A = ['administrador'];
const C = ['administrador', 'cajero'];
const I = ['administrador', 'inventario'];
const F = ['administrador', 'contabilidad'];

export const CATALOGO_PERMISOS = [
  { id: 'inicio.ver', grupo: 'Inicio', nombre: 'Ver indicadores financieros', roles: F },

  { id: 'ventas.ver', grupo: 'Ventas', nombre: 'Consultar ventas', roles: [...C, 'contabilidad'] },
  { id: 'ventas.crear', grupo: 'Ventas', nombre: 'Registrar ventas', roles: C },
  { id: 'ventas.anular', grupo: 'Ventas', nombre: 'Anular ventas', roles: A },
  { id: 'ventas.abonar', grupo: 'Ventas', nombre: 'Registrar abonos', roles: C },

  { id: 'pedidos.ver', grupo: 'Pedidos', nombre: 'Consultar pedidos', roles: C },
  { id: 'pedidos.cancelar', grupo: 'Pedidos', nombre: 'Cancelar pedidos', roles: C },

  { id: 'productos.ver', grupo: 'Inventario', nombre: 'Consultar productos', roles: [...I, 'cajero', 'contabilidad'] },
  { id: 'productos.gestionar', grupo: 'Inventario', nombre: 'Crear y editar productos y precios', roles: A },
  { id: 'productos.eliminar', grupo: 'Inventario', nombre: 'Eliminar productos', roles: A },
  { id: 'categorias.ver', grupo: 'Inventario', nombre: 'Consultar categorías', roles: I },
  { id: 'categorias.gestionar', grupo: 'Inventario', nombre: 'Administrar categorías', roles: I },
  { id: 'stock.mover', grupo: 'Inventario', nombre: 'Registrar movimientos de stock', roles: I },

  { id: 'costos.ver', grupo: 'Contabilidad', nombre: 'Consultar costos', roles: F },
  { id: 'costos.editar', grupo: 'Contabilidad', nombre: 'Modificar costos', roles: F },
  { id: 'compras.ver', grupo: 'Contabilidad', nombre: 'Consultar compras y proveedores', roles: F },
  { id: 'compras.crear', grupo: 'Contabilidad', nombre: 'Registrar compras y proveedores', roles: F },
  { id: 'compras.anular', grupo: 'Contabilidad', nombre: 'Anular compras', roles: A },
  { id: 'gastos.ver', grupo: 'Contabilidad', nombre: 'Consultar gastos', roles: F },
  { id: 'gastos.crear', grupo: 'Contabilidad', nombre: 'Registrar gastos', roles: F },
  { id: 'gastos.eliminar', grupo: 'Contabilidad', nombre: 'Eliminar gastos', roles: A },
  { id: 'reportes.ver', grupo: 'Contabilidad', nombre: 'Consultar reportes', roles: F },
  { id: 'cierre.ver', grupo: 'Contabilidad', nombre: 'Consultar cierre de caja', roles: F },
  { id: 'cierre.guardar', grupo: 'Contabilidad', nombre: 'Cerrar la caja', roles: F },

  { id: 'banners.ver', grupo: 'Tienda online', nombre: 'Consultar ofertas', roles: A },
  { id: 'banners.gestionar', grupo: 'Tienda online', nombre: 'Administrar ofertas', roles: A },
  { id: 'negocio.ver', grupo: 'Configuración', nombre: 'Consultar datos del negocio', roles: A },
  { id: 'negocio.editar', grupo: 'Configuración', nombre: 'Modificar datos del negocio', roles: [] },

  { id: 'notificaciones.ver', grupo: 'Notificaciones', nombre: 'Recibir avisos de pedidos', roles: C }
];

const IDS = new Set(
  CATALOGO_PERMISOS.map(p => p.id)
);

export function permisoExiste(id) {
  return IDS.has(id);
}

export function permisosPredeterminados(rol) {
  if (rol === 'propietario') {
    return CATALOGO_PERMISOS.map(p => p.id);
  }

  if (!ROLES.includes(rol)) return [];

  return CATALOGO_PERMISOS
    .filter(p => p.roles.includes(rol))
    .map(p => p.id);
}

export async function permisosEfectivos(usuario) {
  if (!usuario) return [];

  if (usuario.rol === 'propietario') {
    return permisosPredeterminados('propietario');
  }

  const permisos = new Set(
    permisosPredeterminados(usuario.rol)
  );

  const cambios = await sql()`
    SELECT permiso, permitido
    FROM dz_permisos_usuario
    WHERE usuario_id = ${String(usuario.id)}::bigint
  `;

  for (const cambio of cambios) {
    if (!permisoExiste(cambio.permiso)) continue;

    if (cambio.permitido) {
      permisos.add(cambio.permiso);
    } else {
      permisos.delete(cambio.permiso);
    }
  }

  return [...permisos];
}

export async function autorizar(req, permiso) {
  if (!permisoExiste(permiso)) {
    return { ok: false, status: 403 };
  }

  const usuario = await obtenerUsuarioSesion(req);

  if (!usuario) {
    return { ok: false, status: 401 };
  }

  if (usuario.rol === 'propietario') {
    return { ok: true, usuario };
  }

  const permisos = await permisosEfectivos(usuario);

  return {
    ok: permisos.includes(permiso),
    status: permisos.includes(permiso) ? 200 : 403,
    usuario
  };
}
