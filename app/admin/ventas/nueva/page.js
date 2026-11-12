'use client';
// caja-v3
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Minus, X, Trash2, Check, MessageCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { api, errMsg } from '@/lib/cliente';
import { avisar } from '@/lib/avisos';
import Escaner from '@/components/Escaner';
import { bs, hoyBO, reciboTexto, waLink } from '@/lib/fmt';
import { imprimirTicket } from '@/lib/ticket';

const METODOS = [['efectivo', 'Efectivo'], ['qr', 'QR'], ['transferencia', 'Transf.']];
const BILLETES = [10, 20, 50, 100, 200];
const n = (v) => Number(v) || 0;
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const normCod = (s) => { const t = String(s || '').trim(); return /^\d+$/.test(t) ? t.replace(/^0+/, '') : t.toLowerCase(); };
const r3 = (x) => Math.round(x * 1000) / 1000;
const nf = (v) => String(r3(Number(v) || 0)).replace('.', ',');
const esKg = (u) => ['kg', 'kilo', 'kilos'].includes(String(u || '').toLowerCase());
const uni = (p) => p.unidad || 'kg';
const paso = (u) => (esKg(u) ? 0.5 : 1);
const rapidas = (u) => (esKg(u) ? [0.25, 0.5, 1, 2] : [1, 2, 3, 5]);
const marca = (v, u) => (esKg(u) && v === 0.25 ? '¼' : esKg(u) && v === 0.5 ? '½' : String(v));
const titulo = (s) => String(s || '').split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const crearClave = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const guardado = () => {
  try {
    const m = localStorage.getItem('caja_metodo');
    return ['efectivo', 'qr', 'transferencia'].includes(m) ? m : 'efectivo';
  } catch { return 'efectivo'; }
};
const formVacio = () => ({ metodo: 'efectivo', descuento: '', nombre: '', tel: '', nota: '', fecha: hoyBO(), recibe: '' });

function precioDe(p, cant, tipo) {
  const menor = p.precio_menor != null ? Number(p.precio_menor) : null;
  const mayor = p.precio_mayor != null ? Number(p.precio_mayor) : null;
  const desde = p.mayor_desde != null && Number(p.mayor_desde) > 0 ? Number(p.mayor_desde) : null;
  const esp = mayor != null && (tipo === 'mayor' || (desde != null && cant >= desde));
  const v = esp ? mayor : (menor ?? mayor);
  return { precio: v == null ? 0 : v, esp };
}

function aplicar(l, tipo) {
  if (l.manual || !l.p) return l;
  const { precio } = precioDe(l.p, l.modo === 'monto' ? 0 : n(l.cantidad), tipo);
  return { ...l, precio: String(precio) };
}

function medir(l) {
  const p = r2(n(l.precio));
  if (l.modo === 'monto') {
    const m = r2(n(l.monto));
    return { cant: p > 0 ? r3(m / p) : 0, sub: m };
  }
  const c = n(l.cantidad);
  return { cant: c, sub: r2(c * p) };
}

const nuevaLinea = (p, cant, tipo) => aplicar({
  producto_id: String(p.id), nombre: p.nombre, unidad: uni(p), p, cantidad: String(cant), precio: '0', manual: false, modo: 'peso', monto: '',
}, tipo);

function teclear(buf, k, max) {
  if (k === 'del') return buf.length <= 1 ? '' : buf.slice(0, -1);
  if (k === ',') return buf.includes('.') ? buf : buf === '' ? '0.' : buf + '.';
  const nuevo = buf === '0' ? k : buf + k;
  const dec = nuevo.split('.')[1];
  if (dec && dec.length > max) return buf;
  if (nuevo.replace('.', '').length > 8) return buf;
  return nuevo;
}

function Teclado({ onKey }) {
  const teclas = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'del'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {teclas.map((k) => (
        <button key={k} type="button" onClick={() => onKey(k)} className="h-14 rounded-xl bg-stone-100 text-xl font-bold text-stone-900 active:bg-stone-200">
          {k === 'del' ? '⌫' : k}
        </button>
      ))}
    </div>
  );
}

const stop = (e) => e.stopPropagation();
const chip = (a) => `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${a ? 'bg-vino-800 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`;
const mini = (a) => `rounded-full px-4 py-2 text-sm font-bold transition ${a ? 'bg-vino-800 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`;

export default function NuevaVenta() {
  const [productos, setProductos] = useState(null);
  const [negocio, setNegocio] = useState('');
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const [tipo, setTipo] = useState('menor');
  const [lineas, setLineas] = useState([]);
  const [kp, setKp] = useState(null);
  const [ticket, setTicket] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [otroMonto, setOtroMonto] = useState(false);
  const [recibeNuevo, setRecibeNuevo] = useState(true);
  const [mas, setMas] = useState(false);
  const [f, setF] = useState(formVacio());
  const [libre, setLibre] = useState(null);
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hecho, setHecho] = useState(null);
  const [pedidoId, setPedidoId] = useState(null);
  const intento = useRef({ sig: '', clave: '' });

  useEffect(() => {
    (async () => {
      const [pr, ng, vs] = await Promise.all([api('/api/admin/productos'), api('/api/admin/identidad'), api('/api/admin/ventas')]);
      const lista = pr.data?.productos || [];
      setProductos(lista);
      setNegocio(ng.data?.nombre || '');
      setF((x) => ({ ...x, metodo: guardado() }));
      const mapa = new Map();
      for (const v of Array.isArray(vs.data) ? vs.data : []) {
        const nom = String(v.cliente_nombre || '').trim();
        if (!nom) continue;
        const k = nom.toLowerCase();
        const ya = mapa.get(k);
        if (!ya) mapa.set(k, { nombre: nom, tel: v.cliente_tel || '' });
        else if (!ya.tel && v.cliente_tel) ya.tel = v.cliente_tel;
      }
      setClientes([...mapa.values()].slice(0, 100));
      const pid = new URLSearchParams(location.search).get('pedido');
      if (pid) {
        const pe = await api('/api/admin/pedidos?estado=pendiente');
        const ped = (Array.isArray(pe.data) ? pe.data : []).find((x) => String(x.id) === pid);
        if (ped) {
          setPedidoId(ped.id);
          setF((x) => ({ ...x, nombre: ped.cliente_nombre || '' }));
          setLineas(ped.items.map((it) => {
            const prod = lista.find((x) => String(x.id) === String(it.producto_id));
            return aplicar({
              producto_id: String(it.producto_id || ''), nombre: it.nombre, unidad: it.unidad || 'kg', p: prod || null,
              cantidad: String(it.cantidad), precio: String(it.precio ?? 0), manual: !prod || it.precio != null, modo: 'peso', monto: '',
            }, 'menor');
          }));
        }
      }
    })();
  }, []);

  async function recargar() {
    const r = await api('/api/admin/productos');
    if (r.ok) setProductos(r.data?.productos || []);
  }

  const categorias = useMemo(() => [...new Set((productos || []).map((p) => p.categoria).filter(Boolean))], [productos]);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (productos || [])
      .filter((p) => (cat === 'todas' || p.categoria === cat) && (!t || (p.nombre + ' ' + (p.categoria || '')).toLowerCase().includes(t)))
      .slice(0, 80);
  }, [productos, q, cat]);

  const lineaDe = (id) => lineas.find((l) => l.producto_id === String(id));
  const cantDe = (l) => (l.modo === 'monto' ? medir(l).cant : n(l.cantidad));

  function abrirLinea(i) {
    const l = lineas[i];
    if (!l) return;
    const inicial = l.modo === 'monto' ? l.monto : l.cantidad;
    setKp({ idx: i, id: l.producto_id, p: l.p, nombre: l.nombre, unidad: l.unidad, modo: l.modo, buf: String(inicial || ''), fresh: true, precio: l.precio, manual: l.manual, editPrecio: false });
  }

  const lector = useRef({ buf: '', t: 0 }); // lector-v1
  const alCodigo = useRef(null);
  alCodigo.current = leerCodigo;
  const lectorLibre = !cobrando && !kp && !libre && !ticket && !cam && !hecho;
  useEffect(() => {
    if (!lectorLibre) { lector.current = { buf: '', t: 0 }; return; }
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const ahora = Date.now();
      const r = lector.current;
      if (e.key === 'Enter') {
        const c = r.buf;
        r.buf = '';
        if (c.length >= 4 && ahora - r.t < 120) {
          e.preventDefault();
          e.stopPropagation();
          setQ('');
          if (alCodigo.current) alCodigo.current(c);
        }
        return;
      }
      if (e.key.length !== 1) return;
      if (ahora - r.t > 100) r.buf = '';
      r.buf += e.key;
      r.t = ahora;
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [lectorLibre]);

  function leerCodigo(c) {
    const p = (productos || []).find((x) => x.codigo && normCod(x.codigo) === normCod(c));
    if (!p) { avisar.aviso('Código no registrado', c); return; }
    tocar(p);
    if (esKg(uni(p))) return 'cerrar';
    avisar.ok(p.nombre + ' agregado');
  }

  function tocar(p) {
    const i = lineas.findIndex((l) => l.producto_id === String(p.id));
    if (esKg(uni(p))) {
      if (i >= 0) return abrirLinea(i);
      return setKp({ idx: -1, id: String(p.id), p, nombre: p.nombre, unidad: uni(p), modo: 'peso', buf: '', fresh: false, precio: '', manual: false, editPrecio: false });
    }
    setLineas((ls) => {
      const j = ls.findIndex((l) => l.producto_id === String(p.id));
      if (j < 0) return [...ls, nuevaLinea(p, 1, tipo)];
      return ls.map((l, x) => (x === j ? aplicar({ ...l, modo: 'peso', cantidad: String(r3(cantDe(l) + 1)), monto: '' }, tipo) : l));
    });
  }

  function ajustar(i, d) {
    setLineas((ls) => {
      const l = ls[i];
      if (!l) return ls;
      const nueva = r3(cantDe(l) + d);
      if (nueva <= 0) return ls.filter((_, x) => x !== i);
      return ls.map((z, x) => (x === i ? aplicar({ ...l, modo: 'peso', cantidad: String(nueva), monto: '' }, tipo) : z));
    });
  }

  function guardarKp() {
    const k = kp;
    const valor = n(k.buf);
    if (!(valor > 0)) return;
    const campos = k.modo === 'monto'
      ? { modo: 'monto', monto: String(r2(valor)), cantidad: '' }
      : { modo: 'peso', cantidad: String(r3(valor)), monto: '' };
    setLineas((ls) => {
      const j = k.id ? ls.findIndex((l) => l.producto_id === k.id) : k.idx;
      if (j >= 0 && ls[j]) {
        const base = { ...ls[j], ...campos };
        return ls.map((l, x) => (x === j ? aplicar(k.manual ? { ...base, manual: true, precio: k.precio } : { ...base, manual: false }, tipo) : l));
      }
      if (!k.p) return ls;
      const base = { ...nuevaLinea(k.p, 1, tipo), ...campos };
      return [...ls, aplicar(k.manual ? { ...base, manual: true, precio: k.precio } : { ...base, manual: false }, tipo)];
    });
    setKp(null);
  }

  const cambiarTipo = (t) => { setTipo(t); setLineas((ls) => ls.map((l) => aplicar(l, t))); };

  const elegirNombre = (v) => {
    const c = clientes.find((x) => x.nombre.toLowerCase() === v.trim().toLowerCase());
    setF((x) => ({ ...x, nombre: v, tel: x.tel || (c ? c.tel : '') }));
  };

  const teclaRecibe = (k) => {
    setF((x) => ({ ...x, recibe: teclear(recibeNuevo ? '' : x.recibe, k, 2) }));
    setRecibeNuevo(false);
  };
  const ponerRecibe = (v) => { setF((x) => ({ ...x, recibe: String(v) })); setRecibeNuevo(true); };

  function abrirCobro() {
    setErr(''); setTicket(false); setOtroMonto(false); setMas(false); setRecibeNuevo(true);
    setF((x) => ({ ...x, recibe: '' }));
    setCobrando(true);
  }

  const medidas = lineas.map(medir);
  const bruto = r2(medidas.reduce((a, m) => a + m.sub, 0));
  const desc = Math.min(bruto, Math.max(0, n(f.descuento)));
  const total = r2(bruto - desc);
  const recibe = n(f.recibe);
  const vuelto = f.metodo === 'efectivo' && recibe > total ? r2(recibe - total) : 0;
  const falta = f.metodo === 'efectivo' && f.recibe !== '' && recibe < total ? r2(total - recibe) : 0;
  const sugeridos = (() => {
    const s = BILLETES.filter((b) => b > total).slice(0, 4);
    return s.length ? s : total > 0 ? [Math.ceil((total + 0.01) / 100) * 100] : [];
  })();
  const items = lineas.length;

  const kpPrecio = kp ? (kp.manual || !kp.p ? n(kp.precio) : precioDe(kp.p, kp.modo === 'monto' ? 0 : n(kp.buf), tipo).precio) : 0;
  const kpEsp = kp && kp.p && !kp.manual ? precioDe(kp.p, kp.modo === 'monto' ? 0 : n(kp.buf), tipo).esp : false;
  const kpCant = kp ? (kp.modo === 'monto' ? (kpPrecio > 0 ? r3(n(kp.buf) / kpPrecio) : 0) : n(kp.buf)) : 0;
  const kpSub = kp ? (kp.modo === 'monto' ? r2(n(kp.buf)) : r2(kpCant * kpPrecio)) : 0;
  const kpStock = kp && kp.p && kp.p.stock != null ? Number(kp.p.stock) : null;

  function cambiarModoKp(m) {
    if (kp.modo === m) return;
    const nuevo = m === 'monto' ? (kpSub > 0 ? String(kpSub) : '') : (kpCant > 0 ? String(kpCant) : '');
    setKp({ ...kp, modo: m, buf: nuevo, fresh: true });
  }

  async function confirmar() {
    setErr('');
    if (!lineas.length) return setErr('Agrega al menos un producto.');
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      const m = medidas[i];
      if (!(n(l.precio) > 0)) return setErr('"' + l.nombre + '" no tiene precio. Ponle precio desde el ticket.');
      if (!(m.cant > 0) || !(m.sub > 0)) return setErr('Revisa la cantidad o el monto de "' + l.nombre + '".');
    }
    if (falta > 0) return setErr('El monto recibido no alcanza: faltan ' + bs(falta) + '.');
    const nombre = titulo(f.nombre);
    const body = {
      items: lineas.map((l, i) => {
        const m = medidas[i];
        return {
          producto_id: l.producto_id || null, nombre: l.nombre, unidad: l.unidad, cantidad: m.cant, precio: r2(n(l.precio)),
          lista: l.p ? precioDe(l.p, m.cant, tipo).precio : r2(n(l.precio)), monto: l.modo === 'monto' ? m.sub : null,
        };
      }),
      metodo: f.metodo, tipo, descuento: desc, cliente_nombre: nombre, cliente_tel: f.tel, nota: f.nota,
      fecha: f.fecha && f.fecha !== hoyBO() ? f.fecha : null, pedido_id: pedidoId,
    };
    const sig = JSON.stringify(body);
    if (intento.current.sig !== sig) intento.current = { sig, clave: crearClave() };
    body.clave = intento.current.clave;
    setBusy(true);
    const r = await api('/api/admin/ventas', 'POST', body);
    setBusy(false);
    if (!r.ok) return setErr(errMsg(r.data));
    try { localStorage.setItem('caja_metodo', f.metodo); } catch {}
    setHecho({
      id: r.data.id, total: r.data.total, pagado: total, descuento: desc, metodo: f.metodo, vuelto,
      cliente_nombre: nombre, cliente_tel: f.tel, fecha: new Date().toISOString(),
      items: lineas.map((l, i) => ({ nombre: l.nombre, unidad: l.unidad, cantidad: medidas[i].cant, precio: r2(n(l.precio)), subtotal: medidas[i].sub })),
    });
    setCobrando(false);
    setTicket(false);
    intento.current = { sig: '', clave: '' };
  }

  function otra() {
    setHecho(null); setLineas([]); setF({ ...formVacio(), metodo: guardado() }); setPedidoId(null); setQ(''); setCat('todas'); setErr(''); setMas(false);
    intento.current = { sig: '', clave: '' };
    history.replaceState(null, '', '/admin/ventas/nueva');
    recargar();
  }

  if (!productos) return <p className="p-8 text-center text-stone-500">Cargando...</p>;

  if (hecho) {
    return (
      <main className="px-4 pt-10 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-600"><Check size={40} /></span>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">{'Venta #' + hecho.id + ' registrada'}</h1>
        <p className="mt-1 text-4xl font-extrabold text-stone-900">{bs(hecho.total)}</p>
        {hecho.vuelto > 0 && (
          <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-green-50 py-3">
            <p className="text-xs font-semibold text-green-700">Entrega de vuelto</p>
            <p className="text-3xl font-extrabold text-green-700">{bs(hecho.vuelto)}</p>
          </div>
        )}
        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
          <button onClick={otra} className="rounded-full bg-vino-800 py-3.5 font-bold text-white">Nueva venta</button>
          <a href={waLink(hecho.cliente_tel, reciboTexto(hecho, negocio))} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-green-500 py-3 font-bold text-white"><MessageCircle size={18} /> Enviar recibo por WhatsApp</a>
          <button onClick={() => imprimirTicket(hecho, negocio)} className="rounded-full bg-white py-3 font-semibold text-vino-800 ring-1 ring-vino-800/30">Imprimir ticket</button>
          <Link href="/admin/ventas" className="rounded-full bg-white py-3 font-semibold text-stone-700 ring-1 ring-stone-200">Ver ventas</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-36 pt-4">
      <div className="mb-3 flex items-center gap-3">
        <Link href="/admin/ventas" aria-label="Volver" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-card"><ArrowLeft size={18} /></Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-stone-900">{'Nueva venta' + (pedidoId ? ' · pedido #' + pedidoId : '')}</h1>
        <div className="flex shrink-0 rounded-full bg-stone-200 p-0.5">
          <button onClick={() => cambiarTipo('menor')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${tipo === 'menor' ? 'bg-white text-vino-800 shadow-sm' : 'text-stone-600'}`}>Menor</button>
          <button onClick={() => cambiarTipo('mayor')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${tipo === 'mayor' ? 'bg-white text-vino-800 shadow-sm' : 'text-stone-600'}`}>Mayor</button>
        </div>
      </div>

      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto..." style={{ paddingLeft: '2.75rem' }} />
        </div>
        <button onClick={() => setCam(true)} className="shrink-0 rounded-xl bg-vino-800 px-4 text-sm font-semibold text-white">Escanear</button>
        <button onClick={() => setLibre({ nombre: '', precio: '' })} className="shrink-0 rounded-xl bg-white px-4 text-sm font-semibold text-stone-700 ring-1 ring-stone-300">Libre</button>
      </div>

      {libre && (
        <div className="mb-2 flex gap-2 rounded-2xl bg-white p-3 shadow-card">
          <input placeholder="Descripción" value={libre.nombre} onChange={(e) => setLibre({ ...libre, nombre: e.target.value })} />
          <input type="number" inputMode="decimal" placeholder="Bs" value={libre.precio} onChange={(e) => setLibre({ ...libre, precio: e.target.value })} style={{ width: '6rem' }} />
          <button onClick={() => {
            if (!libre.nombre.trim() || !(n(libre.precio) > 0)) return;
            setLineas((ls) => [...ls, { producto_id: '', nombre: libre.nombre.trim(), unidad: 'u', p: null, cantidad: '1', precio: String(n(libre.precio)), manual: true, modo: 'peso', monto: '' }]);
            setLibre(null);
          }} className="rounded-xl bg-vino-800 px-4 font-bold text-white">OK</button>
        </div>
      )}

      {categorias.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          <button onClick={() => setCat('todas')} className={chip(cat === 'todas')}>Todas</button>
          {categorias.map((c) => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {lista.map((p) => {
          const l = lineaDe(p.id);
          const st = p.stock != null ? Number(p.stock) : null;
          const base = precioDe(p, 0, tipo).precio;
          const i = l ? lineas.indexOf(l) : -1;
          return (
            <div key={p.id} className={`flex min-h-[88px] flex-col rounded-2xl border transition ${l ? 'border-vino-800 bg-vino-50' : 'border-stone-200 bg-white'}`}>
            <button onClick={() => tocar(p)} className="flex flex-1 flex-col justify-between p-3 text-left">
              <span className={`line-clamp-2 text-sm font-bold leading-tight text-stone-900`}>{p.nombre}</span>
              <span className="mt-2 block">
                <span className="block text-sm font-extrabold text-vino-800">{base > 0 ? bs(base) + '/' + uni(p) : 'Sin precio'}</span>
                {st != null && <span className={`block text-[11px] font-semibold ${st <= 0 ? 'text-red-600' : 'text-stone-500'}`}>{'Stock ' + nf(st)}</span>}
              </span>
              </button>
              {l && (
                <div className="flex items-center gap-2 px-2 pb-2">
                  <button onClick={() => ajustar(i, -paso(l.unidad))} aria-label="Quitar uno" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-vino-800 ring-1 ring-vino-800/40"><Minus size={18} /></button>
                  <button onClick={() => abrirLinea(i)} aria-label="Escribir cantidad" className="min-w-0 flex-1 rounded-full bg-white py-2 text-center text-sm font-extrabold text-vino-800 ring-1 ring-stone-200">{nf(cantDe(l))}</button>
                  <button onClick={() => ajustar(i, paso(l.unidad))} aria-label="Agregar uno" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-vino-800 text-white"><Plus size={18} /></button>
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && <p className="col-span-2 py-10 text-center text-stone-500 md:col-span-3">No hay productos con esa búsqueda.</p>}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4 md:left-64">
        <div className="mx-auto flex max-w-4xl items-stretch gap-2">
          <button disabled={!items} onClick={() => setTicket(true)}
            className="flex min-w-0 flex-1 items-center justify-between rounded-full bg-white px-5 py-3 text-left shadow-lift ring-1 ring-stone-200 disabled:opacity-60">
            <span className="text-sm font-semibold text-stone-600">{items ? items + (items === 1 ? ' producto' : ' productos') : 'Sin productos'}</span>
            <span className="font-extrabold text-stone-900">{bs(bruto)}</span>
          </button>
          <button disabled={!items} onClick={abrirCobro} className="shrink-0 rounded-full bg-vino-800 px-7 py-3 font-bold text-white shadow-lift disabled:bg-stone-400">Cobrar</button>
        </div>
      </div>

      {cam && <Escaner titulo="Escanear producto" onCodigo={leerCodigo} onCerrar={() => setCam(false)} />}

      {ticket && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setTicket(false)}>
          <div onClick={stop} className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white md:rounded-3xl">
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="text-lg font-bold text-stone-900">Ticket</h2>
              <button onClick={() => setTicket(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><X size={18} /></button>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
              {lineas.map((l, i) => {
                const m = medidas[i];
                const auto = l.p ? precioDe(l.p, m.cant, tipo) : null;
                const cambiado = auto && l.manual && Math.abs(auto.precio - n(l.precio)) > 0.001;
                const st = l.p && l.p.stock != null ? Number(l.p.stock) : null;
                return (
                  <li key={l.producto_id + '-' + i} className="rounded-2xl bg-stone-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => abrirLinea(i)} className="min-w-0 flex-1 text-left">
                        <p className="truncate font-semibold text-stone-900">{l.nombre}</p>
                        <p className="text-xs text-stone-500">{nf(m.cant) + ' ' + l.unidad + ' × ' + bs(n(l.precio))}</p>
                      </button>
                      <p className="shrink-0 font-extrabold text-stone-900">{bs(m.sub)}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold">
                      {auto && auto.esp && !l.manual && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Precio por mayor</span>}
                      {cambiado && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-700">{'Precio cambiado (lista ' + bs(auto.precio) + ')'}</span>}
                      {st != null && m.cant > st && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{'Solo hay ' + nf(st) + ' en stock'}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-stone-200">
                        <button onClick={() => ajustar(i, -paso(l.unidad))} aria-label="Quitar" className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><Minus size={16} /></button>
                        <span className="min-w-[3rem] text-center text-sm font-bold">{nf(m.cant)}</span>
                        <button onClick={() => ajustar(i, paso(l.unidad))} aria-label="Agregar" className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><Plus size={16} /></button>
                      </div>
                      <button onClick={() => setLineas((ls) => ls.filter((_, x) => x !== i))} aria-label="Quitar producto" className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </li>
                );
              })}
              {!items && <li className="py-8 text-center text-stone-500">El ticket está vacío.</li>}
            </ul>
            <div className="flex items-center gap-3 border-t border-stone-100 p-4">
              <button onClick={() => { setLineas([]); setTicket(false); }} disabled={!items} className="rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-700 disabled:opacity-50">Vaciar</button>
              <button onClick={abrirCobro} disabled={!items} className="flex flex-1 items-center justify-between rounded-full bg-vino-800 px-6 py-3.5 font-bold text-white disabled:bg-stone-400">
                <span>Cobrar</span><span>{bs(bruto)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {kp && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center" onClick={() => setKp(null)}>
          <div onClick={stop} className="w-full max-w-md rounded-t-3xl bg-white p-4 md:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-stone-900">{kp.nombre}</h2>
                <p className="text-xs text-stone-500">
                  {bs(kpPrecio) + '/' + kp.unidad}
                  {kpEsp && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">Precio por mayor</span>}
                </p>
              </div>
              <button onClick={() => setKp(null)} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100"><X size={18} /></button>
            </div>

            {esKg(kp.unidad) && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => cambiarModoKp('peso')} className={mini(kp.modo === 'peso')}>Peso</button>
                <button onClick={() => cambiarModoKp('monto')} className={mini(kp.modo === 'monto')}>Monto</button>
              </div>
            )}

            <div className="mt-3 rounded-2xl bg-stone-50 p-3 text-center">
              <p className="text-4xl font-extrabold text-stone-900">
                {kp.buf === '' ? '0' : kp.buf.replace('.', ',')}
                <span className="ml-2 text-xl font-bold text-stone-500">{kp.modo === 'monto' ? 'Bs' : kp.unidad}</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-600">{kp.modo === 'monto' ? '= ' + nf(kpCant) + ' ' + kp.unidad : '= ' + bs(kpSub)}</p>
              {kpStock != null && kpCant > kpStock && <p className="mt-1 text-xs font-bold text-amber-700">{'Solo hay ' + nf(kpStock) + ' ' + kp.unidad + ' en stock'}</p>}
            </div>

            {kp.modo === 'peso' && (
              <div className="mt-2 flex flex-wrap gap-2">
                {rapidas(kp.unidad).map((v) => (
                  <button key={v} onClick={() => setKp({ ...kp, buf: String(v), fresh: true })} className={mini(n(kp.buf) === v)}>{marca(v, kp.unidad)}</button>
                ))}
              </div>
            )}

            <div className="mt-3">
              <Teclado onKey={(k) => setKp((s) => ({ ...s, buf: teclear(s.fresh ? '' : s.buf, k, s.modo === 'monto' ? 2 : 3), fresh: false }))} />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              {kp.editPrecio ? (
                <label className="flex flex-1 items-center gap-2 text-stone-500">Precio Bs
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={kp.precio} onChange={(e) => setKp({ ...kp, precio: e.target.value, manual: true })} />
                </label>
              ) : (
                <button onClick={() => setKp({ ...kp, editPrecio: true, precio: String(kpPrecio), manual: true })} className="font-bold text-vino-800 underline">Cambiar precio</button>
              )}
              {kp.p && kp.manual && <button onClick={() => setKp({ ...kp, manual: false, editPrecio: false })} className="shrink-0 font-bold text-stone-600 underline">Volver a lista</button>}
            </div>

            <button onClick={guardarKp} disabled={!(n(kp.buf) > 0) || !(kpPrecio > 0)} className="mt-3 w-full rounded-full bg-vino-800 py-3.5 font-bold text-white disabled:bg-stone-300">
              {(kp.idx >= 0 ? 'Guardar' : 'Agregar') + ' · ' + bs(kpSub)}
            </button>
            {!(kpPrecio > 0) && <p className="mt-2 text-center text-xs font-semibold text-red-600">Este producto no tiene precio. Toca Cambiar precio.</p>}
          </div>
        </div>
      )}

      {cobrando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setCobrando(false)}>
          <div onClick={stop} className="flex max-h-[96vh] w-full max-w-lg flex-col rounded-t-3xl bg-white md:rounded-3xl">
            <div className="flex items-center gap-3 px-4 pb-1 pt-4">
              <button onClick={() => setCobrando(false)} aria-label="Volver" className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><ArrowLeft size={18} /></button>
              <h2 className="text-lg font-bold text-stone-900">Cobrar</h2>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3">
              <div className="rounded-2xl bg-stone-50 py-4 text-center">
                <p className="text-xs text-stone-500">{desc > 0 ? 'Subtotal ' + bs(bruto) + ' · descuento −' + bs(desc) : items + (items === 1 ? ' producto' : ' productos')}</p>
                <p className="text-5xl font-extrabold text-stone-900">{bs(total)}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {METODOS.map(([v, t]) => (
                  <button key={v} onClick={() => setF({ ...f, metodo: v })} className={`rounded-xl py-3 text-sm font-semibold ${f.metodo === v ? 'bg-vino-800 text-white' : 'bg-stone-100 text-stone-700'}`}>{t}</button>
                ))}
              </div>

              {false && (
                <div className="rounded-2xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500">El cliente paga con</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => { ponerRecibe(total); setOtroMonto(false); }} className={mini(f.recibe !== '' && recibe === total)}>Exacto</button>
                    {sugeridos.map((b) => (
                      <button key={b} onClick={() => { ponerRecibe(b); setOtroMonto(false); }} className={mini(recibe === b)}>{'Bs ' + b}</button>
                    ))}
                    <button onClick={() => { setOtroMonto(!otroMonto); setRecibeNuevo(true); }} className={mini(otroMonto)}>Otro</button>
                  </div>
                  {otroMonto && (
                    <div className="mt-3 space-y-2">
                      <p className="rounded-xl bg-white py-2 text-center text-2xl font-extrabold text-stone-900">{'Bs ' + (f.recibe === '' ? '0' : f.recibe.replace('.', ','))}</p>
                      <Teclado onKey={teclaRecibe} />
                    </div>
                  )}
                  {vuelto > 0 && <p className="mt-3 text-center text-3xl font-extrabold text-green-700">{'Vuelto: ' + bs(vuelto)}</p>}
                  {falta > 0 && <p className="mt-3 text-center text-sm font-bold text-amber-700">{'Falta ' + bs(falta)}</p>}
                </div>
              )}


              <button onClick={() => setMas(!mas)} className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
                <span>Más opciones</span>
                <ChevronDown size={16} className={mas ? 'rotate-180 transition' : 'transition'} />
              </button>
              {mas && (
                <div className="space-y-2 rounded-2xl bg-stone-50 p-3">
                  <label className="block text-xs text-stone-500">Descuento (Bs)
                    <input type="number" inputMode="decimal" step="0.01" min="0" value={f.descuento} onChange={(e) => setF({ ...f, descuento: e.target.value })} placeholder="0" />
                  </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input list="clientes" placeholder="Cliente (opcional)" value={f.nombre} onChange={(e) => elegirNombre(e.target.value)} />
                      <input type="tel" inputMode="tel" placeholder="WhatsApp (opcional)" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} />
                    </div>
                  <input placeholder="Nota (opcional)" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} />
                  <label className="block text-xs text-stone-500">Fecha de la venta
                    <input type="date" max={hoyBO()} value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
                  </label>
                </div>
              )}
              <datalist id="clientes">
                {clientes.map((c) => <option key={c.nombre} value={c.nombre} />)}
              </datalist>
            </div>

            <div className="space-y-2 border-t border-stone-100 p-4">
              {err && <p className="text-center text-sm font-semibold text-red-600">{err}</p>}
              <button onClick={confirmar} disabled={busy} className="w-full rounded-full bg-vino-800 py-4 text-base font-bold text-white disabled:opacity-50">
                {busy ? 'Guardando...' : 'Confirmar venta · ' + bs(total)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
