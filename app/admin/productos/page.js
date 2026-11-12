'use client';
import { confirmar, avisar, avisoAuto } from '@/lib/avisos';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Pencil, Trash2, X, ImagePlus, Lock } from 'lucide-react';
import ProductoForm from '@/components/ProductoForm';
import { errMsg } from '@/lib/cliente';
import { admiteDecimales } from '@/lib/unidades';

const vacio = { id: null, nombre: '', categoria_id: '', precio_menor: '', precio_mayor: '', mayor_desde: '', unidad: 'kg', disponible: true, costo: '', stock: '', stock_min: '', imagen_url: '', imagen_public_id: '', codigo: '' };
const bs = (v) => (v == null ? '—' : Number(v).toFixed(2));
const mini = (u) => u.replace('/upload/', '/upload/f_auto,q_auto,w_160,h_160,c_fill/');
const nz = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
const fmt = (v) => String(Math.round(Number(v) * 1000) / 1000);
const gan = (precio, costo) => { const m = nz(precio), c = nz(costo); return m == null || c == null ? null : Math.round((m - c) * 100) / 100; };

function Info({ p }) {
  const s = nz(p.stock), mn = nz(p.stock_min), c = nz(p.costo), g = gan(p.precio_menor, p.costo);
  const bajo = s != null && mn != null && s <= mn;
  const chip = 'rounded-full px-2 py-0.5 ';
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
      {s == null
        ? <span className={chip + 'bg-stone-100 text-stone-500'}>Sin control de stock</span>
        : <span className={chip + (s <= 0 ? 'bg-red-100 text-red-700' : bajo ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700')}>{'Stock ' + fmt(s) + ' ' + (p.unidad || '')}</span>}
      {g == null
        ? <span className={chip + 'bg-stone-100 text-stone-500'}>Sin costo</span>
        : <span className={chip + (g < 0 ? 'bg-red-100 text-red-700' : 'bg-vino-50 text-vino-800')}>{'Gana Bs ' + g.toFixed(2) + (c > 0 ? ' · ' + Math.round((g / c) * 100) + '%' : '')}</span>}
    </p>
  );
}

function Switch({ on, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label="Mostrar en la tienda" onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-green-500' : 'bg-stone-300'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function Admin() {
  const [auth, setAuth] = useState(null);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [data, setData] = useState({ productos: [], categorias: [] });
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [toast, setToast] = useState('');
  const [st, setSt] = useState(null);

  const aviso = avisoAuto;

  async function cargar() {
    try {
      const r = await fetch('/api/admin/productos');
      if (r.status === 401) return setAuth(false);
      setData(await r.json());
      setAuth(true);
    } catch { aviso('Sin conexión'); }
  }
  useEffect(() => { cargar(); }, []);

  async function login(e) {
    e.preventDefault();
    setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
    if (r.ok) { window.dispatchEvent(new Event('admin-auth')); cargar(); }
    else setErr(r.status === 429 ? 'Demasiados intentos. Espera unos minutos.' : 'Clave incorrecta');
  }

  async function subir(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return aviso('La foto pesa más de 8 MB');
    setBusy(true);
    try {
      const s = await (await fetch('/api/admin/upload', { method: 'POST' })).json();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', s.apiKey);
      fd.append('timestamp', s.timestamp);
      fd.append('folder', s.folder);
      fd.append('signature', s.signature);
      const r = await (await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: 'POST', body: fd })).json();
      if (r.secure_url) setF((x) => ({ ...x, imagen_url: r.secure_url, imagen_public_id: r.public_id }));
      else aviso('Error al subir la foto');
    } catch { aviso('Error al subir la foto'); }
    finally { setBusy(false); }
  }

  async function guardar(e) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch('/api/admin/productos', { method: 'POST', body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) { setF(null); aviso('Producto guardado'); cargar(); } else aviso(errMsg(await r.json().catch(() => null)));
  }

  async function alternar(p) {
    await fetch('/api/admin/productos', { method: 'PUT', body: JSON.stringify({ id: p.id, disponible: !p.disponible }) });
    aviso(p.disponible ? 'Oculto en la tienda' : 'Visible en la tienda');
    cargar();
  }

  async function borrar(p) {
    if (!(await confirmar({ titulo: '¿Borrar "' + p.nombre + '"?', texto: 'También se elimina su foto. No se puede deshacer.', ok: 'Sí, borrar', peligro: true }))) return;
    await fetch('/api/admin/productos?id=' + p.id, { method: 'DELETE' });
    aviso('Producto borrado');
    cargar();
  }

  async function guardarStock() {
    const c = Number(st.cant);
    if (st.cant === '' || !Number.isFinite(c)) return aviso('Escribe una cantidad');
    if (st.modo === 'ingreso' && c <= 0) return aviso('La entrada debe ser mayor a 0');
    if (st.modo === 'ajuste' && c < 0) return aviso('No puede ser negativo');
    if (st.modo === 'merma' && c <= 0) return aviso('Escribe cuánto se perdió.');
    if (!admiteDecimales(st.p.unidad) && !Number.isInteger(c)) return aviso('Este producto se cuenta en números enteros (por ejemplo 5, no 5.5).');
    const actual = Number(st.p.stock) || 0;
    if (st.modo === 'merma' && c > actual) return aviso('Solo tienes ' + fmt(actual) + ' ' + (st.p.unidad || '') + ' en stock.');
    const delta = st.modo === 'ajuste' ? Math.round((c - actual) * 1000) / 1000 : st.modo === 'merma' ? -c : c;
    if (delta === 0) return aviso('Sin cambios');
    setBusy(true);
    const r = await fetch('/api/admin/stock', { method: 'POST', body: JSON.stringify({ producto_id: String(st.p.id), cantidad: delta, motivo: st.modo }) });
    setBusy(false);
    if (r.ok) { setSt(null); setF((x) => (x && x.id === st.p.id ? { ...x, stock: Math.round(((Number(x.stock) || 0) + delta) * 1000) / 1000 } : x)); aviso('Stock actualizado'); cargar(); } else aviso(errMsg(await r.json().catch(() => null)));
  }

  const editar = (p) => setF({ ...p, precio_menor: p.precio_menor ?? '', precio_mayor: p.precio_mayor ?? '', mayor_desde: p.mayor_desde ?? '', costo: p.costo ?? '', stock: p.stock ?? '', stock_min: p.stock_min ?? '', imagen_url: p.imagen_url || '', imagen_public_id: p.imagen_public_id || '', codigo: p.codigo ?? '' });

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.productos.filter((p) =>
      (filtro === 'todos' || (filtro === 'visibles' ? p.disponible : !p.disponible)) &&
      (!t || (p.nombre + ' ' + p.categoria + ' ' + (p.codigo || '')).toLowerCase().includes(t)));
  }, [data.productos, q, filtro]);

  function buscarEnter(e) {
    if (e.key !== 'Enter') return;
    const t = q.trim();
    if (!/^\d{6,40}$/.test(t)) return;
    e.preventDefault();
    if (lista.length === 1) return editar(lista[0]);
    if (lista.length === 0) return setF({ ...vacio, codigo: t });
  }

  if (auth === null) return <p className="p-8 text-center text-stone-500">Cargando...</p>;

  if (!auth) return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-vino-950 via-vino-900 to-vino-700 p-4">
      <form onSubmit={login} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-7 shadow-lift">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-vino-800 text-oro-300"><Lock size={24} /></div>
        <div className="text-center">
          <h1 className="font-serif text-2xl font-extrabold text-vino-800">Panel de administración</h1>
          <p className="text-sm text-stone-500">Ingresa tu clave para continuar</p>
        </div>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Clave" autoFocus />
        <button className="w-full rounded-full bg-vino-800 py-3 font-bold text-white transition hover:bg-vino-700">Entrar</button>
        {err && <p className="text-center text-sm text-red-600">{err}</p>}
      </form>
    </div>
  );

  const vis = data.productos.filter((p) => p.disponible).length;
  const stats = [['Productos', data.productos.length, 'text-vino-800'], ['Visibles', vis, 'text-green-600'], ['Ocultos', data.productos.length - vis, 'text-stone-500']];
  const fl = (a) => `rounded-full px-4 py-1.5 text-sm font-semibold transition ${a ? 'bg-vino-800 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;

  return (
    <main className="px-4 pt-4">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-extrabold text-vino-800">Productos</h1>
          <p className="text-sm text-stone-500">Lo que activas aquí aparece en la tienda al instante.</p>
        </div>
        <button onClick={() => setF({ ...vacio })} className="flex items-center gap-2 rounded-full bg-vino-800 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-vino-700">
          <Plus size={18} /> Nuevo
        </button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {stats.map(([t, n, c]) => (
          <div key={t} className="rounded-2xl bg-white p-4 text-center shadow-card">
            <p className={`text-3xl font-extrabold ${c}`}>{n}</p>
            <p className="text-xs text-stone-500">{t}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar o escanear..." onKeyDown={buscarEnter} style={{ paddingLeft: '2.75rem' }} />
        </div>
        <div className="flex gap-2">
          {[['todos', 'Todos'], ['visibles', 'Visibles'], ['ocultos', 'Ocultos']].map(([v, t]) => (
            <button key={v} onClick={() => setFiltro(v)} className={fl(filtro === v)}>{t}</button>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {lista.map((p) => (
          <li key={p.id} className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ${p.disponible ? '' : 'opacity-70'}`}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-vino-50">
              {p.imagen_url ? <img src={mini(p.imagen_url)} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-vino-300"><ImagePlus size={22} /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.nombre}</p>
              <p className="truncate text-xs text-stone-500">{p.categoria}{p.codigo ? ' · ' + p.codigo : ''}</p>
              <p className="mt-0.5 text-xs"><span className="font-semibold text-vino-800">{p.precio_menor == null ? 'Sin precio' : 'Bs ' + bs(p.precio_menor) + ' / ' + (p.unidad || 'unidad')}</span>{p.precio_mayor != null && <span className="text-amber-700">{' · ' + (p.mayor_desde != null ? 'desde ' + fmt(p.mayor_desde) + ' ' + (p.unidad || '') + ': ' : 'mayor: ') + 'Bs ' + bs(p.precio_mayor)}</span>}</p>
              <Info p={p} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Switch on={p.disponible} onClick={() => alternar(p)} />
              <div className="flex gap-1">
                <button onClick={() => setSt({ p, modo: 'ingreso', cant: '' })} className="h-8 rounded-full bg-vino-50 px-3 text-xs font-bold text-vino-800">Stock</button>
                <button onClick={() => editar(p)} aria-label="Editar" className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-700"><Pencil size={15} /></button>
                <button onClick={() => borrar(p)} aria-label="Borrar" className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
          </li>
        ))}
        {lista.length === 0 && <li className="py-12 text-center text-stone-500">No hay productos con ese filtro.</li>}
      </ul>

      <AnimatePresence>
        {f && (
          <ProductoForm f={f} setF={setF} categorias={data.categorias} busy={busy} onSubir={subir}
            onGuardar={guardar} onCerrar={() => setF(null)} onStock={() => setSt({ p: f, modo: 'ingreso', cant: '' })} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}
            className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full bg-vino-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lift">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    {st && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setSt(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg space-y-3 rounded-t-3xl bg-white p-5 md:rounded-3xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-2xl font-extrabold text-vino-800">Stock</h2>
                <p className="truncate text-sm text-stone-500">{st.p.nombre + ' · actual: ' + (nz(st.p.stock) == null ? 'sin control' : fmt(st.p.stock) + ' ' + (st.p.unidad || ''))}</p>
              </div>
              <button type="button" onClick={() => setSt(null)} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[['ingreso', 'Entra mercadería'], ['ajuste', 'Corregir total'], ['merma', 'Se dañó o venció']].map(([v, t]) => (
                <button key={v} type="button" onClick={() => setSt({ ...st, modo: v, cant: '' })} className={(v === 'merma' ? 'col-span-2 ' : '') + 'rounded-xl py-2.5 text-sm font-semibold ' + (st.modo === v ? 'bg-vino-800 text-white' : 'bg-stone-100 text-stone-700')}>{t}</button>
              ))}
            </div>
            <label className="block text-xs text-stone-500">{st.modo === 'ingreso' ? 'Cantidad que entra (' + (st.p.unidad || '') + ')' : st.modo === 'merma' ? 'Cantidad que se perdió (' + (st.p.unidad || '') + ')' : 'Stock real que hay ahora (' + (st.p.unidad || '') + ')'}
              <input type="number" inputMode={admiteDecimales(st.p.unidad) ? 'decimal' : 'numeric'} step={admiteDecimales(st.p.unidad) ? 'any' : '1'} min="0" value={st.cant} onChange={(e) => setSt({ ...st, cant: e.target.value })} autoFocus />
            </label>
            {st.modo === 'merma' && <p className="text-xs text-stone-500">Queda registrado como pérdida (producto dañado o vencido) y baja el stock.</p>}
            <button onClick={guardarStock} disabled={busy} className="w-full rounded-full bg-vino-800 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Guardando...' : 'Guardar stock'}</button>
          </div>
        </div>
      )}
    </main>
  );
}
