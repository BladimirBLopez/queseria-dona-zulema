import { NextResponse } from 'next/server';

export function GET() {
  const manifest = {
    id: '/admin',
    name: 'Doña Zulema · Panel',
    short_name: 'Doña Zulema',
    description: 'Panel de administración de Doña Zulema',
    lang: 'es',
    start_url: '/admin/inicio',
    scope: '/admin',
    display: 'standalone',
    background_color: '#5e0d0d',
    theme_color: '#7a1414',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return NextResponse.json(manifest, { headers: { 'Content-Type': 'application/manifest+json' } });
}
