import { SITE } from '@/lib/site';

export default function JsonLd({ n }) {
  const sameAs = [n.facebook, n.instagram, n.tiktok].filter(Boolean);
  const d = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: n.nombre,
    url: SITE,
    telephone: '+' + n.whatsapp,
    ...(n.logo ? { image: n.logo } : {}),
    ...(n.direccion ? { address: { '@type': 'PostalAddress', streetAddress: n.direccion } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }} />;
}
