import { SITE } from '@/lib/site';
import { sql } from '@/lib/db';

export default async function sitemap() {
  let ids = [];
  try { ids = await sql()`SELECT id FROM productos WHERE disponible`; } catch (e) {}
  return [
    { url: SITE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...ids.map((r) => ({ url: `${SITE}/producto/${r.id}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 })),
  ];
}
