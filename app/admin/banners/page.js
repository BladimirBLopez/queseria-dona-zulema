'use client';
import { confirmar, avisar, avisoAuto } from '@/lib/avisos';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

const vacio = { id: null, titulo: '', texto: '', boton: 'Pedir ahora', activo: true, imagen_url: '', imagen_public_id: '' };

export default function Banners() {
  const [list, setList] = useState(null);
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState('');

  async function cargar() {
    const r = await fetch('/api/admin/banners');
    if (r.status === 401) { location.href = '/admin'; return; }
    if (!r.ok) { avisar.error('Falta crear la tabla banners en Neon.'); setList([]); return; }
    setList(await r.json());
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(b) {
    const r = await fetch('/api/admin/banners', { method: 'POST', body: JSON.stringify(b) });
    r.ok ? avisar.ok('Oferta guardada', 'Ya se ve en la tienda.') : avisar.error('No se pudo guardar');
    if (r.ok) setF(null);
    cargar();
  }

  async function borrar(b) {
    if (!(await confirmar({ titulo: '¿Borrar la oferta "' + b.titulo + '"?', texto: 'Dejará de verse en la tienda.', ok: 'Sí, borrar', peligro: true }))) return;
    await fetch('/api/admin/banners?id=' + b.id, { method: 'DELETE' });
    cargar();
  }

  if (!list) return <p className="p-8 text-center text-stone-500">Cargando...</p>;

  return (
    <main className="px-4 pt-4">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-extrabold text-vino-800">Ofertas</h1>
          <p className="text-sm text-stone-500">Carrusel que se ve arriba del catálogo.</p>
        </div>
        <button onClick={() => { setF({ ...vacio }); setMsg(''); }} className="flex items-center gap-2 rounded-full bg-vino-800 px-5 py-2.5 text-sm font-bold text-white shadow">
          <Plus size={18} /> Nueva
        </button>
      </div>
      {msg && <p className="mb-3 rounded-xl bg-white p-3 text-sm text-green-700 shadow-card">{msg}</p>}

      {f && (
        <form onSubmit={(e) => { e.preventDefault(); guardar(f); }} className="mb-6 space-y-3 rounded-3xl bg-white p-5 shadow-card">
          <h2 className="font-bold text-vino-800">{f.id ? 'Editar oferta' : 'Nueva oferta'}</h2>
          <ImageUpload value={f.imagen_url} label="Imagen de fondo (opcional)" onChange={(u, p) => setF({ ...f, imagen_url: u, imagen_public_id: p })} />
          <input placeholder="Título (ej: Oferta en queso chaqueño)" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required />
          <input placeholder="Texto corto (opcional)" value={f.texto || ''} onChange={(e) => setF({ ...f, texto: e.target.value })} />
          <input placeholder="Texto del botón" value={f.boton || ''} onChange={(e) => setF({ ...f, boton: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Mostrar en la tienda
          </label>
          <div className="flex gap-2">
            <button className="flex-1 rounded-full bg-vino-800 py-3 font-bold text-white">Guardar</button>
            <button type="button" onClick={() => setF(null)} className="rounded-full bg-stone-100 px-6 font-semibold">Cancelar</button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {list.map((b) => (
          <li key={b.id} className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ${b.activo ? '' : 'opacity-60'}`}>
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-r from-vino-900 to-vino-600">
              {b.imagen_url && <img src={b.imagen_url.replace('/upload/', '/upload/f_auto,q_auto,w_200/')} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{b.titulo}</p>
              <p className="truncate text-xs text-stone-500">{b.activo ? 'Visible en la tienda' : 'Oculta'}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => guardar({ ...b, activo: !b.activo })} className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold">{b.activo ? 'Ocultar' : 'Mostrar'}</button>
              <button onClick={() => { setF({ ...b, texto: b.texto || '', boton: b.boton || '', imagen_url: b.imagen_url || '', imagen_public_id: b.imagen_public_id || '' }); window.scrollTo(0, 0); }} aria-label="Editar" className="grid h-8 w-8 place-items-center rounded-full bg-stone-100"><Pencil size={15} /></button>
              <button onClick={() => borrar(b)} aria-label="Borrar" className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={15} /></button>
            </div>
          </li>
        ))}
        {list.length === 0 && (
          <li className="py-12 text-center text-stone-500"><Megaphone className="mx-auto mb-2 text-vino-300" /> Aún no hay ofertas.</li>
        )}
      </ul>
    </main>
  );
}
