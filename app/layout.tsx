import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@/components/Analytics';
import { SITE_URL } from '@/lib/config';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'SEOforAgent: the SEO tool for AI agents', template: '%s | SEOforAgent' },
  description:
    'Give Claude, ChatGPT, Codex or Cursor real SEO data, AI visibility checks, the listicles AI assistants cite and backlinks through Outrank. Priced in dollars, from $9 a month.',
  applicationName: 'SEOforAgent',
  openGraph: { type: 'website', siteName: 'SEOforAgent', url: SITE_URL },
  twitter: { card: 'summary' },
  alternates: { types: { 'text/plain': '/llms.txt', 'text/markdown': '/docs.md' } },
};

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
    <body className="min-h-screen font-sans text-base antialiased">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {children}
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
