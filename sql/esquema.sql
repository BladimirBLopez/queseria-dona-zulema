-- Quesería y Fiambrería Doña Zulema: esquema para el SQL Editor de Neon.
-- Se puede volver a correr (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key text NOT NULL,
  window_start bigint NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  endpoint text PRIMARY KEY,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id serial PRIMARY KEY,
  titulo text,
  texto text,
  boton text,
  imagen_url text,
  imagen_public_id text,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  creado timestamptz NOT NULL DEFAULT now()
);

-- Usuarios, permisos y sesiones
CREATE TABLE IF NOT EXISTS dz_usuarios (
  id bigserial PRIMARY KEY,
  nombre text NOT NULL,
  usuario text NOT NULL,
  password_hash text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('propietario','administrador','cajero','inventario','contabilidad')),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso_en timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS dz_usuarios_usuario_uq ON dz_usuarios (lower(usuario));
CREATE UNIQUE INDEX IF NOT EXISTS dz_un_solo_propietario ON dz_usuarios (rol) WHERE rol = 'propietario';

CREATE TABLE IF NOT EXISTS dz_permisos_usuario (
  usuario_id bigint NOT NULL REFERENCES dz_usuarios(id) ON DELETE CASCADE,
  permiso text NOT NULL,
  permitido boolean NOT NULL,
  PRIMARY KEY (usuario_id, permiso)
);

CREATE TABLE IF NOT EXISTS dz_sesiones (
  token_hash char(64) PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES dz_usuarios(id) ON DELETE CASCADE,
  creado_en timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL,
  revocado_en timestamptz
);
CREATE INDEX IF NOT EXISTS dz_sesiones_usuario_idx ON dz_sesiones (usuario_id);
CREATE INDEX IF NOT EXISTS dz_sesiones_expira_idx ON dz_sesiones (expira_en);

-- Catálogo
CREATE TABLE IF NOT EXISTS lineas (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  slug text NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categorias (
  id serial PRIMARY KEY,
  linea_id integer NOT NULL REFERENCES lineas(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  slug text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  UNIQUE (linea_id, slug)
);

CREATE TABLE IF NOT EXISTS productos (
  id serial PRIMARY KEY,
  categoria_id integer NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  descripcion text,
  precio_menor numeric(12,2) CHECK (precio_menor IS NULL OR precio_menor >= 0),
  precio_mayor numeric(12,2) CHECK (precio_mayor IS NULL OR precio_mayor >= 0),
  mayor_desde numeric(12,3) CHECK (mayor_desde IS NULL OR mayor_desde > 0),
  unidad text NOT NULL DEFAULT 'kg',
  imagen_url text,
  imagen_public_id text,
  disponible boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  creado timestamptz NOT NULL DEFAULT now(),
  costo numeric(12,2) CHECK (costo IS NULL OR costo >= 0),
  stock numeric(12,3),
  stock_min numeric(12,3),
  codigo text,
  CHECK (stock IS NULL OR stock >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS productos_codigo_uq ON productos (codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS productos_categoria_idx ON productos (categoria_id);

-- Pedidos y ventas (el ciclo pedido <-> venta se cierra con un ALTER al final)
CREATE TABLE IF NOT EXISTS pedidos (
  id serial PRIMARY KEY,
  creado timestamptz NOT NULL DEFAULT now(),
  cliente_nombre text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2) CHECK (total IS NULL OR total >= 0),
  estado text NOT NULL DEFAULT 'pendiente',
  venta_id integer
);
CREATE INDEX IF NOT EXISTS pedidos_estado_idx ON pedidos (estado);

CREATE TABLE IF NOT EXISTS ventas (
  id serial PRIMARY KEY,
  fecha timestamptz NOT NULL DEFAULT now(),
  cliente_nombre text,
  cliente_tel text,
  tipo text NOT NULL DEFAULT 'menor' CHECK (tipo IN ('menor','mayor')),
  metodo text,
  descuento numeric(12,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  pagado numeric(12,2) NOT NULL DEFAULT 0 CHECK (pagado >= 0),
  nota text,
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','anulada')),
  pedido_id integer REFERENCES pedidos(id),
  clave text,
  usuario_id bigint REFERENCES dz_usuarios(id),
  anulada_en timestamptz,
  anulada_por bigint REFERENCES dz_usuarios(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ventas_clave_uq ON ventas (clave) WHERE clave IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ventas_pedido_uq ON ventas (pedido_id) WHERE pedido_id IS NOT NULL AND estado <> 'anulada';
CREATE INDEX IF NOT EXISTS ventas_fecha_idx ON ventas (fecha);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_venta_fk') THEN
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_venta_fk FOREIGN KEY (venta_id) REFERENCES ventas(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS venta_items (
  id serial PRIMARY KEY,
  venta_id integer NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id text,
  nombre text NOT NULL,
  unidad text,
  cantidad numeric(12,3) NOT NULL CHECK (cantidad > 0),
  precio numeric(12,2) NOT NULL CHECK (precio >= 0),
  costo numeric(12,2) CHECK (costo IS NULL OR costo >= 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  precio_lista numeric(12,2)
);
CREATE INDEX IF NOT EXISTS venta_items_venta_idx ON venta_items (venta_id);
CREATE INDEX IF NOT EXISTS venta_items_producto_idx ON venta_items (producto_id);

CREATE TABLE IF NOT EXISTS pagos (
  id serial PRIMARY KEY,
  venta_id integer NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  metodo text,
  fecha timestamptz NOT NULL DEFAULT now(),
  usuario_id bigint REFERENCES dz_usuarios(id)
);
CREATE INDEX IF NOT EXISTS pagos_venta_idx ON pagos (venta_id);

CREATE TABLE IF NOT EXISTS stock_mov (
  id serial PRIMARY KEY,
  producto_id text NOT NULL,
  cantidad numeric(12,3) NOT NULL,
  motivo text,
  ref text,
  fecha timestamptz NOT NULL DEFAULT now(),
  usuario_id bigint REFERENCES dz_usuarios(id)
);
CREATE INDEX IF NOT EXISTS stock_mov_ref_idx ON stock_mov (ref, producto_id);

-- Compras, proveedores, gastos y cierre
CREATE TABLE IF NOT EXISTS proveedores (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  telefono text,
  nota text,
  activo boolean NOT NULL DEFAULT true,
  creado timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS proveedores_nombre_uq ON proveedores (lower(nombre));

CREATE TABLE IF NOT EXISTS compras (
  id serial PRIMARY KEY,
  fecha date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/La_Paz')::date),
  proveedor_id integer REFERENCES proveedores(id),
  metodo text,
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  nota text,
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','anulada')),
  clave text,
  creado timestamptz NOT NULL DEFAULT now(),
  de_caja boolean NOT NULL DEFAULT false,
  usuario_id bigint REFERENCES dz_usuarios(id),
  anulada_en timestamptz,
  anulada_por bigint REFERENCES dz_usuarios(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS compras_clave_uq ON compras (clave) WHERE clave IS NOT NULL;
CREATE INDEX IF NOT EXISTS compras_fecha_idx ON compras (fecha);

CREATE TABLE IF NOT EXISTS compra_items (
  id serial PRIMARY KEY,
  compra_id integer NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id text,
  nombre text NOT NULL,
  unidad text,
  cantidad numeric(12,3) NOT NULL CHECK (cantidad > 0),
  costo numeric(12,2) NOT NULL CHECK (costo >= 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0)
);
CREATE INDEX IF NOT EXISTS compra_items_compra_idx ON compra_items (compra_id);

CREATE TABLE IF NOT EXISTS gastos (
  id serial PRIMARY KEY,
  fecha date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/La_Paz')::date),
  concepto text NOT NULL,
  categoria text,
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  creado timestamptz NOT NULL DEFAULT now(),
  metodo text,
  de_caja boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS gastos_fecha_idx ON gastos (fecha);

CREATE TABLE IF NOT EXISTS cierres_caja (
  fecha date PRIMARY KEY,
  apertura numeric(12,2) NOT NULL DEFAULT 0,
  efectivo numeric(12,2) NOT NULL DEFAULT 0,
  compras numeric(12,2) NOT NULL DEFAULT 0,
  gastos numeric(12,2) NOT NULL DEFAULT 0,
  esperado numeric(12,2) NOT NULL DEFAULT 0,
  contado numeric(12,2) NOT NULL DEFAULT 0,
  diferencia numeric(12,2) NOT NULL DEFAULT 0,
  deja numeric(12,2) NOT NULL DEFAULT 0,
  creado timestamptz NOT NULL DEFAULT now(),
  usuario_id bigint REFERENCES dz_usuarios(id)
);

-- Datos iniciales (FALTA: productos del banner, el dueño pone precios y fotos)
INSERT INTO lineas (nombre, slug, orden)
VALUES ('Quesería y Fiambrería', 'queseria-fiambreria', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categorias (linea_id, nombre, slug, orden)
SELECT l.id, c.nombre, c.slug, c.orden
FROM lineas l,
  (VALUES ('Quesos','quesos',1), ('Fiambres Sofía','fiambres-sofia',2),
          ('Fiambres argentinos','fiambres-argentinos',3), ('Lácteos PIL','lacteos-pil',4)) AS c(nombre, slug, orden)
WHERE l.slug = 'queseria-fiambreria'
ON CONFLICT (linea_id, slug) DO NOTHING;

-- Verificación (debe dar: tablas 20, lineas 1, categorias 4)
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS tablas,
  (SELECT count(*) FROM lineas) AS lineas,
  (SELECT count(*) FROM categorias) AS categorias;
