import { admin } from '@/lib/api';
import { listarPedidos, cancelarPedido } from '@/lib/ventas';

export const GET = admin(({ p }) => listarPedidos(p.get('estado')), 'pedidos.ver');
export const PATCH = admin(({ body }) => cancelarPedido(body.id), 'pedidos.cancelar');
