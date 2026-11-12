import { admin } from '@/lib/api';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = admin(async () => {
  const q = sql();

  const [conteo, pedidos] = await Promise.all([
    q`
      SELECT count(*)::int AS total
      FROM pedidos
      WHERE estado = 'pendiente'
    `,
    q`
      SELECT id, creado, cliente_nombre,
             total::float AS total
      FROM pedidos
      WHERE estado = 'pendiente'
      ORDER BY creado DESC, id DESC
      LIMIT 10
    `
  ]);

  return {
    total: conteo[0]?.total ?? 0,
    pedidos
  };
}, 'notificaciones.ver');
