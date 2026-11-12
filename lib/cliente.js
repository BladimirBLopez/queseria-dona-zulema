export async function api(url, method = 'GET', body) {
  try {
    const r = await fetch(url, { method, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { location.href = '/admin'; return { ok: false, status: 401, data: null }; }
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'sin_conexion' } };
  }
}

const MSG = {
  sin_permiso: 'No tienes permiso para hacer esto.',
  proveedor_repetido: 'Ya existe un proveedor con ese nombre.',
  proveedor_invalido: 'El proveedor elegido no existe. Actualiza la lista.',
  fecha_invalida: 'La fecha no puede ser futura.',
  no_encontrada: 'No se encontró el registro. Actualiza la lista.',
  no_encontrado: 'No se encontró el registro. Actualiza la lista.',
  datos_invalidos: 'Revisa los datos e intenta de nuevo.',
  error_servidor: 'Error del servidor. Intenta de nuevo.',
  falta_tabla: 'Faltan las tablas en Neon. Ejecuta el SQL del Paso 1.',
  fiado_sin_cliente: 'Para fiado escribe el nombre del cliente.',
  sin_items: 'Agrega al menos un producto.',
  items_invalidos: 'Revisa cantidades y precios.',
  producto_repetido: 'Hay un producto repetido.',
  sin_conexion: 'Sin conexión.',
  sin_deuda: 'Esa venta ya no tiene saldo.',
  monto_invalido: 'Monto inválido.',
  stock_insuficiente: 'Stock insuficiente. Revisa las cantidades disponibles antes de completar la venta.',
  producto_inexistente: 'Un producto ya no existe en el catálogo. Actualiza la lista antes de vender.',
  pedido_invalido: 'El número de pedido no es válido.',
  sin_control_stock: 'Este producto no tiene control de stock. Registra primero una entrada.',
  pedido_no_pendiente: 'El pedido ya fue entregado, cancelado o no existe. Actualiza la lista.',
};
const cant = (n, u) => String(Math.round(Number(n) * 1000) / 1000) + (u ? ' ' + String(u).trim() : '');
export function errMsg(d) {
  if (d?.error === 'stock_insuficiente' && d.producto) {
    return Number(d.disponible) > 0
      ? 'Solo quedan ' + cant(d.disponible, d.unidad) + ' de ' + d.producto + '.'
      : d.producto + ' está agotado (stock en 0).';
  }
  if (d?.error === 'cantidad_entera') {
    return (d.producto ? '«' + d.producto + '» se' : 'Este producto se') + ' cuenta en números enteros (por ejemplo 5, no 5.5).';
  }
  if (d?.error === 'codigo_repetido') {
    return 'No se pudo guardar: el código ya lo tiene ' + (d.producto ? '«' + d.producto + '»' : 'otro producto') + '.';
  }
  return MSG[d?.error] || 'No se pudo completar. Intenta de nuevo.';
}
