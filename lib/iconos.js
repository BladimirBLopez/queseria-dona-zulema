import { ImageResponse } from 'next/og';

export function iconoPng(lado, relleno = 0.7) {
  const d = Math.round(lado * relleno);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#5e0d0d'
        }}
      >
        <div style={{ display: 'flex', fontSize: Math.round(d * 0.6), fontWeight: 800, color: '#fbbf24' }}>DZ</div>
      </div>
    ),
    { width: lado, height: lado }
  );
}
