'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { TriangleAlert, CircleHelp } from 'lucide-react';
import { _registrar } from '@/lib/avisos';

export default function Avisos() {
  const [d, setD] = useState(null);
  const ref = useRef(null);
  ref.current = d;

  useEffect(() => _registrar((o) => {
    ref.current?.res(false);
    setD(o);
  }), []);

  function cerrar(v) {
    ref.current?.res(v);
    setD(null);
  }

  useEffect(() => {
    if (!d) return;
    const tecla = (e) => { if (e.key === 'Escape') cerrar(false); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [d]);

  return (
    <>
      <Toaster position="top-center" richColors closeButton offset={12} toastOptions={{ duration: 3000, classNames: { toast: '!rounded-2xl !font-sans' } }} />
      <AnimatePresence>
        {d && (
          <motion.div key="confirmar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => cerrar(false)}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby="conf-t" aria-describedby={d.texto ? 'conf-d' : undefined}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-lift">
              <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${d.peligro ? 'bg-red-50 text-red-600' : 'bg-vino-50 text-vino-800'}`}>
                {d.peligro ? <TriangleAlert size={26} /> : <CircleHelp size={26} />}
              </span>
              <h2 id="conf-t" className="mt-4 font-serif text-xl font-extrabold text-vino-900">{d.titulo}</h2>
              {d.texto && <p id="conf-d" className="mt-1.5 text-sm leading-relaxed text-stone-500">{d.texto}</p>}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" autoFocus onClick={() => cerrar(false)} className="h-12 rounded-full bg-stone-100 font-bold text-stone-700 transition active:scale-95">{d.cancelar || 'Cancelar'}</button>
                <button type="button" onClick={() => cerrar(true)} className={`h-12 rounded-full font-bold text-white transition active:scale-95 ${d.peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-vino-800 hover:bg-vino-700'}`}>{d.ok || 'Aceptar'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
