import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (datos, status = 200) =>
  NextResponse.json(datos, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });

async function autorizado(req) {
  return await isAdmin(req);
}

function origenValido(req) {
  return req.headers.get('origin') ===
    new URL(req.url).origin;
}

function endpointValido(endpoint) {
  if (
    typeof endpoint !== 'string' ||
    endpoint.length > 4096
  ) return false;

  try {
    const url = new URL(endpoint);

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port
    ) return false;

    const dominio = url.hostname.toLowerCase();

    return [
      'googleapis.com',
      'push.services.mozilla.com',
      'push.apple.com',
      'notify.windows.com'
    ].some((sufijo) =>
      dominio === sufijo ||
      dominio.endsWith('.' + sufijo)
    );
  } catch {
    return false;
  }
}

export async function GET(req) {
  if (!await autorizado(req)) {
    return json({ error: 'no_autorizado' }, 401);
  }

  const configurado = Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );

  return json({
    configurado,
    publicKey: configurado
      ? process.env.VAPID_PUBLIC_KEY
      : ''
  });
}

export async function POST(req) {
  if (!await autorizado(req)) {
    return json({ error: 'no_autorizado' }, 401);
  }

  if (!origenValido(req)) {
    return json({ error: 'origen_invalido' }, 403);
  }

  const b = await req.json().catch(() => ({}));
  const s = b.subscription || {};
  const endpoint = s.endpoint;
  const p256dh = s.keys?.p256dh;
  const auth = s.keys?.auth;

  if (
    !endpointValido(endpoint) ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string' ||
    !/^[A-Za-z0-9_-]{80,120}$/.test(p256dh) ||
    !/^[A-Za-z0-9_-]{16,64}$/.test(auth)
  ) {
    return json({ error: 'suscripcion_invalida' }, 400);
  }

  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return json({ error: 'push_no_configurado' }, 503);
  }

  try {
    await sql()`
      INSERT INTO admin_push_subscriptions
        (endpoint, p256dh, auth)
      VALUES (${endpoint}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint)
      DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        updated_at = now()
    `;

    return json({ ok: true });
  } catch (error) {
    console.error('push guardar', error?.code || '');
    return json({ error: 'error_servidor' }, 500);
  }
}

export async function DELETE(req) {
  if (!await autorizado(req)) {
    return json({ error: 'no_autorizado' }, 401);
  }

  if (!origenValido(req)) {
    return json({ error: 'origen_invalido' }, 403);
  }

  const b = await req.json().catch(() => ({}));

  if (!endpointValido(b.endpoint)) {
    return json({ error: 'endpoint_invalido' }, 400);
  }

  try {
    await sql()`
      DELETE FROM admin_push_subscriptions
      WHERE endpoint = ${b.endpoint}
    `;
    return json({ ok: true });
  } catch (error) {
    console.error('push eliminar', error?.code || '');
    return json({ error: 'error_servidor' }, 500);
  }
}
