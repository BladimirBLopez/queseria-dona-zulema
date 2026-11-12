'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserRound, ShieldCheck } from 'lucide-react';

export default function PropietarioInicial() {
  const [estado, setEstado] = useState('cargando');
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetch('/api/admin/usuarios/inicial', {
      cache: 'no-store'
    })
      .then(async r => {
        if (!r.ok) {
          throw new Error(
            r.status === 401
              ? 'Inicia sesión como administrador.'
              : 'No se pudo consultar el servidor.'
          );
        }

        return r.json();
      })
      .then(datos => {
        setEstado(
          datos.propietarioCreado
            ? 'creado'
            : 'formulario'
        );
      })
      .catch(error => {
        setMensaje(error.message);
        setEstado('error');
      });
  }, []);

  async function guardar(evento) {
    evento.preventDefault();
    setMensaje('');

    if (clave !== confirmar) {
      setMensaje('Las contraseñas no coinciden.');
      return;
    }

    if (clave.length < 12 || clave.length > 128) {
      setMensaje(
        'La contraseña debe tener entre 12 y 128 caracteres.'
      );
      return;
    }

    setEstado('guardando');

    try {
      const r = await fetch(
        '/api/admin/usuarios/inicial',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre,
            clave
          })
        }
      );

      const datos = await r.json();

      if (!r.ok) {
        throw new Error(
          datos.error || 'No se pudo crear el propietario.'
        );
      }

      setClave('');
      setConfirmar('');
      setEstado('creado');
      setMensaje('Cuenta de propietario creada correctamente.');

    } catch (error) {
      setMensaje(error.message);
      setEstado('formulario');
    }
  }

  return (
    <main className="mx-auto max-w-xl p-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck
            size={32}
            className="text-vino-800"
          />

          <div>
            <h1 className="text-xl font-extrabold text-vino-800">
              Cuenta del propietario
            </h1>

            <p className="text-sm text-stone-500">
              Doña Zulema · Usuarios y permisos
            </p>
          </div>
        </div>

        {estado === 'cargando' && (
          <p>Comprobando configuración...</p>
        )}

        {estado === 'creado' && (
          <div className="space-y-3">
            <p className="font-semibold text-green-700">
              Cuenta de propietario registrada.
            </p>

            <p className="text-sm text-stone-600">
              Usuario: propietario
            </p>

            <p className="text-sm text-stone-600">
              El acceso individual se habilitará
              en la siguiente etapa.
              Mientras tanto, utiliza el
              acceso administrativo actual.
            </p>
          </div>
        )}

        {estado === 'formulario' && (
          <form onSubmit={guardar} className="space-y-4">

            <div className="rounded-xl bg-stone-50 p-3 text-sm">
              <UserRound
                size={18}
                className="mb-2 text-vino-800"
              />

              <p>
                Usuario inicial:
                <strong> propietario</strong>
              </p>

              <p className="mt-1 text-stone-500">
                Este usuario tendrá todos los permisos.
              </p>
            </div>

            <label className="block text-sm font-semibold">
              Nombre del propietario
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-stone-300 p-3"
              />
            </label>

            <label className="block text-sm font-semibold">
              Contraseña nueva
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                value={clave}
                onChange={e => setClave(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-stone-300 p-3"
              />
            </label>

            <label className="block text-sm font-semibold">
              Confirmar contraseña
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-stone-300 p-3"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-vino-800 p-3 font-bold text-white"
            >
              Crear cuenta del propietario
            </button>
          </form>
        )}

        {estado === 'guardando' && (
          <p>Registrando propietario...</p>
        )}

        {mensaje && (
          <p className="mt-4 text-sm text-amber-700">
            {mensaje}
          </p>
        )}

        <Link
          href="/admin/inicio"
          className="mt-6 block text-sm font-semibold text-vino-800"
        >
          Volver al administrador
        </Link>
      </div>
    </main>
  );
}
