import webpush from 'web-push';
import { sql } from '@/lib/db';

export async function enviarNuevoPedido(id) {
  const {
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    VAPID_SUBJECT
  } = process.env;

  if (
    !VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY ||
    !VAPID_SUBJECT
  ) return;

  const q = sql();

  const dispositivos = await q`
    SELECT endpoint, p256dh, auth
    FROM admin_push_subscriptions
    ORDER BY updated_at DESC
    LIMIT 50
  `;

  if (!dispositivos.length) return;

  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const mensaje = JSON.stringify({
    pedidoId: Number(id)
  });

  await Promise.allSettled(
    dispositivos.map(async (dispositivo) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: dispositivo.endpoint,
            keys: {
              p256dh: dispositivo.p256dh,
              auth: dispositivo.auth
            }
          },
          mensaje,
          {
            TTL: 3600,
            urgency: 'high'
          }
        );
      } catch (error) {
        const codigo = Number(error.statusCode);

        if (codigo === 404 || codigo === 410) {
          await q`
            DELETE FROM admin_push_subscriptions
            WHERE endpoint = ${dispositivo.endpoint}
          `;
        } else {
          console.warn(
            'Push no entregado:',
            codigo || 'error'
          );
        }
      }
    })
  );
}
