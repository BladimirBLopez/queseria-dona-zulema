import { LayoutGrid, Scale, Snowflake, MessageCircle, ShoppingBag, Truck, MapPin, Clock, ChevronDown } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { RedLink } from '@/components/RedesIcons';

const H2 = ({ eyebrow, children, sub }) => (
  <div className="mb-10 text-center">
    {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-oro-600">{eyebrow}</p>}
    <h2 className="font-serif text-3xl font-extrabold text-vino-800 md:text-4xl">{children}</h2>
    {sub && <p className="mx-auto mt-3 max-w-xl text-stone-600">{sub}</p>}
  </div>
);

const BEN = [
  [LayoutGrid, 'Variedad completa', 'Quesos, fiambres y lácteos en un solo lugar.'],
  [Scale, 'Mayor y menor', 'Compra la cantidad que necesites, con precios especiales por mayor.'],
  [Snowflake, 'Productos frescos', 'Mercadería en cadena de frío y rotación constante.'],
  [MessageCircle, 'Pedido por WhatsApp', 'Escríbenos y te atendemos de forma rápida y directa.'],
];

const PASOS = [
  [ShoppingBag, 'Arma tu pedido', 'Agrega productos al pedido desde el catálogo.'],
  [MessageCircle, 'Envíalo por WhatsApp', 'Se abre el chat con tu pedido listo para confirmar.'],
  [Truck, 'Recibe o recoge', 'Coordinamos contigo la entrega o el recojo en el local.'],
];

export function Beneficios({ n }) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal><H2 eyebrow="Calidad y confianza" sub="Atención cercana y productos de marcas reconocidas.">¿Por qué elegirnos?</H2></Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BEN.map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 0.08} className="h-full">
              <div className="h-full rounded-3xl bg-crema p-6 ring-1 ring-vino-900/5">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-vino-800 text-oro-300"><Icon size={22} /></span>
                <h3 className="font-bold text-vino-800">{t}</h3>
                <p className="mt-1 text-sm text-stone-600">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {n.marcas.length > 0 && (
          <Reveal className="mt-12 text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Trabajamos con</p>
            <div className="flex flex-wrap justify-center gap-3">
              {n.marcas.map((m) => (
                <span key={m} className="rounded-full bg-crema px-6 py-2.5 text-sm font-bold text-vino-800 ring-1 ring-oro-400/60">{m}</span>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

export function Info({ n, wa }) {
  const hayUbicacion = n.direccion || n.horarios.length || n.mapa || n.ubicacion;
  const redes = [['Facebook', n.facebook], ['Instagram', n.instagram], ['TikTok', n.tiktok], ['Ubicación', n.ubicacion]].filter(([, u]) => u);

  return (
    <>
      <section className="bg-crema py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div id="como-pedir" className="scroll-mt-20"><Reveal><H2 eyebrow="Así de simple">Pedir es muy fácil</H2></Reveal></div>
          <div className="grid gap-4 md:grid-cols-3">
            {PASOS.map(([Icon, t, d], i) => (
              <Reveal key={t} delay={i * 0.1}>
                <div className="relative h-full rounded-3xl bg-white p-6 shadow-card">
                  <span className="absolute right-5 top-4 font-serif text-5xl font-extrabold text-vino-100">{i + 1}</span>
                  <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-oro-400 text-vino-950"><Icon size={22} /></span>
                  <h3 className="font-bold">{t}</h3>
                  <p className="mt-1 text-sm text-stone-600">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {n.mayor_titulo && (
        <section className="relative overflow-hidden bg-gradient-to-r from-vino-950 via-vino-900 to-vino-700 py-14 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-oro-400/20 blur-3xl" />
          <Reveal className="relative mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <h2 className="font-serif text-2xl font-extrabold md:text-3xl">{n.mayor_titulo}</h2>
              <p className="mt-2 text-vino-100">{n.mayor_texto}</p>
            </div>
            <a href={wa('Hola, quiero cotizar una compra al por mayor')} className="rounded-full bg-oro-400 px-8 py-3.5 font-bold text-vino-950 shadow-lift transition hover:bg-oro-300">
              Cotizar por mayor
            </a>
          </Reveal>
        </section>
      )}

      {n.faq.length > 0 && (
        <section className="bg-crema py-16">
          <div className="mx-auto max-w-3xl px-4">
            <div id="preguntas" className="scroll-mt-20"><Reveal><H2 eyebrow="Resolvemos tus dudas">Preguntas frecuentes</H2></Reveal></div>
            <div className="space-y-3">
              {n.faq.map(([q, a]) => (
                <details key={q} className="group rounded-2xl bg-white p-5 shadow-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <ChevronDown size={20} className="shrink-0 text-oro-600 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-stone-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {hayUbicacion && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div id="visitanos" className="scroll-mt-20"><Reveal><H2 eyebrow="Encuéntranos">Visítanos</H2></Reveal></div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                {n.direccion && (
                  <p className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-vino-50 text-vino-800"><MapPin size={20} /></span><span className="pt-2">{n.direccion}</span></p>
                )}
                {n.horarios.length > 0 && (
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-vino-50 text-vino-800"><Clock size={20} /></span>
                    <ul className="space-y-1 pt-2 text-sm">{n.horarios.map(([d, h]) => <li key={d}><b>{d}:</b> {h}</li>)}</ul>
                  </div>
                )}
                {redes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {redes.map(([nombre, u]) => (
                      <RedLink key={nombre} nombre={nombre} u={u} />
                    ))}
                  </div>
                )}
              </div>
              {n.mapa && <iframe src={n.mapa} title="Mapa" loading="lazy" className="h-72 w-full rounded-3xl border-0 shadow-card" />}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
