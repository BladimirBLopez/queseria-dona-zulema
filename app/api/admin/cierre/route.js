import { admin } from '@/lib/api';
import { estadoCaja, guardarCierre } from '@/lib/cierre';

export const GET = admin(() => estadoCaja(), 'cierre.ver');
export const POST = admin(({ body }) => guardarCierre(body), 'cierre.guardar');
