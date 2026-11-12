'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { rutaInicialAdmin } from '@/lib/rutas-admin';

export default function AccesoIndividual() {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    fetch('/api/admin/sesion', {
      cache: 'no-store',
      credentials: 'same-origin'
    })
      .then(async respuesta => {
        if (!respuesta.ok) return;

        const datos = await respuesta.json()
          .catch(() => null);

        if (
          activo &&
          datos?.ok &&
          datos.usuario
        ) {
          window.location.replace(
            rutaInicialAdmin(
              datos.usuario,
              datos.permisos
            )
          );
        }
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  async function ingresar(evento) {
    evento.preventDefault();

    if (ocupado) return;

    const nombre = usuario.trim().toLowerCase();

    if (nombre.length < 3 || !clave) {
      setError('Escribe tu usuario y tu contraseña.');
      return;
    }

    setOcupado(true);
    setError('');

    try {
      const respuesta = await fetch(
        '/api/admin/login',
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            usuario: nombre,
            clave
          })
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        const mensaje = {
          credenciales_invalidas:
            'Usuario o clave incorrectos.',
          demasiados_intentos:
            'Demasiados intentos, espera unos minutos.',
          origen_invalido:
            'Solicitud no autorizada.'
        };

        throw new Error(
          mensaje[datos.error] ||
          (respuesta.status === 429
            ? 'Demasiados intentos, espera unos minutos.'
            : null) ||
          'No se pudo iniciar sesión (HTTP ' + respuesta.status + ').'
        );
      }

      // Obtener los permisos de la nueva sesion
      // antes de elegir el modulo de destino.
      const respuestaSesion = await fetch(
        '/api/admin/sesion',
        {
          cache: 'no-store',
          credentials: 'same-origin'
        }
      );

      const datosSesion = await respuestaSesion.json()
        .catch(() => null);

      if (
        !respuestaSesion.ok ||
        !datosSesion?.ok ||
        !datosSesion.usuario
      ) {
        throw new Error(
          'La sesión se creó, pero no se pudo ' +
          'verificar el acceso. Actualiza la página.'
        );
      }

      window.location.replace(
        rutaInicialAdmin(
          datosSesion.usuario,
          datosSesion.permisos
        )
      );

    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  }

  return (
    <main className="grid min-h-[80vh] place-items-center p-4">
      <form
        onSubmit={ingresar}
        className="w-full max-w-sm space-y-5 rounded-3xl border-t-4 border-oro-400 bg-white p-7 shadow-lg"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-oro-200 text-vino-800">
            <LockKeyhole size={30} />
          </div>

          <h1 className="text-3xl font-extrabold text-vino-800" style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}>
            Doña Zulema
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Quesería y Fiambrería · Acceso al sistema
          </p>
        </div>

        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-sm font-bold text-stone-700">
            <UserRound size={16} />
            Usuario
          </span>

          <input
            type="text"
            value={usuario}
            onChange={e => setUsuario(e.target.value.replace(/\s/g, '').toLowerCase())}
            required
            maxLength={60}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border border-stone-300 p-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 text-sm font-bold text-stone-700">
            Contraseña
          </span>

          <input
            type={ver ? 'text' : 'password'}
            value={clave}
            onChange={e => setClave(e.target.value)}
            required
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={128}
            className="w-full rounded-xl border border-stone-300 p-3"
          />
        </label>

        <button
          type="button"
          onClick={() => setVer(v => !v)}
          className="-mt-2 flex items-center gap-2 text-sm font-semibold text-vino-800"
        >
          {ver ? <EyeOff size={18} /> : <Eye size={18} />}
          {ver ? 'Ocultar contraseña' : 'Ver contraseña'}
        </button>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={ocupado}
          className="w-full rounded-xl bg-vino-800 px-4 py-3 font-bold text-white hover:bg-vino-900 disabled:opacity-50"
        >
          {ocupado ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-xs text-stone-500">
          El acceso depende de los permisos asignados.
        </p>
      </form>
    </main>
  );
}
