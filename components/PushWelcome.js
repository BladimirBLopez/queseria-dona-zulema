'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, BellOff } from 'lucide-react';

const CLAVE = 'dz-push-bienvenida-v1';

function convertirClave(texto) {
  const base64 = texto.replace(/-/g, '+')
    .replace(/_/g, '/');

  const completo = base64 +
    '='.repeat((4 - base64.length % 4) % 4);

  return Uint8Array.from(
    atob(completo),
    c => c.charCodeAt(0)
  );
}

export default function PushWelcome() {
  const [mostrar, setMostrar] = useState(false);
  const [estado, setEstado] = useState('listo');
  const [clave, setClave] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let montado = true;

    async function revisar() {
      try {
        if (
          localStorage.getItem(CLAVE) === '1' ||
          !window.isSecureContext ||
          !('serviceWorker' in navigator) ||
          !('PushManager' in window) ||
          !('Notification' in window)
        ) return;

        const r = await fetch('/api/admin/push', {
          cache: 'no-store'
        });

        if (!r.ok) return;

        const config = await r.json();

        if (!config.configurado || !config.publicKey) {
          return;
        }

        const registro =
          await navigator.serviceWorker.getRegistration(
            '/admin/'
          );

        const suscripcion = registro
          ? await registro.pushManager.getSubscription()
          : null;

        if (!montado || suscripcion) return;

        setClave(config.publicKey);
        setEstado(
          Notification.permission === 'denied'
            ? 'bloqueado'
            : 'listo'
        );
        setMostrar(true);

      } catch {
        // No interrumpir el administrador.
      }
    }

    revisar();

    return () => {
      montado = false;
    };
  }, []);

  function cerrar() {
    localStorage.setItem(CLAVE, '1');
    setMostrar(false);
  }

  async function activar() {
    if (estado === 'procesando') return;

    setEstado('procesando');
    setMensaje('');

    let nueva = null;

    try {
      // El permiso se solicita directamente
      // desde el toque del usuario.
      const permiso =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

      if (permiso !== 'granted') {
        setEstado(
          permiso === 'denied'
            ? 'bloqueado'
            : 'listo'
        );

        setMensaje(
          permiso === 'denied'
            ? 'Chrome tiene bloqueadas las notificaciones.'
            : 'Chrome no concedio el permiso.'
        );
        return;
      }

      const registro =
        await navigator.serviceWorker.register(
          '/dz-push-sw.js',
          { scope: '/admin/' }
        );

      let suscripcion =
        await registro.pushManager.getSubscription();

      if (!suscripcion) {
        suscripcion =
          await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertirClave(clave)
          });

        nueva = suscripcion;
      }

      const respuesta = await fetch(
        '/api/admin/push',
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription: suscripcion.toJSON()
          })
        }
      );

      if (!respuesta.ok) {
        const detalle = await respuesta.json()
          .catch(() => ({}));

        const codigo =
          typeof detalle.error === 'string'
            ? detalle.error
            : 'respuesta_invalida';

        throw new Error(
          `Error HTTP ${respuesta.status}: ${codigo}`
        );
      }

      cerrar();

      window.dispatchEvent(
        new Event('dz-push-actualizado')
      );

    } catch (error) {
      if (nueva) {
        await nueva.unsubscribe().catch(() => {});
      }

      setEstado('listo');

      setMensaje(
        error.message ||
        'No se pudieron activar las notificaciones.'
      );
    }
  }

  if (!mostrar) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dz-push-titulo"
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-stone-900 shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-vino-800">
          {estado === 'bloqueado'
            ? <BellOff size={32} />
            : <BellRing size={32} />}
        </div>

        <h2
          id="dz-push-titulo"
          className="text-xl font-extrabold text-vino-800"
        >
          {estado === 'bloqueado'
            ? 'Habilitar notificaciones'
            : 'Recibe avisos de pedidos'}
        </h2>

        {estado === 'bloqueado' ? (
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Chrome tiene bloqueados los avisos.
            Abre la configuración del sitio,
            entra en Permisos, selecciona
            Notificaciones y cambia a Permitir.
            Después recarga Doña Zulema
            y activa los avisos desde la campanita.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-600">
            ¿Quieres recibir una notificación
            cuando un cliente haga un pedido?
            Podrás recibir avisos incluso
            cuando no tengas abierto el administrador.
          </p>
        )}

        {mensaje && (
          <p className="mt-3 text-xs text-amber-700">
            {mensaje}
          </p>
        )}

        {estado !== 'bloqueado' && (
          <button
            type="button"
            onClick={activar}
            disabled={estado === 'procesando'}
            className="mt-5 w-full rounded-xl bg-vino-800 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {estado === 'procesando'
              ? 'Activando...'
              : 'Permitir notificaciones'}
          </button>
        )}

        <button
          type="button"
          onClick={cerrar}
          className="mt-3 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600"
        >
          {estado === 'bloqueado'
            ? 'Entendido'
            : 'Ahora no'}
        </button>

        <p className="mt-4 text-xs text-stone-400">
          Puedes cambiar esta configuración
          desde la campanita del administrador.
        </p>
      </div>
    </div>,
    document.body
  );
}
