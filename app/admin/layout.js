import Shell from './shell';

export const metadata = {
  title: 'Admin',
  applicationName: 'Doña Zulema',
  robots: { index: false, follow: false },
  manifest: '/api/manifest',
  appleWebApp: { capable: true, title: 'Doña Zulema', statusBarStyle: 'black' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export default function AdminLayout({ children }) {
  return <Shell>{children}</Shell>;
}
