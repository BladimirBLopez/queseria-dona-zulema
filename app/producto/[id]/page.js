import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { sql } from '@/lib/db';
import { thumb } from '@/lib/cloudinary';
import { getNegocio, makeWa } from '@/lib/negocio';
import WhatsApp from '@/components/WhatsApp';

export const revalidate = 60;

const bs = (v) => (v == null || v === '' ? null : 'Bs ' + Number(v).toFixed(2));

async function getProducto(id) {
  try {
    const rows = await sql()`
      SELECT p.id, p.nombre, p.precio_menor, p.precio_mayor, p.unidad, p.imagen_url,
             c.nombre AS categoria, c.id AS cid
      FROM productos p JOIN categorias c ON c.id = p.categoria_id
      WHERE p.id = ${id} AND p.disponible`;
    return rows[0] || null;
  } catch (e) { return null; }
}

async function getRelacionados(p) {
  try {
    return await sql()`
      SELECT id, nombre, imagen_url FROM productos
      WHERE categoria_id = ${p.cid} AND id <> ${p.id} AND disponible
      ORDER BY orden, nombre LIMIT 4`;
  } catch (e) { return []; }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await getProducto(id);
  const N = await getNegocio();
  if (!p) return { title: N.nombre };
  return { title: `${p.nombre} | ${N.nombre}`, description: `${p.nombre} al por mayor y menor. Pedidos por WhatsApp.` };
}

export default async function Producto({ params }) {
  const { id } = await params;
  const p = await getProducto(id);
  if (!p) notFound();
  const N = await getNegocio();
  const wa = makeWa(N.whatsapp);
  const rel = await getRelacionados(p);
  const u = p.unidad || 'kg';
  const menor = bs(p.precio_menor);
  const mayor = bs(p.precio_mayor);

  return (
    <main className="min-h-screen bg-crema">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link href="/#catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-vino-800">
          <ArrowLeft size={18} /> Volver al catálogo
        </Link>
        <div className="mt-5 grid gap-6 overflow-hidden rounded-3xl bg-white p-4 shadow-card md:grid-cols-2 md:p-6">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-oro-200/60 to-vino-100">
            {p.imagen_url && <img src={thumb(p.imagen_url, 900)} alt={p.nombre} className="h-full w-full object-cover" />}
          </div>
          <div className="flex flex-col">
            <span className="w-fit rounded-full bg-vino-50 px-3 py-1 text-xs font-semibold text-vino-800">{p.categoria}</span>
            <h1 className="mt-3 font-serif text-3xl font-extrabold text-vino-800">{p.nombre}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {menor && <span className="rounded-lg bg-vino-50 px-3 py-1.5 text-vino-800">Menor <b>{menor}</b>/{u}</span>}
              {mayor && <span className="rounded-lg bg-oro-200/50 px-3 py-1.5 text-amber-900">Mayor <b>{mayor}</b>/{u}</span>}
              {!menor && !mayor && <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-stone-500">Consultar precio</span>}
            </div>
            <p className="mt-4 text-sm text-stone-600">El precio final se confirma al momento del pedido.</p>
            <a href={wa(`Hola, quiero pedir: ${p.nombre}`)} className="mt-auto flex items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 font-bold text-white shadow transition hover:bg-green-600">
              <WhatsApp size={20} /> Pedir por WhatsApp
            </a>
          </div>
        </div>
        {rel.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-serif text-xl font-extrabold text-vino-800">También te puede gustar</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {rel.map((r) => (
                <Link key={r.id} href={`/producto/${r.id}`} className="overflow-hidden rounded-2xl bg-white shadow-card">
                  <div className="aspect-[4/3] bg-vino-100">
                    {r.imagen_url && <img src={thumb(r.imagen_url, 400)} alt={r.nombre} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <p className="p-3 text-sm font-semibold text-stone-900">{r.nombre}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
