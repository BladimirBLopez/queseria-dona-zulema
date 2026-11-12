'use client';
import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { MessageCircle } from 'lucide-react';

export default function Ofertas({ banners, wa }) {
  const multi = banners.length > 1;
  const [ref, api] = useEmblaCarousel({ loop: multi }, multi ? [Autoplay({ delay: 5000, stopOnInteraction: false })] : []);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!api) return;
    const on = () => setI(api.selectedScrollSnap());
    api.on('select', on);
    on();
    return () => api.off('select', on);
  }, [api]);

  if (!banners.length) return null;

  return (
    <section className="bg-crema px-4 pt-2">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl shadow-lift" ref={ref}>
          <div className="flex">
            {banners.map((b) => (
              <div key={b.id} className="min-w-0 flex-[0_0_100%]">
                <div className="relative flex h-56 items-center md:h-72">
                  {b.img ? <img src={b.img} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-r from-vino-900 to-vino-600" />}
                  <div className="absolute inset-0 bg-gradient-to-r from-vino-950/85 via-vino-950/50 to-transparent" />
                  <div className="relative max-w-md p-6 text-white md:p-10">
                    <h3 className="font-serif text-2xl font-extrabold leading-tight md:text-4xl">{b.titulo}</h3>
                    {b.texto && <p className="mt-2 text-sm text-vino-100 md:text-base">{b.texto}</p>}
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola, me interesa: ' + b.titulo)}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-oro-400 px-6 py-2.5 text-sm font-bold text-vino-950 shadow transition hover:bg-oro-300">
                      <MessageCircle size={16} /> {b.boton || 'Pedir ahora'}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {multi && (
          <div className="mt-3 flex justify-center gap-2">
            {banners.map((b, x) => (
              <button key={b.id} aria-label={'Oferta ' + (x + 1)} onClick={() => api?.scrollTo(x)}
                className={`h-2 rounded-full transition-all ${x === i ? 'w-6 bg-vino-800' : 'w-2 bg-vino-300'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
