import './globals.css';
import { Playfair_Display, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SITE } from '@/lib/site';

const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', weight: ['700', '800'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

const title = 'Quesería y Fiambrería Doña Zulema | Quesos, fiambres y lácteos';
const description = 'Quesos, fiambres Sofía, fiambres argentinos y lácteos PIL al por mayor y menor. Pedidos por WhatsApp.';

export const metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  openGraph: { title, description, type: 'website', locale: 'es_BO', siteName: 'Doña Zulema' },
};

export const viewport = { themeColor: '#7a1414' };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body className="bg-crema font-sans text-stone-800 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
