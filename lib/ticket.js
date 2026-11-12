import { bs, qty, diaBO } from '@/lib/fmt';

// Ancho del papel: '80mm' (normal) o '58mm' (impresora angosta)
const ANCHO = '80mm';
const METODO = { efectivo: 'Efectivo', qr: 'QR', transferencia: 'Transferencia' };

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
@page { margin: 0; }
#ticket-print { display: none; }
@media print {
  html, body { background: #fff !important; }
  body > *:not(#ticket-print) { display: none !important; }
  #ticket-print { display: block; width: ${ANCHO}; box-sizing: border-box; padding: 3mm; color: #000; font: 12px/1.4 monospace; }
  #ticket-print .c { text-align: center; }
  #ticket-print .fila { display: flex; justify-content: space-between; gap: 6px; }
  #ticket-print .fila b { white-space: nowrap; }
  #ticket-print .tot { font-size: 16px; font-weight: 700; margin-top: 4px; }
  #ticket-print hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
}`;

export function imprimirTicket(v, negocio = '') {
  if (typeof document === 'undefined' || !v) return;
  const f = v.fecha || new Date();
  const hora = new Date(f).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit' });
  const filas = (v.items || [])
    .map((i) => `<div class="fila"><span>${esc(qty(i.cantidad) + ' ' + i.unidad + ' ' + i.nombre)}</span><b>${esc(bs(i.subtotal))}</b></div>`)
    .join('');
  const anulada = v.estado && v.estado !== 'activa';
  const html = [
    `<div class="c"><b>${esc(negocio || 'Recibo')}</b></div>`,
    anulada ? '<div class="c"><b>*** VENTA ANULADA ***</b></div>' : '',
    '<hr>',
    `<div>Venta #${esc(v.id)}</div>`,
    `<div>${esc(diaBO(f))} ${esc(hora)}</div>`,
    v.cliente_nombre ? `<div>Cliente: ${esc(v.cliente_nombre)}</div>` : '',
    '<hr>',
    filas,
    '<hr>',
    Number(v.descuento) > 0 ? `<div class="fila"><span>Descuento</span><span>-${esc(bs(v.descuento))}</span></div>` : '',
    `<div class="fila tot"><span>TOTAL</span><span>${esc(bs(v.total))}</span></div>`,
    METODO[v.metodo] ? `<div class="fila"><span>Pago</span><span>${esc(METODO[v.metodo])}</span></div>` : '',
    '<hr>',
    '<div class="c">¡Gracias por su compra!</div>',
  ].join('');

  document.getElementById('ticket-print')?.remove();
  document.getElementById('ticket-style')?.remove();
  const st = document.createElement('style');
  st.id = 'ticket-style';
  st.textContent = CSS;
  const box = document.createElement('div');
  box.id = 'ticket-print';
  box.innerHTML = html;
  document.head.appendChild(st);
  document.body.appendChild(box);

  let listo = false;
  const limpiar = () => {
    if (listo) return;
    listo = true;
    window.removeEventListener('afterprint', alTerminar);
    box.remove();
    st.remove();
  };
  function alTerminar() { setTimeout(limpiar, 1000); }
  window.addEventListener('afterprint', alTerminar);
  setTimeout(limpiar, 120000);
  setTimeout(() => window.print(), 60);
}
