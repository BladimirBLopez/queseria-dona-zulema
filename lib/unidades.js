// Reglas de cantidad según la unidad de venta. Un solo lugar para toda la app.
const CON_DECIMALES = ['kg', 'kilo', 'kilos', 'litro', 'litros', 'lt', 'lts', 'l', 'lb', 'libra', 'libras', 'g', 'gr', 'gramo', 'gramos', 'ml', 'metro', 'metros'];

export const unidadNorm = (u) => String(u ?? '').trim().toLowerCase();
export const admiteDecimales = (u) => CON_DECIMALES.includes(unidadNorm(u));
export const pasoDe = (u) => (admiteDecimales(u) ? 0.5 : 1);
export const cantidadValida = (n, u) => Number.isFinite(n) && n > 0 && (admiteDecimales(u) || Number.isInteger(n));
