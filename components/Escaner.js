'use client';
// escaner-v1
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

export default function Escaner({ titulo = 'Escanear código', onCodigo, onCerrar }) {
  const video = useRef(null);
  const stream = useRef(null);
  const timer = useRef(null);
  const audio = useRef(null);
  const ultimo = useRef({ c: '', t: 0 });
  const alLeer = useRef(onCodigo);
  const alCerrar = useRef(onCerrar);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [hayLuz, setHayLuz] = useState(false);
  const [luz, setLuz] = useState(false);
  const [manual, setManual] = useState(false);
  const [texto, setTexto] = useState('');

  alLeer.current = onCodigo;
  alCerrar.current = onCerrar;

  function pitido() {
    try { if (navigator.vibrate) navigator.vibrate(60); } catch {}
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      if (!audio.current) audio.current = new A();
      const ctx = audio.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  async function leer(crudo, forzar) {
    const c = String(crudo || '').replace(/\s+/g, '');
    if (!c) return;
    const ahora = Date.now();
    if (!forzar && ultimo.current.c === c && ahora - ultimo.current.t < 1800) return;
    ultimo.current = { c, t: ahora };
    pitido();
    let r;
    try { r = await alLeer.current(c); } catch {}
    if (r === 'cerrar') alCerrar.current();
  }

  useEffect(() => {
    let vivo = true;

    async function ciclo(det) {
      if (!vivo) return;
      try {
        const v = video.current;
        if (v && v.readyState >= 2) {
          const r = await det.detect(v);
          if (vivo && r && r.length) await leer(r[0].rawValue, false);
        }
      } catch {}
      if (vivo) timer.current = setTimeout(() => ciclo(det), 180);
    }

    async function iniciar() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Este navegador no permite usar la cámara aquí. Usa Escribir código.');
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!vivo) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        const v = video.current;
        v.srcObject = s;
        await v.play().catch(() => {});
        const pista = s.getVideoTracks()[0];
        const caps = pista && pista.getCapabilities ? pista.getCapabilities() : null;
        if (caps && caps.torch) setHayLuz(true);
        let Det = globalThis.BarcodeDetector;
        if (!Det) {
          const m = await import('barcode-detector/ponyfill');
          Det = m.BarcodeDetector;
        }
        let formatos = FORMATOS;
        try {
          const sop = await Det.getSupportedFormats();
          const ok = FORMATOS.filter((f) => sop.includes(f));
          if (ok.length) formatos = ok;
        } catch {}
        const det = new Det({ formats: formatos });
        if (!vivo) return;
        setListo(true);
        ciclo(det);
      } catch (e) {
        if (!vivo) return;
        const n = e && e.name;
        setError(n === 'NotAllowedError' || n === 'SecurityError'
          ? 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador o usa Escribir código.'
          : n === 'NotFoundError' || n === 'OverconstrainedError'
            ? 'No se encontró una cámara en este equipo.'
            : 'No se pudo abrir la cámara. Usa Escribir código.');
      }
    }

    iniciar();
    return () => {
      vivo = false;
      clearTimeout(timer.current);
      if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
      if (audio.current) { try { audio.current.close(); } catch {} audio.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function alternarLuz() {
    const pista = stream.current && stream.current.getVideoTracks()[0];
    if (!pista) return;
    try {
      await pista.applyConstraints({ advanced: [{ torch: !luz }] });
      setLuz(!luz);
    } catch {}
  }

  function enviarManual() {
    const c = texto.trim();
    if (!c) return;
    setTexto('');
    leer(c, true);
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="font-bold">{titulo}</p>
        <button type="button" onClick={() => alCerrar.current()} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><X size={20} /></button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {!error && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-44 w-[78%] max-w-sm rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-2xl border-l-4 border-t-4 border-oro-400" />
              <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-2xl border-r-4 border-t-4 border-oro-400" />
              <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-2xl border-b-4 border-l-4 border-oro-400" />
              <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-2xl border-b-4 border-r-4 border-oro-400" />
              {listo && <span className="linea-escaneo absolute inset-x-3 h-0.5 rounded bg-oro-400" />}
            </div>
          </div>
        )}
        {!listo && !error && <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white/80">Abriendo cámara...</p>}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <p className="max-w-xs rounded-2xl bg-white/10 p-4 text-center text-sm font-semibold">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <p className="text-center text-sm text-white/80">Apunta al código de barras dentro del marco</p>
        <div className="flex gap-2">
          {hayLuz && (
            <button type="button" onClick={alternarLuz} className="h-12 flex-1 rounded-full bg-white/15 text-sm font-bold">{luz ? 'Apagar linterna' : 'Linterna'}</button>
          )}
          <button type="button" onClick={() => setManual(!manual)} className="h-12 flex-1 rounded-full bg-white/15 text-sm font-bold">Escribir código</button>
        </div>
        {manual && (
          <div className="flex gap-2">
            <input inputMode="numeric" autoFocus value={texto} onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enviarManual(); } }}
              placeholder="Escribe el código" className="min-w-0 flex-1 rounded-xl bg-white px-3 py-3 text-stone-900 outline-none" />
            <button type="button" onClick={enviarManual} className="shrink-0 rounded-full bg-oro-400 px-5 font-bold text-vino-950">Buscar</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
