import { admiteDecimales } from './unidades.js';

const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

export function validarProducto(b = {}, nuevo = false) {
  const unidad = String(b.unidad ?? '').trim().slice(0, 20);
  if (!unidad) return { error: 'unidad_vacia' };

  for (const [k, campo] of [['precio_menor', 'El precio'], ['precio_mayor', 'El precio especial'], ['costo', 'El costo']]) {
    const v = num(b[k]);
    if (v != null && v < 0) return { error: 'negativo', campo };
  }

  const entero = !admiteDecimales(unidad);
  const cantidades = [['stock_min', 'El aviso de stock bajo'], ['mayor_desde', 'La cantidad del precio especial']];
  if (nuevo) cantidades.unshift(['stock', 'El stock']);
  for (const [k, campo] of cantidades) {
    const v = num(b[k]);
    if (v != null && v < 0) return { error: 'negativo', campo };
    if (v != null && entero && !Number.isInteger(v)) return { error: 'cantidad_entera', campo, unidad };
  }
  return { ok: true, unidad };
}

export const NUMERICOS = ['precio_menor', 'precio_mayor', 'mayor_desde', 'costo', 'stock', 'stock_min'];

export function numerosLimpios(p) {
  const o = { ...p };
  for (const k of NUMERICOS) if (o[k] != null && o[k] !== '') o[k] = Number(o[k]);
  return o;
}
