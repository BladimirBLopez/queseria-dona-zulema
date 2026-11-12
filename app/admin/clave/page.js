'use client';

import { useState } from 'react';

const MENSAJES = {
  no_autorizado:
    'Tu sesión ha vencido. Vuelve a ingresar.',
  origen_invalido:
    'Solicitud no autorizada.',
  demasiados_intentos:
    'Demasiados intentos. Intenta más tarde.',
  clave_invalida:
    'La nueva contraseña debe tener entre 12 y 128 caracteres y ser diferente de la actual.',
  clave_actual_incorrecta:
    'La contraseña actual es incorrecta.',
  clave_no_actualizada:
    'No se pudo actualizar la contraseña. Intenta nuevamente.',
  error_servidor:
    'Ocurrió un error del servidor.'
};

export default function Clave() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function enviar(evento) {
    evento.preventDefault();

    if (guardando) return;

    setMensaje('');

    if (nueva !== repetir) {
      setMensaje(
        'Las contraseñas nuevas no coinciden.'
      );
      return;
    }

    if (
      nueva.length < 12 ||
      nueva.length > 128 ||
      nueva === actual
    ) {
      setMensaje(MENSAJES.clave_invalida);
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(
        '/api/admin/clave',
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            actual,
            nueva
          })
        }
      );

      const datos = await respuesta.json()
        .catch(() => ({}));

      if (!respuesta.ok) {
        setMensaje(
          MENSAJES[datos.error] ||
          'No se pudo cambiar la contraseña.'
        );
        return;
      }

      // Las sesiones fueron revocadas.
      // Cerrar cookies y regresar al login.
      window.location.replace(
        '/api/admin/logout'
      );

    } catch {
      setMensaje(
        'No se pudo conectar con el servidor.'
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <form
        onSubmit={enviar}
        className="space-y-5 rounded-2xl bg-white p-5 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold text-vino-800">
            Cambiar mi contraseña
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Este cambio corresponde únicamente
            a tu cuenta personal.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold">
            Contraseña actual
          </span>

          <input
            type="password"
            required
            value={actual}
            onChange={e => setActual(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-stone-300 p-3"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold">
            Nueva contraseña
          </span>

          <input
            type="password"
            required
            minLength={12}
            maxLength={128}
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-stone-300 p-3"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold">
            Confirmar nueva contraseña
          </span>

          <input
            type="password"
            required
            minLength={12}
            maxLength={128}
            value={repetir}
            onChange={e => setRepetir(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-stone-300 p-3"
          />
        </label>

        {mensaje && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {mensaje}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-vino-800 p-3 font-bold text-white disabled:opacity-50"
        >
          {guardando
            ? 'Actualizando...'
            : 'Cambiar contraseña'}
        </button>

        <p className="text-xs text-stone-500">
          Por seguridad, al cambiar tu contraseña
          se cerrarán tus sesiones y deberás
          volver a iniciar sesión.
        </p>
      </form>
    </main>
  );
}
