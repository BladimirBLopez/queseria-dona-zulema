'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';

import Link from 'next/link';
import PushToggle from '@/components/PushToggle';
import PushWelcome from '@/components/PushWelcome';

import {
  Bell,
  Volume2,
  VolumeX,
  RefreshCw
} from 'lucide-react';

function fechaBO(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function NotificationBell({
  permitirPush = false
}) {
  const [abierto, setAbierto] = useState(false);
  const [sonido, setSonido] = useState(false);
  const [total, setTotal] = useState(0);
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

  const ultimoId = useRef(null);
  const audio = useRef(null);
  const sonidoActivo = useRef(false);
  const consultando = useRef(false);
  const contenedor = useRef(null);

  const tocar = useCallback(() => {
    const ctx = audio.current;

    if (
      !sonidoActivo.current ||
      !ctx ||
      ctx.state !== 'running'
    ) return;

    try {
      for (const [frecuencia, demora] of [
        [880, 0],
        [1175, 0.17]
      ]) {
        const oscilador = ctx.createOscillator();
        const volumen = ctx.createGain();
        const t = ctx.currentTime + demora;

        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(
          frecuencia, t
        );

        volumen.gain.setValueAtTime(
          0.0001, t
        );

        volumen.gain.exponentialRampToValueAtTime(
          0.12, t + 0.018
        );

        volumen.gain.exponentialRampToValueAtTime(
          0.0001, t + 0.14
        );

        oscilador.connect(volumen);
        volumen.connect(ctx.destination);

        oscilador.start(t);
        oscilador.stop(t + 0.15);
      }
    } catch {
      // El navegador puede bloquear el audio.
    }
  }, []);

  const actualizar = useCallback(async () => {
    if (consultando.current) return;

    consultando.current = true;
    setCargando(true);

    try {
      const respuesta = await fetch(
        '/api/admin/notificaciones',
        { cache: 'no-store' }
      );

      if (!respuesta.ok) {
        throw new Error('Error de notificaciones');
      }

      const datos = await respuesta.json();

      const lista = Array.isArray(datos.pedidos)
        ? datos.pedidos
        : [];

      const mayorId = lista.reduce(
        (max, pedido) => Math.max(
          max,
          Number(pedido.id) || 0
        ),
        0
      );

      if (
        ultimoId.current !== null &&
        mayorId > ultimoId.current
      ) {
        tocar();
      }

      ultimoId.current = Math.max(
        ultimoId.current || 0,
        mayorId
      );

      setPedidos(lista);
      setTotal(Number(datos.total) || 0);
      setError(false);

    } catch {
      setError(true);
    } finally {
      consultando.current = false;
      setCargando(false);
    }
  }, [tocar]);

  useEffect(() => {
    actualizar();

    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') {
        actualizar();
      }
    }, 20000);

    const volver = () => {
      if (document.visibilityState === 'visible') {
        actualizar();
      }
    };

    document.addEventListener(
      'visibilitychange', volver
    );

    window.addEventListener('focus', volver);

    return () => {
      clearInterval(intervalo);

      document.removeEventListener(
        'visibilitychange', volver
      );

      window.removeEventListener('focus', volver);

      if (audio.current) {
        audio.current.close().catch(() => {});
        audio.current = null;
      }
    };
  }, [actualizar]);

  useEffect(() => {
    if (!abierto) return;

    const cerrar = (e) => {
      if (
        e.type === 'keydown' &&
        e.key === 'Escape'
      ) {
        setAbierto(false);
      }

      if (
        e.type === 'pointerdown' &&
        contenedor.current &&
        !contenedor.current.contains(e.target)
      ) {
        setAbierto(false);
      }
    };

    document.addEventListener(
      'pointerdown', cerrar
    );

    window.addEventListener('keydown', cerrar);

    return () => {
      document.removeEventListener(
        'pointerdown', cerrar
      );

      window.removeEventListener(
        'keydown', cerrar
      );
    };
  }, [abierto]);

  async function alternarSonido() {
    if (sonidoActivo.current) {
      sonidoActivo.current = false;
      setSonido(false);
      return;
    }

    try {
      const Audio = window.AudioContext ||
        window.webkitAudioContext;

      if (!Audio) {
        throw new Error('Audio no disponible');
      }

      if (!audio.current) {
        audio.current = new Audio();
      }

      await audio.current.resume();

      sonidoActivo.current = true;
      setSonido(true);
      tocar();

    } catch {
      sonidoActivo.current = false;
      setSonido(false);
    }
  }

  function verPedidos() {
    setAbierto(false);

    window.dispatchEvent(
      new Event('dz-ver-pedidos')
    );
  }

  return (
    <div className="relative" ref={contenedor}>
      {permitirPush && <PushWelcome />}
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        title="Pedidos pendientes"
        aria-label={
          `Notificaciones: ${total} pedidos pendientes`
        }
        aria-expanded={abierto}
        className="relative grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10 md:h-11 md:w-11 md:bg-white md:text-vino-800 md:shadow-card"
      >
        <Bell size={21} />

        {total > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-5 text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-stone-200 bg-white text-stone-900 shadow-lift md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-3 md:w-[380px]">

          <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-vino-800">
                Pedidos por confirmar
              </p>
              <p className="text-xs text-stone-500">
                {total} pedidos pendientes
              </p>
            </div>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={alternarSonido}
                title={sonido
                  ? 'Desactivar sonido'
                  : 'Activar sonido'}
                aria-label={sonido
                  ? 'Desactivar sonido'
                  : 'Activar sonido'}
                className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-vino-800"
              >
                {sonido
                  ? <Volume2 size={18} />
                  : <VolumeX size={18} />}
              </button>

              <button
                type="button"
                onClick={actualizar}
                disabled={cargando}
                title="Actualizar"
                aria-label="Actualizar"
                className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-vino-800 disabled:opacity-40"
              >
                <RefreshCw
                  size={17}
                  className={cargando
                    ? 'animate-spin'
                    : ''}
                />
              </button>
            </div>
          </div>

          {permitirPush && <PushToggle />}

          {error && (
            <p className="bg-amber-50 px-4 py-2 text-xs text-amber-800">
              No se pudo actualizar la lista.
            </p>
          )}

          {!sonido && (
            <p className="bg-stone-50 px-4 py-2 text-xs text-stone-500">
              Activa el sonido para recibir alertas.
            </p>
          )}

          <div className="max-h-72 overflow-y-auto">
            {pedidos.map(p => (
              <Link
                key={p.id}
                href="/admin/ventas?tab=pedidos"
                onClick={verPedidos}
                className="block border-b border-stone-100 px-4 py-3 hover:bg-stone-50"
              >
                <span className="block text-sm font-semibold">
                  #{p.id} · {p.cliente_nombre ||
                    'Cliente sin nombre'}
                </span>
                <span className="block text-xs text-stone-500">
                  {fechaBO(p.creado)}
                </span>
              </Link>
            ))}

            {!pedidos.length && !error && (
              <p className="px-4 py-8 text-center text-sm text-stone-500">
                No hay pedidos pendientes.
              </p>
            )}
          </div>

          <Link
            href="/admin/ventas?tab=pedidos"
            onClick={verPedidos}
            className="block bg-vino-800 px-4 py-3 text-center text-sm font-bold text-white"
          >
            Ver todos los pedidos
          </Link>
        </div>
      )}
    </div>
  );
}
