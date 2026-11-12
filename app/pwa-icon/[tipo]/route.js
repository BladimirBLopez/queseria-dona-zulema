import { iconoPng } from '@/lib/iconos';

export async function GET(_req, { params }) {
  const { tipo } = await params;
  if (tipo === '192') return iconoPng(192, 0.7);
  if (tipo === '512') return iconoPng(512, 0.7);
  if (tipo === 'maskable') return iconoPng(512, 0.56);
  return new Response('No encontrado', { status: 404 });
}
