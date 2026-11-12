'use client';
// compras-ui-v1
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, X, Trash2, ChevronDown, Inbox } from 'lucide-react';
import { confirmar, avisar } from '@/lib/avisos';
import { api, errMsg } from '@/lib/cliente';
import { bs, hoyBO } from '@/lib/fmt';
import { admiteDecimales } from '@/lib/unidades';
import Escaner from '@/components/Escaner';

const MET = { efectivo: 'Efectivo', qr: 'QR', transferencia: 'Transferencia', otro: 'Otro' };
const METODOS = [['caja', 'Efectivo de la caja'], ['transferencia', 'QR o transferencia'], ['otro', 'Otro (no sale de la caja)']];
const n = (v) => Number(v) || 0;
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const nf = (v) => String(r3(Number(v) || 0)).replace('.', ',');
const dm = (f) => String(f || '').slice(8, 10) + '/' + String(f || '').slice(5, 7);
const normCod = (s) => { const t = String(s || '').trim(); return /^\d+$/.test(t) ? t.replace(/^0+/, '') : t.toLowerCase(); };
const crearClave = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const chip = (a) => `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${a ? 'bg-vino-800 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;

function rango(p) {
  if (p === 'hoy') return [hoyBO(), hoyBO()];
  if (p === 'ayer') return [hoyBO(-1), hoyBO(-1)];
  if (p === 'mes') return [hoyBO().slice(0, 8) + '01', hoyBO()];
  return [hoyBO(-6), hoyBO()];
}

function CompraCard({ c, onAnular }) {
  const [open, setOpen] = useState(false);
  const anulada = c.estado === 'anulada';
  return (
    <li className={`rounded-2xl bg-white shadow-card ${anulada ? 'opacity-60' : ''}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{c.proveedor || 'Sin proveedor'}</p>
          <p className="truncate text-xs text-stone-500">{dm(c.fecha) + ' · ' + c.items.map((i) => i.nombre).join(', ')}</p>
          <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold">
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">{c.de_caja ? 'Efectivo de la caja' : (MET[c.metodo] || c.metodo)}</span>
            {anulada && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">Anulada</span>}
          </div>
        </div>
        <p className="shrink-0 text-lg font-extrabold text-vino-800">{bs(c.total)}</p>
        <ChevronDown size={18} className={`shrink-0 text-stone-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-stone-100 p-3">
          <ul className="space-y-1 text-sm">
            {c.items.map((i, x) => (
              <li key={x} className="flex justify-between gap-3">
                <span>{nf(i.cantidad) + ' ' + i.unidad + ' ' + i.nombre + ' a ' + bs(i.costo)}</span>
                <span className="shrink-0 font-semibold">{bs(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          {c.nota && <p className="rounded-xl bg-stone-50 p-2 text-xs text-stone-600">{c.nota}</p>}
          <p className="text-xs text-stone-500">{'Compra #' + c.id}</p>
          {!anulada && (
            <button type="button" onClick={() => onAnular(c)} className="rounded-full bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600">Anular compra</button>
          )}
        </div>
      )}
    </li>
  );
}

const MARGEN_BAJO = 10; // % de ganancia por debajo del cual se avisa

function AvisoCosto({ l, unit }) {
  if (unit == null) return null;
  const avisos = [];
  const ant = Number(l.actual);
  if (l.actual != null && ant > 0) {
    const d = r2(unit - ant);
    if (Math.abs(d) >= 0.01) {
      const pct = Math.round((Math.abs(d) / ant) * 100);
      avisos.push([d > 0 ? 'text-amber-700' : 'text-green-700', (d > 0 ? 'Sube ' : 'Baja ') + bs(Math.abs(d)) + ' (' + pct + '%) frente al costo anterior']);
    }
  }
  for (const [nombre, precio] of [['menor', l.pmenor], ['mayor', l.pmayor]]) {
    const p = Number(precio);
    if (!(p > 0)) continue;
    const gana = r2(p - unit);
    const pct = Math.round((gana / p) * 100);
    const x = '/' + l.unidad;
    if (gana < -0.004) avisos.push(['font-bold text-red-600', 'Por ' + nombre + ': pierdes ' + bs(-gana) + x]);
    else if (gana < 0.005) avisos.push(['font-bold text-red-600', 'Por ' + nombre + ': no ganas nada']);
    else avisos.push([pct < MARGEN_BAJO ? 'text-amber-700' : 'text-stone-500', 'Por ' + nombre + ': ganas ' + bs(gana) + x + ' (' + pct + '%)' + (pct < MARGEN_BAJO ? ' · poco' : '')]);
  }
  if (!avisos.length) return null;
  return (
    <div className="mt-1 space-y-0.5 text-xs">
      {avisos.map(([cls, t], i) => <p key={i} className={cls}>{t}</p>)}
    </div>
  );
}

function NuevaCompra({ onCerrar, onListo }) {
  const [productos, setProductos] = useState(null);
  const [provs, setProvs] = useState([]);
  const [prov, setProv] = useState('');
  const [fecha, setFecha] = useState(hoyBO());
  const [metodo, setMetodo] = useState('caja');
  const [nota, setNota] = useState('');
  const [lineas, setLineas] = useState([]);
  const [q, setQ] = useState('');
  const [cam, setCam] = useState(false);
  const [nuevoProv, setNuevoProv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const intento = useRef({ sig: '', clave: '' });

  useEffect(() => {
    (async () => {
      const [pr, pv] = await Promise.all([api('/api/admin/productos'), api('/api/admin/proveedores')]);
      if (pr.ok) setProductos(pr.data?.productos || []);
      else { setProductos([]); setErr(errMsg(pr.data)); }
      if (pv.ok && Array.isArray(pv.data)) setProvs(pv.data);
    })();
  }, []);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return (productos || [])
      .filter((p) => (p.nombre + ' ' + (p.categoria || '') + ' ' + (p.codigo || '')).toLowerCase().includes(t))
      .slice(0, 8);
  }, [productos, q]);

  const total = r2(lineas.reduce((a, l) => a + r2(n(l.total)), 0));

  function agregar(p) {
    const id = String(p.id);
    if (lineas.some((l) => l.id === id)) return avisar.aviso(p.nombre + ' ya está en la lista');
    setLineas([...lineas, { id, nombre: p.nombre, unidad: p.unidad || 'u', cantidad: '', total: '', pmenor: p.precio_menor ?? null, pmayor: p.precio_mayor ?? null, actual: p.costo == null ? null : Number(p.costo) }]);
    setQ('');
  }

  function leerCodigo(c) {
    const p = (productos || []).find((x) => x.codigo && normCod(x.codigo) === normCod(c));
    if (!p) { avisar.aviso('Código no registrado', c); return; }
    const ya = lineas.some((l) => l.id === String(p.id));
    agregar(p);
    if (!ya) avisar.ok(p.nombre + ' agregado');
  }

  const cambiar = (id, campo, v) => setLineas(lineas.map((l) => (l.id === id ? { ...l, [campo]: v } : l)));
  const quitar = (id) => setLineas(lineas.filter((l) => l.id !== id));

  async function cerrar() {
    if (lineas.length && !(await confirmar({ titulo: '¿Salir sin guardar?', texto: 'Perderás las líneas de esta compra.', ok: 'Salir', cancelar: 'Seguir editando', peligro: true }))) return;
    onCerrar();
  }

  async function guardarProv() {
    const nombre = nuevoProv.nombre.trim();
    if (!nombre) return setErr('Escribe el nombre del proveedor.');
    const r = await api('/api/admin/proveedores', 'POST', { nombre, telefono: nuevoProv.telefono });
    if (!r.ok) return setErr(errMsg(r.data));
    const pv = await api('/api/admin/proveedores');
    if (pv.ok && Array.isArray(pv.data)) setProvs(pv.data);
    setProv(String(r.data.id));
    setNuevoProv(null);
    setErr('');
    avisar.ok('Proveedor guardado');
  }

  async function guardar() {
    setErr('');
    if (!lineas.length) return setErr('Agrega al menos un producto.');
    for (const l of lineas) {
      const c = n(l.cantidad);
      if (!(c > 0)) return setErr('Revisa la cantidad de ' + l.nombre + '.');
      if (!(r3(c) > 0)) return setErr('Revisa la cantidad de ' + l.nombre + '.');
      if (!(r2(n(l.total)) > 0)) return setErr('Escribe cuánto pagaste por ' + l.nombre + '.');
      if (!admiteDecimales(l.unidad) && !Number.isInteger(c)) return setErr(l.nombre + ' se cuenta en números enteros.');
    }
    const body = {
      proveedor_id: prov || null,
      fecha: fecha && fecha !== hoyBO() ? fecha : null,
      metodo: metodo === 'caja' ? 'efectivo' : metodo,
      de_caja: metodo === 'caja',
      nota: nota.trim(),
      items: lineas.map((l) => {
        const cantidad = r3(n(l.cantidad));
        const subtotal = r2(n(l.total));
        const costo = r2(subtotal / cantidad);
        return { producto_id: l.id, cantidad, costo, subtotal };
      }),
    };
    const sig = JSON.stringify(body);
    if (intento.current.sig !== sig) intento.current = { sig, clave: crearClave() };
    body.clave = intento.current.clave;
    setBusy(true);
    const r = await api('/api/admin/compras', 'POST', body);
    setBusy(false);
    if (!r.ok) return setErr(errMsg(r.data));
    if (r.data?.repetida) avisar.aviso('Esta compra ya estaba registrada');
    else avisar.ok('Compra registrada · ' + bs(r.data?.total ?? total));
    onListo();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={cerrar}>
        <div onClick={(e) => e.stopPropagation()} className="flex max-h-[96vh] w-full max-w-lg flex-col rounded-t-3xl bg-white md:rounded-3xl">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="font-serif text-2xl font-extrabold text-vino-800">Nueva compra</h2>
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><X size={18} /></button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-stone-500">Proveedor
                <select value={prov} onChange={(e) => setProv(e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {provs.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </label>
              <label className="block text-xs text-stone-500">Fecha
                <input type="date" max={hoyBO()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </label>
            </div>

            {nuevoProv ? (
              <div className="space-y-2 rounded-2xl bg-stone-50 p-3">
                <input placeholder="Nombre del proveedor" value={nuevoProv.nombre} onChange={(e) => setNuevoProv({ ...nuevoProv, nombre: e.target.value })} />
                <input type="tel" inputMode="tel" placeholder="Teléfono (opcional)" value={nuevoProv.telefono} onChange={(e) => setNuevoProv({ ...nuevoProv, telefono: e.target.value })} />
                <div className="flex gap-2">
                  <button type="button" onClick={guardarProv} className="flex-1 rounded-full bg-vino-800 py-2.5 text-sm font-bold text-white">Guardar proveedor</button>
                  <button type="button" onClick={() => setNuevoProv(null)} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 ring-1 ring-stone-300">Cancelar</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setNuevoProv({ nombre: '', telefono: '' })} className="text-xs font-bold text-vino-800 underline">Nuevo proveedor</button>
            )}

            <p className="text-xs font-semibold text-stone-500">¿De dónde salió la plata?</p>
            <div className="grid grid-cols-1 gap-2">
              {METODOS.map(([v, t]) => (
                <button key={v} type="button" onClick={() => setMetodo(v)} className={`rounded-xl py-2.5 text-sm font-semibold ${metodo === v ? 'bg-vino-800 text-white' : 'bg-stone-100 text-stone-700'}`}>{t}</button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto..." style={{ paddingLeft: '2.75rem' }} />
              </div>
              <button type="button" onClick={() => setCam(true)} className="shrink-0 rounded-xl bg-vino-800 px-4 text-sm font-semibold text-white">Escanear</button>
            </div>

            {resultados.length > 0 && (
              <ul className="space-y-1 rounded-2xl bg-stone-50 p-2">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => agregar(p)} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-white">
                      <span className="truncate text-sm font-semibold">{p.nombre}</span>
                      <span className="shrink-0 text-xs text-stone-500">{p.unidad}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {productos && q.trim() && !resultados.length && <p className="text-center text-sm text-stone-500">No hay productos con esa búsqueda.</p>}

            <ul className="space-y-2">
              {lineas.map((l) => {
                const dec = admiteDecimales(l.unidad);
                const sub = r2(n(l.total));
                const unit = n(l.cantidad) > 0 && sub > 0 ? r2(sub / n(l.cantidad)) : null;
                return (
                  <li key={l.id} className="rounded-2xl bg-stone-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{l.nombre}</p>
                        {l.actual != null && <p className="text-xs text-stone-500">{'Costo actual ' + bs(l.actual) + '/' + l.unidad}</p>}
                        <AvisoCosto l={l} unit={unit} />
                      </div>
                      <button type="button" onClick={() => quitar(l.id)} aria-label="Quitar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={15} /></button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="text-[11px] text-stone-500">{'Cantidad (' + l.unidad + ')'}
                        <input type="number" inputMode={dec ? 'decimal' : 'numeric'} step={dec ? 'any' : '1'} min="0" placeholder="0" value={l.cantidad} onChange={(e) => cambiar(l.id, 'cantidad', e.target.value)} />
                      </label>
                      <label className="text-[11px] text-stone-500">Total pagado Bs
                        <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={l.total} onChange={(e) => cambiar(l.id, 'total', e.target.value)} />
                      </label>
                      <div className="text-right">
                        <p className="text-[11px] text-stone-500">Te cuesta</p>
                        <p className="pt-2 font-extrabold text-stone-900">{unit == null ? '—' : bs(unit) + '/' + l.unidad}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
              {!lineas.length && <li className="py-6 text-center text-sm text-stone-500">Busca o escanea los productos que compraste.</li>}
            </ul>

            <input placeholder="Nota (opcional)" maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>

          <div className="space-y-2 border-t border-stone-100 p-4">
            {err && <p className="text-center text-sm font-semibold text-red-600">{err}</p>}
            <button type="button" onClick={guardar} disabled={busy || !lineas.length} className="w-full rounded-full bg-vino-800 py-4 text-base font-bold text-white disabled:opacity-50">
              {busy ? 'Guardando...' : 'Guardar compra · ' + bs(total)}
            </button>
          </div>
        </div>
      </div>
      {cam && <Escaner titulo="Escanear producto comprado" onCodigo={leerCodigo} onCerrar={() => setCam(false)} />}
    </>
  );
}

export default function Compras() {
  const [per, setPer] = useState('7d');
  const [compras, setCompras] = useState(null);
  const [fallo, setFallo] = useState('');
  const [nueva, setNueva] = useState(false);

  const cargar = useCallback(async () => {
    const [d, h] = rango(per);
    const r = await api('/api/admin/compras?desde=' + d + '&hasta=' + h);
    if (r.status === 401) return;
    setFallo(r.ok ? '' : errMsg(r.data));
    setCompras(r.ok && Array.isArray(r.data) ? r.data : []);
  }, [per]);

  useEffect(() => { cargar(); }, [cargar]);

  const resumen = useMemo(() => {
    const act = (compras || []).filter((c) => c.estado !== 'anulada');
    return { n: act.length, total: act.reduce((s, c) => s + Number(c.total), 0) };
  }, [compras]);

  async function anular(c) {
    const ok = await confirmar({ titulo: '¿Anular la compra #' + c.id + '?', texto: 'Se devuelve el stock que había entrado. El costo del producto no se revierte.', ok: 'Sí, anular', cancelar: 'Volver', peligro: true });
    if (!ok) return;
    const r = await api('/api/admin/compras', 'POST', { accion: 'anular', id: c.id });
    if (r.ok) avisar.ok('Compra anulada'); else avisar.error(errMsg(r.data));
    cargar();
  }

  return (
    <main className="fade-in px-4 pb-24 pt-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-extrabold text-vino-800">Compras</h1>
          <p className="text-sm text-stone-500">Mercadería que compras: sube el stock y actualiza el costo.</p>
        </div>
        <button type="button" onClick={() => setNueva(true)} className="flex shrink-0 items-center gap-2 rounded-full bg-vino-800 px-5 py-2.5 text-sm font-bold text-white shadow"><Plus size={18} /> Nueva</button>
      </div>

      {fallo && <p className="mb-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{fallo}</p>}

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {[['hoy', 'Hoy'], ['ayer', 'Ayer'], ['7d', '7 días'], ['mes', 'Este mes']].map(([v, t]) => (
          <button key={v} type="button" onClick={() => setPer(v)} className={chip(per === v)}>{t}</button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-center">
        {[['Compras', resumen.n, 'text-vino-800'], ['Total comprado', bs(resumen.total), 'text-amber-700']].map(([t, v, c]) => (
          <div key={t} className="rounded-2xl bg-white p-3 shadow-card">
            <p className={`text-lg font-extrabold ${c}`}>{v}</p>
            <p className="text-xs text-stone-500">{t}</p>
          </div>
        ))}
      </div>

      {compras === null ? (
        <div className="space-y-2"><div className="skeleton h-20" /><div className="skeleton h-20" /><div className="skeleton h-20" /></div>
      ) : (
        <ul className="space-y-3">
          {compras.map((c) => <CompraCard key={c.id} c={c} onAnular={anular} />)}
          {!compras.length && !fallo && (
            <li className="py-12 text-center text-stone-500"><Inbox className="mx-auto mb-2 text-vino-300" /> No hay compras en este período.</li>
          )}
        </ul>
      )}

      {nueva && <NuevaCompra onCerrar={() => setNueva(false)} onListo={() => { setNueva(false); cargar(); }} />}
    </main>
  );
}
