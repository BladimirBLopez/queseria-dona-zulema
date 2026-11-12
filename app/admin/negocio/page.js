'use client';
// negocio-pro2
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { IconFacebook, IconInstagram, IconTikTok } from '@/components/RedesIcons';
import { avisar } from '@/lib/avisos';
import { Page, PageHeader, Card, Badge, Btn, Skeleton } from '@/components/ui';

const PRESETS = ['Lunes a viernes', 'Lunes a sábado', 'Sábado', 'Domingo'];
const HORA = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/;
const chip = 'rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-700 ring-1 ring-stone-300 disabled:opacity-40';
const chipOn = 'rounded-full bg-vino-800 px-3 py-1.5 text-xs font-bold text-white';
const REDES = [
  { k: 'facebook', nombre: 'Facebook', Icon: IconFacebook, url: (u) => 'https://facebook.com/' + u },
  { k: 'instagram', nombre: 'Instagram', Icon: IconInstagram, url: (u) => 'https://instagram.com/' + u },
  { k: 'tiktok', nombre: 'TikTok', Icon: IconTikTok, url: (u) => 'https://tiktok.com/@' + u },
];

const pad = (t) => { const [h, m] = t.split(':'); return h.padStart(2, '0') + ':' + m; };
const norm = (d) => ({ ...d, logo: d.logo || '', hero: d.hero || '', horarios: d.horarios || [], faq: d.faq || [], marcas: d.marcas || [] });
const digitos = (v) => String(v || '').replace(/\D/g, '');
const waFinal = (v) => { const d = digitos(v); return d.length === 8 ? '591' + d : d; };
const fmtWa = (d) => (d.startsWith('591') && d.length === 11 ? '+591 ' + d.slice(3, 7) + ' ' + d.slice(7) : d ? '+' + d : '');
const https = (v) => !String(v || '').trim() || /^https:\/\//.test(String(v).trim());
const mapaSrc = (v) => {
  const raw = String(v || '');
  const m = raw.match(/src="([^"]+)"/);
  const u = (m ? m[1] : raw).trim();
  return u.startsWith('https://www.google.com/maps/embed') ? u : '';
};

function armarRed(red, v) {
  const t = String(v || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t.replace(/^http:\/\//i, 'https://');
  if (/^(www\.)?(facebook|instagram|tiktok|fb)\.[a-z]+/i.test(t) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(t)) return 'https://' + t.replace(/^\/+/, '');
  const user = t.replace(/^@+/, '').replace(/\s+/g, '');
  return user ? REDES.find((r) => r.k === red).url(user) : '';
}

function errores(n) {
  const e = {};
  const wa = digitos(n.whatsapp);
  if (!String(n.nombre || '').trim()) e.nombre = 'El nombre es obligatorio.';
  if (wa.length < 8 || wa.length > 15) e.whatsapp = 'Escribe un número válido, con código de país (ej. 59175284955).';
  for (const r of REDES) if (!https(n[r.k])) e[r.k] = 'El enlace de ' + r.nombre + ' debe empezar con https://';
  if (String(n.mapa || '').trim() && !mapaSrc(n.mapa)) e.mapa = 'Pega el código Insertar mapa de Google Maps (empieza con iframe).';
  return e;
}

function Seccion({ titulo, resumen, abierta = false, forzar = false, estado, children }) {
  const [open, setOpen] = useState(abierta);
  useEffect(() => { if (forzar) setOpen(true); }, [forzar]);
  return (
    <Card className="!p-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-bold text-stone-900">{titulo}</p>
          {resumen && <p className="truncate text-xs text-stone-500">{resumen}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {estado}
          <ChevronDown size={18} className={'text-stone-400 transition ' + (open ? 'rotate-180' : '')} />
        </div>
      </button>
      {open && <div className="space-y-3 border-t border-stone-100 p-4">{children}</div>}
    </Card>
  );
}

function Campo({ label, ayuda, error, extra, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-xs font-semibold text-stone-600">
        <span>{label}</span>
        {extra && <span className="font-normal text-stone-400">{extra}</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : ayuda ? <p className="mt-1 text-xs text-stone-500">{ayuda}</p> : null}
    </label>
  );
}

function VistaTienda({ version }) {
  const [on, setOn] = useState(false);
  const [dev, setDev] = useState('cel');
  const [ancho, setAncho] = useState(0);
  const caja = useRef(null);

  useEffect(() => {
    const el = caja.current;
    if (!on || !el) return;
    const medir = () => setAncho(el.getBoundingClientRect().width);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [on]);

  const W = dev === 'cel' ? 390 : 1200;
  const H = dev === 'cel' ? 780 : 720;
  const s = ancho ? Math.min(1, ancho / W) : 0.5;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-stone-900">Vista previa de la tienda</p>
          <p className="text-xs text-stone-500">Es la tienda real, tal como la ve el cliente.</p>
        </div>
        {on && <button type="button" onClick={() => setOn(false)} className={chip}>Cerrar</button>}
      </div>
      {!on ? (
        <button type="button" onClick={() => setOn(true)} className="mt-3 w-full rounded-xl bg-stone-100 py-3 text-sm font-bold text-stone-700">Ver cómo se ve la tienda</button>
      ) : (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setDev('cel')} className={dev === 'cel' ? chipOn : chip}>Celular</button>
            <button type="button" onClick={() => setDev('pc')} className={dev === 'pc' ? chipOn : chip}>Computador</button>
            <a href="/" target="_blank" rel="noopener noreferrer" className={chip}>Abrir tienda</a>
          </div>
          <div ref={caja} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100" style={{ height: Math.round(H * s) }}>
            <iframe key={dev + '-' + version} src="/" title="Vista previa de la tienda" loading="lazy"
              style={{ width: W, height: H, border: 0, transform: 'scale(' + s + ')', transformOrigin: 'top left', pointerEvents: 'none' }} />
          </div>
          <p className="mt-2 text-xs text-stone-500">Muestra lo que ya está guardado. Guarda tus cambios y la vista se actualiza sola.</p>
        </div>
      )}
    </Card>
  );
}

function FilaHorario({ h, onDia, onHora, onQuitar }) {
  const cerrado = /^cerrado$/i.test(h[1] || '');
  const m = HORA.exec(h[1] || '');
  const libre = !!h[1] && !cerrado && !m;
  const a = m ? pad(m[1]) : '';
  const b = m ? pad(m[2]) : '';
  return (
    <div className="space-y-2 rounded-2xl bg-stone-50 p-3">
      <div className="flex items-center gap-2">
        <input list="dias" maxLength={40} placeholder="Lunes a sábado" value={h[0]} onChange={(e) => onDia(e.target.value)} />
        <button type="button" onClick={onQuitar} aria-label="Quitar horario" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><Trash2 size={16} /></button>
      </div>
      {libre ? (
        <input maxLength={40} placeholder="Horario" value={h[1]} onChange={(e) => onHora(e.target.value)} />
      ) : cerrado ? (
        <p className="text-sm font-semibold text-stone-500">Cerrado ese día</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-500">Abre
            <input type="time" value={a} onChange={(e) => onHora(e.target.value + ' - ' + (b || '19:00'))} />
          </label>
          <label className="text-xs text-stone-500">Cierra
            <input type="time" value={b} onChange={(e) => onHora((a || '07:00') + ' - ' + e.target.value)} />
          </label>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={cerrado} onChange={(e) => onHora(e.target.checked ? 'Cerrado' : '')} /> Cerrado ese día
      </label>
    </div>
  );
}

export default function Negocio() {
  const [n, setN] = useState(null);
  const [base, setBase] = useState('');
  const [fallo, setFallo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [marcaTxt, setMarcaTxt] = useState('');
  const [red, setRed] = useState(null);
  const [borrador, setBorrador] = useState('');
  const [version, setVersion] = useState(0);

  async function cargar() {
    setFallo(false);
    try {
      const r = await fetch('/api/admin/negocio');
      if (r.status === 401) { location.href = '/admin'; return; }
      const d = norm(await r.json());
      setN(d);
      setBase(JSON.stringify(d));
    } catch { setFallo(true); }
  }
  useEffect(() => { cargar(); }, []);

  const sucio = n !== null && JSON.stringify(n) !== base;
  useEffect(() => {
    if (!sucio) return;
    const f = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [sucio]);

  if (fallo) {
    return (
      <Page>
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          No se pudieron cargar los datos del negocio.
          <div className="mt-3"><Btn variant="danger" onClick={cargar}>Reintentar</Btn></div>
        </div>
      </Page>
    );
  }
  if (!n) {
    return (
      <Page>
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      </Page>
    );
  }

  const set = (k, v) => setN((x) => ({ ...x, [k]: v }));
  const setRow = (k, i, j, v) => setN((x) => ({ ...x, [k]: x[k].map((r, a) => (a === i ? r.map((c, b) => (b === j ? v : c)) : r)) }));
  const addRow = (k, fila = ['', '']) => setN((x) => ({ ...x, [k]: [...x[k], fila] }));
  const delRow = (k, i) => setN((x) => ({ ...x, [k]: x[k].filter((_, a) => a !== i) }));
  const mover = (k, i, d) => setN((x) => {
    const lista = [...x[k]];
    const j = i + d;
    if (j < 0 || j >= lista.length) return x;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    return { ...x, [k]: lista };
  });

  function agregarMarca() {
    const v = marcaTxt.trim().slice(0, 40);
    if (!v) return;
    if (n.marcas.some((m) => m.toLowerCase() === v.toLowerCase())) return setMarcaTxt('');
    if (n.marcas.length >= 12) return avisar.error('Máximo 12 marcas', undefined, 'marcas');
    set('marcas', [...n.marcas, v]);
    setMarcaTxt('');
  }

  const abrirRed = (k) => {
    if (red === k) return setRed(null);
    setRed(k);
    setBorrador(n[k] || '');
  };
  const cambiarRed = (v) => { setBorrador(v); set(red, armarRed(red, v)); };
  const quitarRed = () => { set(red, ''); setBorrador(''); };

  const err = errores(n);
  const claves = Object.keys(err);
  const wa = waFinal(n.whatsapp);
  const conectadas = REDES.filter((r) => String(n[r.k] || '').trim()).length;
  const redActual = REDES.find((r) => r.k === red);
  const src = mapaSrc(n.mapa);
  const erroresRedes = REDES.some((r) => err[r.k]);
  const rojo = <Badge tone="rojo">Revisar</Badge>;

  async function guardar() {
    if (claves.length) return avisar.error(err[claves[0]], undefined, 'negocio');
    setGuardando(true);
    avisar.cargando('Guardando...', 'negocio');
    try {
      const cuerpo = { ...n, whatsapp: wa, marcas: n.marcas.map((m) => m.trim()).filter(Boolean) };
      const r = await fetch('/api/admin/negocio', { method: 'POST', body: JSON.stringify(cuerpo) });
      if (!r.ok) {
        avisar.error('No se pudo guardar', undefined, 'negocio');
      } else {
        avisar.ok('Datos guardados', 'El sitio se actualiza en 1 minuto.', 'negocio');
        const d = norm(await (await fetch('/api/admin/negocio')).json());
        setN(d);
        setBase(JSON.stringify(d));
        setTimeout(() => setVersion((v) => v + 1), 1200);
      }
    } catch {
      avisar.error('Sin conexión', 'Revisa tu internet e intenta de nuevo.', 'negocio');
    }
    setGuardando(false);
  }

  return (
    <Page className="pb-44">
      <PageHeader title="Negocio" sub="Lo que ven tus clientes en la tienda." />

      <div className="space-y-3">
        <VistaTienda version={version} />

        <Seccion titulo="Identidad" resumen={n.nombre} abierta forzar={!!err.nombre} estado={err.nombre ? rojo : null}>
          <Campo label="Nombre del negocio" error={err.nombre} extra={(n.nombre || '').length + '/60'}>
            <input maxLength={60} value={n.nombre} onChange={(e) => set('nombre', e.target.value)} />
          </Campo>
          <div>
            <ImageUpload value={n.logo} label="Logo del negocio" onChange={(u) => set('logo', u)} />
            <p className="mt-1 text-xs text-stone-500">Cuadrado, mínimo 400 por 400 px. La tienda lo muestra recortado en círculo.</p>
            {n.logo && <button type="button" onClick={() => set('logo', '')} className="mt-1 text-xs font-bold text-red-600 underline">Quitar logo</button>}
          </div>
          <div>
            <ImageUpload value={n.hero} label="Foto de portada (se ve detrás del título)" onChange={(u) => set('hero', u)} />
            <p className="mt-1 text-xs text-stone-500">Horizontal, mínimo 1600 por 900 px. La tienda le pone una capa oscura encima para que el texto se lea.</p>
            {n.hero && <button type="button" onClick={() => set('hero', '')} className="mt-1 text-xs font-bold text-red-600 underline">Quitar portada</button>}
          </div>
        </Seccion>

        <Seccion titulo="Portada y textos" resumen={n.titulo}>
          <Campo label="Slogan (arriba del título)" extra={(n.slogan || '').length + '/100'}>
            <input maxLength={100} value={n.slogan} onChange={(e) => set('slogan', e.target.value)} />
          </Campo>
          <Campo label="Título de portada" extra={(n.titulo || '').length + '/120'}>
            <input maxLength={120} value={n.titulo} onChange={(e) => set('titulo', e.target.value)} />
          </Campo>
          <Campo label="Texto de portada" extra={(n.subtitulo || '').length + '/300'}>
            <textarea rows={3} maxLength={300} value={n.subtitulo} onChange={(e) => set('subtitulo', e.target.value)} />
          </Campo>
        </Seccion>

        <Seccion titulo="Contacto y ubicación" resumen={fmtWa(wa) || 'Sin WhatsApp'} abierta forzar={!!(err.whatsapp || err.mapa)} estado={err.whatsapp || err.mapa ? rojo : null}>
          <Campo label="WhatsApp" error={err.whatsapp} ayuda={digitos(n.whatsapp).length === 8 ? 'Se guardará con el código de Bolivia: ' + fmtWa(wa) : 'Con código de país y solo números. Los pedidos llegan a este número.'}>
            <input inputMode="numeric" placeholder="59175284955" value={n.whatsapp} onChange={(e) => set('whatsapp', digitos(e.target.value).slice(0, 15))} />
          </Campo>
          {!err.whatsapp && (
            <a href={'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hola, estoy probando el WhatsApp de la tienda')} target="_blank" rel="noopener noreferrer" className={chip + ' inline-block'}>Probar WhatsApp</a>
          )}
          <Campo label="Dirección" extra={(n.direccion || '').length + '/200'}>
            <input maxLength={200} value={n.direccion} onChange={(e) => set('direccion', e.target.value)} />
          </Campo>
          <Campo label="Mapa de Google Maps" error={err.mapa} ayuda="En Google Maps toca Compartir, luego Insertar mapa, copia el código y pégalo aquí.">
            <textarea rows={3} placeholder='<iframe src="https://www.google.com/maps/embed?..."></iframe>' value={n.mapa} onChange={(e) => set('mapa', e.target.value)} />
          </Campo>
          {src && <iframe src={src} title="Mapa" loading="lazy" className="h-48 w-full rounded-2xl border-0" />}
        </Seccion>

        <Seccion titulo="Horarios" resumen={n.horarios.length ? n.horarios.length + (n.horarios.length === 1 ? ' horario' : ' horarios') : 'Sin horarios'}>
          {n.horarios.map((h, i) => (
            <FilaHorario key={i} h={h} onDia={(v) => setRow('horarios', i, 0, v)} onHora={(v) => setRow('horarios', i, 1, v)} onQuitar={() => delRow('horarios', i)} />
          ))}
          <datalist id="dias">{PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" disabled={n.horarios.length >= 14} onClick={() => addRow('horarios', [p, ''])} className={chip}>{'+ ' + p}</button>
            ))}
            <button type="button" disabled={n.horarios.length >= 14} onClick={() => addRow('horarios')} className={chip}>+ Otro</button>
          </div>
          <p className="text-xs text-stone-500">Los horarios sin día o sin hora no se guardan.</p>
        </Seccion>

        <Seccion titulo="Redes sociales" resumen={conectadas ? conectadas + (conectadas === 1 ? ' red conectada' : ' redes conectadas') : 'Sin redes'} forzar={erroresRedes} estado={erroresRedes ? rojo : null}>
          <div className="grid grid-cols-3 gap-2">
            {REDES.map(({ k, nombre, Icon }) => {
              const activa = !!String(n[k] || '').trim();
              const abierta = red === k;
              return (
                <button key={k} type="button" onClick={() => abrirRed(k)}
                  className={'flex flex-col items-center gap-1 rounded-2xl border p-3 transition ' + (abierta ? 'border-vino-800 bg-vino-50' : 'border-stone-200 bg-white')}>
                  <span className={'grid h-11 w-11 place-items-center rounded-full ' + (activa ? 'bg-vino-800 text-oro-300' : 'bg-stone-100 text-stone-500')}><Icon size={22} /></span>
                  <span className="text-xs font-bold text-stone-800">{nombre}</span>
                  <span className={'text-[11px] font-semibold ' + (activa ? 'text-green-700' : 'text-stone-400')}>{activa ? 'Conectado' : 'Agregar'}</span>
                </button>
              );
            })}
          </div>
          {redActual && (
            <div className="space-y-2 rounded-2xl bg-stone-50 p-3">
              <Campo label={'Usuario o enlace de ' + redActual.nombre} error={err[redActual.k]} ayuda="Escribe solo el usuario, por ejemplo @dzulema, o pega el enlace. El enlace se arma solo.">
                <input autoFocus value={borrador} onChange={(e) => cambiarRed(e.target.value)} placeholder="@usuario o enlace" />
              </Campo>
              {n[redActual.k] && <p className="break-all text-xs text-stone-500">{'Se guardará: ' + n[redActual.k]}</p>}
              <div className="flex flex-wrap gap-2">
                {n[redActual.k] && <a href={n[redActual.k]} target="_blank" rel="noopener noreferrer" className={chip}>Probar enlace</a>}
                {n[redActual.k] && <button type="button" onClick={quitarRed} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">Quitar</button>}
                <button type="button" onClick={() => setRed(null)} className={chipOn}>Listo</button>
              </div>
            </div>
          )}
        </Seccion>

        <Seccion titulo="Marcas que trabajan" resumen={n.marcas.length ? n.marcas.join(', ') : 'Sin marcas'}>
          <div className="flex flex-wrap gap-2">
            {n.marcas.map((m, i) => (
              <span key={m + i} className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 text-sm font-semibold text-stone-700">
                {m}
                <button type="button" onClick={() => set('marcas', n.marcas.filter((_, x) => x !== i))} aria-label={'Quitar ' + m} className="grid h-6 w-6 place-items-center rounded-full hover:bg-stone-200"><X size={14} /></button>
              </span>
            ))}
            {!n.marcas.length && <p className="text-sm text-stone-500">Todavía no agregaste marcas.</p>}
          </div>
          <div className="flex gap-2">
            <input maxLength={40} placeholder="Escribe una marca" value={marcaTxt} onChange={(e) => setMarcaTxt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); agregarMarca(); } }} />
            <button type="button" onClick={agregarMarca} className="shrink-0 rounded-xl bg-vino-800 px-4 text-sm font-bold text-white">Agregar</button>
          </div>
        </Seccion>

        <Seccion titulo="Bloque para mayoristas" resumen={n.mayor_titulo}>
          <Campo label="Título" extra={(n.mayor_titulo || '').length + '/120'}>
            <input maxLength={120} value={n.mayor_titulo} onChange={(e) => set('mayor_titulo', e.target.value)} />
          </Campo>
          <Campo label="Texto" extra={(n.mayor_texto || '').length + '/200'}>
            <textarea rows={2} maxLength={200} value={n.mayor_texto} onChange={(e) => set('mayor_texto', e.target.value)} />
          </Campo>
        </Seccion>

        <Seccion titulo="Preguntas frecuentes" resumen={n.faq.length ? n.faq.length + (n.faq.length === 1 ? ' pregunta' : ' preguntas') : 'Sin preguntas'}>
          {n.faq.map((f, i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-stone-50 p-3">
              <input maxLength={150} placeholder="Pregunta" value={f[0]} onChange={(e) => setRow('faq', i, 0, e.target.value)} />
              <textarea rows={2} maxLength={600} placeholder="Respuesta" value={f[1]} onChange={(e) => setRow('faq', i, 1, e.target.value)} />
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => delRow('faq', i)} className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><Trash2 size={14} /> Quitar pregunta</button>
                <div className="flex gap-1">
                  <button type="button" disabled={i === 0} onClick={() => mover('faq', i, -1)} aria-label="Subir" className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-stone-300 disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button type="button" disabled={i === n.faq.length - 1} onClick={() => mover('faq', i, 1)} aria-label="Bajar" className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-stone-300 disabled:opacity-30"><ArrowDown size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" disabled={n.faq.length >= 20} onClick={() => addRow('faq')} className={chip + ' inline-flex items-center gap-1'}><Plus size={14} /> Agregar pregunta</button>
          <p className="text-xs text-stone-500">Las preguntas incompletas no se guardan.</p>
        </Seccion>
      </div>

      {sucio && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4 md:left-64">
          <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-full bg-white p-2 pl-5 shadow-lift ring-1 ring-stone-200">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-700">Cambios sin guardar</p>
            <button type="button" disabled={guardando} onClick={() => { setN(JSON.parse(base)); setRed(null); }} className="shrink-0 rounded-full bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 disabled:opacity-50">Descartar</button>
            <button type="button" disabled={guardando} onClick={guardar} className="shrink-0 rounded-full bg-vino-800 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}
    </Page>
  );
}
