export const bs = (v) =>
  'Bs ' + Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const qty = (n) => String(Math.round(Number(n || 0) * 1000) / 1000);

export const hoyBO = (off = 0) =>
  new Date(Date.now() - 4 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);

export const horaBO = (iso) =>
  new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' });

export const diaBO = (iso) =>
  new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', timeZone: 'America/La_Paz' });

export function waLink(tel, texto) {
  let t = String(tel || '').replace(/\D/g, '');
  if (t.length === 8) t = '591' + t;
  return `https://wa.me/${t}?text=${encodeURIComponent(texto)}`;
}

export function reciboTexto(v, negocio = '') {
  const lineas = (v.items || []).map((i) => `• ${qty(i.cantidad)} ${i.unidad} ${i.nombre} — ${bs(i.subtotal)}${i.precio ? ` (${bs(i.precio)}/${i.unidad})` : ''}`);
  const saldo = Number(v.total) - Number(v.pagado);
  return [
    `*${negocio || 'Recibo'}*`,
    v.cliente_nombre ? `Cliente: ${v.cliente_nombre}` : '',
    `Venta #${v.id} · ${diaBO(v.fecha || new Date())}`,
    '',
    ...lineas,
    '',
    Number(v.descuento) > 0 ? `Descuento: -${bs(v.descuento)}` : '',
    `*Total: ${bs(v.total)}*`,
    saldo > 0.001 ? `Pagado: ${bs(v.pagado)}\n*Saldo pendiente: ${bs(saldo)}*` : 'Pagado ✔',
    '',
    '¡Gracias por su compra!',
  ].filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0)).join('\n');
}
