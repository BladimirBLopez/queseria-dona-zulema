const Svg = ({ size = 20, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const IconFacebook = (p) => <Svg {...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></Svg>;
export const IconInstagram = (p) => <Svg {...p}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></Svg>;
export const IconTikTok = (p) => <Svg {...p}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></Svg>;

export const ICONOS_REDES = { Facebook: IconFacebook, Instagram: IconInstagram, TikTok: IconTikTok };

export function RedLink({ nombre, u }) {
  const Icon = ICONOS_REDES[nombre];
  return (
    <a href={u} target="_blank" rel="noopener noreferrer" aria-label={nombre} title={nombre}
      className="grid h-11 w-11 place-items-center rounded-full bg-vino-800 text-oro-300 shadow-card transition hover:bg-vino-700">
      <Icon size={20} />
    </a>
  );
}
