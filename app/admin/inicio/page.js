'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Package, Tags, Megaphone, Store, KeyRound, Wallet, Inbox, ShoppingCart, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { api, errMsg } from '@/lib/cliente';
import { bs, qty, hoyBO } from '@/lib/fmt';
import { Page, PageHeader, Card, Stat, Badge, Btn, Empty, Skeleton } from '@/components/ui';

const ACCESOS = [
  ['/admin/ventas/nueva', 'Vender', Plus],
  ['/admin/productos', 'Productos', Package],
  ['/admin/categorias', 'Categorías', Tags],
  ['/admin/banners', 'Ofertas', Megaphone],
  ['/admin/negocio', 'Negocio', Store],
  ['/admin/clave', 'Clave', KeyRound],
];

const dia3 = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'short' }).replace('.', '');

function cabecera() {
  const h = (new Date().getUTCHours() + 20) % 24;
  const s = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const f = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/La_Paz' });
  return { s, f: f.charAt(0).toUpperCase() + f.slice(1) };
}

export default function Inicio() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [cab, setCab] = useState({ s: '', f: '' });

  const cargar = useCallback(async () => {
    setErr('');
    setD(null);
    const r = await api(`/api/admin/reportes?desde=${hoyBO(-6)}&hasta=${hoyBO()}`);
    if (r.status === 401) return;
    if (!r.ok) return setErr(errMsg(r.data));
    setD(r.data);
  }, []);

  useEffect(() => {
    setCab(cabecera());
    cargar();
  }, [cargar]);

  const serie = d?.serie || [];
  const hoy = serie.find((x) => x.dia === hoyBO()) || { n: 0, total: 0, ganancia: 0 };
  const ayer = serie.find((x) => x.dia === hoyBO(-1));
  const max = Math.max(1, ...serie.map((x) => x.total));
  const sem = serie.reduce((s, x) => s + x.total, 0);
  const mejor = serie.reduce((m, x) => (x.total > (m?.total || 0) ? x : m), null);
  const g = d?.global || { por_cobrar: 0, pedidos: 0 };
  const bajo = d?.stock_bajo || [];
  const sinCosto = (d?.resumen?.sin_costo || 0) > 0;

  const delta = ayer && ayer.total > 0 ? ((hoy.total - ayer.total) / ayer.total) * 100 : null;

  return (
    <Page className="pb-6">
      <p className="text-sm text-stone-500">{cab.f || '\u00a0'}</p>
      <PageHeader title={cab.s || '\u00a0'}>
        <Btn href="/admin/ventas/nueva"><Plus size={16} /> Vender</Btn>
      </PageHeader>

      {err && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          <span>{err}</span>
          <Btn variant="danger" onClick={cargar}><RefreshCw size={14} /> Reintentar</Btn>
        </div>
      )}

      {!d && !err && (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <div className="grid grid-cols-3 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
          <Skeleton className="h-52" />
        </div>
      )}

      {d && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-stone-500">Vendido hoy</p>
                <p className="mt-1 text-4xl font-extrabold md:text-5xl">{bs(hoy.total)}</p>
              </div>
              {delta !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {delta >= 0 ? '+' : ''}{Math.round(delta)}% vs ayer
                </span>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-panel p-3">
                <p className="text-stone-500">Ventas</p>
                <p className="text-xl font-bold">{hoy.n}</p>
              </div>
              <div className="rounded-xl bg-panel p-3">
                <p className="text-stone-500">Ganancia</p>
                <p className="text-xl font-bold">{sinCosto ? '—' : bs(hoy.ganancia)}</p>
              </div>
            </div>
          </div>

          {sinCosto && (
            <Link href="/admin/costos" className="flex items-center justify-between gap-3 rounded-2xl bg-oro-200/50 p-4 text-sm text-amber-900 ring-1 ring-oro-400/40">
              <span><b>Faltan costos</b> en algunos productos. Cárgalos para ver tu ganancia real.</span>
              <span className="shrink-0 font-bold">Cargar →</span>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/ventas" className="block"><Stat label="Pedidos" value={g.pedidos} tone="vino" icon={Inbox} /></Link>
            <Stat label="7 días" value={bs(sem)} tone="verde" icon={ShoppingCart} />
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Card className="md:col-span-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-serif text-lg font-extrabold text-vino-800">Últimos 7 días</h2>
                {mejor && mejor.total > 0 && <Badge tone="verde">Mejor día: <span className="ml-1 capitalize">{dia3(mejor.dia)}</span></Badge>}
              </div>
              <div className="mt-4 flex gap-2">
                {serie.map((x) => {
                  const esHoy = x.dia === hoyBO();
                  const pct = x.total > 0 ? Math.max(4, (x.total / max) * 100) : 2;
                  return (
                    <div key={x.dia} className="flex flex-1 flex-col items-center gap-1" title={`${dia3(x.dia)}: ${bs(x.total)} · ${x.n} ventas`}>
                      <span className="h-4 text-[10px] font-semibold text-stone-500">{x.total > 0 ? Math.round(x.total) : ''}</span>
                      <div className="flex h-28 w-full items-end">
                        <div className={`w-full rounded-t-lg transition-all ${esHoy ? 'bg-vino-800' : x === mejor ? 'bg-oro-400' : 'bg-vino-200'}`} style={{ height: pct + '%' }} />
                      </div>
                      <span className={`text-[11px] font-semibold capitalize ${esHoy ? 'text-vino-800' : 'text-stone-500'}`}>{dia3(x.dia)}</span>
                    </div>
                  );
                })}
              </div>
              {sem === 0 && <p className="mt-3 text-center text-xs text-stone-500">Todavía no hay ventas en estos 7 días.</p>}
              <Link href="/admin/reportes" className="mt-3 block text-center text-sm font-bold text-vino-800">Ver reportes completos</Link>
            </Card>

            <Card className="md:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-extrabold text-vino-800">Stock bajo</h2>
                {bajo.length > 0 && <Badge tone="rojo">{bajo.length}</Badge>}
              </div>
              {bajo.length > 0 ? (
                <>
                  <ul className="mt-1 divide-y divide-stone-100">
                    {bajo.slice(0, 6).map((p, i) => (
                      <li key={p.nombre + i} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="truncate pr-3 font-semibold">{p.nombre}</span>
                        <span className="shrink-0 font-bold text-red-600">{qty(p.stock)} {p.unidad}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/admin/productos" className="mt-2 block text-center text-sm font-bold text-vino-800">Ver productos</Link>
                </>
              ) : (
                <div className="mt-3">
                  <Empty icon={Package} title="Todo en orden" text="No hay productos con stock bajo." />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <div className="md:hidden">
        <h2 className="mb-2 mt-6 font-serif text-lg font-extrabold text-vino-800">Accesos rápidos</h2>
        <div className="grid grid-cols-3 gap-3">
          {ACCESOS.map(([href, t, Icon]) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-card transition active:scale-95">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-vino-50 text-vino-800"><Icon size={20} /></span>
              <span className="text-xs font-bold text-stone-700">{t}</span>
            </Link>
          ))}
        </div>
      </div>
    </Page>
  );
}
