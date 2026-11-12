'use client';
import { confirmar, avisar, avisoAuto } from '@/lib/avisos';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { api, errMsg } from '@/lib/cliente';
import { bs } from '@/lib/fmt';

const nz = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
const orig = (p) => (p.costo == null ? '' : String(Number(p.costo)));
const norm = (v) => (v === '' ? '' : String(Number(v)));
const chip = (a) => `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${a ? 'bg-vino-800 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;

export default function Costos() {
  const [lista, setLista] = useState(null);
  const [ed, setEd] = useState({});
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('sin');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [fallo, setFallo] = useState('');

  const aviso = avisoAuto;

  const cargar = useCallback(async () => {
    const r = await api('/api/admin/productos');
    if (r.status === 401) return;
    setFallo(r.ok ? '' : errMsg(r.data));
    setLista(r.ok ? r.data?.productos || [] : []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const sucios = useMemo(
    () => (lista || []).filter((p) => ed[p.id] !== undefined && norm(ed[p.id]) !== norm(orig(p))),
    [lista, ed]
  );
  const sinCosto = (lista || []).filter((p) => p.costo == null).length;

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (lista || [])
      .filter((p) => (filtro === 'todos' || p.costo == null) && (!t || (p.nombre + ' ' + (p.categoria || '')).toLowerCase().includes(t)))
      .slice(0, 200);
  }, [lista, q, filtro]);

  async function guardar() {
    for (const p of sucios) {
      const v = ed[p.id];
      if (v !== '' && !(Number(v) >= 0)) return aviso('Revisa los costos: no pueden ser negativos');
    }
    setBusy(true);
    const r = await api('/api/admin/costos', 'POST', {
      items: sucios.map((p) => ({ id: String(p.id), costo: ed[p.id] === '' ? null : Number(ed[p.id]) })),
    });
    setBusy(false);
    if (!r.ok) return aviso(errMsg(r.data));
    aviso(`${r.data.actualizados} ${r.data.actualizados === 1 ? 'costo guardado' : 'costos guardados'}`);
    setEd({});
    cargar();
  }

  return (
    <main className="fade-in px-4 pb-40 pt-4">
      <h1 className="font-serif text-3xl font-extrabold text-vino-800">Costos</h1>
      <p className="mb-4 text-sm text-stone-500">Carga lo que te cuesta cada producto y la app calcula tu ganancia.</p>

      {fallo && <p className="mb-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{fallo}</p>}

      <div className="mb-3 flex gap-2">
        <button onClick={() => setFiltro('sin')} className={chip(filtro === 'sin')}>Sin costo ({sinCosto})</button>
        <button onClick={() => setFiltro('todos')} className={chip(filtro === 'todos')}>Todos</button>
      </div>

      <div className="relative mb-3">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto..." style={{ paddingLeft: '2.75rem' }} />
      </div>

      {lista === null ? (
        <div className="space-y-2"><div className="skeleton h-20" /><div className="skeleton h-20" /><div className="skeleton h-20" /></div>
      ) : (
        <ul className="space-y-2">
          {visibles.map((p) => {
            const v = ed[p.id] ?? orig(p);
            const precio = nz(p.precio_menor);
            const c = nz(v);
            const g = precio != null && c != null ? Math.round((precio - c) * 100) / 100 : null;
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.nombre}</p>
                  <p className="text-xs text-stone-500">{precio != null ? 'Vendes a ' + bs(precio) + '/' + (p.unidad || 'u') : 'Sin precio al menor'}</p>
                  {g != null && (
                    <p className={'mt-0.5 text-[11px] font-bold ' + (g < 0 ? 'text-red-600' : 'text-green-700')}>
                      {g < 0 ? 'Pierdes ' + bs(-g) : 'Ganas ' + bs(g)}{c > 0 && g >= 0 ? ' · ' + Math.round((g / c) * 100) + '%' : ''}
                    </p>
                  )}
                </div>
                <label className="w-28 shrink-0 text-[11px] text-stone-500">Costo Bs
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={v} placeholder="0.00"
                    onChange={(e) => setEd({ ...ed, [p.id]: e.target.value })} />
                </label>
              </li>
            );
          })}
          {!visibles.length && !fallo && (
            <li className="py-12 text-center text-stone-500"><Check className="mx-auto mb-2 text-green-600" /> {filtro === 'sin' ? 'Todos tus productos tienen costo.' : 'No hay productos con esa búsqueda.'}</li>
          )}
        </ul>
      )}

      {sucios.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4 md:left-64">
          <button onClick={guardar} disabled={busy} className="mx-auto flex w-full max-w-4xl items-center justify-center gap-2 rounded-full bg-vino-800 py-3.5 font-bold text-white shadow-lift disabled:opacity-50">
            {busy ? 'Guardando...' : `Guardar ${sucios.length} ${sucios.length === 1 ? 'cambio' : 'cambios'}`}
          </button>
        </div>
      )}

      {toast && <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full bg-vino-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lift">{toast}</div>}
    </main>
  );
}
