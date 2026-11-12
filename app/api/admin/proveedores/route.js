import { admin } from '@/lib/api';
import { listarProveedores, guardarProveedor } from '@/lib/compras';

export const GET = admin(() => listarProveedores(), 'compras.ver');
export const POST = admin(({ body }) => guardarProveedor(body), 'compras.crear');
