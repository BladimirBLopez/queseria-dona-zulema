import { ImageResponse } from 'next/og';

export const alt = 'Quesería y Fiambrería Doña Zulema';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#3b0909,#7a1414)', color: '#fff' }}>
        <div style={{ display: 'flex', fontSize: 34, color: '#fbbf24', letterSpacing: 8 }}>QUESERÍA · FIAMBRERÍA</div>
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, marginTop: 20 }}>Doña Zulema</div>
        <div style={{ display: 'flex', fontSize: 40, marginTop: 20, color: '#fcd34d' }}>Al por mayor y menor · Pedidos por WhatsApp</div>
      </div>
    ),
    size
  );
}
