import { sql } from './db.js';

// Limita por clave y ventana (segundos). Si Neon falla, no bloquea la venta.
export async function limited(key, max = 10, windowSec = 60) {
  try {
    const q = sql();
    const nowSec = Math.floor(Date.now() / 1000);
    const w = nowSec - (nowSec % windowSec);
    const rows = await q`INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key}, ${w}, 1)
      ON CONFLICT (key, window_start)
      DO UPDATE SET count = rate_limits.count + 1
      RETURNING count`;
    if (Math.random() < 0.02) {
      await q`DELETE FROM rate_limits WHERE window_start < ${nowSec - 3600}`;
    }
    return Number(rows[0].count) > max;
  } catch (e) {
    console.error('ratelimit error', e?.code || '', e?.message || '');
    return false;
  }
}
