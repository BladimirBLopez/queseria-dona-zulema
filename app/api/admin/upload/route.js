import { NextResponse } from 'next/server';
import { autorizar } from '@/lib/permisos';
import { cldConfig, signParams } from '@/lib/cloudinary';

export async function POST(req) {
  const acceso = await autorizar(
    req,
    'productos.gestionar'
  );

  if (!acceso.ok) {
    return NextResponse.json(
      {
        error: acceso.status === 401
          ? 'no_autorizado'
          : 'sin_permiso'
      },
      { status: acceso.status }
    );
  }
  const c = cldConfig();
  if (!c) return NextResponse.json({ error: 'cloudinary_no_configurado' }, { status: 500 });
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'dona-zulema/productos';
  const signature = signParams({ folder, timestamp }, c.apiSecret);
  return NextResponse.json({ cloudName: c.cloudName, apiKey: c.apiKey, timestamp, folder, signature });
}
