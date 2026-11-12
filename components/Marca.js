export default function Marca({ N, big = false, horizontal = false }) {
  // Logo horizontal para la tienda publica.
  // El logo compacto del panel conserva su comportamiento.
  if (horizontal) {
    if (N?.logo) {
      const src = N.logo.includes('/upload/')
        ? N.logo.replace(
            '/upload/',
            '/upload/f_auto,q_auto,w_720,c_limit/'
          )
        : N.logo;

      const estilo = big
        ? 'mx-auto block h-20 w-auto max-w-[85vw] object-contain'
        : 'block h-12 w-auto max-w-[48vw] object-contain sm:h-14 sm:max-w-[240px]';

      return (
        <img
          src={src}
          alt={N.nombre || 'Logo del negocio'}
          className={estilo}
        />
      );
    }

    // Si aun no hay logo, mostrar nombre sin letra duplicada.
    return (
      <span
        className={
          big
            ? 'mx-auto block text-2xl font-extrabold text-white'
            : 'block max-w-[48vw] truncate text-base font-extrabold text-white sm:text-xl'
        }
      >
        {N?.nombre || 'Negocio'}
      </span>
    );
  }
  const box = big ? 'mx-auto mb-3 h-14 w-14 text-xl' : 'h-10 w-10 text-lg';
  if (N.logo) {
    return <img src={N.logo.replace('/upload/', '/upload/f_auto,q_auto,w_120,h_120,c_fill/')} alt={N.nombre} className={`block ${box} rounded-full object-cover ring-2 ring-oro-400`} />;
  }
  return <span className={`grid ${box} place-items-center rounded-full bg-oro-400 font-serif font-extrabold text-vino-950`}>{N.nombre.charAt(0)}</span>;
}
