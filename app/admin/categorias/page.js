'use client';
import { confirmar, avisar, avisoAuto } from '@/lib/avisos';
import { useEffect, useState } from 'react';

export default function Categorias() {
  const [d, setD] = useState({ lineas: [], categorias: [] });
  const [nuevo, setNuevo] = useState({});
  const [msg, setMsg] = useState('');

  async function cargar() {
    const r = await fetch('/api/admin/categorias');
    if (r.status === 401) { location.href = '/admin'; return; }
    setD(await r.json());
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(c) {
    const r = await fetch('/api/admin/categorias', { method: 'POST', body: JSON.stringify(c) });
    r.ok ? avisar.ok('Categoría guardada') : avisar.error('No se pudo guardar', 'Revisa el nombre.');
    cargar();
  }

  async function borrar(id) {
    if (!(await confirmar({ titulo: '¿Borrar esta categoría?', texto: 'No se puede deshacer.', ok: 'Sí, borrar', peligro: true }))) return;
    const r = await fetch('/api/admin/categorias?id=' + id, { method: 'DELETE' });
    const j = await r.json();
    j.error === 'tiene_productos' ? avisar.error('No se puede borrar', 'Tiene productos. Bórralos o muévelos antes.') : avisar.ok('Categoría borrada');
    cargar();
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold text-vino-800">Categorías</h1>
      {msg && <p className="mb-3 text-sm text-green-700">{msg}</p>}
      {d.lineas.map((l) => (
        <section key={l.id} className="mb-6 rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 font-bold">{l.nombre}</h2>
          <ul className="space-y-2">
            {d.categorias.filter((c) => c.linea_id === l.id).map((c) => (
              <li key={c.id + c.nombre} className="flex items-center gap-2">
                <input defaultValue={c.nombre} className="w-full rounded border p-2"
                  onBlur={(e) => e.target.value.trim() !== c.nombre && guardar({ id: c.id, nombre: e.target.value })} />
                <span className="text-xs text-stone-500">{c.total} prod.</span>
                <button onClick={() => borrar(c.id)} className="px-2 text-red-700">✕</button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input placeholder="Nueva categoría" className="w-full rounded border p-2" value={nuevo[l.id] || ''}
              onChange={(e) => setNuevo({ ...nuevo, [l.id]: e.target.value })} />
            <button onClick={() => { guardar({ linea_id: l.id, nombre: nuevo[l.id] || '' }); setNuevo({ ...nuevo, [l.id]: '' }); }}
              className="rounded bg-vino-800 px-4 font-bold text-white">Agregar</button>
          </div>
        </section>
      ))}
      <p className="text-xs text-stone-500">Para renombrar, edita el texto y toca fuera del campo.</p>
    </main>
  );
}
