import { getBanners } from '@/lib/banners';
import Ofertas from '@/components/Ofertas';
import JsonLd from '@/components/JsonLd';
import Marca from '@/components/Marca';
import { Scale, Snowflake, MapPin } from 'lucide-react';
import WhatsApp from '@/components/WhatsApp';
import Menu from '@/components/Menu';
import { sql } from '@/lib/db';
import { thumb } from '@/lib/cloudinary';
import { getNegocio, makeWa } from '@/lib/negocio';
import Reveal from '@/components/Reveal';
import Catalogo from '@/components/Catalogo';
import { Beneficios, Info } from './secciones';

export const revalidate = 60;

async function getProductos() {
  const rows = await sql()`
    SELECT p.id, p.nombre, p.precio_menor, p.precio_mayor, p.mayor_desde, p.unidad, p.imagen_url,
           c.nombre AS categoria, l.nombre AS linea, l.slug AS lslug
    FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    JOIN lineas l ON l.id = c.linea_id
    WHERE p.disponible
    ORDER BY l.orden, c.orden, p.orden, p.nombre`;
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    precio_menor: r.precio_menor,
    precio_mayor: r.precio_mayor,
    mayor_desde: r.mayor_desde,
    unidad: r.unidad || 'kg',
    categoria: r.categoria,
    linea: r.linea,
    lslug: r.lslug,
    img: r.imagen_url ? thumb(r.imagen_url, 600) : null,
  }));
}

export default async function Home() {
  const N = await getNegocio();
  const wa = makeWa(N.whatsapp);
  const banners = await getBanners();
  let productos = [];
  try { productos = await getProductos(); } catch (e) { console.error('catalogo', e?.message); }
  const pedido = wa('Hola, quiero hacer un pedido');
  const tel = N.whatsapp.replace(/^591/, '');
  const menu = [
    ['Catálogo', '#catalogo'],
    ['Cómo pedir', '#como-pedir'],
    ...(N.faq.length > 0 ? [['Preguntas frecuentes', '#preguntas']] : []),
    ...((N.direccion || N.horarios.length || N.mapa || N.ubicacion) ? [['Visítanos', '#visitanos']] : []),
  ];

  return (
    <>
      <div className="bg-vino-900 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-oro-300">Venta al por mayor y menor · Pedidos por WhatsApp</div>
      <header className="sticky top-0 z-30 border-b border-oro-400/30 bg-vino-950/95 text-white backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 px-4">
          <Menu items={menu} pedido={pedido} />
          <a href="#" className="flex min-w-0 items-center justify-center">
            <Marca N={N} horizontal />
          </a>
          <a href={pedido} aria-label="Escribir por WhatsApp" className="grid h-10 w-10 place-items-center rounded-full bg-green-500 shadow transition hover:bg-green-600">
            <WhatsApp size={20} />
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,theme(colors.vino.800),theme(colors.vino.950)_75%)] text-white">
        {N.hero && (
          <>
            <img src={N.hero.replace('/upload/', '/upload/f_auto,q_auto,w_1600/')} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-vino-950/80 via-vino-950/60 to-vino-950/90" />
          </>
        )}
        
        
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-14 text-center md:pt-24">
          <Reveal>
            {N.slogan && (
              <span className="inline-block rounded-full border border-oro-300/40 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-oro-300">{N.slogan}</span>
            )}
            <h1 className="mt-6 font-serif text-[2.4rem] font-extrabold leading-[1.1] tracking-tight [text-wrap:balance] md:text-6xl">{N.titulo}</h1>
            {N.subtitulo && <p className="mx-auto mt-5 max-w-xl text-lg text-vino-100">{N.subtitulo}</p>}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#catalogo" className="rounded-full bg-oro-400 px-8 py-3.5 font-bold text-vino-950 shadow-lift transition hover:bg-oro-300">Ver catálogo</a>
              {(N.direccion || N.mapa || N.ubicacion) && (
                <a href="#visitanos" className="flex items-center gap-2 text-sm font-semibold text-oro-200 underline-offset-4 hover:underline">
                  <MapPin size={20} /> Cómo llegar
                </a>
              )}
              <a href={pedido} className="flex items-center gap-2 rounded-full border border-oro-300/50 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10">
                <WhatsApp size={20} /> Pedir por WhatsApp
              </a>
            </div>
            <ul className="mx-auto mt-12 grid max-w-sm grid-cols-2 divide-x divide-oro-300/30 border-y border-oro-300/30 py-4 text-sm text-oro-200">
              <li className="flex items-center justify-center gap-2"><Scale size={16} /> Mayor y menor</li>
              <li className="flex items-center justify-center gap-2"><Snowflake size={16} /> Cadena de frío</li>
              
            </ul>
          </Reveal>
        </div>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute bottom-0 block w-full fill-crema" style={{ height: 16 }} aria-hidden="true">
          <path d="M0,48 C240,96 480,0 720,32 C960,64 1200,80 1440,24 L1440,80 L0,80 Z" />
        </svg>
      </section>

      <JsonLd n={N} />
      <Ofertas banners={banners} wa={N.whatsapp} />
      <Catalogo productos={productos} wa={N.whatsapp} qr={N.qr || ''} />
      <Beneficios n={N} />
      <Info n={N} wa={wa} />

      <footer className="border-t-2 border-oro-400/50 bg-vino-950 pb-24 pt-12 text-center text-vino-100">
        <Marca N={N} big horizontal />
        {N.slogan && <p className="mt-1 text-sm text-vino-200">{N.slogan}</p>}
        <a href={pedido} className="mt-5 inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-2.5 font-bold text-white">
          <WhatsApp size={20} /> {tel}
        </a>
        <p className="mt-8 text-xs text-vino-300">© {new Date().getFullYear()} {N.nombre}. Todos los derechos reservados.</p>
      </footer>
    </>
  );
}
