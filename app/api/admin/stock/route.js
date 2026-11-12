import { admin } from '@/lib/api';
import { moverStock } from '@/lib/ventas';

export const POST = admin(({ body }) => moverStock(body), 'stock.mover');
