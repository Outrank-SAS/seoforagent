import Link from 'next/link';
import { AGENT_PAGES } from '@/lib/agent-pages';
import { GITHUB_PUBLIC, GITHUB_URL, OUTRANK_URL, SUPPORT_EMAIL } from '@/lib/config';
import { ByOutrank, LogoMark } from './Lockup';

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

const GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/docs', label: 'Docs' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/vs/openseo', label: 'SEOforAgent vs OpenSEO' },
      ...(GITHUB_PUBLIC ? [{ href: GITHUB_URL, label: 'GitHub', external: true }] : []),
      { href: '/llms.txt', label: 'llms.txt' },
    ],
  },
  {
    title: 'For your agent',
    links: AGENT_PAGES.map((page) => ({ href: `/for/${page.slug}`, label: page.label })),
  },
  {
    title: 'Company',
    links: [
      { href: OUTRANK_URL, label: 'Outrank', external: true },
      { href: `${OUTRANK_URL}/terms-of-use`, label: 'Terms', external: true },
      { href: `${OUTRANK_URL}/privacy-policy`, label: 'Privacy', external: true },
      { href: `mailto:${SUPPORT_EMAIL}`, label: 'Support', external: true },
    ],
  },
];

const linkClass = 'inline-flex min-h-10 items-center text-muted transition-colors hover:text-ink';

export const SiteFooter = () => (
  <footer className="mt-24 border-t border-line bg-white">
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 font-semibold">
          <LogoMark />
          SEOforAgent
          <ByOutrank />
        </span>
        <p className="max-w-sm text-sm text-muted">The SEO tool for AI agents. Built and run by Outrank.</p>
      </div>
      <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-8 text-sm sm:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col">
            <p className="pb-1 text-xs font-medium text-faint">{group.title}</p>
            {group.links.map((link) =>
              link.external ? (
                <a key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </nav>
    </div>
  </footer>
);
