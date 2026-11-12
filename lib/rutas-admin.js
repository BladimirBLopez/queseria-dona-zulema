// Reglas compartidas entre login y menu.
// No contienen datos de sesion ni secretos.

const REQUISITOS = {
  '/admin/inicio': [
    'inicio.ver',
    'reportes.ver'
  ],

  '/admin/ventas/nueva': [
    'ventas.crear',
    'productos.ver'
  ],

  '/admin/ventas': [
    'ventas.ver'
  ],

  '/admin/productos': [
    'productos.ver'
  ],

  '/admin/categorias': [
    'categorias.ver'
  ],

  '/admin/gastos': [
    'gastos.ver'
  ],

  '/admin/costos': [
    'costos.ver',
    'productos.ver'
  ],

  '/admin/reportes': [
    'reportes.ver'
  ],

  '/admin/cierre': [
    'cierre.ver',
    'reportes.ver'
  ],

  '/admin/banners': [
    'banners.ver'
  ],

  '/admin/compras': [
    'compras.ver',
    'productos.ver'
  ],

  '/admin/negocio': [
    'negocio.ver'
  ]
};

const PRIORIDADES = {
  administrador: [
    '/admin/inicio',
    '/admin/ventas',
    '/admin/ventas/nueva',
    '/admin/productos',
    '/admin/reportes'
  ],

  cajero: [
    '/admin/ventas/nueva',
    '/admin/ventas'
  ],

  inventario: [
    '/admin/productos',
    '/admin/categorias'
  ],

  contabilidad: [
    '/admin/reportes',
    '/admin/cierre',
    '/admin/gastos',
    '/admin/costos',
    '/admin/inicio'
  ]
};

export function puedeAbrirRuta(
  usuario,
  permisos,
  ruta
) {
  if (!usuario) return false;

  if (usuario.rol === 'propietario') {
    return true;
  }

  if (ruta === '/admin/clave') {
    return true;
  }

  if (
    ruta === '/admin/usuarios' ||
    ruta.startsWith('/admin/usuarios/')
  ) {
    return false;
  }

  const necesarios = REQUISITOS[ruta];

  if (
    !necesarios ||
    !Array.isArray(permisos)
  ) {
    return false;
  }

  const tiene = permiso =>
    permisos.includes(permiso);

  if (!necesarios.every(tiene)) {
    return false;
  }

  // Consultar el catalogo para vender no
  // habilita la pantalla de administracion
  // de productos.
  if (ruta === '/admin/productos') {
    return (
      tiene('stock.mover') ||
      tiene('productos.gestionar')
    );
  }

  return true;
}

export function rutaInicialAdmin(
  usuario,
  permisos
) {
  if (!usuario) return '/admin';

  if (usuario.rol === 'propietario') {
    return '/admin/inicio';
  }

  const candidatos = [
    ...(PRIORIDADES[usuario.rol] || []),
    ...Object.keys(REQUISITOS)
  ];

  const destino = candidatos.find(
    ruta => puedeAbrirRuta(
      usuario,
      permisos,
      ruta
    )
  );

  // Todos los usuarios activos pueden
  // cambiar su propia contraseña.
  return destino || '/admin/clave';
}
