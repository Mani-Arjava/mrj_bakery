import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MRJ Best Bakery | Freshly Baked Every Day',
  description: 'Premium wholesale and retail bakery in New Aayakudi, Palani.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
