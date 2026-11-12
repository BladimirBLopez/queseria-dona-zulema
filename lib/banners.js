import { sql } from '@/lib/db';
import { thumb } from '@/lib/cloudinary';

export async function getBanners() {
  try {
    const r = await sql()`SELECT id, titulo, texto, boton, imagen_url FROM banners WHERE activo ORDER BY orden, id`;
    return r.map((b) => ({ ...b, img: b.imagen_url ? thumb(b.imagen_url, 1200) : null }));
  } catch (e) {
    console.error('banners', e?.message);
    return [];
  }
}
