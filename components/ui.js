// ui-sobrio
const TONOS = {
  vino: 'bg-vino-50 text-vino-800',
  verde: 'bg-green-50 text-green-700',
  ambar: 'bg-amber-50 text-amber-800',
  rojo: 'bg-red-50 text-red-700',
  gris: 'bg-stone-100 text-stone-600',
};

const VALOR = {
  vino: 'text-vino-800',
  verde: 'text-green-700',
  ambar: 'text-amber-700',
  rojo: 'text-red-700',
  gris: 'text-stone-900',
};

export function Page({ children, className = '' }) {
  return <main className={`fade-in px-4 pt-4 md:px-6 ${className}`}>{children}</main>;
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight text-stone-900 md:text-2xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-stone-500">{sub}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-stone-200 bg-white p-4 ${className}`}>{children}</section>;
}

export function Stat({ label, value, hint, tone = 'vino', icon: Icon }) {
  return (
    <div className="h-full rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-stone-500 sm:text-[11px]">{label}</p>
        {Icon && <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid ${TONOS[tone]}`}><Icon size={16} /></span>}
      </div>
      <p className={`mt-1.5 text-base font-bold leading-tight sm:text-2xl ${VALOR[tone] || VALOR.gris}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = 'gris' }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS[tone]}`}>{children}</span>;
}

export function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
      {Icon && <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-stone-100 text-stone-400"><Icon size={20} /></span>}
      <p className="font-bold text-stone-800">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-xs text-sm text-stone-500">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = 'h-20' }) {
  return <div className={`skeleton ${className}`} />;
}

const BTN = {
  primary: 'bg-vino-800 text-white hover:bg-vino-700',
  soft: 'bg-vino-50 text-vino-800 hover:bg-vino-100',
  ghost: 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
};

export function Btn({ variant = 'primary', href, className = '', children, ...rest }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${BTN[variant]} ${className}`;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
