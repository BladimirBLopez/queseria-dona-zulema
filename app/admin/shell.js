'use client';
import InstalarApp from '@/components/InstalarApp';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ShoppingCart, Tags, Megaphone, Store, KeyRound, LogOut, ExternalLink, Wallet, X, Plus, Menu as MenuIcon } from 'lucide-react';
import { UsersRound, Truck } from 'lucide-react';
import { puedeAbrirRuta } from '@/lib/rutas-admin';
import Marca from '@/components/Marca';
import Avisos from '@/components/Avisos';
import NotificationBell from '@/components/NotificationBell';

const Svg = ({ size = 20, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const Inicio = (p) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></Svg>;
const Reportes = (p) => <Svg {...p}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></Svg>;
const Costos = (p) => <Svg {...p}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></Svg>;

const Cierre = (p) => <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 12h.01" /><path d="M12 12h.01" /><path d="M16 12h.01" /><path d="M8 16h.01" /><path d="M12 16h.01" /><path d="M16 16h.01" /></Svg>;

const GRUPOS = [
  ['Principal', [['/admin/inicio', 'Inicio', Inicio]]],
  ['Ventas', [['/admin/ventas/nueva', 'Nueva venta', Plus], ['/admin/ventas', 'Ventas', ShoppingCart]]],
  ['Inventario', [['/admin/productos', 'Productos', Package], ['/admin/categorias', 'Categorías', Tags]]],
  ['Contabilidad', [['/admin/compras', 'Compras', Truck], ['/admin/gastos', 'Gastos', Wallet], ['/admin/costos', 'Costos', Costos], ['/admin/reportes', 'Reportes', Reportes], ['/admin/cierre', 'Cierre de caja', Cierre]]],
  ['Tienda web', [['/admin/banners', 'Ofertas', Megaphone], ['/admin/negocio', 'Negocio', Store]]],
  ['Administración', [['/admin/usuarios', 'Usuarios y permisos', UsersRound]]],
];
const CLAVE = ['/admin/clave', 'Clave', KeyRound];
const LINKS = [...GRUPOS.flatMap(([, l]) => l), CLAVE];
const PRINCIPAL = ['/admin/inicio', '/admin/ventas/nueva', '/admin/ventas', '/admin/productos'].map((h) => LINKS.find(([x]) => x === h));


export default function Shell({ children }) {
  const path = usePathname();
  const [ok, setOk] = useState(false);
  const [comprobandoSesion, setComprobandoSesion] =
    useState(true);
  const [N, setN] = useState(null);
  const [mas, setMas] = useState(false);
  const [usuarioSesion, setUsuarioSesion] = useState(null);
  const [permisosSesion, setPermisosSesion] = useState([]);
  const saliendo = useRef(false);
  const exacto = ['/admin', '/admin/ventas'];
  const on = (href) => (exacto.includes(href) ? path === href : path.startsWith(href));
  const actual = LINKS.find(([h]) => on(h));
  const marca = N || { nombre: 'Doña Zulema', logo: '' };

  const puedeVerPermiso = (permiso) =>
    usuarioSesion?.rol === 'propietario' ||
    (
      Boolean(usuarioSesion) &&
      permisosSesion.includes(permiso)
    );

  const puedeVerRuta = (href) =>
    puedeAbrirRuta(
      usuarioSesion,
      permisosSesion,
      href
    );

  const gruposVisibles = GRUPOS
    .map(([grupo, links]) => [
      grupo,
      links.filter(([href]) => puedeVerRuta(href))
    ])
    .filter(([, links]) => links.length > 0);



  useEffect(() => {
    let activo = true;

    async function check() {
      if (activo) {
        setComprobandoSesion(true);
      }

      try {
        const r = await fetch(
          '/api/admin/sesion',
          { cache: 'no-store' }
        );

        if (!activo) return;

        setOk(r.ok);

        if (r.ok) {
          const datos = await r.json()
            .catch(() => ({}));

          if (activo) {
            setUsuarioSesion(datos.usuario || null);
            setPermisosSesion(
              Array.isArray(datos.permisos)
                ? datos.permisos
                : []
            );
          }
        } else {
          setUsuarioSesion(null);
          setPermisosSesion([]);
        }

        if (!r.ok) {
          setN(null);
          return;
        }

        const negocio = await fetch(
          '/api/admin/identidad',
          { cache: 'no-store' }
        );

        if (negocio.ok && activo) {
          setN(await negocio.json());
        }

      } catch {
        if (activo) {
          setOk(false);
          setN(null);
          setUsuarioSesion(null);
          setPermisosSesion([]);
        }
      } finally {
        if (activo) {
          setComprobandoSesion(false);
        }
      }
    }

    check();

    window.addEventListener(
      'admin-auth', check
    );

    return () => {
      activo = false;
      window.removeEventListener(
        'admin-auth', check
      );
    };
  }, [path]);

  useEffect(() => { setMas(false); }, [path]);

  useEffect(() => {
    if (!mas) return;
    const esc = (e) => e.key === 'Escape' && setMas(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc); };
  }, [mas]);

  async function salir(evento) {
    evento.preventDefault();

    if (saliendo.current) return;
    saliendo.current = true;

    try {
      if (
        usuarioSesion?.rol === 'propietario' &&
        'serviceWorker' in navigator
      ) {
        const registro =
          await navigator.serviceWorker.getRegistration(
            '/admin/'
          );

        const suscripcion =
          await registro?.pushManager?.getSubscription();

        if (suscripcion) {
          let eliminadoServidor = false;
          let eliminadoNavegador = false;

          try {
            const respuesta = await fetch(
              '/api/admin/push',
              {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  endpoint: suscripcion.endpoint
                })
              }
            );

            eliminadoServidor = respuesta.ok;
          } catch {
            eliminadoServidor = false;
          }

          try {
            eliminadoNavegador =
              await suscripcion.unsubscribe();
          } catch {
            eliminadoNavegador = false;
          }

          if (
            !eliminadoServidor &&
            !eliminadoNavegador
          ) {
            window.alert(
              'No se pudieron desactivar las ' +
              'notificaciones de este dispositivo. ' +
              'Intenta nuevamente antes de salir.'
            );

            saliendo.current = false;
            return;
          }
        }
      }

      window.location.assign('/api/admin/logout');

    } catch {
      saliendo.current = false;

      window.alert(
        'No se pudo comprobar la suscripcion Push. ' +
        'Intenta nuevamente para cerrar sesion.'
      );
    }
  }


  // No montar paginas privadas mientras se comprueba
  // la sesion. Esto evita ejecutar sus efectos.
  if (comprobandoSesion) {
    return (
      <main className="admin grid min-h-screen place-items-center bg-panel p-6">
        <p
          role="status"
          className="text-center text-sm text-stone-600"
        >
          Verificando acceso...
        </p>
      </main>
    );
  }

  // El unico acceso publico del administrador
  // es la pagina de inicio de sesion.
  if (!ok || !usuarioSesion) {
    if (path === '/admin') {
      return (
        <div className="admin min-h-screen bg-panel">
          {children}
          <Avisos />
        </div>
      );
    }

    return (
      <main className="admin grid min-h-screen place-items-center bg-panel p-5">
        <section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-vino-800">
            Sesión requerida
          </h1>

          <p className="mt-3 text-sm text-stone-600">
            Debes iniciar sesión para acceder
            al administrador de Doña Zulema.
          </p>

          <Link
            href="/admin"
            className="mt-5 inline-block rounded-xl bg-vino-800 px-5 py-3 font-bold text-white"
          >
            Iniciar sesión
          </Link>
        </section>
      </main>
    );
  }

  // Nunca montar paginas que no correspondan
  // a los permisos efectivos del empleado.
  if (path !== '/admin' && !puedeVerRuta(path)) {
    const primeraRuta = [
      ...PRINCIPAL,
      ...GRUPOS.flatMap(([, links]) => links)
    ].find(([href]) => puedeVerRuta(href))?.[0]
      || '/admin/clave';

    return (
      <main className="admin grid min-h-screen place-items-center bg-panel p-5">
        <section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-vino-800">
            Acceso restringido
          </h1>

          <p className="mt-3 text-sm text-stone-600">
            Tu cuenta no tiene autorización
            para abrir esta sección.
          </p>

          <Link
            href={primeraRuta}
            className="mt-5 inline-block rounded-xl bg-vino-800 px-5 py-3 font-bold text-white"
          >
            Ir a un módulo autorizado
          </Link>
        </section>
      </main>
    );
  }

  const tab = (a) => `flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${a ? 'text-vino-800' : 'text-stone-500'}`;
  const pill = (a) => `grid h-7 w-12 place-items-center rounded-full transition ${a ? 'bg-vino-100' : ''}`;
  const item = (a) => `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${a ? 'bg-oro-400 text-vino-950 shadow-sm' : 'text-vino-100 hover:bg-white/10'}`;

  return (
    <div className="admin min-h-screen bg-panel">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto bg-vino-950 p-5 text-white md:flex">
        <div className="mb-7 flex items-center gap-3">
          <Marca N={marca} />
          <div className="min-w-0">
            <p className="truncate font-brand text-lg font-extrabold leading-none">{marca.nombre}</p>
            <p className="mt-1 text-xs text-vino-200">Panel de administración</p>
          </div>
        </div>
        <div className="space-y-5">
          {gruposVisibles.map(([g, links]) => (
            <div key={g}>
              <p className="mb-1.5 px-4 text-[11px] font-bold uppercase tracking-widest text-vino-300">{g}</p>
              <nav className="space-y-0.5">
                {links.map(([href, t, Icon]) => (
                  <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined} className={item(on(href))}>
                    <Icon size={18} /> {t}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="mt-auto space-y-0.5 border-t border-white/10 pt-3">
          <Link href={CLAVE[0]} className={item(on(CLAVE[0]))}><KeyRound size={18} /> Clave</Link>
          <InstalarApp className={item(false) + ' w-full'} />
          <a href="/" target="_blank" rel="noopener noreferrer" className={item(false)}><ExternalLink size={18} /> Ver sitio</a>
          <a href="/api/admin/logout" onClick={salir} className={item(false)}><LogOut size={18} /> Salir</a>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-vino-950 px-4 py-2.5 text-white md:fixed md:right-5 md:top-3 md:z-40 md:w-auto md:border-0 md:bg-transparent md:p-0">
        <div className="flex min-w-0 items-center gap-2.5 md:hidden">
          <button type="button" onClick={() => setMas(true)} aria-label="Abrir menú" className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10"><MenuIcon size={22} /></button>
          <span className="shrink-0 [&>*]:!h-8 [&>*]:!w-8 [&>*]:!text-base"><Marca N={marca} /></span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-serif text-base font-extrabold">{actual ? actual[1] : 'Admin'}</p>
            <p className="truncate text-[11px] text-vino-200">{marca.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {puedeVerPermiso('notificaciones.ver') && (
            <NotificationBell
              permitirPush={
                usuarioSesion?.rol === 'propietario'
              }
            />
          )}
          <a href="/" target="_blank" rel="noopener noreferrer" aria-label="Ver sitio" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 md:hidden"><ExternalLink size={18} /></a>
          <a href="/api/admin/logout" onClick={salir} aria-label="Salir" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 md:hidden"><LogOut size={18} /></a>
        </div>
      </header>

      <div className="md:pl-64">
        <div className="mx-auto max-w-5xl pb-28 pt-2 md:pb-10">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden">
        {PRINCIPAL
          .filter(([href]) => puedeVerRuta(href))
          .map(([href, t, Icon]) => (
          <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined} className={tab(on(href))}>
            <span className={pill(on(href))}><Icon size={20} /></span>
            {t}
          </Link>
        ))}
        
      </nav>

      <Avisos />

      {mas && (
        <div className="fade-in fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMas(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-vino-950 p-5 text-white shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Marca N={marca} />
                <p className="truncate font-brand text-lg font-extrabold leading-none">{marca.nombre}</p>
              </div>
              <button type="button" onClick={() => setMas(false)} aria-label="Cerrar menú" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10"><X size={20} /></button>
            </div>
            <div className="space-y-5">
              {gruposVisibles.map(([g, links]) => (
                <div key={g}>
                  <p className="mb-1.5 px-4 text-[11px] font-bold uppercase tracking-widest text-vino-300">{g}</p>
                  <nav className="space-y-0.5">
                    {links.map(([href, t, Icon]) => (
                      <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined} className={item(on(href))}>
                        <Icon size={18} /> {t}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-0.5 border-t border-white/10 pt-3">
              <Link href={CLAVE[0]} className={item(on(CLAVE[0]))}><KeyRound size={18} /> Clave</Link>
              <InstalarApp className={item(false) + ' w-full'} />
              <a href="/" target="_blank" rel="noopener noreferrer" className={item(false)}><ExternalLink size={18} /> Ver sitio</a>
              <a href="/api/admin/logout" onClick={salir} className={item(false)}><LogOut size={18} /> Salir</a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
