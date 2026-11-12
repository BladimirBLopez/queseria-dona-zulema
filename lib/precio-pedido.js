// Reglas compartidas por carrito y servidor.
export function obtenerPrecioPedido(p, cantidad, tipo = 'menor') {
  const numero = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const menor = numero(p.precio_menor);
  const mayor = numero(p.precio_mayor);
  const mayorDesde = numero(p.mayor_desde);

  const mayorAplicado =
    tipo === 'mayor' &&
    mayor !== null &&
    (mayorDesde === null ||
      mayorDesde <= 0 ||
      cantidad >= mayorDesde);

  const precio = mayorAplicado ? mayor : menor;

  return { precio, mayorDesde, mayorAplicado };
}

export const redondearDinero = (n) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
