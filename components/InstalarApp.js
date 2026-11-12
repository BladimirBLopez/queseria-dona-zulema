'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { confirmar } from '@/lib/avisos';

// El navegador lanza "beforeinstallprompt" una sola vez y temprano:
// se guarda aquí, a nivel de módulo, para no perderlo.
let guardado = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    guardado = e;
    window.dispatchEvent(new Event('dz-instalable'));
  });
}

export default function InstalarApp({ className = '' }) {
  const [evento, setEvento] = useState(null);
  const [ios, setIos] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) { setInstalada(true); return undefined; }
    const ua = navigator.userAgent || '';
    setIos(/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setEvento(guardado);
    const hay = () => setEvento(guardado);
    const listo = () => { guardado = null; setEvento(null); setInstalada(true); };
    window.addEventListener('dz-instalable', hay);
    window.addEventListener('appinstalled', listo);
    return () => {
      window.removeEventListener('dz-instalable', hay);
      window.removeEventListener('appinstalled', listo);
    };
  }, []);

  if (instalada || (!evento && !ios)) return null;

  async function instalar() {
    if (evento) {
      evento.prompt();
      await evento.userChoice.catch(() => null);
      guardado = null;
      setEvento(null);
      return;
    }
    await confirmar({
      titulo: 'Instalar en tu iPhone o iPad',
      texto: 'Abre esta página en Safari, toca el botón Compartir y elige "Agregar a pantalla de inicio".',
      ok: 'Entendido',
      cancelar: 'Cerrar',
    });
  }

  return (
    <button type="button" onClick={instalar} className={className}>
      <Download size={18} /> Instalar app
    </button>
  );
}
