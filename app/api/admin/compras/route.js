import { admin } from '@/lib/api';
import { listarCompras, crearCompra, anularCompra } from '@/lib/compras';

export const GET = admin(({ p }) => listarCompras({ desde: p.get('desde'), hasta: p.get('hasta') }), 'compras.ver');
export const POST = admin(
  ({ body }) => (body?.accion === 'anular' ? anularCompra(body.id) : crearCompra(body)),
  ({ body }) => (body?.accion === 'anular' ? 'compras.anular' : 'compras.crear'),
);
