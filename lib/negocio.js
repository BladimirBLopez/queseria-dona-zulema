import { sql } from '@/lib/db';

export const DEFAULTS = {
  nombre: 'Quesería y Fiambrería Doña Zulema',
  slogan: 'Quesería · Fiambrería',
  titulo: 'Frescura y sabor, al por mayor y menor',
  subtitulo: 'Quesos, fiambres Sofía, fiambres argentinos y lácteos PIL. Haz tu pedido directo por WhatsApp.',
  whatsapp: '59175284955',
  direccion: '',
  horarios: [],
  mapa: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  marcas: ['Sofía', 'PIL', 'Fiambres argentinos'],
  mayor_titulo: '¿Tienes restaurante, tienda o evento?',
  mayor_texto: 'Pide tu cotización por mayor con precios especiales.',
  faq: [
    ['¿Venden al por mayor?', 'Sí. Tenemos precios especiales por mayor. Escríbenos por WhatsApp para cotizar.'],
    ['¿Cómo hago un pedido?', 'Toca “Pedir” en el producto o el botón de WhatsApp. Te responderemos para confirmar cantidades y precio.'],
    ['¿Los precios son fijos?', 'Pueden variar según el día y la cantidad. Confirmamos el precio final al momento del pedido.'],
  ],
};

export const makeWa = (num) => (t) =>
  `https://wa.me/${num}?text=${encodeURIComponent(t)}`;

export async function getNegocio() {
  try {
    const rows = await sql()`SELECT value FROM app_settings WHERE key = 'negocio'`;
    if (rows[0]) return { ...DEFAULTS, ...JSON.parse(rows[0].value) };
  } catch (e) {
    console.error('negocio', e?.message);
  }
  return DEFAULTS;
}

const s = (v, max) => String(v ?? '').trim().slice(0, max);
const url = (v) => { const u = s(v, 300); return /^https:\/\//.test(u) ? u : ''; };

function mapaSrc(v) {
  const raw = String(v ?? '');
  const m = raw.match(/src="([^"]+)"/);
  const u = (m ? m[1] : raw).trim();
  return u.startsWith('https://www.google.com/maps/embed') ? u.slice(0, 1000) : '';
}

export function limpiar(b = {}) {
  const wa = String(b.whatsapp ?? '').replace(/\D/g, '').slice(0, 15);
  return {
    nombre: s(b.nombre, 60) || DEFAULTS.nombre,
    slogan: s(b.slogan, 100),
    titulo: s(b.titulo, 120) || DEFAULTS.titulo,
    subtitulo: s(b.subtitulo, 300),
    whatsapp: wa || DEFAULTS.whatsapp,
    direccion: s(b.direccion, 200),
    horarios: (Array.isArray(b.horarios) ? b.horarios : []).slice(0, 14)
      .map((h) => [s(h?.[0], 40), s(h?.[1], 40)]).filter((h) => h[0] && h[1]),
    mapa: mapaSrc(b.mapa),
    facebook: url(b.facebook),
    instagram: url(b.instagram),
    tiktok: url(b.tiktok),
    marcas: (Array.isArray(b.marcas) ? b.marcas : []).slice(0, 12).map((m) => s(m, 40)).filter(Boolean),
    mayor_titulo: s(b.mayor_titulo, 120),
    mayor_texto: s(b.mayor_texto, 200),
    faq: (Array.isArray(b.faq) ? b.faq : []).slice(0, 20)
      .map((f) => [s(f?.[0], 150), s(f?.[1], 600)]).filter((f) => f[0] && f[1]),
  };
}

export function limpiarConLogo(b = {}) {
  const logo = String(b.logo || '');
  const cld = (v) => (String(v ?? '').startsWith('https://res.cloudinary.com/') ? String(v).slice(0, 500) : '');
  return { ...limpiar(b), logo: cld(logo), hero: cld(b.hero) };
}
