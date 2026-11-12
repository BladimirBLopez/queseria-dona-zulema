'use client';

import { useEffect, useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';

function claveBytes(texto) {
  const relleno = '='.repeat(
    (4 - texto.length % 4) % 4
  );

  const base64 = (
    texto.replace(/-/g, '+').replace(/_/g, '/') +
    relleno
  );

  const binario = atob(base64);

  return Uint8Array.from(
    binario,
    (c) => c.charCodeAt(0)
  );
}

export default function PushToggle() {
  const [estado, setEstado] = useState('cargando');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function revisar() {
      if (
        !window.isSecureContext ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setEstado('incompatible');
        return;
      }

      try {
        const r = await fetch('/api/admin/push', {
          cache: 'no-store'
        });
        if (!r.ok) throw new Error();

        const datos = await r.json();

        if (!datos.configurado) {
          setEstado('sin_configurar');
          return;
        }

        const registro =
          await navigator.serviceWorker.getRegistration(
            '/admin/'
          );

        const suscripcion = registro
          ? await registro.pushManager.getSubscription()
          : null;

        setEstado(suscripcion ? 'activo' : 'inactivo');
      } catch {
        setEstado('error');
      }
    }

    revisar();

    window.addEventListener(
      'dz-push-actualizado',
      revisar
    );

    return () => {
      window.removeEventListener(
        'dz-push-actualizado',
        revisar
      );
    };
  }, []);

  async function activar() {
    setEstado('procesando');
    setMensaje('');

    let nueva = null;

    try {
      const permiso =
        await Notification.requestPermission();

      if (permiso !== 'granted') {
        setEstado('bloqueado');
        return;
      }

      const config = await fetch('/api/admin/push', {
        cache: 'no-store'
      });

      if (!config.ok) throw new Error(
        'No se pudo obtener la configuración.'
      );

      const datos = await config.json();

      if (!datos.configurado || !datos.publicKey) {
        setEstado('sin_configurar');
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
        suscripcion = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: claveBytes(
            datos.publicKey
          )
        });
        nueva = suscripcion;
      }

      const respuesta = await fetch('/api/admin/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: suscripcion.toJSON()
        })
      });

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

      setEstado('activo');
      setMensaje('Este dispositivo recibirá nuevos pedidos.');

    } catch (error) {
      if (nueva) {
        await nueva.unsubscribe().catch(() => {});
      }
      setEstado('inactivo');
      setMensaje(
        error.message || 'No se pudo activar.'
      );
    }
  }

  async function desactivar() {
    setEstado('procesando');
    setMensaje('');

    try {
      const registro =
        await navigator.serviceWorker.getRegistration(
          '/admin/'
        );

      const suscripcion = registro
        ? await registro.pushManager.getSubscription()
        : null;

      if (suscripcion) {
        const respuesta = await fetch(
          '/api/admin/push',
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              endpoint: suscripcion.endpoint
            })
          }
        );

        if (!respuesta.ok) throw new Error(
          'No se pudo eliminar la suscripción.'
        );

        await suscripcion.unsubscribe();
      }

      setEstado('inactivo');
      setMensaje('Notificaciones desactivadas.');
    } catch {
      setEstado('activo');
      setMensaje('No se pudo desactivar.');
    }
  }

  const activo = estado === 'activo';

  return (
    <div className="border-b border-stone-100 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-vino-800">
            Avisos en este dispositivo
          </p>
          <p className="text-xs text-stone-500">
            {activo ? 'Activados' : 'Notificaciones Push'}
          </p>
        </div>

        {['activo', 'inactivo'].includes(estado) && (
          <button
            type="button"
            onClick={activo ? desactivar : activar}
            className="flex items-center gap-1 rounded-full bg-vino-800 px-3 py-2 text-xs font-bold text-white"
          >
            {activo
              ? <BellOff size={14} />
              : <BellRing size={14} />}
            {activo ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </div>

      {estado === 'cargando' && (
        <p className="mt-2 text-xs">Comprobando...</p>
      )}

      {estado === 'procesando' && (
        <p className="mt-2 text-xs">Procesando...</p>
      )}

      {estado === 'incompatible' && (
        <p className="mt-2 text-xs text-amber-700">
          Este navegador no admite Push en este contexto.
        </p>
      )}

      {estado === 'sin_configurar' && (
        <p className="mt-2 text-xs text-amber-700">
          Falta configurar Web Push en el servidor.
        </p>
      )}

      {estado === 'bloqueado' && (
        <p className="mt-2 text-xs text-amber-700">
          Chrome bloqueo las notificaciones. Cambia el permiso del sitio a Permitir, recarga la pagina y vuelve a activar.
        </p>
      )}

      {estado === 'error' && (
        <p className="mt-2 text-xs text-red-600">
          No se pudo consultar el servidor.
        </p>
      )}

      {mensaje && (
        <p className="mt-2 text-xs text-stone-600">
          {mensaje}
        </p>
      )}
    </div>
  );
}
