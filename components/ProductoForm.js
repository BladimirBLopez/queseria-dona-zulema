'use client';
import { confirmar } from '@/lib/avisos';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { admiteDecimales } from '@/lib/unidades';
import Escaner from '@/components/Escaner';

const UNIDADES = [['kg', 'Kilo'], ['unidad', 'Unidad'], ['litro', 'Litro'], ['paquete', 'Paquete']];
const TABS = ['Producto', 'Precio', 'Costo y stock'];
const nz = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
const fmt = (v) => String(Math.round(Number(v) * 1000) / 1000);
const dinero = (v) => (Math.round(Number(v) * 100) / 100).toFixed(2);
const mini = (u) => u.replace('/upload/', '/upload/f_auto,q_auto,w_160,h_160,c_fill/');

function Switch({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-green-500' : 'bg-stone-300'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function Campo({ label, ayuda, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-stone-800">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs leading-relaxed text-stone-500">{ayuda}</span>}
    </label>
  );
}

function Fila({ pre, post, children }) {
  return (
    <div className="flex items-center gap-2 [&>input]:min-w-0">
      {pre && <span className="text-sm font-semibold text-stone-500">{pre}</span>}
      {children}
      {post && <span className="shrink-0 text-sm text-stone-500">{post}</span>}
    </div>
  );
}

function Ganancia({ valor, costo, u, prefijo }) {
  if (valor == null) return null;
  const neg = valor < 0;
  const pct = costo > 0 ? ' (' + Math.round((Math.abs(valor) / costo) * 100) + '%)' : '';
  const txt = (neg ? 'pierdes Bs ' : 'ganas Bs ') + dinero(Math.abs(valor)) + ' por cada ' + u + pct;
  const t = prefijo ? prefijo + txt : txt.charAt(0).toUpperCase() + txt.slice(1);
  return <p className={'rounded-xl p-2.5 text-center text-sm font-bold ' + (neg ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>{t}</p>;
}

export default function ProductoForm({ f, setF, categorias, busy, onSubir, onGuardar, onCerrar, onStock }) {
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState('');
  const [intento, setIntento] = useState(false);
  const [esp, setEsp] = useState(nz(f.precio_mayor) != null);
  const [cam, setCam] = useState(false);
  const quiereGuardar = useRef(false);

  const set = (k, v) => setF({ ...f, [k]: v });
  const rawU = String(f.unidad || '').trim();
  const u = /^unidad/i.test(rawU) ? 'unidad' : rawU.toLowerCase() || 'unidad';
  const esOtra = !UNIDADES.some(([v]) => v === f.unidad);
  const precio = nz(f.precio_menor);
  const costo = nz(f.costo);
  const pEsp = nz(f.precio_mayor);
  const desde = nz(f.mayor_desde);
  const g1 = precio != null && costo != null ? Math.round((precio - costo) * 100) / 100 : null;
  const g2 = esp && pEsp != null && costo != null ? Math.round((pEsp - costo) * 100) / 100 : null;
  const falta = !String(f.nombre).trim() || !f.categoria_id;
  const nuevo = !f.id;
  const dec = admiteDecimales(f.unidad);
  const stockAct = nz(f.stock);
  const minimo = nz(f.stock_min);
  const avisoBajo = minimo == null ? '' : stockAct == null
    ? 'Para que el aviso funcione, indica cuánto tienes ahora.'
    : stockAct <= minimo ? 'Ya estarías en stock bajo: tienes ' + fmt(stockAct) + ' ' + u + ' y el aviso es desde ' + fmt(minimo) + '.' : '';

  function irA(i) {
    if (nuevo && tab === 0 && i > 0 && falta) {
      setIntento(true);
      return setMsg('Escribe el nombre y elige la sección para continuar.');
    }
    setMsg('');
    setTab(i);
  }

  async function cerrar() {
    if (nuevo && String(f.nombre).trim() && !(await confirmar({ titulo: '¿Salir sin guardar?', texto: 'Perderás lo que escribiste de este producto.', ok: 'Salir', cancelar: 'Seguir editando', peligro: true }))) return;
    onCerrar();
  }

  function alternarEsp() {
    if (esp) setF({ ...f, precio_mayor: '', mayor_desde: '' });
    setEsp(!esp);
  }

  function enviar(e) {
    if (!quiereGuardar.current) { e.preventDefault(); return; }
    quiereGuardar.current = false;
    e.preventDefault();
    const neg = (v) => nz(v) != null && nz(v) < 0;
    const enPrecio = [f.precio_menor, f.precio_mayor, f.mayor_desde].some(neg);
    const enStock = [f.costo, f.stock_min, ...(nuevo ? [f.stock] : [])].some(neg);
    if (enPrecio || enStock) {
      setTab(enPrecio ? 1 : 2);
      return setMsg('Los precios, el costo y el stock no pueden ser negativos.');
    }
    const frac = (v) => nz(v) != null && !Number.isInteger(nz(v));
    if (!dec && ([f.mayor_desde, f.stock_min, ...(nuevo ? [f.stock] : [])].some(frac))) {
      setTab(frac(f.mayor_desde) ? 1 : 2);
      return setMsg('Con "' + u + '" solo se aceptan cantidades enteras (por ejemplo 5, no 5.5).');
    }
    if (falta) {
      setIntento(true);
      setTab(0);
      return setMsg('Escribe el nombre y elige la sección de la tienda.');
    }
    if (esp && (desde == null || desde <= 0)) {
      setTab(1);
      return setMsg('Escribe desde cuánto aplica el precio especial.');
    }
    if (esp && (pEsp == null || pEsp <= 0)) {
      setTab(1);
      return setMsg('Escribe el precio especial o apaga esa opción.');
    }
    setMsg('');
    onGuardar(e);
  }

  const tabCls = (a) => `relative rounded-full px-1 py-2 text-[13px] font-bold transition ${a ? 'bg-white text-vino-800 shadow' : 'text-stone-500'}`;
  const chip = (a) => `rounded-xl py-2.5 text-sm font-semibold transition ${a ? 'bg-vino-800 text-white' : 'bg-stone-100 text-stone-700'}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={cerrar}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <motion.form onSubmit={enviar} noValidate
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white md:rounded-3xl">

        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-serif text-2xl font-extrabold text-vino-800">{f.id ? 'Editar producto' : 'Nuevo producto'}</h2>
              <p className="truncate text-sm text-stone-500">
                {nuevo ? 'Paso ' + (tab + 1) + ' de 3 · ' : ''}{String(f.nombre).trim() || 'Sin nombre todavía'}{precio != null ? ' · Bs ' + dinero(precio) + ' / ' + u : ''}
              </p>
            </div>
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100"><X size={18} /></button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-stone-100 p-1">
            {TABS.map((t, i) => (
              <button key={t} type="button" onClick={() => irA(i)} className={tabCls(tab === i)}>
                {t}
                {i === 0 && intento && falta && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[20rem] flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {tab === 0 && (
            <>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-vino-200 p-3 hover:bg-vino-50">
                {f.imagen_url
                  ? <img src={mini(f.imagen_url)} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  : <span className="grid h-14 w-14 place-items-center rounded-xl bg-vino-50 text-vino-300"><ImagePlus size={22} /></span>}
                <span>
                  <span className="block text-sm font-semibold text-vino-800">{busy ? 'Subiendo...' : f.imagen_url ? 'Cambiar foto' : 'Subir foto'}</span>
                  <span className="block text-xs text-stone-500">Con buena luz y fondo limpio</span>
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onSubir(e.target.files?.[0])} />
              </label>

              <Campo label="Nombre del producto">
                <input placeholder="Ej: Queso calceño" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} className={intento && !String(f.nombre).trim() ? '!border-red-500' : ''} />
              </Campo>

              <Campo label="Código de barras (opcional)" ayuda="Escanéalo con el lector o escríbelo. Si no trae, genera uno interno.">
                <div className="flex gap-2">
                  <input inputMode="numeric" placeholder="Escanea o escribe" value={f.codigo || ''} onChange={(e) => set('codigo', e.target.value)} className="min-w-0 flex-1" />
                  <button type="button" onClick={() => set('codigo', '99' + String(Date.now()).slice(-8))} className="shrink-0 rounded-xl bg-vino-50 px-4 text-sm font-bold text-vino-800">Generar</button>
                  <button type="button" onClick={() => setCam(true)} className="shrink-0 rounded-xl bg-vino-800 px-4 text-sm font-bold text-white">Escanear</button>
                </div>
              </Campo>

              <Campo label="¿En qué sección de la tienda aparece?">
                <select value={f.categoria_id} onChange={(e) => set('categoria_id', e.target.value)} className={intento && !f.categoria_id ? '!border-red-500' : ''}>
                  <option value="">Elige una sección...</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.linea} › {c.nombre}</option>)}
                </select>
              </Campo>

              <div>
                <p className="mb-1 text-sm font-semibold text-stone-800">Se vende por</p>
                <div className="grid grid-cols-4 gap-2">
                  {UNIDADES.map(([v, t]) => (
                    <button key={v} type="button" onClick={() => set('unidad', v)} className={chip(f.unidad === v)}>{t}</button>
                  ))}
                </div>
                {esOtra ? (
                  <input className="mt-2" placeholder="Escribe la unidad (ej: caja, docena)" value={f.unidad} onChange={(e) => set('unidad', e.target.value)} />
                ) : (
                  <button type="button" onClick={() => set('unidad', '')} className="mt-2 text-xs font-semibold text-vino-800 underline">Otra unidad...</button>
                )}
              </div>
            </>
          )}

          {tab === 1 && (
            <>
              <Campo label={'¿Cuánto cuesta cada ' + u + '?'} ayuda={'Es lo que paga el cliente por cada ' + u + '.'}>
                <Fila pre="Bs">
                  <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={f.precio_menor} onChange={(e) => set('precio_menor', e.target.value)} />
                </Fila>
              </Campo>

              <div className="rounded-2xl bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Precio especial si compran más</p>
                    <p className="text-xs text-stone-500">Opcional</p>
                  </div>
                  <Switch on={esp} onClick={alternarEsp} label="Precio especial por cantidad" />
                </div>
                {esp && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Si llevan desde">
                        <Fila post={u}>
                          <input type="number" inputMode={dec ? 'decimal' : 'numeric'} step={dec ? 'any' : '1'} min="0" placeholder="5" value={f.mayor_desde} onChange={(e) => set('mayor_desde', e.target.value)} />
                        </Fila>
                      </Campo>
                      <Campo label={'Cada ' + u + ' cuesta'}>
                        <Fila pre="Bs">
                          <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={f.precio_mayor} onChange={(e) => set('precio_mayor', e.target.value)} />
                        </Fila>
                      </Campo>
                    </div>
                    <p className="text-xs leading-relaxed text-stone-500">El cliente verá este precio en la tienda desde esa cantidad.</p>
                    {pEsp != null && precio != null && pEsp > precio && (
                      <p className="rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800">El precio especial es más alto que el normal. Revísalo.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-vino-50 p-3">
                <p className="text-xs font-semibold text-vino-700">Así lo verá el cliente</p>
                <p className="mt-1 text-lg font-extrabold text-vino-900">{precio != null ? 'Bs ' + dinero(precio) + ' / ' + u : 'Consultar precio'}</p>
                {esp && pEsp != null && (
                  <p className="text-sm text-amber-800">
                    {desde != null ? 'Desde ' + fmt(desde) + ' ' + u + ': ' : 'Al por mayor: '}{'Bs ' + dinero(pEsp) + ' / ' + u}
                  </p>
                )}
              </div>
            </>
          )}

          {tab === 2 && (
            <>
              <Campo label={'¿Cuánto te cuesta a ti cada ' + u + '?'} ayuda="Solo lo ves tú. Sirve para calcular tu ganancia.">
                <Fila pre="Bs">
                  <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={f.costo} onChange={(e) => set('costo', e.target.value)} />
                </Fila>
              </Campo>
              <div className="space-y-2">
                <Ganancia valor={g1} costo={costo} u={u} />
                <Ganancia valor={g2} costo={costo} u={u} prefijo="Con el precio especial " />
              </div>

              {f.id ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-3">
                  <div>
                    <p className="text-sm font-semibold">Tienes ahora: {nz(f.stock) == null ? 'sin control' : fmt(f.stock) + ' ' + u}</p>
                    <p className="text-xs text-stone-500">Aquí registras lo que entra o corriges el total.</p>
                  </div>
                  <button type="button" onClick={onStock} className="h-9 shrink-0 rounded-full bg-vino-50 px-4 text-sm font-bold text-vino-800">Cambiar</button>
                </div>
              ) : (
                <Campo label="¿Cuánto tienes ahora? (opcional)" ayuda={dec ? 'Puedes usar decimales, por ejemplo 10.5.' : 'Solo números enteros, por ejemplo 12.'}>
                  <Fila post={u}>
                    <input type="number" inputMode={dec ? 'decimal' : 'numeric'} step={dec ? 'any' : '1'} min="0" placeholder="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} />
                  </Fila>
                </Campo>
              )}

              <Campo label="Avísame cuando queden menos de" ayuda={<>Es solo un aviso: no limita lo que puedes vender. Aparecerá en tu Inicio como Stock bajo.{avisoBajo && <b className="mt-1 block text-amber-700">{avisoBajo}</b>}</>}>
                <Fila post={u}>
                  <input type="number" inputMode={dec ? 'decimal' : 'numeric'} step={dec ? 'any' : '1'} min="0" placeholder="Ej: 3" value={f.stock_min} onChange={(e) => set('stock_min', e.target.value)} />
                </Fila>
              </Campo>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-3">
                <div>
                  <p className="text-sm font-semibold">Mostrar en la tienda</p>
                  <p className="text-xs text-stone-500">{f.disponible ? 'Los clientes lo ven ahora mismo.' : 'Guardado, pero los clientes no lo ven.'}</p>
                </div>
                <Switch on={f.disponible} onClick={() => set('disponible', !f.disponible)} label="Mostrar en la tienda" />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-stone-100 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {msg && <p className="mb-2 text-center text-sm font-semibold text-red-600">{msg}</p>}
          <div className="flex gap-2">
            {nuevo && tab > 0 && (
              <button type="button" onClick={() => irA(tab - 1)} aria-label="Atrás" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-stone-100"><ChevronLeft size={20} /></button>
            )}
            {nuevo && tab < 2 ? (
              <button key="siguiente" type="button" onClick={() => irA(tab + 1)} className="flex h-12 flex-1 items-center justify-center gap-1 rounded-full bg-vino-800 font-bold text-white transition hover:bg-vino-700">
                Siguiente <ChevronRight size={18} />
              </button>
            ) : (
              <button key="guardar" type="submit" onClick={() => { quiereGuardar.current = true; }} disabled={busy} className="h-12 flex-1 rounded-full bg-vino-800 font-bold text-white transition hover:bg-vino-700 disabled:opacity-50">
                {busy ? 'Espera...' : nuevo ? 'Guardar producto' : 'Guardar cambios'}
              </button>
            )}
          </div>
        </div>
      {cam && <Escaner titulo="Escanear código del producto" onCodigo={(c) => { set('codigo', c); return 'cerrar'; }} onCerrar={() => setCam(false)} />}
      </motion.form>
    </motion.div>
  );
}
