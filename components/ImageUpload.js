'use client';
import { useState } from 'react';
import { ImagePlus } from 'lucide-react';

export default function ImageUpload({ value, onChange, label = 'Subir imagen' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function subir(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return setErr('La imagen pesa más de 8 MB');
    setBusy(true);
    setErr('');
    try {
      const s = await (await fetch('/api/admin/upload', { method: 'POST' })).json();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', s.apiKey);
      fd.append('timestamp', s.timestamp);
      fd.append('folder', s.folder);
      fd.append('signature', s.signature);
      const r = await (await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: 'POST', body: fd })).json();
      if (r.secure_url) onChange(r.secure_url, r.public_id);
      else setErr('Error al subir la imagen');
    } catch {
      setErr('Error al subir la imagen');
    } finally {
      setBusy(false);
    }
  }

  const prev = value ? value.replace('/upload/', '/upload/f_auto,q_auto,w_200/') : '';
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-vino-200 p-3 hover:bg-vino-50">
        {prev ? <img src={prev} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-xl bg-vino-50 text-vino-300"><ImagePlus size={24} /></span>}
        <span className="text-sm font-semibold text-vino-800">{busy ? 'Subiendo...' : prev ? 'Cambiar: ' + label : label}</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
      </label>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
