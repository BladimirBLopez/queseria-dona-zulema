import { toast } from 'sonner';

const conDetalle = (t, d, id) => {
  const o = {};
  if (d) o.description = d;
  if (id) o.id = id;
  return o;
};

export const avisar = {
  ok: (t, d, id) => toast.success(t, conDetalle(t, d, id)),
  error: (t, d, id) => toast.error(t, conDetalle(t, d, id)),
  aviso: (t, d, id) => toast.warning(t, conDetalle(t, d, id)),
  info: (t, d, id) => toast(t, conDetalle(t, d, id)),
  cargando: (t, id) => toast.loading(t, id ? { id } : undefined),
};

const AVISO = /^(escribe|revisa|la foto pesa|la entrada|no puede|agrega|para fiado|hay un|monto inv|esa venta)/i;
const ERROR = /^(no se pudo|no se puede|error|falta|faltan|sin conexi)/i;

export function avisoAuto(texto) {
  const t = String(texto || '').trim();
  if (!t) return;
  if (ERROR.test(t)) return avisar.error(t);
  if (AVISO.test(t)) return avisar.aviso(t);
  if (/^sin cambios/i.test(t)) return avisar.info(t);
  return avisar.ok(t);
}

let escuchar = null;

export function _registrar(fn) {
  escuchar = fn;
  return () => { if (escuchar === fn) escuchar = null; };
}

export function confirmar(opciones = {}) {
  return new Promise((res) => {
    if (!escuchar) return res(window.confirm(opciones.titulo || '¿Seguro?'));
    escuchar({ ...opciones, res });
  });
}
