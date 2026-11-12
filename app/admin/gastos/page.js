'use client';
import { confirmar, avisar, avisoAuto } from '@/lib/avisos';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { api, errMsg } from '@/lib/cliente';
import { bs, hoyBO } from '@/lib/fmt';

const CATS = ['Transporte', 'Servicios', 'Sueldos', 'Alquiler', 'Bolsas', 'Otros'];
const PER = [['hoy', 'Hoy'], ['7d', '7 días'], ['mes', 'Este mes']];
const rango = (p) => (p === 'hoy' ? [hoyBO(), hoyBO()] : p === '7d' ? [hoyBO(-6), hoyBO()] : [hoyBO().slice(0, 8) + '01', hoyBO()]);
const vacio = () => ({ concepto: '', monto: '', categoria: 'Otros', fecha: hoyBO(), de_caja: true });
const dia = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
const chip = (a) => `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${a ? 'bg-vino-800 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;

export default function Gastos() {
  const [per, setPer] = useState('mes');
  const [lista, setLista] = useState(null);
  const [f, setF] = useState(vacio());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [fallo, setFallo] = useState('');

  const aviso = avisoAuto;

  const cargar = useCallback(async () => {
    const [d, h] = rango(per);
    const r = await api(`/api/admin/gastos?desde=${d}&hasta=${h}`);
    setFallo(r.ok ? '' : errMsg(r.data));
    setLista(r.ok ? r.data : []);
  }, [per]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    const m = Number(f.monto);
    if (!f.concepto.trim()) return aviso('Escribe el concepto');
    if (!(m > 0)) return aviso('Escribe un monto válido');
    setBusy(true);
    const r = await api('/api/admin/gastos', 'POST', f);
    setBusy(false);
    if (!r.ok) return aviso(errMsg(r.data));
    setF({ ...vacio(), categoria: f.categoria });
    aviso('Gasto guardado');
    cargar();
  }

  async function borrar(g) {
    if (!(await confirmar({ titulo: `¿Borrar "${g.concepto}"?`, texto: 'No se puede deshacer.', ok: 'Sí, borrar', peligro: true }))) return;
    const r = await api('/api/admin/gastos?id=' + g.id, 'DELETE');
    aviso(r.ok ? 'Gasto borrado' : errMsg(r.data));
    cargar();
  }

  const total = (lista || []).reduce((s, g) => s + g.monto, 0);
  const porCat = {};
  for (const g of lista || []) { const k = g.categoria || 'Otros'; porCat[k] = (porCat[k] || 0) + g.monto; }
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);

  return (
    <main className="fade-in px-4 pb-6 pt-4">
      <h1 className="font-serif text-3xl font-extrabold text-vino-800">Gastos</h1>
      <p className="mb-4 text-sm text-stone-500">Luz, alquiler, sueldos, transporte, bolsas y todo lo que no es mercadería. La mercadería va en Compras.</p>

      {fallo && <p className="mb-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{fallo}</p>}

      <div className="mb-3 flex gap-2">
        {PER.map(([v, t]) => <button key={v} onClick={() => setPer(v)} className={chip(per === v)}>{t}</button>)}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-900">
        <p className="text-sm text-stone-500">Total gastado</p>
        <p className="mt-1 text-4xl font-extrabold">{bs(total)}</p>
        <p className="mt-1 text-xs text-stone-500">{lista ? lista.length : 0} {lista && lista.length === 1 ? 'gasto' : 'gastos'}</p>
      </div>

      <div className="mt-3 space-y-3 rounded-3xl bg-white p-4 shadow-card">
        <h2 className="font-serif text-lg font-extrabold text-vino-800">Nuevo gasto</h2>
        <input placeholder="Concepto (ej. compra en el mercado)" value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="Monto Bs" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} />
          <input type="date" max={hoyBO()} value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => <button key={c} type="button" onClick={() => setF({ ...f, categoria: c })} className={chip(f.categoria === c)}>{c}</button>)}
        </div>
        <p className="text-xs font-semibold text-stone-500">¿Esta plata salió de la caja?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setF({ ...f, de_caja: true })} className={`rounded-xl py-2.5 text-sm font-semibold ${f.de_caja ? 'bg-vino-800 text-white' : 'bg-stone-100 text-stone-700'}`}>Sí, de la caja</button>
          <button type="button" onClick={() => setF({ ...f, de_caja: false })} className={`rounded-xl py-2.5 text-sm font-semibold ${!f.de_caja ? 'bg-vino-800 text-white' : 'bg-stone-100 text-stone-700'}`}>No, de otro lado</button>
        </div>
        <button onClick={guardar} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-vino-800 py-3 font-bold text-white disabled:opacity-50">
          <Plus size={18} /> {busy ? 'Guardando...' : 'Agregar gasto'}
        </button>
      </div>

      {cats.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {cats.map(([n, v]) => (
            <div key={n} className="shrink-0 rounded-2xl bg-white px-4 py-2 shadow-card">
              <p className="text-[11px] text-stone-500">{n}</p>
              <p className="text-sm font-extrabold text-vino-800">{bs(v)}</p>
            </div>
          ))}
        </div>
      )}

      {lista === null ? (
        <div className="mt-3 space-y-2"><div className="skeleton h-16" /><div className="skeleton h-16" /></div>
      ) : (
        <ul className="mt-3 space-y-2">
          {lista.map((g) => (
            <li key={g.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{g.concepto}</p>
                <p className="text-xs text-stone-500">{dia(g.fecha)} · {g.categoria || 'Otros'} · {g.de_caja ? 'De la caja' : 'No de la caja'}</p>
              </div>
              <p className="shrink-0 font-extrabold text-vino-800">{bs(g.monto)}</p>
              <button onClick={() => borrar(g)} aria-label="Borrar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={15} /></button>
            </li>
          ))}
          {!lista.length && !fallo && <li className="py-12 text-center text-stone-500"><Wallet className="mx-auto mb-2 text-vino-300" /> No hay gastos en este período.</li>}
        </ul>
      )}

      {toast && <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full bg-vino-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lift">{toast}</div>}
    </main>
  );
}
