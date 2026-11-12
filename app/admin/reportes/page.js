'use client';
import { useEffect, useState } from 'react';
import { api, errMsg } from '@/lib/cliente';
import { bs, qty, hoyBO } from '@/lib/fmt';

const PER = [['hoy', 'Hoy'], ['7d', '7 días'], ['30d', '30 días'], ['mes', 'Este mes'], ['ant', 'Mes pasado']];
const METODO = { efectivo: 'Efectivo', qr: 'QR', transferencia: 'Transferencia', fiado: 'Fiado' };

function rango(p) {
  const hoy = hoyBO();
  if (p === 'hoy') return [hoy, hoy];
  if (p === '7d') return [hoyBO(-6), hoy];
  if (p === '30d') return [hoyBO(-29), hoy];
  if (p === 'mes') return [hoy.slice(0, 8) + '01', hoy];
  const [y, m] = hoy.split('-').map(Number);
  return [new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10), new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10)];
}

const chip = (a) => `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${a ? 'bg-vino-800 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;

function Caja({ titulo, children }) {
  return (
    <div className="mt-3 rounded-3xl bg-white p-4 shadow-card">
      <h2 className="mb-3 font-serif text-lg font-extrabold text-vino-800">{titulo}</h2>
      {children}
    </div>
  );
}

function Tarjeta({ t, v, c, sub }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="text-xs text-stone-500">{t}</p>
      <p className={`mt-0.5 text-xl font-extrabold ${c}`}>{v}</p>
      {sub && <p className="text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

function Barras({ items, color = 'bg-vino-700' }) {
  if (!items.length) return <p className="py-4 text-center text-sm text-stone-500">Sin datos en este período.</p>;
  const max = Math.max(1, ...items.map((i) => i.total));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.nombre}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{i.nombre}</span>
            <span className="shrink-0 font-bold">{bs(i.total)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-stone-100">
            <div className={`h-2 rounded-full ${color}`} style={{ width: Math.max(3, (i.total / max) * 100) + '%' }} />
          </div>
          {i.extra && <p className="mt-0.5 text-[11px] text-stone-500">{i.extra}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function Reportes() {
  const [per, setPer] = useState('7d');
  const [metrica, setMetrica] = useState('total');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let vivo = true;
    setD(null);
    setErr('');
    const [a, b] = rango(per);
    api(`/api/admin/reportes?desde=${a}&hasta=${b}`).then((r) => {
      if (!vivo || r.status === 401) return;
      if (!r.ok) return setErr(errMsg(r.data));
      setD(r.data);
    });
    return () => { vivo = false; };
  }, [per]);

  const r = d?.resumen;
  const serie = d?.serie || [];
  const n = serie.length;
  const max = Math.max(1, ...serie.map((x) => x[metrica]));

  return (
    <main className="fade-in px-4 pb-6 pt-4">
      <h1 className="font-serif text-3xl font-extrabold text-vino-800">Reportes</h1>
      <p className="mb-4 text-sm text-stone-500">Cómo va tu negocio.</p>

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {PER.map(([v, t]) => <button key={v} onClick={() => setPer(v)} className={chip(per === v)}>{t}</button>)}
      </div>

      {err && <p className="mb-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{err}</p>}

      {!d && !err && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><div className="skeleton h-20" /><div className="skeleton h-20" /><div className="skeleton h-20" /><div className="skeleton h-20" /></div>
          <div className="skeleton h-52" />
        </div>
      )}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tarjeta t="Vendido" v={bs(r.total)} c="text-green-700" sub={r.n + (r.n === 1 ? ' venta' : ' ventas')} />
            <Tarjeta t="Ganancia" v={bs(r.ganancia)} c="text-vino-800" sub="antes de gastos" />
            <Tarjeta t="Gastos" v={bs(r.gastos)} c="text-amber-700" />
            <Tarjeta t="Ganancia neta" v={bs(r.neta)} c={r.neta < 0 ? 'text-red-600' : 'text-green-700'} sub="ganancia − gastos" />
          </div>

          {r.sin_costo > 0 && (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              Hay {r.sin_costo} {r.sin_costo === 1 ? 'producto vendido' : 'productos vendidos'} sin costo cargado, así que la ganancia sale más alta de lo real. Carga el costo en Productos.
            </p>
          )}

          <Caja titulo="Por día">
            <div className="mb-3 flex gap-2">
              <button onClick={() => setMetrica('total')} className={chip(metrica === 'total')}>Ventas</button>
              <button onClick={() => setMetrica('ganancia')} className={chip(metrica === 'ganancia')}>Ganancia</button>
            </div>
            <div className="flex h-36 items-end gap-[3px]">
              {serie.map((x) => {
                const v = Math.max(0, x[metrica]);
                return (
                  <div key={x.dia} title={x.dia + ': ' + bs(x[metrica])} className="flex h-full min-w-0 flex-1 items-end">
                    <div className={`w-full rounded-t ${x.dia === hoyBO() ? 'bg-vino-800' : 'bg-vino-300'}`} style={{ height: v > 0 ? Math.max(3, (v / max) * 100) + '%' : '1px' }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex gap-[3px]">
              {serie.map((x, i) => (
                <span key={x.dia} className="min-w-0 flex-1 text-center text-[10px] text-stone-500">{n <= 8 || i % 7 === 0 ? Number(x.dia.slice(8)) : ''}</span>
              ))}
            </div>
          </Caja>

          <Caja titulo="Más vendidos">
            <Barras items={d.productos.slice(0, 8).map((p) => ({ nombre: p.nombre, total: p.total, extra: qty(p.cantidad) + ' ' + p.unidad + ' · gana ' + bs(p.ganancia) }))} />
          </Caja>

          <Caja titulo="Por categoría"><Barras items={d.categorias} color="bg-oro-500" /></Caja>
          <Caja titulo="Cobros por forma de pago"><Barras items={d.metodos.map((m) => ({ nombre: METODO[m.nombre] || m.nombre, total: m.total }))} color="bg-green-600" /></Caja>
          <Caja titulo="En qué gastas"><Barras items={d.gastos_cat} color="bg-amber-600" /></Caja>

          {r.por_cobrar > 0 && <p className="mt-3 text-center text-sm text-stone-500">Por cobrar de este período: <b className="text-amber-700">{bs(r.por_cobrar)}</b></p>}
        </>
      )}
    </main>
  );
}
