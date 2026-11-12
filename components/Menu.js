'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu as MenuIcon, X } from 'lucide-react';
import WhatsApp from '@/components/WhatsApp';

export default function Menu({ items, pedido }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10">
        <MenuIcon size={22} />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-vino-950 p-5 text-white shadow-lift">
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="mb-6 grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
              <X size={22} />
            </button>
            <ul className="space-y-1">
              {items.map(([t, h]) => (
                <li key={h}>
                  <a href={h} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 font-semibold hover:bg-white/10">{t}</a>
                </li>
              ))}
            </ul>
            <a href={pedido} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 font-bold">
              <WhatsApp size={20} /> Pedir por WhatsApp
            </a>
          </nav>
        </div>,
        document.body
      )}
    </>
  );
}
