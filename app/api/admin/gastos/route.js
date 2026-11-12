import { admin } from '@/lib/api';
import { listarGastos, crearGasto, borrarGasto } from '@/lib/ventas';

export const GET = admin(({ p }) => listarGastos({ desde: p.get('desde'), hasta: p.get('hasta') }), 'gastos.ver');
export const POST = admin(({ body }) => crearGasto(body), 'gastos.crear');
export const DELETE = admin(({ p }) => borrarGasto(p.get('id')), 'gastos.eliminar');
