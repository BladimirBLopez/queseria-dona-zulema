'use client';
import { pasoDe } from '@/lib/unidades';
import { obtenerPrecioPedido, redondearDinero } from '@/lib/precio-pedido';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Minus, X, ShoppingBag, Milk, Drumstick, Trash2, PackageOpen, SlidersHorizontal, ArrowDownUp, Check } from 'lucide-react';
import Link from 'next/link';
import WhatsApp from '@/components/WhatsApp';

const bs = (v) => (v == null || v === '' ? null : 'Bs ' + Number(v).toFixed(2));
const normalizar = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stepOf = pasoDe;
const Icono = ({ lslug, className }) => (lslug === 'pollo' ? <Drumstick className={className} /> : <Milk className={className} />);

const unidadDe = (u) => { const x = String(u || 'unidad').trim().toLowerCase(); return x === 'kg' ? 'kilo' : x.startsWith('unidad') ? 'unidad' : x; };
const cantidadDe = (n, u) => {
  const v = String(Math.round(Number(n) * 1000) / 1000);
  const x = unidadDe(u);
  if (x === 'kilo') return v + ' kg';
  if (x === 'unidad') return v + (Number(n) === 1 ? ' unidad' : ' unidades');
  return v + ' ' + x + (Number(n) === 1 || /s$/.test(x) ? '' : 's');
};
const porUnidad = (u) => { const x = unidadDe(u); return x === 'unidad' ? 'c/u' : 'por ' + x; };

function Card({ p, qty, onAdd }) {
  const st = stepOf(p.unidad);
  const menor = bs(p.precio_menor);
  const mayor = bs(p.precio_mayor);
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-oro-400/30 transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-oro-200/60 to-vino-100 sm:aspect-[4/3]">
        {p.img ? (
          <img src={p.img} alt={p.nombre} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-vino-300"><Icono lslug={p.lslug} className="h-14 w-14" /></div>
        )}
        <span className="absolute left-2 top-2 sm:left-3 sm:top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-vino-800 backdrop-blur">{p.categoria}</span>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h4 className="text-sm font-semibold leading-snug text-stone-900 sm:text-base"><Link href={`/producto/${p.id}`} className="after:absolute after:inset-0 hover:text-vino-700">{p.nombre}</Link></h4>
        <div className="mt-3">
          {menor ? (
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-serif text-xl font-extrabold text-vino-800 sm:text-2xl">{menor}</span>
              <span className="text-xs text-stone-500">{'por ' + unidadDe(p.unidad)}</span>
            </p>
          ) : (
            <span className="rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-500">Consultar precio</span>
          )}
          {mayor && (
            <p className="mt-2 rounded-lg bg-oro-200/50 px-2.5 py-1.5 text-xs leading-snug text-amber-900">
              {p.mayor_desde != null && Number(p.mayor_desde) > 0 ? 'Desde ' + cantidadDe(p.mayor_desde, p.unidad) + ': ' : 'Por mayor: '}
              <b>{mayor}</b> {porUnidad(p.unidad)}
            </p>
          )}
        </div>
        <div className="relative z-10 mt-auto pt-4">
          {qty ? (
            <div className="flex items-center justify-between rounded-full bg-vino-800 p-1 text-white">
              <button onClick={() => onAdd(p, -st)} aria-label="Quitar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><Minus size={16} /></button>
              <span className="text-sm font-bold">{qty} {p.unidad}</span>
              <button onClick={() => onAdd(p, st)} aria-label="Agregar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><Plus size={16} /></button>
            </div>
          ) : (
            <button onClick={() => onAdd(p, st)} className="flex w-full items-center justify-center gap-2 rounded-full bg-vino-800 py-2.5 text-sm font-bold text-white transition hover:bg-vino-700 active:scale-95">
              <Plus size={16} /> <span className="sm:hidden">Agregar</span><span className="hidden sm:inline">Agregar al pedido</span>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function Catalogo({ productos, wa, qr = '' }) {
  const [q, setQ] = useState('');
  const [linea, setLinea] = useState('all');
  const [cat, setCat] = useState('all');
  const [precioMax, setPrecioMax] = useState('todos');
  const [orden, setOrden] = useState('catalogo');
  const [pagoQr, setPagoQr] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [cart, setCart] = useState({});
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState('menor');
  const [nota, setNota] = useState('');
  const ultimo = useRef({ k: '', t: 0 });
  useEffect(() => {
    if (!filtrosAbiertos) return;
    const cerrar = (e) => {
      if (e.key === 'Escape') setFiltrosAbiertos(false);
    };
    document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [filtrosAbiertos]);

  const lineas = useMemo(() => {
    const m = new Map();
    productos.forEach((p) => m.set(p.lslug, p.linea));
    return [...m];
  }, [productos]);

  const cats = useMemo(() => {
    const s = new Set();
    productos.filter((p) => linea === 'all' || p.lslug === linea).forEach((p) => s.add(p.categoria));
    return [...s];
  }, [productos, linea]);

  const maximoPrecio = useMemo(() => productos.reduce((max, p) => {
    const v = p.precio_menor == null || p.precio_menor === '' ? NaN : Number(p.precio_menor);
    return Number.isFinite(v) && v > max ? v : max;
  }, 0), [productos]);

  const limitePrecio = Math.max(1, Math.ceil(maximoPrecio / 10) * 10);

  const filtrados = useMemo(() => {
    const texto = normalizar(q.trim());

    const lista = productos.filter((p) => {
      if (linea !== 'all' && p.lslug !== linea) return false;
      if (cat !== 'all' && p.categoria !== cat) return false;
      if (texto && !normalizar(`${p.nombre} ${p.categoria} ${p.linea}`).includes(texto)) return false;

      if (precioMax !== 'todos') {
        const v = p.precio_menor == null || p.precio_menor === '' ? NaN : Number(p.precio_menor);
        if (!Number.isFinite(v) || v > Number(precioMax)) return false;
      }

      return true;
    });

    if (orden === 'nombre') {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }

    if (orden === 'precio-asc' || orden === 'precio-desc') {
      const precio = (p) => p.precio_menor == null || p.precio_menor === '' ? NaN : Number(p.precio_menor);

      lista.sort((a, b) => {
        const va = precio(a);
        const vb = precio(b);

        if (!Number.isFinite(va)) return Number.isFinite(vb) ? 1 : 0;
        if (!Number.isFinite(vb)) return -1;

        return orden === 'precio-asc' ? va - vb : vb - va;
      });
    }

    return lista;
  }, [productos, q, linea, cat, precioMax, orden]);

  const grupos = useMemo(() => {
    const out = [];

    for (const p of filtrados) {
      let l = out.find((x) => x.linea === p.linea);
      if (!l) out.push((l = { linea: p.linea, cats: [] }));

      let c = l.cats.find((x) => x.nombre === p.categoria);
      if (!c) l.cats.push((c = { nombre: p.categoria, items: [] }));

      c.items.push(p);
    }

    return out;
  }, [filtrados]);

  const cantidadFiltros =
    Number(linea !== 'all') +
    Number(cat !== 'all') +
    Number(precioMax !== 'todos');

  const limpiar = () => {
    setQ('');
    setLinea('all');
    setCat('all');
    setPrecioMax('todos');
    setOrden('catalogo');
  };

  const pickLinea = (v) => {
    setLinea(v);
    setCat('all');
  };

  const add = (p, d) =>
    setCart((c) => {
      const n = { ...c };
      const qty = (c[p.id]?.qty || 0) + d;
      if (qty <= 0) delete n[p.id];
      else n[p.id] = { p, qty };
      return n;
    });

  const items = Object.values(cart);
  const count = items.length;

  const detalle = items.map(({ p, qty }) => {
    const info = obtenerPrecioPedido(p, qty, tipo);
    const subtotal = info.precio === null
      ? null
      : redondearDinero(info.precio * qty);
    return { p, qty, ...info, subtotal };
  });

  const sinPrecio = detalle.some((i) => i.precio === null);
  const conPrecio = detalle.some((i) => i.precio !== null);
  const total = redondearDinero(
    detalle.reduce((s, i) => s + (i.subtotal ?? 0), 0)
  );
  const totalTexto = conPrecio ? bs(total) : 'Por confirmar';

  const msg = [
    '🛒 *PEDIDO – DOÑA ZULEMA*',
    '',
    'Hola, quisiera realizar el siguiente pedido:',
    '',
    ...detalle.flatMap(({ p, qty, precio, subtotal }, index) => [
      `${index + 1}. *${p.nombre}*`,
      precio === null
        ? `${cantidadDe(qty, p.unidad)} — Precio a consultar`
        : `${cantidadDe(qty, p.unidad)} × ${bs(precio)} = ${bs(subtotal)}`,
      '',
    ]),
    `💰 *TOTAL: ${totalTexto}${sinPrecio && conPrecio ? ' (parcial)' : ''}*`,
    ...(sinPrecio ? [
      '',
      'Hay productos con precio a consultar.',
    ] : []),
    ...(nota.trim() ? [
      '',
      `Nota: ${nota.trim()}`,
    ] : []),
    '',
    ...(qr && pagoQr ? ['Voy a pagar por QR. Les envío el comprobante por aquí.', ''] : []),
    '¿Me confirman la disponibilidad? Gracias.',
  ].join('\n');
  const link = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;

  function guardarPedido() {
    try {
      const lista = items.map(({ p, qty }) => ({ id: p.id, qty }));
      const k = JSON.stringify({ lista, tipo });
      const ahora = Date.now();
      if (ultimo.current.k === k && ahora - ultimo.current.t < 120000) return;
      ultimo.current = { k, t: ahora };
      fetch('/api/pedido', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lista, tipo }),
      }).catch(() => {});
    } catch {}
  }

  const tab = (act) => `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${act ? 'bg-vino-800 text-white shadow' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-vino-50'}`;
  const chip = (act) => `whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${act ? 'bg-oro-400 text-vino-950' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;

  return (
    <section id="catalogo" className="scroll-mt-16 bg-crema pb-10 pt-6">
      <div className="mx-auto max-w-6xl px-4 pt-4 text-center">
        <h2 className="font-serif text-3xl font-extrabold text-vino-900 md:text-4xl">Nuestro catálogo</h2>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-oro-400" />
        <p className="mt-3 text-sm text-stone-600">Elige tus productos y arma tu pedido</p>
      </div>
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-3">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar queso, jamón, yogur..."
              className="w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-4 text-sm shadow-card outline-none ring-1 ring-stone-200 focus:ring-2 focus:ring-oro-400"
            />
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <button onClick={() => pickLinea('all')} className={tab(linea === 'all')}>Todo</button>
            {lineas.map(([s, n]) => (
              <button key={s} onClick={() => pickLinea(s)} className={tab(linea === s)}>{n}</button>
            ))}
          </div>
          {cats.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <button onClick={() => setCat('all')} className={chip(cat === 'all')}>Todas</button>
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>
              ))}
            </div>
          )}
      </div>

      <div className="sticky top-16 z-20 border-b border-vino-900/5 bg-crema/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFiltrosAbiertos(true)} className="flex min-h-11 items-center gap-2 rounded-xl border border-vino-900/10 bg-white px-4 py-2 text-sm font-semibold text-vino-900 shadow-sm hover:bg-vino-50">
              <SlidersHorizontal size={17} />
              Filtros
              {cantidadFiltros > 0 && (
                <span className="rounded-full bg-vino-800 px-2 py-0.5 text-xs text-white">{cantidadFiltros}</span>
              )}
            </button>

            <label className="relative flex items-center">
              <ArrowDownUp size={16} className="pointer-events-none absolute left-3 text-vino-800" />
              <select
                aria-label="Ordenar productos"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="min-h-11 max-w-[205px] rounded-xl border border-vino-900/10 bg-white py-2 pl-9 pr-2 text-sm font-semibold text-stone-800 shadow-sm"
              >
                <option value="catalogo">Orden del catálogo</option>
                <option value="nombre">Nombre A–Z</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
              </select>
            </label>
          </div>

        </div>

        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-4">
          <span aria-live="polite" className="text-sm text-stone-500">
            {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
          </span>
        </div>
        {(q.trim() || cantidadFiltros > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-stone-600">Filtros activos</span>
            <button type="button" onClick={limpiar} className="font-semibold text-vino-800 underline underline-offset-2">
              Limpiar todo
            </button>
          </div>
        )}

        {productos.length === 0 && (
          <p className="py-16 text-center text-stone-500">Pronto tendremos el catálogo aquí. Mientras tanto, escríbenos por WhatsApp.</p>
        )}
        {productos.length > 0 && filtrados.length === 0 && (
          <div className="py-16 text-center text-stone-500">
            <PackageOpen className="mx-auto mb-3 h-10 w-10 text-vino-300" />
            No encontramos productos con esa búsqueda.
          </div>
        )}
        {orden === 'catalogo' ? grupos.map((l) => (
          <div key={l.linea} className="mb-12">
            <h2 className="mb-5 font-serif text-3xl font-extrabold text-vino-800">{l.linea}</h2>
            {l.cats.map((c) => (
              <div key={l.linea + c.nombre} className="mb-9">
                <h3 className="mb-4 flex items-center gap-3 text-lg font-bold text-stone-800">
                  <span className="h-6 w-1.5 rounded bg-oro-400" /> {c.nombre}
                  <span className="text-sm font-normal text-stone-400">{c.items.length}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {c.items.map((p) => (
                    <Card key={p.id} p={p} qty={cart[p.id]?.qty} onAdd={add} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtrados.map((p) => (
              <Card key={p.id} p={p} qty={cart[p.id]?.qty} onAdd={add} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {filtrosAbiertos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFiltrosAbiertos(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filtros del catálogo"
              initial={{ y: 70 }}
              animate={{ y: 0 }}
              exit={{ y: 70 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            >
              <div className="flex items-center justify-between border-b border-stone-100 p-5">
                <div>
                  <h3 className="font-serif text-xl font-extrabold text-vino-900">Filtrar productos</h3>
                  <p className="text-xs text-stone-500">Encuentra exactamente lo que buscas</p>
                </div>
                <button type="button" onClick={() => setFiltrosAbiertos(false)} aria-label="Cerrar filtros" className="grid h-10 w-10 place-items-center rounded-full bg-stone-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto p-5">
                <div>
                  <h4 className="mb-3 font-semibold">Categorías</h4>
                  <div className="flex flex-wrap gap-2">
                    {['all', ...cats].map((c) => (
                      <button type="button" key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={chip(cat === c)}>
                        {cat === c && <Check size={12} className="mr-1 inline" />}
                        {c === 'all' ? 'Todas' : c}
                      </button>
                    ))}
                  </div>
                </div>

                {maximoPrecio > 0 && (
                  <div>
                    <div className="mb-2 flex justify-between gap-3">
                      <h4 className="font-semibold">Precio máximo</h4>
                      <span className="text-sm font-bold text-vino-800">
                        {precioMax === 'todos' ? 'Sin límite' : 'Bs ' + precioMax}
                      </span>
                    </div>

                    <input
                      type="range"
                      aria-label="Precio máximo al por menor"
                      min="0"
                      max={limitePrecio}
                      step="1"
                      value={precioMax === 'todos' ? limitePrecio : Number(precioMax)}
                      onChange={(e) => setPrecioMax(Number(e.target.value) >= limitePrecio ? 'todos' : e.target.value)}
                      className="w-full accent-vino-800"
                    />
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>Bs 0</span>
                      <span>Bs {limitePrecio}</span>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">Se aplica al precio por menor.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-stone-100 p-5">
                <button type="button" onClick={limpiar} className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold">
                  Limpiar
                </button>
                <button type="button" onClick={() => setFiltrosAbiertos(false)} className="flex-1 rounded-xl bg-vino-800 px-4 py-3 text-sm font-bold text-white">
                  Ver {filtrados.length} productos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {count > 0 && !open && (
          <motion.button
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between rounded-full bg-vino-900 px-5 py-4 font-bold text-white shadow-lift md:left-auto md:right-6 md:w-96"
          >
            <span className="flex items-center gap-2"><ShoppingBag size={20} className="text-oro-300" /> Mi pedido ({count})</span>
            <span className="rounded-full bg-oro-400 px-4 py-1 text-sm text-vino-950">Ver</span>
          </motion.button>
        )}
      </AnimatePresence>

      {count === 0 && (
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola, quiero hacer un pedido')}`} aria-label="WhatsApp"
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white shadow-lift transition hover:scale-110">
          <WhatsApp size={30} />
        </a>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 md:rounded-3xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-2xl font-extrabold text-vino-800">Mi pedido</h3>
                <button onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><X size={18} /></button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-stone-100 p-1 text-sm font-semibold">
                {[['menor', 'Al por menor'], ['mayor', 'Al por mayor']].map(([v, t]) => (
                  <button key={v} onClick={() => setTipo(v)} className={`rounded-full py-2 transition ${tipo === v ? 'bg-vino-800 text-white shadow' : 'text-stone-600'}`}>{t}</button>
                ))}
              </div>

              <ul className="space-y-2">
                {detalle.map(({ p, qty, precio, subtotal, mayorDesde, mayorAplicado }) => (
                  <li key={p.id} className="rounded-2xl bg-crema p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-stone-900">{p.nombre}</p>
                        <p className="mt-1 text-xs text-stone-600">
                          {cantidadDe(qty, p.unidad)} x {precio === null ? 'Consultar precio' : bs(precio)}
                        </p>
                        {tipo === 'mayor' && !mayorAplicado && mayorDesde > 0 && p.precio_mayor != null && qty < mayorDesde && (
                          <p className="mt-1 text-xs text-amber-800">
                            Precio mayor desde {cantidadDe(mayorDesde, p.unidad)}
                          </p>
                        )}
                      </div>
                      <strong className="shrink-0 text-vino-800">
                        {subtotal === null ? 'Consultar' : bs(subtotal)}
                      </strong>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <button onClick={() => add(p, -stepOf(p.unidad))} aria-label="Quitar" className="grid h-8 w-8 place-items-center rounded-full bg-white shadow"><Minus size={14} /></button>
                      <button onClick={() => add(p, stepOf(p.unidad))} aria-label="Agregar" className="grid h-8 w-8 place-items-center rounded-full bg-white shadow"><Plus size={14} /></button>
                      <button onClick={() => add(p, -qty)} aria-label="Eliminar" className="grid h-8 w-8 place-items-center rounded-full text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>

              <textarea
                value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={200}
                placeholder="Nota (opcional): hora de entrega, zona, etc."
                className="mt-4 w-full rounded-2xl border border-stone-200 p-3 text-sm outline-none focus:border-vino-500"
              />
              <div className="mt-3 flex items-center justify-between border-t border-stone-200 py-3">
                <span className="font-semibold text-stone-700">
                  Total {sinPrecio ? 'parcial' : 'estimado'}
                </span>
                <strong className="text-xl text-vino-800">
                  {totalTexto}
                </strong>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {sinPrecio
                  ? 'Los productos sin precio no se incluyen en el total parcial.'
                  : 'El precio final se confirma por WhatsApp.'}
              </p>

              {qr && (
                <div className="mt-4 rounded-2xl bg-oro-200/40 p-3 ring-1 ring-oro-400/40">
                  <label className="flex items-center gap-2 text-sm font-semibold text-vino-800">
                    <input type="checkbox" checked={pagoQr} onChange={(e) => setPagoQr(e.target.checked)} className="h-4 w-4" />
                    Quiero pagar por QR
                  </label>
                  {pagoQr && (
                    <div className="mt-3 text-center">
                      <img src={qr.replace('/upload/', '/upload/f_auto,q_auto,w_600/')} alt="QR de pago" className="mx-auto w-56 max-w-full rounded-xl bg-white p-2" />
                      <p className="mt-2 text-xs text-stone-600">Escanea con la app de tu banco. El monto final te lo confirmamos por WhatsApp; envíanos ahí el comprobante.</p>
                    </div>
                  )}
                </div>
              )}

              <a href={link} onClick={guardarPedido} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-green-500 py-3.5 font-bold text-white shadow-lg transition hover:bg-green-600">
                <WhatsApp size={22} /> Enviar pedido por WhatsApp
              </a>
              <button onClick={() => { setCart({}); setOpen(false); }} className="mt-3 w-full text-sm text-stone-500">Vaciar pedido</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
