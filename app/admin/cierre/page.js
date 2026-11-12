'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errMsg } from '@/lib/cliente';
import { confirmar, avisoAuto } from '@/lib/avisos';
import { bs } from '@/lib/fmt';

const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const num = (v) => {
  const x = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
};
const fdm = (f) => String(f || '').split('-').reverse().join('/');
const campo = 'w-full rounded-xl border-0 bg-white px-4 py-3 text-lg font-bold text-stone-900 shadow-card outline-none ring-1 ring-stone-200 focus:ring-2 focus:ring-vino-500';

function Linea({ signo, texto, valor }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2 text-sm">
      <span className="text-stone-600"><b className="mr-1.5 inline-block w-3 text-center text-vino-800">{signo}</b>{texto}</span>
      <span className="shrink-0 font-bold">{bs(valor)}</span>
    </li>
  );
}

export default function Cierre() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [apert, setApert] = useState('');
  const [contado, setContado] = useState('');
  const [deja, setDeja] = useState('');
  const [dejaTocado, setDejaTocado] = useState(false);
  const [busy, setBusy] = useState(false);
  const aviso = avisoAuto;

  const cargar = useCallback(async () => {
    setErr('');
    setD(null);
    const r = await api('/api/admin/cierre');
    if (r.status === 401) return;
    if (!r.ok) return setErr(errMsg(r.data));
    setD(r.data);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const apertura = d ? (d.primera ? (num(apert) ?? 0) : d.apertura) : 0;
  const esperado = d ? r2(apertura + d.efectivo - d.compras - d.gastos) : 0;
  const c = num(contado);
  const dif = c == null ? null : r2(c - esperado);
  const cuadra = dif != null && Math.abs(dif) < 0.005;
  const dejaN = dejaTocado ? num(deja) : c;
  const dejaOk = c != null && dejaN != null && dejaN >= 0 && dejaN <= c;

  async function cerrar() {
    if (c == null || c < 0) return aviso('Escribe cuánto efectivo contaste');
    if (!dejaOk) return aviso('Lo que dejas para mañana no puede ser más de lo que contaste');
    const ok = await confirmar({ titulo: '¿Cerrar la caja?', texto: 'Contaste ' + bs(c) + '. Mañana vas a empezar con ' + bs(dejaN) + '.', ok: 'Sí, cerrar' });
    if (!ok) return;
    setBusy(true);
    const r = await api('/api/admin/cierre', 'POST', { contado: c, deja: dejaN, apertura: d.primera ? apertura : undefined });
    setBusy(false);
    if (!r.ok) return aviso(errMsg(r.data));
    aviso('Caja cerrada');
    setContado('');
    setDeja('');
    setDejaTocado(false);
    cargar();
  }

  return (
    <main className="fade-in px-4 pb-6 pt-4">
      <h1 className="font-serif text-3xl font-extrabold text-vino-800">Cierre de caja</h1>
      <p className="mb-4 text-sm text-stone-500">{d ? 'Hoy · ' + fdm(d.hoy) : 'Hoy'}</p>

      {err && <p className="mb-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{err}</p>}

      {!d && !err && (
        <div className="space-y-3"><div className="skeleton h-24" /><div className="skeleton h-40" /></div>
      )}

      {d && (
        <>
          {d.cerrado_hoy && (
            <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Hoy ya cerraste la caja (contaste {bs(d.cerrado_hoy.contado)}). Si cierras otra vez, se reemplaza.
            </p>
          )}

          <div className="rounded-3xl bg-white p-4 shadow-card">
            <h2 className="mb-2 font-serif text-lg font-extrabold text-vino-800">Cuánta plata debe haber</h2>
            {d.primera && (
              <div className="mb-2">
                <label htmlFor="apert" className="text-xs font-semibold text-stone-500">¿Con cuánto abriste la caja? (solo esta primera vez)</label>
                <input id="apert" inputMode="decimal" value={apert} onChange={(e) => setApert(e.target.value)} placeholder="0" className={campo + ' mt-1'} />
              </div>
            )}
            <ul className="divide-y divide-stone-100">
              {!d.primera && <Linea signo="" texto="Con lo que empezó (lo que dejaste al cerrar)" valor={d.apertura} />}
              <Linea signo="+" texto="Ventas cobradas en efectivo" valor={d.efectivo} />
              <Linea signo="−" texto="Compras pagadas de la caja" valor={d.compras} />
              <Linea signo="−" texto="Gastos pagados de la caja" valor={d.gastos} />
            </ul>
            <p className="mt-2 flex items-baseline justify-between border-t border-stone-200 pt-3">
              <span className="font-bold">Debe haber</span>
              <span className="text-2xl font-extrabold text-vino-800">{bs(esperado)}</span>
            </p>
            {!d.primera && d.desde !== d.hoy && (
              <p className="mt-2 text-xs text-stone-500">Incluye desde el {fdm(d.desde)}, porque la caja no se cerró antes.</p>
            )}
            {d.otros > 0 && (
              <p className="mt-2 text-xs text-stone-500">Además cobraste {bs(d.otros)} por QR o transferencia. Eso no va al cajón.</p>
            )}
          </div>

          <div className="mt-3 rounded-3xl bg-white p-4 shadow-card">
            <h2 className="mb-3 font-serif text-lg font-extrabold text-vino-800">Cuenta el efectivo</h2>
            <label htmlFor="contado" className="text-xs font-semibold text-stone-500">Efectivo que contaste ahora</label>
            <input id="contado" inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} placeholder="Escribe el total contado" className={campo + ' mt-1'} />
            {dif == null ? (
              <p className="mt-3 rounded-2xl bg-stone-50 p-4 text-center text-sm text-stone-500">Escribe lo que contaste y verás si cuadra.</p>
            ) : (
              <p className={`mt-3 rounded-2xl p-4 text-center text-2xl font-extrabold ${cuadra ? 'bg-green-50 text-green-700' : dif > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                {cuadra ? 'La caja cuadra' : dif > 0 ? 'Sobra ' + bs(dif) : 'Falta ' + bs(-dif)}
              </p>
            )}

            <label htmlFor="deja" className="mt-4 block text-xs font-semibold text-stone-500">Dejo en la caja para mañana</label>
            <input id="deja" inputMode="decimal" value={dejaTocado ? deja : contado} onChange={(e) => { setDejaTocado(true); setDeja(e.target.value); }} placeholder="Lo mismo que contaste" className={campo + ' mt-1'} />
            <p className="mt-1 text-xs text-stone-500">Si te llevas plata al banco o a tu casa, escribe aquí solo lo que se queda.</p>

            <button onClick={cerrar} disabled={busy || c == null} className="mt-4 w-full rounded-full bg-vino-800 py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50">
              {busy ? 'Guardando...' : 'Cerrar caja'}
            </button>
          </div>

          <button onClick={cargar} className="mt-3 w-full rounded-full bg-white py-3 text-sm font-bold text-vino-800 ring-1 ring-stone-200 transition active:scale-95">Actualizar</button>
        </>
      )}
    </main>
  );
}
